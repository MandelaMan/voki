export const CURRENCIES = [
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'UGX', label: 'UGX — Ugandan Shilling' },
  { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
  { value: 'RWF', label: 'RWF — Rwandan Franc' },
  { value: 'ETB', label: 'ETB — Ethiopian Birr' },
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'CNY', label: 'CNY — Chinese Yuan' },
];

export function currencyOptions(current?: string) {
  const code = (current || '').trim().toUpperCase();
  if (code && !CURRENCIES.some((currency) => currency.value === code)) {
    return [{ value: code, label: code }, ...CURRENCIES];
  }
  return CURRENCIES;
}
