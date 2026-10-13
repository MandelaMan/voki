import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import { planService } from './plan.service';

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

  async cashUp(userId: string, businessId: string, date?: string) {
    await planService.assertPremium(userId);
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');

    const day = date ? new Date(`${date.slice(0, 10)}T12:00:00`) : new Date();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: { businessId, deletedAt: null, saleDate: { gte: start, lte: end } },
      select: { paymentMethod: true, paymentStatus: true, totalAmount: true, totalProfit: true },
    });

    const sum = (rows: typeof sales) => rows.reduce((total, row) => total + Number(row.totalAmount), 0);
    const methods = ['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER', 'OTHER'] as const;
    const byMethod = methods
      .map((method) => {
        const rows = sales.filter((sale) => sale.paymentMethod === method);
        return {
          method,
          count: rows.length,
          paid: sum(rows.filter((sale) => sale.paymentStatus === 'PAID')),
          pending: sum(rows.filter((sale) => sale.paymentStatus === 'PENDING')),
        };
      })
      .filter((row) => row.count > 0);

    const paidRows = sales.filter((sale) => sale.paymentStatus === 'PAID');
    return {
      date: start.toISOString().slice(0, 10),
      salesCount: sales.length,
      paidTotal: sum(paidRows),
      pendingTotal: sum(sales.filter((sale) => sale.paymentStatus === 'PENDING')),
      profit: paidRows.reduce((total, row) => total + Number(row.totalProfit), 0),
      byMethod,
    };
  },

  async restockSuggestions(userId: string, businessId: string) {
    await planService.assertPremium(userId);
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const items = await prisma.saleItem.findMany({
      where: { sale: { businessId, deletedAt: null, saleDate: { gte: since } } },
      select: { productId: true, quantity: true },
    });
    const sold = new Map<string, number>();
    for (const item of items) {
      sold.set(item.productId, (sold.get(item.productId) || 0) + item.quantity);
    }
    if (sold.size === 0) return [];

    const products = await prisma.product.findMany({
      where: { businessId, deletedAt: null, id: { in: [...sold.keys()] } },
      select: { id: true, name: true, sku: true, remainingQuantity: true, status: true },
    });

    return products
      .map((product) => {
        const soldLast30 = sold.get(product.id) || 0;
        const dailyRate = soldLast30 / 30;
        const daysOfCover = dailyRate > 0 ? product.remainingQuantity / dailyRate : null;
        const suggestedOrder = Math.max(0, Math.ceil(dailyRate * 30) - product.remainingQuantity);
        return {
          ...product,
          soldLast30,
          dailyRate: Math.round(dailyRate * 10) / 10,
          daysOfCover: daysOfCover === null ? null : Math.round(daysOfCover),
          suggestedOrder,
        };
      })
      .filter((product) => product.daysOfCover !== null && product.daysOfCover < 14)
      .sort((a, b) => (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0));
  },
};
