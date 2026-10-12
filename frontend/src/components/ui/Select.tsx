import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-label text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}
      <div className={cn('surface-input relative', error && 'border-red-300 ring-2 ring-red-500/10')}>
        <select
          ref={ref}
          id={id}
          className={cn(
            'w-full appearance-none px-4 py-2.5 pr-10 rounded-2xl border-0 bg-transparent',
            'text-slate-900 dark:text-slate-100 min-h-[44px] text-body',
            'focus:outline-none cursor-pointer',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="text-caption text-red-500 font-semibold">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';
