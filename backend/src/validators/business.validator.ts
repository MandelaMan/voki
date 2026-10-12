import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  currency: z.string().min(1).default('KES'),
  lowStockThreshold: z.number().int().min(0).default(5),
});

export const updateBusinessSchema = createBusinessSchema.partial();
