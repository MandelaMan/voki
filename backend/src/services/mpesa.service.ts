import { config } from '../config';
import { prisma } from '../utils/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { normalizeKenyanPhone } from '../utils/phone';
import { planService } from './plan.service';
import { activityRepository } from '../repositories/activity.repository';
import type { Business, MpesaPrompt, MpesaPromptStatus } from '@prisma/client';

type MpesaCreds = {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passkey: string;
  type: 'PAYBILL' | 'TILL';
};

type StkCallback = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number | string;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: string | number }> };
};

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function darajaBase() {
  return config.mpesa.env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

function callbackUrl() {
  return config.mpesa.callbackUrl || `${config.apiPublicUrl}/api/mpesa/callback`;
}

function timestamp() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}${value('month')}${value('day')}${value('hour')}${value('minute')}${value('second')}`;
}

function password(creds: MpesaCreds, stamp: string) {
  return Buffer.from(`${creds.shortCode}${creds.passkey}${stamp}`).toString('base64');
}

function platformCreds(): MpesaCreds | null {
  const { consumerKey, consumerSecret, shortCode, passkey } = config.mpesa;
  if (!consumerKey || !consumerSecret || !shortCode || !passkey) return null;
  return { consumerKey, consumerSecret, shortCode, passkey, type: 'PAYBILL' };
}

export function businessMpesaReady(business: Pick<Business, 'mpesaType' | 'mpesaShortCode' | 'mpesaConsumerKey' | 'mpesaConsumerSecret' | 'mpesaPasskey'>) {
  return Boolean(
    business.mpesaType
    && business.mpesaShortCode
    && business.mpesaConsumerKey
    && business.mpesaConsumerSecret
    && business.mpesaPasskey
  );
}

function businessCreds(business: Business): MpesaCreds | null {
  if (!businessMpesaReady(business) || !business.mpesaType || !business.mpesaShortCode) return null;
  return {
    consumerKey: business.mpesaConsumerKey!,
    consumerSecret: business.mpesaConsumerSecret!,
    shortCode: business.mpesaShortCode,
    passkey: business.mpesaPasskey!,
    type: business.mpesaType,
  };
}

export function presentPrompt(prompt: MpesaPrompt) {
  return {
    id: prompt.id,
    purpose: prompt.purpose,
    phone: prompt.phone,
    amount: Number(prompt.amount),
    status: prompt.status,
    simulated: prompt.simulated,
    saleId: prompt.saleId,
    mpesaReceipt: prompt.mpesaReceipt,
    resultDesc: prompt.resultDesc,
    createdAt: prompt.createdAt,
  };
}

async function accessToken(creds: MpesaCreds) {
  const cached = tokenCache.get(creds.consumerKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString('base64');
  const response = await fetch(`${darajaBase()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const body = await response.json() as { access_token?: string; expires_in?: string };
  if (!response.ok || !body.access_token) {
    logger.error('M-Pesa token request failed', { status: response.status });
    throw new ValidationError('Could not connect to M-Pesa. Check the Lipa na M-Pesa credentials.');
  }
  const expiresIn = Number(body.expires_in || 3600);
  tokenCache.set(creds.consumerKey, {
    token: body.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return body.access_token;
}

async function stkPush(
  creds: MpesaCreds,
  input: { phone: string; amount: number; accountReference: string; description: string }
) {
  const stamp = timestamp();
  const token = await accessToken(creds);
  const response = await fetch(`${darajaBase()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: creds.shortCode,
      Password: password(creds, stamp),
      Timestamp: stamp,
      TransactionType: creds.type === 'TILL' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(input.amount)),
      PartyA: input.phone,
      PartyB: creds.shortCode,
      PhoneNumber: input.phone,
      CallBackURL: callbackUrl(),
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: input.description.slice(0, 13),
    }),
  });
  const body = await response.json() as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };
  if (!response.ok || body.ResponseCode !== '0' || !body.CheckoutRequestID) {
    logger.error('M-Pesa prompt failed', {
      status: response.status,
      code: body.ResponseCode,
      description: body.ResponseDescription || body.errorMessage,
    });
    throw new ValidationError(body.errorMessage || body.ResponseDescription || 'M-Pesa could not send the prompt.');
  }
  return body;
}

async function stkQuery(creds: MpesaCreds, checkoutRequestId: string) {
  const stamp = timestamp();
  const token = await accessToken(creds);
  const response = await fetch(`${darajaBase()}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: creds.shortCode,
      Password: password(creds, stamp),
      Timestamp: stamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const body = await response.json() as {
    ResultCode?: string | number;
    ResultDesc?: string;
    errorMessage?: string;
  };
  const resultDesc = body.ResultDesc || body.errorMessage || '';
  if (/being processed/i.test(resultDesc) || body.ResultCode === undefined || body.ResultCode === '') {
    return { resultCode: null as number | null, resultDesc };
  }
  return { resultCode: Number(body.ResultCode), resultDesc };
}

function metadataValue(callback: StkCallback, name: string) {
  const item = callback.CallbackMetadata?.Item?.find((entry) => entry.Name === name);
  return item?.Value === undefined || item.Value === null ? undefined : String(item.Value);
}

async function credsForPrompt(prompt: MpesaPrompt) {
  if (prompt.purpose === 'SUBSCRIPTION') return platformCreds();
  if (!prompt.businessId) return null;
  const business = await prisma.business.findUnique({ where: { id: prompt.businessId } });
  return business ? businessCreds(business) : null;
}

async function settle(
  promptId: string,
  outcome: { status: Extract<MpesaPromptStatus, 'SUCCESS' | 'FAILED' | 'CANCELLED'>; resultCode?: number; resultDesc?: string; mpesaReceipt?: string }
) {
  const current = await prisma.mpesaPrompt.findUnique({ where: { id: promptId } });
  if (!current || current.status !== 'PENDING') return current;

  const changed = await prisma.mpesaPrompt.updateMany({
    where: { id: promptId, status: 'PENDING' },
    data: {
      status: outcome.status,
      resultCode: outcome.resultCode,
      resultDesc: outcome.resultDesc,
      mpesaReceipt: outcome.mpesaReceipt,
    },
  });
  if (changed.count === 0) return prisma.mpesaPrompt.findUnique({ where: { id: promptId } });

  if (outcome.status === 'SUCCESS' && current.saleId) {
    await prisma.sale.update({
      where: { id: current.saleId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'MPESA',
        ...(outcome.mpesaReceipt ? { mpesaReceipt: outcome.mpesaReceipt } : {}),
      },
    });
  }

  if (current.subscriptionPaymentId) {
    if (outcome.status === 'SUCCESS') {
      const user = await prisma.user.findUnique({ where: { id: current.userId } });
      const base = user?.planExpiresAt && user.planExpiresAt > new Date() ? user.planExpiresAt : new Date();
      const pricing = await planService.pricing();
      const periodEnd = new Date(base.getTime() + pricing.periodDays * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: current.userId },
        data: { plan: 'PREMIUM', planExpiresAt: periodEnd },
      });
      await prisma.subscriptionPayment.update({
        where: { id: current.subscriptionPaymentId },
        data: {
          status: 'SUCCESS',
          mpesaReceipt: outcome.mpesaReceipt,
          resultDesc: outcome.resultDesc,
          periodStart: new Date(),
          periodEnd,
          checkoutRequestId: current.checkoutRequestId,
        },
      });
      await activityRepository.log({
        userId: current.userId,
        action: 'UPGRADE',
        entityType: 'Subscription',
        entityId: current.subscriptionPaymentId,
        metadata: { periodEnd: periodEnd.toISOString() },
      });
    } else {
      await prisma.subscriptionPayment.update({
        where: { id: current.subscriptionPaymentId },
        data: { status: outcome.status, resultDesc: outcome.resultDesc },
      });
    }
  }

  return prisma.mpesaPrompt.findUnique({ where: { id: promptId } });
}

async function refreshPrompt(prompt: MpesaPrompt) {
  if (prompt.status !== 'PENDING' || prompt.simulated || !prompt.checkoutRequestId) return prompt;
  const creds = await credsForPrompt(prompt);
  if (!creds) return prompt;
  try {
    const query = await stkQuery(creds, prompt.checkoutRequestId);
    if (query.resultCode === null) return prompt;
    if (query.resultCode === 0) {
      return await settle(prompt.id, {
        status: 'SUCCESS',
        resultCode: 0,
        resultDesc: query.resultDesc || 'Payment received',
        mpesaReceipt: prompt.mpesaReceipt || undefined,
      }) || prompt;
    }
    return await settle(prompt.id, {
      status: query.resultCode === 1032 ? 'CANCELLED' : 'FAILED',
      resultCode: query.resultCode,
      resultDesc: query.resultDesc,
    }) || prompt;
  } catch (error) {
    logger.warn('M-Pesa status check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return prompt;
  }
}

async function openPrompt(input: {
  userId: string;
  businessId?: string;
  saleId?: string;
  subscriptionPaymentId?: string;
  purpose: 'SALE' | 'SUBSCRIPTION';
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
  creds: MpesaCreds | null;
}) {
  const simulated = !input.creds;
  if (simulated && !config.isDev) {
    throw new ValidationError(
      input.purpose === 'SUBSCRIPTION'
        ? 'M-Pesa billing is not configured yet.'
        : 'Add this shop’s Lipa na M-Pesa details on the Premium page before prompting a customer.'
    );
  }

  const prompt = await prisma.mpesaPrompt.create({
    data: {
      userId: input.userId,
      businessId: input.businessId,
      saleId: input.saleId,
      subscriptionPaymentId: input.subscriptionPaymentId,
      purpose: input.purpose,
      phone: input.phone,
      amount: input.amount,
      accountReference: input.accountReference.slice(0, 12),
      simulated,
      status: 'PENDING',
    },
  });

  if (simulated) {
    const checkoutRequestId = `sim${prompt.id.replace(/-/g, '').slice(0, 16)}`;
    return prisma.mpesaPrompt.update({
      where: { id: prompt.id },
      data: { checkoutRequestId, merchantRequestId: `sim${prompt.id.slice(0, 8)}` },
    });
  }

  try {
    const result = await stkPush(input.creds!, {
      phone: input.phone,
      amount: input.amount,
      accountReference: input.accountReference,
      description: input.description,
    });
    return prisma.mpesaPrompt.update({
      where: { id: prompt.id },
      data: {
        checkoutRequestId: result.CheckoutRequestID,
        merchantRequestId: result.MerchantRequestID,
      },
    });
  } catch (error) {
    await prisma.mpesaPrompt.update({
      where: { id: prompt.id },
      data: {
        status: 'FAILED',
        resultDesc: error instanceof Error ? error.message : 'Prompt failed',
      },
    });
    throw error;
  }
}

export const mpesaService = {
  async requestSalePayment(userId: string, saleId: string, phoneRaw: string) {
    await planService.assertPremium(userId);
    const phone = normalizeKenyanPhone(phoneRaw);
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, deletedAt: null },
      include: { business: true },
    });
    if (!sale || sale.business.userId !== userId || sale.business.deletedAt) {
      throw new NotFoundError('Sale not found');
    }
    if (sale.paymentStatus === 'PAID') throw new ValidationError('This sale is already paid.');
    const amount = Number(sale.totalAmount);
    if (amount < 1) throw new ValidationError('The sale total must be at least KES 1 to prompt M-Pesa.');

    await prisma.mpesaPrompt.updateMany({
      where: { saleId, status: 'PENDING' },
      data: { status: 'CANCELLED', resultDesc: 'Replaced by a new prompt' },
    });

    const prompt = await openPrompt({
      userId,
      businessId: sale.businessId,
      saleId: sale.id,
      purpose: 'SALE',
      phone,
      amount,
      accountReference: `S${sale.id.replace(/-/g, '').slice(0, 11)}`,
      description: 'Voki sale',
      creds: businessCreds(sale.business),
    });
    return presentPrompt(prompt);
  },

  async subscribe(userId: string, phoneRaw: string) {
    const phone = normalizeKenyanPhone(phoneRaw);
    await planService.loadBilling(userId);
    const pricing = await planService.pricing();
    const amount = pricing.priceKes;
    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId,
        amount,
        phone,
        simulated: !platformCreds() && config.isDev,
        status: 'PENDING',
      },
    });

    try {
      const prompt = await openPrompt({
        userId,
        subscriptionPaymentId: payment.id,
        purpose: 'SUBSCRIPTION',
        phone,
        amount,
        accountReference: config.mpesa.accountReference || 'VOKIPREM',
        description: 'Voki Premium',
        creds: platformCreds(),
      });
      await prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { checkoutRequestId: prompt.checkoutRequestId, simulated: prompt.simulated },
      });
      return { paymentId: payment.id, prompt: presentPrompt(prompt) };
    } catch (error) {
      await prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          resultDesc: error instanceof Error ? error.message : 'Prompt failed',
        },
      });
      throw error;
    }
  },

  async getPrompt(userId: string, promptId: string) {
    const prompt = await prisma.mpesaPrompt.findFirst({ where: { id: promptId, userId } });
    if (!prompt) throw new NotFoundError('Prompt not found');
    const fresh = await refreshPrompt(prompt);
    return presentPrompt(fresh);
  },

  async getSubscription(userId: string, paymentId: string) {
    const payment = await prisma.subscriptionPayment.findFirst({
      where: { id: paymentId, userId },
      include: { prompt: true },
    });
    if (!payment) throw new NotFoundError('Payment not found');
    const prompt = payment.prompt ? await refreshPrompt(payment.prompt) : null;
    const billing = await planService.loadBilling(userId);
    return {
      paymentId: payment.id,
      status: prompt?.status || payment.status,
      simulated: payment.simulated,
      prompt: prompt ? presentPrompt(prompt) : null,
      plan: billing.isPremium ? 'PREMIUM' as const : 'FREE' as const,
      isPremium: billing.isPremium,
      planExpiresAt: billing.user.planExpiresAt,
    };
  },

  async simulate(userId: string, promptId: string, action: 'SUCCESS' | 'CANCELLED' = 'SUCCESS') {
    if (!config.isDev) throw new ForbiddenError('Sandbox payments are only available in development.');
    const prompt = await prisma.mpesaPrompt.findFirst({ where: { id: promptId, userId } });
    if (!prompt) throw new NotFoundError('Prompt not found');
    if (!prompt.simulated) throw new ForbiddenError('This prompt was sent to M-Pesa and cannot be simulated.');
    if (prompt.status !== 'PENDING') return presentPrompt(prompt);

    const settled = await settle(prompt.id, action === 'SUCCESS'
      ? {
          status: 'SUCCESS',
          resultCode: 0,
          resultDesc: 'Sandbox payment accepted',
          mpesaReceipt: `SIM${Date.now().toString().slice(-8)}`,
        }
      : {
          status: 'CANCELLED',
          resultCode: 1032,
          resultDesc: 'Cancelled in sandbox',
        });
    return presentPrompt(settled || prompt);
  },

  async handleCallback(body: unknown) {
    const callback = (body as { Body?: { stkCallback?: StkCallback } })?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) return;
    const prompt = await prisma.mpesaPrompt.findUnique({
      where: { checkoutRequestId: callback.CheckoutRequestID },
    });
    if (!prompt || prompt.simulated || prompt.status !== 'PENDING') return;

    const code = Number(callback.ResultCode);
    const receipt = metadataValue(callback, 'MpesaReceiptNumber');
    if (code !== 0) {
      await settle(prompt.id, {
        status: code === 1032 ? 'CANCELLED' : 'FAILED',
        resultCode: Number.isFinite(code) ? code : undefined,
        resultDesc: callback.ResultDesc,
      });
      return;
    }

    if (receipt) {
      await prisma.mpesaPrompt.updateMany({
        where: { id: prompt.id, status: 'PENDING' },
        data: { mpesaReceipt: receipt, resultDesc: callback.ResultDesc },
      });
    }
    const creds = await credsForPrompt(prompt);
    if (!creds) return;
    const query = await stkQuery(creds, callback.CheckoutRequestID);
    if (query.resultCode === null) return;
    if (query.resultCode === 0) {
      await settle(prompt.id, {
        status: 'SUCCESS',
        resultCode: 0,
        resultDesc: query.resultDesc || callback.ResultDesc || 'Payment received',
        mpesaReceipt: receipt,
      });
      return;
    }
    await settle(prompt.id, {
      status: query.resultCode === 1032 ? 'CANCELLED' : 'FAILED',
      resultCode: query.resultCode,
      resultDesc: query.resultDesc,
    });
  },
};
