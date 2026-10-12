import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Link, type To } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  to?: To;
}

const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 hover:text-white active:bg-primary-800 active:text-white disabled:text-white [&_svg]:text-white',
  secondary: 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-soft border border-slate-100 dark:border-slate-700',
  soft: 'bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 border border-primary-100 dark:border-primary-900/40',
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
  danger:
    'bg-red-500 text-white hover:bg-red-600 hover:text-white active:bg-red-700 active:text-white disabled:text-white [&_svg]:text-white',
  outline: 'border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
};

const sizes = {
  sm: 'px-2.5 py-1 text-[calc(0.625rem+0.5px)] font-semibold rounded-lg min-h-[32px] leading-tight',
  md: 'px-3.5 py-1.5 text-[calc(0.6875rem+0.5px)] font-semibold rounded-xl min-h-[36px] leading-snug',
  lg: 'px-4 py-2 text-[calc(0.6875rem+0.5px)] font-semibold rounded-xl min-h-[40px] leading-snug',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, to, type = 'button', ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation',
      'active:scale-[0.98]',
      variants[variant],
      sizes[size],
      (variant === 'primary' || variant === 'danger') && 'text-white [&_svg]:text-white',
      variant === 'primary' && { boxShadow: 'var(--shadow-primary)' },
      className
    );

    const content = (
      <>
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </>
    );

    if (to) {
      return (
        <Link to={to} className={classes}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={classes}
        {...props}
      >
        {content}
      </button>
    );
  }
);
Button.displayName = 'Button';
