/** Where each Premium feature opens inside the app. */
export const PREMIUM_FEATURE_LINKS: Record<string, { to: string; label: string }> = {
  mpesa_prompt: { to: '/settings/configurations', label: 'Set up Daraja' },
  receipts: { to: '/sales', label: 'Open sales' },
  background: { to: '/inventory/new', label: 'Add a product' },
  customers: { to: '/customers', label: 'Customer book' },
  cash_up: { to: '/reports#cash-up', label: 'Cash-up' },
  restock: { to: '/reports#restock', label: 'Restock ideas' },
  list_ocr: { to: '/lists/scan', label: 'Scan a list' },
};

/** Hash-aware scroll targets used from menus and Plan. */
export const PREMIUM_REPORT_ANCHORS = {
  cashUp: '/reports#cash-up',
  restock: '/reports#restock',
} as const;

/** Main-menu shortcuts for Premium tools (shop accounts). */
export const PREMIUM_MENU_LINKS = [
  { to: '/plan', label: 'Premium', description: 'Plan, billing, and M-Pesa setup' },
  { to: '/lists/scan', label: 'Scan a list', description: 'Photograph sales or restock lists' },
  { to: '/customers', label: 'Customers', description: 'Names and phones from sales' },
  { to: '/reports#cash-up', label: 'Cash-up', description: 'End-of-day takings by method' },
  { to: '/reports#restock', label: 'Restock ideas', description: 'What to order next' },
] as const;
