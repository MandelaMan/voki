import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  Check,
  ImageIcon,
  Receipt,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { billingApi, businessApi, mpesaApi } from '../api';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { FormFields } from '../components/ui/Form';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Badge';
import { formatCurrency, formatDate, getApiErrorMessage } from '../lib/utils';
import { useAuthStore, useBusinessStore } from '../stores';

const FEATURE_ICONS: Record<string, typeof Sparkles> = {
  mpesa_prompt: Smartphone,
  receipts: Receipt,
  background: ImageIcon,
  customers: Users,
  cash_up: Wallet,
  restock: Boxes,
};

export default function PlanPage() {
  const queryClient = useQueryClient();
  const { user, loadProfile } = useAuthStore();
  const { activeBusiness, setActiveBusiness, businesses, setBusinesses } = useBusinessStore();
  const [phone, setPhone] = useState(user?.phone || '');
  const [renewOpen, setRenewOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [mpesaType, setMpesaType] = useState<'PAYBILL' | 'TILL'>('TILL');
  const [shortCode, setShortCode] = useState('');
  const [account, setAccount] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [passkey, setPasskey] = useState('');

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing', activeBusiness?.id],
    queryFn: () => billingApi.summary(activeBusiness?.id),
  });

  useEffect(() => {
    const mpesa = billing?.businessMpesa;
    if (!mpesa) return;
    if (mpesa.type) setMpesaType(mpesa.type);
    setShortCode(mpesa.shortCode || '');
    setAccount(mpesa.account || '');
  }, [activeBusiness?.id, billing?.businessMpesa?.type, billing?.businessMpesa?.shortCode, billing?.businessMpesa?.account]);

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

  const saveMpesa = useMutation({
    mutationFn: () => businessApi.update(activeBusiness!.id, {
      mpesaType,
      mpesaShortCode: shortCode.trim(),
      mpesaAccount: account.trim(),
      ...(consumerKey.trim() ? { mpesaConsumerKey: consumerKey.trim() } : {}),
      ...(consumerSecret.trim() ? { mpesaConsumerSecret: consumerSecret.trim() } : {}),
      ...(passkey.trim() ? { mpesaPasskey: passkey.trim() } : {}),
    }),
    onSuccess: (updated) => {
      setError('');
      setSavedNote('Saved');
      setConsumerKey('');
      setConsumerSecret('');
      setPasskey('');
      setActiveBusiness(updated);
      setBusinesses(businesses.map((business) => (business.id === updated.id ? updated : business)));
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (saveError) => setError(getApiErrorMessage(saveError, 'Could not save the M-Pesa details.')),
  });

  const clearMpesa = useMutation({
    mutationFn: () => businessApi.update(activeBusiness!.id, { clearMpesaCredentials: true }),
    onSuccess: (updated) => {
      setShortCode('');
      setAccount('');
      setConsumerKey('');
      setConsumerSecret('');
      setPasskey('');
      setSavedNote('');
      setActiveBusiness(updated);
      setBusinesses(businesses.map((business) => (business.id === updated.id ? updated : business)));
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (clearError) => setError(getApiErrorMessage(clearError, 'Could not clear the M-Pesa details.')),
  });

  const price = billing ? formatCurrency(billing.priceKes, 'KES') : 'KES 999';
  const prompt = paymentQuery.data?.prompt;
  const waiting = prompt?.status === 'PENDING';
  const showPay = !billing?.isPremium || renewOpen || !!prompt;
  const mpesaReady = Boolean(billing?.businessMpesa?.ready);

  return (
    <div className="page-stack">
      <PageHeader title="Premium" />

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
                  </div>
                </div>
              );
            })}
          </div>
          {isLoading && <Skeleton className="h-24 rounded-none" />}
        </Card>
      </section>

      {billing?.isPremium && activeBusiness && (
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              <h3 className="text-heading">Customer payments</h3>
            </div>
            <span className={`text-micro px-2 py-0.5 rounded-full shrink-0 ${mpesaReady ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              {mpesaReady ? 'Connected' : 'Not set'}
            </span>
          </div>

          <FormFields busy={saveMpesa.isPending || clearMpesa.isPending} className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Account type"
                options={[
                  { value: 'TILL', label: 'Buy Goods till' },
                  { value: 'PAYBILL', label: 'Paybill' },
                ]}
                value={mpesaType}
                onChange={(event) => setMpesaType(event.target.value as 'PAYBILL' | 'TILL')}
              />
              <Input
                label={mpesaType === 'TILL' ? 'Till number' : 'Paybill number'}
                value={shortCode}
                onChange={(event) => setShortCode(event.target.value)}
              />
              {mpesaType === 'PAYBILL' && (
                <Input
                  label="Account number"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="Shown on the receipt"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Consumer key"
                value={consumerKey}
                onChange={(event) => setConsumerKey(event.target.value)}
                placeholder={mpesaReady ? 'Saved' : 'Daraja'}
                autoComplete="off"
              />
              <Input
                label="Consumer secret"
                type="password"
                value={consumerSecret}
                onChange={(event) => setConsumerSecret(event.target.value)}
                placeholder={mpesaReady ? 'Saved' : 'Daraja'}
                autoComplete="new-password"
              />
              <Input
                label="Passkey"
                type="password"
                value={passkey}
                onChange={(event) => setPasskey(event.target.value)}
                placeholder={mpesaReady ? 'Saved' : 'Daraja'}
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-slate-500">
                {savedNote || (billing.simulate && !mpesaReady ? 'Sandbox prompts work before this is saved.' : 'Leave the keys blank to keep the saved ones.')}
              </p>
              <div className="flex gap-2 sm:justify-end">
                {mpesaReady && (
                  <Button variant="ghost" loading={clearMpesa.isPending} onClick={() => clearMpesa.mutate()}>
                    Remove
                  </Button>
                )}
                <Button loading={saveMpesa.isPending} onClick={() => saveMpesa.mutate()}>
                  Save
                </Button>
              </div>
            </div>
          </FormFields>
        </Card>
      )}
    </div>
  );
}
