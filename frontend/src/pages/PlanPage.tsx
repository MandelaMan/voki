import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  Check,
  ImageIcon,
  KeyRound,
  Receipt,
  ScanLine,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { billingApi, mpesaApi } from '../api';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { FormFields } from '../components/ui/Form';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { PREMIUM_FEATURE_LINKS } from '../lib/premiumNav';
import { formatCurrency, formatDate, getApiErrorMessage } from '../lib/utils';
import { useAuthStore, useBusinessStore } from '../stores';

const FEATURE_ICONS: Record<string, typeof Sparkles> = {
  mpesa_prompt: Smartphone,
  receipts: Receipt,
  background: ImageIcon,
  customers: Users,
  cash_up: Wallet,
  restock: Boxes,
  list_ocr: ScanLine,
};

export default function PlanPage() {
  const queryClient = useQueryClient();
  const { user, loadProfile } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const [phone, setPhone] = useState(user?.phone || '');
  const [renewOpen, setRenewOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing', activeBusiness?.id],
    queryFn: () => billingApi.summary(activeBusiness?.id),
  });

  const paymentQuery = useQuery({
    queryKey: ['billing-payment', paymentId],
    queryFn: () => billingApi.payment(paymentId!),
    enabled: !!paymentId,
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 3000 : false),
  });

  useEffect(() => {
    if (paymentQuery.data?.status !== 'SUCCESS') return;
    loadProfile();
    queryClient.invalidateQueries({ queryKey: ['billing'] });
    setRenewOpen(false);
  }, [paymentQuery.data?.status, loadProfile, queryClient]);

  const subscribe = useMutation({
    mutationFn: () => billingApi.subscribe(phone),
    onSuccess: (result) => {
      setError('');
      setPaymentId(result.paymentId);
    },
    onError: (subscribeError) => setError(getApiErrorMessage(subscribeError, 'Could not send the M-Pesa prompt.')),
  });

  const simulate = useMutation({
    mutationFn: (action: 'SUCCESS' | 'CANCELLED') => mpesaApi.simulate(paymentQuery.data!.prompt!.id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-payment', paymentId] });
    },
    onError: (simulateError) => setError(getApiErrorMessage(simulateError, 'Could not update the sandbox payment.')),
  });

  const price = billing ? formatCurrency(billing.priceKes, 'KES') : 'KES 999';
  const prompt = paymentQuery.data?.prompt;
  const waiting = prompt?.status === 'PENDING';
  const showPay = !billing?.isPremium || renewOpen || !!prompt;
  const mpesaReady = Boolean(billing?.businessMpesa?.ready);

  return (
    <div className="page-stack">
      <PageHeader title="Premium" subtitle="Billing and what Premium unlocks" />

      {error && <Alert variant="error">{error}</Alert>}

      {isLoading ? <Skeleton className="h-24 rounded-2xl" /> : (
        <Card className="!p-0 overflow-hidden">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-body-medium font-semibold">
                  {billing?.isPremium && billing.planExpiresAt
                    ? `Active until ${formatDate(billing.planExpiresAt)}`
                    : 'Free plan'}
                </h2>
                <p className="text-caption text-slate-500 mt-0.5">
                  {price} every {billing?.periodDays || 30} days
                </p>
              </div>
            </div>
            {billing?.isPremium && !showPay && (
              <Button variant="secondary" size="sm" onClick={() => setRenewOpen(true)}>
                Renew
              </Button>
            )}
          </div>

          {showPay && (
            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 sm:px-5 space-y-3">
              {!prompt && (
                <FormFields busy={subscribe.isPending} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Input
                      label="M-Pesa phone"
                      inputMode="tel"
                      placeholder="07XX XXX XXX"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    {billing?.isPremium && (
                      <Button variant="ghost" onClick={() => { setRenewOpen(false); setPaymentId(null); }}>
                        Cancel
                      </Button>
                    )}
                    <Button loading={subscribe.isPending} onClick={() => subscribe.mutate()} disabled={!phone.trim()}>
                      {billing?.isPremium ? 'Renew' : 'Pay with M-Pesa'}
                    </Button>
                  </div>
                </FormFields>
              )}
              {prompt && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-body-medium font-semibold">
                      {prompt.status === 'SUCCESS' && 'Payment received'}
                      {prompt.status === 'PENDING' && `Waiting for the PIN on ${prompt.phone}`}
                      {prompt.status === 'CANCELLED' && 'Prompt cancelled'}
                      {prompt.status === 'FAILED' && 'Prompt did not go through'}
                    </p>
                    {prompt.resultDesc && prompt.status !== 'SUCCESS' && (
                      <p className="text-caption text-slate-500 mt-0.5">{prompt.resultDesc}</p>
                    )}
                  </div>
                  {waiting && prompt.simulated && (
                    <div className="flex gap-2">
                      <Button size="sm" loading={simulate.isPending} onClick={() => simulate.mutate('SUCCESS')}>
                        Customer paid
                      </Button>
                      <Button size="sm" variant="secondary" loading={simulate.isPending} onClick={() => simulate.mutate('CANCELLED')}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {billing?.isPremium && (
        <Card className="flex items-center justify-between gap-3 !p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/25">
              <KeyRound size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-body-medium font-semibold">Shop configurations</p>
              <p className="text-caption text-slate-500 mt-0.5">
                Daraja {mpesaReady ? 'connected' : 'not set'} · Gemini & photo keys
              </p>
            </div>
          </div>
          <Button to="/settings/configurations" size="sm" variant="soft">
            Open
          </Button>
        </Card>
      )}

      <section className="space-y-2">
        <h3 className="text-heading text-slate-500 px-1">Included</h3>
        <Card className="!p-0 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {(billing?.features || []).map((feature) => {
              const Icon = FEATURE_ICONS[feature.id] || Check;
              return (
                <div
                  key={feature.id}
                  className="flex items-start gap-3 p-4 border-b border-slate-100 last:border-b-0 dark:border-slate-800 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/25 text-primary-600 flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-medium font-semibold">{feature.name}</p>
                    <p className="text-caption text-slate-500 mt-0.5">{feature.description}</p>
                    {PREMIUM_FEATURE_LINKS[feature.id] && (
                      <Button
                        to={PREMIUM_FEATURE_LINKS[feature.id].to}
                        size="sm"
                        variant="soft"
                        className="mt-2"
                      >
                        {PREMIUM_FEATURE_LINKS[feature.id].label}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {isLoading && <Skeleton className="h-24 rounded-none" />}
        </Card>
      </section>
    </div>
  );
}
