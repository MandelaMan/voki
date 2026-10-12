import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { ProductSearchBox } from '../components/products/ProductSearchBox';
import { formatCurrency, getApiErrorMessage, getFirstInStockVariant, isProductOutOfStock } from '../lib/utils';
import { productApi, saleApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { useBusinessStore } from '../stores';
import { offlineQueue } from '../lib/offline';
import { useOnlineStatus } from '../hooks/useOfflineSync';
import type { Product, ProductVariant } from '../types';

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  catalogPrice: number;
  sellingPrice: number;
}

function getItemStock(product: Product, variant?: ProductVariant) {
  return variant ? variant.remainingQuantity : product.remainingQuantity;
}

function getCartQuantity(cart: CartItem[], productId: string, variantId?: string) {
  return cart
    .filter((c) => c.product.id === productId && c.variant?.id === variantId)
    .reduce((sum, c) => sum + c.quantity, 0);
}

export default function NewSalePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { activeBusiness } = useBusinessStore();
  const isOnline = useOnlineStatus();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [stockError, setStockError] = useState('');

  const { data: preselectedProduct } = useQuery({
    queryKey: ['product', searchParams.get('productId'), activeBusiness?.id],
    queryFn: () => productApi.get(searchParams.get('productId')!, activeBusiness!.id),
    enabled: !!searchParams.get('productId') && !!activeBusiness?.id,
  });

  useEffect(() => {
    if (!preselectedProduct || cart.length > 0) return;
    if (isProductOutOfStock(preselectedProduct)) {
      setStockError(`${preselectedProduct.name} is out of stock and cannot be sold.`);
      return;
    }
    const variant = preselectedProduct.hasVariants && preselectedProduct.variants?.length
      ? getFirstInStockVariant(preselectedProduct.variants)
      : undefined;
    if (preselectedProduct.hasVariants && !variant) {
      setStockError(`${preselectedProduct.name} is out of stock and cannot be sold.`);
      return;
    }
    addToCart(preselectedProduct, variant);
  }, [preselectedProduct]);

  const addToCart = (product: Product, variant?: ProductVariant) => {
    setStockError('');

    if (product.hasVariants && product.variants?.length) {
      const selectedVariant = variant ?? getFirstInStockVariant(product.variants);
      if (!selectedVariant || selectedVariant.remainingQuantity <= 0) {
        setStockError(`${product.name} is out of stock.`);
        return;
      }
      variant = selectedVariant;
    } else if (product.remainingQuantity <= 0) {
      setStockError(`${product.name} is out of stock.`);
      return;
    }

    const stock = getItemStock(product, variant);
    const inCart = getCartQuantity(cart, product.id, variant?.id);
    if (inCart >= stock) {
      setStockError(`Only ${stock} unit${stock === 1 ? '' : 's'} available for ${product.name}${variant ? ` (${variant.variantValue})` : ''}.`);
      return;
    }

    const catalogPrice = Number(variant?.sellingPrice || product.sellingPrice);
    const existing = cart.find(
      (c) => c.product.id === product.id && c.variant?.id === variant?.id
    );

    if (existing) {
      setCart(cart.map((c) =>
        c === existing ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        product,
        variant,
        quantity: 1,
        catalogPrice,
        sellingPrice: catalogPrice,
      }]);
    }
    setSearch('');
  };

  const updateQuantity = (index: number, delta: number) => {
    setStockError('');
    const item = cart[index];
    if (!item) return;

    const stock = getItemStock(item.product, item.variant);
    const newQty = item.quantity + delta;

    if (delta > 0 && newQty > stock) {
      setStockError(`Only ${stock} unit${stock === 1 ? '' : 's'} available.`);
      return;
    }

    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }

    setCart(cart.map((c, i) => (i === index ? { ...c, quantity: newQty } : c)));
  };

  const updateSoldPrice = (index: number, value: number) => {
    setCart(cart.map((item, i) =>
      i === index ? { ...item, sellingPrice: Math.max(0, value) } : item
    ));
  };

  const listTotal = cart.reduce((sum, item) => sum + item.catalogPrice * item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const totalDiscount = listTotal - total;

  const mutation = useMutation({
    mutationFn: async () => {
      const saleData = {
        businessId: activeBusiness!.id,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.product.id,
          ...(item.variant?.id ? { variantId: item.variant.id } : {}),
          quantity: item.quantity,
          sellingPrice: Math.round(item.sellingPrice * 100) / 100,
        })),
      };

      if (!isOnline) {
        const offlineId = crypto.randomUUID();
        offlineQueue.add({
          ...saleData,
          offlineId,
          saleDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        return { offline: true };
      }

      return saleApi.create(saleData);
    },
    onSuccess: async (result) => {
      await refreshCommerce(queryClient);
      const offline = result && typeof result === 'object' && 'offline' in result;
      const productIds = [...new Set(cart.map((item) => item.product.id))];
      navigate(!offline && productIds.length === 1 ? `/inventory/${productIds[0]}` : '/sales');
    },
    onError: (error) => {
      setStockError(getApiErrorMessage(error, 'Could not complete sale.'));
    },
  });

  const currency = activeBusiness?.currency || 'USD';

  return (
    <div className="page-stack">
      <PageHeader title="Record Sale" subtitle="Search and add products to cart" />

      {stockError && (
        <Alert variant="error">{stockError}</Alert>
      )}

      <ProductSearchBox
        businessId={activeBusiness?.id}
        value={search}
        onChange={setSearch}
        currency={currency}
        placeholder="Search product to sell..."
        disableOutOfStock
        onSelect={(product) => {
          const variant = product.hasVariants && product.variants?.length
            ? getFirstInStockVariant(product.variants)
            : undefined;
          addToCart(product, variant);
        }}
      />

      {cart.length > 0 && (
        <Card>
          <h3 className="text-heading mb-3">Cart ({cart.length})</h3>
          <div className="space-y-4">
            {cart.map((item, index) => {
              const lineDiscount = (item.catalogPrice - item.sellingPrice) * item.quantity;
              const hasDiscount = item.sellingPrice < item.catalogPrice;
              const stock = getItemStock(item.product, item.variant);

              return (
                <div key={index} className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-medium truncate">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-caption text-slate-500">{item.variant.variantType}: {item.variant.variantValue}</p>
                      )}
                      <p className="text-caption text-slate-400 mt-0.5">
                        List: {formatCurrency(item.catalogPrice, currency)}
                        <span className="ml-1.5">· {stock} available</span>
                        {hasDiscount && (
                          <span className="text-emerald-600 font-medium ml-1.5">
                            −{formatCurrency(lineDiscount, currency)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => updateQuantity(index, -1)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-body-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, 1)}
                        disabled={item.quantity >= stock}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <Input
                    label="Sold at (per unit)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.sellingPrice}
                    onChange={(e) => updateSoldPrice(index, parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-caption text-slate-500 text-right">
                    Line total: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.sellingPrice * item.quantity, currency)}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Select
              label="Payment Method"
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'CARD', label: 'Card' },
                { value: 'MPESA', label: 'M-Pesa' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'OTHER', label: 'Other' },
              ]}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
          </div>

          <div className="mt-4 space-y-1.5">
            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-caption text-slate-500">
                <span>List price</span>
                <span className="line-through">{formatCurrency(listTotal, currency)}</span>
              </div>
            )}
            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-caption text-emerald-600 font-medium">
                <span>Discount</span>
                <span>−{formatCurrency(totalDiscount, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-medium font-semibold shrink-0">Total received</span>
              <span className="text-stat-lg text-primary-600 truncate">{formatCurrency(total, currency)}</span>
            </div>
          </div>

          <Button
            className="w-full mt-4"
            size="lg"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={cart.length === 0}
          >
            {!isOnline ? 'Save Offline' : 'Complete Sale'}
          </Button>
        </Card>
      )}

      {cart.length === 0 && (
        <p className="text-center text-caption text-slate-500 py-8">Search and add products to record a sale</p>
      )}
    </div>
  );
}
