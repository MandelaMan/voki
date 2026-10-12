import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import { activityRepository } from '../repositories/activity.repository';

export const businessService = {
  async list(userId: string) {
    return prisma.business.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  async get(id: string, userId: string) {
    const business = await prisma.business.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');
    return business;
  },

  async create(userId: string, data: {
    name: string;
    description?: string;
    currency?: string;
    lowStockThreshold?: number;
  }) {
    const business = await prisma.business.create({
      data: { userId, ...data },
    });
    await activityRepository.log({
      userId,
      businessId: business.id,
      action: 'CREATE',
      entityType: 'Business',
      entityId: business.id,
    });
    return business;
  },

  async update(id: string, userId: string, data: Partial<{
    name: string;
    description: string;
    currency: string;
    lowStockThreshold: number;
  }>) {
    await this.get(id, userId);
    return prisma.business.update({ where: { id }, data });
  },

  async delete(id: string, userId: string) {
    await this.get(id, userId);
    return prisma.business.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
