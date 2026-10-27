import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Package, AlertTriangle,
  ArrowRight, ShoppingBag, Plus, BarChart3, Truck, ScanLine, Users, Wallet,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, StatCard, QuickAction } from '../components/ui/Card';
import { TodayRevenueCard } from '../components/dashboard/TodayRevenueCard';
import { ProfitAmount } from '../components/ui/ProfitAmount';
import { Skeleton } from '../components/ui/Badge';
import { FilterTabs, PageHeader } from '../components/ui/PageHeader';
import { formatCurrency, formatRelative } from '../lib/utils';
import { dashboardApi } from '../api';
import { useBusinessStore, usePremium } from '../stores';

export default function DashboardPage() {
  const { activeBusiness } = useBusinessStore();
  const isPremium = usePremium();
  const [profitRange, setProfitRange] = useState<'today' | 'month'>('today');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', activeBusiness?.id],
    queryFn: () => dashboardApi.getStats(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  if (!activeBusiness) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-3xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center mx-auto mb-4">
          <Package size={28} />
        </div>
        <p className="text-slate-500 mb-4">No business selected</p>
        <Link to="/businesses" className="text-primary-600 font-semibold">Select a business →</Link>
      </div>
    );
  }

  const currency = activeBusiness.currency;
  const selectedProfit = profitRange === 'month'
    ? stats?.monthSales.profit || 0
    : stats?.todaySales.profit || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const totalAlerts = (stats?.stockAlerts.lowStock || 0) + (stats?.stockAlerts.outOfStock || 0);

  return (
    <div className="page-stack">
      <PageHeader title="Dashboard" />

      <TodayRevenueCard
        revenue={stats?.todaySales.revenue || 0}
        count={stats?.todaySales.count || 0}
        profit={stats?.todaySales.profit || 0}
        currency={currency}
        collections={stats?.todaySales.collections}
      />

      <div>
        <h3 className="text-heading text-slate-800 dark:text-slate-200 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-2.5">
          <QuickAction to="/sales/new" icon={<ShoppingBag size={20} />} label="Record Sale" primary />
          <QuickAction to="/inventory/new" icon={<Plus size={20} />} label="Add Product" hint="No stock yet" />
          <QuickAction to="/purchases/new" icon={<Truck size={20} />} label="Record Purchase" hint="Adds stock" />
          <QuickAction to="/reports" icon={<BarChart3 size={20} />} label="Reports" />
        </div>
      </div>

      {isPremium && (
        <div>
          <h3 className="text-heading text-slate-800 dark:text-slate-200 mb-3">Premium</h3>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-2.5">
            <QuickAction to="/lists/scan" icon={<ScanLine size={20} />} label="Scan a list" hint="Sales or restock" />
            <QuickAction to="/customers" icon={<Users size={20} />} label="Customers" />
            <QuickAction to="/reports#cash-up" icon={<Wallet size={20} />} label="Cash-up" hint="Today’s takings" />
            <QuickAction to="/reports#restock" icon={<Package size={20} />} label="Restock ideas" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
        <StatCard
          title="Inventory"
          value={formatCurrency(stats?.inventory.totalValue || 0, currency)}
          subtitle={`${stats?.inventory.totalItems || 0} items`}
          icon={<Package size={16} />}
        />
        <StatCard
          title="Stock Alerts"
          value={String(totalAlerts)}
          subtitle={`${stats?.stockAlerts.outOfStock || 0} out of stock`}
          icon={<AlertTriangle size={16} />}
          trend={(stats?.stockAlerts.outOfStock || 0) > 0 ? 'down' : undefined}
        />
        <StatCard
          title={
            selectedProfit < 0
              ? (profitRange === 'month' ? "This Month's Loss" : "Today's Loss")
              : (profitRange === 'month' ? "This Month's Profit" : "Today's Profit")
          }
          value={<ProfitAmount amount={selectedProfit} currency={currency} />}
          icon={selectedProfit < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
        />
        <StatCard
          title="Sales Count"
          value={String(stats?.todaySales.count || 0)}
          subtitle="today"
          icon={<ShoppingBag size={16} />}
        />
      </div>

      <FilterTabs
        options={[
          { value: 'today', label: "Today's Profit" },
          { value: 'month', label: 'This Month Profit' },
        ]}
        value={profitRange}
        onChange={setProfitRange}
      />

      {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.monthlyRevenue}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={50} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v), currency)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft-lg)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#colorRevenue)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stats?.recentSales && stats.recentSales.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-heading text-slate-800 dark:text-slate-200">Recent Sales</h3>
            <Link to="/sales" className="text-sm text-primary-600 font-semibold flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recentSales.slice(0, 5).map((sale) => (
              <Card key={sale.id} className="flex items-center justify-between !p-3.5 active:scale-[0.99] transition-transform">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center shrink-0">
                    <ShoppingBag size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {sale.items?.[0]?.product?.name || 'Sale'}
                      {sale.items && sale.items.length > 1 && ` +${sale.items.length - 1}`}
                    </p>
                    <p className="text-xs text-slate-500">{formatRelative(sale.saleDate)}</p>
                  </div>
                </div>
                <p className="text-body-medium font-semibold text-primary-600 shrink-0 ml-2">{formatCurrency(Number(sale.totalAmount), currency)}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {stats?.topProducts && stats.topProducts.length > 0 && (
        <section>
          <h3 className="text-heading text-slate-800 dark:text-slate-200 mb-3">Top Sellers</h3>
          <div className="space-y-2">
            {stats.topProducts.map((product, i) => (
              <Card key={product?.id || i} className="flex items-center gap-3 !p-3.5">
                <span className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{product?.name}</p>
                  <p className="text-xs text-slate-500">{product?.totalSold} sold</p>
                </div>
                <ProfitAmount
                  amount={product?.totalProfit || 0}
                  currency={currency}
                  className="text-caption font-semibold shrink-0"
                />
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
