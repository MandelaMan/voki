import { ValidationError } from './errors';

/** Safaricom expects 2547XXXXXXXX or 2541XXXXXXXX. */
export function normalizeKenyanPhone(input: string) {
  const digits = input.replace(/\D/g, '');
  let phone = digits;
  if (digits.startsWith('0') && digits.length === 10) phone = `254${digits.slice(1)}`;
  else if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) phone = `254${digits}`;
  else if (digits.startsWith('254') && digits.length === 12) phone = digits;

  if (!/^254(7|1)\d{8}$/.test(phone)) {
    throw new ValidationError('Enter a valid Kenyan phone number, like 07XX XXX XXX.');
  }
  return phone;
}
