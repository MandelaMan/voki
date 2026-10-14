import { PAYMENT_METHOD_OPTIONS, type PaymentMethod } from '../../lib/payments';
import { cn } from '../../lib/utils';

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod[];
  onChange: (next: PaymentMethod[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-label text-primary-700 dark:text-slate-300">Payment methods</p>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHOD_OPTIONS.map((option) => {
          const checked = value.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold',
                checked
                  ? 'border-primary-300 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-100'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
              )}
            >
              <input
                type="checkbox"
                className="accent-primary-600"
                checked={checked}
                onChange={() => {
                  const next = checked
                    ? value.filter((method) => method !== option.value)
                    : [...value, option.value];
                  onChange(PAYMENT_METHOD_OPTIONS.map((item) => item.value).filter((method) => next.includes(method)));
                }}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
