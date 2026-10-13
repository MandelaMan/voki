import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import { planService } from './plan.service';

export const customerService = {
  async list(userId: string, businessId: string) {
    await planService.assertPremium(userId);
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');

    const [customers, totals] = await Promise.all([
      prisma.customer.findMany({
        where: { businessId, deletedAt: null },
      }),
      prisma.sale.groupBy({
        by: ['customerId'],
        where: { businessId, deletedAt: null, customerId: { not: null } },
        _sum: { totalAmount: true },
        _count: true,
        _max: { saleDate: true },
      }),
    ]);

    const byId = new Map(totals.map((row) => [row.customerId, row]));
    return customers
      .map((customer) => {
        const row = byId.get(customer.id);
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          salesCount: row?._count || 0,
          totalSpent: Number(row?._sum.totalAmount || 0),
          lastSaleAt: row?._max.saleDate || null,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent || a.name.localeCompare(b.name));
  },
};
