import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../api';
import { PremiumNotice } from '../components/billing/PremiumNotice';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, Skeleton } from '../components/ui/Badge';
import { formatCurrency, formatRelative } from '../lib/utils';
import { useBusinessStore, usePremium } from '../stores';

export default function CustomersPage() {
  const isPremium = usePremium();
  const { activeBusiness } = useBusinessStore();
  const currency = activeBusiness?.currency || 'KES';
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', activeBusiness?.id],
    queryFn: () => customerApi.list(activeBusiness!.id),
    enabled: isPremium && !!activeBusiness?.id,
  });

  return (
    <div className="page-stack">
      <PageHeader title="Customers" />
      {!isPremium ? (
        <PremiumNotice
          title="Customer book is on Premium"
          description="See who comes back and what they have spent."
        />
      ) : isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : !customers?.length ? (
        <EmptyState
          title="No customers yet"
          description="Add a name or phone when you record a sale."
        />
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <Card key={customer.id} className="!p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-medium font-semibold truncate">{customer.name}</p>
                <p className="text-caption text-slate-500 truncate">
                  {customer.phone || 'No phone'}
                  {customer.lastSaleAt ? ` · ${formatRelative(customer.lastSaleAt)}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-body-medium font-semibold">{formatCurrency(customer.totalSpent || 0, currency)}</p>
                <p className="text-caption text-slate-500">{customer.salesCount || 0} {(customer.salesCount || 0) === 1 ? 'sale' : 'sales'}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
