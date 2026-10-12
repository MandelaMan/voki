import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { User, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { PageHeader, StatusBar } from '../components/ui/PageHeader';
import { authApi } from '../api';
import { useAuthStore } from '../stores';
import { getApiErrorMessage } from '../lib/utils';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updated) => {
      updateUser(updated);
      setSaveError('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (error) => {
      setSaveError(getApiErrorMessage(error, 'Failed to save profile.'));
    },
  });

  return (
    <div className="page-stack">
      <PageHeader title="Profile" subtitle="Manage your account details" />

      <Card className="!p-4">
        <form onSubmit={handleSubmit((d) => { setSaveError(''); mutation.mutate(d); })} className="space-y-4">
          {saveError && <Alert variant="error">{saveError}</Alert>}
          {saved && (
            <StatusBar variant="success">
              <CheckCircle2 size={18} className="shrink-0" />
              Profile saved successfully!
            </StatusBar>
          )}
          <Input label="First Name" icon={<User size={18} />} {...register('firstName')} />
          <Input label="Last Name" {...register('lastName')} />
          <Input label="Phone" icon={<Phone size={18} />} {...register('phone')} />
          <Input label="Email" icon={<Mail size={18} />} value={user?.email} disabled />
          <Button type="submit" className="w-full" size="lg" loading={mutation.isPending}>
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
