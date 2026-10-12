import { prisma } from '../utils/prisma';

export const reportService = {
  async inventoryReport(businessId: string) {
    return prisma.product.findMany({
      where: { businessId, deletedAt: null },
      include: {
        category: true,
        supplier: true,
        variants: { where: { deletedAt: null } },
        images: { take: 1 },
      },
      orderBy: { name: 'asc' },
    });
  },

  async salesReport(businessId: string, startDate?: string, endDate?: string) {
    const where = {
      businessId,
      deletedAt: null,
      ...(startDate && { saleDate: { gte: new Date(startDate) } }),
      ...(endDate && { saleDate: { lte: new Date(endDate) } }),
    };

    return prisma.sale.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true, variant: true } },
      },
      orderBy: { saleDate: 'desc' },
    });
  },

  async profitReport(businessId: string, startDate?: string, endDate?: string) {
    const where = {
      businessId,
      deletedAt: null,
      ...(startDate && { saleDate: { gte: new Date(startDate) } }),
      ...(endDate && { saleDate: { lte: new Date(endDate) } }),
    };

    const sales = await prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true, totalProfit: true },
      _count: true,
    });

    const byProduct = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: where },
      _sum: { quantity: true, profit: true, sellingPrice: true },
      orderBy: { _sum: { profit: 'desc' } },
    });

    const productIds = byProduct.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });

    return {
      summary: {
        totalSales: sales._count,
        totalRevenue: Number(sales._sum.totalAmount || 0),
        totalProfit: Number(sales._sum.totalProfit || 0),
      },
      byProduct: byProduct.map((bp) => ({
        product: products.find((p) => p.id === bp.productId),
        quantity: bp._sum.quantity,
        revenue: Number(bp._sum.sellingPrice || 0),
        profit: Number(bp._sum.profit || 0),
      })),
    };
  },

  async lowStockReport(businessId: string) {
    return prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
      },
      include: { category: true, images: { take: 1 }, variants: true },
      orderBy: { remainingQuantity: 'asc' },
    });
  },

  async deadStockReport(businessId: string, months = 3) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const soldProductIds = await prisma.saleItem.findMany({
      where: { sale: { businessId, saleDate: { gte: cutoff } } },
      select: { productId: true },
      distinct: ['productId'],
    });

    const soldIds = soldProductIds.map((s) => s.productId);

    return prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        remainingQuantity: { gt: 0 },
        id: { notIn: soldIds },
      },
      include: { category: true, images: { take: 1 } },
      orderBy: { createdAt: 'asc' },
    });
  },

  async purchasesReport(businessId: string, startDate?: string, endDate?: string) {
    const where = {
      businessId,
      deletedAt: null,
      ...(startDate && { purchaseDate: { gte: new Date(startDate) } }),
      ...(endDate && { purchaseDate: { lte: new Date(endDate) } }),
    };

    return prisma.purchase.findMany({
      where,
      include: { supplier: true, items: true },
      orderBy: { purchaseDate: 'desc' },
    });
  },
};
