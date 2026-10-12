import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthField, AuthSubmitButton } from '../components/auth/AuthField';
import { AuthSheetLayout } from '../components/layout/AuthSheetLayout';
import { useAuthStore } from '../stores';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await registerUser(data);
      navigate('/onboarding');
    } catch {
      setError('Registration failed. Email may already be in use.');
    }
  };

  return (
    <AuthSheetLayout
      title="Create Account"
      subtitle="Join Voki to track inventory, record sales, and grow your business — all in one place."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-2xl" role="alert">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <AuthField
            label="First Name"
            placeholder="Jane"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <AuthField
            label="Last Name"
            placeholder="Doe"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <AuthField
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthField
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="pt-2">
          <AuthSubmitButton loading={isSubmitting}>
            Create Account
          </AuthSubmitButton>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthSheetLayout>
  );
}
