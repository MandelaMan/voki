import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Share2 } from 'lucide-react';
import { saleApi } from '../api';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Badge';
import { formatCurrency, getApiErrorMessage, getImageUrl } from '../lib/utils';
import { useBusinessStore } from '../stores';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MPESA: 'M-Pesa',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

function receiptMessage(receipt: NonNullable<Awaited<ReturnType<typeof saleApi.receipt>>>) {
  const currency = receipt.business.currency;
  const when = new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(receipt.saleDate));
  const lines = [
    receipt.business.name,
    `Receipt ${receipt.receiptNumber}`,
    when,
    '',
    ...receipt.items.map((item) => {
      const label = item.variant ? `${item.name} (${item.variant})` : item.name;
      return `${label} x${item.quantity}  ${formatCurrency(item.lineTotal, currency)}`;
    }),
    '',
    `Total ${formatCurrency(receipt.total, currency)}`,
    PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod,
  ];
  if (receipt.mpesaReceipt) lines.push(`M-Pesa ${receipt.mpesaReceipt}`);
  if (receipt.business.mpesaShortCode) {
    const kind = receipt.business.mpesaType === 'TILL' ? 'Till' : 'Paybill';
    const account = receipt.business.mpesaAccount ? ` Acc ${receipt.business.mpesaAccount}` : '';
    lines.push(`${kind} ${receipt.business.mpesaShortCode}${account}`);
  }
  lines.push('', 'Thank you.');
  return lines.join('\n');
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const [shareError, setShareError] = useState('');
  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ['receipt', id, activeBusiness?.id],
    queryFn: () => saleApi.receipt(id!, activeBusiness!.id),
    enabled: !!id && !!activeBusiness?.id,
  });

  const share = () => {
    if (!receipt) return;
    const text = receiptMessage(receipt);
    const phone = (receipt.customer?.phone || '').replace(/\D/g, '');
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) setShareError('Allow pop-ups to open WhatsApp, or copy the receipt and send it yourself.');
  };

  if (isLoading) return <Skeleton className="h-80 rounded-2xl" />;
  if (!receipt) {
    return (
      <div className="page-stack">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500">
          <ArrowLeft size={16} /> Back
        </button>
        <p>{getApiErrorMessage(error, 'Receipt is not available.')}</p>
        <Link to="/plan" className="text-primary-600 font-medium text-sm">See Premium</Link>
      </div>
    );
  }

  const currency = receipt.business.currency;
  const when = new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(receipt.saleDate));
  const logo = getImageUrl(receipt.business.logo);

  return (
    <div className="page-stack">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={share}>
            <Share2 size={14} /> WhatsApp
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </Button>
        </div>
      </div>
      {shareError && <p className="text-caption text-red-600 print:hidden">{shareError}</p>}

      <article className="receipt-sheet mx-auto w-full max-w-sm rounded-2xl bg-white px-5 py-6 text-slate-900 shadow-soft print:shadow-none print:rounded-none">
        <div className="text-center">
          {logo && <img src={logo} alt="" className="mx-auto mb-2 h-12 w-12 rounded-xl object-cover" />}
          <h1 className="text-lg font-bold">{receipt.business.name}</h1>
          <p className="text-xs text-slate-500 mt-1">Receipt {receipt.receiptNumber}</p>
          <p className="text-xs text-slate-500">{when}</p>
        </div>

        {receipt.customer && (
          <p className="mt-4 text-sm">
            {receipt.customer.name}
            {receipt.customer.phone ? ` · ${receipt.customer.phone}` : ''}
          </p>
        )}

        <div className="mt-4 border-t border-dashed border-slate-300 pt-3 space-y-2">
          {receipt.items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.variant ? `${item.variant} · ` : ''}
                  {item.quantity} × {formatCurrency(item.unitPrice, currency)}
                </p>
              </div>
              <p className="font-semibold tabular-nums shrink-0">{formatCurrency(item.lineTotal, currency)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-900 pt-3 flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold tabular-nums">{formatCurrency(receipt.total, currency)}</span>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          {PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod}
          {receipt.paymentStatus === 'PENDING' ? ' · waiting for payment' : ''}
          {receipt.mpesaReceipt ? ` · ${receipt.mpesaReceipt}` : ''}
        </p>
        {receipt.business.mpesaShortCode && (
          <p className="mt-1 text-xs text-slate-600">
            {receipt.business.mpesaType === 'TILL' ? 'Till' : 'Paybill'} {receipt.business.mpesaShortCode}
            {receipt.business.mpesaAccount ? ` · Acc ${receipt.business.mpesaAccount}` : ''}
          </p>
        )}
        <p className="mt-5 text-center text-sm">Thank you.</p>
      </article>
    </div>
  );
}
