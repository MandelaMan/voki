import { cn } from '../../lib/utils';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

const variants: Record<AlertVariant, string> = {
  error: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400',
  success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400',
  info: 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400',
};

export function Alert({
  variant,
  children,
  className,
}: {
  variant: AlertVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('p-3.5 rounded-xl text-body-medium', variants[variant], className)}
      role="alert"
    >
      {children}
    </div>
  );
}
