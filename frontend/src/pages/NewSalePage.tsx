import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { PageHeader, ListRow } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { FormFields } from '../components/ui/Form';
import { ProductSearchBox } from '../components/products/ProductSearchBox';
import { CustomerSelect } from '../components/forms/CustomerSelect';
import { formatCurrency, formatRelative, getApiErrorMessage, getFirstInStockVariant, getImageUrl, isProductOutOfStock } from '../lib/utils';
import { productApi, saleApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { takeScannedSaleDraft } from '../lib/scannedList';
import { useBusinessStore, usePremium } from '../stores';
import { offlineQueue } from '../lib/offline';
import { businessPaymentMethods, PAYMENT_METHOD_OPTIONS, type PaymentMethod } from '../lib/payments';
import { useOnlineStatus } from '../hooks/useOfflineSync';
import type { Product, ProductVariant } from '../types';

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  catalogPrice: number;
  sellingPrice: number;
}

function cartImage(product: Product) {
  const image = [...(product.images || [])].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (a.order ?? 0) - (b.order ?? 0)
  )[0];
  return getImageUrl(image?.path);
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
  const isPremium = usePremium();
  const isOnline = useOnlineStatus();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const paymentMethods = businessPaymentMethods(activeBusiness?.paymentMethods);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [promptMpesa, setPromptMpesa] = useState(true);
  const [stockError, setStockError] = useState('');
  const scannedLoaded = useRef(false);

  const { data: preselectedProduct } = useQuery({
    queryKey: ['product', searchParams.get('productId'), activeBusiness?.id],
    queryFn: () => productApi.get(searchParams.get('productId')!, activeBusiness!.id),
    enabled: !!searchParams.get('productId') && !!activeBusiness?.id,
  });

  const { data: recentSalesData, isLoading: recentSalesLoading } = useQuery({
    queryKey: ['sales', activeBusiness?.id, 'recent-for-sale'],
    queryFn: () => saleApi.list({ businessId: activeBusiness!.id, limit: 20 }),
    enabled: !!activeBusiness?.id && cart.length === 0,
  });

  const recentSoldItems = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{
      key: string;
      product: Product;
      variant?: ProductVariant;
      sellingPrice: number;
      saleDate: string;
    }> = [];

    for (const sale of recentSalesData?.sales || []) {
      for (const item of sale.items || []) {
        if (!item.product) continue;
        const key = `${item.productId}:${item.variantId || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          key,
          product: item.product,
          variant: item.variant,
          sellingPrice: Math.round(Number(item.sellingPrice) || 0),
          saleDate: sale.saleDate,
        });
        if (items.length >= 8) return items;
      }
    }

    return items;
  }, [recentSalesData]);

  useEffect(() => {
    if (!paymentMethods.includes(paymentMethod as PaymentMethod)) {
      setPaymentMethod(paymentMethods[0] || 'CASH');
    }
  }, [paymentMethod, paymentMethods]);

  const addToCart = (product: Product, variant?: ProductVariant, quantity = 1, soldAt?: number) => {
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

    const catalogPrice = Math.round(Number(variant?.sellingPrice || product.sellingPrice) || 0);
    const sellingPrice = soldAt == null ? catalogPrice : Math.max(0, Math.round(soldAt));
    const qty = Math.max(1, Math.round(quantity) || 1);
    const existing = cart.find(
      (c) => c.product.id === product.id && c.variant?.id === variant?.id
    );

    if (existing) {
      const nextQty = existing.quantity + qty;
      if (nextQty > stock) {
        setStockError(`Only ${stock} unit${stock === 1 ? '' : 's'} available for ${product.name}${variant ? ` (${variant.variantValue})` : ''}.`);
        return;
      }
      setCart(cart.map((c) =>
        c === existing ? { ...c, quantity: nextQty, sellingPrice } : c
      ));
    } else {
      if (qty > stock) {
        setStockError(`Only ${stock} unit${stock === 1 ? '' : 's'} available for ${product.name}${variant ? ` (${variant.variantValue})` : ''}.`);
        return;
      }
      setCart([...cart, {
        product,
        variant,
        quantity: qty,
        catalogPrice,
        sellingPrice,
      }]);
    }
    setSearch('');
  };

  useEffect(() => {
    if (!preselectedProduct || cart.length > 0 || scannedLoaded.current) return;
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

  useEffect(() => {
    if (!activeBusiness?.id || scannedLoaded.current || cart.length > 0) return;
    const draft = takeScannedSaleDraft();
    if (!draft?.length) return;
    scannedLoaded.current = true;

    (async () => {
      const next: CartItem[] = [];
      const issues: string[] = [];
      for (const item of draft) {
        try {
          const product = await productApi.get(item.productId, activeBusiness.id);
          const variant = item.variantId
            ? product.variants?.find((row) => row.id === item.variantId)
            : product.hasVariants && product.variants?.length
              ? getFirstInStockVariant(product.variants)
              : undefined;
          if (product.hasVariants && !variant) {
            issues.push(`${product.name} needs a size/color with stock.`);
            continue;
          }
          const stock = getItemStock(product, variant);
          const quantity = Math.min(Math.max(1, item.quantity || 1), Math.max(stock, 0));
          if (stock <= 0) {
            issues.push(`${product.name} is out of stock.`);
            continue;
          }
          const catalogPrice = Math.round(Number(variant?.sellingPrice || product.sellingPrice) || 0);
          next.push({
            product,
            variant,
            quantity,
            catalogPrice,
            sellingPrice: item.sellingPrice == null ? catalogPrice : Math.max(0, Math.round(item.sellingPrice)),
          });
        } catch {
          issues.push('One scanned product could not be loaded.');
        }
      }
      if (next.length) setCart(next);
      if (issues.length) setStockError(issues.join(' '));
    })();
  }, [activeBusiness?.id]);

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
      i === index ? { ...item, sellingPrice: Math.max(0, Math.round(value) || 0) } : item
    ));
  };

  const listTotal = cart.reduce((sum, item) => sum + item.catalogPrice * item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const totalDiscount = listTotal - total;

  const mutation = useMutation({
    mutationFn: async () => {
      const sendPrompt = isPremium && isOnline && paymentMethod === 'MPESA' && promptMpesa;
      const saleData = {
        businessId: activeBusiness!.id,
        paymentMethod,
        ...(isPremium ? {
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          promptMpesa: sendPrompt,
        } : {}),
        items: cart.map((item) => ({
          productId: item.product.id,
          ...(item.variant?.id ? { variantId: item.variant.id } : {}),
          quantity: item.quantity,
          sellingPrice: Math.round(item.sellingPrice),
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
      if (
        !offline
        && result
        && 'id' in result
        && (result.paymentStatus === 'PENDING' || result.mpesaPrompt || result.promptError)
      ) {
        navigate(`/sales/${result.id}`);
        return;
      }
      if (!offline && result && 'id' in result && isPremium) {
        navigate('/sales', { state: { printReceiptId: result.id } });
        return;
      }
      const productIds = [...new Set(cart.map((item) => item.product.id))];
      navigate(!offline && productIds.length === 1 ? `/inventory/${productIds[0]}` : '/sales');
    },
    onError: (error) => {
      setStockError(getApiErrorMessage(error, 'Could not complete the sale.'));
    },
  });

  const currency = activeBusiness?.currency || 'USD';

  return (
    <div className="page-stack">
      <PageHeader title="Record Sale" />

      {isPremium && (
        <div className="grid grid-cols-2 gap-2">
          <Button to="/lists/scan?kind=SALE" variant="soft" size="sm" className="w-full">
            <Camera size={16} /> Scan list
          </Button>
          <Button to="/customers" variant="soft" size="sm" className="w-full">
            Customers
          </Button>
        </div>
      )}

      {stockError && (
        <Alert variant="error">{stockError}</Alert>
      )}

      <FormFields busy={mutation.isPending}>
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
      </FormFields>

      {cart.length > 0 && (
        <FormFields busy={mutation.isPending}>
        <Card>
          <h3 className="text-heading mb-3">Cart ({cart.length})</h3>
          <div className="space-y-4">
            {cart.map((item, index) => {
              const lineDiscount = (item.catalogPrice - item.sellingPrice) * item.quantity;
              const hasDiscount = item.sellingPrice < item.catalogPrice;
              const stock = getItemStock(item.product, item.variant);
              const imageUrl = cartImage(item.product);

              return (
                <div key={index} className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">{item.product.name.slice(0, 1).toUpperCase()}</span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                      <p className="text-body-medium truncate">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-caption text-slate-500">{item.variant.variantType}: {item.variant.variantValue}</p>
                      )}
                      <p className="text-caption text-slate-400 mt-0.5">
                        List: {formatCurrency(item.catalogPrice, currency)}
                        <span className="ml-1.5">· {stock} available</span>
                        {hasDiscount && (
                          <span className="text-red-600 dark:text-red-400 font-medium ml-1.5">
                            −{formatCurrency(lineDiscount, currency)}
                          </span>
                        )}
                      </p>
                      </div>
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
                    step={1}
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

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <Select
              label="Payment Method"
              options={PAYMENT_METHOD_OPTIONS.filter((option) => paymentMethods.includes(option.value))}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            {isPremium && (
              <CustomerSelect
                value={{ name: customerName, phone: customerPhone }}
                onChange={(next) => {
                  setCustomerName(next.name);
                  setCustomerPhone(next.phone);
                }}
              />
            )}
            {isPremium && paymentMethod === 'MPESA' && isOnline && (
              <label className="flex items-start gap-2 text-caption cursor-pointer">
                <input
                  type="checkbox"
                  checked={promptMpesa}
                  onChange={(e) => setPromptMpesa(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-primary-600"
                />
                <span>Prompt the customer to pay with M-Pesa</span>
              </label>
            )}
            {!isPremium && paymentMethod === 'MPESA' && (
              <p className="text-caption text-slate-500">
                <Link to="/plan" className="font-medium text-primary-600">Premium</Link> sends the M-Pesa prompt.
              </p>
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-caption text-slate-500">
                <span>List price</span>
                <span className="line-through">{formatCurrency(listTotal, currency)}</span>
              </div>
            )}
            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-caption text-red-600 dark:text-red-400 font-medium">
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
            onClick={() => {
              if (isPremium && isOnline && paymentMethod === 'MPESA' && promptMpesa && !customerPhone.trim()) {
                setStockError('Enter the customer phone number to send the M-Pesa prompt.');
                return;
              }
              setStockError('');
              mutation.mutate();
            }}
            loading={mutation.isPending}
            disabled={cart.length === 0}
          >
            {!isOnline ? 'Save Offline' : 'Complete Sale'}
          </Button>
        </Card>
        </FormFields>
      )}

      {cart.length === 0 && (
        <div className="space-y-4">
          <p className="text-center text-caption text-slate-500 py-4">Cart is empty</p>

          {recentSalesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : recentSoldItems.length > 0 ? (
            <section>
              <h3 className="text-heading mb-3">Recent sold items</h3>
              <div className="space-y-2">
                {recentSoldItems.map((item) => {
                  const imageUrl = cartImage(item.product);
                  const variantLabel = item.variant
                    ? `${item.variant.variantType}: ${item.variant.variantValue}`
                    : null;

                  return (
                    <ListRow
                      key={item.key}
                      thumbnail={imageUrl}
                      thumbnailAlt={item.product.name}
                      icon={<ShoppingBag size={18} />}
                      title={item.product.name}
                      subtitle={[variantLabel, formatRelative(item.saleDate)].filter(Boolean).join(' · ')}
                      trailing={
                        <p className="text-body-medium font-semibold text-primary-600">
                          {formatCurrency(item.sellingPrice, currency)}
                        </p>
                      }
                      onClick={() => addToCart(item.product, item.variant, 1, item.sellingPrice)}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
