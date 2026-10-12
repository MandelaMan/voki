import { Link } from 'react-router-dom';
import { formatCurrency, getImageUrl, cn } from '../../lib/utils';
import { StockBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProductActivityNotes } from './ProductActivityNotes';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  currency?: string;
  view?: 'grid' | 'list';
}

function ProductImage({
  imageUrl,
  name,
  className,
}: {
  imageUrl: string | null;
  name: string;
  className?: string;
}) {
  return (
    <div className={cn('bg-slate-50 dark:bg-slate-800/60 overflow-hidden flex items-center justify-center', className)}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="max-h-full max-w-full object-contain" loading="lazy" />
      ) : (
        <span className="text-[11px] text-slate-400">No image</span>
      )}
    </div>
  );
}

function VariantPreview({ product }: { product: Product }) {
  if (!product.hasVariants || !product.variants?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {product.variants.slice(0, 2).map((v) => (
        <span
          key={v.id}
          className="max-w-full truncate px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400"
        >
          {v.variantValue}: {v.remainingQuantity}
        </span>
      ))}
      {product.variants.length > 2 && (
        <span className="text-[10px] text-slate-400">+{product.variants.length - 2}</span>
      )}
    </div>
  );
}

function MetaRows({
  quantity,
  totalValue,
  currency,
}: {
  quantity: number;
  totalValue: number;
  currency: string;
}) {
  return (
    <div className="mt-3 space-y-1.5 text-[13px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500 shrink-0">Quantity</span>
        <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums truncate">
          {quantity} {quantity === 1 ? 'Unit' : 'Units'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500 shrink-0">Total Value</span>
        <span className="font-semibold text-slate-900 dark:text-white tabular-nums truncate">
          {formatCurrency(totalValue, currency)}
        </span>
      </div>
    </div>
  );
}

function CardActions({ productId, needsRestock }: { productId: string; needsRestock: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      <Button
        to={`/inventory/${productId}`}
        variant="secondary"
        size="sm"
        className="w-full min-w-0 !bg-slate-100 !border-0 !shadow-none text-slate-700 hover:!bg-slate-200 dark:!bg-slate-800 dark:text-slate-200 dark:hover:!bg-slate-700"
      >
        View Details
      </Button>
      <Button
        to={`/inventory/${productId}/restock`}
        variant={needsRestock ? 'primary' : 'secondary'}
        size="sm"
        className="w-full min-w-0"
      >
        Restock
      </Button>
    </div>
  );
}

export function ProductCard({ product, currency = 'USD', view = 'grid' }: ProductCardProps) {
  const imageUrl = getImageUrl(product.images?.[0]?.path);
  const needsRestock = product.status !== 'IN_STOCK';
  const totalValue = Number(product.sellingPrice) * product.remainingQuantity;

  if (view === 'list') {
    return (
      <article className="surface-card p-3 sm:p-4 h-full flex flex-col">
        <div className="flex gap-3 min-w-0">
          <ProductImage imageUrl={imageUrl} name={product.name} className="w-[4.5rem] h-[4.5rem] rounded-xl shrink-0" />
          <div className="min-w-0 flex-1">
            <StockBadge status={product.status} />
            <h3 className="mt-1.5 font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
              {product.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{product.sku}</p>
            <VariantPreview product={product} />
          </div>
        </div>
        <MetaRows quantity={product.remainingQuantity} totalValue={totalValue} currency={currency} />
        <ProductActivityNotes product={product} currency={currency} />
        <div className="mt-auto">
          <CardActions productId={product.id} needsRestock={needsRestock} />
        </div>
      </article>
    );
  }

  return (
    <article className="surface-card p-3 sm:p-4 h-full flex flex-col relative">
      <StockBadge status={product.status} className="absolute top-3 left-3 z-10" />
      <Link to={`/inventory/${product.id}`} className="block min-w-0">
        <ProductImage
          imageUrl={imageUrl}
          name={product.name}
          className="h-36 sm:h-40 rounded-xl"
        />
        <p className="mt-3 text-xs text-slate-400 truncate">{product.sku}</p>
        <h3 className="mt-0.5 font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <VariantPreview product={product} />
        <MetaRows quantity={product.remainingQuantity} totalValue={totalValue} currency={currency} />
        <ProductActivityNotes product={product} currency={currency} />
      </Link>
      <div className="mt-auto">
        <CardActions productId={product.id} needsRestock={needsRestock} />
      </div>
    </article>
  );
}
