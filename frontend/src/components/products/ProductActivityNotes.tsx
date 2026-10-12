import { formatCurrency, formatRelative } from '../../lib/utils';
import type { Product, ProductActivity } from '../../types';

function pace(days: number | null) {
  if (days == null) return null;
  if (days <= 0) return 'same day';
  if (days === 1) return 'every day';
  if (days < 45) return `every ${days} days`;
  if (days < 365) return `every ${Math.max(1, Math.round(days / 30))} mo`;
  return `every ${Math.max(1, Math.round(days / 365))} yr`;
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

function facts(product: Product, currency: string) {
  const activity: Partial<ProductActivity> = product.activity ?? {};
  const sold = activity.unitsSold ?? product.quantitySold ?? 0;
  const bought = activity.buyCount ?? (product.quantityPurchased > 0 ? 1 : 0);
  const sellPace = pace(activity.saleEveryDays ?? null);
  const buyPace = pace(activity.buyEveryDays ?? null);

  const soldValue = sold === 0
    ? 'None yet'
    : `${sold} ${sold === 1 ? 'unit' : 'units'}${activity.sellThrough != null ? ` · ${activity.sellThrough}% moved` : ''}${sellPace ? ` · ${sellPace}` : ''}`;

  const recent = activity.recentSales ?? [];
  const dates = [...new Set(recent.map((sale) => shortDate(sale.date)))].slice(0, 3);
  let lastValue = 'No sales yet';
  if (recent.length && activity.lastSoldPrice != null) {
    const qty = activity.lastSoldQty && activity.lastSoldQty > 1 ? `${activity.lastSoldQty}× ` : '';
    lastValue = `${dates.join(', ')} · ${qty}${formatCurrency(activity.lastSoldPrice, currency)}`;
  } else if (sold > 0) {
    lastValue = 'Date not recorded';
  }

  const timesWord = bought === 2 ? 'Twice' : `${bought} times`;
  const boughtValue = bought <= 0
    ? 'Not stocked'
    : bought === 1
      ? `Once${activity.lastBoughtAt ? ` · ${formatRelative(activity.lastBoughtAt)}` : ''}`
      : activity.buyEveryDays === 0
        ? `${timesWord}${activity.lastBoughtAt && formatRelative(activity.lastBoughtAt) === 'Today' ? ' today' : ', same day'}`
        : `${timesWord}${buyPace ? ` · ${buyPace}` : ''}`;

  const rows = [
    { label: 'Sold', value: soldValue },
    { label: 'Dates', value: lastValue },
    { label: 'Bought', value: boughtValue },
  ];

  const avg = activity.avgSoldPrice;
  const last = activity.lastSoldPrice;
  if (avg != null && last != null && sold > 1 && Math.abs(avg - last) >= 1) {
    rows.push({ label: 'Typical', value: formatCurrency(avg, currency) });
  }

  return rows;
}

export function ProductActivityNotes({
  product,
  currency,
  spread = false,
}: {
  product: Product;
  currency: string;
  spread?: boolean;
}) {
  const rows = facts(product, currency);

  if (spread) {
    return (
      <dl className="grid grid-cols-3 gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0 rounded-xl bg-slate-50 dark:bg-slate-800/70 px-2.5 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-slate-400">{row.label}</dt>
            <dd className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className="mt-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 px-2.5 py-2 space-y-1">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-3 text-[11px] leading-snug">
          <dt className="text-slate-400 shrink-0 pt-px">{row.label}</dt>
          <dd className="font-medium text-slate-700 dark:text-slate-200 text-right">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
