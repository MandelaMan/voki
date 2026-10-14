import { z } from 'zod';

const paymentMethodSchema = z.enum(['CASH', 'CARD', 'MPESA', 'BANK_TRANSFER', 'OTHER']);

export const createBusinessSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  currency: z.string().min(1).default('KES'),
  lowStockThreshold: z.number().int().min(0).default(5),
  paymentMethods: z.array(paymentMethodSchema).min(1),
});

export const updateBusinessSchema = createBusinessSchema.partial().extend({
  mpesaType: z.enum(['PAYBILL', 'TILL']).optional(),
  mpesaShortCode: z.string().trim().max(20).optional(),
  mpesaAccount: z.string().trim().max(20).optional(),
  mpesaConsumerKey: z.string().trim().max(200).optional(),
  mpesaConsumerSecret: z.string().trim().max(200).optional(),
  mpesaPasskey: z.string().trim().max(200).optional(),
  clearMpesaCredentials: z.boolean().optional(),
});
