import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Form } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { SupplierSelect } from '../components/forms/SupplierSelect';
import { productApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { useBusinessStore } from '../stores';
import { formatCurrency, getApiErrorMessage } from '../lib/utils';
import type { ProductVariant } from '../types';

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
          unitCost: Math.round(Number(v.buyingPrice) || 0),
          sellingPrice: Math.round(Number(v.sellingPrice) || 0),
        }))
      );
    } else {
      setUnitCost(Math.round(Number(product.buyingPrice) || 0));
      setSellingPrice(Math.round(Number(product.sellingPrice) || 0));
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
      setSaveError(getApiErrorMessage(error, 'Could not restock this product. Please try again.'));
    },
  });

  if (!activeBusiness) {
    return (
      <div className="page-stack">
        <PageHeader title="Restock Product" />
        <Alert variant="warning">Set up a business first.</Alert>
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

      <Form busy={mutation.isPending} onSubmit={handleSubmit} className="space-y-4">
        {saveError && <Alert variant="error">{saveError}</Alert>}

        {product.hasVariants && product.variants && product.variants.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-label">Restock by variant</h3>
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
                    step={1}
                    value={row.unitCost || ''}
                    onChange={(e) => updateVariantRow(row.variantId, 'unitCost', Number(e.target.value) || 0)}
                  />
                  <div className="col-span-2">
                    <Input
                      label="Sell price"
                      type="number"
                      min={0}
                      step={1}
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
                step={1}
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
              />
            </div>
            <Input
              label="Sell price"
              type="number"
              min={0}
              step={1}
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
              hint="Change it if your cost went up."
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
          <SupplierSelect
            value={supplierId}
            onChange={setSupplierId}
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
      </Form>
    </div>
  );
}
