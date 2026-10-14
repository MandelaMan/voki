import {
  type InputHTMLAttributes,
  forwardRef,
  useCallback,
  useRef,
  useState,
} from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(value);
      else if (ref) (ref as React.MutableRefObject<T>).current = value;
    });
  };
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
}

/** "0" or "0.00" is a placeholder. "0." is someone typing a decimal. */
function isPlaceholderZero(value: string) {
  return /^0+(?:\.0+)?$/.test(value);
}

function stripLeadingZeros(value: string) {
  if (value === '' || value === '-' || value === '.' || value === '-.') return value;
  const negative = value.startsWith('-');
  const body = negative ? value.slice(1) : value;
  const [whole, fraction] = body.split('.');
  const stripped = whole.replace(/^0+(?=\d)/, '') || '0';
  const next = fraction === undefined ? stripped : `${stripped}.${fraction}`;
  return `${negative ? '-' : ''}${next}`;
}

function commitDigitOverZero(input: HTMLInputElement, digit: string) {
  setNativeValue(input, digit);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function stepNumberInput(input: HTMLInputElement, direction: 1 | -1) {
  const step = parseFloat(input.step) || 1;
  const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
  const max = input.max !== '' ? parseFloat(input.max) : Infinity;
  const current = parseFloat(input.value) || 0;
  const next = Math.min(max, Math.max(min, current + direction * step));
  const decimals = (step.toString().split('.')[1] || '').length;
  const rounded = decimals > 0 ? Number(next.toFixed(decimals)) : next;

  setNativeValue(input, String(rounded));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, type, disabled, step, onChange, onKeyDown, onBeforeInput, ...props }, ref) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const isNumber = type === 'number';
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    const wholeNumber = isNumber && (step === undefined || Number.isInteger(Number(step)));

    const handleStep = useCallback((direction: 1 | -1) => {
      const input = innerRef.current;
      if (!input || disabled) return;
      stepNumberInput(input, direction);
    }, [disabled]);

    const handleNumberKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (wholeNumber && (event.key === '.' || event.key === ',' || event.key === 'e' || event.key === 'E')) {
        event.preventDefault();
        return;
      }
      if (!/^[0-9]$/.test(event.key) || !isPlaceholderZero(event.currentTarget.value)) return;
      event.preventDefault();
      commitDigitOverZero(event.currentTarget, event.key);
    };

    const handleNumberBeforeInput = (event: React.FormEvent<HTMLInputElement>) => {
      onBeforeInput?.(event as React.InputEvent<HTMLInputElement>);
      if (event.defaultPrevented) return;
      const data = (event.nativeEvent as InputEvent).data ?? '';
      if (wholeNumber && /[.,eE]/.test(data)) {
        event.preventDefault();
        return;
      }
      if (!/^[0-9]$/.test(data) || !isPlaceholderZero(event.currentTarget.value)) return;
      event.preventDefault();
      commitDigitOverZero(event.currentTarget, data);
    };

    const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      let value = event.target.value;
      if (wholeNumber && value.includes('.')) {
        value = String(Math.round(Number(value)));
      }
      const next = stripLeadingZeros(value);
      if (next !== event.target.value) {
        setNativeValue(event.target, next);
      }
      onChange?.(event);
    };

    const inputEl = (
      <input
        ref={mergeRefs(ref, innerRef)}
        id={id}
        type={inputType}
        disabled={disabled}
        className={cn(
          'w-full py-2.5 border-0 bg-transparent text-slate-900 dark:text-slate-100',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal',
          'focus:outline-none min-h-[44px] text-body',
          'cursor-text caret-slate-900 dark:caret-slate-100',
          icon ? 'pl-11 pr-4' : 'px-4',
          isNumber && 'pr-12',
          isPassword && 'pr-11',
          error && 'text-red-600',
          className
        )}
        {...props}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBeforeInput={onBeforeInput}
      />
    );

    const wrap = (children: React.ReactNode, extra?: string) => (
      <div className={cn(
        'surface-input relative flex items-center',
        error && 'border-red-300 dark:border-red-800 ring-[3px] ring-red-500/10',
        extra
      )}>
        {icon && (
          <span className="absolute left-4 text-slate-400 pointer-events-none flex items-center">
            {icon}
          </span>
        )}
        {children}
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    );

    const field = isNumber ? (
      <div className={cn('surface-input relative', error && 'border-red-300 ring-[3px] ring-red-500/10')}>
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
            {icon}
          </span>
        )}
        <input
          ref={mergeRefs(ref, innerRef)}
          id={id}
          type="number"
          disabled={disabled}
          step={wholeNumber ? (step ?? 1) : step}
          inputMode={wholeNumber ? 'numeric' : 'decimal'}
          className={cn(
            'w-full py-2.5 border-0 bg-transparent text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 focus:outline-none min-h-[44px] text-body',
            'cursor-text caret-slate-900 dark:caret-slate-100 pr-12',
            icon ? 'pl-11' : 'px-4',
            className
          )}
          {...props}
          onKeyDown={handleNumberKeyDown}
          onBeforeInput={handleNumberBeforeInput}
          onChange={handleNumberChange}
        />
        <div className={cn(
          'absolute right-1.5 top-1.5 bottom-1.5 flex flex-col w-9 rounded-xl overflow-hidden',
          disabled && 'opacity-50 pointer-events-none'
        )}>
          <button type="button" tabIndex={-1} aria-label="Increase" onClick={() => handleStep(1)}
            className="flex-1 flex items-center justify-center bg-white dark:bg-slate-700 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/40 transition-colors">
            <ChevronUp size={14} strokeWidth={2.5} />
          </button>
          <button type="button" tabIndex={-1} aria-label="Decrease" onClick={() => handleStep(-1)}
            className="flex-1 flex items-center justify-center bg-white dark:bg-slate-700 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/40 transition-colors mt-0.5">
            <ChevronDown size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    ) : wrap(inputEl);

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-label text-slate-600 dark:text-slate-400">
            {label}
          </label>
        )}
        {field}
        {hint && !error && <p className="text-caption text-slate-500">{hint}</p>}
        {error && <p className="text-caption text-red-500 font-semibold">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
