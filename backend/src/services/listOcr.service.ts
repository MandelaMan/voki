import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { integrationService } from './integration.service';
import { productService } from './product.service';

export type ListOcrKind = 'SALE' | 'PURCHASE';

export interface ParsedListLine {
  name: string;
  quantity: number;
  unitCost?: number | null;
  sellingPrice?: number | null;
  raw?: string | null;
}

export interface MatchedListLine extends ParsedListLine {
  productId?: string | null;
  productName?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  matchConfidence: 'exact' | 'likely' | 'none';
  candidates: Array<{
    id: string;
    name: string;
    remainingQuantity: number;
    sellingPrice: number;
    buyingPrice: number;
    hasVariants: boolean;
  }>;
}

const PROMPT = `You read a photo of a handwritten or printed shop list.
Extract every product line. Ignore titles, dates, totals, signatures, and doodles.

Return ONLY valid JSON with this shape:
{
  "items": [
    {
      "name": "string",
      "quantity": number,
      "unitCost": number | null,
      "sellingPrice": number | null,
      "raw": "original line text"
    }
  ]
}

Rules:
- quantity defaults to 1 when missing
- unitCost is purchase/restock cost per unit when present
- sellingPrice is sale price per unit when present
- keep product names as written; do not invent items
- if the image is unreadable, return {"items":[]}`;

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function scoreMatch(query: string, candidate: string) {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.85;
  const qParts = q.split(' ');
  const hits = qParts.filter((part) => part.length > 1 && c.includes(part)).length;
  return hits / Math.max(qParts.length, 1) * 0.7;
}

function parseJsonPayload(text: string): ParsedListLine[] {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new AppError(502, 'Could not read the list from that photo. Try a clearer shot.', 'LIST_OCR_PARSE_FAILED');
    }
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

  const items = (parsed as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    throw new AppError(502, 'Could not read the list from that photo. Try a clearer shot.', 'LIST_OCR_PARSE_FAILED');
  }

  return items
    .map((item) => {
      const row = item as Record<string, unknown>;
      const name = String(row.name || '').trim();
      const quantity = Math.max(1, Math.round(Number(row.quantity) || 1));
      const unitCostRaw = row.unitCost == null || row.unitCost === '' ? null : Number(row.unitCost);
      const sellingPriceRaw = row.sellingPrice == null || row.sellingPrice === '' ? null : Number(row.sellingPrice);
      return {
        name,
        quantity,
        unitCost: unitCostRaw != null && Number.isFinite(unitCostRaw) ? Math.max(0, Math.round(unitCostRaw)) : null,
        sellingPrice: sellingPriceRaw != null && Number.isFinite(sellingPriceRaw) ? Math.max(0, Math.round(sellingPriceRaw)) : null,
        raw: row.raw == null ? null : String(row.raw),
      } satisfies ParsedListLine;
    })
    .filter((item) => item.name.length > 0);
}

async function extractWithGemini(image: Buffer, mimeType: string, apiKey: string): Promise<ParsedListLine[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent([
    { text: PROMPT },
    {
      inlineData: {
        data: image.toString('base64'),
        mimeType: mimeType || 'image/jpeg',
      },
    },
  ]);

  const text = result.response.text();
  return parseJsonPayload(text);
}

async function matchLines(businessId: string, lines: ParsedListLine[], kind: ListOcrKind): Promise<MatchedListLine[]> {
  const matched: MatchedListLine[] = [];

  for (const line of lines) {
    const candidates = await productService.search(businessId, line.name);
    const ranked = candidates
      .map((product) => ({ product, score: scoreMatch(line.name, product.name) }))
      .filter((row) => row.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const best = ranked[0];
    const confidence: MatchedListLine['matchConfidence'] =
      best && best.score >= 0.95 ? 'exact' : best && best.score >= 0.7 ? 'likely' : 'none';

    const top = confidence === 'none' ? undefined : best?.product;
    let variantId: string | null = null;
    let variantLabel: string | null = null;

    if (top?.hasVariants && top.variants?.length) {
      const inStock = top.variants.find((variant) => variant.remainingQuantity > 0) || top.variants[0];
      if (inStock) {
        variantId = inStock.id;
        variantLabel = `${inStock.variantType}: ${inStock.variantValue}`;
      }
    }

    matched.push({
      ...line,
      unitCost: line.unitCost ?? (kind === 'PURCHASE' && top ? Math.round(Number(top.buyingPrice) || 0) : null),
      sellingPrice: line.sellingPrice ?? (kind === 'SALE' && top ? Math.round(Number(top.sellingPrice) || 0) : null),
      productId: top?.id || null,
      productName: top?.name || null,
      variantId,
      variantLabel,
      matchConfidence: confidence,
      candidates: ranked.map(({ product }) => ({
        id: product.id,
        name: product.name,
        remainingQuantity: product.remainingQuantity,
        sellingPrice: Math.round(Number(product.sellingPrice) || 0),
        buyingPrice: Math.round(Number(product.buyingPrice) || 0),
        hasVariants: Boolean(product.hasVariants),
      })),
    });
  }

  return matched;
}

export const listOcrService = {
  async scan(userId: string, data: {
    businessId: string;
    kind: ListOcrKind;
    buffer: Buffer;
    mimeType: string;
    filename?: string;
  }) {
    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');

    if (!data.buffer?.length) {
      throw new ValidationError('Choose a photo of the list first.');
    }

    const apiKey = await integrationService.resolveGeminiApiKey(data.businessId);
    if (!apiKey) {
      throw new AppError(
        503,
        'List scanning needs a Gemini API key. Add yours under Settings → Configurations.',
        'LIST_OCR_UNAVAILABLE'
      );
    }

    let lines: ParsedListLine[];
    try {
      lines = await extractWithGemini(data.buffer, data.mimeType, apiKey);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('List OCR failed', {
        error: error instanceof Error ? error.message : String(error),
        filename: data.filename,
      });
      throw new AppError(502, 'Could not read that list. Try another photo with clearer writing.', 'LIST_OCR_FAILED');
    }

    if (!lines.length) {
      throw new ValidationError('No items were found in that photo. Try a clearer list.');
    }

    const items = await matchLines(data.businessId, lines, data.kind);
    return {
      kind: data.kind,
      engine: 'gemini',
      model: config.geminiModel,
      itemCount: items.length,
      items,
    };
  },
};
