import { z } from 'zod';

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1),
  sellingPrice: z.number().min(0).optional(),
});

export const createSaleSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  saleDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'MPESA', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
  offlineId: z.string().optional(),
});

export const saleQuerySchema = z.object({
  businessId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.string().uuid().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'MPESA', 'BANK_TRANSFER', 'OTHER']).optional(),
  search: z.string().trim().max(100).optional(),
});

export const syncSalesSchema = z.object({
  sales: z.array(createSaleSchema),
});
