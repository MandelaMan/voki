import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Plus, Search, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageHeader, ListRow } from '../components/ui/PageHeader';
import { Skeleton, EmptyState } from '../components/ui/Badge';
import { cn, formatCurrency, formatRelative, getImageUrl } from '../lib/utils';
import { saleApi } from '../api';
import { useBusinessStore } from '../stores';
import type { Sale } from '../types';

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const DATE_FILTERS: Array<{ value: DatePreset; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];

const PAYMENT_OPTIONS = [
  { value: '', label: 'All payments' },
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'OTHER', label: 'Other' },
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MPESA: 'M-Pesa',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

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
  const { activeBusiness } = useBusinessStore();
  const [preset, setPreset] = useState<DatePreset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [payment, setPayment] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const range = useMemo(() => dateRange(preset, from, to), [preset, from, to]);
  const filtersActive = preset !== 'all' || !!payment || !!search.trim();

  const { data, isLoading } = useQuery({
    queryKey: ['sales', activeBusiness?.id, range.startDate, range.endDate, payment, deferredSearch],
    queryFn: () =>
      saleApi.list({
        businessId: activeBusiness!.id,
        limit: 50,
        startDate: range.startDate,
        endDate: range.endDate,
        paymentMethod: payment || undefined,
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

      <div className="surface-card space-y-1.5 p-1.5">
        <div className="flex items-center gap-1">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-hide">
            {DATE_FILTERS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreset(opt.value)}
                className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold',
                  preset === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-1.5 px-0.5">
            <input
              type="date"
              aria-label="From"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              aria-label="To"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        )}

        <div className="flex gap-1.5">
          <label className="flex min-w-0 flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <Search size={14} className="ml-2.5 shrink-0 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items"
              className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </label>
          <div className="relative shrink-0">
            <select
              aria-label="Payment method"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-2.5 pr-7 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data?.sales.length ? (
        <EmptyState
          title={filtersActive ? 'No matching sales' : 'No sales yet'}
          description={
            filtersActive
              ? 'Try a different date, payment method, or item name'
              : 'Record your first sale to start tracking revenue'
          }
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
                    <div>
                      <p className="text-body-medium font-bold text-primary-600">{formatCurrency(Number(sale.totalAmount), currency)}</p>
                      <p className="text-caption text-emerald-600">+{formatCurrency(Number(sale.totalProfit), currency)}</p>
                    </div>
                  }
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
