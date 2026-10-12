import { useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { productApi } from '../../api';
import { cn, formatCurrency, getImageUrl, getProductStock, isProductOutOfStock } from '../../lib/utils';
import type { Product } from '../../types';

function productImage(product: Product) {
  const image = [...(product.images || [])].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (a.order ?? 0) - (b.order ?? 0)
  )[0];
  return getImageUrl(image?.path);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  const index = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-primary-600">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}

function stockLine(product: Product) {
  const count = getProductStock(product);
  if (count <= 0) return 'Out of stock';
  return `${count} in stock`;
}

export function ProductSearchBox({
  businessId,
  value,
  onChange,
  onSelect,
  currency = 'USD',
  placeholder = 'Search products...',
  price = 'selling',
  disableOutOfStock = false,
  autoFocus = false,
}: {
  businessId?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (product: Product) => void;
  currency?: string;
  placeholder?: string;
  price?: 'selling' | 'buying';
  disableOutOfStock?: boolean;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(autoFocus);
  const query = value.trim();

  const { data: matches = [], isFetching } = useQuery({
    queryKey: ['product-search', businessId, query],
    queryFn: () => productApi.search(businessId!, query),
    enabled: !!businessId && query.length >= 1,
  });

  const { data: catalog } = useQuery({
    queryKey: ['product-suggestions', businessId],
    queryFn: () => productApi.list({ businessId, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' }),
    enabled: !!businessId,
  });

  const matchIds = new Set((query ? matches : []).map((product) => product.id));
  const focusCategory = query ? matches[0]?.category?.id : undefined;
  const suggestions = (catalog?.products || [])
    .filter((product) => !matchIds.has(product.id))
    .sort((a, b) => {
      const categoryRank = Number(b.category?.id === focusCategory) - Number(a.category?.id === focusCategory);
      if (categoryRank) return categoryRank;
      return Number(isProductOutOfStock(a)) - Number(isProductOutOfStock(b));
    })
    .slice(0, 6);

  const visibleMatches = query ? matches.slice(0, 8) : [];
  const showPanel = (open || query.length > 0) && (
    visibleMatches.length > 0 || suggestions.length > 0 || (query.length >= 1 && !isFetching)
  );

  const choose = (product: Product) => {
    if (disableOutOfStock && isProductOutOfStock(product)) return;
    onSelect(product);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const next = [...visibleMatches, ...suggestions].find(
      (product) => !disableOutOfStock || !isProductOutOfStock(product)
    );
    if (!next) return;
    event.preventDefault();
    choose(next);
  };

  return (
    <div className="space-y-2">
      <div className="surface-input relative flex items-center">
        <Search className="absolute left-3.5 text-slate-400" size={18} />
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="w-full pl-10 pr-4 py-2.5 bg-transparent border-0 focus:outline-none text-body text-slate-900 dark:text-slate-100 min-h-[44px] cursor-text caret-slate-900 dark:caret-slate-100"
        />
      </div>

      {showPanel && (
        <div className="surface-card !p-1.5 space-y-2 max-h-[min(20rem,calc(100dvh-13.5rem))] overflow-y-auto">
          {visibleMatches.length > 0 && (
            <SuggestionGroup
              title="Matches"
              products={visibleMatches}
              query={query}
              currency={currency}
              price={price}
              disableOutOfStock={disableOutOfStock}
              onSelect={choose}
            />
          )}

          {query.length >= 1 && !isFetching && visibleMatches.length === 0 && (
            <p className="px-2 py-1.5 text-caption text-slate-500">No products match “{query}”.</p>
          )}

          {suggestions.length > 0 && (
            <SuggestionGroup
              title="Suggestions"
              products={suggestions}
              query={query}
              currency={currency}
              price={price}
              disableOutOfStock={disableOutOfStock}
              onSelect={choose}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionGroup({
  title,
  products,
  query,
  currency,
  price,
  disableOutOfStock,
  onSelect,
}: {
  title: string;
  products: Product[];
  query: string;
  currency: string;
  price: 'selling' | 'buying';
  disableOutOfStock: boolean;
  onSelect: (product: Product) => void;
}) {
  return (
    <div>
      <p className="px-2 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="space-y-1">
        {products.map((product) => {
          const imageUrl = productImage(product);
          const outOfStock = isProductOutOfStock(product);
          const disabled = disableOutOfStock && outOfStock;
          const amount = Number(price === 'buying' ? product.buyingPrice : product.sellingPrice);
          const detail = [product.brand, product.category?.name].filter(Boolean).join(' · ');

          return (
            <button
              key={product.id}
              type="button"
              disabled={disabled}
              onMouseDown={(event) => {
                event.preventDefault();
                if (!disabled) onSelect(product);
              }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors',
                'hover:bg-slate-50 dark:hover:bg-slate-800/70',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-slate-400">{product.name.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-medium truncate">
                  <Highlight text={product.name} query={query} />
                </span>
                <span className={cn('block text-caption truncate', outOfStock ? 'text-red-500 font-medium' : 'text-slate-500')}>
                  {detail ? `${detail} · ` : ''}
                  {stockLine(product)}
                </span>
              </span>
              <span className="text-body-medium font-semibold text-primary-600 shrink-0">
                {formatCurrency(amount, currency)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
