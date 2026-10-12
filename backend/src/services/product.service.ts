import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { generateSku } from '../utils/sku';
import { getStockStatus } from '../repositories/activity.repository';
import { activityRepository } from '../repositories/activity.repository';

type ActivityProduct = {
  id: string;
  quantityPurchased: number;
  quantitySold: number;
  createdAt: Date;
};

export type ProductActivity = {
  unitsSold: number;
  saleCount: number;
  lastSoldAt: string | null;
  lastSoldPrice: number | null;
  lastSoldQty: number | null;
  avgSoldPrice: number | null;
  recentSales: Array<{ date: string; quantity: number; price: number }>;
  buyCount: number;
  lastBoughtAt: string | null;
  saleEveryDays: number | null;
  buyEveryDays: number | null;
  sellThrough: number | null;
};

function asNumber(value: unknown) {
  if (typeof value === 'bigint') return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asIso(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function everyDays(from: string | null, to: string | null, times: number) {
  if (!from || !to || times < 2) return null;
  const span = Math.abs(new Date(to).getTime() - new Date(from).getTime()) / 86400000;
  return Math.round(span / (times - 1));
}

async function activityFor(products: ActivityProduct[]) {
  const map = new Map<string, ProductActivity>();
  if (!products.length) return map;

  const ids = products.map((product) => product.id);
  const [sales, purchases] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT productId, saleDate, sellingPrice, quantity, saleCount, unitsSold, avgPrice, firstSold
      FROM (
        SELECT
          si.productId AS productId,
          s.saleDate AS saleDate,
          si.sellingPrice AS sellingPrice,
          si.quantity AS quantity,
          COUNT(*) OVER (PARTITION BY si.productId) AS saleCount,
          SUM(si.quantity) OVER (PARTITION BY si.productId) AS unitsSold,
          AVG(si.sellingPrice) OVER (PARTITION BY si.productId) AS avgPrice,
          MIN(s.saleDate) OVER (PARTITION BY si.productId) AS firstSold,
          ROW_NUMBER() OVER (PARTITION BY si.productId ORDER BY s.saleDate DESC, si.createdAt DESC) AS rn
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.saleId AND s.deletedAt IS NULL
        WHERE si.productId IN (${Prisma.join(ids)})
      ) recent
      WHERE rn <= 3
    `,
    prisma.purchaseItem.findMany({
      where: { productId: { in: ids }, purchase: { deletedAt: null } },
      select: {
        productId: true,
        quantity: true,
        purchaseId: true,
        purchase: { select: { purchaseDate: true } },
      },
    }),
  ]);

  const salesByProduct = new Map<string, Array<Record<string, unknown>>>();
  for (const row of sales) {
    const productId = String(row.productId);
    const bucket = salesByProduct.get(productId) ?? [];
    bucket.push(row);
    salesByProduct.set(productId, bucket);
  }

  const buysByProduct = new Map<string, { purchaseIds: Set<string>; units: number; dates: Date[] }>();
  for (const item of purchases) {
    if (!item.productId) continue;
    const bucket = buysByProduct.get(item.productId) ?? { purchaseIds: new Set<string>(), units: 0, dates: [] };
    bucket.purchaseIds.add(item.purchaseId);
    bucket.units += item.quantity;
    if (item.purchase.purchaseDate) bucket.dates.push(item.purchase.purchaseDate);
    buysByProduct.set(item.productId, bucket);
  }

  for (const product of products) {
    const rows = salesByProduct.get(product.id) ?? [];
    const first = rows[0];
    const recentSales = rows
      .map((row) => ({
        date: asIso(row.saleDate) || '',
        quantity: asNumber(row.quantity),
        price: asNumber(row.sellingPrice),
      }))
      .filter((sale) => sale.date);

    const bought = buysByProduct.get(product.id);
    const restockUnits = bought?.units ?? 0;
    const restockEvents = bought?.purchaseIds.size ?? 0;
    const initialUnits = Math.max(0, product.quantityPurchased - restockUnits);
    const buyCount = restockEvents + (initialUnits > 0 ? 1 : 0);
    const purchaseDates = (bought?.dates ?? []).map((date) => date.toISOString()).sort();
    const firstBoughtAt = initialUnits > 0 ? product.createdAt.toISOString() : purchaseDates[0] ?? null;
    const lastBoughtAt = purchaseDates.at(-1) ?? (initialUnits > 0 ? product.createdAt.toISOString() : null);
    const purchased = product.quantityPurchased;

    map.set(product.id, {
      unitsSold: product.quantitySold,
      saleCount: first ? asNumber(first.saleCount) : 0,
      lastSoldAt: recentSales[0]?.date ?? null,
      lastSoldPrice: recentSales[0]?.price ?? null,
      lastSoldQty: recentSales[0]?.quantity ?? null,
      avgSoldPrice: first ? asNumber(first.avgPrice) : null,
      recentSales,
      buyCount,
      lastBoughtAt,
      saleEveryDays: everyDays(asIso(first?.firstSold), recentSales[0]?.date ?? null, first ? asNumber(first.saleCount) : 0),
      buyEveryDays: everyDays(firstBoughtAt, lastBoughtAt, buyCount),
      sellThrough: purchased > 0 ? Math.round((product.quantitySold / purchased) * 100) : null,
    });
  }

  return map;
}

async function withActivity<T extends ActivityProduct>(products: T[]) {
  const activity = await activityFor(products);
  return products.map((product) => ({ ...product, activity: activity.get(product.id) }));
}

export const productService = {
  async list(query: {
    businessId: string;
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    supplierId?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy: string;
    sortOrder: string;
  }) {
    const { businessId, page, limit, search, categoryId, supplierId, status, minPrice, maxPrice, sortBy, sortOrder } = query;
    const where: Prisma.ProductWhereInput = {
      businessId,
      deletedAt: null,
      ...(categoryId && { categoryId }),
      ...(supplierId && { supplierId }),
      ...(status && { status: status as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' }),
      ...(minPrice !== undefined && { sellingPrice: { gte: minPrice } }),
      ...(maxPrice !== undefined && { sellingPrice: { lte: maxPrice } }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { brand: { contains: search } },
          { barcode: { contains: search } },
          { variants: { some: { variantValue: { contains: search } } } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          supplier: true,
          images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1 },
          variants: { where: { deletedAt: null } },
          _count: { select: { saleItems: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: await withActivity(products),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async get(id: string, businessId: string) {
    const product = await prisma.product.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        category: true,
        supplier: true,
        purchase: { include: { supplier: true } },
        images: { orderBy: { order: 'asc' } },
        variants: { where: { deletedAt: null } },
        saleItems: {
          include: { sale: { include: { customer: true } }, variant: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        purchaseItems: {
          where: { purchase: { deletedAt: null } },
          include: { purchase: { include: { supplier: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!product) throw new NotFoundError('Product not found');
    const [withStats] = await withActivity([product]);
    return withStats;
  },

  async create(userId: string, data: {
    businessId: string;
    categoryId?: string;
    supplierId?: string;
    purchaseId?: string;
    name: string;
    brand?: string;
    description?: string;
    buyingPrice: number;
    sellingPrice: number;
    quantity: number;
    barcode?: string;
    variants?: Array<{
      variantType: string;
      variantValue: string;
      buyingPrice: number;
      sellingPrice: number;
      quantity: number;
      barcode?: string;
    }>;
  }) {
    const business = await prisma.business.findUnique({ where: { id: data.businessId } });
    const hasVariants = data.variants && data.variants.length > 0;
    const totalQty = hasVariants
      ? data.variants!.reduce((sum, v) => sum + v.quantity, 0)
      : data.quantity;

    const product = await prisma.product.create({
      data: {
        businessId: data.businessId,
        categoryId: data.categoryId,
        supplierId: data.supplierId,
        purchaseId: data.purchaseId,
        name: data.name,
        sku: generateSku(),
        barcode: data.barcode,
        brand: data.brand,
        description: data.description,
        buyingPrice: data.buyingPrice,
        sellingPrice: data.sellingPrice,
        quantityPurchased: totalQty,
        remainingQuantity: totalQty,
        hasVariants: !!hasVariants,
        status: getStockStatus(totalQty, business?.lowStockThreshold ?? 5),
        variants: hasVariants
          ? {
              create: data.variants!.map((v) => ({
                variantType: v.variantType,
                variantValue: v.variantValue,
                sku: generateSku('VAR'),
                barcode: v.barcode,
                buyingPrice: v.buyingPrice,
                sellingPrice: v.sellingPrice,
                quantityPurchased: v.quantity,
                remainingQuantity: v.quantity,
                status: getStockStatus(v.quantity, business?.lowStockThreshold ?? 5),
              })),
            }
          : undefined,
      },
      include: { variants: true, images: true },
    });

    await activityRepository.log({
      userId,
      businessId: data.businessId,
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      metadata: { name: product.name },
    });

    return product;
  },

  async update(id: string, businessId: string, data: {
    name?: string;
    categoryId?: string | null;
    supplierId?: string | null;
    brand?: string;
    description?: string;
    buyingPrice?: number;
    sellingPrice?: number;
    barcode?: string;
  }) {
    await this.get(id, businessId);
    const categoryId = data.categoryId === '' ? null : data.categoryId;
    const supplierId = data.supplierId === '' ? null : data.supplierId;

    if (typeof supplierId === 'string') {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, businessId, deletedAt: null },
      });
      if (!supplier) throw new ValidationError('Supplier not found');
    }
    if (typeof categoryId === 'string') {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, businessId, deletedAt: null },
      });
      if (!category) throw new ValidationError('Category not found');
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.buyingPrice !== undefined && { buyingPrice: data.buyingPrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.categoryId !== undefined && { categoryId }),
        ...(data.supplierId !== undefined && { supplierId }),
      },
      include: { category: true, supplier: true, images: true },
    });
  },

  async delete(id: string, businessId: string) {
    await this.get(id, businessId);
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async addImages(productId: string, businessId: string, paths: string[]) {
    await this.get(productId, businessId);
    const existingCount = await prisma.productImage.count({ where: { productId } });

    const images = await prisma.$transaction(
      paths.map((path, index) =>
        prisma.productImage.create({
          data: {
            productId,
            path,
            isPrimary: existingCount === 0 && index === 0,
            order: existingCount + index,
          },
        })
      )
    );
    return images;
  },

  async search(businessId: string, q: string) {
    const products = await prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        OR: [
          { name: { contains: q } },
          { sku: { contains: q } },
          { brand: { contains: q } },
          { barcode: { contains: q } },
          { category: { name: { contains: q } } },
          { supplier: { name: { contains: q } } },
          { purchase: { receiptNumber: { contains: q } } },
          { variants: { some: { OR: [{ variantValue: { contains: q } }, { variantType: { contains: q } }] } } },
        ],
      },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1 },
        variants: { where: { deletedAt: null } },
      },
      take: 50,
    });
    return withActivity(products);
  },

  async restock(userId: string, productId: string, data: {
    businessId: string;
    items: Array<{ variantId?: string; quantity: number; unitCost?: number; sellingPrice?: number }>;
    supplierId?: string;
    purchaseDate?: string;
    receiptNumber?: string;
    notes?: string;
  }) {
    const activeItems = data.items.filter((item) => item.quantity > 0);
    if (!activeItems.length) {
      throw new ValidationError('Add at least one item with quantity greater than 0');
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, businessId: data.businessId, deletedAt: null },
        include: { variants: { where: { deletedAt: null } } },
      });
      if (!product) throw new NotFoundError('Product not found');

      const business = await tx.business.findUnique({ where: { id: data.businessId } });
      const threshold = business?.lowStockThreshold ?? 5;

      const purchaseItems: Array<{
        name: string;
        quantity: number;
        unitCost: number;
        productId: string;
      }> = [];

      for (const item of activeItems) {
        if (product.hasVariants) {
          if (!item.variantId) {
            throw new ValidationError('Select a variant (size, color, etc.) for each restock item');
          }
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) throw new NotFoundError('Variant not found');

          const unitCost = item.unitCost ?? Number(variant.buyingPrice);
          const newRemaining = variant.remainingQuantity + item.quantity;

          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              quantityPurchased: variant.quantityPurchased + item.quantity,
              remainingQuantity: newRemaining,
              ...(item.unitCost !== undefined && { buyingPrice: item.unitCost }),
              ...(item.sellingPrice !== undefined && { sellingPrice: item.sellingPrice }),
              status: getStockStatus(newRemaining, threshold),
            },
          });

          purchaseItems.push({
            name: `${product.name} (${variant.variantType}: ${variant.variantValue})`,
            quantity: item.quantity,
            unitCost,
            productId: product.id,
          });
        } else {
          if (item.variantId) {
            throw new ValidationError('This product does not have variants');
          }

          const unitCost = item.unitCost ?? Number(product.buyingPrice);
          const newRemaining = product.remainingQuantity + item.quantity;

          await tx.product.update({
            where: { id: product.id },
            data: {
              quantityPurchased: product.quantityPurchased + item.quantity,
              remainingQuantity: newRemaining,
              ...(item.unitCost !== undefined && { buyingPrice: item.unitCost }),
              ...(item.sellingPrice !== undefined && { sellingPrice: item.sellingPrice }),
              status: getStockStatus(newRemaining, threshold),
            },
          });

          purchaseItems.push({
            name: product.name,
            quantity: item.quantity,
            unitCost,
            productId: product.id,
          });
        }
      }

      if (product.hasVariants) {
        const updatedVariants = await tx.productVariant.findMany({
          where: { productId: product.id, deletedAt: null },
        });
        const totalRemaining = updatedVariants.reduce((sum, v) => sum + v.remainingQuantity, 0);
        const totalPurchased = updatedVariants.reduce((sum, v) => sum + v.quantityPurchased, 0);

        await tx.product.update({
          where: { id: product.id },
          data: {
            remainingQuantity: totalRemaining,
            quantityPurchased: totalPurchased,
            status: getStockStatus(totalRemaining, threshold),
          },
        });
      }

      let supplierId = product.supplierId || undefined;
      if (data.supplierId) {
        const supplier = await tx.supplier.findFirst({
          where: { id: data.supplierId, businessId: data.businessId, deletedAt: null },
        });
        if (!supplier) throw new ValidationError('Choose a supplier from this business, or add a new one');
        supplierId = supplier.id;
        if (supplier.id !== product.supplierId) {
          await tx.product.update({
            where: { id: product.id },
            data: { supplierId: supplier.id },
          });
        }
      }

      const totalCost = purchaseItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
      const purchase = await tx.purchase.create({
        data: {
          businessId: data.businessId,
          supplierId,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          receiptNumber: data.receiptNumber,
          notes: data.notes,
          totalCost,
          items: {
            create: purchaseItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
              productId: item.productId,
            })),
          },
        },
        include: { items: true, supplier: true },
      });

      await activityRepository.log({
        userId,
        businessId: data.businessId,
        action: 'RESTOCK',
        entityType: 'Product',
        entityId: product.id,
        metadata: { purchaseId: purchase.id, totalCost, items: activeItems },
      }, tx);

      const updatedProduct = await tx.product.findFirst({
        where: { id: productId, businessId: data.businessId, deletedAt: null },
        include: {
          category: true,
          supplier: true,
          purchase: { include: { supplier: true } },
          images: { orderBy: { order: 'asc' } },
          variants: { where: { deletedAt: null } },
        },
      });

      return { product: updatedProduct, purchase };
    });
  },
};
