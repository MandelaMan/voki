import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { ProfitAmount, profitTone } from '../ui/ProfitAmount';
import type { Product } from '../../types';

type Tab = 'sold' | 'restock';

function money(value: number, currency: string) {
  return formatCurrency(Number(value) || 0, currency);
}

export function ProductHistoryTabs({ product, currency }: { product: Product; currency: string }) {
  const [tab, setTab] = useState<Tab>('sold');
  const sales = product.saleItems ?? [];
  const restocks = product.purchaseItems ?? [];
  const restockUnits = restocks.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const openingQty = Math.max(0, product.quantityPurchased - restockUnits);
  const restockCount = restocks.length + (openingQty > 0 ? 1 : 0);

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div role="tablist" aria-label="Item history" className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-700">
        <TabButton active={tab === 'sold'} onClick={() => setTab('sold')} label="Sold" count={sales.length} />
        <TabButton active={tab === 'restock'} onClick={() => setTab('restock')} label="Restock" count={restockCount} />
      </div>

      {tab === 'sold' ? (
        <div role="tabpanel">
          {sales.length === 0 ? (
            <Empty message="No sales yet" />
          ) : (
            <>
              <ul className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((item) => {
                  const qty = Number(item.quantity) || 0;
                  const price = Number(item.sellingPrice) || 0;
                  const profit = Number(item.profit) || 0;
                  const when = item.sale?.saleDate || item.createdAt;
                  const detail = [
                    item.variant ? `${item.variant.variantType}: ${item.variant.variantValue}` : '',
                    item.sale?.customer?.name || '',
                    item.sale?.paymentMethod ? item.sale.paymentMethod.toLowerCase() : '',
                  ].filter(Boolean).join(' · ');
                  return (
                    <li key={item.id} className="px-3.5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{when ? formatDate(when) : '—'}</p>
                          {detail && <p className="text-xs text-slate-400 capitalize mt-0.5">{detail}</p>}
                        </div>
                        <Result amount={profit} currency={currency} />
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2">
                        <Stat label="Qty" value={String(qty)} />
                        <Stat label="Price" value={money(price, currency)} />
                        <Stat label="Amount" value={money(price * qty, currency)} strong />
                      </dl>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold text-right">Qty</th>
                      <th className="px-3 py-2 font-semibold text-right">Price</th>
                      <th className="px-3 py-2 font-semibold text-right">Amount</th>
                      <th className="px-3 py-2 font-semibold text-right">Profit / loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((item) => {
                      const qty = Number(item.quantity) || 0;
                      const price = Number(item.sellingPrice) || 0;
                      const profit = Number(item.profit) || 0;
                      const when = item.sale?.saleDate || item.createdAt;
                      const detail = [
                        item.variant ? `${item.variant.variantType}: ${item.variant.variantValue}` : '',
                        item.sale?.customer?.name || '',
                        item.sale?.paymentMethod ? item.sale.paymentMethod.toLowerCase() : '',
                      ].filter(Boolean).join(' · ');
                      return (
                        <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2.5 align-top">
                            <p className="font-medium text-slate-800 dark:text-slate-100">{when ? formatDate(when) : '—'}</p>
                            {detail && <p className="text-[11px] text-slate-400 capitalize">{detail}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium">{qty}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{money(price, currency)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{money(price * qty, currency)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Result amount={profit} currency={currency} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        <div role="tabpanel">
          {restockCount === 0 ? (
            <Empty message="No restocks yet" />
          ) : (
            <>
              <ul className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {restocks.map((item) => {
                  const qty = Number(item.quantity) || 0;
                  const unit = Number(item.unitCost) || 0;
                  const total = Number(item.totalCost) || unit * qty;
                  const supplier = item.purchase?.supplier;
                  const when = item.purchase?.purchaseDate || item.createdAt;
                  return (
                    <li key={item.id} className="px-3.5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{when ? formatDate(when) : '—'}</p>
                          {item.purchase?.receiptNumber && (
                            <p className="text-xs text-slate-400 mt-0.5">Receipt {item.purchase.receiptNumber}</p>
                          )}
                        </div>
                        <SupplierLink id={supplier?.id} name={supplier?.name} />
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2">
                        <Stat label="Qty" value={String(qty)} />
                        <Stat label="Unit cost" value={money(unit, currency)} />
                        <Stat label="Total" value={money(total, currency)} strong />
                      </dl>
                    </li>
                  );
                })}
                {openingQty > 0 && (
                  <li className="px-3.5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {product.createdAt ? formatDate(product.createdAt) : '—'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Opening stock</p>
                      </div>
                      <SupplierLink id={product.supplier?.id} name={product.supplier?.name} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2">
                      <Stat label="Qty" value={String(openingQty)} />
                      <Stat label="Unit cost" value={money(Number(product.buyingPrice), currency)} />
                      <Stat label="Total" value={money(Number(product.buyingPrice) * openingQty, currency)} strong />
                    </dl>
                  </li>
                )}
              </ul>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold text-right">Qty</th>
                      <th className="px-3 py-2 font-semibold text-right">Unit cost</th>
                      <th className="px-3 py-2 font-semibold text-right">Total</th>
                      <th className="px-3 py-2 font-semibold">Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restocks.map((item) => {
                      const qty = Number(item.quantity) || 0;
                      const unit = Number(item.unitCost) || 0;
                      const total = Number(item.totalCost) || unit * qty;
                      const supplier = item.purchase?.supplier;
                      const when = item.purchase?.purchaseDate || item.createdAt;
                      return (
                        <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2.5 align-top">
                            <p className="font-medium text-slate-800 dark:text-slate-100">{when ? formatDate(when) : '—'}</p>
                            {item.purchase?.receiptNumber && (
                              <p className="text-[11px] text-slate-400 truncate">Receipt {item.purchase.receiptNumber}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium">{qty}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{money(unit, currency)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{money(total, currency)}</td>
                          <td className="px-3 py-2.5">
                            <SupplierLink id={supplier?.id} name={supplier?.name} />
                          </td>
                        </tr>
                      );
                    })}
                    {openingQty > 0 && (
                      <tr className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2.5 align-top">
                          <p className="font-medium text-slate-800 dark:text-slate-100">
                            {product.createdAt ? formatDate(product.createdAt) : '—'}
                          </p>
                          <p className="text-[11px] text-slate-400">Opening stock</p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{openingQty}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{money(Number(product.buyingPrice), currency)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                          {money(Number(product.buyingPrice) * openingQty, currency)}
                        </td>
                        <td className="px-3 py-2.5">
                          <SupplierLink id={product.supplier?.id} name={product.supplier?.name} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 dark:bg-slate-800/70 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={cn('text-sm tabular-nums text-slate-800 dark:text-slate-100 mt-0.5', strong && 'font-semibold')}>{value}</dd>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-3 text-sm font-semibold border-b-2 -mb-px ${
        active
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {label}
      <span className={`ml-1.5 text-xs tabular-nums ${active ? 'text-primary-500' : 'text-slate-400'}`}>{count}</span>
    </button>
  );
}

function Result({ amount, currency }: { amount: number; currency: string }) {
  const word = amount > 0 ? 'Profit' : amount < 0 ? 'Loss' : 'Even';
  return (
    <span className={profitTone(amount)}>
      <ProfitAmount amount={amount} currency={currency} className="block font-semibold" />
      <span className="block text-[10px]">{word}</span>
    </span>
  );
}

function SupplierLink({ id, name }: { id?: string; name?: string }) {
  if (!id || !name) return <span className="text-xs text-slate-400 shrink-0">No supplier</span>;
  return (
    <Link to={`/suppliers#${id}`} className="max-w-[46%] truncate text-right text-sm font-semibold text-primary-600 hover:underline shrink-0">
      {name}
    </Link>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="px-3 py-8 text-center text-sm text-slate-400">{message}</p>;
}
