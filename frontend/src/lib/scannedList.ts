import type { ScannedPurchaseDraftItem, ScannedSaleDraftItem } from '../types';

const SALE_KEY = 'voki-scanned-sale';
const PURCHASE_KEY = 'voki-scanned-purchase';

export function saveScannedSaleDraft(items: ScannedSaleDraftItem[]) {
  sessionStorage.setItem(SALE_KEY, JSON.stringify(items));
}

export function takeScannedSaleDraft(): ScannedSaleDraftItem[] | null {
  const raw = sessionStorage.getItem(SALE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(SALE_KEY);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ScannedSaleDraftItem[] : null;
  } catch {
    return null;
  }
}

export function saveScannedPurchaseDraft(items: ScannedPurchaseDraftItem[]) {
  sessionStorage.setItem(PURCHASE_KEY, JSON.stringify(items));
}

export function takeScannedPurchaseDraft(): ScannedPurchaseDraftItem[] | null {
  const raw = sessionStorage.getItem(PURCHASE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PURCHASE_KEY);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ScannedPurchaseDraftItem[] : null;
  } catch {
    return null;
  }
}
