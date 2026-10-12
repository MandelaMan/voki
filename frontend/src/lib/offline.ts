const QUEUE_KEY = 'voki-offline-queue';

export interface OfflineSale {
  offlineId: string;
  businessId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    sellingPrice?: number;
  }>;
  paymentMethod: string;
  notes?: string;
  saleDate: string;
  createdAt: string;
}

export const offlineQueue = {
  getAll(): OfflineSale[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  add(sale: OfflineSale) {
    const queue = this.getAll();
    queue.push(sale);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  remove(offlineId: string) {
    const queue = this.getAll().filter((s) => s.offlineId !== offlineId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clear() {
    localStorage.removeItem(QUEUE_KEY);
  },

  count() {
    return this.getAll().length;
  },
};

const CACHE_KEY = 'voki-product-cache';

export const productCache = {
  get(businessId: string): unknown[] {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      return cache[businessId] || [];
    } catch {
      return [];
    }
  },

  set(businessId: string, products: unknown[]) {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      cache[businessId] = products;
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { /* ignore */ }
  },
};
