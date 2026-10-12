import { type HTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn, currencySymbol } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
  variant?: 'default' | 'bordered' | 'flat';
}

export function Card({ className, padding = true, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl',
        variant === 'default' && 'surface-card',
        variant === 'bordered' && 'surface-card-bordered',
        variant === 'flat' && 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800',
        padding && 'p-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function HeroCard({
  title,
  value,
  subtitle,
  icon,
  className,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface-card p-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-white truncate">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 leading-snug">{subtitle}</p>
        )}
      </div>
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 [&_svg]:text-white">
          {icon}
        </div>
      )}
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col gap-2 !p-4 min-w-0', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{title}</span>
        {icon && (
          <span className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
            {icon}
          </span>
        )}
      </div>
      <p className="text-stat text-slate-900 dark:text-white truncate">{value}</p>
      {subtitle && (
        <p className={cn(
          'text-caption',
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'
        )}>
          {subtitle}
        </p>
      )}
    </Card>
  );
}

export function CurrencyMark({ currency, className }: { currency: string; className?: string }) {
  const symbol = currencySymbol(currency);
  return (
    <span className={cn('font-bold leading-none tracking-tight', symbol.length > 2 ? 'text-[11px]' : 'text-lg', className)}>
      {symbol}
    </span>
  );
}

export function QuickAction({
  to,
  onClick,
  icon,
  label,
  hint,
  primary,
}: {
  to?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  primary?: boolean;
}) {
  const inner = (
    <>
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        primary ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200'
      )}>
        {icon}
      </div>
      <span className={cn(
        'flex-1 min-w-0 text-left leading-tight',
        primary ? 'text-white' : 'text-slate-800 dark:text-white'
      )}>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && (
          <span className={cn('block text-[11px] font-medium mt-0.5', primary ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>
            {hint}
          </span>
        )}
      </span>
      <ChevronRight
        size={14}
        className={cn('shrink-0', primary ? 'text-white/80' : 'text-primary-600 dark:text-primary-300')}
        aria-hidden
      />
    </>
  );

  const className = cn(
    'group flex items-center gap-2.5 w-full min-h-[52px] px-3 py-2.5 rounded-2xl cursor-pointer text-left',
    'transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
    primary
      ? 'bg-primary-600 text-white shadow-[var(--shadow-primary)] hover:bg-primary-700'
      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-500 shadow-soft hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-slate-700 dark:hover:border-primary-400'
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
