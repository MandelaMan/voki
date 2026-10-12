import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Building2, Coins } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { AuthLayout } from '../components/layout/AppLayout';
import { businessApi } from '../api';
import { CURRENCIES } from '../lib/currencies';
import { useBusinessStore } from '../stores';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { setBusinesses, setActiveBusiness } = useBusinessStore();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { name: '', currency: 'KES' },
  });

  const onSubmit = async (data: { name: string; currency: string }) => {
    setError('');
    try {
      const business = await businessApi.create(data);
      setBusinesses([business]);
      setActiveBusiness(business);
      navigate('/');
    } catch {
      setError('Failed to create business');
    }
  };

  return (
    <AuthLayout title="Set Up Your Business" subtitle="You can add more businesses later">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}
        <Input label="Business Name" placeholder="e.g. Nelson Shoes" icon={<Building2 size={18} />} {...register('name', { required: true })} />
        <Select label="Currency" icon={<Coins size={18} />} options={CURRENCIES} {...register('currency', { required: true })} />
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>Get Started →</Button>
      </form>
    </AuthLayout>
  );
}
