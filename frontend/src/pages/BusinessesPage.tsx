import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Pencil } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { FormFields } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { PaymentMethodPicker } from '../components/business/PaymentMethodPicker';
import { businessApi } from '../api';
import { currencyOptions } from '../lib/currencies';
import { businessPaymentMethods, paymentMethodLabel, type PaymentMethod } from '../lib/payments';
import { getApiErrorMessage } from '../lib/utils';
import { useBusinessStore } from '../stores';
import type { Business } from '../types';

export default function BusinessesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBusiness, setActiveBusiness, setBusinesses } = useBusinessStore();
  const [editing, setEditing] = useState<Business | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftCurrency, setDraftCurrency] = useState('KES');
  const [draftMethods, setDraftMethods] = useState<PaymentMethod[]>(['CASH', 'MPESA']);
  const [actionError, setActionError] = useState('');

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.list,
  });

  useEffect(() => {
    if (businesses) setBusinesses(businesses);
  }, [businesses, setBusinesses]);

  const createMutation = useMutation({
    mutationFn: () => businessApi.create({
      name: draftName.trim(),
      currency: draftCurrency,
      paymentMethods: draftMethods,
    }),
    onSuccess: (business) => {
      setActionError('');
      setCreating(false);
      setDraftName('');
      setDraftMethods(['CASH', 'MPESA']);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      setActiveBusiness(business);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not add that business.')),
  });

  const updateMutation = useMutation({
    mutationFn: () => businessApi.update(editing!.id, {
      name: editing!.name,
      currency: editing!.currency,
      paymentMethods: editing!.paymentMethods,
    }),
    onSuccess: (updated) => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      if (activeBusiness?.id === updated.id) setActiveBusiness(updated);
      setEditing(null);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not save that business.')),
  });

  if (isLoading) return <Skeleton className="h-48 rounded-2xl" />;

  return (
    <div className="page-stack">
      <PageHeader
        title="Businesses"
        subtitle="Switch between your stores"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setCreating((open) => !open);
              setDraftName('');
              setDraftCurrency('KES');
              setDraftMethods(['CASH', 'MPESA']);
            }}
            loading={createMutation.isPending}
          >
            <Plus size={18} /> Add
          </Button>
        }
      />

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {creating && (
        <Card className="!p-3">
          <FormFields busy={createMutation.isPending} className="space-y-3">
            <Input label="Name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            <Select
              label="Currency"
              options={currencyOptions(draftCurrency)}
              value={draftCurrency}
              onChange={(e) => setDraftCurrency(e.target.value)}
            />
            <PaymentMethodPicker value={draftMethods} onChange={setDraftMethods} />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!draftName.trim() || draftMethods.length === 0}
                loading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Save
              </Button>
              <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </FormFields>
        </Card>
      )}

      {editing && (
        <Card className="!p-3">
          <FormFields busy={updateMutation.isPending} className="space-y-3">
          <Input label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <Select
            label="Currency"
            options={currencyOptions(editing.currency)}
            value={editing.currency}
            onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
          />
          <PaymentMethodPicker
            value={businessPaymentMethods(editing.paymentMethods)}
            onChange={(paymentMethods) => setEditing({ ...editing, paymentMethods })}
          />
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!editing.name.trim() || !editing.paymentMethods?.length} loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>Save</Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
          </FormFields>
        </Card>
      )}

      <div className="space-y-2">
        {businesses?.map((business) => (
          <Card key={business.id} className="flex items-center justify-between !p-4">
            <button
              type="button"
              className="flex items-center gap-3 min-w-0 text-left"
              onClick={() => {
                setActiveBusiness(business);
                navigate('/');
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold">
                {business.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-body-medium truncate">{business.name}</p>
                <p className="text-caption text-primary-700 dark:text-slate-400">
                  {business.currency}
                  {' · '}
                  {businessPaymentMethods(business.paymentMethods).map(paymentMethodLabel).join(', ')}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              {activeBusiness?.id === business.id && <Check size={20} className="text-primary-600" />}
              <button
                type="button"
                className="p-2 text-slate-500"
                aria-label={`Edit ${business.name}`}
                onClick={() => {
                  setCreating(false);
                  setEditing({ ...business, paymentMethods: businessPaymentMethods(business.paymentMethods) });
                }}
              >
                <Pencil size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
