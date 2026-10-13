import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Lock, Mail } from 'lucide-react';
import {
  AppleIcon,
  AuthPillField,
  AuthPrimaryButton,
  AuthScreen,
  GoogleIcon,
  SocialButton,
} from '../components/auth/AuthScreen';
import { useAuthStore, useBusinessStore } from '../stores';
import { businessApi } from '../api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { setBusinesses, setActiveBusiness } = useBusinessStore();
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await login(data.email, data.password);
      const businesses = await businessApi.list();
      setBusinesses(businesses);
      const signedIn = useAuthStore.getState().user;
      if (signedIn?.role === 'SUPER_ADMIN' && businesses.length === 0) {
        setActiveBusiness(null);
        navigate('/admin');
      } else if (businesses.length > 0) {
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

  const onSocial = (provider: string) => {
    setError(`${provider} sign-in isn’t available yet. Use your email and password.`);
  };

  return (
    <AuthScreen
      title="Welcome Back to Voki"
      subtitle="Enter valid email & password to continue"
      footer={
        <>
          Haven&apos;t any account?{' '}
          <Link to="/register" className="font-bold text-primary-600 hover:underline dark:text-primary-300">
            Sign up
          </Link>
          <span className="mt-2 block text-[12px]">
            <Link to="/privacy" className="font-semibold text-primary-600 hover:underline dark:text-primary-300">
              Privacy
            </Link>
            <span className="px-1.5 text-neutral-300">·</span>
            <Link to="/terms" className="font-semibold text-primary-600 hover:underline dark:text-primary-300">
              Terms
            </Link>
          </span>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {error && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        )}

        <AuthPillField
          label="Email"
          type="email"
          placeholder="Email Address"
          autoComplete="email"
          icon={<Mail size={16} strokeWidth={1.75} />}
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthPillField
          label="Password"
          type="password"
          placeholder="Enter Password"
          autoComplete="current-password"
          icon={<Lock size={16} strokeWidth={1.75} />}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 cursor-pointer rounded-[4px] border border-neutral-300 bg-white accent-primary-600 dark:border-neutral-600 dark:bg-neutral-900"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-[13px] font-semibold text-primary-600 hover:underline dark:text-primary-300"
          >
            Forgot password?
          </Link>
        </div>

        <AuthPrimaryButton loading={isSubmitting}>Log In</AuthPrimaryButton>
      </form>

      <div className="my-3 flex items-center gap-4">
        <span className="h-px flex-1 bg-neutral-300/80 dark:bg-white/15" />
        <span className="text-[11px] font-medium tracking-[0.16em] text-neutral-400">OR</span>
        <span className="h-px flex-1 bg-neutral-300/80 dark:bg-white/15" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SocialButton label="Google" onClick={() => onSocial('Google')}>
          <GoogleIcon />
        </SocialButton>
        <SocialButton label="Apple" onClick={() => onSocial('Apple')}>
          <AppleIcon />
        </SocialButton>
      </div>
    </AuthScreen>
  );
}
