import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackagePlus, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { productApi, supplierApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { useBusinessStore } from '../stores';
import { formatCurrency, getApiErrorMessage } from '../lib/utils';
import type { ProductVariant, Supplier } from '../types';

interface VariantRestockRow {
  variantId: string;
  label: string;
  currentStock: number;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
}

export default function RestockProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusiness } = useBusinessStore();
  const [saveError, setSaveError] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');
  const supplierSeeded = useRef(false);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [variantRows, setVariantRows] = useState<VariantRestockRow[]>([]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id, activeBusiness?.id],
    queryFn: () => productApi.get(id!, activeBusiness!.id),
    enabled: !!id && !!activeBusiness?.id,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', activeBusiness?.id],
    queryFn: () => supplierApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  useEffect(() => {
    if (!product) return;
    if (!supplierSeeded.current && product.supplier?.id) {
      supplierSeeded.current = true;
      setSupplierId(product.supplier.id);
    }
    if (product.hasVariants && product.variants?.length) {
      setVariantRows(
        product.variants.map((v: ProductVariant) => ({
          variantId: v.id,
          label: `${v.variantType}: ${v.variantValue}`,
          currentStock: v.remainingQuantity,
          quantity: 0,
          unitCost: Number(v.buyingPrice),
          sellingPrice: Number(v.sellingPrice),
        }))
      );
    } else {
      setUnitCost(Number(product.buyingPrice));
      setSellingPrice(Number(product.sellingPrice));
    }
  }, [product]);

  const currency = activeBusiness?.currency || 'USD';

  const updateVariantRow = (
    variantId: string,
    field: 'quantity' | 'unitCost' | 'sellingPrice',
    value: number
  ) => {
    setVariantRows((rows) =>
      rows.map((row) => (row.variantId === variantId ? { ...row, [field]: value } : row))
    );
  };

  const activeItems = product?.hasVariants
    ? variantRows
        .filter((row) => row.quantity > 0)
        .map((row) => ({
          variantId: row.variantId,
          quantity: row.quantity,
          unitCost: row.unitCost,
          sellingPrice: row.sellingPrice,
        }))
    : quantity > 0
      ? [{ quantity, unitCost, sellingPrice }]
      : [];

  const totalCost = product?.hasVariants
    ? variantRows.reduce((sum, row) => sum + row.quantity * row.unitCost, 0)
    : quantity * unitCost;

  const createSupplier = useMutation({
    mutationFn: ({ name, address }: { name: string; address?: string }) =>
      supplierApi.create({ businessId: activeBusiness!.id, name, address: address || undefined }),
    onSuccess: (supplier: Supplier) => {
      queryClient.setQueryData<Supplier[]>(['suppliers', activeBusiness?.id], (current) => {
        const next = [...(current ?? []).filter((item) => item.id !== supplier.id), supplier];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setSupplierId(supplier.id);
      setSupplierQuery('');
      setSaveError('');
    },
    onError: (error) => {
      setSaveError(getApiErrorMessage(error, 'Could not add that supplier.'));
    },
  });

  const mutation = useMutation({
    mutationFn: () =>
      productApi.restock(id!, {
        businessId: activeBusiness!.id,
        items: activeItems,
        supplierId: supplierId || undefined,
        purchaseDate,
        receiptNumber: receiptNumber || undefined,
        notes: notes || undefined,
      }),
    onSuccess: async () => {
      await refreshCommerce(queryClient);
      navigate(`/inventory/${id}`);
    },
    onError: (error) => {
      setSaveError(getApiErrorMessage(error, 'Failed to restock product. Please try again.'));
    },
  });

  if (!activeBusiness) {
    return (
      <div className="page-stack">
        <PageHeader title="Restock Product" />
        <Alert variant="warning">You need to set up a business before restocking.</Alert>
      </div>
    );
  }

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!product) return <p>Product not found</p>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    if (!activeItems.length) {
      setSaveError('Enter a quantity to add for at least one item.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="page-stack">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Back
      </button>

      <PageHeader
        title="Restock Product"
        subtitle={product.name}
      />

      <Card>
        <p className="text-caption text-slate-500">Current stock</p>
        <p className="text-stat mt-0.5">{product.remainingQuantity}</p>
        {product.sku && <p className="text-caption text-slate-400 mt-1">SKU: {product.sku}</p>}
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        {saveError && <Alert variant="error">{saveError}</Alert>}

        {product.hasVariants && product.variants && product.variants.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-label">Restock by variant</h3>
            <p className="text-caption text-slate-500">
              Add stock for each size, color, or other variant separately.
            </p>
            {variantRows.map((row) => (
              <div
                key={row.variantId}
                className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-body-medium font-medium">{row.label}</p>
                  <p className="text-caption text-slate-500">{row.currentStock} in stock</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Qty to add"
                    type="number"
                    min={0}
                    step={1}
                    value={row.quantity || ''}
                    onChange={(e) => updateVariantRow(row.variantId, 'quantity', Number(e.target.value) || 0)}
                  />
                  <Input
                    label="Buy price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.unitCost || ''}
                    onChange={(e) => updateVariantRow(row.variantId, 'unitCost', Number(e.target.value) || 0)}
                  />
                  <div className="col-span-2">
                    <Input
                      label="Sell price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.sellingPrice || ''}
                      onChange={(e) => updateVariantRow(row.variantId, 'sellingPrice', Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity to add"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              />
              <Input
                label="Buy price"
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
              />
            </div>
            <Input
              label="Sell price"
              type="number"
              min={0}
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
              hint="Update if your cost went up and you need to adjust pricing"
            />
          </div>
        )}

        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-label">Purchase details (optional)</h3>
          <Input
            label="Purchase date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
          <Input
            label="Receipt number"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
          />
          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <SupplierPicker
            suppliers={suppliers ?? []}
            selectedId={supplierId}
            query={supplierQuery}
            creating={createSupplier.isPending}
            onQuery={setSupplierQuery}
            onSelect={(id) => {
              setSupplierId(id);
              setSupplierQuery('');
            }}
            onClear={() => setSupplierId('')}
            onCreate={(name, address) => createSupplier.mutate({ name, address })}
          />
        </div>

        <div className="surface-card p-4 text-center">
          <p className="text-caption text-slate-500">Total restock cost</p>
          <p className="text-stat-lg text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(totalCost, currency)}
          </p>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={mutation.isPending}>
          <PackagePlus size={20} /> Restock Product
        </Button>
      </form>
    </div>
  );
}

function SupplierPicker({
  suppliers,
  selectedId,
  query,
  creating,
  onQuery,
  onSelect,
  onClear,
  onCreate,
}: {
  suppliers: Supplier[];
  selectedId: string;
  query: string;
  creating: boolean;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
  onCreate: (name: string, address?: string) => void;
}) {
  const [location, setLocation] = useState('');
  const selected = suppliers.find((supplier) => supplier.id === selectedId);
  const needle = query.trim().toLowerCase();
  const matches = suppliers.filter((supplier) => !needle || supplier.name.toLowerCase().includes(needle));
  const exact = suppliers.find((supplier) => supplier.name.trim().toLowerCase() === needle);

  if (selected) {
    return (
      <div className="space-y-1.5">
        <p className="text-label text-slate-600 dark:text-slate-400">Supplier</p>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-primary-700 dark:text-primary-200">{selected.name}</span>
            {selected.address && <span className="block truncate text-[11px] text-slate-500">{selected.address}</span>}
          </span>
          <button type="button" onClick={onClear} className="shrink-0 p-1 text-slate-400 hover:text-slate-600" aria-label="Remove supplier">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        label="Supplier"
        placeholder="Search or type a new supplier"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        hint="Pick one you already use, or add a name to save it for next time."
      />
      {suppliers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(needle ? matches : suppliers).slice(0, 8).map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              onClick={() => onSelect(supplier.id)}
              className="max-w-full truncate rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              {supplier.name}
            </button>
          ))}
        </div>
      )}
      {needle && !exact && (
        <div className="space-y-2 rounded-xl border border-dashed border-primary-300 p-2.5">
          <Input
            label="Location"
            placeholder="Market, street, or town"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <button
            type="button"
            disabled={creating}
            onClick={() => {
              onCreate(query.trim(), location.trim() || undefined);
              setLocation('');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Plus size={16} />
            {creating ? 'Saving…' : `Add “${query.trim()}”`}
          </button>
        </div>
      )}
      {needle && exact && (
        <button
          type="button"
          onClick={() => onSelect(exact.id)}
          className="text-sm font-semibold text-primary-600"
        >
          Use {exact.name}
        </button>
      )}
    </div>
  );
}
