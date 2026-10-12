import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { PageHeader } from '../components/ui/PageHeader';
import { supplierApi, productApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { getApiErrorMessage } from '../lib/utils';
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

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', activeBusiness?.id],
    queryFn: () => supplierApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const { data: catalog } = useQuery({
    queryKey: ['products', activeBusiness?.id, 'supplier-attach'],
    queryFn: () => productApi.list({ businessId: activeBusiness!.id, limit: 100 }),
    enabled: !!activeBusiness?.id && !!attachFor,
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
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    });
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Suppliers"
        subtitle="Vendors linked to the products they supply"
        action={<Button size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(!showForm); }}><Plus size={18} /> Add</Button>}
      />

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {(showForm || editingId) && (
        <Card className="space-y-3 !p-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Location" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="flex gap-2">
            <Button
              onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!form.name.trim()}
              className="flex-1"
            >
              {editingId ? 'Save changes' : 'Save supplier'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>
            )}
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {suppliers?.map((supplier) => {
          const products = supplier.products ?? [];
          const choices = (catalog?.products ?? []).filter((product) => product.supplier?.id !== supplier.id);
          return (
            <Card
              key={supplier.id}
              id={supplier.id}
              className={`!p-3 space-y-2 ${hash === `#${supplier.id}` ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{supplier.name}</p>
                  <p className="text-xs text-slate-500">{[supplier.address, supplier.phone || supplier.email].filter(Boolean).join(' · ') || 'No contact'}</p>
                </div>
                <div className="flex shrink-0">
                  <button type="button" onClick={() => startEdit(supplier)} className="p-2 text-slate-500" aria-label={`Edit ${supplier.name}`}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(supplier.id)} className="p-2 text-red-500" aria-label={`Delete ${supplier.name}`}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Link to={`/inventory?supplierId=${supplier.id}`} className="text-xs font-semibold text-primary-600">
                  {products.length} {products.length === 1 ? 'product' : 'products'}
                </Link>
                <button type="button" onClick={() => { setAttachFor(attachFor === supplier.id ? null : supplier.id); setProductId(''); }} className="text-xs font-semibold text-slate-500">
                  Attach product
                </button>
              </div>

              {products.length > 0 && (
                <div className="space-y-1">
                  {products.map((product) => (
                    <Link key={product.id} to={`/inventory/${product.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1.5 text-xs">
                      <span className="truncate font-medium">{product.name}</span>
                      <span className="shrink-0 text-slate-400">{product.remainingQuantity} left</span>
                    </Link>
                  ))}
                </div>
              )}

              {attachFor === supplier.id && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 min-w-0">
                    <Select
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      options={[
                        { value: '', label: choices.length ? 'Choose a product' : 'No other products' },
                        ...choices.map((product) => ({ value: product.id, label: product.name })),
                      ]}
                    />
                  </div>
                  <Button size="sm" disabled={!productId} loading={attachMutation.isPending} onClick={() => attachMutation.mutate()}>
                    Attach
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
