import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, UserRound } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FormFields } from '../components/ui/Form';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Badge';
import { PremiumNotice } from '../components/billing/PremiumNotice';
import { ReceiptPrinterOverlay } from '../components/receipt/ReceiptPrinterOverlay';
import { mpesaApi, saleApi } from '../api';
import { useBusinessStore, usePremium } from '../stores';
import { formatCurrency, formatDate, getApiErrorMessage, getImageUrl } from '../lib/utils';
import { ProfitAmount } from '../components/ui/ProfitAmount';
import { refreshCommerce } from '../lib/refresh';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

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
  const [showReceipt, setShowReceipt] = useState(false);
  const watchedPending = useRef(false);
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
    if (prompt?.status === 'PENDING') watchedPending.current = true;
  }, [prompt?.status]);

  useEffect(() => {
    if (livePrompt?.status !== 'SUCCESS' && livePrompt?.status !== 'FAILED' && livePrompt?.status !== 'CANCELLED') return;
    queryClient.invalidateQueries({ queryKey: ['sale', id, activeBusiness?.id] });
    refreshCommerce(queryClient);
    if (livePrompt?.status === 'SUCCESS' && isPremium && watchedPending.current) {
      watchedPending.current = false;
      setShowReceipt(true);
    }
  }, [livePrompt?.status, id, activeBusiness?.id, queryClient, isPremium]);

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
      if (isPremium) setShowReceipt(true);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not mark this sale as paid.')),
  });

  const currency = activeBusiness?.currency || 'USD';

  if (isLoading) return <Skeleton className="mx-auto h-64 max-w-xl rounded-2xl" />;
  if (!sale) return <p className="mx-auto max-w-xl">Sale not found</p>;

  const methodLabel = METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod;
  const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-stack mx-auto w-full max-w-xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Sale</h1>
          <p className="text-sm text-slate-500">
            {formatDate(sale.saleDate)} · {methodLabel}
            {sale.paymentStatus === 'PENDING' ? ' · waiting for payment' : ''}
            {sale.mpesaReceipt ? ` · ${sale.mpesaReceipt}` : ''}
          </p>
        </div>
        {sale.paymentStatus !== 'PENDING' && isPremium && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setShowReceipt(true)}
          >
            <Printer size={16} />
            Print receipt
          </Button>
        )}
      </div>

      {sale.paymentStatus !== 'PENDING' && !isPremium && (
        <PremiumNotice
          title="Receipts are on Premium"
          description="Print a receipt or send it on WhatsApp."
        />
      )}

      <Card className="!p-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
            <UserRound size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Customer</p>
            {sale.customer ? (
              <>
                <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                  {sale.customer.id ? (
                    <Link to="/customers" className="text-primary-600 hover:underline">
                      {sale.customer.name}
                    </Link>
                  ) : (
                    sale.customer.name
                  )}
                </p>
                {sale.customer.phone && (
                  <p className="text-sm tabular-nums text-slate-500">{sale.customer.phone}</p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Walk-in customer</p>
                <p className="text-caption text-slate-500">No name was saved on this sale</p>
              </>
            )}
          </div>
        </div>
      </Card>

      {actionError && <Alert variant="error">{actionError}</Alert>}
      {sale.paymentStatus === 'PENDING' && (
        isPremium ? (
          <Card className="!p-4">
            <FormFields busy={simulate.isPending || retryPrompt.isPending || markPaid.isPending} className="space-y-3">
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
            </FormFields>
          </Card>
        ) : (
          <PremiumNotice
            title="M-Pesa prompts are on Premium"
            description="Send a pay request to the customer’s phone, then print or share the receipt."
          />
        )
      )}

      <Card className="!p-3.5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Amount</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(Number(sale.totalAmount), currency)}</p>
            <p className="mt-0.5 text-caption text-slate-500">
              {sale.items.length} line{sale.items.length === 1 ? '' : 's'} · {itemCount} item{itemCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Profit</p>
            <ProfitAmount amount={Number(sale.totalProfit)} currency={currency} className="text-lg font-semibold" />
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Items</p>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sale.items.map((item) => {
            const lineTotal = Number(item.sellingPrice) * item.quantity;
            return (
              <li key={item.id} className="flex items-start gap-3 px-3.5 py-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/80">
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {item.product ? (
                        <Link to={`/inventory/${item.product.id}`} className="font-semibold text-primary-600">
                          {item.product.name}
                        </Link>
                      ) : (
                        <span className="font-medium">Removed product</span>
                      )}
                      {item.variant && (
                        <p className="text-[11px] text-slate-400">
                          {item.variant.variantType}: {item.variant.variantValue}
                        </p>
                      )}
                      <p className="mt-0.5 text-caption text-slate-500">
                        Qty {item.quantity}
                        {item.quantity > 1
                          ? ` · ${formatCurrency(Number(item.sellingPrice), currency)} each`
                          : ''}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatCurrency(lineTotal, currency)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {showReceipt && id && (
        <ReceiptPrinterOverlay saleId={id} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}
