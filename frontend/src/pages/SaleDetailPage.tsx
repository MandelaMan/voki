import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Badge';
import { PremiumNotice } from '../components/billing/PremiumNotice';
import { mpesaApi, saleApi } from '../api';
import { useBusinessStore, usePremium } from '../stores';
import { formatCurrency, formatDate, getApiErrorMessage, getImageUrl } from '../lib/utils';
import { refreshCommerce } from '../lib/refresh';

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isPremium = usePremium();
  const { activeBusiness } = useBusinessStore();
  const [phone, setPhone] = useState('');
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [receiptCode, setReceiptCode] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id, activeBusiness?.id],
    queryFn: () => saleApi.get(id!, activeBusiness!.id),
    enabled: !!id && !!activeBusiness?.id,
  });
  const savedPrompt = sale?.mpesaPrompts?.[0] || sale?.mpesaPrompt || null;
  const { data: livePrompt } = useQuery({
    queryKey: ['mpesa-prompt', savedPrompt?.id],
    queryFn: () => mpesaApi.getPrompt(savedPrompt!.id),
    enabled: !!savedPrompt && savedPrompt.status === 'PENDING',
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 3000 : false),
  });
  const prompt = livePrompt || savedPrompt;

  useEffect(() => {
    if (phoneEdited || !sale?.customer?.phone) return;
    setPhone(sale.customer.phone);
  }, [sale?.customer?.phone, phoneEdited]);

  useEffect(() => {
    if (livePrompt?.status !== 'SUCCESS' && livePrompt?.status !== 'FAILED' && livePrompt?.status !== 'CANCELLED') return;
    queryClient.invalidateQueries({ queryKey: ['sale', id, activeBusiness?.id] });
    refreshCommerce(queryClient);
  }, [livePrompt?.status, id, activeBusiness?.id, queryClient]);

  const retryPrompt = useMutation({
    mutationFn: () => saleApi.promptMpesa(id!, phone),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['sale', id, activeBusiness?.id] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not send the M-Pesa prompt.')),
  });

  const simulate = useMutation({
    mutationFn: (action: 'SUCCESS' | 'CANCELLED') => mpesaApi.simulate(prompt!.id, action),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['mpesa-prompt', prompt?.id] });
      queryClient.invalidateQueries({ queryKey: ['sale', id, activeBusiness?.id] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not update the sandbox payment.')),
  });

  const markPaid = useMutation({
    mutationFn: () => saleApi.markPaid(id!, activeBusiness!.id, receiptCode.trim() || undefined),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['sale', id, activeBusiness?.id] });
      refreshCommerce(queryClient);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not mark this sale as paid.')),
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
        <p className="text-sm text-slate-500">
          {formatDate(sale.saleDate)} · {sale.paymentMethod.toLowerCase()}
          {sale.paymentStatus === 'PENDING' ? ' · waiting for payment' : ''}
          {sale.mpesaReceipt ? ` · ${sale.mpesaReceipt}` : ''}
        </p>
        {sale.customer && (
          <p className="text-sm text-slate-500">
            {sale.customer.name}{sale.customer.phone ? ` · ${sale.customer.phone}` : ''}
          </p>
        )}
      </div>
      {actionError && <Alert variant="error">{actionError}</Alert>}
      {sale.paymentStatus === 'PENDING' && (
        <Card className="!p-4 space-y-3">
          <p className="text-body-medium font-semibold">
            {prompt?.status === 'PENDING'
              ? `Waiting for the PIN on ${prompt.phone}`
              : 'M-Pesa has not confirmed this sale yet'}
          </p>
          {prompt?.resultDesc && prompt.status !== 'PENDING' && (
            <p className="text-caption text-slate-500">{prompt.resultDesc}</p>
          )}
          {prompt?.status === 'PENDING' && prompt.simulated && (
            <div className="flex gap-2">
              <Button className="flex-1" loading={simulate.isPending} onClick={() => simulate.mutate('SUCCESS')}>
                Customer paid
              </Button>
              <Button className="flex-1" variant="secondary" loading={simulate.isPending} onClick={() => simulate.mutate('CANCELLED')}>
                Cancel prompt
              </Button>
            </div>
          )}
          {prompt?.status !== 'PENDING' && (
            <>
              <Input
                label="Customer phone"
                inputMode="tel"
                value={phone}
                onChange={(event) => {
                  setPhoneEdited(true);
                  setPhone(event.target.value);
                }}
              />
              <Button className="w-full" loading={retryPrompt.isPending} onClick={() => retryPrompt.mutate()} disabled={!phone.trim()}>
                Send M-Pesa prompt
              </Button>
            </>
          )}
          <Input
            label="M-Pesa code, if you already have it"
            value={receiptCode}
            onChange={(event) => setReceiptCode(event.target.value)}
          />
          <Button className="w-full" variant="secondary" loading={markPaid.isPending} onClick={() => markPaid.mutate()}>
            Mark as paid
          </Button>
        </Card>
      )}
      {isPremium ? (
        <Button to={`/sales/${sale.id}/receipt`} variant="secondary" className="w-full">
          Receipt
        </Button>
      ) : (
        <PremiumNotice
          title="Receipts are on Premium"
          description="Print a receipt for this sale, or send it to the customer on WhatsApp."
        />
      )}
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
