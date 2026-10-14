import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, User } from 'lucide-react';
import { AuthPillField, AuthPrimaryButton, AuthScreen } from '../components/auth/AuthScreen';
import { PasswordStrength } from '../components/auth/PasswordStrength';
import { Form } from '../components/ui/Form';
import { getApiErrorMessage } from '../lib/utils';
import { useAuthStore } from '../stores';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const password = watch('password') || '';

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await registerUser(data);
      navigate('/onboarding');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    }
  };

  return (
    <AuthScreen
      title="Create Account"
      subtitle="Track your stock and sales in one place"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary-600 hover:underline dark:text-primary-300">
            Sign in
          </Link>
        </>
      }
    >
      <Form busy={isSubmitting} onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {error && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          <AuthPillField
            label="First Name"
            placeholder="Jane"
            autoComplete="given-name"
            icon={<User size={16} strokeWidth={1.75} />}
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <AuthPillField
            label="Last Name"
            placeholder="Doe"
            autoComplete="family-name"
            icon={<User size={16} strokeWidth={1.75} />}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

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
          placeholder="At least 8 characters"
          autoComplete="new-password"
          icon={<Lock size={16} strokeWidth={1.75} />}
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordStrength password={password} />

        <p className="px-2 text-center text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
          By creating an account, you agree to the{' '}
          <Link to="/terms" className="font-semibold text-primary-600 hover:underline dark:text-primary-300">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="font-semibold text-primary-600 hover:underline dark:text-primary-300">
            Privacy Policy
          </Link>.
        </p>

        <AuthPrimaryButton loading={isSubmitting}>Create Account</AuthPrimaryButton>
      </Form>
    </AuthScreen>
  );
}
