import { prisma } from '../utils/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { getStockStatus } from '../repositories/activity.repository';
import { activityRepository } from '../repositories/activity.repository';

export const saleService = {
  async list(query: {
    businessId: string;
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
    customerId?: string;
  }) {
    const { businessId, page, limit, startDate, endDate, customerId } = query;
    const where = {
      businessId,
      deletedAt: null,
      ...(customerId && { customerId }),
      ...(startDate && { saleDate: { gte: new Date(startDate) } }),
      ...(endDate && { saleDate: { lte: new Date(endDate) } }),
    };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: {
              product: { include: { images: { take: 1 } } },
              variant: true,
            },
          },
        },
        orderBy: { saleDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return { sales, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async get(id: string, businessId: string) {
    const sale = await prisma.sale.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        customer: true,
        items: {
          include: {
            product: { include: { images: true } },
            variant: true,
          },
        },
      },
    });
    if (!sale) throw new NotFoundError('Sale not found');
    return sale;
  },

  async create(userId: string, data: {
    businessId: string;
    customerId?: string;
    saleDate?: string;
    paymentMethod: string;
    notes?: string;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      sellingPrice?: number;
    }>;
    offlineId?: string;
  }) {
    const business = await prisma.business.findUnique({ where: { id: data.businessId } });
    const threshold = business?.lowStockThreshold ?? 5;

    if (data.offlineId) {
      const existing = await prisma.sale.findUnique({ where: { offlineId: data.offlineId } });
      if (existing) return existing;
    }

    return prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      let totalProfit = 0;
      const saleItems: Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        sellingPrice: number;
        buyingPrice: number;
        profit: number;
      }> = [];

      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId: data.businessId, deletedAt: null },
          include: { variants: true },
        });
        if (!product) throw new NotFoundError(`Product ${item.productId} not found`);

        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) throw new NotFoundError('Variant not found');
          if (variant.remainingQuantity < item.quantity) {
            throw new ValidationError(`Insufficient stock for ${product.name} (${variant.variantValue})`);
          }

          const sellPrice = item.sellingPrice ?? Number(variant.sellingPrice);
          const buyPrice = Number(variant.buyingPrice);
          const profit = (sellPrice - buyPrice) * item.quantity;

          saleItems.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            sellingPrice: sellPrice,
            buyingPrice: buyPrice,
            profit,
          });

          const newRemaining = variant.remainingQuantity - item.quantity;
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              quantitySold: variant.quantitySold + item.quantity,
              remainingQuantity: newRemaining,
              status: getStockStatus(newRemaining, threshold),
            },
          });
        } else {
          if (product.remainingQuantity < item.quantity) {
            throw new ValidationError(`Insufficient stock for ${product.name}`);
          }

          const sellPrice = item.sellingPrice ?? Number(product.sellingPrice);
          const buyPrice = Number(product.buyingPrice);
          const profit = (sellPrice - buyPrice) * item.quantity;

          saleItems.push({
            productId: item.productId,
            quantity: item.quantity,
            sellingPrice: sellPrice,
            buyingPrice: buyPrice,
            profit,
          });

          const newRemaining = product.remainingQuantity - item.quantity;
          await tx.product.update({
            where: { id: product.id },
            data: {
              quantitySold: product.quantitySold + item.quantity,
              remainingQuantity: newRemaining,
              status: getStockStatus(newRemaining, threshold),
            },
          });
        }

        totalAmount += saleItems[saleItems.length - 1].sellingPrice * item.quantity;
        totalProfit += saleItems[saleItems.length - 1].profit;
      }

      const sale = await tx.sale.create({
        data: {
          businessId: data.businessId,
          customerId: data.customerId,
          saleDate: data.saleDate ? new Date(data.saleDate) : new Date(),
          paymentMethod: data.paymentMethod as 'CASH' | 'CARD' | 'MPESA' | 'BANK_TRANSFER' | 'OTHER',
          notes: data.notes,
          totalAmount,
          totalProfit,
          offlineId: data.offlineId,
          items: { create: saleItems },
        },
        include: {
          items: { include: { product: true, variant: true } },
        },
      });

      await activityRepository.log({
        userId,
        businessId: data.businessId,
        action: 'CREATE',
        entityType: 'Sale',
        entityId: sale.id,
        metadata: { totalAmount, totalProfit },
      });

      return sale;
    });
  },

  async syncOffline(userId: string, sales: Parameters<typeof this.create>[1][]) {
    const results = [];
    for (const saleData of sales) {
      try {
        const sale = await this.create(userId, saleData);
        results.push({ success: true, sale, offlineId: saleData.offlineId });
      } catch (error) {
        results.push({
          success: false,
          offlineId: saleData.offlineId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return results;
  },
};
