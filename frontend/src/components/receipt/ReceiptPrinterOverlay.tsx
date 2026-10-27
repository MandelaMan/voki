import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, RotateCcw, X } from 'lucide-react';
import { saleApi } from '../../api';
import { VokiMark } from '../brand/VokiMark';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Badge';
import { formatCurrency, getApiErrorMessage, getImageUrl } from '../../lib/utils';
import { useBusinessStore } from '../../stores';
import { ReceiptPrinter, useReceiptPrintSequence } from './ReceiptPrinter';
import type { Receipt } from '../../types';

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0 text-[#25D366]">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function GmailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path fill="#4CAF50" d="M45 16.2 40 18.95 35 23.7V40h7c1.657 0 3-1.343 3-3V16.2z" />
      <path fill="#1E88E5" d="M3 16.2 6.614 17.91 13 23.7V40H6c-1.657 0-3-1.343-3-3V16.2z" />
      <path fill="#E53935" d="m35 11.2-11 8.25-11-8.25L12 17l1 6.7 11 8.25L35 23.7 36 17z" />
      <path fill="#C62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859A2.99 2.99 0 0 0 7.298 8h0C4.924 8 3 9.924 3 12.298z" />
      <path fill="#FBC02D" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341A2.99 2.99 0 0 1 40.702 8h0C43.076 8 45 9.924 45 12.298z" />
    </svg>
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MPESA: 'M-Pesa',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

function receiptMessage(receipt: Receipt) {
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

function Dash() {
  return <div className="my-3 border-t border-dashed border-slate-400/70" aria-hidden />;
}

export function ReceiptPrinterOverlay({
  saleId,
  onClose,
}: {
  saleId: string;
  onClose: () => void;
}) {
  const { activeBusiness } = useBusinessStore();
  const [shareError, setShareError] = useState('');
  const [replayKey, setReplayKey] = useState(0);
  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ['receipt', saleId, activeBusiness?.id],
    queryFn: () => saleApi.receipt(saleId, activeBusiness!.id),
    enabled: !!saleId && !!activeBusiness?.id,
  });

  const { stage, markComplete } = useReceiptPrintSequence(!!receipt, replayKey);

  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.classList.add('receipt-overlay-open');
    document.documentElement.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('receipt-overlay-open');
      document.documentElement.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const shareWhatsApp = () => {
    if (!receipt) return;
    const text = receiptMessage(receipt);
    const phone = (receipt.customer?.phone || '').replace(/\D/g, '');
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) setShareError('Allow pop-ups to open WhatsApp, or copy the receipt and send it yourself.');
  };

  const shareEmail = () => {
    if (!receipt) return;
    const text = receiptMessage(receipt);
    const subject = `Receipt ${receipt.receiptNumber} — ${receipt.business.name}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  };

  const content = (
    <div
      className="receipt-printer-overlay fixed inset-0 z-[90] flex flex-col bg-slate-950/55 backdrop-blur-[2px] print:static print:inset-auto print:z-auto print:bg-transparent print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-label="Sale receipt"
    >
      <div className="receipt-printer-chrome flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] print:hidden">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-soft dark:bg-slate-900 dark:text-slate-200"
        >
          <X size={16} /> Done
        </button>
        <button
          type="button"
          onClick={() => setReplayKey((key) => key + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-soft dark:bg-slate-900 dark:text-slate-300"
        >
          <RotateCcw size={13} /> Replay
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 print:overflow-visible print:px-0">
        {isLoading && <Skeleton className="mx-auto mt-8 h-80 max-w-sm rounded-2xl print:hidden" />}
        {!isLoading && !receipt && (
          <div className="mx-auto mt-8 max-w-sm rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-soft print:hidden dark:bg-slate-900 dark:text-slate-200">
            <p>{getApiErrorMessage(error, 'Receipt is not available.')}</p>
            <Button className="mt-3" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}
        {receipt && (
          <>
            {shareError && <p className="mb-2 text-center text-caption text-red-100 print:hidden">{shareError}</p>}
            <ReceiptBody
              receipt={receipt}
              stage={stage}
              replayKey={replayKey}
              onPrintFinished={markComplete}
            />
          </>
        )}
      </div>

      {receipt && (
        <div className="receipt-printer-chrome shrink-0 border-t border-white/10 bg-slate-950/80 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md print:hidden">
          <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2">
            <Button size="sm" variant="secondary" onClick={shareWhatsApp} disabled={stage !== 'complete'}>
              <WhatsAppIcon /> WhatsApp
            </Button>
            <Button size="sm" variant="secondary" onClick={shareEmail} disabled={stage !== 'complete'}>
              <GmailIcon /> Email
            </Button>
            <Button size="sm" onClick={() => window.print()} disabled={stage !== 'complete'}>
              <Printer size={14} /> Print
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

function ReceiptBody({
  receipt,
  stage,
  replayKey,
  onPrintFinished,
}: {
  receipt: Receipt;
  stage: 'processing' | 'printing' | 'complete';
  replayKey: number;
  onPrintFinished: () => void;
}) {
  const currency = receipt.business.currency;
  const when = new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(receipt.saleDate));
  const logo = getImageUrl(receipt.business.logo);
  const paymentLabel = PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod;
  const headline =
    receipt.items.length === 1
      ? (receipt.items[0].variant
        ? `${receipt.items[0].name} (${receipt.items[0].variant})`
        : receipt.items[0].name)
      : `${receipt.items.length} items`;
  const subline = receipt.customer?.name
    || (receipt.paymentStatus === 'PENDING' ? 'Waiting for payment' : 'Paid in full');

  return (
    <ReceiptPrinter.Root
      stage={stage}
      replayKey={replayKey}
      onPrintFinished={onPrintFinished}
      className="pb-4"
    >
      <ReceiptPrinter.Machine className="print:hidden">
        <ReceiptPrinter.Header>
          {logo ? (
            <img src={logo} alt="" className="size-7 rounded-lg object-cover" />
          ) : (
            <VokiMark size={28} />
          )}
        </ReceiptPrinter.Header>
        <ReceiptPrinter.Screen>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{headline}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{subline}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
                <p className="text-lg font-bold tabular-nums text-white">
                  {formatCurrency(receipt.total, currency)}
                </p>
              </div>
            </div>
            <ReceiptPrinter.Status />
          </div>
        </ReceiptPrinter.Screen>
      </ReceiptPrinter.Machine>

      <ReceiptPrinter.Output>
        <ReceiptPrinter.Paper aria-label="Order receipt">
          <div className="text-center">
            {logo ? (
              <img src={logo} alt="" className="mx-auto mb-2 h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="mx-auto mb-2 flex justify-center">
                <VokiMark size={36} />
              </div>
            )}
            <p className="text-sm font-bold tracking-wide uppercase">{receipt.business.name}</p>
            <p className="mt-1 text-[11px] text-slate-600">Receipt {receipt.receiptNumber}</p>
            <p className="text-[11px] text-slate-600">{when}</p>
          </div>

          <Dash />

          {receipt.customer && (
            <>
              <div className="flex justify-between gap-3 text-[11px]">
                <span className="text-slate-600">Customer</span>
                <span className="text-right font-medium">
                  {receipt.customer.name}
                  {receipt.customer.phone ? (
                    <>
                      <br />
                      {receipt.customer.phone}
                    </>
                  ) : null}
                </span>
              </div>
              <Dash />
            </>
          )}

          <div className="space-y-2.5">
            {receipt.items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold uppercase tracking-wide">{item.name}</p>
                  <p className="text-[11px] text-slate-600">
                    {item.variant ? `${item.variant} · ` : ''}
                    {item.quantity} × {formatCurrency(item.unitPrice, currency)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">
                  {formatCurrency(item.lineTotal, currency)}
                </p>
              </div>
            ))}
          </div>

          <Dash />

          <div className="flex items-end justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wide">Total paid</span>
            <span className="text-base font-bold tabular-nums">
              {formatCurrency(receipt.total, currency)}
            </span>
          </div>

          <div className="mt-4 space-y-1 text-[11px] text-slate-600">
            <div className="flex justify-between gap-3">
              <span>Order</span>
              <span className="font-medium text-slate-900">{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Paid with</span>
              <span className="font-medium text-slate-900">
                {paymentLabel}
                {receipt.paymentStatus === 'PENDING' ? ' · pending' : ''}
                {receipt.mpesaReceipt ? ` · ${receipt.mpesaReceipt}` : ''}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Date</span>
              <span className="font-medium text-slate-900">{when}</span>
            </div>
            {receipt.business.mpesaShortCode && (
              <div className="flex justify-between gap-3">
                <span>{receipt.business.mpesaType === 'TILL' ? 'Till' : 'Paybill'}</span>
                <span className="font-medium text-slate-900">
                  {receipt.business.mpesaShortCode}
                  {receipt.business.mpesaAccount ? ` · Acc ${receipt.business.mpesaAccount}` : ''}
                </span>
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-xs font-medium tracking-wide">Thank you.</p>
        </ReceiptPrinter.Paper>
      </ReceiptPrinter.Output>
    </ReceiptPrinter.Root>
  );
}
