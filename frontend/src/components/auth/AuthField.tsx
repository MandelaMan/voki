import { type InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  labelAction?: React.ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, labelAction, className, type, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={inputId} className="block text-sm font-bold text-slate-800 dark:text-slate-100">
            {label}
          </label>
          {labelAction}
        </div>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            className={cn(
              'w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-full',
              'text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
              'border-0 outline-none transition-shadow cursor-text',
              'caret-slate-900 dark:caret-slate-100',
              'focus:ring-2 focus:ring-primary-500/30 focus:bg-white dark:focus:bg-slate-800',
              isPassword && 'pr-12',
              error && 'ring-2 ring-red-300',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500 px-2">{error}</p>}
      </div>
    );
  }
);
AuthField.displayName = 'AuthField';

interface AuthSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function AuthSubmitButton({ children, loading, disabled, className, ...props }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'w-full py-4 rounded-full font-bold text-[calc(0.8125rem+0.5px)] text-white',
        'bg-primary-600 hover:bg-primary-700 hover:text-white active:bg-primary-800 active:text-white',
        'transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:text-white',
        '[&_svg]:text-white',
        className
      )}
      style={{ boxShadow: 'var(--shadow-primary)' }}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Please wait...
        </span>
      ) : children}
    </button>
  );
}
