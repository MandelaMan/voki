import { z } from 'zod';

export const createSupplierSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  address: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.omit({ businessId: true }).partial();
