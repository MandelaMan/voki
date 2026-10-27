import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Form } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { CategorySelect } from '../components/forms/CategorySelect';
import { SupplierSelect } from '../components/forms/SupplierSelect';
import { productApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { useBusinessStore } from '../stores';
import { getApiErrorMessage } from '../lib/utils';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusiness } = useBusinessStore();
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    name: '',
    brand: '',
    description: '',
    categoryId: '',
    supplierId: '',
    buyingPrice: '',
    sellingPrice: '',
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id, activeBusiness?.id],
    queryFn: () => productApi.get(id!, activeBusiness!.id),
    enabled: !!id && !!activeBusiness?.id,
  });
  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name,
      brand: product.brand || '',
      description: product.description || '',
      categoryId: product.category?.id || '',
      supplierId: product.supplier?.id || '',
      buyingPrice: String(Math.round(Number(product.buyingPrice) || 0)),
      sellingPrice: String(Math.round(Number(product.sellingPrice) || 0)),
    });
  }, [product]);

  const mutation = useMutation({
    mutationFn: () => productApi.update(id!, {
      businessId: activeBusiness!.id,
      name: form.name.trim(),
      brand: form.brand,
      description: form.description,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      buyingPrice: Math.round(Number(form.buyingPrice) || 0),
      sellingPrice: Math.round(Number(form.sellingPrice) || 0),
    }),
    onSuccess: async () => {
      await refreshCommerce(queryClient);
      navigate(`/inventory/${id}`);
    },
    onError: (error) => setSaveError(getApiErrorMessage(error, 'Could not save this product.')),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!product) return <p>Product not found</p>;

  return (
    <div className="page-stack">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Back
      </button>
      <PageHeader title="Edit product" subtitle={product.sku} />
      {saveError && <Alert variant="error">{saveError}</Alert>}
      <Form
        busy={mutation.isPending}
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.name.trim()) {
            setSaveError('Product name is required.');
            return;
          }
          setSaveError('');
          mutation.mutate();
        }}
      >
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <CategorySelect
          value={form.categoryId}
          onChange={(categoryId) => setForm({ ...form, categoryId })}
        />
        <SupplierSelect
          value={form.supplierId}
          onChange={(supplierId) => setForm({ ...form, supplierId })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Buy price" type="number" min={0} step={1} value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })} />
          <Input label="Sell price" type="number" min={0} step={1} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
        </div>
        <Button type="submit" className="w-full" loading={mutation.isPending}>Save changes</Button>
      </Form>
    </div>
  );
}
