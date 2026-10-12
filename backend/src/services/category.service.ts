import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export const categoryService = {
  async list(businessId: string) {
    return prisma.category.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  },

  async get(id: string, businessId: string) {
    const category = await prisma.category.findFirst({
      where: { id, businessId, deletedAt: null },
    });
    if (!category) throw new NotFoundError('Category not found');
    return category;
  },

  async create(data: {
    businessId: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }) {
    return prisma.category.create({ data });
  },

  async update(id: string, businessId: string, data: Partial<{
    name: string;
    description: string;
    color: string;
    icon: string;
  }>) {
    await this.get(id, businessId);
    return prisma.category.update({ where: { id }, data });
  },

  async delete(id: string, businessId: string) {
    await this.get(id, businessId);
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
