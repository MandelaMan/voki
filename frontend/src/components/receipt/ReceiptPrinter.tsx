import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ReceiptPrinterStage = 'processing' | 'printing' | 'complete';

type ReceiptPrinterContextValue = {
  animate: boolean;
  stage: ReceiptPrinterStage;
  onPrintFinished: () => void;
  replayKey: number;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(null);

const STATUS_LABELS: Record<ReceiptPrinterStage, string> = {
  processing: 'Processing your sale',
  printing: 'Printing your receipt',
  complete: 'Sale complete',
};

const PRINT_MS = 2000;
const PROCESS_MS = 600;

function useReceiptPrinter(component: string) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }
  return context;
}

/** Drive processing → printing → complete. Paper stays hidden until the feed runs. */
export function useReceiptPrintSequence(active = true, replayKey = 0) {
  const [stage, setStage] = useState<ReceiptPrinterStage>('processing');

  useEffect(() => {
    if (!active) {
      setStage('processing');
      return;
    }

    setStage('processing');
    const toPrinting = window.setTimeout(() => setStage('printing'), PROCESS_MS);
    // Fallback if animationend never fires (e.g. display:none mid-run)
    const toComplete = window.setTimeout(() => setStage('complete'), PROCESS_MS + PRINT_MS + 80);
    return () => {
      window.clearTimeout(toPrinting);
      window.clearTimeout(toComplete);
    };
  }, [active, replayKey]);

  const markComplete = useCallback(() => {
    setStage((current) => (current === 'printing' ? 'complete' : current));
  }, []);

  return { stage, markComplete, replayKey, active };
}

type RootProps = Omit<ComponentPropsWithoutRef<'section'>, 'children'> & {
  animate?: boolean;
  children: ReactNode;
  stage: ReceiptPrinterStage;
  onPrintFinished?: () => void;
  replayKey?: number;
};

function Root({
  'aria-label': ariaLabel = 'Receipt printer',
  animate = true,
  children,
  className,
  stage,
  onPrintFinished,
  replayKey = 0,
  ...props
}: RootProps) {
  return (
    <ReceiptPrinterContext.Provider
      value={{
        animate,
        stage,
        onPrintFinished: onPrintFinished ?? (() => undefined),
        replayKey,
      }}
    >
      <section
        aria-label={ariaLabel}
        className={cn('receipt-printer relative isolate mx-auto flex w-full max-w-sm flex-col items-center', className)}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

function Machine({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('receipt-printer-machine relative z-20 isolate w-full overflow-hidden p-3 pb-8', className)} {...props}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-5 bottom-3 z-40 h-2.5 rounded-sm border border-black bg-black shadow-[inset_0_1px_2px_rgb(255_255_255/0.12)]"
      />
    </div>
  );
}

function Header({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('relative z-10 flex h-11 items-start justify-between', className)} {...props}>
      {children}
    </div>
  );
}

function Screen({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('receipt-printer-screen relative z-10 isolate overflow-hidden p-4 text-slate-100', className)} {...props}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Status({ children, className, ...props }: Omit<ComponentPropsWithoutRef<'div'>, 'children'> & { children?: ReactNode }) {
  const { stage } = useReceiptPrinter('ReceiptPrinter.Status');
  const done = stage === 'complete';

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)} {...props}>
      <span aria-hidden className="relative grid size-5 shrink-0 place-items-center">
        {done ? (
          <CheckCircle2 size={18} className="text-emerald-400" strokeWidth={2.25} />
        ) : (
          <Loader2 size={18} className="animate-spin text-slate-400" />
        )}
      </span>
      <p aria-live="polite" role="status" className="truncate text-xs font-medium leading-none text-slate-400">
        {children ?? STATUS_LABELS[stage]}
      </p>
    </div>
  );
}

function Output({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) {
  const { animate, stage, onPrintFinished, replayKey } = useReceiptPrinter('ReceiptPrinter.Output');
  const feedRef = useRef<HTMLDivElement>(null);
  const feeding = animate && (stage === 'printing' || stage === 'complete');

  useEffect(() => {
    if (stage !== 'printing') return;
    const node = feedRef.current;
    if (!node) return;

    const finish = (event: AnimationEvent) => {
      if (event.target !== node) return;
      if (!event.animationName.includes('receipt-feed')) return;
      onPrintFinished();
    };

    node.addEventListener('animationend', finish);
    return () => node.removeEventListener('animationend', finish);
  }, [stage, onPrintFinished, replayKey]);

  return (
    <div
      className={cn(
        'receipt-printer-output relative z-10 -mt-5 w-[calc(82%+2.5rem)] max-w-full px-5 print:mt-0 print:h-auto print:w-full print:max-w-sm print:overflow-visible print:px-0',
        stage === 'complete'
          ? 'h-auto overflow-visible'
          : 'h-[min(28rem,55svh)] overflow-hidden',
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-0 z-30 h-3 bg-gradient-to-b from-slate-950/80 to-transparent print:hidden"
      />
      <div
        ref={feedRef}
        key={`feed-${replayKey}`}
        aria-hidden={stage !== 'complete'}
        className={cn(
          'receipt-printer-feed relative isolate',
          stage === 'processing' && 'is-hidden',
          feeding && stage === 'printing' && 'is-printing',
          stage === 'complete' && 'is-complete',
          !animate && 'is-complete',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Paper({ children, className, ...props }: ComponentPropsWithoutRef<'article'>) {
  return (
    <article
      className={cn(
        'receipt-printer-paper relative z-10 bg-[#f7f4ee] px-5 pt-6 pb-7 font-mono text-[12px] leading-relaxed text-slate-900 print:min-h-0 print:bg-white',
        className
      )}
      {...props}
    >
      {children}
    </article>
  );
}

export const ReceiptPrinter = {
  Root,
  Machine,
  Header,
  Screen,
  Status,
  Output,
  Paper,
};
