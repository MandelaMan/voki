import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
  size = 'md',
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  size?: 'md' | 'lg' | 'xl' | 'full';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[80] flex justify-center bg-slate-950/45',
        size === 'full' ? 'items-stretch p-2 sm:p-3' : 'items-end p-3 sm:items-center'
      )}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex w-full flex-col border border-slate-200 bg-white shadow-soft-lg',
          'dark:border-slate-700 dark:bg-slate-900',
          'animate-[slide-up_0.18s_ease-out]',
          size === 'full'
            ? 'h-[min(96svh,100%)] max-h-[96svh] max-w-[min(96vw,1400px)] rounded-2xl p-4 sm:p-5'
            : 'max-h-[90svh] rounded-2xl p-4',
          size === 'md' && 'max-w-md',
          size === 'lg' && 'max-w-2xl',
          size === 'xl' && 'max-w-4xl',
          className
        )}
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3 sm:mb-4">
          <div className="min-w-0">
            <h2 className="text-heading text-slate-900 dark:text-slate-100">{title}</h2>
            {description && <p className="mt-0.5 text-caption text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
