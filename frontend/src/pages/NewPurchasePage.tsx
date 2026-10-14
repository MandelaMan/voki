import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, X, Package } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Form } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { PageHeader, FormSection } from '../components/ui/PageHeader';
import { ProductSearchBox } from '../components/products/ProductSearchBox';
import { purchaseApi, supplierApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { useBusinessStore } from '../stores';
import { formatCurrency, getApiErrorMessage } from '../lib/utils';
import type { Product } from '../types';

interface PurchaseLine {
  name: string;
  quantity: number;
  unitCost: number;
  productId?: string;
}

interface FormData {
  supplierId: string;
  purchaseDate: string;
  receiptNumber: string;
  notes: string;
  items: PurchaseLine[];
}

function StepBadge({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-micro flex items-center justify-center shrink-0">
        {step}
      </span>
      <span className="text-label text-slate-700 dark:text-slate-300">{label}</span>
    </div>
  );
}

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusiness } = useBusinessStore();
  const [saveError, setSaveError] = useState('');
  const [search, setSearch] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  const currency = activeBusiness?.currency || 'USD';

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', activeBusiness?.id],
    queryFn: () => supplierApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const { register, handleSubmit, control, watch } = useForm<FormData>({
    defaultValues: {
      purchaseDate: new Date().toISOString().split('T')[0],
      supplierId: '',
      receiptNumber: '',
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const totalCost = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0
  );
  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const addProductLine = (product: Product) => {
    if (product.hasVariants) {
      setSearch('');
      setSaveError(`${product.name} has sizes or colors. Open the product and use Restock so the right one gets the units.`);
      return;
    }
    const existingIndex = items.findIndex((item) => item.productId === product.id);
    if (existingIndex >= 0) {
      const current = items[existingIndex];
      update(existingIndex, {
        ...current,
        quantity: (Number(current.quantity) || 0) + 1,
      });
    } else {
      append({
        name: product.name,
        quantity: 1,
        unitCost: Math.round(Number(product.buyingPrice) || 0),
        productId: product.id,
      });
    }
    setSearch('');
    setSaveError('');
  };

  const addCustomLine = () => {
    append({ name: '', quantity: 1, unitCost: 0 });
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      purchaseApi.create({
        businessId: activeBusiness!.id,
        supplierId: data.supplierId || undefined,
        purchaseDate: data.purchaseDate,
        receiptNumber: data.receiptNumber || undefined,
        notes: data.notes || undefined,
        items: data.items.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          unitCost: Math.round(Number(item.unitCost) || 0),
          ...(item.productId ? { productId: item.productId } : {}),
        })),
      }),
    onSuccess: async () => {
      await refreshCommerce(queryClient);
      navigate('/purchases');
    },
    onError: (error) => {
      setSaveError(getApiErrorMessage(error, 'Could not save the purchase. Please try again.'));
    },
  });

  const onSubmit = (data: FormData) => {
    setSaveError('');
    if (!data.items.length) {
      setSaveError('Add at least one item to this purchase.');
      return;
    }
    if (data.items.some((item) => !item.name.trim())) {
      setSaveError('Every item needs a name.');
      return;
    }
    if (data.items.some((item) => !item.quantity || item.quantity < 1)) {
      setSaveError('Each item needs a quantity of at least 1.');
      return;
    }
    mutation.mutate(data);
  };

  if (!activeBusiness) {
    return (
      <div className="page-stack">
        <PageHeader title="Record Purchase" />
        <Alert variant="warning">Set up a business first.</Alert>
      </div>
    );
  }

  return (
    <div className="page-stack pb-4">
      <button
        type="button"
        onClick={() => navigate('/purchases')}
        className="flex items-center gap-1 text-caption text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Back to purchases
      </button>

      <PageHeader title="Record Purchase" subtitle="Add units to products you already created" />

      <Form busy={mutation.isPending} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {saveError && <Alert variant="error">{saveError}</Alert>}

        <FormSection>
          <StepBadge step={1} label="Purchase details" />
          <Input label="Purchase date" type="date" {...register('purchaseDate', { required: true })} />

          {suppliers && suppliers.length > 0 ? (
            <Select
              label="Supplier (optional)"
              options={[{ value: '', label: 'No supplier selected' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]}
              {...register('supplierId')}
            />
          ) : (
            <p className="text-caption text-slate-500">
              No suppliers yet.{' '}
              <Link to="/suppliers" className="text-primary-600 font-semibold hover:underline">
                Add a supplier
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="text-caption text-primary-600 font-semibold"
          >
            {showOptional ? 'Hide receipt & notes' : '+ Receipt number & notes (optional)'}
          </button>

          {showOptional && (
            <div className="space-y-4 pt-1">
              <Input label="Receipt number" placeholder="e.g. INV-2045" {...register('receiptNumber')} />
              <Input label="Notes" placeholder="Any extra details..." {...register('notes')} />
            </div>
          )}
        </FormSection>

        <FormSection>
          <StepBadge step={2} label="What you bought" />

          <div className="space-y-2">
            <ProductSearchBox
              businessId={activeBusiness?.id}
              value={search}
              onChange={setSearch}
              currency={currency}
              price="buying"
              placeholder="Search products by name..."
              onSelect={addProductLine}
            />
          </div>

          <Button type="button" variant="soft" size="sm" className="w-full" onClick={addCustomLine}>
            <Plus size={16} /> Add a cost-only line
          </Button>

          {!fields.length ? (
            <div className="text-center py-8 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <Package size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-body-medium text-slate-600 dark:text-slate-400">No items yet</p>
              <p className="text-caption text-slate-500 mt-1">Search a product above to add units.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => {
                const line = items[index];
                const lineTotal = (Number(line?.quantity) || 0) * (Number(line?.unitCost) || 0);
                return (
                  <Card key={field.id} className="!p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-micro text-slate-400 font-semibold">#{index + 1}</span>
                        {line?.productId ? (
                          <span className="text-micro px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-300">
                            Adds stock
                          </span>
                        ) : (
                          <span className="text-micro px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Cost only
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                        aria-label="Remove item"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <Input
                      label="Item name"
                      placeholder="What did you buy?"
                      {...register(`items.${index}.name`, { required: true })}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label={line?.productId ? 'Units to add' : 'Quantity'}
                        type="number"
                        min={1}
                        step={1}
                        {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                      />
                      <Input
                        label="Cost per unit"
                        type="number"
                        min={0}
                        step={1}
                        {...register(`items.${index}.unitCost`, { valueAsNumber: true, min: 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between text-caption pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Line total</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(lineTotal, currency)}
                      </span>
                    </div>

                    {line?.productId && (
                      <input type="hidden" {...register(`items.${index}.productId`)} />
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </FormSection>

        <Card className="!p-4 space-y-3">
          <StepBadge step={3} label="Review & save" />
          <div className="flex items-center justify-between text-caption">
            <span className="text-slate-500">{fields.length} line{fields.length === 1 ? '' : 's'} · {itemCount} unit{itemCount === 1 ? '' : 's'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body-medium font-semibold">Total cost</span>
            <span className="text-stat-lg text-primary-600">{formatCurrency(totalCost, currency)}</span>
          </div>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={mutation.isPending}
            disabled={!fields.length}
          >
            Save purchase
          </Button>
        </Card>
      </Form>
    </div>
  );
}
