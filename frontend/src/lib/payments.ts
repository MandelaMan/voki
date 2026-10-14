export const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number]['value'];

export function paymentMethodLabel(method: string) {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label || method;
}

/** A shop that has not chosen yet still shows every method, so older sales keep tallying. */
export function businessPaymentMethods(value: unknown): PaymentMethod[] {
  if (value == null || value === '') return PAYMENT_METHOD_OPTIONS.map((option) => option.value);
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return PAYMENT_METHOD_OPTIONS
    .map((option) => option.value)
    .filter((method) => raw.some((item) => String(item).trim() === method));
}
