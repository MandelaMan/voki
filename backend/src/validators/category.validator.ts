import { z } from 'zod';

export const createCategorySchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.omit({ businessId: true }).partial();
