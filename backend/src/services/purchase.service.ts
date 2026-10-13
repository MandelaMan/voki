import { dbTransaction, prisma } from '../utils/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { activityRepository, getStockStatus } from '../repositories/activity.repository';

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

    return prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({ where: { id: data.businessId } });
      const threshold = business?.lowStockThreshold ?? 5;

      for (const item of data.items) {
        if (!item.productId) continue;
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId: data.businessId, deletedAt: null },
        });
        if (!product) throw new NotFoundError(`Product not found for ${item.name}`);
        if (product.hasVariants) {
          throw new ValidationError(
            `${product.name} has sizes or colors. Open the product and use Restock so the right one gets the units.`
          );
        }

        const newRemaining = product.remainingQuantity + item.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: {
            quantityPurchased: product.quantityPurchased + item.quantity,
            remainingQuantity: newRemaining,
            buyingPrice: item.unitCost,
            status: getStockStatus(newRemaining, threshold),
            ...(data.supplierId && { supplierId: data.supplierId }),
          },
        });
      }

      const purchase = await tx.purchase.create({
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
      }, tx);

      return purchase;
    }, dbTransaction);
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
