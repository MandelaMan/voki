import { useQuery } from '@tanstack/react-query';
import { productApi } from '../../api';
import { useBusinessStore } from '../../stores';
import { SearchableSelect } from '../ui/SearchableSelect';

/** Searchable product picker without create (link existing products). */
export function ProductPickSelect({
  value,
  onChange,
  label = 'Product',
  placeholder = 'Choose a product',
  excludeIds = [],
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  excludeIds?: string[];
  error?: string;
}) {
  const { activeBusiness } = useBusinessStore();
  const excluded = new Set(excludeIds);

  const { data } = useQuery({
    queryKey: ['products', activeBusiness?.id, 'product-pick'],
    queryFn: () => productApi.list({ businessId: activeBusiness!.id, limit: 100 }),
    enabled: !!activeBusiness?.id,
  });

  const products = (data?.products || []).filter((product) => !excluded.has(product.id));

  return (
    <SearchableSelect
      label={label}
      placeholder={products.length ? placeholder : 'No other products available'}
      searchPlaceholder="Search products…"
      value={value}
      onChange={onChange}
      allowClear
      error={error}
      disabled={!products.length}
      options={products.map((product) => ({
        value: product.id,
        label: product.name,
        description: product.sku || undefined,
      }))}
      emptyMessage="No products"
    />
  );
}
