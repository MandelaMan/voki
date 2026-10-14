import { ProfitAmount } from '../ui/ProfitAmount';
import { cn, formatCurrency } from '../../lib/utils';
import { paymentMethodLabel } from '../../lib/payments';

const METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-amber-400',
  MPESA: 'bg-emerald-500',
  CARD: 'bg-primary-500',
  BANK_TRANSFER: 'bg-violet-500',
  OTHER: 'bg-slate-400',
};

export function TodayRevenueCard({
  revenue,
  count,
  profit,
  currency,
  collections = [],
}: {
  revenue: number;
  count: number;
  profit: number;
  currency: string;
  collections?: Array<{ method: string; amount: number }>;
}) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const total = collections.reduce((sum, row) => sum + row.amount, 0);
  const share = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);

  return (
    <section className="surface-card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today's revenue</p>
          <p className="text-xs font-medium text-slate-400">{today}</p>
        </div>

        <p className="mt-1.5 text-[2rem] leading-none font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
          {formatCurrency(revenue, currency)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {count} {count === 1 ? 'sale' : 'sales'}
          </span>
          {count > 0 && <ProfitAmount amount={profit} currency={currency} badge />}
        </div>
      </div>

      {collections.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800" role="img" aria-label="Revenue split by payment method">
            {total > 0 && collections.map((row) => row.amount > 0 && (
              <span
                key={row.method}
                className={cn('h-full', METHOD_COLORS[row.method] || 'bg-slate-400')}
                style={{ width: `${(row.amount / total) * 100}%` }}
              />
            ))}
          </div>

          <ul className="mt-3.5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {collections.map((row) => (
              <li key={row.method} className="flex items-center gap-2.5 min-w-0 text-sm">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', METHOD_COLORS[row.method] || 'bg-slate-400')} />
                <span className="truncate text-slate-600 dark:text-slate-300">{paymentMethodLabel(row.method)}</span>
                <span className="ml-auto shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(row.amount, currency)}
                </span>
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-400">{share(row.amount)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
