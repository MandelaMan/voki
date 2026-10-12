import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus, X, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { PageHeader, FormSection, StatusBar } from '../components/ui/PageHeader';
import {
  ImageUploadPreview,
  createPreviews,
  revokePreviews,
  type ImagePreview,
} from '../components/ui/ImageUploadPreview';
import { productApi, categoryApi, supplierApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { useBusinessStore } from '../stores';
import { getApiErrorMessage } from '../lib/utils';

const variantSchema = z.object({
  variantType: z.string().min(1, 'Type is required'),
  variantValue: z.string().min(1, 'Value is required'),
  buyingPrice: z.coerce.number().min(0, 'Must be 0 or more'),
  sellingPrice: z.coerce.number().min(0, 'Must be 0 or more'),
  quantity: z.coerce.number().int().min(0, 'Must be 0 or more'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  brand: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  buyingPrice: z.coerce.number().min(0, 'Buying price is required'),
  sellingPrice: z.coerce.number().min(0, 'Selling price is required'),
  quantity: z.coerce.number().int().min(0, 'Quantity is required'),
});

interface VariantRow {
  variantType: string;
  variantValue: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
}

interface FormData {
  name: string;
  brand?: string;
  description?: string;
  categoryId?: string;
  supplierId?: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  variants?: VariantRow[];
}

export default function NewProductPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusiness } = useBusinessStore();
  const [hasVariants, setHasVariants] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', activeBusiness?.id],
    queryFn: () => supplierApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', activeBusiness?.id],
    queryFn: () => categoryApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      name: '', brand: '', description: '', categoryId: '', supplierId: '', buyingPrice: 0, sellingPrice: 0, quantity: 0,
      variants: [{ variantType: 'Size', variantValue: '', buyingPrice: 0, sellingPrice: 0, quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  const previewsRef = useRef(imagePreviews);
  previewsRef.current = imagePreviews;

  useEffect(() => () => revokePreviews(previewsRef.current), []);

  const handleAddImages = (files: File[]) => {
    const previews = createPreviews(files);
    setImages((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        businessId: activeBusiness!.id,
        name: data.name,
        brand: data.brand || undefined,
        description: data.description || undefined,
        categoryId: data.categoryId?.trim() ? data.categoryId : undefined,
        supplierId: data.supplierId?.trim() ? data.supplierId : undefined,
        buyingPrice: Number(data.buyingPrice),
        sellingPrice: Number(data.sellingPrice),
        quantity: 0,
        variants: hasVariants ? data.variants?.map((v) => ({
          ...v,
          buyingPrice: Number(v.buyingPrice),
          sellingPrice: Number(v.sellingPrice),
          quantity: 0,
        })) : undefined,
      };
      const product = await productApi.create(payload);
      if (images.length > 0) {
        await productApi.uploadImages(product.id, activeBusiness!.id, images);
      }
      return product;
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setSaveError('');
      refreshCommerce(queryClient);
      setTimeout(() => navigate('/inventory'), 1500);
    },
    onError: (error) => {
      setSaveError(getApiErrorMessage(error, 'Failed to save product. Please try again.'));
    },
  });

  if (!activeBusiness) {
    return (
      <div className="space-y-4">
        <PageHeader title="Add Product" subtitle="Create the item you sell. Stock starts at zero." />
        <Alert variant="warning">
          You need to set up a business before adding products.{' '}
          <Link to="/onboarding" className="font-semibold underline">Set up your business</Link>
        </Alert>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader title="Add Product" subtitle="Name, prices, and photos. This does not add stock." />

      <Alert variant="info">
        Stock stays at zero until you{' '}
        <Link to="/purchases/new" className="font-semibold underline">record a purchase</Link>.
      </Alert>

      <form
        onSubmit={handleSubmit((d) => {
          setSaveError('');
          if (hasVariants) {
            const variantResult = z.array(variantSchema).min(1, 'Add at least one variant').safeParse(d.variants);
            if (!variantResult.success) {
              setSaveError(variantResult.error.issues[0]?.message || 'Please fill in all variant fields');
              return;
            }
          }
          mutation.mutate(d);
        })}
        className="space-y-5"
      >
        {saveSuccess && (
          <StatusBar variant="success">
            <CheckCircle2 size={18} className="shrink-0" />
            Product saved successfully! Redirecting to inventory…
          </StatusBar>
        )}
        {saveError && <Alert variant="error">{saveError}</Alert>}

        <FormSection title="Basic Info">
          <Input label="Product Name" placeholder="e.g. Running Shoes" error={errors.name?.message} {...register('name')} />
          <Input label="Brand" placeholder="Optional" {...register('brand')} />
          <Input label="Description" placeholder="Optional details" {...register('description')} />
          {categories && categories.length > 0 && (
            <Select
              label="Category"
              options={[{ value: '', label: 'Select category' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              {...register('categoryId')}
            />
          )}
          <Select
            label="Supplier"
            options={[{ value: '', label: suppliers?.length ? 'Select supplier' : 'No suppliers yet' }, ...(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))]}
            {...register('supplierId')}
          />
        </FormSection>

        <FormSection title="Prices">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Buy price" type="number" step="0.01" min="0" error={errors.buyingPrice?.message} {...register('buyingPrice')} />
            <Input label="Sell price" type="number" step="0.01" min="0" error={errors.sellingPrice?.message} {...register('sellingPrice')} />
          </div>
          <p className="text-caption text-slate-500">These are the usual prices. Quantity is added when you buy stock.</p>
        </FormSection>

        <FormSection title="Photos">
          <ImageUploadPreview
            previews={imagePreviews}
            onAdd={handleAddImages}
            onRemove={handleRemoveImage}
          />
        </FormSection>

        <div className="surface-card p-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="hasVariants"
            checked={hasVariants}
            onChange={(e) => setHasVariants(e.target.checked)}
            className="w-5 h-5 rounded-lg accent-primary-600 cursor-pointer"
          />
          <label htmlFor="hasVariants" className="text-body-medium cursor-pointer flex-1">
            This product has variants (size, color, etc.)
          </label>
        </div>

        {hasVariants && (
          <FormSection title="Variants">
            <div className="flex justify-end -mt-2 mb-1">
              <Button type="button" size="sm" variant="secondary" onClick={() => append({ variantType: 'Size', variantValue: '', buyingPrice: 0, sellingPrice: 0, quantity: 0 })}>
                <Plus size={16} /> Add Variant
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="surface-input p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <Input placeholder="Type (Size)" {...register(`variants.${index}.variantType`)} />
                  <Input placeholder="Value (M)" {...register(`variants.${index}.variantValue`)} />
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="p-2.5 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 self-start justify-self-end"><X size={18} /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Buy" type="number" step="0.01" min="0" {...register(`variants.${index}.buyingPrice`)} />
                  <Input placeholder="Sell" type="number" step="0.01" min="0" {...register(`variants.${index}.sellingPrice`)} />
                </div>
              </div>
            ))}
          </FormSection>
        )}

        <Button type="submit" className="page-action w-full" size="lg" loading={isSubmitting || mutation.isPending} disabled={saveSuccess}>
          {saveSuccess ? 'Saved!' : 'Save product'}
        </Button>
      </form>
    </div>
  );
}
