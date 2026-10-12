import { prisma } from '../utils/prisma';
import { NotificationType, Prisma } from '@prisma/client';

export const notificationService = {
  async list(userId: string, businessId?: string) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(businessId && { businessId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },

  async create(data: {
    userId: string;
    businessId?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    return prisma.notification.create({
      data: {
        ...data,
        data: data.data as Prisma.InputJsonValue | undefined,
      },
    });
  },

  async checkLowStock(businessId: string, userId: string) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const lowStockProducts = await prisma.product.findMany({
      where: { businessId, deletedAt: null, status: 'LOW_STOCK' },
      take: 10,
    });

    for (const product of lowStockProducts) {
      await this.create({
        userId,
        businessId,
        type: 'LOW_STOCK',
        title: 'Low Stock Alert',
        message: `${product.name} has only ${product.remainingQuantity} items left`,
        data: { productId: product.id },
      });
    }

    const outOfStock = await prisma.product.findMany({
      where: { businessId, deletedAt: null, status: 'OUT_OF_STOCK' },
      take: 10,
    });

    for (const product of outOfStock) {
      await this.create({
        userId,
        businessId,
        type: 'OUT_OF_STOCK',
        title: 'Out of Stock',
        message: `${product.name} is out of stock`,
        data: { productId: product.id },
      });
    }
  },
};
