import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, Smartphone, Sparkles } from 'lucide-react';
import { billingApi, businessApi, integrationApi } from '../api';
import { PremiumNotice } from '../components/billing/PremiumNotice';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormFields } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Badge';
import { getApiErrorMessage } from '../lib/utils';
import { useBusinessStore, usePremium } from '../stores';

export default function ConfigurationsPage() {
  const queryClient = useQueryClient();
  const isPremium = usePremium();
  const { activeBusiness, setActiveBusiness, businesses, setBusinesses } = useBusinessStore();

  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [mpesaType, setMpesaType] = useState<'PAYBILL' | 'TILL'>('TILL');
  const [shortCode, setShortCode] = useState('');
  const [account, setAccount] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [passkey, setPasskey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [removeBgKey, setRemoveBgKey] = useState('');

  const { data: billing } = useQuery({
    queryKey: ['billing', activeBusiness?.id],
    queryFn: () => billingApi.summary(activeBusiness?.id),
    enabled: !!activeBusiness?.id,
  });

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations', activeBusiness?.id],
    queryFn: () => integrationApi.summary(activeBusiness!.id),
    enabled: isPremium && !!activeBusiness?.id,
  });

  useEffect(() => {
    if (!integrations?.mpesa) return;
    if (integrations.mpesa.type) setMpesaType(integrations.mpesa.type);
    setShortCode(integrations.mpesa.shortCode || '');
    setAccount(integrations.mpesa.account || '');
  }, [
    activeBusiness?.id,
    integrations?.mpesa?.type,
    integrations?.mpesa?.shortCode,
    integrations?.mpesa?.account,
  ]);

  const saveMpesa = useMutation({
    mutationFn: () => integrationApi.update({
      businessId: activeBusiness!.id,
      mpesaType,
      mpesaShortCode: shortCode.trim(),
      mpesaAccount: account.trim(),
      ...(consumerKey.trim() ? { mpesaConsumerKey: consumerKey.trim() } : {}),
      ...(consumerSecret.trim() ? { mpesaConsumerSecret: consumerSecret.trim() } : {}),
      ...(passkey.trim() ? { mpesaPasskey: passkey.trim() } : {}),
    }),
    onSuccess: async () => {
      setError('');
      setSavedNote('Daraja details saved');
      setConsumerKey('');
      setConsumerSecret('');
      setPasskey('');
      queryClient.invalidateQueries({ queryKey: ['integrations', activeBusiness?.id] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      if (activeBusiness) {
        const updated = await businessApi.get(activeBusiness.id);
        setActiveBusiness(updated);
        setBusinesses(businesses.map((business) => (business.id === updated.id ? updated : business)));
      }
    },
    onError: (saveError) => setError(getApiErrorMessage(saveError, 'Could not save Daraja details.')),
  });

  const clearMpesa = useMutation({
    mutationFn: () => integrationApi.update({
      businessId: activeBusiness!.id,
      clearMpesaCredentials: true,
    }),
    onSuccess: async () => {
      setShortCode('');
      setAccount('');
      setConsumerKey('');
      setConsumerSecret('');
      setPasskey('');
      setSavedNote('Daraja details removed');
      queryClient.invalidateQueries({ queryKey: ['integrations', activeBusiness?.id] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      if (activeBusiness) {
        const updated = await businessApi.get(activeBusiness.id);
        setActiveBusiness(updated);
        setBusinesses(businesses.map((business) => (business.id === updated.id ? updated : business)));
      }
    },
    onError: (clearError) => setError(getApiErrorMessage(clearError, 'Could not clear Daraja details.')),
  });

  const saveGemini = useMutation({
    mutationFn: () => integrationApi.update({
      businessId: activeBusiness!.id,
      geminiApiKey: geminiKey.trim(),
    }),
    onSuccess: () => {
      setError('');
      setSavedNote('Gemini key saved');
      setGeminiKey('');
      queryClient.invalidateQueries({ queryKey: ['integrations', activeBusiness?.id] });
    },
    onError: (saveError) => setError(getApiErrorMessage(saveError, 'Could not save the Gemini key.')),
  });

  const clearGemini = useMutation({
    mutationFn: () => integrationApi.update({
      businessId: activeBusiness!.id,
      clearGeminiApiKey: true,
    }),
    onSuccess: () => {
      setGeminiKey('');
      setSavedNote('Gemini key removed');
      queryClient.invalidateQueries({ queryKey: ['integrations', activeBusiness?.id] });
    },
    onError: (clearError) => setError(getApiErrorMessage(clearError, 'Could not clear the Gemini key.')),
  });

  const saveRemoveBg = useMutation({
    mutationFn: () => integrationApi.update({
      businessId: activeBusiness!.id,
      removeBgApiKey: removeBgKey.trim(),
    }),
    onSuccess: () => {
      setError('');
      setSavedNote('remove.bg key saved');
      setRemoveBgKey('');
      queryClient.invalidateQueries({ queryKey: ['integrations', activeBusiness?.id] });
    },
    onError: (saveError) => setError(getApiErrorMessage(saveError, 'Could not save the remove.bg key.')),
  });

  const clearRemoveBg = useMutation({
    mutationFn: () => integrationApi.update({
      businessId: activeBusiness!.id,
      clearRemoveBgApiKey: true,
    }),
    onSuccess: () => {
      setRemoveBgKey('');
      setSavedNote('remove.bg key removed');
      queryClient.invalidateQueries({ queryKey: ['integrations', activeBusiness?.id] });
    },
    onError: (clearError) => setError(getApiErrorMessage(clearError, 'Could not clear the remove.bg key.')),
  });

  if (!activeBusiness) {
    return (
      <div className="page-stack">
        <PageHeader title="Configurations" />
        <Alert variant="warning">Set up a business first.</Alert>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="page-stack">
        <Link to="/more" className="flex items-center gap-1 text-caption text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Settings
        </Link>
        <PageHeader title="Configurations" subtitle="Connect Daraja, Gemini, and photo tools for your shop" />
        <PremiumNotice
          title="Configurations are on Premium"
          description="Add your own Daraja keys for M-Pesa prompts, plus Gemini for list scanning."
        />
      </div>
    );
  }

  const mpesaReady = Boolean(integrations?.mpesa.ready);
  const busy = saveMpesa.isPending || clearMpesa.isPending || saveGemini.isPending || clearGemini.isPending
    || saveRemoveBg.isPending || clearRemoveBg.isPending;

  return (
    <div className="page-stack pb-4">
      <Link to="/more" className="flex items-center gap-1 text-caption text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Settings
      </Link>
      <PageHeader
        title="Configurations"
        subtitle={`API keys and payment setup for ${activeBusiness.name}`}
      />

      {error && <Alert variant="error">{error}</Alert>}
      {savedNote && !error && <Alert variant="success">{savedNote}</Alert>}
      {isLoading && <Skeleton className="h-40 rounded-2xl" />}

      {!isLoading && (
        <>
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/25">
                  <Smartphone size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-heading">M-Pesa Daraja</h3>
                  <p className="mt-0.5 text-caption text-slate-500">
                    Your Safaricom Daraja consumer key, secret, and passkey for customer payment prompts.
                  </p>
                </div>
              </div>
              <span className={`text-micro px-2 py-0.5 rounded-full shrink-0 ${mpesaReady ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                {mpesaReady ? 'Connected' : 'Not set'}
              </span>
            </div>

            <FormFields busy={busy} className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  label="Consumer key"
                  value={consumerKey}
                  onChange={(event) => setConsumerKey(event.target.value)}
                  placeholder={mpesaReady ? 'Saved — leave blank to keep' : 'From Daraja portal'}
                  autoComplete="off"
                />
                <Input
                  label="Consumer secret"
                  type="password"
                  value={consumerSecret}
                  onChange={(event) => setConsumerSecret(event.target.value)}
                  placeholder={mpesaReady ? 'Saved — leave blank to keep' : 'From Daraja portal'}
                  autoComplete="new-password"
                />
                <Input
                  label="Passkey"
                  type="password"
                  value={passkey}
                  onChange={(event) => setPasskey(event.target.value)}
                  placeholder={mpesaReady ? 'Saved — leave blank to keep' : 'Lipa Na M-Pesa passkey'}
                  autoComplete="new-password"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-caption text-slate-500">
                  {billing?.simulate && !mpesaReady
                    ? 'Sandbox prompts still work before this is saved.'
                    : 'Get keys from the Safaricom Daraja portal.'}
                </p>
                <div className="flex gap-2 sm:justify-end">
                  {mpesaReady && (
                    <Button variant="ghost" loading={clearMpesa.isPending} onClick={() => clearMpesa.mutate()}>
                      Remove
                    </Button>
                  )}
                  <Button loading={saveMpesa.isPending} onClick={() => saveMpesa.mutate()}>
                    Save Daraja
                  </Button>
                </div>
              </div>
            </FormFields>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/25">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-heading">Gemini (list scanning)</h3>
                  <p className="mt-0.5 text-caption text-slate-500">
                    Your Google AI Studio key so handwritten lists can be read for this shop.
                  </p>
                </div>
              </div>
              <span className={`text-micro px-2 py-0.5 rounded-full shrink-0 ${integrations?.gemini.configured ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                {integrations?.gemini.configured
                  ? 'Your key'
                  : integrations?.gemini.usingPlatformFallback
                    ? 'Platform key'
                    : 'Not set'}
              </span>
            </div>
            <FormFields busy={busy} className="space-y-3 p-4 sm:p-5">
              <Input
                label="Gemini API key"
                type="password"
                value={geminiKey}
                onChange={(event) => setGeminiKey(event.target.value)}
                placeholder={integrations?.gemini.configured ? 'Saved — paste a new key to replace' : 'AIza…'}
                autoComplete="new-password"
              />
              <p className="text-caption text-slate-500">
                Free key from{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="font-medium text-primary-600">
                  Google AI Studio
                </a>
                .
              </p>
              <div className="flex gap-2 justify-end">
                {integrations?.gemini.configured && (
                  <Button variant="ghost" loading={clearGemini.isPending} onClick={() => clearGemini.mutate()}>
                    Remove
                  </Button>
                )}
                <Button
                  loading={saveGemini.isPending}
                  disabled={!geminiKey.trim()}
                  onClick={() => saveGemini.mutate()}
                >
                  Save Gemini
                </Button>
              </div>
            </FormFields>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/25">
                  <KeyRound size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-heading">remove.bg (clean photos)</h3>
                  <p className="mt-0.5 text-caption text-slate-500">
                    Optional. Use your own key when cleaning product photo backgrounds.
                  </p>
                </div>
              </div>
              <span className={`text-micro px-2 py-0.5 rounded-full shrink-0 ${integrations?.removeBg.configured ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                {integrations?.removeBg.configured
                  ? 'Your key'
                  : integrations?.removeBg.usingPlatformFallback
                    ? 'Platform key'
                    : 'Not set'}
              </span>
            </div>
            <FormFields busy={busy} className="space-y-3 p-4 sm:p-5">
              <Input
                label="remove.bg API key"
                type="password"
                value={removeBgKey}
                onChange={(event) => setRemoveBgKey(event.target.value)}
                placeholder={integrations?.removeBg.configured ? 'Saved — paste a new key to replace' : 'From remove.bg'}
                autoComplete="new-password"
              />
              <div className="flex gap-2 justify-end">
                {integrations?.removeBg.configured && (
                  <Button variant="ghost" loading={clearRemoveBg.isPending} onClick={() => clearRemoveBg.mutate()}>
                    Remove
                  </Button>
                )}
                <Button
                  loading={saveRemoveBg.isPending}
                  disabled={!removeBgKey.trim()}
                  onClick={() => saveRemoveBg.mutate()}
                >
                  Save remove.bg
                </Button>
              </div>
            </FormFields>
          </Card>
        </>
      )}
    </div>
  );
}
