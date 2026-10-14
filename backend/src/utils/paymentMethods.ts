import { ValidationError } from './errors';

export const PAYMENT_METHODS = ['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER', 'OTHER'] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHODS)[number];

const ALLOWED = new Set<string>(PAYMENT_METHODS);

function pickedFrom(value: unknown) {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  const picked: PaymentMethodCode[] = [];
  for (const item of raw) {
    const code = String(item).trim();
    if (!ALLOWED.has(code) || picked.includes(code as PaymentMethodCode)) continue;
    picked.push(code as PaymentMethodCode);
  }
  return PAYMENT_METHODS.filter((method) => picked.includes(method));
}

/** Missing or unreadable values keep every method so older shops still tally. */
export function parsePaymentMethods(value: unknown): PaymentMethodCode[] {
  if (value == null || value === '') return [...PAYMENT_METHODS];
  const picked = pickedFrom(value);
  return picked.length ? picked : [...PAYMENT_METHODS];
}

export function serializePaymentMethods(value: unknown) {
  const picked = pickedFrom(value);
  if (!picked.length) {
    throw new ValidationError('Choose at least one payment method.');
  }
  return picked.join(',');
}
