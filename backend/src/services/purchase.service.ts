import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import { activityRepository } from '../repositories/activity.repository';

export const purchaseService = {
  async list(query: {
    businessId: string;
    page: number;
    limit: number;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { businessId, page, limit, supplierId, startDate, endDate } = query;
    const where = {
      businessId,
      deletedAt: null,
      ...(supplierId && { supplierId }),
      ...(startDate && { purchaseDate: { gte: new Date(startDate) } }),
      ...(endDate && { purchaseDate: { lte: new Date(endDate) } }),
    };

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          supplier: true,
          items: true,
          _count: { select: { products: true } },
        },
        orderBy: { purchaseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    return { purchases, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async get(id: string, businessId: string) {
    const purchase = await prisma.purchase.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        supplier: true,
        items: { include: { product: { include: { images: { take: 1 } } } } },
        products: { include: { images: { take: 1 }, variants: true } },
      },
    });
    if (!purchase) throw new NotFoundError('Purchase not found');
    return purchase;
  },

  async create(userId: string, data: {
    businessId: string;
    supplierId?: string;
    purchaseDate: string;
    receiptNumber?: string;
    notes?: string;
    items: Array<{ name: string; quantity: number; unitCost: number; productId?: string }>;
    receiptPath?: string;
    invoicePath?: string;
  }) {
    const totalCost = data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    const purchase = await prisma.purchase.create({
      data: {
        businessId: data.businessId,
        supplierId: data.supplierId,
        purchaseDate: new Date(data.purchaseDate),
        receiptNumber: data.receiptNumber,
        receiptPath: data.receiptPath,
        invoicePath: data.invoicePath,
        notes: data.notes,
        totalCost,
        items: {
          create: data.items.map((item) => ({
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
      action: 'CREATE',
      entityType: 'Purchase',
      entityId: purchase.id,
      metadata: { totalCost },
    });

    return purchase;
  },

  async updateReceipt(id: string, businessId: string, receiptPath?: string, invoicePath?: string) {
    await this.get(id, businessId);
    return prisma.purchase.update({
      where: { id },
      data: {
        ...(receiptPath && { receiptPath }),
        ...(invoicePath && { invoicePath }),
      },
    });
  },
};
