import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Download, Expand, FileText, Lightbulb, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Badge';
import { FilterTabs, PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../lib/utils';
import { ProfitAmount } from '../components/ui/ProfitAmount';
import { dashboardApi, reportApi } from '../api';
import { PremiumNotice } from '../components/billing/PremiumNotice';
import { useBusinessStore, usePremium } from '../stores';
import type { Sale } from '../types';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

const METHOD_COLORS: Record<string, string> = {
  CASH: '#3b5fe6',
  MPESA: '#10b981',
  CARD: '#f59e0b',
  BANK_TRANSFER: '#8b5cf6',
  OTHER: '#94a3b8',
};

const STOCK_COLORS = ['#ef4444', '#f59e0b', '#3b5fe6', '#6366f1', '#94a3b8'];
const CHART_TOOLTIP = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: 'var(--shadow-soft-lg)',
} as const;

type ExpandedChart = 'trend' | 'products' | 'lowstock' | 'payments' | null;

function truncateLabel(value: string, max = 14) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function ChartSectionHeader({
  title,
  description,
  onExpand,
}: {
  title: string;
  description?: string;
  onExpand?: () => void;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-heading">{title}</h3>
        {description && <p className="text-caption text-slate-500 mt-0.5">{description}</p>}
      </div>
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
          aria-label={`Expand ${title}`}
          title="Expand"
        >
          <Expand size={16} />
        </button>
      )}
    </div>
  );
}

function TrendChartView({
  data,
  currency,
  height,
  idSuffix,
}: {
  data: Array<{ label: string; fullLabel: string; revenue: number; profit: number }>;
  currency: string;
  height: number;
  idSuffix: string;
}) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`reportRevenue-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b5fe6" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#3b5fe6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`reportProfit-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={52} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(Number(value), currency),
              name === 'revenue' ? 'Revenue' : 'Profit',
            ]}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload as { fullLabel?: string } | undefined;
              return point?.fullLabel || '';
            }}
            contentStyle={CHART_TOOLTIP}
          />
          <Area type="monotone" dataKey="revenue" stroke="#3b5fe6" fill={`url(#reportRevenue-${idSuffix})`} strokeWidth={2.5} />
          <Area type="monotone" dataKey="profit" stroke="#10b981" fill={`url(#reportProfit-${idSuffix})`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-4 text-caption text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#3b5fe6]" /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#10b981]" /> Profit
        </span>
      </div>
    </>
  );
}

function ProductProfitList({
  rows,
  currency,
}: {
  rows: Array<{ rank: number; name: string; profit: number; quantity: number; share: number; width: number }>;
  currency: string;
}) {
  return (
    <div className="space-y-3.5">
      {rows.map((row) => {
        const isLoss = row.profit < 0;
        return (
          <div key={`${row.rank}-${row.name}`} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                    row.rank === 1
                      ? 'bg-primary-600 text-white'
                      : row.rank <= 3
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {row.rank}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{row.name}</p>
                  <p className="text-caption text-slate-500">
                    {row.quantity} sold · {row.share}% of chart
                  </p>
                </div>
              </div>
              <ProfitAmount
                amount={row.profit}
                currency={currency}
                className="text-sm font-semibold shrink-0"
              />
            </div>
            <div className="ml-[34px] h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  isLoss
                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                    : row.rank === 1
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600'
                      : 'bg-gradient-to-r from-primary-300 to-primary-500'
                }`}
                style={{ width: `${row.width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LowStockChartView({
  data,
  height,
  labelMax = 14,
}: {
  data: Array<{ name: string; remaining: number }>;
  height: number;
  labelMax?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={labelMax > 14 ? 120 : 88}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={(value) => truncateLabel(String(value), labelMax)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [String(value), 'Remaining']}
          contentStyle={CHART_TOOLTIP}
        />
        <Bar dataKey="remaining" radius={[0, 6, 6, 0]} maxBarSize={20}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.remaining === 0 ? '#ef4444' : STOCK_COLORS[index % STOCK_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PaymentMixView({
  chart,
  currency,
  pieSize,
  pendingByMethod,
}: {
  chart: Array<{ name: string; method: string; value: number; count: number }>;
  currency: string;
  pieSize: number;
  pendingByMethod?: Array<{ method: string; pending: number }>;
}) {
  const pendingMap = new Map((pendingByMethod || []).map((row) => [row.method, row.pending]));
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr] sm:items-center">
      <ResponsiveContainer width="100%" height={pieSize}>
        <PieChart>
          <Pie
            data={chart}
            dataKey="value"
            nameKey="name"
            innerRadius={pieSize * 0.28}
            outerRadius={pieSize * 0.42}
            paddingAngle={2}
          >
            {chart.map((entry) => (
              <Cell key={entry.method} fill={METHOD_COLORS[entry.method] || METHOD_COLORS.OTHER} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            contentStyle={CHART_TOOLTIP}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2.5 text-sm">
        {chart.map((row) => {
          const pending = pendingMap.get(row.method) || 0;
          return (
            <div key={row.method} className="space-y-0.5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-slate-500 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: METHOD_COLORS[row.method] || METHOD_COLORS.OTHER }}
                  />
                  <span className="truncate">{row.name} · {row.count}</span>
                </span>
                <span className="font-semibold tabular-nums shrink-0">{formatCurrency(row.value, currency)}</span>
              </div>
              {pending > 0 && (
                <p className="pl-4 text-caption text-amber-600 dark:text-amber-400">
                  Pending {formatCurrency(pending, currency)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailTable({
  headers,
  rows,
  alignLast = true,
}: {
  headers: string[];
  rows: ReactNode[][];
  alignLast?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-caption text-slate-500 dark:bg-slate-800/60">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2.5 font-medium whitespace-nowrap">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
              {cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-3 py-2.5 ${alignLast && cellIndex === cells.length - 1 ? 'text-right tabular-nums' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightStat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30'
      : tone === 'warn'
        ? 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30'
        : tone === 'bad'
          ? 'border-red-200/80 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/30'
          : 'border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50';

  return (
    <div className={`rounded-xl border p-3 sm:p-3.5 ${toneClass}`}>
      <p className="text-caption text-slate-500">{label}</p>
      <div className="mt-1 text-base font-semibold tabular-nums sm:text-lg">{value}</div>
      {hint && <p className="mt-1 text-caption text-slate-500">{hint}</p>}
    </div>
  );
}

function InsightCallouts({
  items,
}: {
  items: Array<{ tone?: 'tip' | 'warn' | 'good'; title: string; body: string }>;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = item.tone === 'warn' ? AlertTriangle : item.tone === 'good' ? TrendingUp : Lightbulb;
        const color =
          item.tone === 'warn'
            ? 'text-amber-600 dark:text-amber-400'
            : item.tone === 'good'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-primary-600 dark:text-primary-400';
        const bg =
          item.tone === 'warn'
            ? 'bg-amber-50/80 dark:bg-amber-950/25'
            : item.tone === 'good'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/25'
              : 'bg-primary-50/80 dark:bg-primary-950/25';
        return (
          <div key={item.title} className={`flex gap-3 rounded-xl px-3 py-2.5 ${bg}`}>
            <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-caption text-slate-600 dark:text-slate-400">{item.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function formatDelta(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export default function ReportsPage() {
  const { activeBusiness } = useBusinessStore();
  const isPremium = usePremium();
  const { hash } = useLocation();
  const [profitRange, setProfitRange] = useState<'overall' | 'month'>('overall');
  const [expanded, setExpanded] = useState<ExpandedChart>(null);
  const [cashDate, setCashDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  });

  const { startDate, endDate } = useMemo(() => {
    if (profitRange !== 'month') return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [profitRange]);

  const { data: profit, isLoading } = useQuery({
    queryKey: ['report-profit', activeBusiness?.id, profitRange, startDate, endDate],
    queryFn: () => reportApi.profit(activeBusiness!.id, startDate, endDate),
    enabled: !!activeBusiness?.id,
  });

  const { data: dashboard, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard', activeBusiness?.id],
    queryFn: () => dashboardApi.getStats(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const { data: monthSales, isLoading: monthSalesLoading } = useQuery({
    queryKey: ['report-sales-month', activeBusiness?.id, startDate, endDate],
    queryFn: () => reportApi.sales(activeBusiness!.id, startDate, endDate) as Promise<Sale[]>,
    enabled: profitRange === 'month' && !!activeBusiness?.id && !!startDate && !!endDate,
  });

  const { data: lowStock } = useQuery({
    queryKey: ['report-lowstock', activeBusiness?.id],
    queryFn: () =>
      reportApi.lowStock(activeBusiness!.id) as Promise<
        Array<{ id: string; name: string; remainingQuantity: number }>
      >,
    enabled: !!activeBusiness?.id,
  });

  const { data: cashUp, isLoading: cashUpLoading } = useQuery({
    queryKey: ['report-cashup', activeBusiness?.id, cashDate],
    queryFn: () => reportApi.cashUp(activeBusiness!.id, cashDate),
    enabled: isPremium && !!activeBusiness?.id,
  });

  const { data: restock } = useQuery({
    queryKey: ['report-restock', activeBusiness?.id],
    queryFn: () => reportApi.restock(activeBusiness!.id),
    enabled: isPremium && !!activeBusiness?.id,
  });

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace(/^#/, '');
    const el = document.getElementById(id);
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [hash, cashUpLoading, restock, isPremium]);

  const currency = activeBusiness?.currency || 'USD';

  const productProfitRows = useMemo(() => {
    if (!profit?.byProduct?.length) return [];
    const rows = profit.byProduct
      .filter((row) => row.product?.name)
      .map((row) => ({
        name: row.product!.name,
        profit: row.profit,
        quantity: row.quantity || 0,
        revenue: row.revenue,
      }));
    const peak = Math.max(...rows.map((row) => Math.abs(row.profit)), 1);
    const totalAbs = rows.reduce((sum, row) => sum + Math.abs(row.profit), 0) || 1;
    return rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      share: Math.round((Math.abs(row.profit) / totalAbs) * 100),
      width: Math.max(6, Math.round((Math.abs(row.profit) / peak) * 100)),
    }));
  }, [profit]);

  const productProfitPreview = productProfitRows.slice(0, 6);

  const trendChart = useMemo(() => {
    if (profitRange === 'month' && monthSales) {
      const byDay = new Map<string, { revenue: number; profit: number }>();
      for (const sale of monthSales) {
        const day = String(sale.saleDate).slice(0, 10);
        const current = byDay.get(day) || { revenue: 0, profit: 0 };
        current.revenue += Number(sale.totalAmount) || 0;
        current.profit += Number(sale.totalProfit) || 0;
        byDay.set(day, current);
      }
      return [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, values]) => ({
          label: day.slice(8),
          fullLabel: day,
          revenue: values.revenue,
          profit: values.profit,
        }));
    }

    return (dashboard?.monthlyRevenue || []).map((row) => ({
      label: row.month.slice(5),
      fullLabel: row.month,
      revenue: row.revenue,
      profit: row.profit,
    }));
  }, [profitRange, monthSales, dashboard]);

  const paymentChart = useMemo(() => {
    if (!cashUp?.byMethod?.length) return [];
    return cashUp.byMethod.map((row) => ({
      name: METHOD_LABELS[row.method] || row.method,
      method: row.method,
      value: row.paid,
      count: row.count,
    }));
  }, [cashUp]);

  const lowStockRows = useMemo(() => {
    if (!lowStock?.length) return [];
    return lowStock.map((item) => ({
      id: item.id,
      name: item.name,
      remaining: item.remainingQuantity,
    }));
  }, [lowStock]);

  const lowStockPreview = lowStockRows.slice(0, 8);

  const trendInsights = useMemo(() => {
    if (!trendChart.length) return null;
    const totalRevenue = trendChart.reduce((sum, row) => sum + row.revenue, 0);
    const totalProfit = trendChart.reduce((sum, row) => sum + row.profit, 0);
    const margin = pct(totalProfit, totalRevenue);
    const best = trendChart.reduce((a, b) => (b.revenue > a.revenue ? b : a));
    const worst = trendChart.reduce((a, b) => (b.revenue < a.revenue ? b : a));
    const avgRevenue = totalRevenue / trendChart.length;
    const avgProfit = totalProfit / trendChart.length;
    const half = Math.floor(trendChart.length / 2);
    const earlier = trendChart.slice(0, half);
    const later = trendChart.slice(half);
    const earlierRev = earlier.reduce((sum, row) => sum + row.revenue, 0) / Math.max(earlier.length, 1);
    const laterRev = later.reduce((sum, row) => sum + row.revenue, 0) / Math.max(later.length, 1);
    const momentum = formatDelta(laterRev, earlierRev);
    const profitablePoints = trendChart.filter((row) => row.profit > 0).length;
    const callouts: Array<{ tone?: 'tip' | 'warn' | 'good'; title: string; body: string }> = [];

    if (momentum >= 8) {
      callouts.push({
        tone: 'good',
        title: 'Momentum is up',
        body: `Recent periods are averaging about ${momentum}% more revenue than the earlier half — keep pushing what is working.`,
      });
    } else if (momentum <= -8) {
      callouts.push({
        tone: 'warn',
        title: 'Sales are cooling',
        body: `Recent periods are down about ${Math.abs(momentum)}% vs the earlier half. Check promotions, stockouts, or quieter weekdays.`,
      });
    } else {
      callouts.push({
        tone: 'tip',
        title: 'Steady run rate',
        body: `Revenue is fairly flat across the window. Average take is ${formatCurrency(avgRevenue, currency)} per ${profitRange === 'month' ? 'day' : 'month'}.`,
      });
    }

    if (margin < 15 && totalRevenue > 0) {
      callouts.push({
        tone: 'warn',
        title: 'Thin margin',
        body: `Profit is only ${margin}% of revenue. Review discounting and cost of goods on top movers.`,
      });
    } else if (margin >= 30) {
      callouts.push({
        tone: 'good',
        title: 'Healthy margin',
        body: `You are keeping about ${margin}% of revenue as profit. Protect pricing on your best sellers.`,
      });
    }

    if (best.fullLabel !== worst.fullLabel && best.revenue > worst.revenue * 1.4) {
      callouts.push({
        tone: 'tip',
        title: `Peak: ${best.fullLabel}`,
        body: `${formatCurrency(best.revenue, currency)} vs a soft ${worst.fullLabel} at ${formatCurrency(worst.revenue, currency)}. Staff and stock for peak days.`,
      });
    }

    return {
      totalRevenue,
      totalProfit,
      margin,
      best,
      worst,
      avgRevenue,
      avgProfit,
      momentum,
      profitablePoints,
      periods: trendChart.length,
      callouts,
    };
  }, [trendChart, currency, profitRange]);

  const productInsights = useMemo(() => {
    if (!productProfitRows.length) return null;
    const totalProfit = productProfitRows.reduce((sum, row) => sum + row.profit, 0);
    const totalRevenue = productProfitRows.reduce((sum, row) => sum + row.revenue, 0);
    const winners = productProfitRows.filter((row) => row.profit > 0);
    const losers = productProfitRows.filter((row) => row.profit < 0);
    const top = productProfitRows[0];
    const top3Share = pct(
      productProfitRows.slice(0, 3).reduce((sum, row) => sum + Math.max(row.profit, 0), 0),
      winners.reduce((sum, row) => sum + row.profit, 0) || 1
    );
    const lossTotal = losers.reduce((sum, row) => sum + row.profit, 0);
    const avgMargin = pct(totalProfit, totalRevenue);
    const callouts: Array<{ tone?: 'tip' | 'warn' | 'good'; title: string; body: string }> = [];

    if (top) {
      callouts.push({
        tone: 'good',
        title: `${top.name} leads`,
        body: `${formatCurrency(top.profit, currency)} profit from ${top.quantity} sold (${top.share}% of absolute profit). Keep it in stock and featured.`,
      });
    }

    if (top3Share >= 70 && winners.length >= 3) {
      callouts.push({
        tone: 'warn',
        title: 'Profit is concentrated',
        body: `Top 3 products make ~${top3Share}% of positive profit. Diversify or protect those SKUs from stockouts.`,
      });
    }

    if (losers.length) {
      callouts.push({
        tone: 'warn',
        title: `${losers.length} product${losers.length === 1 ? '' : 's'} losing money`,
        body: `${formatCurrency(Math.abs(lossTotal), currency)} in losses. Reprice, cut discounts, or pause restocking on the worst offenders.`,
      });
    } else if (winners.length >= 3) {
      callouts.push({
        tone: 'tip',
        title: 'No loss-makers in this set',
        body: 'Every listed product is contributing. Double down on the highest-margin movers next.',
      });
    }

    return {
      totalProfit,
      totalRevenue,
      winners,
      losers,
      top,
      top3Share,
      avgMargin,
      callouts,
    };
  }, [productProfitRows, currency]);

  const lowStockInsights = useMemo(() => {
    if (!lowStockRows.length) return null;
    const out = lowStockRows.filter((row) => row.remaining === 0);
    const critical = lowStockRows.filter((row) => row.remaining > 0 && row.remaining <= 3);
    const restockById = new Map((restock || []).map((item) => [item.id, item]));
    const restockByName = new Map((restock || []).map((item) => [item.name, item]));
    const withSuggestion = lowStockRows
      .map((row) => {
        const suggestion = restockById.get(row.id) || restockByName.get(row.name);
        return suggestion
          ? { ...row, daysOfCover: suggestion.daysOfCover, suggestedOrder: suggestion.suggestedOrder }
          : { ...row, daysOfCover: null as number | null, suggestedOrder: null as number | null };
      })
      .sort((a, b) => a.remaining - b.remaining);

    const callouts: Array<{ tone?: 'tip' | 'warn' | 'good'; title: string; body: string }> = [];

    if (out.length) {
      callouts.push({
        tone: 'warn',
        title: `${out.length} sold out`,
        body: `${out
          .slice(0, 3)
          .map((row) => row.name)
          .join(', ')}${out.length > 3 ? ` +${out.length - 3} more` : ''} — every day empty is lost sales.`,
      });
    }

    if (critical.length) {
      callouts.push({
        tone: 'warn',
        title: `${critical.length} nearly empty`,
        body: 'Three or fewer units left. Prioritize these on your next supplier order.',
      });
    }

    const actionable = withSuggestion.filter((row) => (row.suggestedOrder || 0) > 0);
    if (actionable.length) {
      const units = actionable.reduce((sum, row) => sum + (row.suggestedOrder || 0), 0);
      callouts.push({
        tone: 'tip',
        title: 'Suggested reorder',
        body: `About ${units} units across ${actionable.length} SKUs based on the last 30 days of sales pace.`,
      });
    } else if (!out.length) {
      callouts.push({
        tone: 'tip',
        title: 'Watch the list',
        body: 'None are fully out yet. Restock before weekend or payday peaks if these are regular movers.',
      });
    }

    return { out, critical, withSuggestion, callouts };
  }, [lowStockRows, restock]);

  const paymentInsights = useMemo(() => {
    if (!cashUp || !paymentChart.length) return null;
    const dominant = [...paymentChart].sort((a, b) => b.value - a.value)[0];
    const dominantShare = pct(dominant.value, cashUp.paidTotal || 1);
    const avgTicket = cashUp.salesCount ? cashUp.paidTotal / cashUp.salesCount : 0;
    const margin = pct(cashUp.profit, cashUp.paidTotal);
    const pendingShare = pct(cashUp.pendingTotal, cashUp.paidTotal + cashUp.pendingTotal);
    const callouts: Array<{ tone?: 'tip' | 'warn' | 'good'; title: string; body: string }> = [];

    callouts.push({
      tone: 'tip',
      title: `${dominant.name} dominates`,
      body: `${dominantShare}% of paid-in today (${formatCurrency(dominant.value, currency)} across ${dominant.count} sales). Count that drawer / float first.`,
    });

    if (cashUp.pendingTotal > 0) {
      callouts.push({
        tone: 'warn',
        title: 'Collections still open',
        body: `${formatCurrency(cashUp.pendingTotal, currency)} unpaid (${pendingShare}% of the day). Chase before close so cash-up matches the till.`,
      });
    } else {
      callouts.push({
        tone: 'good',
        title: 'Fully collected',
        body: 'No pending balances for this day — a clean close if the till matches paid-in.',
      });
    }

    if (margin > 0) {
      callouts.push({
        tone: margin >= 25 ? 'good' : 'tip',
        title: `Day margin ${margin}%`,
        body: `Profit on paid sales is ${formatCurrency(cashUp.profit, currency)}. Average ticket ${formatCurrency(avgTicket, currency)}.`,
      });
    }

    return { dominant, dominantShare, avgTicket, margin, pendingShare, callouts };
  }, [cashUp, paymentChart, currency]);

  const exportCsv = async (type: string) => {
    let data: unknown[];
    switch (type) {
      case 'inventory':
        data = await reportApi.inventory(activeBusiness!.id);
        break;
      case 'sales':
        data = await reportApi.sales(activeBusiness!.id);
        break;
      case 'lowstock':
        data = lowStock || [];
        break;
      default:
        return;
    }

    const csv = convertToCsv(data as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voki-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const trendBusy = profitRange === 'month' ? monthSalesLoading : trendLoading;
  const trendTitle = profitRange === 'month' ? 'Daily revenue & profit' : 'Revenue & profit trend';
  const trendDescription = profitRange === 'month' ? 'This calendar month by day' : 'Last months of recorded sales';

  const expandedMeta: Record<Exclude<ExpandedChart, null>, { title: string; description: string }> = {
    trend: { title: trendTitle, description: trendDescription },
    products: {
      title: 'Profit by product',
      description: `All products ${profitRange === 'month' ? 'this month' : 'overall'}`,
    },
    lowstock: {
      title: 'Low stock levels',
      description: `${lowStockRows.length} alerted item${lowStockRows.length === 1 ? '' : 's'}`,
    },
    payments: {
      title: 'Payment mix',
      description: cashUp ? formatDate(cashUp.date) : 'Cash-up breakdown',
    },
  };

  return (
    <div className="page-stack">
      <PageHeader title="Reports" />

      <FilterTabs
        options={[
          { value: 'overall', label: 'Overall Profit' },
          { value: 'month', label: 'This Month Profit' },
        ]}
        value={profitRange}
        onChange={setProfitRange}
      />

      {isLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : profit && (
        <Card>
          <h3 className="text-heading mb-3">
            {profit.summary.totalProfit < 0
              ? (profitRange === 'month' ? 'This Month Loss Summary' : 'Loss Summary')
              : (profitRange === 'month' ? 'This Month Profit Summary' : 'Profit Summary')}
          </h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Sales</span>
              <span className="font-semibold tabular-nums">{profit.summary.totalSales}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Revenue</span>
              <span className="font-semibold tabular-nums truncate">{formatCurrency(profit.summary.totalRevenue, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">{profit.summary.totalProfit < 0 ? 'Loss' : 'Profit'}</span>
              <ProfitAmount amount={profit.summary.totalProfit} currency={currency} className="font-semibold truncate" />
            </div>
          </div>
        </Card>
      )}

      {trendBusy ? (
        <Skeleton className="h-52 rounded-2xl" />
      ) : trendChart.length > 0 ? (
        <Card>
          <ChartSectionHeader
            title={trendTitle}
            description={trendDescription}
            onExpand={() => setExpanded('trend')}
          />
          <TrendChartView data={trendChart} currency={currency} height={200} idSuffix="preview" />
        </Card>
      ) : (
        <Card>
          <h3 className="text-heading mb-1">Revenue & profit trend</h3>
          <p className="text-caption text-slate-500">No sales yet to chart.</p>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : productProfitPreview.length > 0 ? (
        <Card>
          <ChartSectionHeader
            title="Profit by product"
            description={`Top sellers ${profitRange === 'month' ? 'this month' : 'overall'}`}
            onExpand={() => setExpanded('products')}
          />
          <ProductProfitList rows={productProfitPreview} currency={currency} />
          {productProfitRows.length > productProfitPreview.length && (
            <button
              type="button"
              onClick={() => setExpanded('products')}
              className="mt-3 text-sm font-semibold text-primary-600"
            >
              View all {productProfitRows.length} products
            </button>
          )}
        </Card>
      ) : profit && profit.summary.totalSales === 0 ? null : (
        <Card>
          <h3 className="text-heading mb-1">Profit by product</h3>
          <p className="text-caption text-slate-500">No product profit breakdown for this period.</p>
        </Card>
      )}

      {lowStockPreview.length > 0 && (
        <Card>
          <ChartSectionHeader
            title="Low stock levels"
            description="Units remaining on alerted items"
            onExpand={() => setExpanded('lowstock')}
          />
          <LowStockChartView data={lowStockPreview} height={Math.max(160, lowStockPreview.length * 34)} />
          {lowStockRows.length > lowStockPreview.length && (
            <button
              type="button"
              onClick={() => setExpanded('lowstock')}
              className="mt-3 text-sm font-semibold text-primary-600"
            >
              View all {lowStockRows.length} items
            </button>
          )}
        </Card>
      )}

      <div className="space-y-2">
        {[
          { type: 'inventory', label: 'Inventory Report' },
          { type: 'sales', label: 'Sales Report' },
          { type: 'lowstock', label: 'Low Stock Report' },
        ].map((report) => (
          <Card key={report.type} className="flex items-center gap-3 !p-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText size={20} className="text-primary-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{report.label}</p>
              </div>
            </div>
            <button
              onClick={() => exportCsv(report.type)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              aria-label={`Download ${report.label}`}
            >
              <Download size={18} />
            </button>
          </Card>
        ))}
      </div>

      {isPremium ? (
        <Card id="cash-up" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-heading">End-of-day cash-up</h3>
            <div className="flex items-center gap-1.5">
              {paymentChart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded('payments')}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
                  aria-label="Expand payment mix"
                  title="Expand"
                >
                  <Expand size={16} />
                </button>
              )}
              <input
                type="date"
                aria-label="Cash-up date"
                value={cashDate}
                onChange={(event) => setCashDate(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          {cashUpLoading ? (
            <Skeleton className="h-16" />
          ) : !cashUp || cashUp.salesCount === 0 ? (
            <p className="text-caption text-slate-500">No sales on this day.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Paid in</span>
                  <span className="font-semibold">{formatCurrency(cashUp.paidTotal, currency)}</span>
                </div>
                {cashUp.pendingTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Still waiting</span>
                    <span className="font-semibold">{formatCurrency(cashUp.pendingTotal, currency)}</span>
                  </div>
                )}
              </div>

              {paymentChart.length > 0 && (
                <PaymentMixView chart={paymentChart} currency={currency} pieSize={140} />
              )}
            </div>
          )}
        </Card>
      ) : (
        <div id="cash-up" className="scroll-mt-24">
          <PremiumNotice
            title="End-of-day cash-up is on Premium"
            description="See each day's takings by payment method."
          />
        </div>
      )}

      {isPremium ? (
        <Card id="restock" className="space-y-3 scroll-mt-24">
          <h3 className="text-heading">Restock suggestions</h3>
          {!restock?.length ? (
            <p className="text-caption text-slate-500">Nothing is running low based on the last 30 days.</p>
          ) : (
            <div className="space-y-2">
              {restock.map((item) => (
                <Link key={item.id} to={`/inventory/${item.id}/restock`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium block truncate">{item.name}</span>
                    <span className="text-caption text-slate-500">
                      {item.remainingQuantity} left · about {item.daysOfCover} days
                    </span>
                  </span>
                  <span className="text-primary-600 font-semibold shrink-0">Order {item.suggestedOrder}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div id="restock" className="scroll-mt-24">
          <PremiumNotice
            title="Restock suggestions are on Premium"
            description="See which items will run out soon at the current pace."
          />
        </div>
      )}

      <Modal
        open={expanded !== null}
        title={expanded ? expandedMeta[expanded].title : ''}
        description={expanded ? expandedMeta[expanded].description : undefined}
        onClose={() => setExpanded(null)}
        size="full"
      >
        {expanded === 'trend' && trendInsights && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <InsightStat
                label="Total revenue"
                value={formatCurrency(trendInsights.totalRevenue, currency)}
                hint={`Avg ${formatCurrency(trendInsights.avgRevenue, currency)} / ${profitRange === 'month' ? 'day' : 'month'}`}
              />
              <InsightStat
                label="Total profit"
                value={<ProfitAmount amount={trendInsights.totalProfit} currency={currency} className="font-semibold" />}
                hint={`Avg ${formatCurrency(trendInsights.avgProfit, currency)}`}
                tone={trendInsights.totalProfit >= 0 ? 'good' : 'bad'}
              />
              <InsightStat
                label="Profit margin"
                value={`${trendInsights.margin}%`}
                hint={`${trendInsights.profitablePoints}/${trendInsights.periods} periods in the black`}
                tone={trendInsights.margin >= 25 ? 'good' : trendInsights.margin < 15 ? 'warn' : 'neutral'}
              />
              <InsightStat
                label="Momentum"
                value={
                  <span className="inline-flex items-center gap-1">
                    {trendInsights.momentum >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    {Math.abs(trendInsights.momentum)}%
                  </span>
                }
                hint="Recent half vs earlier half"
                tone={trendInsights.momentum >= 8 ? 'good' : trendInsights.momentum <= -8 ? 'warn' : 'neutral'}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
              <div className="min-w-0 rounded-2xl border border-slate-100 p-3 dark:border-slate-800 sm:p-4">
                <TrendChartView data={trendChart} currency={currency} height={340} idSuffix="expanded" />
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-50/70 px-3 py-2 dark:bg-emerald-950/25">
                    <p className="text-caption text-slate-500">Best {profitRange === 'month' ? 'day' : 'month'}</p>
                    <p className="font-semibold">{trendInsights.best.fullLabel}</p>
                    <p className="tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(trendInsights.best.revenue, currency)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                    <p className="text-caption text-slate-500">Softest {profitRange === 'month' ? 'day' : 'month'}</p>
                    <p className="font-semibold">{trendInsights.worst.fullLabel}</p>
                    <p className="tabular-nums text-slate-600 dark:text-slate-300">
                      {formatCurrency(trendInsights.worst.revenue, currency)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">What to do next</h4>
                <InsightCallouts items={trendInsights.callouts} />
              </div>
            </div>

            <DetailTable
              headers={[profitRange === 'month' ? 'Day' : 'Month', 'Revenue', 'Profit', 'Margin']}
              rows={trendChart.map((row) => [
                row.fullLabel,
                formatCurrency(row.revenue, currency),
                <ProfitAmount key={row.fullLabel} amount={row.profit} currency={currency} className="font-semibold" />,
                <span key={`${row.fullLabel}-m`} className="tabular-nums">{pct(row.profit, row.revenue)}%</span>,
              ])}
            />
          </div>
        )}

        {expanded === 'products' && productInsights && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <InsightStat
                label="Products tracked"
                value={productProfitRows.length}
                hint={`${productInsights.winners.length} profitable`}
              />
              <InsightStat
                label="Net profit"
                value={<ProfitAmount amount={productInsights.totalProfit} currency={currency} className="font-semibold" />}
                tone={productInsights.totalProfit >= 0 ? 'good' : 'bad'}
              />
              <InsightStat
                label="Avg margin"
                value={`${productInsights.avgMargin}%`}
                hint="Profit / revenue"
                tone={productInsights.avgMargin >= 25 ? 'good' : productInsights.avgMargin < 15 ? 'warn' : 'neutral'}
              />
              <InsightStat
                label="Loss-makers"
                value={productInsights.losers.length}
                hint={
                  productInsights.losers.length
                    ? formatCurrency(
                        Math.abs(productInsights.losers.reduce((sum, row) => sum + row.profit, 0)),
                        currency
                      )
                    : 'None in this period'
                }
                tone={productInsights.losers.length ? 'bad' : 'good'}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
              <div className="min-w-0 space-y-4 rounded-2xl border border-slate-100 p-3 dark:border-slate-800 sm:p-4">
                <ProductProfitList rows={productProfitRows} currency={currency} />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Decisions</h4>
                <InsightCallouts items={productInsights.callouts} />
                {productInsights.losers.length > 0 && (
                  <div className="rounded-xl border border-red-100 p-3 dark:border-red-900/40">
                    <p className="mb-2 text-caption font-semibold text-red-600 dark:text-red-400">Review these first</p>
                    <ul className="space-y-1.5 text-sm">
                      {productInsights.losers.slice(0, 5).map((row) => (
                        <li key={row.name} className="flex items-center justify-between gap-2">
                          <span className="truncate">{row.name}</span>
                          <ProfitAmount amount={row.profit} currency={currency} className="shrink-0 font-semibold" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <DetailTable
              headers={['#', 'Product', 'Qty', 'Revenue', 'Share', 'Margin', 'Profit']}
              rows={productProfitRows.map((row) => [
                row.rank,
                <span key={row.name} className="font-medium">
                  {row.name}
                </span>,
                row.quantity,
                formatCurrency(row.revenue, currency),
                `${row.share}%`,
                `${pct(row.profit, row.revenue)}%`,
                <ProfitAmount key={`${row.name}-profit`} amount={row.profit} currency={currency} className="font-semibold" />,
              ])}
            />
          </div>
        )}

        {expanded === 'lowstock' && lowStockInsights && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <InsightStat label="On alert" value={lowStockRows.length} hint="Low or out of stock" tone="warn" />
              <InsightStat
                label="Sold out"
                value={lowStockInsights.out.length}
                hint={lowStockInsights.out.length ? 'Restock immediately' : 'None empty'}
                tone={lowStockInsights.out.length ? 'bad' : 'good'}
              />
              <InsightStat
                label="Critical (≤3)"
                value={lowStockInsights.critical.length}
                hint="Likely to stock out soon"
                tone={lowStockInsights.critical.length ? 'warn' : 'neutral'}
              />
              <InsightStat
                label="Suggested units"
                value={
                  lowStockInsights.withSuggestion.reduce((sum, row) => sum + (row.suggestedOrder || 0), 0) || '—'
                }
                hint={isPremium ? 'Based on 30-day pace' : 'Premium restock tips'}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
              <div className="min-w-0 rounded-2xl border border-slate-100 p-3 dark:border-slate-800 sm:p-4">
                <LowStockChartView
                  data={lowStockRows}
                  height={Math.min(480, Math.max(280, lowStockRows.length * 38))}
                  labelMax={24}
                />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Action plan</h4>
                <InsightCallouts items={lowStockInsights.callouts} />
                {isPremium && (
                  <Link to="/reports#restock" onClick={() => setExpanded(null)} className="text-sm font-semibold text-primary-600">
                    Open restock suggestions →
                  </Link>
                )}
              </div>
            </div>

            <DetailTable
              headers={isPremium ? ['Product', 'Remaining', 'Days cover', 'Order'] : ['Product', 'Remaining', 'Priority']}
              rows={lowStockInsights.withSuggestion.map((row) => {
                const priority =
                  row.remaining === 0 ? (
                    <span className="font-semibold text-red-600">Sold out</span>
                  ) : row.remaining <= 3 ? (
                    <span className="font-semibold text-amber-600">Critical</span>
                  ) : (
                    <span className="text-slate-500">Watch</span>
                  );
                if (!isPremium) {
                  return [
                    <span key={row.name} className="font-medium">
                      {row.name}
                    </span>,
                    <span key={`${row.name}-qty`} className={row.remaining === 0 ? 'font-semibold text-red-600' : 'font-semibold'}>
                      {row.remaining}
                    </span>,
                    priority,
                  ];
                }
                return [
                  <Link
                    key={row.name}
                    to={`/inventory/${row.id}/restock`}
                    onClick={() => setExpanded(null)}
                    className="font-medium text-primary-600 hover:underline"
                  >
                    {row.name}
                  </Link>,
                  <span key={`${row.name}-qty`} className={row.remaining === 0 ? 'font-semibold text-red-600' : 'font-semibold'}>
                    {row.remaining}
                  </span>,
                  row.daysOfCover == null ? '—' : `${row.daysOfCover}d`,
                  row.suggestedOrder ? (
                    <Link
                      key={`${row.name}-order`}
                      to={`/inventory/${row.id}/restock`}
                      onClick={() => setExpanded(null)}
                      className="font-semibold text-primary-600"
                    >
                      Order {row.suggestedOrder}
                    </Link>
                  ) : (
                    '—'
                  ),
                ];
              })}
            />
          </div>
        )}

        {expanded === 'payments' && cashUp && paymentInsights && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <InsightStat label="Paid in" value={formatCurrency(cashUp.paidTotal, currency)} hint={`${cashUp.salesCount} sales`} />
              <InsightStat
                label="Pending"
                value={formatCurrency(cashUp.pendingTotal, currency)}
                hint={cashUp.pendingTotal > 0 ? 'Chase before close' : 'All clear'}
                tone={cashUp.pendingTotal > 0 ? 'warn' : 'good'}
              />
              <InsightStat
                label="Day profit"
                value={<ProfitAmount amount={cashUp.profit} currency={currency} className="font-semibold" />}
                hint={`${paymentInsights.margin}% margin`}
                tone={cashUp.profit >= 0 ? 'good' : 'bad'}
              />
              <InsightStat
                label="Avg ticket"
                value={formatCurrency(paymentInsights.avgTicket, currency)}
                hint={`${paymentInsights.dominant.name} ${paymentInsights.dominantShare}%`}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
              <div className="min-w-0 rounded-2xl border border-slate-100 p-3 dark:border-slate-800 sm:p-4">
                <PaymentMixView
                  chart={paymentChart}
                  currency={currency}
                  pieSize={260}
                  pendingByMethod={cashUp.byMethod}
                />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Close-out checklist</h4>
                <InsightCallouts items={paymentInsights.callouts} />
                <ol className="space-y-1.5 rounded-xl border border-slate-100 p-3 text-sm dark:border-slate-800">
                  <li>1. Count {paymentInsights.dominant.name} first ({paymentInsights.dominantShare}% of paid-in).</li>
                  <li>2. Match till to {formatCurrency(cashUp.paidTotal, currency)} paid-in.</li>
                  <li>
                    3.{' '}
                    {cashUp.pendingTotal > 0
                      ? `Follow up ${formatCurrency(cashUp.pendingTotal, currency)} pending.`
                      : 'Confirm no open tabs remain.'}
                  </li>
                </ol>
              </div>
            </div>

            <DetailTable
              headers={['Method', 'Sales', 'Share', 'Paid', 'Pending']}
              rows={cashUp.byMethod.map((row) => [
                METHOD_LABELS[row.method] || row.method,
                row.count,
                `${pct(row.paid, cashUp.paidTotal)}%`,
                formatCurrency(row.paid, currency),
                formatCurrency(row.pending, currency),
              ])}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

function convertToCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]).filter((k) => typeof data[0][k] !== 'object');
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
