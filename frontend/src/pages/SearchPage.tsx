import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { ProductSearchBox } from '../components/products/ProductSearchBox';
import { useBusinessStore } from '../stores';

export default function SearchPage() {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const [query, setQuery] = useState('');

  return (
    <div className="page-stack">
      <PageHeader title="Search" subtitle="Find products by name, SKU, or brand" />
      <ProductSearchBox
        businessId={activeBusiness?.id}
        value={query}
        onChange={setQuery}
        currency={activeBusiness?.currency}
        placeholder="Search by name, SKU, brand..."
        autoFocus
        onSelect={(product) => navigate(`/inventory/${product.id}`)}
      />
    </div>
  );
}
