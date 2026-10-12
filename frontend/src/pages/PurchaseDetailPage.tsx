import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Badge';
import { purchaseApi } from '../api';
import { useBusinessStore } from '../stores';
import { formatCurrency, formatDate } from '../lib/utils';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase', id, activeBusiness?.id],
    queryFn: () => purchaseApi.get(id!, activeBusiness!.id),
    enabled: !!id && !!activeBusiness?.id,
  });
  const currency = activeBusiness?.currency || 'USD';

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!purchase) return <p>Purchase not found</p>;

  return (
    <div className="page-stack">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Back
      </button>
      <div>
        <h1 className="text-xl font-bold">Purchase</h1>
        <p className="text-sm text-slate-500">{formatDate(purchase.purchaseDate)}{purchase.receiptNumber ? ` · Receipt ${purchase.receiptNumber}` : ''}</p>
        {purchase.supplier ? (
          <Link to={`/suppliers#${purchase.supplier.id}`} className="text-sm font-semibold text-primary-600">{purchase.supplier.name}</Link>
        ) : (
          <p className="text-sm text-slate-500">No supplier</p>
        )}
      </div>
      <Card className="!p-3">
        <p className="text-[11px] uppercase text-slate-400">Total</p>
        <p className="font-semibold">{formatCurrency(Number(purchase.totalCost), currency)}</p>
      </Card>
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 font-semibold text-right">Qty</th>
              <th className="px-3 py-2 font-semibold text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {(purchase.items ?? []).map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2.5">
                  {item.product ? (
                    <Link to={`/inventory/${item.product.id}`} className="font-semibold text-primary-600">{item.product.name}</Link>
                  ) : (
                    <span className="font-medium">{item.name}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(Number(item.totalCost), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
