import { PlanTier } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { NotFoundError, PremiumRequiredError } from '../utils/errors';

export const PREMIUM_FEATURES = [
  {
    id: 'mpesa_prompt',
    name: 'M-Pesa prompt',
    description: 'Ask the customer to approve an M-Pesa payment on their phone while you record the sale.',
  },
  {
    id: 'receipts',
    name: 'Receipts',
    description: 'Print a receipt, or send it to the customer on WhatsApp.',
  },
  {
    id: 'background',
    name: 'Clean product photos',
    description: 'Remove the background from a product photo before it goes into your catalog.',
  },
  {
    id: 'customers',
    name: 'Customer book',
    description: 'Keep a name and phone with each sale, and see who buys again.',
  },
  {
    id: 'cash_up',
    name: 'End-of-day cash-up',
    description: 'Check the day’s takings by cash, M-Pesa, card, and bank.',
  },
  {
    id: 'restock',
    name: 'Restock suggestions',
    description: 'See which items will run out if they keep selling at the recent pace.',
  },
  {
    id: 'list_ocr',
    name: 'Scan handwritten lists',
    description: 'Photograph a sales or restock list and Voki fills the items for you to review.',
  },
] as const;

export function premiumActive(user: { plan: PlanTier; planExpiresAt: Date | null }) {
  return user.plan === 'PREMIUM' && !!user.planExpiresAt && user.planExpiresAt > new Date();
}

export function presentPlan(user: { plan: PlanTier; planExpiresAt: Date | null }) {
  const isPremium = premiumActive(user);
  return {
    plan: (isPremium ? 'PREMIUM' : 'FREE') as 'FREE' | 'PREMIUM',
    isPremium,
    planExpiresAt: isPremium ? user.planExpiresAt : user.planExpiresAt,
  };
}

export const planService = {
  async loadBilling(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundError('User not found');

    if (user.plan === 'PREMIUM' && user.planExpiresAt && user.planExpiresAt <= new Date()) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { plan: 'FREE' },
      });
      return { user: updated, isPremium: false };
    }

    return { user, isPremium: premiumActive(user) };
  },

  async assertPremium(userId: string) {
    const billing = await this.loadBilling(userId);
    if (!billing.isPremium) {
      throw new PremiumRequiredError('This is included with Premium. You can upgrade from the Premium page.');
    }
    return billing;
  },

  async summary(userId: string, businessId?: string) {
    const billing = await this.loadBilling(userId);
    let businessMpesa: {
      type: string | null;
      shortCode: string | null;
      account: string | null;
      ready: boolean;
    } | null = null;

    if (businessId) {
      const business = await prisma.business.findFirst({
        where: { id: businessId, userId, deletedAt: null },
      });
      if (business) {
        businessMpesa = {
          type: business.mpesaType,
          shortCode: business.mpesaShortCode,
          account: business.mpesaAccount,
          ready: Boolean(
            business.mpesaType
            && business.mpesaShortCode
            && business.mpesaConsumerKey
            && business.mpesaConsumerSecret
            && business.mpesaPasskey
          ),
        };
      }
    }

    const platformReady = Boolean(
      config.mpesa.consumerKey
      && config.mpesa.consumerSecret
      && config.mpesa.shortCode
      && config.mpesa.passkey
    );

    const pricing = await this.pricing();
    return {
      ...presentPlan(billing.user),
      priceKes: pricing.priceKes,
      periodDays: pricing.periodDays,
      currency: pricing.currency,
      simulate: !platformReady && config.isDev,
      features: PREMIUM_FEATURES,
      businessMpesa,
    };
  },

  async pricing() {
    const stored = await prisma.platformSetting.findUnique({ where: { id: 'default' } });
    const priceKes = stored && stored.premiumPriceKes > 0
      ? stored.premiumPriceKes
      : config.premium.priceKes;
    return {
      priceKes,
      periodDays: config.premium.periodDays,
      currency: 'KES' as const,
    };
  },
};
