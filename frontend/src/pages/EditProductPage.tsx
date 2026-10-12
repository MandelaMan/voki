import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { productApi, categoryApi, supplierApi } from '../api';
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
  const { data: categories } = useQuery({
    queryKey: ['categories', activeBusiness?.id],
    queryFn: () => categoryApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', activeBusiness?.id],
    queryFn: () => supplierApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name,
      brand: product.brand || '',
      description: product.description || '',
      categoryId: product.category?.id || '',
      supplierId: product.supplier?.id || '',
      buyingPrice: String(Number(product.buyingPrice)),
      sellingPrice: String(Number(product.sellingPrice)),
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
      buyingPrice: Number(form.buyingPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
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
      <form
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
        <Select
          label="Category"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          options={[{ value: '', label: 'No category' }, ...(categories ?? []).map((category) => ({ value: category.id, label: category.name }))]}
        />
        <Select
          label="Supplier"
          value={form.supplierId}
          onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
          options={[{ value: '', label: 'No supplier' }, ...(suppliers ?? []).map((supplier) => ({ value: supplier.id, label: supplier.name }))]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Buy price" type="number" min={0} step="0.01" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })} />
          <Input label="Sell price" type="number" min={0} step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
        </div>
        <p className="text-xs text-slate-500">
          Need a new supplier? <Link to="/suppliers" className="font-semibold text-primary-600">Add one</Link>
          {' · '}
          <Link to="/categories" className="font-semibold text-primary-600">Manage categories</Link>
        </p>
        <Button type="submit" className="w-full" loading={mutation.isPending}>Save changes</Button>
      </form>
    </div>
  );
}
