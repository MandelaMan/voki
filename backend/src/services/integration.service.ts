import { prisma } from '../utils/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { planService } from './plan.service';
import { config } from '../config';

const GEMINI_KEY = 'gemini_api_key';
const REMOVEBG_KEY = 'removebg_api_key';

async function getSecret(businessId: string, key: string) {
  const row = await prisma.setting.findUnique({
    where: { businessId_key: { businessId, key } },
  });
  if (!row || row.value == null) return null;
  if (typeof row.value === 'string') return row.value.trim() || null;
  if (typeof row.value === 'object' && row.value !== null && 'value' in row.value) {
    const nested = (row.value as { value?: unknown }).value;
    return typeof nested === 'string' && nested.trim() ? nested.trim() : null;
  }
  return null;
}

async function setSecret(businessId: string, key: string, value: string | null) {
  if (value === null) {
    await prisma.setting.deleteMany({ where: { businessId, key } });
    return;
  }
  await prisma.setting.upsert({
    where: { businessId_key: { businessId, key } },
    create: { businessId, key, value },
    update: { value },
  });
}

export const integrationService = {
  async summary(userId: string, businessId: string) {
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');

    const [gemini, removeBg] = await Promise.all([
      getSecret(businessId, GEMINI_KEY),
      getSecret(businessId, REMOVEBG_KEY),
    ]);

    const mpesaReady = Boolean(
      business.mpesaType
      && business.mpesaShortCode
      && business.mpesaConsumerKey
      && business.mpesaConsumerSecret
      && business.mpesaPasskey
    );

    return {
      businessId,
      businessName: business.name,
      mpesa: {
        type: business.mpesaType,
        shortCode: business.mpesaShortCode,
        account: business.mpesaAccount,
        ready: mpesaReady,
      },
      gemini: {
        configured: Boolean(gemini),
        usingPlatformFallback: !gemini && Boolean(config.geminiApiKey),
      },
      removeBg: {
        configured: Boolean(removeBg),
        usingPlatformFallback: !removeBg && Boolean(config.removeBgApiKey),
      },
    };
  },

  async update(userId: string, businessId: string, data: {
    mpesaType?: 'PAYBILL' | 'TILL';
    mpesaShortCode?: string;
    mpesaAccount?: string;
    mpesaConsumerKey?: string;
    mpesaConsumerSecret?: string;
    mpesaPasskey?: string;
    clearMpesaCredentials?: boolean;
    geminiApiKey?: string;
    clearGeminiApiKey?: boolean;
    removeBgApiKey?: string;
    clearRemoveBgApiKey?: boolean;
  }) {
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId, deletedAt: null },
    });
    if (!business) throw new NotFoundError('Business not found');

    const touchesPremiumIntegrations = [
      data.mpesaType,
      data.mpesaShortCode,
      data.mpesaAccount,
      data.mpesaConsumerKey,
      data.mpesaConsumerSecret,
      data.mpesaPasskey,
      data.clearMpesaCredentials,
      data.geminiApiKey,
      data.clearGeminiApiKey,
      data.removeBgApiKey,
      data.clearRemoveBgApiKey,
    ].some((value) => value !== undefined);

    if (touchesPremiumIntegrations) {
      await planService.assertPremium(userId);
    }

    const mpesaTouched = [
      data.mpesaType,
      data.mpesaShortCode,
      data.mpesaAccount,
      data.mpesaConsumerKey,
      data.mpesaConsumerSecret,
      data.mpesaPasskey,
      data.clearMpesaCredentials,
    ].some((value) => value !== undefined);

    if (mpesaTouched) {
      if (data.clearMpesaCredentials) {
        await prisma.business.update({
          where: { id: businessId },
          data: {
            mpesaType: null,
            mpesaShortCode: null,
            mpesaAccount: null,
            mpesaConsumerKey: null,
            mpesaConsumerSecret: null,
            mpesaPasskey: null,
          },
        });
      } else {
        await prisma.business.update({
          where: { id: businessId },
          data: {
            ...(data.mpesaType !== undefined ? { mpesaType: data.mpesaType } : {}),
            ...(data.mpesaShortCode !== undefined ? { mpesaShortCode: data.mpesaShortCode || null } : {}),
            ...(data.mpesaAccount !== undefined ? { mpesaAccount: data.mpesaAccount || null } : {}),
            ...(data.mpesaConsumerKey ? { mpesaConsumerKey: data.mpesaConsumerKey } : {}),
            ...(data.mpesaConsumerSecret ? { mpesaConsumerSecret: data.mpesaConsumerSecret } : {}),
            ...(data.mpesaPasskey ? { mpesaPasskey: data.mpesaPasskey } : {}),
          },
        });
      }
    }

    if (data.clearGeminiApiKey) {
      await setSecret(businessId, GEMINI_KEY, null);
    } else if (data.geminiApiKey !== undefined) {
      const key = data.geminiApiKey.trim();
      if (!key) throw new ValidationError('Enter a Gemini API key, or clear the saved one.');
      await setSecret(businessId, GEMINI_KEY, key);
    }

    if (data.clearRemoveBgApiKey) {
      await setSecret(businessId, REMOVEBG_KEY, null);
    } else if (data.removeBgApiKey !== undefined) {
      const key = data.removeBgApiKey.trim();
      if (!key) throw new ValidationError('Enter a remove.bg API key, or clear the saved one.');
      await setSecret(businessId, REMOVEBG_KEY, key);
    }

    return this.summary(userId, businessId);
  },

  async resolveGeminiApiKey(businessId: string) {
    return (await getSecret(businessId, GEMINI_KEY)) || config.geminiApiKey || null;
  },

  async resolveRemoveBgApiKey(businessId?: string) {
    if (businessId) {
      const own = await getSecret(businessId, REMOVEBG_KEY);
      if (own) return own;
    }
    return config.removeBgApiKey || null;
  },
};
