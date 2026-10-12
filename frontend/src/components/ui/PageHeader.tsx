import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-display text-slate-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-snug">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="w-full sm:w-auto shrink-0 [&_a]:w-full [&_a]:sm:w-auto [&_button]:w-full [&_button]:sm:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}

export function FormSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface-card p-4 space-y-4', className)}>
      {title && <h3 className="text-label text-slate-700 dark:text-slate-300">{title}</h3>}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-caption font-semibold transition-all',
            value === opt.value
              ? 'bg-primary-600 text-white shadow-primary [&_svg]:text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 surface-card !shadow-none border border-slate-100 dark:border-slate-800'
          )}
          style={value === opt.value ? { boxShadow: 'var(--shadow-primary)' } : undefined}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function StatusBar({
  variant = 'success',
  children,
  className,
}: {
  variant?: 'success' | 'info' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    success: 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-100 dark:border-primary-900',
    info: 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-100',
    error: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-100',
  };

  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-body',
      styles[variant],
      className
    )} role="status">
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  onFocus,
  onBlur,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('surface-input flex-1 flex items-center min-w-0', className)}>
      <Search size={16} className="ml-3 text-slate-400 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2.5 py-2.5 bg-transparent border-0 focus:outline-none text-body text-slate-900 dark:text-slate-100 min-h-[44px] cursor-text caret-slate-900 dark:caret-slate-100 placeholder:text-slate-400"
      />
    </div>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  badge,
  onClick,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full surface-card flex items-center gap-3 p-3 text-left transition-all active:scale-[0.99]',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/25 text-primary-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-body-medium text-slate-900 dark:text-slate-100 truncate">{title}</p>
        {subtitle && <p className="text-caption text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {badge}
      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
    </Comp>
  );
}
