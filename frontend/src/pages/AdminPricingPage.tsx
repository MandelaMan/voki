import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { adminApi } from '../api';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { FormFields } from '../components/ui/Form';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { formatCurrency, getApiErrorMessage } from '../lib/utils';
import { useAuthStore } from '../stores';

export default function AdminPricingPage() {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === 'SUPER_ADMIN');
  const [price, setPrice] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const overview = useQuery({
    queryKey: ['admin', ''],
    queryFn: () => adminApi.overview(),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!overview.data || seeded) return;
    setPrice(String(overview.data.pricing.priceKes));
    setSeeded(true);
  }, [overview.data, seeded]);

  const savePrice = useMutation({
    mutationFn: () => adminApi.setPrice(Number(price)),
    onSuccess: async (pricing) => {
      setError('');
      setNote(`Premium is now ${formatCurrency(pricing.priceKes, 'KES')}`);
      setPrice(String(pricing.priceKes));
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (saveError) => setError(getApiErrorMessage(saveError, 'Could not save the price.')),
  });

  if (!isAdmin) {
    return (
      <div className="page-stack">
        <PageHeader title="Pricing" subtitle="What new subscribers pay for Premium" />
        <Alert variant="error">This account is not a super admin.</Alert>
      </div>
    );
  }

  const pricing = overview.data?.pricing;
  const priceValue = Number(price);
  const priceReady = Number.isInteger(priceValue) && priceValue >= 1 && priceValue <= 1_000_000;
  if (!pricing && overview.isLoading) return <Skeleton className="h-24 rounded-2xl" />;

  return (
    <div className="page-stack">
      <PageHeader title="Pricing" subtitle="What new subscribers pay for Premium" />
      {error && <Alert variant="error">{error}</Alert>}
      {note && !error && <Alert variant="success">{note}</Alert>}
      <Card className="!p-0 overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-4 sm:px-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="text-body-medium font-semibold">Premium price</h2>
          </div>
        </div>
        <FormFields busy={savePrice.isPending} className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-48">
            <Input
              label="Amount in Ksh"
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
          <Button loading={savePrice.isPending} disabled={!priceReady || priceValue === pricing?.priceKes} onClick={() => savePrice.mutate()}>
            Save price
          </Button>
        </FormFields>
      </Card>
    </div>
  );
}
