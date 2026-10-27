import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';

export type SearchableOption = {
  value: string;
  label: string;
  description?: string;
};

export type CreateField = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
};

export type SearchableSelectProps = {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  allowClear?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  createLabel?: string;
  createTitle?: string;
  createDescription?: string;
  createFields?: CreateField[];
  createDefaults?: Record<string, string>;
  onCreate?: (values: Record<string, string>) => Promise<string | void> | string | void;
  creating?: boolean;
  /** When true, create modal name field is seeded from the current search query. */
  seedCreateFromQuery?: boolean;
  className?: string;
  /** Extra action rendered under the option list (e.g. custom footer). */
  footer?: ReactNode;
};

export function SearchableSelect({
  label,
  error,
  hint,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  options,
  value,
  onChange,
  allowClear = true,
  disabled = false,
  emptyMessage = 'No matches',
  createLabel,
  createTitle,
  createDescription,
  createFields,
  createDefaults,
  onCreate,
  creating = false,
  seedCreateFromQuery = true,
  className,
  footer,
}: SearchableSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [createValues, setCreateValues] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState('');

  const selected = options.find((option) => option.value === value);
  const canCreate = Boolean(createLabel && createFields?.length && onCreate);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description || ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const openCreateModal = (seed?: string) => {
    const defaults: Record<string, string> = { ...(createDefaults || {}) };
    for (const field of createFields || []) {
      if (defaults[field.name] == null) defaults[field.name] = '';
    }
    const primary = createFields?.[0]?.name;
    if (primary && seedCreateFromQuery && seed?.trim()) {
      defaults[primary] = seed.trim();
    }
    setCreateValues(defaults);
    setCreateError('');
    setModalOpen(true);
    setOpen(false);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!onCreate || !createFields?.length) return;

    for (const field of createFields) {
      if (field.required !== false && !createValues[field.name]?.trim()) {
        setCreateError(`${field.label} is required.`);
        return;
      }
    }

    setCreateError('');
    try {
      const trimmed = Object.fromEntries(
        Object.entries(createValues).map(([key, val]) => [key, val.trim()])
      );
      const createdId = await onCreate(trimmed);
      if (createdId) onChange(createdId);
      setModalOpen(false);
      setQuery('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    }
  };

  return (
    <div className={cn('space-y-1.5', className)} ref={rootRef}>
      {label && (
        <label htmlFor={id} className="block text-label text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}

      {selected ? (
        <div
          className={cn(
            'surface-input flex min-h-[44px] items-center justify-between gap-2 px-3',
            error && 'border-red-300 ring-2 ring-red-500/10',
            disabled && 'opacity-60'
          )}
        >
          <button
            type="button"
            id={id}
            disabled={disabled}
            onClick={() => !disabled && setOpen((prev) => !prev)}
            className="min-w-0 flex-1 py-2 text-left"
          >
            <span className="block truncate text-body-medium text-slate-900 dark:text-slate-100">
              {selected.label}
            </span>
            {selected.description && (
              <span className="block truncate text-caption text-slate-500">{selected.description}</span>
            )}
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            {allowClear && !disabled && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setOpen((prev) => !prev)}
              className="rounded-lg p-1.5 text-slate-400"
              aria-label="Change selection"
            >
              <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          className={cn(
            'surface-input flex min-h-[44px] w-full items-center justify-between gap-2 px-4 text-left',
            error && 'border-red-300 ring-2 ring-red-500/10',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          <span className="truncate text-body text-slate-400">{placeholder}</span>
          <ChevronDown size={16} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
        </button>
      )}

      {open && !disabled && (
        <div className="surface-card relative z-20 !p-1.5 space-y-1.5">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border-0 bg-slate-50 py-2.5 pl-9 pr-3 text-body text-slate-900 outline-none dark:bg-slate-800/70 dark:text-slate-100"
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-caption text-slate-500">
                {query.trim() ? `${emptyMessage} for “${query.trim()}”.` : emptyMessage}
              </p>
            ) : (
              filtered.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-colors',
                      active
                        ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-medium">{option.label}</span>
                      {option.description && (
                        <span className="block truncate text-caption text-slate-500">{option.description}</span>
                      )}
                    </span>
                    {active && <Check size={16} className="mt-0.5 shrink-0 text-primary-600" />}
                  </button>
                );
              })
            )}
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => openCreateModal(query)}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary-300 px-2.5 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/20"
            >
              <Plus size={16} />
              {query.trim()
                ? `${createLabel}: “${query.trim()}”`
                : createLabel}
            </button>
          )}

          {footer}
        </div>
      )}

      {hint && !error && <p className="text-caption text-slate-500">{hint}</p>}
      {error && <p className="text-caption text-red-500 font-semibold">{error}</p>}

      {canCreate && (
        <Modal
          open={modalOpen}
          title={createTitle || createLabel || 'Add new'}
          description={createDescription}
          onClose={() => !creating && setModalOpen(false)}
        >
          <form onSubmit={handleCreate} className="space-y-3">
            {createError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-caption font-semibold text-red-600 dark:bg-red-950/40">
                {createError}
              </p>
            )}
            {createFields?.map((field) => (
              <Input
                key={field.name}
                label={field.label}
                type={field.type || 'text'}
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                value={createValues[field.name] || ''}
                onChange={(event) =>
                  setCreateValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                }
                autoFocus={field === createFields[0]}
              />
            ))}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={creating}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={creating}>
                Save
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
