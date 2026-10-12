import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LOCALE: Record<string, string> = {
  KES: 'en-KE',
  UGX: 'en-UG',
  TZS: 'sw-TZ',
  RWF: 'rw-RW',
  NGN: 'en-NG',
  GHS: 'en-GH',
  ZAR: 'en-ZA',
  EUR: 'en-IE',
  GBP: 'en-GB',
  INR: 'en-IN',
};

function currencyCode(currency?: string) {
  const code = (currency || 'USD').trim().toUpperCase();
  return code || 'USD';
}

export function currencySymbol(currency = 'USD') {
  const code = currencyCode(currency);
  try {
    const parts = new Intl.NumberFormat(CURRENCY_LOCALE[code] || 'en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

export function formatCurrency(amount: number, currency = 'USD') {
  const code = currencyCode(currency);
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[code] || 'en-US', {
      style: 'currency',
      currency: code,
    }).format(safe);
  } catch {
    return `${code} ${safe.toFixed(2)}`;
  }
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatRelative(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

export const API_ORIGIN = import.meta.env.PROD ? 'https://voki.onrender.com' : '';

export function getImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_ORIGIN}${path}`;
}

export function getStockStatusColor(status: string) {
  switch (status) {
    case 'IN_STOCK': return 'bg-emerald-500 text-white';
    case 'LOW_STOCK': return 'bg-rose-500 text-white';
    case 'OUT_OF_STOCK': return 'bg-slate-800 text-white dark:bg-slate-700';
    default: return 'bg-slate-500 text-white';
  }
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getStockStatusLabel(status: string) {
  switch (status) {
    case 'IN_STOCK': return 'In Stock';
    case 'LOW_STOCK': return 'Low Stock';
    case 'OUT_OF_STOCK': return 'Out of Stock';
    default: return status;
  }
}

export function getProductStock(product: { remainingQuantity: number; hasVariants?: boolean; variants?: Array<{ remainingQuantity: number }> }) {
  if (product.hasVariants && product.variants?.length) {
    return product.variants.reduce((sum, v) => sum + v.remainingQuantity, 0);
  }
  return product.remainingQuantity;
}

export function getStockStatusShortLabel(status: string) {
  switch (status) {
    case 'IN_STOCK': return 'In stock';
    case 'LOW_STOCK': return 'Low Stock';
    case 'OUT_OF_STOCK': return 'Out of Stock';
    default: return status;
  }
}

export function isProductOutOfStock(product: { remainingQuantity: number; hasVariants?: boolean; variants?: Array<{ remainingQuantity: number }> }) {
  return getProductStock(product) <= 0;
}

export function getFirstInStockVariant<T extends { remainingQuantity: number }>(variants: T[]): T | undefined {
  return variants.find((v) => v.remainingQuantity > 0);
}
