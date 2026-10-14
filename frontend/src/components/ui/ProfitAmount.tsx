import { cn, formatCurrency } from '../../lib/utils';

export function formatSignedAmount(amount: number, currency?: string) {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  const text = formatCurrency(Math.abs(safe), currency).replace(/^[+\-−]/, '');
  if (safe > 0) return `+${text}`;
  if (safe < 0) return `-${text}`;
  return text;
}

export function profitTone(amount: number) {
  const value = Number(amount);
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-slate-500';
}

export function ProfitAmount({
  amount,
  currency,
  label = false,
  badge = false,
  className,
}: {
  amount: number;
  currency?: string;
  label?: boolean;
  badge?: boolean;
  className?: string;
}) {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const word = safe > 0 ? 'Profit' : safe < 0 ? 'Loss' : 'Even';
  const signed = formatSignedAmount(safe, currency);

  if (badge) {
    const chip = safe > 0
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
      : safe < 0
        ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none', chip, className)}>
        <span>{word}</span>
        <span className="tabular-nums">{signed}</span>
      </span>
    );
  }

  return (
    <span className={cn('tabular-nums', profitTone(safe), className)}>
      {signed}
      {label && word !== 'Even' ? ` ${word.toLowerCase()}` : ''}
    </span>
  );
}
