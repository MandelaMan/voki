import type { QueryClient } from '@tanstack/react-query';

const COMMERCE_KEYS = [
  'product',
  'products',
  'product-search',
  'product-suggestions',
  'purchase-product-search',
  'search',
  'sales',
  'sale',
  'purchases',
  'purchase',
  'dashboard',
  'suppliers',
  'categories',
  'report-profit',
  'report-lowstock',
] as const;

/** Mark every stock, sales, and purchase screen stale and reload it. */
export function refreshCommerce(queryClient: QueryClient) {
  return Promise.all(
    COMMERCE_KEYS.map((key) =>
      queryClient.invalidateQueries({ queryKey: [key], refetchType: 'all' })
    )
  );
}
