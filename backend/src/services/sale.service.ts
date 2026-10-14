import { Prisma } from '@prisma/client';
import { dbTransaction, prisma } from '../utils/prisma';
import { NotFoundError, PremiumRequiredError, ValidationError } from '../utils/errors';
import { getStockStatus } from '../repositories/activity.repository';
import { activityRepository } from '../repositories/activity.repository';
import { planService } from './plan.service';
import { mpesaService } from './mpesa.service';
import { normalizeKenyanPhone } from '../utils/phone';
import { wholeAmount } from '../utils/money';
import { parsePaymentMethods } from '../utils/paymentMethods';

async function upsertCustomer(
  tx: Prisma.TransactionClient,
  businessId: string,
  name?: string,
  phone?: string
) {
  if (phone) {
    const existing = await tx.customer.findFirst({ where: { businessId, phone, deletedAt: null } });
    if (existing) {
      if (name && existing.name !== name) {
        await tx.customer.update({ where: { id: existing.id }, data: { name } });
      }
      return existing.id;
    }
  }

  const created = await tx.customer.create({
    data: {
      businessId,
      name: name || phone || 'Customer',
      phone,
    },
  });
  return created.id;
}

async function assignReceiptNumber(saleId: string, businessId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const count = await prisma.sale.count({
      where: { businessId, receiptNumber: { not: null } },
    });
    const receiptNumber = `R${String(count + 1 + attempt).padStart(4, '0')}`;
    try {
      await prisma.sale.update({ where: { id: saleId }, data: { receiptNumber } });
      return receiptNumber;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
      throw error;
    }
  }

  const receiptNumber = `R${Date.now().toString().slice(-8)}`;
  await prisma.sale.update({ where: { id: saleId }, data: { receiptNumber } });
  return receiptNumber;
}

export const saleService = {
  async list(query: {
    businessId: string;
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
    customerId?: string;
    paymentMethod?: string;
    search?: string;
  }) {
    const { businessId, page, limit, startDate, endDate, customerId, paymentMethod, search } = query;
    const saleDate = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };
    const term = search?.trim();
    const where = {
      businessId,
      deletedAt: null,
      ...(customerId && { customerId }),
      ...(paymentMethod && { paymentMethod: paymentMethod as 'CASH' | 'CARD' | 'MPESA' | 'BANK_TRANSFER' | 'OTHER' }),
      ...(startDate || endDate ? { saleDate } : {}),
      ...(term && {
        items: { some: { product: { name: { contains: term } } } },
      }),
    };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1 },
                },
              },
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
        mpesaPrompts: { orderBy: { createdAt: 'desc' }, take: 1 },
        items: {
          include: {
            product: { include: { images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] } } },
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
    customerName?: string;
    customerPhone?: string;
    promptMpesa?: boolean;
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
    const allowedPayments = parsePaymentMethods(business?.paymentMethods);
    if (!allowedPayments.includes(data.paymentMethod as typeof allowedPayments[number])) {
      throw new ValidationError('That payment method is not enabled for this business.');
    }
    const premium = (await planService.loadBilling(userId)).isPremium;
    const wantsPrompt = Boolean(data.promptMpesa) && !data.offlineId;
    if (wantsPrompt && !premium) {
      throw new PremiumRequiredError('M-Pesa prompts are included with Premium.');
    }
    if (wantsPrompt && data.paymentMethod !== 'MPESA') {
      throw new ValidationError('Choose M-Pesa as the payment method to prompt the customer.');
    }

    const customerName = premium ? data.customerName?.trim() : undefined;
    const customerPhone = premium && data.customerPhone?.trim()
      ? normalizeKenyanPhone(data.customerPhone)
      : undefined;
    if (wantsPrompt && !customerPhone) {
      throw new ValidationError('Enter the customer phone number to send the M-Pesa prompt.');
    }

    if (data.offlineId) {
      const existing = await prisma.sale.findUnique({ where: { offlineId: data.offlineId } });
      if (existing) return existing;
    }

    const sale = await prisma.$transaction(async (tx) => {
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

          const sellPrice = wholeAmount(item.sellingPrice ?? Number(variant.sellingPrice));
          const buyPrice = wholeAmount(variant.buyingPrice);
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

          const variants = await tx.productVariant.findMany({
            where: { productId: product.id, deletedAt: null },
          });
          const totalRemaining = variants.reduce((sum, entry) => sum + entry.remainingQuantity, 0);
          const totalSold = variants.reduce((sum, entry) => sum + entry.quantitySold, 0);
          await tx.product.update({
            where: { id: product.id },
            data: {
              remainingQuantity: totalRemaining,
              quantitySold: totalSold,
              status: getStockStatus(totalRemaining, threshold),
            },
          });
        } else {
          if (product.remainingQuantity < item.quantity) {
            throw new ValidationError(`Insufficient stock for ${product.name}`);
          }

          const sellPrice = wholeAmount(item.sellingPrice ?? Number(product.sellingPrice));
          const buyPrice = wholeAmount(product.buyingPrice);
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

      let customerId = data.customerId;
      if (!customerId && (customerName || customerPhone)) {
        customerId = await upsertCustomer(tx, data.businessId, customerName, customerPhone);
      }

      const sale = await tx.sale.create({
        data: {
          businessId: data.businessId,
          customerId,
          saleDate: data.saleDate ? new Date(data.saleDate) : new Date(),
          paymentMethod: data.paymentMethod as 'CASH' | 'CARD' | 'MPESA' | 'BANK_TRANSFER' | 'OTHER',
          paymentStatus: wantsPrompt ? 'PENDING' : 'PAID',
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
      }, tx);

      return sale;
    }, dbTransaction);

    if (!wantsPrompt || !customerPhone) return sale;

    try {
      const mpesaPrompt = await mpesaService.requestSalePayment(userId, sale.id, customerPhone);
      return { ...sale, mpesaPrompt, promptError: null as string | null };
    } catch (error) {
      return {
        ...sale,
        mpesaPrompt: null,
        promptError: error instanceof Error ? error.message : 'Could not send the M-Pesa prompt.',
      };
    }
  },

  async receipt(userId: string, saleId: string, businessId: string) {
    await planService.assertPremium(userId);
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');

    const sale = await this.get(saleId, businessId);
    const receiptNumber = sale.receiptNumber || await assignReceiptNumber(sale.id, businessId);

    return {
      receiptNumber,
      saleDate: sale.saleDate,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      mpesaReceipt: sale.mpesaReceipt,
      business: {
        name: business.name,
        logo: business.logo,
        currency: business.currency,
        mpesaType: business.mpesaType,
        mpesaShortCode: business.mpesaShortCode,
        mpesaAccount: business.mpesaAccount,
      },
      customer: sale.customer
        ? { name: sale.customer.name, phone: sale.customer.phone }
        : null,
      items: sale.items.map((item) => ({
        name: item.product?.name || 'Item',
        variant: item.variant ? `${item.variant.variantType}: ${item.variant.variantValue}` : null,
        quantity: item.quantity,
        unitPrice: Number(item.sellingPrice),
        lineTotal: Number(item.sellingPrice) * item.quantity,
      })),
      total: Number(sale.totalAmount),
    };
  },

  async markPaid(userId: string, saleId: string, businessId: string, mpesaReceipt?: string) {
    await planService.assertPremium(userId);
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');
    const sale = await prisma.sale.findFirst({ where: { id: saleId, businessId, deletedAt: null } });
    if (!sale) throw new NotFoundError('Sale not found');

    return prisma.sale.update({
      where: { id: saleId },
      data: {
        paymentStatus: 'PAID',
        ...(mpesaReceipt ? { mpesaReceipt } : {}),
      },
      include: {
        customer: true,
        items: { include: { product: true, variant: true } },
      },
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
