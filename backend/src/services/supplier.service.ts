import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export const supplierService = {
  async list(businessId: string) {
    return prisma.supplier.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        products: {
          where: { deletedAt: null },
          select: { id: true, name: true, sku: true, remainingQuantity: true, status: true },
          orderBy: { name: 'asc' },
        },
      },
    });
  },

  async get(id: string, businessId: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, businessId, deletedAt: null },
    });
    if (!supplier) throw new NotFoundError('Supplier not found');
    return supplier;
  },

  async create(data: {
    businessId: string;
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
    address?: string;
  }) {
    return prisma.supplier.create({ data });
  },

  async update(id: string, businessId: string, data: Partial<{
    name: string;
    phone: string;
    email: string;
    notes: string;
    address: string;
  }>) {
    await this.get(id, businessId);
    const { name, phone, email, notes, address } = data;
    return prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(notes !== undefined && { notes }),
        ...(address !== undefined && { address }),
      },
    });
  },

  async delete(id: string, businessId: string) {
    await this.get(id, businessId);
    return prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
