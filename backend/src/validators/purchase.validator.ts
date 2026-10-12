import { z } from 'zod';

const purchaseItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
  productId: z.string().uuid().optional(),
});

export const createPurchaseSchema = z.object({
  businessId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  purchaseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
});

export const purchaseQuerySchema = z.object({
  businessId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  supplierId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
