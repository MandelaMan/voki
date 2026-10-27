import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Package, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { FormFields } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { ProductPickSelect } from '../components/forms/ProductPickSelect';
import { supplierApi, productApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { cn, getApiErrorMessage } from '../lib/utils';
import { useBusinessStore } from '../stores';
import type { Supplier } from '../types';

const emptyForm = { name: '', phone: '', email: '', address: '' };

export default function SuppliersPage() {
  const { hash } = useLocation();
  const { activeBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', activeBusiness?.id],
    queryFn: () => supplierApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const refresh = () => {
    refreshCommerce(queryClient);
  };

  const createMutation = useMutation({
    mutationFn: () => supplierApi.create({ businessId: activeBusiness!.id, ...form }),
    onSuccess: () => {
      setActionError('');
      refresh();
      setForm(emptyForm);
      setShowForm(false);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not save that supplier.')),
  });

  const updateMutation = useMutation({
    mutationFn: () => supplierApi.update(editingId!, { businessId: activeBusiness!.id, ...form }),
    onSuccess: () => {
      setActionError('');
      refresh();
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not update that supplier.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supplierApi.delete(id, activeBusiness!.id),
    onSuccess: () => {
      setActionError('');
      refresh();
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not delete that supplier.')),
  });

  const attachMutation = useMutation({
    mutationFn: () => productApi.update(productId, { businessId: activeBusiness!.id, supplierId: attachFor }),
    onSuccess: () => {
      setActionError('');
      refresh();
      setProductId('');
      setAttachFor(null);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not link that product.')),
  });

  useEffect(() => {
    if (!hash || !suppliers?.length) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' });
  }, [hash, suppliers]);

  const startEdit = (supplier: Supplier) => {
    setShowForm(false);
    setAttachFor(null);
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const formOpen = showForm || !!editingId;

  return (
    <div className="page-stack pb-4">
      <PageHeader
        title="Suppliers"
        subtitle="Who you buy from and which products they supply"
        action={(
          <Button
            size="sm"
            variant={formOpen && !editingId ? 'secondary' : 'primary'}
            onClick={() => {
              if (showForm && !editingId) {
                cancelForm();
                return;
              }
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
            }}
          >
            <Plus size={16} /> Add
          </Button>
        )}
      />

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {formOpen && (
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-micro font-semibold uppercase tracking-wide text-slate-400">
              {editingId ? 'Edit supplier' : 'New supplier'}
            </p>
            <h3 className="text-heading mt-0.5">
              {editingId ? 'Update contact details' : 'Add someone you buy from'}
            </h3>
          </div>
          <FormFields busy={createMutation.isPending || updateMutation.isPending} className="space-y-3 p-4">
            <Input
              label="Name"
              placeholder="Supplier or shop name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Phone"
                placeholder="07XX XXX XXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Email"
                placeholder="Optional"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <Input
              label="Location"
              placeholder="Town, market, or address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={!form.name.trim()}
                className="flex-1"
              >
                {editingId ? 'Save changes' : 'Save supplier'}
              </Button>
              <Button variant="secondary" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </FormFields>
        </Card>
      )}

      {!isLoading && !suppliers?.length && !formOpen && (
        <EmptyState
          title="No suppliers yet"
          description="Add the people or shops you restock from, then link products to them."
          action={(
            <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}>
              <Plus size={16} /> Add supplier
            </Button>
          )}
        />
      )}

      <div className="space-y-3">
        {suppliers?.map((supplier) => {
          const products = supplier.products ?? [];
          const meta = [supplier.address, supplier.phone, supplier.email].filter(Boolean);
          const attaching = attachFor === supplier.id;
          const highlighted = hash === `#${supplier.id}`;

          return (
            <Card
              key={supplier.id}
              id={supplier.id}
              className={cn(
                '!p-0 overflow-hidden transition-shadow',
                highlighted && 'ring-2 ring-primary-500'
              )}
            >
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <span className="text-body-medium font-bold">
                    {supplier.name.slice(0, 1).toUpperCase()}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-body-medium font-semibold text-slate-900 dark:text-white truncate">
                        {supplier.name}
                      </p>
                      <p className="mt-0.5 text-caption text-slate-500 truncate">
                        {meta.length ? meta.join(' · ') : 'No contact details yet'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => startEdit(supplier)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        aria-label={`Edit ${supplier.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove ${supplier.name}? Products stay in stock.`)) {
                            deleteMutation.mutate(supplier.id);
                          }
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        aria-label={`Delete ${supplier.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/inventory?supplierId=${supplier.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-micro font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Package size={12} />
                      {products.length} {products.length === 1 ? 'product' : 'products'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setAttachFor(attaching ? null : supplier.id);
                        setProductId('');
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-micro font-semibold transition-colors',
                        attaching
                          ? 'bg-primary-600 text-white'
                          : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/25 dark:text-primary-300'
                      )}
                    >
                      <Link2 size={12} />
                      {attaching ? 'Cancel link' : 'Link product'}
                    </button>
                  </div>
                </div>
              </div>

              {products.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1.5">
                    <Truck size={12} className="text-slate-400" />
                    <p className="text-micro font-semibold uppercase tracking-wide text-slate-400">
                      Products from this supplier
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {products.map((product) => (
                      <Link
                        key={product.id}
                        to={`/inventory/${product.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-caption hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">
                          {product.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {product.remainingQuantity} left
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {attaching && (
                <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="mb-2 text-caption font-medium text-slate-600 dark:text-slate-300">
                    Link an existing product to {supplier.name}
                  </p>
                  <FormFields busy={attachMutation.isPending} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <ProductPickSelect
                        value={productId}
                        onChange={setProductId}
                        excludeIds={products.map((product) => product.id)}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={!productId}
                      loading={attachMutation.isPending}
                      onClick={() => attachMutation.mutate()}
                      className="w-full sm:w-auto"
                    >
                      Link
                    </Button>
                  </FormFields>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
