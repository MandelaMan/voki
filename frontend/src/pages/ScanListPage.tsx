import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Camera, Check, ImagePlus, ScanLine, ShoppingBag, Trash2, X } from 'lucide-react';
import { listOcrApi, productApi } from '../api';
import { PremiumNotice } from '../components/billing/PremiumNotice';
import { ProductSearchBox } from '../components/products/ProductSearchBox';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { saveScannedPurchaseDraft, saveScannedSaleDraft } from '../lib/scannedList';
import { cn, formatCurrency, getApiErrorMessage } from '../lib/utils';
import { useBusinessStore, usePremium } from '../stores';
import type { ListOcrItem, ListOcrKind, Product } from '../types';

function kindFromParam(value: string | null): ListOcrKind {
  return value?.toUpperCase() === 'PURCHASE' ? 'PURCHASE' : 'SALE';
}

type DraftLine = ListOcrItem & { included: boolean; search: string };

function emptyLine(kind: ListOcrKind): DraftLine {
  return {
    name: '',
    quantity: 1,
    unitCost: kind === 'PURCHASE' ? 0 : null,
    sellingPrice: kind === 'SALE' ? 0 : null,
    productId: null,
    productName: null,
    variantId: null,
    variantLabel: null,
    matchConfidence: 'none',
    candidates: [],
    included: true,
    search: '',
  };
}

export default function ScanListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPremium = usePremium();
  const { activeBusiness } = useBusinessStore();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<ListOcrKind>(() => kindFromParam(searchParams.get('kind')));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const currency = activeBusiness?.currency || 'USD';

  useEffect(() => {
    setKind(kindFromParam(searchParams.get('kind')));
  }, [searchParams]);

  const chooseKind = (next: ListOcrKind) => {
    setKind(next);
    setLines([]);
    setNote('');
    setSearchParams(next === 'PURCHASE' ? { kind: 'PURCHASE' } : { kind: 'SALE' }, { replace: true });
  };

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const pickFile = (next: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    setLines([]);
    setError('');
    setNote('');
  };

  const scan = useMutation({
    mutationFn: () => listOcrApi.scan(activeBusiness!.id, kind, file!),
    onSuccess: (result) => {
      setLines(result.items.map((item) => ({ ...item, included: true, search: '' })));
      setNote(`Read ${result.itemCount} item${result.itemCount === 1 ? '' : 's'} with ${result.engine}. Review before continuing.`);
      setError('');
    },
    onError: (scanError) => {
      setLines([]);
      setError(getApiErrorMessage(scanError, 'Could not read that list.'));
    },
  });

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const applyProduct = (index: number, product: Product) => {
    const current = lines[index];
    const variant = product.hasVariants && product.variants?.length
      ? product.variants.find((row) => row.remainingQuantity > 0) || product.variants[0]
      : undefined;
    updateLine(index, {
      productId: product.id,
      productName: product.name,
      name: product.name,
      variantId: variant?.id || null,
      variantLabel: variant ? `${variant.variantType}: ${variant.variantValue}` : null,
      matchConfidence: 'exact',
      search: '',
      unitCost: kind === 'PURCHASE'
        ? Math.round(Number(variant?.buyingPrice ?? product.buyingPrice) || current?.unitCost || 0)
        : current?.unitCost ?? null,
      sellingPrice: kind === 'SALE'
        ? Math.round(Number(variant?.sellingPrice ?? product.sellingPrice) || current?.sellingPrice || 0)
        : current?.sellingPrice ?? null,
      candidates: mergeCandidate(current?.candidates || [], product),
    });
  };

  const clearProduct = (index: number) => {
    updateLine(index, {
      productId: null,
      productName: null,
      variantId: null,
      variantLabel: null,
      matchConfidence: 'none',
    });
  };

  const continueWithLines = () => {
    const selected = lines.filter((line) => line.included && line.name.trim() && line.quantity > 0);
    if (!selected.length) {
      setError('Keep at least one item before continuing.');
      return;
    }

    if (kind === 'SALE') {
      const missing = selected.filter((line) => !line.productId);
      if (missing.length) {
        setError('Every sale line needs a matched product from your catalog.');
        return;
      }
      saveScannedSaleDraft(selected.map((line) => ({
        productId: line.productId!,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
        sellingPrice: line.sellingPrice == null ? undefined : Math.max(0, Math.round(Number(line.sellingPrice) || 0)),
      })));
      navigate('/sales/new');
      return;
    }

    saveScannedPurchaseDraft(selected.map((line) => ({
      name: line.name.trim(),
      quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
      unitCost: Math.max(0, Math.round(Number(line.unitCost) || 0)),
      ...(line.productId ? { productId: line.productId } : {}),
    })));
    navigate('/purchases/new');
  };

  if (!isPremium) {
    return (
      <div className="page-stack">
        <PageHeader title="Scan a list" subtitle="Photograph a handwritten sales or restock list" />
        <PremiumNotice
          title="List scanning is on Premium"
          description="Upgrade to photograph a handwritten list and let Voki fill the sale or purchase for you."
        />
      </div>
    );
  }

  if (!activeBusiness) {
    return (
      <div className="page-stack">
        <PageHeader title="Scan a list" />
        <Alert variant="warning">Set up a business first.</Alert>
      </div>
    );
  }

  return (
    <div className="page-stack pb-4">
      <PageHeader
        title="Scan a list"
        subtitle="Photograph a handwritten list, match the items, then finish the sale or purchase"
      />

      {error && <Alert variant="error">{error}</Alert>}
      {note && !error && <Alert variant="success">{note}</Alert>}

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-5">
          <p className="text-micro font-semibold uppercase tracking-wide text-slate-400">Step 1</p>
          <h3 className="text-heading mt-0.5">What kind of list is this?</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              {
                id: 'SALE' as const,
                icon: ShoppingBag,
                title: 'Sales',
                hint: 'What a customer bought',
              },
              {
                id: 'PURCHASE' as const,
                icon: ScanLine,
                title: 'Restock',
                hint: 'Stock you bought in',
              },
            ]).map((option) => {
              const selected = kind === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseKind(option.id)}
                  aria-pressed={selected}
                  className={cn(
                    'relative rounded-xl border px-3 py-3 text-left transition-all',
                    selected
                      ? 'border-primary-500 bg-primary-50 shadow-sm dark:border-primary-500 dark:bg-primary-900/25'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
                  )}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <span
                    className={cn(
                      'mb-2 flex h-9 w-9 items-center justify-center rounded-lg',
                      selected
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <p className={cn('text-body-medium font-semibold', selected ? 'text-primary-800 dark:text-primary-100' : 'text-slate-800 dark:text-slate-100')}>
                    {option.title}
                  </p>
                  <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">{option.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-5">
          <p className="text-micro font-semibold uppercase tracking-wide text-slate-400">Step 2</p>
          <h3 className="text-heading mt-0.5">Add a clear photo of the list</h3>
          <p className="mt-1 text-caption text-slate-500">
            Straight-on, good light, one item per line works best.
          </p>

          {previewUrl ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="relative bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] dark:bg-none dark:bg-slate-950">
                <img src={previewUrl} alt="List preview" className="mx-auto max-h-64 w-full object-contain" />
                <button
                  type="button"
                  onClick={() => pickFile(null)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur-sm"
                  aria-label="Remove photo"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-3 py-2.5 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="truncate text-caption font-semibold text-slate-700 dark:text-slate-200">
                    {file?.name || 'Photo ready'}
                  </p>
                  <p className="text-micro text-slate-500">Ready to read</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button type="button" size="sm" variant="ghost" onClick={() => cameraRef.current?.click()}>
                    Retake
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                    Replace
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-900/40">
              <div className="flex flex-col items-center text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-soft dark:bg-slate-800">
                  <ImagePlus size={20} />
                </span>
                <p className="mt-3 text-body-medium font-semibold text-slate-800 dark:text-slate-100">
                  Drop in a photo of the list
                </p>
                <p className="mt-1 max-w-xs text-caption text-slate-500">
                  Use the camera on your phone, or upload an image from your gallery.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" className="w-full" onClick={() => cameraRef.current?.click()}>
                  <Camera size={16} /> Take photo
                </Button>
                <Button type="button" variant="soft" className="w-full" onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={16} /> Upload
                </Button>
              </div>
            </div>
          )}

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => pickFile(event.target.files?.[0] || null)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => pickFile(event.target.files?.[0] || null)}
          />
        </div>

        <div className="bg-slate-50/70 px-4 py-3.5 dark:bg-slate-900/40 sm:px-5">
          <Button
            className="w-full"
            size="lg"
            loading={scan.isPending}
            disabled={!file}
            onClick={() => {
              setError('');
              scan.mutate();
            }}
          >
            <ScanLine size={16} />
            {file ? 'Read list' : 'Add a photo to continue'}
          </Button>
          <p className="mt-2 text-center text-micro text-slate-500">
            You can edit every line before it goes into {kind === 'SALE' ? 'a sale' : 'a purchase'}.
          </p>
        </div>
      </Card>

      {lines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2 px-0.5">
            <div>
              <p className="text-micro font-semibold uppercase tracking-wide text-slate-400">Step 3</p>
              <h3 className="text-heading mt-0.5">Review & match items</h3>
              <p className="mt-0.5 text-caption text-slate-500">
                Confirm products before continuing to {kind === 'SALE' ? 'the sale' : 'the purchase'}.
              </p>
            </div>
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={() => setLines((current) => [...current, emptyLine(kind)])}
            >
              Add line
            </Button>
          </div>

          {lines.map((line, index) => (
            <Card key={`${line.name}-${index}`} className={`!p-3 space-y-3 ${line.included ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-center gap-2 text-caption cursor-pointer">
                  <input
                    type="checkbox"
                    checked={line.included}
                    onChange={(event) => updateLine(index, { included: event.target.checked })}
                    className="h-4 w-4 rounded accent-primary-600"
                  />
                  Include
                </label>
                <button
                  type="button"
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  aria-label="Remove line"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <Input
                label="Item name"
                value={line.name}
                onChange={(event) => updateLine(index, { name: event.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  step={1}
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: Math.max(1, parseInt(event.target.value, 10) || 1) })}
                />
                {kind === 'SALE' ? (
                  <Input
                    label="Sold at"
                    type="number"
                    min={0}
                    step={1}
                    value={line.sellingPrice ?? 0}
                    onChange={(event) => updateLine(index, { sellingPrice: Math.max(0, parseFloat(event.target.value) || 0) })}
                  />
                ) : (
                  <Input
                    label="Cost per unit"
                    type="number"
                    min={0}
                    step={1}
                    value={line.unitCost ?? 0}
                    onChange={(event) => updateLine(index, { unitCost: Math.max(0, parseFloat(event.target.value) || 0) })}
                  />
                )}
              </div>

              {line.productId && line.productName ? (
                <div className="flex items-start justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/20">
                  <p className="text-caption text-emerald-700 dark:text-emerald-300 flex items-center gap-1 min-w-0">
                    <Check size={14} className="shrink-0" />
                    <span className="truncate">
                      {line.matchConfidence === 'exact' ? 'Matched' : 'Likely match'}: {line.productName}
                      {line.variantLabel ? ` (${line.variantLabel})` : ''}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="text-caption font-semibold text-slate-500 shrink-0"
                    onClick={() => clearProduct(index)}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-caption text-slate-500">
                    {kind === 'SALE' ? 'Match a catalog product (required for sales).' : 'Optional: match a product to add stock.'}
                  </p>
                  {line.candidates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {line.candidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-micro font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:text-slate-200"
                          onClick={async () => {
                            try {
                              const product = await productApi.get(candidate.id, activeBusiness.id);
                              applyProduct(index, product);
                            } catch (loadError) {
                              setError(getApiErrorMessage(loadError, 'Could not load that product.'));
                            }
                          }}
                        >
                          {candidate.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <ProductSearchBox
                    businessId={activeBusiness.id}
                    value={line.search}
                    onChange={(value) => updateLine(index, { search: value })}
                    currency={currency}
                    price={kind === 'PURCHASE' ? 'buying' : 'selling'}
                    placeholder="Search catalog to match…"
                    disableOutOfStock={kind === 'SALE'}
                    onSelect={(product) => applyProduct(index, product)}
                  />
                </div>
              )}

              {kind === 'PURCHASE' && line.productId && (
                <p className="text-caption text-slate-500">
                  Line total {formatCurrency((Number(line.quantity) || 0) * (Number(line.unitCost) || 0), currency)} · will add stock
                </p>
              )}
            </Card>
          ))}

          <Button className="w-full" size="lg" onClick={continueWithLines}>
            {kind === 'SALE' ? 'Continue to sale' : 'Continue to purchase'}
          </Button>
          <p className="text-center text-caption text-slate-500">
            Or open{' '}
            <Link to={kind === 'SALE' ? '/sales/new' : '/purchases/new'} className="font-medium text-primary-600">
              the form without these items
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function mergeCandidate(candidates: ListOcrItem['candidates'], product: Product) {
  if (candidates.some((candidate) => candidate.id === product.id)) return candidates;
  return [
    {
      id: product.id,
      name: product.name,
      remainingQuantity: product.remainingQuantity,
      sellingPrice: Math.round(Number(product.sellingPrice) || 0),
      buyingPrice: Math.round(Number(product.buyingPrice) || 0),
      hasVariants: Boolean(product.hasVariants),
    },
    ...candidates,
  ];
}
