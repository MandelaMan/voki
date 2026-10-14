import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { VokiMark } from '../brand/VokiMark';
import { ThemeToggle } from '../layout/ThemeToggle';
import { cn } from '../../lib/utils';

export function AuthScreen({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[#e6eaf2] dark:bg-[#10131c] sm:flex sm:h-svh sm:items-center sm:justify-center sm:overflow-hidden sm:p-4">
      <div
        className={cn(
          'relative flex min-h-svh w-full flex-col px-7 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]',
          'bg-[linear-gradient(180deg,#d7e4ff_0%,#eef3ff_24%,#f6f8fc_58%,#f4f6fb_100%)]',
          'dark:bg-[linear-gradient(180deg,#1a2440_0%,#141a2c_40%,#10131c_100%)]',
          'sm:h-auto sm:min-h-0 sm:max-h-[calc(100svh-2rem)] sm:max-w-[430px] sm:overflow-y-auto sm:rounded-[2.25rem] sm:border sm:border-white/80 sm:px-7 sm:py-5',
          'sm:shadow-[0_28px_70px_-24px_rgba(20,20,20,0.45),0_10px_28px_-16px_rgba(20,20,20,0.18)]',
          'dark:sm:border-white/10',
          'scrollbar-hide page-transition'
        )}
      >
        <ThemeToggle className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 text-stone-500 hover:bg-white/70 dark:text-stone-300 dark:hover:bg-white/10" />

        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-3 flex flex-col items-center">
            <VokiMark size={44} />
            <p className="mt-1 text-xl font-extrabold tracking-tight text-primary-600 dark:text-primary-300">
              Voki
            </p>
          </div>

          <div className="mb-5 text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-1 max-w-[16rem] text-[13px] leading-snug text-slate-500 dark:text-neutral-400">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>

        <p className="shrink-0 pt-3 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
          {footer}
        </p>
      </div>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.3 5.5l6.3 5.3C38.2 36.8 44 32 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden className="fill-neutral-900 dark:fill-white">
      <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.2 2.8-2.3c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.4-.9-2.5-3.8zM14.8 6.2c.6-.8 1.1-1.9.9-3-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.5 2.9-1.3z" />
    </svg>
  );
}

export function SocialButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-10 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-neutral-800',
        'shadow-[0_8px_20px_-12px_rgba(30,30,30,0.45),0_1px_2px_rgba(30,30,30,0.04)]',
        'transition-transform active:scale-[0.99]',
        'dark:bg-neutral-900 dark:text-neutral-100 dark:shadow-none dark:ring-1 dark:ring-white/10'
      )}
    >
      {children}
      {label}
    </button>
  );
}

interface AuthPillFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export function AuthPillField({ label, icon, error, className, type, id, ref, ...props }: AuthPillFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block px-3 text-[13px] font-semibold leading-none text-slate-700 dark:text-neutral-400">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
          {icon}
        </span>
        <input
          ref={ref}
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          className={cn(
            'h-12 w-full rounded-full border-0 bg-white pl-12 text-sm text-neutral-900 outline-none',
            'shadow-[0_8px_22px_-14px_rgba(59,95,230,0.45),0_1px_2px_rgba(15,23,42,0.04)]',
            'placeholder:text-neutral-400',
            'focus:ring-2 focus:ring-primary-500/40',
            'dark:bg-neutral-900 dark:text-white dark:shadow-none dark:ring-1 dark:ring-white/10',
            isPassword ? 'pr-12' : 'pr-5',
            'disabled:cursor-not-allowed disabled:opacity-60',
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
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
          </button>
        )}
      </div>
      {error && <p className="px-2 text-[11px] leading-tight text-red-500">{error}</p>}
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  loading,
  disabled,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'w-full rounded-full bg-primary-600 py-3 text-[15px] font-bold text-white',
        'shadow-[0_10px_24px_-10px_rgba(59,95,230,0.85)]',
        'transition-transform hover:bg-primary-700 active:scale-[0.99]',
        'disabled:cursor-not-allowed disabled:opacity-70'
      )}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}
