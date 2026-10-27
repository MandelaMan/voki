import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Camera, Grid3X3, List, Filter, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageHeader, FilterTabs } from '../components/ui/PageHeader';
import { ProductSearchBox } from '../components/products/ProductSearchBox';
import { ProductCard } from '../components/products/ProductCard';
import { Skeleton, EmptyState } from '../components/ui/Badge';
import { productApi, categoryApi, supplierApi } from '../api';
import { useBusinessStore, usePremium, useViewStore } from '../stores';
import { cn, formatCurrency } from '../lib/utils';

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
] as const;

function InventoryToolbar({
  showFilters,
  onToggleFilters,
  inventoryView,
  onViewChange,
}: {
  showFilters: boolean;
  onToggleFilters: () => void;
  inventoryView: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}) {
  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={onToggleFilters}
        className={cn(
          'p-2.5 rounded-2xl min-h-[40px] min-w-[40px] flex items-center justify-center transition-all',
          showFilters ? 'bg-primary-600 text-white [&_svg]:text-white' : 'surface-card text-slate-500'
        )}
        style={showFilters ? { boxShadow: 'var(--shadow-primary)' } : undefined}
        aria-label="Toggle filters"
      >
        <Filter size={18} />
      </button>
      <div className="flex surface-card !p-1 rounded-2xl">
        <button
          onClick={() => onViewChange('grid')}
          className={cn(
            'p-2 rounded-xl transition-colors',
            inventoryView === 'grid' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-slate-400'
          )}
          aria-label="Grid view"
        >
          <Grid3X3 size={18} />
        </button>
        <button
          onClick={() => onViewChange('list')}
          className={cn(
            'p-2 rounded-xl transition-colors',
            inventoryView === 'list' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-slate-400'
          )}
          aria-label="List view"
        >
          <List size={18} />
        </button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const isPremium = usePremium();
  const { inventoryView, setInventoryView } = useViewStore();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('categoryId') || '';
  const supplierId = params.get('supplierId') || '';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories', activeBusiness?.id],
    queryFn: () => categoryApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id && !!categoryId,
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', activeBusiness?.id],
    queryFn: () => supplierApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id && !!supplierId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', activeBusiness?.id, search, statusFilter, categoryId, supplierId],
    queryFn: () =>
      productApi.list({
        businessId: activeBusiness!.id,
        search: search || undefined,
        status: statusFilter || undefined,
        categoryId: categoryId || undefined,
        supplierId: supplierId || undefined,
        limit: 50,
      }),
    enabled: !!activeBusiness?.id,
  });

  const products = data?.products || [];
  const currency = activeBusiness?.currency || 'USD';
  const totalQty = products.reduce((sum, product) => sum + product.remainingQuantity, 0);
  const totalValue = products.reduce(
    (sum, product) => sum + Number(product.sellingPrice) * product.remainingQuantity,
    0
  );

  return (
    <div className="page-stack pb-16 lg:pb-0">
      <PageHeader
        title="All Inventory Items"
        subtitle="Stock goes up when you record a purchase"
        action={
          <Button to="/inventory/new">
            <Plus size={16} /> Add Product
          </Button>
        }
      />

      {isPremium && (
        <div className="grid grid-cols-2 gap-2">
          <Button to="/lists/scan?kind=PURCHASE" variant="soft" size="sm" className="w-full">
            <Camera size={16} /> Scan restock
          </Button>
          <Button to="/reports#restock" variant="soft" size="sm" className="w-full">
            <Boxes size={16} /> Restock ideas
          </Button>
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ProductSearchBox
            businessId={activeBusiness?.id}
            value={search}
            onChange={setSearch}
            currency={currency}
            placeholder="Search items..."
            onSelect={(product) => navigate(`/inventory/${product.id}`)}
          />
        </div>
        <InventoryToolbar
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          inventoryView={inventoryView}
          onViewChange={setInventoryView}
        />
      </div>

      {(categoryId || supplierId) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {categoryId && (
            <span className="rounded-full bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 font-semibold text-primary-700 dark:text-primary-300">
              Category: {categories?.find((category) => category.id === categoryId)?.name || 'Selected'}
            </span>
          )}
          {supplierId && (
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-300">
              Supplier: {suppliers?.find((supplier) => supplier.id === supplierId)?.name || 'Selected'}
            </span>
          )}
          <Link to="/inventory" onClick={() => setParams({})} className="font-semibold text-slate-500">Clear</Link>
        </div>
      )}

      {showFilters && (
        <FilterTabs
          options={statusFilters.map((f) => ({ value: f.value, label: f.label }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
        <span>Items: <strong className="font-semibold text-slate-800 dark:text-slate-100">{data?.pagination.total || 0}</strong></span>
        <span>Total Quantity: <strong className="font-semibold text-slate-800 dark:text-slate-100">{totalQty}</strong></span>
        <span>Total Value: <strong className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalValue, currency)}</strong></span>
      </div>

      {isLoading ? (
        <div
          className={cn(
            inventoryView === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
              : 'flex flex-col gap-3'
          )}
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : !products.length ? (
        <EmptyState
          title="No products yet"
          description="Add a product, then record a purchase to stock it."
          action={<Button to="/inventory/new">Add Product</Button>}
        />
      ) : (
        <div
          className={cn(
            inventoryView === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch'
              : 'flex flex-col gap-3'
          )}
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={currency}
              view={inventoryView}
            />
          ))}
        </div>
      )}
    </div>
  );
}
