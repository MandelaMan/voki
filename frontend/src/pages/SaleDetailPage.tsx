import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Badge';
import { saleApi } from '../api';
import { useBusinessStore } from '../stores';
import { formatCurrency, formatDate, getImageUrl } from '../lib/utils';

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id, activeBusiness?.id],
    queryFn: () => saleApi.get(id!, activeBusiness!.id),
    enabled: !!id && !!activeBusiness?.id,
  });
  const currency = activeBusiness?.currency || 'USD';

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!sale) return <p>Sale not found</p>;

  return (
    <div className="page-stack">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Back
      </button>
      <div>
        <h1 className="text-xl font-bold">Sale</h1>
        <p className="text-sm text-slate-500">{formatDate(sale.saleDate)} · {sale.paymentMethod.toLowerCase()}</p>
        {sale.customer && <p className="text-sm text-slate-500">{sale.customer.name}</p>}
      </div>
      <Card className="!p-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] uppercase text-slate-400">Amount</p>
          <p className="font-semibold">{formatCurrency(Number(sale.totalAmount), currency)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-slate-400">Profit</p>
          <p className="font-semibold text-emerald-600">{formatCurrency(Number(sale.totalProfit), currency)}</p>
        </div>
      </Card>
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold text-right">Qty</th>
              <th className="px-3 py-2 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center shrink-0">
                      {getImageUrl(item.product?.images?.[0]?.path) ? (
                        <img
                          src={getImageUrl(item.product?.images?.[0]?.path)!}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[9px] text-slate-400">No image</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      {item.product ? (
                        <Link to={`/inventory/${item.product.id}`} className="font-semibold text-primary-600">{item.product.name}</Link>
                      ) : (
                        <span>Removed product</span>
                      )}
                      {item.variant && <p className="text-[11px] text-slate-400">{item.variant.variantType}: {item.variant.variantValue}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(Number(item.sellingPrice) * item.quantity, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
