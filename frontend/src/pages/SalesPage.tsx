import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Camera, ChevronDown, Plus, ShoppingBag, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageHeader, ListRow, FilterTabs, SearchInput } from '../components/ui/PageHeader';
import { Skeleton, EmptyState } from '../components/ui/Badge';
import { ReceiptPrinterOverlay } from '../components/receipt/ReceiptPrinterOverlay';
import { formatCurrency, formatRelative, getImageUrl } from '../lib/utils';
import { businessPaymentMethods, PAYMENT_METHOD_OPTIONS } from '../lib/payments';
import { ProfitAmount } from '../components/ui/ProfitAmount';
import { saleApi } from '../api';
import { useBusinessStore, usePremium } from '../stores';
import type { Sale } from '../types';

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const DATE_FILTERS: Array<{ value: DatePreset; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];

const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((option) => [option.value, option.label]),
);

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next.toISOString();
}

function dateRange(preset: DatePreset, from: string, to: string) {
  const now = new Date();
  if (preset === 'today') return { startDate: startOfDay(now), endDate: endOfDay(now) };
  if (preset === 'week') {
    const start = new Date(now);
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    return { startDate: startOfDay(start), endDate: endOfDay(now) };
  }
  if (preset === 'month') {
    return { startDate: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: endOfDay(now) };
  }
  if (preset === 'custom') {
    return {
      startDate: from ? startOfDay(new Date(`${from}T00:00:00`)) : undefined,
      endDate: to ? endOfDay(new Date(`${to}T00:00:00`)) : undefined,
    };
  }
  return {};
}

function saleThumbnail(sale: Sale) {
  for (const item of sale.items || []) {
    const image = item.product?.images?.[0];
    const url = getImageUrl(image?.path);
    if (url) return { url, name: item.product?.name || 'Sold item' };
  }
  return { url: null, name: sale.items?.[0]?.product?.name || 'Sale' };
}

export default function SalesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPremium = usePremium();
  const { activeBusiness } = useBusinessStore();
  const [preset, setPreset] = useState<DatePreset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [payment, setPayment] = useState('');
  const [search, setSearch] = useState('');
  const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const range = useMemo(() => dateRange(preset, from, to), [preset, from, to]);
  const allowedPayments = businessPaymentMethods(activeBusiness?.paymentMethods);
  const paymentOptions = [
    { value: '', label: 'All payments' },
    ...PAYMENT_METHOD_OPTIONS.filter((option) => allowedPayments.includes(option.value)),
  ];
  const paymentFilter = allowedPayments.includes(payment as typeof allowedPayments[number]) ? payment : '';
  const filtersActive = preset !== 'all' || !!paymentFilter || !!search.trim();

  useEffect(() => {
    const state = location.state as { printReceiptId?: string } | null;
    if (!state?.printReceiptId || !isPremium) return;
    setPrintReceiptId(state.printReceiptId);
    navigate(location.pathname, { replace: true, state: null });
  }, [isPremium, location.pathname, location.state, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', activeBusiness?.id, range.startDate, range.endDate, paymentFilter, deferredSearch],
    queryFn: () =>
      saleApi.list({
        businessId: activeBusiness!.id,
        limit: 50,
        startDate: range.startDate,
        endDate: range.endDate,
        paymentMethod: paymentFilter || undefined,
        search: deferredSearch || undefined,
      }),
    enabled: !!activeBusiness?.id,
  });

  const currency = activeBusiness?.currency || 'USD';
  const total = data?.pagination.total || 0;

  const clearFilters = () => {
    setPreset('all');
    setFrom('');
    setTo('');
    setPayment('');
    setSearch('');
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Sales"
        subtitle={`${total} ${total === 1 ? 'sale' : 'sales'}`}
        action={<Button to="/sales/new" size="sm"><Plus size={18} /> New Sale</Button>}
      />

      <div className="space-y-3">
        {isPremium && (
          <div className="flex flex-wrap items-center gap-2">
            <Button to="/lists/scan?kind=SALE" variant="secondary" size="sm">
              <Camera size={15} /> Scan list
            </Button>
            <Button to="/customers" variant="secondary" size="sm">
              <Users size={15} /> Customers
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <FilterTabs
            options={DATE_FILTERS}
            value={preset}
            onChange={setPreset}
            className="min-w-0 flex-1"
          />
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 rounded-full px-2.5 py-1.5 text-caption font-semibold text-slate-500 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="From"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="surface-input h-11 min-w-0 flex-1 px-3 text-body text-slate-900 dark:text-slate-100"
            />
            <span className="text-caption text-slate-400">to</span>
            <input
              type="date"
              aria-label="To"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="surface-input h-11 min-w-0 flex-1 px-3 text-body text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        <div className="flex items-stretch gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search items"
            className="min-w-0"
          />
          <div className="relative shrink-0">
            <select
              aria-label="Payment method"
              value={paymentFilter}
              onChange={(e) => setPayment(e.target.value)}
              className="surface-input h-full min-h-[44px] appearance-none pl-3 pr-8 text-body text-slate-700 outline-none dark:text-slate-200"
            >
              {paymentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data?.sales.length ? (
        <EmptyState
          title={filtersActive ? 'No matching sales' : 'No sales yet'}
          action={filtersActive ? undefined : <Button to="/sales/new">Record Sale</Button>}
        />
      ) : (
        <div className="space-y-2">
          {data.sales.map((sale) => {
            const thumb = saleThumbnail(sale);
            return (
              <Link key={sale.id} to={`/sales/${sale.id}`}>
                <ListRow
                  thumbnail={thumb.url}
                  thumbnailAlt={thumb.name}
                  icon={<ShoppingBag size={18} />}
                  title={sale.items?.map((i) => i.product?.name).filter(Boolean).join(', ') || 'Sale'}
                  subtitle={`${formatRelative(sale.saleDate)} · ${sale.paymentStatus === 'PENDING' ? 'Waiting for M-Pesa' : (PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod)}`}
                  trailing={
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-body-medium font-bold text-primary-600">{formatCurrency(Number(sale.totalAmount), currency)}</p>
                      <ProfitAmount amount={Number(sale.totalProfit)} currency={currency} badge />
                    </div>
                  }
                />
              </Link>
            );
          })}
        </div>
      )}

      {printReceiptId && (
        <ReceiptPrinterOverlay
          saleId={printReceiptId}
          onClose={() => setPrintReceiptId(null)}
        />
      )}
    </div>
  );
}
