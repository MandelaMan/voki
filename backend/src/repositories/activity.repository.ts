import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { StockStatus } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export const activityRepository = {
  async log(
    data: {
      userId: string;
      businessId?: string;
      action: string;
      entityType: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    },
    db: Db = prisma
  ) {
    return db.activityLog.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  },
};

export const getStockStatus = (remaining: number, threshold: number): StockStatus => {
  if (remaining <= 0) return StockStatus.OUT_OF_STOCK;
  if (remaining <= threshold) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
};
