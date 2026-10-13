import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Shield, Store, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminTable } from '../components/admin/AdminTable';
import { adminApi } from '../api';
import { Alert } from '../components/ui/Alert';
import { Card, HeroCard, StatCard } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuthStore } from '../stores';

export default function AdminPage() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'SUPER_ADMIN');
  const analytics = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.analytics(),
    enabled: isAdmin,
  });
  const issues = useQuery({
    queryKey: ['admin-issues'],
    queryFn: () => adminApi.issues(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="page-stack">
        <PageHeader title="Overview" />
        <Alert variant="error">This account is not a super admin.</Alert>
      </div>
    );
  }

  const report = analytics.data;
  if (analytics.isLoading || !report) return <Skeleton className="h-36 rounded-3xl" />;

  const openIssues = (issues.data?.counts.lowStock || 0)
    + (issues.data?.counts.outOfStock || 0)
    + (issues.data?.counts.payments || 0);

  return (
    <div className="page-stack">
      <PageHeader title="Overview" subtitle="What your subscribers are doing" />

      <HeroCard
        title="Premium collected"
        value={formatCurrency(report.subscriptions.revenue, 'KES')}
        subtitle={`${report.subscriptions.count} paid upgrades`}
        icon={<Shield size={18} />}
      />

      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
        <Link to="/admin/subscribers" className="min-w-0">
          <StatCard
            title="Subscribers"
            value={String(report.accounts.active)}
            subtitle={`${report.accounts.premium} Premium · ${report.accounts.newThisMonth} new this month`}
            icon={<Users size={16} />}
          />
        </Link>
        <Link to="/admin/issues" className="min-w-0">
          <StatCard
            title="Open issues"
            value={String(openIssues)}
            subtitle={`${report.accounts.suspended} suspended accounts`}
            trend={openIssues > 0 ? 'down' : undefined}
          />
        </Link>
        <Link to="/admin/shops" className="min-w-0">
          <StatCard
            title="Shops"
            value={String(report.businesses)}
            subtitle={`${report.products} products`}
            icon={<Store size={16} />}
          />
        </Link>
        <Link to="/admin/sales" className="min-w-0">
          <StatCard
            title="Sales this month"
            value={formatCurrency(report.sales.monthRevenue, 'KES')}
            subtitle={`${report.sales.monthCount} sales · ${formatCurrency(report.sales.monthProfit, 'KES')} profit`}
          />
        </Link>
      </div>

      <Card>
        <h3 className="font-semibold mb-1 text-slate-800 dark:text-slate-200">New accounts</h3>
        <p className="text-caption text-slate-500 mb-4">Last 30 days</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={report.signups}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value) => String(value).slice(8)} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={28} axisLine={false} tickLine={false} />
            <Tooltip
              labelFormatter={(value) => formatDate(String(value))}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft-lg)' }}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="font-semibold mb-1 text-slate-800 dark:text-slate-200">Subscriber sales</h3>
        <p className="text-caption text-slate-500 mb-4">
          {formatCurrency(report.sales.todayRevenue, 'KES')} today · {formatCurrency(report.sales.revenue, 'KES')} all time
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={report.salesTrend}>
            <defs>
              <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value) => String(value).slice(8)} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={50} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value), 'KES')}
              labelFormatter={(value) => formatDate(String(value))}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft-lg)' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#adminRevenue)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <section className="space-y-2">
        <h3 className="text-heading text-slate-500 px-1">Busiest shops</h3>
        <AdminTable
          rows={report.topBusinesses}
          rowKey={(business) => business.id}
          empty="No sales recorded yet."
          columns={[
            { header: 'Shop', cell: (business) => business.name },
            {
              header: 'Owner',
              cell: (business) => business.ownerId
                ? <Link to={`/admin/subscribers/${business.ownerId}`} className="font-semibold text-primary-600">{business.owner}</Link>
                : business.owner,
            },
            { header: 'Sales', align: 'end', cell: (business) => business.sales },
            { header: 'Revenue', align: 'end', value: (business) => business.revenue, cell: (business) => formatCurrency(business.revenue, 'KES') },
            { header: 'Profit', align: 'end', value: (business) => business.profit, cell: (business) => formatCurrency(business.profit, 'KES') },
          ]}
        />
      </section>
    </div>
  );
}
