import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminField, AdminFilterBar, AdminSearch, AdminSelect, AdminStatus, AdminTable } from '../components/admin/AdminTable';
import { adminApi } from '../api';
import { Alert } from '../components/ui/Alert';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { formatCurrency, formatRelative } from '../lib/utils';
import { useAuthStore } from '../stores';

function useSearch() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  return { search, setSearch, debounced };
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  const isAdmin = useAuthStore((state) => state.user?.role === 'SUPER_ADMIN');
  if (!isAdmin) {
    return (
      <div className="page-stack">
        <PageHeader title={title} />
        <Alert variant="error">This account is not a super admin.</Alert>
      </div>
    );
  }
  return children;
}

function OwnerLink({ name, detail, to }: { name: string; detail: string; to: string }) {
  return (
    <Link to={to} className="font-semibold text-primary-600">
      {name}
      <span className="block font-normal text-slate-500">{detail}</span>
    </Link>
  );
}

const stockOptions = [
  { value: '', label: 'Needs attention' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'ALL', label: 'All products' },
];

function stockStatus(status: string) {
  if (status === 'OUT_OF_STOCK') return <AdminStatus tone="bad">Out of stock</AdminStatus>;
  if (status === 'LOW_STOCK') return <AdminStatus tone="warn">Low stock</AdminStatus>;
  return <AdminStatus tone="good">In stock</AdminStatus>;
}

function paymentStatus(status: string) {
  if (status === 'FAILED' || status === 'CANCELLED') return <AdminStatus tone="bad">{status === 'FAILED' ? 'Failed' : 'Cancelled'}</AdminStatus>;
  if (status === 'PENDING') return <AdminStatus tone="warn">Pending</AdminStatus>;
  if (status === 'PAID' || status === 'SUCCESS') return <AdminStatus tone="good">{status === 'PAID' ? 'Paid' : 'Success'}</AdminStatus>;
  return <AdminStatus tone="muted">{status}</AdminStatus>;
}

export function AdminShopsPage() {
  const { search, setSearch, debounced } = useSearch();
  const shops = useQuery({
    queryKey: ['admin-shops', debounced],
    queryFn: () => adminApi.businesses(debounced),
  });
  return (
    <Gate title="Shops">
      <div className="page-stack">
        <PageHeader title="Shops" subtitle="Businesses opened by subscribers" />
        {shops.isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {shops.data && (
          <AdminTable
            toolbar={(
              <AdminFilterBar>
                <AdminField label="Search">
                  <AdminSearch placeholder="Shop or owner" value={search} onChange={(event) => setSearch(event.target.value)} />
                </AdminField>
              </AdminFilterBar>
            )}
            rows={shops.data}
            rowKey={(shop) => shop.id}
            empty="No shops match that search."
            columns={[
              { header: 'Shop', cell: (shop) => shop.name },
              { header: 'Owner', cell: (shop) => <OwnerLink name={shop.owner.name} detail={shop.owner.phone || shop.owner.email} to={`/admin/subscribers/${shop.owner.id}`} /> },
              { header: 'Products', align: 'end', cell: (shop) => shop.products },
              { header: 'Sales', align: 'end', cell: (shop) => shop.sales },
              { header: 'Currency', cell: (shop) => shop.currency },
            ]}
          />
        )}
      </div>
    </Gate>
  );
}

export function AdminStockPage() {
  const { search, setSearch, debounced } = useSearch();
  const [status, setStatus] = useState('');
  const stock = useQuery({
    queryKey: ['admin-stock', debounced, status],
    queryFn: () => adminApi.inventory(debounced, status),
  });
  return (
    <Gate title="Stock">
      <div className="page-stack">
        <PageHeader title="Stock" subtitle="What subscribers have on hand" />
        {stock.isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {stock.data && (
          <AdminTable
            toolbar={(
              <AdminFilterBar>
                <AdminField label="Status" className="max-w-[14rem]">
                  <AdminSelect options={stockOptions} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Stock status" />
                </AdminField>
                <AdminField label="Search">
                  <AdminSearch placeholder="Product, SKU, or shop" value={search} onChange={(event) => setSearch(event.target.value)} />
                </AdminField>
              </AdminFilterBar>
            )}
            rows={stock.data}
            rowKey={(item) => item.id}
            empty="No products match."
            columns={[
              { header: 'Product', cell: (item) => item.name },
              { header: 'SKU', cell: (item) => item.sku },
              { header: 'Shop', cell: (item) => item.businessName },
              { header: 'Left', align: 'end', cell: (item) => item.remainingQuantity },
              { header: 'Status', cell: (item) => stockStatus(item.status) },
              { header: 'Price', align: 'end', value: (item) => item.sellingPrice, cell: (item) => formatCurrency(item.sellingPrice, item.currency) },
              { header: 'Owner', cell: (item) => <OwnerLink name={item.ownerName} detail={item.ownerPhone || item.ownerEmail} to={`/admin/subscribers/${item.ownerId}`} /> },
            ]}
          />
        )}
      </div>
    </Gate>
  );
}

export function AdminSalesPage() {
  const { search, setSearch, debounced } = useSearch();
  const sales = useQuery({
    queryKey: ['admin-sales', debounced],
    queryFn: () => adminApi.sales(debounced),
  });
  return (
    <Gate title="Sales">
      <div className="page-stack">
        <PageHeader title="Sales" subtitle="Sales recorded by subscribers" />
        {sales.isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {sales.data && (
          <AdminTable
            toolbar={(
              <AdminFilterBar>
                <AdminField label="Search">
                  <AdminSearch placeholder="Shop, email, or receipt" value={search} onChange={(event) => setSearch(event.target.value)} />
                </AdminField>
              </AdminFilterBar>
            )}
            rows={sales.data}
            rowKey={(sale) => sale.id}
            empty="No sales match."
            columns={[
              { header: 'When', value: (sale) => new Date(sale.saleDate).getTime(), cell: (sale) => formatRelative(sale.saleDate) },
              { header: 'Shop', cell: (sale) => sale.businessName },
              {
                header: 'Items',
                wrap: true,
                cell: (sale) => sale.items.map((item) => `${item.quantity} ${item.name}`).join(', ') || 'Sale',
              },
              { header: 'Method', cell: (sale) => sale.paymentMethod },
              { header: 'Status', cell: (sale) => paymentStatus(sale.paymentStatus) },
              { header: 'Amount', align: 'end', value: (sale) => sale.totalAmount, cell: (sale) => formatCurrency(sale.totalAmount, sale.currency) },
              { header: 'Owner', cell: (sale) => <OwnerLink name={sale.ownerName} detail={sale.ownerEmail} to={`/admin/subscribers/${sale.ownerId}`} /> },
            ]}
          />
        )}
      </div>
    </Gate>
  );
}

export function AdminPurchasesPage() {
  const { search, setSearch, debounced } = useSearch();
  const purchases = useQuery({
    queryKey: ['admin-purchases', debounced],
    queryFn: () => adminApi.purchases(debounced),
  });
  return (
    <Gate title="Purchases">
      <div className="page-stack">
        <PageHeader title="Purchases" subtitle="Stock subscribers have bought in" />
        {purchases.isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {purchases.data && (
          <AdminTable
            toolbar={(
              <AdminFilterBar>
                <AdminField label="Search">
                  <AdminSearch placeholder="Shop, supplier, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
                </AdminField>
              </AdminFilterBar>
            )}
            rows={purchases.data}
            rowKey={(purchase) => purchase.id}
            empty="No purchases match."
            columns={[
              { header: 'When', value: (purchase) => new Date(purchase.purchaseDate).getTime(), cell: (purchase) => formatRelative(purchase.purchaseDate) },
              { header: 'Shop', cell: (purchase) => purchase.businessName },
              { header: 'Supplier', cell: (purchase) => purchase.supplierName },
              { header: 'Lines', align: 'end', cell: (purchase) => purchase.itemCount },
              { header: 'Cost', align: 'end', value: (purchase) => purchase.totalCost, cell: (purchase) => formatCurrency(purchase.totalCost, purchase.currency) },
              { header: 'Owner', cell: (purchase) => <OwnerLink name={purchase.ownerName} detail={purchase.ownerEmail} to={`/admin/subscribers/${purchase.ownerId}`} /> },
            ]}
          />
        )}
      </div>
    </Gate>
  );
}

export function AdminRecordsPage({
  kind,
  title,
  subtitle,
  placeholder,
}: {
  kind: 'categories' | 'suppliers' | 'customers';
  title: string;
  subtitle: string;
  placeholder: string;
}) {
  const { search, setSearch, debounced } = useSearch();
  const records = useQuery({
    queryKey: ['admin-records', kind, debounced],
    queryFn: () => adminApi.records(kind, debounced),
  });
  return (
    <Gate title={title}>
      <div className="page-stack">
        <PageHeader title={title} subtitle={subtitle} />
        {records.isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {records.data && (
          <AdminTable
            toolbar={(
              <AdminFilterBar>
                <AdminField label="Search">
                  <AdminSearch placeholder={placeholder} value={search} onChange={(event) => setSearch(event.target.value)} />
                </AdminField>
              </AdminFilterBar>
            )}
            rows={records.data}
            rowKey={(record) => record.id}
            empty="Nothing matches."
            columns={[
              { header: 'Name', cell: (record) => record.name },
              { header: 'Detail', cell: (record) => record.detail || '—' },
              { header: 'Shop', cell: (record) => record.businessName },
              { header: 'Owner', cell: (record) => <OwnerLink name={record.ownerName} detail={record.ownerEmail} to={`/admin/subscribers/${record.ownerId}`} /> },
            ]}
          />
        )}
      </div>
    </Gate>
  );
}
