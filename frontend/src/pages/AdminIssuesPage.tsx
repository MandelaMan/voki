import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminStatus, AdminTable } from '../components/admin/AdminTable';
import { adminApi } from '../api';
import { Alert } from '../components/ui/Alert';
import { StatCard } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { formatCurrency, formatRelative } from '../lib/utils';
import { useAuthStore } from '../stores';

export default function AdminIssuesPage() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'SUPER_ADMIN');
  const issues = useQuery({
    queryKey: ['admin-issues'],
    queryFn: () => adminApi.issues(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="page-stack">
        <PageHeader title="Issues" />
        <Alert variant="error">This account is not a super admin.</Alert>
      </div>
    );
  }

  if (issues.isLoading || !issues.data) return <Skeleton className="h-36 rounded-2xl" />;
  const data = issues.data;

  return (
    <div className="page-stack">
      <PageHeader title="Issues" subtitle="Stock, payments, and accounts that need a look" />
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Out of stock" value={String(data.counts.outOfStock)} subtitle={`${data.counts.lowStock} running low`} />
        <StatCard title="Payment problems" value={String(data.counts.payments)} subtitle={`${data.counts.suspended} suspended accounts`} />
      </div>

      <section className="space-y-2">
        <h3 className="text-heading text-slate-500 px-1">Stock</h3>
        <AdminTable
          rows={data.stock}
          rowKey={(item) => item.id}
          empty="No stock alerts."
          columns={[
            { header: 'Product', cell: (item) => item.name },
            { header: 'Shop', cell: (item) => item.businessName },
            { header: 'Left', align: 'end', cell: (item) => item.remainingQuantity },
            { header: 'Status', cell: (item) => item.status === 'OUT_OF_STOCK' ? <AdminStatus tone="bad">Out of stock</AdminStatus> : <AdminStatus tone="warn">Low stock</AdminStatus> },
            { header: 'Owner', cell: (item) => <Link to={`/admin/subscribers/${item.ownerId}`} className="font-semibold text-primary-600">{item.ownerName}</Link> },
            { header: 'Contact', cell: (item) => item.ownerPhone || item.ownerEmail },
          ]}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-heading text-slate-500 px-1">Payments</h3>
        <AdminTable
          rows={data.payments}
          rowKey={(payment) => payment.id}
          empty="No failed or stuck payments."
          columns={[
            { header: 'When', value: (payment) => new Date(payment.createdAt).getTime(), cell: (payment) => formatRelative(payment.createdAt) },
            { header: 'Owner', cell: (payment) => <Link to={`/admin/subscribers/${payment.ownerId}`} className="font-semibold text-primary-600">{payment.ownerName}</Link> },
            { header: 'Type', cell: (payment) => payment.purpose === 'SUBSCRIPTION' ? 'Premium' : 'Sale' },
            { header: 'Status', cell: (payment) => <AdminStatus tone={payment.status === 'FAILED' || payment.status === 'CANCELLED' ? 'bad' : payment.status === 'PENDING' ? 'warn' : 'good'}>{payment.status === 'FAILED' ? 'Failed' : payment.status === 'CANCELLED' ? 'Cancelled' : payment.status === 'PENDING' ? 'Pending' : payment.status === 'SUCCESS' ? 'Success' : payment.status}</AdminStatus> },
            { header: 'Phone', cell: (payment) => payment.phone },
            { header: 'Amount', align: 'end', value: (payment) => payment.amount, cell: (payment) => formatCurrency(payment.amount, 'KES') },
            { header: 'Note', wrap: true, cell: (payment) => payment.resultDesc || payment.businessName || '—' },
          ]}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-heading text-slate-500 px-1">Suspended accounts</h3>
        <AdminTable
          rows={data.accounts}
          rowKey={(account) => account.id}
          empty="No suspended accounts."
          columns={[
            { header: 'Name', cell: (account) => <Link to={`/admin/subscribers/${account.id}`} className="font-semibold text-primary-600">{account.name}</Link> },
            { header: 'Email', cell: (account) => account.email },
            { header: 'Phone', cell: (account) => account.phone || '—' },
          ]}
        />
      </section>
    </div>
  );
}
