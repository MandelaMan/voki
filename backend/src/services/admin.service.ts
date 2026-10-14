import bcrypt from 'bcryptjs';
import { PlanTier, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { planService, presentPlan, premiumActive } from './plan.service';
import { activityRepository } from '../repositories/activity.repository';
import { logger } from '../utils/logger';
import { wholeAmount } from '../utils/money';
import { config } from '../config';

const DAY_MS = 24 * 60 * 60 * 1000;

function adminEmails() {
  return config.superAdmin.email
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

type AccountStats = {
  businesses: number;
  products: number;
  sales: number;
  revenue: number;
};

function presentAdminUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  plan: PlanTier;
  planExpiresAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  businesses: Array<{ id: string; name: string }>;
}, stats?: AccountStats) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    suspended: Boolean(user.deletedAt),
    businesses: user.businesses,
    stats: stats ?? {
      businesses: user.businesses.length,
      products: 0,
      sales: 0,
      revenue: 0,
    },
    ...presentPlan(user),
  };
}

function money(value: unknown) {
  return wholeAmount(value);
}

function dayKey(value: Date | string) {
  if (typeof value === 'string') return value.slice(0, 10);
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

function recentDays(count: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (count - 1));
  const days: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    days.push(dayKey(day));
  }
  return { start, days };
}

async function accountStats(userIds: string[]) {
  const stats = new Map<string, AccountStats>();
  userIds.forEach((id) => stats.set(id, { businesses: 0, products: 0, sales: 0, revenue: 0 }));
  if (userIds.length === 0) return stats;

  const businesses = await prisma.business.findMany({
    where: { userId: { in: userIds }, deletedAt: null },
    select: { id: true, userId: true },
  });
  const ownerByBusiness = new Map(businesses.map((business) => [business.id, business.userId]));
  businesses.forEach((business) => {
    const row = stats.get(business.userId);
    if (row) row.businesses += 1;
  });

  const businessIds = businesses.map((business) => business.id);
  if (businessIds.length === 0) return stats;

  const [products, sales] = await Promise.all([
    prisma.product.groupBy({
      by: ['businessId'],
      where: { businessId: { in: businessIds }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.sale.groupBy({
      by: ['businessId'],
      where: { businessId: { in: businessIds }, deletedAt: null },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
  ]);

  products.forEach((row) => {
    const ownerId = ownerByBusiness.get(row.businessId);
    const bucket = ownerId ? stats.get(ownerId) : undefined;
    if (bucket) bucket.products += row._count._all;
  });
  sales.forEach((row) => {
    const ownerId = ownerByBusiness.get(row.businessId);
    const bucket = ownerId ? stats.get(ownerId) : undefined;
    if (!bucket) return;
    bucket.sales += row._count._all;
    bucket.revenue += money(row._sum.totalAmount);
  });
  return stats;
}

async function loadUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    include: {
      businesses: {
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export const adminService = {
  async ensureConfiguredAdmin() {
    const primary = adminEmails()[0];
    const password = config.superAdmin.password;
    if (primary && password) {
      const existing = await prisma.user.findFirst({ where: { email: primary } });
      if (!existing) {
        await prisma.user.create({
          data: {
            email: primary,
            password: await bcrypt.hash(password, 12),
            firstName: config.superAdmin.firstName,
            lastName: config.superAdmin.lastName,
            role: 'SUPER_ADMIN',
          },
        });
        logger.info('Created the super admin account');
      } else {
        const passwordMatches = await bcrypt.compare(password, existing.password);
        const needsRestore = existing.role !== 'SUPER_ADMIN' || Boolean(existing.deletedAt);
        if (!passwordMatches || needsRestore) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              role: 'SUPER_ADMIN',
              deletedAt: null,
              ...(!passwordMatches ? { password: await bcrypt.hash(password, 12) } : {}),
            },
          });
          logger.info('Restored the super admin account');
        }
      }
    }
    await this.promoteConfiguredAdmins();
  },

  async promoteConfiguredAdmins() {
    const emails = adminEmails();
    if (emails.length === 0) return;

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, role: true },
    });
    const matches = users.filter((user) => emails.includes(user.email.trim().toLowerCase()) && user.role !== 'SUPER_ADMIN');
    if (matches.length === 0) return;

    await prisma.user.updateMany({
      where: { id: { in: matches.map((user) => user.id) } },
      data: { role: 'SUPER_ADMIN' },
    });
    logger.info(`Promoted ${matches.length} super admin account${matches.length === 1 ? '' : 's'}`);
  },

  async overview(search?: string) {
    const pricing = await planService.pricing();
    const query = search?.trim();
    const users = await prisma.user.findMany({
      where: {
        ...(query
          ? {
            OR: [
              { email: { contains: query } },
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { phone: { contains: query } },
            ],
          }
          : {}),
      },
      include: {
        businesses: {
          where: { deletedAt: null },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const stats = await accountStats(users.map((user) => user.id));

    return {
      pricing,
      users: users.map((user) => presentAdminUser(user, stats.get(user.id))),
    };
  },

  async analytics() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const { start, days } = recentDays(30);

    const [
      users,
      businesses,
      products,
      sales,
      todaySales,
      monthSales,
      purchases,
      subscriptions,
      signupRows,
      salesRows,
      topSales,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { plan: true, planExpiresAt: true, createdAt: true, role: true },
      }),
      prisma.business.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.sale.aggregate({
        where: { deletedAt: null },
        _count: { _all: true },
        _sum: { totalAmount: true, totalProfit: true },
      }),
      prisma.sale.aggregate({
        where: { deletedAt: null, saleDate: { gte: startOfToday } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.sale.aggregate({
        where: { deletedAt: null, saleDate: { gte: startOfMonth } },
        _count: { _all: true },
        _sum: { totalAmount: true, totalProfit: true },
      }),
      prisma.purchase.aggregate({
        where: { deletedAt: null },
        _count: { _all: true },
        _sum: { totalCost: true },
      }),
      prisma.subscriptionPayment.aggregate({
        where: { status: 'SUCCESS' },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.$queryRaw<Array<{ day: Date | string; count: bigint | number }>>`
        SELECT DATE(createdAt) AS day, COUNT(*) AS count
        FROM users
        WHERE createdAt >= ${start}
        GROUP BY DATE(createdAt)
        ORDER BY day
      `,
      prisma.$queryRaw<Array<{ day: Date | string; count: bigint | number; revenue: unknown; profit: unknown }>>`
        SELECT DATE(saleDate) AS day,
               COUNT(*) AS count,
               COALESCE(SUM(totalAmount), 0) AS revenue,
               COALESCE(SUM(totalProfit), 0) AS profit
        FROM sales
        WHERE deletedAt IS NULL AND saleDate >= ${start}
        GROUP BY DATE(saleDate)
        ORDER BY day
      `,
      prisma.sale.groupBy({
        by: ['businessId'],
        where: { deletedAt: null },
        _count: { _all: true },
        _sum: { totalAmount: true, totalProfit: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
    ]);

    const suspended = await prisma.user.count({ where: { deletedAt: { not: null } } });
    const premium = users.filter((user) => premiumActive(user)).length;
    const signupCounts = new Map(signupRows.map((row) => [dayKey(row.day), Number(row.count)]));
    const salesByDay = new Map(salesRows.map((row) => [dayKey(row.day), row]));

    const topIds = topSales.map((row) => row.businessId);
    const topBusinesses = topIds.length
      ? await prisma.business.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true, user: { select: { id: true, firstName: true, lastName: true } } },
      })
      : [];
    const businessById = new Map(topBusinesses.map((business) => [business.id, business]));

    return {
      accounts: {
        total: users.length + suspended,
        active: users.length,
        suspended,
        premium,
        free: users.length - premium,
        admins: users.filter((user) => user.role === 'SUPER_ADMIN').length,
        newThisMonth: users.filter((user) => user.createdAt >= startOfMonth).length,
      },
      businesses,
      products,
      sales: {
        count: sales._count._all,
        revenue: money(sales._sum.totalAmount),
        profit: money(sales._sum.totalProfit),
        todayCount: todaySales._count._all,
        todayRevenue: money(todaySales._sum.totalAmount),
        monthCount: monthSales._count._all,
        monthRevenue: money(monthSales._sum.totalAmount),
        monthProfit: money(monthSales._sum.totalProfit),
      },
      purchases: {
        count: purchases._count._all,
        spend: money(purchases._sum.totalCost),
      },
      subscriptions: {
        count: subscriptions._count._all,
        revenue: money(subscriptions._sum.amount),
      },
      signups: days.map((day) => ({ day, count: signupCounts.get(day) || 0 })),
      salesTrend: days.map((day) => {
        const row = salesByDay.get(day);
        return {
          day,
          count: row ? Number(row.count) : 0,
          revenue: row ? money(row.revenue) : 0,
          profit: row ? money(row.profit) : 0,
        };
      }),
      topBusinesses: topSales.map((row) => {
        const business = businessById.get(row.businessId);
        const owner = business ? `${business.user.firstName} ${business.user.lastName}`.trim() : 'Unknown';
        return {
          id: row.businessId,
          name: business?.name || 'Deleted business',
          owner,
          ownerId: business?.user.id || null,
          sales: row._count._all,
          revenue: money(row._sum.totalAmount),
          profit: money(row._sum.totalProfit),
        };
      }),
    };
  },

  async setPrice(actorId: string, priceKes: number) {
    if (!Number.isInteger(priceKes) || priceKes < 1 || priceKes > 1_000_000) {
      throw new ValidationError('Enter a whole amount from 1 to 1,000,000.');
    }

    const row = await prisma.platformSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', premiumPriceKes: priceKes, updatedById: actorId },
      update: { premiumPriceKes: priceKes, updatedById: actorId },
    });

    await activityRepository.log({
      userId: actorId,
      action: 'ADMIN_PRICE',
      entityType: 'PlatformSetting',
      entityId: row.id,
      metadata: { priceKes },
    });

    return planService.pricing();
  },

  async setPlan(actorId: string, userId: string, input: { plan: 'FREE' | 'PREMIUM'; days?: number }) {
    const user = await loadUser(userId);
    const pricing = await planService.pricing();

    if (input.plan === 'FREE') {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'FREE', planExpiresAt: null },
      });
      await activityRepository.log({
        userId: actorId,
        action: 'ADMIN_DOWNGRADE',
        entityType: 'User',
        entityId: user.id,
      });
      return presentAdminUser(await loadUser(user.id));
    }

    const days = input.days ?? pricing.periodDays;
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new ValidationError('Choose between 1 and 3,650 days.');
    }

    const base = user.plan === 'PREMIUM' && user.planExpiresAt && user.planExpiresAt > new Date()
      ? user.planExpiresAt
      : new Date();
    const periodEnd = new Date(base.getTime() + days * DAY_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { plan: 'PREMIUM', planExpiresAt: periodEnd },
    });
    await activityRepository.log({
      userId: actorId,
      action: 'ADMIN_UPGRADE',
      entityType: 'User',
      entityId: user.id,
      metadata: { days, periodEnd: periodEnd.toISOString() },
    });
    return presentAdminUser(await loadUser(user.id));
  },

  async setStatus(actorId: string, userId: string, suspended: boolean) {
    if (actorId === userId) throw new ValidationError('You cannot suspend your own account.');
    const user = await loadUser(userId);
    if (user.role === 'SUPER_ADMIN') throw new ValidationError('Super admin accounts stay active.');

    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: suspended ? new Date() : null },
    });
    if (suspended) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    }

    await activityRepository.log({
      userId: actorId,
      action: suspended ? 'ADMIN_SUSPEND' : 'ADMIN_RESTORE',
      entityType: 'User',
      entityId: user.id,
    });
    const stats = await accountStats([user.id]);
    return presentAdminUser(await loadUser(user.id), stats.get(user.id));
  },

  async businesses(search?: string) {
    const query = search?.trim();
    const rows = await prisma.business.findMany({
      where: {
        deletedAt: null,
        ...(query
          ? {
            OR: [
              { name: { contains: query } },
              { user: { email: { contains: query } } },
              { user: { firstName: { contains: query } } },
              { user: { lastName: { contains: query } } },
            ],
          }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            deletedAt: true,
          },
        },
        _count: {
          select: {
            products: { where: { deletedAt: null } },
            sales: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return rows.map((business) => ({
      id: business.id,
      name: business.name,
      currency: business.currency,
      createdAt: business.createdAt,
      products: business._count.products,
      sales: business._count.sales,
      owner: {
        id: business.user.id,
        name: `${business.user.firstName} ${business.user.lastName}`.trim(),
        email: business.user.email,
        phone: business.user.phone,
        suspended: Boolean(business.user.deletedAt),
      },
    }));
  },

  async inventory(search?: string, status?: string) {
    const query = search?.trim();
    const stockStatus = status === 'IN_STOCK' || status === 'LOW_STOCK' || status === 'OUT_OF_STOCK'
      ? status
      : status === 'ALL'
        ? undefined
        : 'ATTENTION' as const;
    const rows = await prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(stockStatus === 'ATTENTION'
          ? { status: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] as const } }
          : stockStatus
            ? { status: stockStatus }
            : {}),
        ...(query
          ? {
            OR: [
              { name: { contains: query } },
              { sku: { contains: query } },
              { business: { name: { contains: query } } },
            ],
          }
          : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        remainingQuantity: true,
        sellingPrice: true,
        business: {
          select: {
            id: true,
            name: true,
            currency: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        },
      },
      orderBy: [{ remainingQuantity: 'asc' }, { name: 'asc' }],
      take: 100,
    });

    return rows.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      status: product.status,
      remainingQuantity: product.remainingQuantity,
      sellingPrice: money(product.sellingPrice),
      businessId: product.business.id,
      businessName: product.business.name,
      currency: product.business.currency,
      ownerId: product.business.user.id,
      ownerName: `${product.business.user.firstName} ${product.business.user.lastName}`.trim(),
      ownerEmail: product.business.user.email,
      ownerPhone: product.business.user.phone,
    }));
  },

  async sales(search?: string) {
    const query = search?.trim();
    const rows = await prisma.sale.findMany({
      where: {
        deletedAt: null,
        ...(query
          ? {
            OR: [
              { business: { name: { contains: query } } },
              { business: { user: { email: { contains: query } } } },
              { receiptNumber: { contains: query } },
            ],
          }
          : {}),
      },
      select: {
        id: true,
        saleDate: true,
        totalAmount: true,
        totalProfit: true,
        paymentMethod: true,
        paymentStatus: true,
        receiptNumber: true,
        business: {
          select: {
            name: true,
            currency: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        items: { take: 3, select: { quantity: true, product: { select: { name: true } } } },
      },
      orderBy: { saleDate: 'desc' },
      take: 80,
    });

    return rows.map((sale) => ({
      id: sale.id,
      saleDate: sale.saleDate,
      totalAmount: money(sale.totalAmount),
      totalProfit: money(sale.totalProfit),
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      receiptNumber: sale.receiptNumber,
      businessName: sale.business.name,
      currency: sale.business.currency,
      ownerId: sale.business.user.id,
      ownerName: `${sale.business.user.firstName} ${sale.business.user.lastName}`.trim(),
      ownerEmail: sale.business.user.email,
      items: sale.items.map((item) => ({ name: item.product.name, quantity: item.quantity })),
    }));
  },

  async purchases(search?: string) {
    const query = search?.trim();
    const rows = await prisma.purchase.findMany({
      where: {
        deletedAt: null,
        ...(query
          ? {
            OR: [
              { business: { name: { contains: query } } },
              { supplier: { name: { contains: query } } },
              { business: { user: { email: { contains: query } } } },
            ],
          }
          : {}),
      },
      select: {
        id: true,
        purchaseDate: true,
        totalCost: true,
        supplier: { select: { name: true } },
        business: {
          select: {
            name: true,
            currency: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 80,
    });

    return rows.map((purchase) => ({
      id: purchase.id,
      purchaseDate: purchase.purchaseDate,
      totalCost: money(purchase.totalCost),
      supplierName: purchase.supplier?.name || 'No supplier',
      itemCount: purchase._count.items,
      businessName: purchase.business.name,
      currency: purchase.business.currency,
      ownerId: purchase.business.user.id,
      ownerName: `${purchase.business.user.firstName} ${purchase.business.user.lastName}`.trim(),
      ownerEmail: purchase.business.user.email,
    }));
  },

  async records(kind: string, search?: string) {
    const query = search?.trim();
    const ownerSelect = {
      name: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    };

    if (kind === 'categories') {
      const rows = await prisma.category.findMany({
        where: {
          deletedAt: null,
          ...(query ? { OR: [{ name: { contains: query } }, { business: { name: { contains: query } } }] } : {}),
        },
        select: { id: true, name: true, business: { select: ownerSelect } },
        orderBy: { name: 'asc' },
        take: 100,
      });
      return rows.map((row) => presentRecord(row.id, row.name, null, row.business));
    }

    if (kind === 'suppliers') {
      const rows = await prisma.supplier.findMany({
        where: {
          deletedAt: null,
          ...(query
            ? {
              OR: [
                { name: { contains: query } },
                { phone: { contains: query } },
                { business: { name: { contains: query } } },
              ],
            }
            : {}),
        },
        select: { id: true, name: true, phone: true, business: { select: ownerSelect } },
        orderBy: { name: 'asc' },
        take: 100,
      });
      return rows.map((row) => presentRecord(row.id, row.name, row.phone, row.business));
    }

    if (kind === 'customers') {
      const rows = await prisma.customer.findMany({
        where: {
          deletedAt: null,
          ...(query
            ? {
              OR: [
                { name: { contains: query } },
                { phone: { contains: query } },
                { business: { name: { contains: query } } },
              ],
            }
            : {}),
        },
        select: { id: true, name: true, phone: true, business: { select: ownerSelect } },
        orderBy: { name: 'asc' },
        take: 100,
      });
      return rows.map((row) => presentRecord(row.id, row.name, row.phone, row.business));
    }

    throw new ValidationError('Unknown record type.');
  },

  async issues() {
    const stuckBefore = new Date(Date.now() - 15 * 60 * 1000);
    const [lowStock, outOfStock, stock, payments, accounts] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null, status: 'LOW_STOCK' } }),
      prisma.product.count({ where: { deletedAt: null, status: 'OUT_OF_STOCK' } }),
      prisma.product.findMany({
        where: { deletedAt: null, status: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] } },
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          remainingQuantity: true,
          business: {
            select: {
              name: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
          },
        },
        orderBy: { remainingQuantity: 'asc' },
        take: 40,
      }),
      prisma.mpesaPrompt.findMany({
        where: {
          OR: [
            { status: { in: ['FAILED', 'CANCELLED'] } },
            { status: 'PENDING', createdAt: { lt: stuckBefore } },
          ],
        },
        select: {
          id: true,
          purpose: true,
          phone: true,
          amount: true,
          status: true,
          resultDesc: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          business: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      prisma.user.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, deletedAt: true },
        orderBy: { deletedAt: 'desc' },
        take: 30,
      }),
    ]);

    return {
      counts: {
        lowStock,
        outOfStock,
        payments: payments.length,
        suspended: accounts.length,
      },
      stock: stock.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        status: product.status,
        remainingQuantity: product.remainingQuantity,
        businessName: product.business.name,
        ownerId: product.business.user.id,
        ownerName: `${product.business.user.firstName} ${product.business.user.lastName}`.trim(),
        ownerEmail: product.business.user.email,
        ownerPhone: product.business.user.phone,
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        purpose: payment.purpose,
        phone: payment.phone,
        amount: money(payment.amount),
        status: payment.status,
        resultDesc: payment.resultDesc,
        createdAt: payment.createdAt,
        businessName: payment.business?.name || null,
        ownerId: payment.user.id,
        ownerName: `${payment.user.firstName} ${payment.user.lastName}`.trim(),
        ownerEmail: payment.user.email,
      })),
      accounts: accounts.map((account) => ({
        id: account.id,
        name: `${account.firstName} ${account.lastName}`.trim(),
        email: account.email,
        phone: account.phone,
        suspendedAt: account.deletedAt,
      })),
    };
  },

  async subscriber(userId: string) {
    const user = await loadUser(userId);
    const stats = await accountStats([user.id]);
    const businessIds = user.businesses.map((business) => business.id);
    const [stock, sales, payments] = await Promise.all([
      businessIds.length
        ? prisma.product.findMany({
          where: { businessId: { in: businessIds }, deletedAt: null, status: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] } },
          select: { id: true, name: true, status: true, remainingQuantity: true, business: { select: { name: true } } },
          orderBy: { remainingQuantity: 'asc' },
          take: 20,
        })
        : [],
      businessIds.length
        ? prisma.sale.findMany({
          where: { businessId: { in: businessIds }, deletedAt: null },
          select: {
            id: true,
            saleDate: true,
            totalAmount: true,
            paymentStatus: true,
            paymentMethod: true,
            business: { select: { name: true, currency: true } },
          },
          orderBy: { saleDate: 'desc' },
          take: 8,
        })
        : [],
      prisma.mpesaPrompt.findMany({
        where: { userId: user.id, status: { in: ['FAILED', 'CANCELLED', 'PENDING'] } },
        select: { id: true, purpose: true, amount: true, status: true, resultDesc: true, createdAt: true, phone: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    return {
      account: presentAdminUser(user, stats.get(user.id)),
      stock,
      sales: sales.map((sale) => ({
        id: sale.id,
        saleDate: sale.saleDate,
        totalAmount: money(sale.totalAmount),
        paymentStatus: sale.paymentStatus,
        paymentMethod: sale.paymentMethod,
        businessName: sale.business.name,
        currency: sale.business.currency,
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        purpose: payment.purpose,
        amount: money(payment.amount),
        status: payment.status,
        resultDesc: payment.resultDesc,
        createdAt: payment.createdAt,
        phone: payment.phone,
      })),
    };
  },
};

function presentRecord(
  id: string,
  name: string,
  detail: string | null,
  business: { name: string; user: { id: string; firstName: string; lastName: string; email: string } },
) {
  return {
    id,
    name,
    detail,
    businessName: business.name,
    ownerId: business.user.id,
    ownerName: `${business.user.firstName} ${business.user.lastName}`.trim(),
    ownerEmail: business.user.email,
  };
}
