import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useAuthStore, useBusinessStore } from '../stores';
import { businessApi } from '../api';
import { cn } from '../lib/utils';

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

  const onSocial = (provider: string) => {
    setError(`${provider} sign-in isn’t available yet. Use your email and password.`);
  };

  return (
    <div className="min-h-dvh bg-[#e6eaf2] dark:bg-[#10131c] sm:overflow-y-auto sm:flex sm:justify-center">
      <div className="sm:my-auto sm:w-full sm:max-w-[430px] sm:py-8">
        <div
          className={cn(
            'relative flex min-h-dvh flex-col px-7 pb-8 pt-6',
            'bg-[linear-gradient(180deg,#d7e4ff_0%,#eef3ff_24%,#f6f8fc_58%,#f4f6fb_100%)]',
            'dark:bg-[linear-gradient(180deg,#1a2440_0%,#141a2c_40%,#10131c_100%)]',
            'sm:min-h-[720px] sm:rounded-[2.75rem] sm:border sm:border-white/80 sm:px-8 sm:pb-10 sm:pt-8',
            'sm:shadow-[0_28px_70px_-24px_rgba(20,20,20,0.45),0_10px_28px_-16px_rgba(20,20,20,0.18)]',
            'dark:sm:border-white/10'
          )}
        >
          <ThemeToggle className="absolute right-4 top-4 z-10 text-stone-500 hover:bg-white/70 dark:text-stone-300 dark:hover:bg-white/10 sm:right-5 sm:top-5" />

          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-7 flex flex-col items-center">
              <BrandMark />
              <p className="mt-2 text-[1.65rem] font-extrabold tracking-tight text-primary-600 dark:text-primary-300">
                Voki
              </p>
            </div>

            <div className="mb-7 text-center">
              <h1 className="text-[1.45rem] font-bold tracking-tight text-neutral-900 dark:text-white">
                Welcome Back to Voki
              </h1>
              <p className="mx-auto mt-2 max-w-[16rem] text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                Enter valid email &amp; password
                <br />
                to continue
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300" role="alert">
                  {error}
                </p>
              )}

              <LoginField
                label="Email"
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                icon={<Mail size={18} strokeWidth={1.75} />}
                error={errors.email?.message}
                {...register('email')}
              />

              <LoginField
                label="Password"
                type="password"
                placeholder="Enter Password"
                autoComplete="current-password"
                icon={<Lock size={18} strokeWidth={1.75} />}
                error={errors.password?.message}
                {...register('password')}
              />

              <div className="flex items-center justify-between gap-3 pt-0.5">
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-[18px] cursor-pointer rounded-[5px] border border-neutral-300 bg-white accent-primary-600 dark:border-neutral-600 dark:bg-neutral-900"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'mt-2 w-full rounded-full bg-primary-600 py-3.5 text-[15px] font-bold text-white',
                  'shadow-[0_10px_24px_-10px_rgba(59,95,230,0.85)]',
                  'transition-transform hover:bg-primary-700 active:scale-[0.99]',
                  'disabled:cursor-not-allowed disabled:opacity-70'
                )}
              >
                {isSubmitting ? 'Please wait...' : 'Log In'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-4">
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
          </div>

          <p className="mt-8 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
            Haven&apos;t any account?{' '}
            <Link to="/register" className="font-bold text-primary-600 hover:underline dark:text-primary-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden>
      <rect x="17" y="7" width="26" height="20" rx="4.5" stroke="#3b5fe6" strokeWidth="2.15" />
      <path d="M23 14.2h14M23 18.6h8.5" stroke="#3b5fe6" strokeWidth="2" strokeLinecap="round" />
      <rect x="9" y="21" width="30" height="24" rx="5" className="fill-[#eef3ff] dark:fill-[#141a2c]" stroke="#3b5fe6" strokeWidth="2.15" />
      <path d="M16 30.2h16M16 35.4h10" stroke="#3b5fe6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.3 5.5l6.3 5.3C38.2 36.8 44 32 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="fill-neutral-900 dark:fill-white">
      <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.2 2.8-2.3c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.4-.9-2.5-3.8zM14.8 6.2c.6-.8 1.1-1.9.9-3-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.5 2.9-1.3z" />
    </svg>
  );
}

function SocialButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-neutral-800',
        'shadow-[0_8px_20px_-12px_rgba(30,30,30,0.45),0_1px_2px_rgba(30,30,30,0.04)]',
        'transition-transform hover:bg-white active:scale-[0.99]',
        'dark:bg-neutral-900 dark:text-neutral-100 dark:shadow-none dark:ring-1 dark:ring-white/10'
      )}
    >
      {children}
      {label}
    </button>
  );
}

interface LoginFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

function LoginField({ label, icon, error, className, type, id, ref, ...props }: LoginFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block px-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
          {icon}
        </span>
        <input
          ref={ref}
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          className={cn(
            'h-[52px] w-full rounded-full border-0 bg-white pl-11 text-sm text-neutral-900 outline-none',
            'shadow-[0_8px_22px_-14px_rgba(59,95,230,0.45),0_1px_2px_rgba(15,23,42,0.04)]',
            'placeholder:text-neutral-400',
            'focus:ring-2 focus:ring-primary-500/40',
            'dark:bg-neutral-900 dark:text-white dark:shadow-none dark:ring-1 dark:ring-white/10',
            isPassword ? 'pr-12' : 'pr-5',
            error && 'ring-2 ring-red-300',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        )}
      </div>
      {error && <p className="px-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
