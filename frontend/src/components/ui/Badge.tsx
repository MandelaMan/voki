import { cn, getStockStatusColor, getStockStatusLabel } from '../../lib/utils';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const statusConfig = {
  IN_STOCK: {
    icon: CheckCircle2,
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  LOW_STOCK: {
    icon: AlertTriangle,
    text: 'text-amber-600 dark:text-amber-400',
  },
  OUT_OF_STOCK: {
    icon: XCircle,
    text: 'text-red-600 dark:text-red-400',
  },
} as const;

export function StockStatusIndicator({
  status,
  className,
  compact,
  short,
}: {
  status: string;
  className?: string;
  compact?: boolean;
  /** Abbreviated labels for tight grid cells */
  short?: boolean;
}) {
  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config?.icon ?? CheckCircle2;
  const label = short
    ? status === 'IN_STOCK'
      ? 'In stock'
      : status === 'LOW_STOCK'
        ? 'Low stock'
        : status === 'OUT_OF_STOCK'
          ? 'Out of stock'
          : getStockStatusLabel(status)
    : getStockStatusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium min-w-0 whitespace-nowrap',
        short ? 'text-micro' : compact ? 'text-[11px]' : 'text-caption',
        config?.text ?? 'text-slate-500',
        className
      )}
    >
      <Icon size={short ? 10 : compact ? 11 : 13} className="shrink-0" strokeWidth={2.25} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function StockBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight text-white',
        getStockStatusColor(status),
        className
      )}
    >
      {getStockStatusLabel(status)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {icon && <div className="text-slate-300 dark:text-slate-600 mb-4">{icon}</div>}
      <h3 className="text-heading text-slate-800 dark:text-slate-200">{title}</h3>
      {description && <p className="text-caption text-slate-500 mt-1.5 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
