import { isValidElement, useLayoutEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Pagination, Table } from '@chakra-ui/react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type AdminColumn<T> = {
  header: string;
  align?: 'start' | 'end';
  wrap?: boolean;
  sortable?: boolean;
  value?: (row: T) => string | number | null | undefined;
  cell: (row: T) => ReactNode;
};

type SortDirection = 'asc' | 'desc';

function cellText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(cellText).join(' ');
  if (isValidElement<{ children?: ReactNode }>(node)) return cellText(node.props.children);
  return '';
}

function columnValue<T>(column: AdminColumn<T>, row: T): string | number {
  const raw = column.value ? column.value(row) : cellText(column.cell(row));
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : '';
  const text = String(raw ?? '').trim();
  return text === '—' ? '' : text;
}

function compareValues(a: string | number, b: string | number) {
  const emptyA = a === '';
  const emptyB = b === '';
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

const PAGE_SIZE = 12;

const fieldClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}

export function AdminField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex min-w-0 flex-1 basis-full flex-col gap-1 sm:basis-[12rem] sm:min-w-[10rem]', className)}>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function AdminSearch(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function AdminSelect({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: Array<{ value: string; label: string }> }) {
  return (
    <select {...props} className={cn(fieldClass, 'cursor-pointer', props.className)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

export function AdminStatus({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'good' | 'warn' | 'bad' | 'muted';
}) {
  return (
    <span className={cn(
      'font-medium',
      tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
      tone === 'warn' && 'text-amber-600 dark:text-amber-400',
      tone === 'bad' && 'text-orange-500',
      tone === 'muted' && 'text-slate-600 dark:text-slate-300',
    )}>
      {children}
    </span>
  );
}

export function AdminTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  toolbar,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  rowKey: (row: T) => string;
  empty: string;
  toolbar?: ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ header: string; direction: SortDirection } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);
  const [paneWidth, setPaneWidth] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const rowSignature = `${rows.length}:${rows[0] ? rowKey(rows[0]) : ''}:${rows.at(-1) ? rowKey(rows.at(-1) as T) : ''}`;

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const scroller = sheet.closest('main');
    const measure = () => {
      const bar = barRef.current;
      setBarHeight(bar ? Math.ceil(bar.getBoundingClientRect().height) : 0);
      if (!scroller) return;
      const styles = getComputedStyle(scroller);
      const pad = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      setPaneWidth(Math.max(0, scroller.clientWidth - pad));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    if (scroller) observer.observe(scroller);
    return () => observer.disconnect();
  }, [toolbar]);

  useLayoutEffect(() => {
    setPage(1);
  }, [rowSignature]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.header === sort.header && item.sortable !== false);
    if (!column) return rows;
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => direction * compareValues(columnValue(column, a), columnValue(column, b)));
  }, [rows, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE;
  const visible = useMemo(
    () => sorted.slice(start, start + PAGE_SIZE),
    [sorted, start],
  );

  const toggleSort = (header: string) => {
    setSort((current) => {
      if (current?.header !== header) return { header, direction: 'asc' };
      return { header, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
    setPage(1);
  };

  const stacked = paneWidth === null ? columns.length > 7 : columns.length * 96 > paneWidth;

  const sortControls = (
    <div className={cn('flex flex-wrap gap-1.5', toolbar && 'pt-2')}>
      {columns.filter((column) => column.sortable !== false).map((column) => {
        const active = sort?.header === column.header;
        return (
          <button
            key={column.header}
            type="button"
            onClick={() => toggleSort(column.header)}
            aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              active
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300',
            )}
          >
            {column.header}
            <SortIcon active={active} direction={active ? sort.direction : null} light={active} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={sheetRef}
      className={cn('admin-sheet', stacked && 'is-stacked')}
      style={{ ['--admin-toolbar' as string]: `${barHeight}px` }}
    >
      {(toolbar || (stacked && rows.length > 0)) && (
        <div ref={barRef} className="admin-pin w-full max-w-full pb-3">
          {toolbar}
          {stacked && rows.length > 0 && sortControls}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-caption text-slate-500 px-1">{empty}</p>
      ) : (
        <>
          <div className="admin-table-scroll">
            <Table.Root
              size="sm"
              stickyHeader
              bg="transparent"
              width="100%"
              style={{ ['--table-sticky-offset' as string]: 'var(--admin-head-offset)' }}
            >
              <Table.Header>
                <Table.Row bg="transparent">
                  {columns.map((column) => (
                    <Table.ColumnHeader
                      key={column.header}
                      textAlign={column.align}
                      borderWidth="0"
                      py="2.5"
                      px="3"
                      fontSize="sm"
                      fontWeight="medium"
                      whiteSpace="nowrap"
                      verticalAlign="middle"
                      aria-sort={column.sortable === false ? undefined : sort?.header === column.header ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      {column.sortable === false ? column.header : (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.header)}
                          className={cn(
                            'inline-flex max-w-full items-center gap-1 font-medium',
                            column.align === 'end' && 'w-full justify-end',
                          )}
                        >
                          <span>{column.header}</span>
                          <SortIcon
                            active={sort?.header === column.header}
                            direction={sort?.header === column.header ? sort.direction : null}
                          />
                        </button>
                      )}
                    </Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {visible.map((row) => (
                  <Table.Row key={rowKey(row)} bg="transparent">
                    {columns.map((column) => (
                      <Table.Cell
                        key={column.header}
                        textAlign={column.align}
                        whiteSpace={column.align === 'end' ? 'nowrap' : 'normal'}
                        verticalAlign="middle"
                        borderWidth="0"
                        py="3"
                        px="3"
                        fontSize="sm"
                        data-label={column.header}
                      >
                        {column.cell(row)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
          <Pagination.Root
            count={sorted.length}
            pageSize={PAGE_SIZE}
            page={safePage}
            onPageChange={(details) => setPage(details.page)}
          >
            <div className="flex items-center justify-between gap-3 px-1 pt-3 text-caption text-slate-500">
              <span>{start + 1}–{start + visible.length} of {sorted.length}</span>
              <div className="flex gap-1">
                <Pagination.PrevTrigger className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">
                  Previous
                </Pagination.PrevTrigger>
                <Pagination.NextTrigger className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">
                  Next
                </Pagination.NextTrigger>
              </div>
            </div>
          </Pagination.Root>
        </>
      )}
    </div>
  );
}

function SortIcon({
  active,
  direction,
  light,
}: {
  active: boolean;
  direction: SortDirection | null;
  light?: boolean;
}) {
  const className = light ? 'text-white' : active ? 'text-primary-600' : 'text-slate-400';
  if (!active || !direction) return <ArrowUpDown size={13} className={className} aria-hidden />;
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown;
  return <Icon size={13} className={className} aria-hidden />;
}
