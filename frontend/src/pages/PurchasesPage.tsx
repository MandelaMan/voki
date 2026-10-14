import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Truck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageHeader, ListRow } from '../components/ui/PageHeader';
import { Skeleton, EmptyState } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { purchaseApi } from '../api';
import { useBusinessStore } from '../stores';

export default function PurchasesPage() {
  const { activeBusiness } = useBusinessStore();

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', activeBusiness?.id],
    queryFn: () => purchaseApi.list({ businessId: activeBusiness!.id, limit: 50 }),
    enabled: !!activeBusiness?.id,
  });

  const currency = activeBusiness?.currency || 'USD';

  return (
    <div className="page-stack">
      <PageHeader
        title="Purchases"
        subtitle="Each purchase adds stock to your products"
        action={<Button to="/purchases/new" size="sm"><Plus size={18} /> Record</Button>}
      />

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data?.purchases.length ? (
        <EmptyState title="No purchases yet" description="Create the product first, then record what you bought." action={<Button to="/purchases/new">Record Purchase</Button>} />
      ) : (
        <div className="space-y-2">
          {data.purchases.map((purchase) => (
            <Link key={purchase.id} to={`/purchases/${purchase.id}`}>
              <ListRow
                icon={<Truck size={18} />}
                title={purchase.supplier?.name || 'Purchase'}
                subtitle={`${formatDate(purchase.purchaseDate)}${purchase.receiptNumber ? ` · #${purchase.receiptNumber}` : ''} · ${purchase.items?.length || 0} ${(purchase.items?.length || 0) === 1 ? 'item' : 'items'}`}
                trailing={<p className="text-body-medium font-bold">{formatCurrency(Number(purchase.totalCost), currency)}</p>}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
