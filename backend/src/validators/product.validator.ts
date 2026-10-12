import { z } from 'zod';

const variantSchema = z.object({
  variantType: z.string().min(1),
  variantValue: z.string().min(1),
  buyingPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  quantity: z.number().int().min(0),
  barcode: z.string().optional(),
});

export const createProductSchema = z.object({
  businessId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  purchaseId: z.string().uuid().optional(),
  name: z.string().min(1),
  brand: z.string().optional(),
  description: z.string().optional(),
  buyingPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  quantity: z.number().int().min(0),
  barcode: z.string().optional(),
  variants: z.array(variantSchema).optional(),
});

export const updateProductSchema = createProductSchema.omit({ businessId: true }).partial();

export const productQuerySchema = z.object({
  businessId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sortBy: z.enum(['name', 'createdAt', 'remainingQuantity', 'sellingPrice']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const restockItemSchema = z.object({
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(0),
  unitCost: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
});

export const restockProductSchema = z.object({
  businessId: z.string().uuid(),
  items: z.array(restockItemSchema).min(1),
  supplierId: z.string().uuid().optional(),
  purchaseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});
