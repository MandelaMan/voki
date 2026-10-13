import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Trash2, PackagePlus, Pencil } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { StockBadge } from '../components/ui/Badge';
import { ImageGallery } from '../components/products/ImageGallery';
import { ProductHistoryTabs } from '../components/products/ProductHistoryTabs';
import { Skeleton } from '../components/ui/Badge';
import {
  ImageUploadPreview,
  createPreviews,
  revokePreviews,
  type ImagePreview,
} from '../components/ui/ImageUploadPreview';
import { formatCurrency, getApiErrorMessage, isProductOutOfStock } from '../lib/utils';
import { BackgroundRemovalOption } from '../components/billing/PremiumNotice';
import { productApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { useBusinessStore } from '../stores';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusiness } = useBusinessStore();
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [pendingPreviews, setPendingPreviews] = useState<ImagePreview[]>([]);
  const [removeBackground, setRemoveBackground] = useState(false);
  const previewsRef = useRef(pendingPreviews);
  previewsRef.current = pendingPreviews;

  useEffect(() => () => revokePreviews(previewsRef.current), []);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id, activeBusiness?.id],
    queryFn: () => productApi.get(id!, activeBusiness!.id),
    enabled: !!id && !!activeBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => productApi.delete(id!, activeBusiness!.id),
    onSuccess: async () => {
      setActionError('');
      await refreshCommerce(queryClient);
      navigate('/inventory');
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not delete this product.')),
  });

  const handleAddPending = (files: File[]) => {
    setPendingPreviews((prev) => [...prev, ...createPreviews(files)]);
  };

  const handleRemovePending = (index: number) => {
    setPendingPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUploadPending = async () => {
    if (!pendingPreviews.length || !activeBusiness) return;
    setUploading(true);
    try {
      const selected = pendingPreviews.map((preview) => preview.file);
      const files = removeBackground
        ? await Promise.all(selected.map((file) => productApi.removeBackground(file)))
        : selected;
      await productApi.uploadImages(id!, activeBusiness.id, files);
      revokePreviews(pendingPreviews);
      setPendingPreviews([]);
      setActionError('');
      refreshCommerce(queryClient);
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Could not upload those photos.'));
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-[16rem_minmax(0,1fr)] gap-3">
        <Skeleton className="h-44 sm:h-56 rounded-2xl" />
        <Skeleton className="h-44 sm:h-56 rounded-2xl" />
      </div>
    );
  }
  if (!product) return <p>Product not found</p>;

  const currency = activeBusiness?.currency || 'USD';
  const profit = (Number(product.sellingPrice) - Number(product.buyingPrice)) * product.remainingQuantity;
  const canSell = !isProductOutOfStock(product);
  const facts = [
    { label: 'Buy', value: formatCurrency(Number(product.buyingPrice), currency) },
    { label: 'Sell', value: formatCurrency(Number(product.sellingPrice), currency), accent: true },
    { label: 'In stock', value: `${product.remainingQuantity}` },
    { label: 'Sold', value: `${product.quantitySold}` },
    { label: 'Bought', value: `${product.quantityPurchased}` },
    { label: 'Profit', value: formatCurrency(profit, currency), profit: true },
  ];

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Back
      </button>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 items-start">
        <div className="min-w-0 space-y-2">
          <ImageGallery images={product.images} alt={product.name} compact />
          <ImageUploadPreview
            compact
            previews={pendingPreviews}
            onAdd={handleAddPending}
            onRemove={handleRemovePending}
          />
          <BackgroundRemovalOption checked={removeBackground} onChange={setRemoveBackground} />
          {pendingPreviews.length > 0 && (
            <Button className="w-full" size="sm" onClick={handleUploadPending} loading={uploading}>
              Upload {pendingPreviews.length}
            </Button>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight break-words">{product.name}</h1>
              <p className="text-xs text-slate-500 truncate mt-0.5">{product.sku}</p>
            </div>
            <StockBadge status={product.status} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {product.brand && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-full">
                {product.brand}
              </span>
            )}
            {product.category && (
              <Link to={`/inventory?categoryId=${product.category.id}`} className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-[11px] font-medium text-primary-700 dark:text-primary-300 truncate max-w-full">
                {product.category.name}
              </Link>
            )}
            {product.supplier && (
              <Link to={`/suppliers#${product.supplier.id}`} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-full">
                {product.supplier.name}
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 leading-none">{fact.label}</p>
                <p className={`text-sm font-semibold tabular-nums mt-1 ${fact.accent ? 'text-primary-600' : fact.profit ? 'text-emerald-600' : ''}`}>
                  {fact.value}
                </p>
              </div>
            ))}
          </div>

          {product.description && (
            <p className="text-sm text-slate-500 leading-snug line-clamp-3">{product.description}</p>
          )}

          <div className="flex gap-2">
            <Button to={`/inventory/${product.id}/edit`} variant="secondary" size="sm" className="!px-3 shrink-0" aria-label="Edit product">
              <Pencil size={15} />
            </Button>
            <Button to={`/inventory/${product.id}/restock`} variant="secondary" size="sm" className="flex-1 min-w-0">
              <PackagePlus size={15} />
              <span className="truncate">Restock</span>
            </Button>
            {canSell ? (
              <Button to={`/sales/new?productId=${product.id}`} size="sm" className="flex-1 min-w-0">
                <ShoppingCart size={15} />
                <span className="truncate">Sell</span>
              </Button>
            ) : (
              <Button size="sm" disabled variant="primary" className="flex-1 min-w-0" aria-label="Out of stock">
                <ShoppingCart size={15} />
                <span className="truncate">Sold out</span>
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              className="!px-3 shrink-0"
              aria-label="Delete product"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      </div>

      <ProductHistoryTabs product={product} currency={currency} />

      {product.hasVariants && product.variants && product.variants.length > 0 && (
        <Card className="!p-3">
          <h3 className="text-sm font-semibold mb-2">Variants</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {product.variants.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{v.variantType}: {v.variantValue}</p>
                  <p className="text-xs text-slate-500 truncate">{formatCurrency(Number(v.sellingPrice), currency)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{v.remainingQuantity}</p>
                  <StockBadge status={v.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
