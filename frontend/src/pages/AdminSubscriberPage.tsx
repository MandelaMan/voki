import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminStatus, AdminTable } from '../components/admin/AdminTable';
import { adminApi } from '../api';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { formatCurrency, formatDate, formatRelative } from '../lib/utils';
import { useAuthStore } from '../stores';

export default function AdminSubscriberPage() {
  const { id = '' } = useParams();
  const isAdmin = useAuthStore((state) => state.user?.role === 'SUPER_ADMIN');
  const detail = useQuery({
    queryKey: ['admin-subscriber', id],
    queryFn: () => adminApi.subscriber(id),
    enabled: isAdmin && Boolean(id),
  });

  if (!isAdmin) {
    return (
      <div className="page-stack">
        <PageHeader title="Subscriber" />
        <Alert variant="error">This account is not a super admin.</Alert>
      </div>
    );
  }

  if (detail.isLoading || !detail.data) return <Skeleton className="h-40 rounded-2xl" />;

  const { account, stock, sales, payments } = detail.data;
  return (
    <div className="page-stack">
      <PageHeader
        title={`${account.firstName} ${account.lastName}`}
        subtitle={account.email}
        action={<Link to="/admin/subscribers" className="text-sm font-semibold text-primary-600">All subscribers</Link>}
      />
      <Card className="space-y-1">
        <p className="text-caption text-slate-500">{account.phone || 'No phone on the account'}</p>
        <p className="text-caption text-slate-500">
          {account.suspended ? 'Suspended' : account.isPremium ? `Premium until ${formatDate(account.planExpiresAt || '')}` : 'Free plan'}
          {account.businesses.length ? ` · ${account.businesses.map((business) => business.name).join(', ')}` : ' · No shop yet'}
        </p>
      </Card>

      <section className="space-y-2">
        <h3 className="text-heading text-slate-500 px-1">Stock problems</h3>
        <AdminTable
          rows={stock}
          rowKey={(item) => item.id}
          empty="No low or empty stock."
          columns={[
            { header: 'Product', cell: (item) => item.name },
            { header: 'Shop', cell: (item) => item.business.name },
            { header: 'Left', align: 'end', cell: (item) => item.remainingQuantity },
            { header: 'Status', cell: (item) => item.status === 'OUT_OF_STOCK' ? <AdminStatus tone="bad">Out of stock</AdminStatus> : <AdminStatus tone="warn">Low stock</AdminStatus> },
          ]}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-heading text-slate-500 px-1">Recent sales</h3>
        <AdminTable
          rows={sales}
          rowKey={(sale) => sale.id}
          empty="No sales yet."
          columns={[
            { header: 'When', value: (sale) => new Date(sale.saleDate).getTime(), cell: (sale) => formatRelative(sale.saleDate) },
            { header: 'Shop', cell: (sale) => sale.businessName },
            { header: 'Method', cell: (sale) => sale.paymentMethod },
            { header: 'Status', cell: (sale) => <AdminStatus tone={sale.paymentStatus === 'FAILED' ? 'bad' : sale.paymentStatus === 'PENDING' ? 'warn' : 'good'}>{sale.paymentStatus === 'PAID' ? 'Paid' : sale.paymentStatus === 'PENDING' ? 'Pending' : 'Failed'}</AdminStatus> },
            { header: 'Amount', align: 'end', value: (sale) => sale.totalAmount, cell: (sale) => formatCurrency(sale.totalAmount, sale.currency) },
          ]}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-heading text-slate-500 px-1">Payment trouble</h3>
        <AdminTable
          rows={payments}
          rowKey={(payment) => payment.id}
          empty="No failed or waiting payments."
          columns={[
            { header: 'When', value: (payment) => new Date(payment.createdAt).getTime(), cell: (payment) => formatRelative(payment.createdAt) },
            { header: 'Type', cell: (payment) => payment.purpose === 'SUBSCRIPTION' ? 'Premium' : 'Sale' },
            { header: 'Status', cell: (payment) => <AdminStatus tone={payment.status === 'FAILED' || payment.status === 'CANCELLED' ? 'bad' : payment.status === 'PENDING' ? 'warn' : 'good'}>{payment.status === 'FAILED' ? 'Failed' : payment.status === 'CANCELLED' ? 'Cancelled' : payment.status === 'PENDING' ? 'Pending' : payment.status === 'SUCCESS' ? 'Success' : payment.status}</AdminStatus> },
            { header: 'Phone', cell: (payment) => payment.phone },
            { header: 'Amount', align: 'end', value: (payment) => payment.amount, cell: (payment) => formatCurrency(payment.amount, 'KES') },
            { header: 'Note', wrap: true, cell: (payment) => payment.resultDesc || '—' },
          ]}
        />
      </section>
    </div>
  );
}
