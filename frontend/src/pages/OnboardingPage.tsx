import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Building2, Coins } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { Form } from '../components/ui/Form';
import { AuthLayout } from '../components/layout/AppLayout';
import { PaymentMethodPicker } from '../components/business/PaymentMethodPicker';
import { businessApi } from '../api';
import { CURRENCIES } from '../lib/currencies';
import { type PaymentMethod } from '../lib/payments';
import { useBusinessStore } from '../stores';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { setBusinesses, setActiveBusiness } = useBusinessStore();
  const [error, setError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(['CASH', 'MPESA']);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { name: '', currency: 'KES' },
  });

  const onSubmit = async (data: { name: string; currency: string }) => {
    setError('');
    if (paymentMethods.length === 0) {
      setError('Choose at least one payment method.');
      return;
    }
    try {
      const business = await businessApi.create({ ...data, paymentMethods });
      setBusinesses([business]);
      setActiveBusiness(business);
      navigate('/');
    } catch {
      setError('Could not create the business.');
    }
  };

  return (
    <AuthLayout title="Set Up Your Business" subtitle="You can add more businesses later">
      <Form busy={isSubmitting} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}
        <Input label="Business Name" placeholder="e.g. Nelson Shoes" icon={<Building2 size={18} />} {...register('name', { required: true })} />
        <Select label="Currency" icon={<Coins size={18} />} options={CURRENCIES} {...register('currency', { required: true })} />
        <PaymentMethodPicker
          value={paymentMethods}
          onChange={(next) => {
            setPaymentMethods(next);
            if (next.length > 0) setError('');
          }}
        />
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>Get Started →</Button>
      </Form>
    </AuthLayout>
  );
}
