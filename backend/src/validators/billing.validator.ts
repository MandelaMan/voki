import { z } from 'zod';

export const subscribeSchema = z.object({
  phone: z.string().trim().min(9).max(20),
});

export const simulatePromptSchema = z.object({
  action: z.enum(['SUCCESS', 'CANCELLED']).optional(),
});

export const adminPriceSchema = z.object({
  priceKes: z.number().int().min(1).max(1_000_000),
});

export const adminPlanSchema = z.object({
  plan: z.enum(['FREE', 'PREMIUM']),
  days: z.number().int().min(1).max(3650).optional(),
});

export const adminStatusSchema = z.object({
  suspended: z.boolean(),
});
