import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageHeader, ListRow } from '../components/ui/PageHeader';
import { Skeleton, EmptyState } from '../components/ui/Badge';
import { formatCurrency, formatRelative } from '../lib/utils';
import { saleApi } from '../api';
import { useBusinessStore } from '../stores';

export default function SalesPage() {
  const { activeBusiness } = useBusinessStore();

  const { data, isLoading } = useQuery({
    queryKey: ['sales', activeBusiness?.id],
    queryFn: () => saleApi.list({ businessId: activeBusiness!.id, limit: 50 }),
    enabled: !!activeBusiness?.id,
  });

  const currency = activeBusiness?.currency || 'USD';

  return (
    <div className="page-stack">
      <PageHeader
        title="Sales"
        subtitle={`${data?.pagination.total || 0} total transactions`}
        action={<Button to="/sales/new" size="sm"><Plus size={18} /> New Sale</Button>}
      />

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data?.sales.length ? (
        <EmptyState
          title="No sales yet"
          description="Record your first sale to start tracking revenue"
          action={<Button to="/sales/new">Record Sale</Button>}
        />
      ) : (
        <div className="space-y-2">
          {data.sales.map((sale) => (
            <Link key={sale.id} to={`/sales/${sale.id}`}>
              <ListRow
                icon={<ShoppingBag size={18} />}
                title={sale.items?.map((i) => i.product?.name).filter(Boolean).join(', ') || 'Sale'}
                subtitle={`${formatRelative(sale.saleDate)} · ${sale.paymentMethod}`}
                trailing={
                  <div>
                    <p className="text-body-medium font-bold text-primary-600">{formatCurrency(Number(sale.totalAmount), currency)}</p>
                    <p className="text-caption text-emerald-600">+{formatCurrency(Number(sale.totalProfit), currency)}</p>
                  </div>
                }
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
