import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock } from 'lucide-react';
import { AuthPillField, AuthPrimaryButton, AuthScreen } from '../components/auth/AuthScreen';
import { PasswordStrength } from '../components/auth/PasswordStrength';
import { Form } from '../components/ui/Form';
import { authApi } from '../api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<{ password: string }>();
  const password = watch('password') || '';

  const onSubmit = async (data: { password: string }) => {
    setError('');
    try {
      const token = searchParams.get('token') || '';
      await authApi.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Could not reset the password. Request a new link and try again.');
    }
  };

  return (
    <AuthScreen
      title="Reset Password"
      subtitle="Choose a new password"
      footer={
        <>
          Remember your password?{' '}
          <Link to="/login" className="font-bold text-primary-600 hover:underline dark:text-primary-300">
            Sign in
          </Link>
        </>
      }
    >
      {done ? (
        <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Your password has been reset. Taking you back to sign in…
        </p>
      ) : (
        <Form busy={isSubmitting} onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          <AuthPillField
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            icon={<Lock size={16} strokeWidth={1.75} />}
            {...register('password', { required: true, minLength: 8 })}
          />
          <PasswordStrength password={password} />
          <AuthPrimaryButton loading={isSubmitting}>Reset Password</AuthPrimaryButton>
        </Form>
      )}
    </AuthScreen>
  );
}
