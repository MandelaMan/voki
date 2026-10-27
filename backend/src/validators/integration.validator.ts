import { z } from 'zod';

export const updateIntegrationsSchema = z.object({
  businessId: z.string().uuid(),
  mpesaType: z.enum(['PAYBILL', 'TILL']).optional(),
  mpesaShortCode: z.string().trim().max(20).optional(),
  mpesaAccount: z.string().trim().max(20).optional(),
  mpesaConsumerKey: z.string().trim().max(200).optional(),
  mpesaConsumerSecret: z.string().trim().max(200).optional(),
  mpesaPasskey: z.string().trim().max(200).optional(),
  clearMpesaCredentials: z.boolean().optional(),
  geminiApiKey: z.string().trim().max(500).optional(),
  clearGeminiApiKey: z.boolean().optional(),
  removeBgApiKey: z.string().trim().max(500).optional(),
  clearRemoveBgApiKey: z.boolean().optional(),
});
