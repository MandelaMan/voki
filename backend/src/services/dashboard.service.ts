import { prisma } from '../utils/prisma';
import { wholeAmount } from '../utils/money';
import { PAYMENT_METHODS, parsePaymentMethods, type PaymentMethodCode } from '../utils/paymentMethods';

function todayCollections(
  enabled: PaymentMethodCode[],
  grouped: Array<{ paymentMethod: string; _sum: { totalAmount: unknown } }>,
  totalRevenue: number,
) {
  const amounts = new Map<PaymentMethodCode, number>();
  for (const method of enabled) amounts.set(method, 0);
  for (const row of grouped) {
    const method = row.paymentMethod as PaymentMethodCode;
    if (!PAYMENT_METHODS.includes(method)) continue;
    amounts.set(method, (amounts.get(method) || 0) + wholeAmount(row._sum.totalAmount));
  }
  const rows = PAYMENT_METHODS
    .filter((method) => amounts.has(method))
    .map((method) => ({ method, amount: amounts.get(method) || 0 }));
  const drift = wholeAmount(totalRevenue) - rows.reduce((sum, row) => sum + row.amount, 0);
  if (drift !== 0 && rows.length > 0) {
    const index = rows.reduce((best, row, i) => (row.amount > rows[best].amount ? i : best), 0);
    rows[index] = { ...rows[index], amount: rows[index].amount + drift };
  }
  return {
    revenue: rows.reduce((sum, row) => sum + row.amount, 0),
    collections: rows,
  };
}

export const dashboardService = {
  async getStats(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todaySales,
      monthSales,
      products,
      lowStock,
      outOfStock,
      recentPurchases,
      recentSales,
      topProducts,
      todayByMethod,
      business,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { businessId, deletedAt: null, saleDate: { gte: today } },
        _sum: { totalAmount: true, totalProfit: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { businessId, deletedAt: null, saleDate: { gte: monthStart } },
        _sum: { totalAmount: true, totalProfit: true },
      }),
      prisma.product.aggregate({
        where: { businessId, deletedAt: null },
        _sum: { remainingQuantity: true },
        _count: true,
      }),
      prisma.product.count({
        where: { businessId, deletedAt: null, status: 'LOW_STOCK' },
      }),
      prisma.product.count({
        where: { businessId, deletedAt: null, status: 'OUT_OF_STOCK' },
      }),
      prisma.purchase.findMany({
        where: { businessId, deletedAt: null },
        include: { supplier: true },
        orderBy: { purchaseDate: 'desc' },
        take: 5,
      }),
      prisma.sale.findMany({
        where: { businessId, deletedAt: null },
        include: { items: { include: { product: true } } },
        orderBy: { saleDate: 'desc' },
        take: 5,
      }),
      prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { businessId, deletedAt: null } },
        _sum: { quantity: true, profit: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: { businessId, deletedAt: null, saleDate: { gte: today } },
        _sum: { totalAmount: true },
      }),
      prisma.business.findUnique({
        where: { id: businessId },
        select: { paymentMethods: true },
      }),
    ]);

    const topProductIds = topProducts.map((p) => p.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      include: { images: { take: 1 } },
    });

    const inventoryValue = await prisma.product.aggregate({
      where: { businessId, deletedAt: null },
      _sum: { remainingQuantity: true },
    });

    const productsWithValue = await prisma.product.findMany({
      where: { businessId, deletedAt: null },
      select: { remainingQuantity: true, buyingPrice: true },
    });
    const totalInventoryValue = productsWithValue.reduce(
      (sum, p) => sum + p.remainingQuantity * Number(p.buyingPrice),
      0
    );

    const monthlyRevenue = await prisma.$queryRaw<Array<{ month: string; revenue: number; profit: number }>>`
      SELECT 
        DATE_FORMAT(saleDate, '%Y-%m') as month,
        SUM(totalAmount) as revenue,
        SUM(totalProfit) as profit
      FROM sales
      WHERE businessId = ${businessId} AND deletedAt IS NULL
        AND saleDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(saleDate, '%Y-%m')
      ORDER BY month ASC
    `.catch(() => []);

    const collections = todayCollections(
      parsePaymentMethods(business?.paymentMethods),
      todayByMethod,
      Number(todaySales._sum.totalAmount || 0),
    );

    return {
      todaySales: {
        count: todaySales._count,
        revenue: collections.revenue,
        profit: Number(todaySales._sum.totalProfit || 0),
        collections: collections.collections,
      },
      monthSales: {
        revenue: Number(monthSales._sum.totalAmount || 0),
        profit: Number(monthSales._sum.totalProfit || 0),
      },
      inventory: {
        totalProducts: products._count,
        totalItems: Number(products._sum.remainingQuantity || 0),
        totalValue: totalInventoryValue,
      },
      stockAlerts: { lowStock, outOfStock },
      recentPurchases,
      recentSales,
      topProducts: topProducts.map((tp) => ({
        ...topProductDetails.find((p) => p.id === tp.productId),
        totalSold: tp._sum.quantity,
        totalProfit: Number(tp._sum.profit || 0),
      })),
      monthlyRevenue,
    };
  },
};
