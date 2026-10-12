import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { AuthField, AuthSubmitButton } from '../components/auth/AuthField';
import { AuthSheetLayout } from '../components/layout/AuthSheetLayout';
import { useAuthStore, useBusinessStore } from '../stores';
import { businessApi } from '../api';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { setBusinesses, setActiveBusiness } = useBusinessStore();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await login(data.email, data.password);
      const businesses = await businessApi.list();
      setBusinesses(businesses);
      if (businesses.length > 0) {
        setActiveBusiness(businesses[0]);
        navigate('/');
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setError('Cannot reach the server. Start Docker MySQL and the API, then try again.');
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid email or password');
      } else {
        const message = axios.isAxiosError(err)
          ? err.response?.data?.error?.message
          : null;
        setError(message || 'Sign in failed. Try again.');
      }
    }
  };

  return (
    <AuthSheetLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-2xl" role="alert">
            {error}
          </p>
        )}

        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          labelAction={
            <Link to="/forgot-password" className="text-sm text-primary-600 font-semibold hover:underline whitespace-nowrap">
              Forgot password?
            </Link>
          }
          {...register('password')}
        />

        <div className="pt-1">
          <AuthSubmitButton loading={isSubmitting}>
            Sign In
          </AuthSubmitButton>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-bold text-primary-600 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthSheetLayout>
  );
}
