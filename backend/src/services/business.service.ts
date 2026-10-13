import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import { activityRepository } from '../repositories/activity.repository';
import { planService } from './plan.service';

function presentBusiness<T extends {
  mpesaType: string | null;
  mpesaShortCode: string | null;
  mpesaConsumerKey: string | null;
  mpesaConsumerSecret: string | null;
  mpesaPasskey: string | null;
}>(business: T) {
  const mpesaReady = Boolean(
    business.mpesaType
    && business.mpesaShortCode
    && business.mpesaConsumerKey
    && business.mpesaConsumerSecret
    && business.mpesaPasskey
  );
  const { mpesaConsumerKey: _key, mpesaConsumerSecret: _secret, mpesaPasskey: _passkey, ...safe } = business;
  return { ...safe, mpesaReady };
}

export const businessService = {
  async list(userId: string) {
    const businesses = await prisma.business.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return businesses.map(presentBusiness);
  },

  async getOwned(id: string, userId: string) {
    const business = await prisma.business.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');
    return business;
  },

  async get(id: string, userId: string) {
    return presentBusiness(await this.getOwned(id, userId));
  },

  async create(userId: string, data: {
    name: string;
    description?: string;
    currency?: string;
    lowStockThreshold?: number;
  }) {
    const business = await prisma.business.create({
      data: { userId, ...data, currency: data.currency || 'KES' },
    });
    await activityRepository.log({
      userId,
      businessId: business.id,
      action: 'CREATE',
      entityType: 'Business',
      entityId: business.id,
    });
    return presentBusiness(business);
  },

  async update(id: string, userId: string, data: Partial<{
    name: string;
    description: string;
    currency: string;
    lowStockThreshold: number;
    mpesaType: 'PAYBILL' | 'TILL';
    mpesaShortCode: string;
    mpesaAccount: string;
    mpesaConsumerKey: string;
    mpesaConsumerSecret: string;
    mpesaPasskey: string;
    clearMpesaCredentials: boolean;
  }>) {
    await this.getOwned(id, userId);
    const mpesaFields = [
      data.mpesaType,
      data.mpesaShortCode,
      data.mpesaAccount,
      data.mpesaConsumerKey,
      data.mpesaConsumerSecret,
      data.mpesaPasskey,
      data.clearMpesaCredentials,
    ];
    if (mpesaFields.some((value) => value !== undefined)) {
      await planService.assertPremium(userId);
    }

    const next: Prisma.BusinessUpdateInput = {};
    if (data.name !== undefined) next.name = data.name;
    if (data.description !== undefined) next.description = data.description;
    if (data.currency !== undefined) next.currency = data.currency;
    if (data.lowStockThreshold !== undefined) next.lowStockThreshold = data.lowStockThreshold;

    if (data.clearMpesaCredentials) {
      next.mpesaType = null;
      next.mpesaShortCode = null;
      next.mpesaAccount = null;
      next.mpesaConsumerKey = null;
      next.mpesaConsumerSecret = null;
      next.mpesaPasskey = null;
    } else {
      if (data.mpesaType !== undefined) next.mpesaType = data.mpesaType;
      if (data.mpesaShortCode !== undefined) next.mpesaShortCode = data.mpesaShortCode || null;
      if (data.mpesaAccount !== undefined) next.mpesaAccount = data.mpesaAccount || null;
      if (data.mpesaConsumerKey) next.mpesaConsumerKey = data.mpesaConsumerKey;
      if (data.mpesaConsumerSecret) next.mpesaConsumerSecret = data.mpesaConsumerSecret;
      if (data.mpesaPasskey) next.mpesaPasskey = data.mpesaPasskey;
    }

    const updated = await prisma.business.update({ where: { id }, data: next });
    return presentBusiness(updated);
  },

  async delete(id: string, userId: string) {
    await this.getOwned(id, userId);
    return presentBusiness(await prisma.business.update({
      where: { id },
      data: { deletedAt: new Date() },
    }));
  },
};
