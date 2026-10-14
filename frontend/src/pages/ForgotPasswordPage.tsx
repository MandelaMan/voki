import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail } from 'lucide-react';
import { AuthPillField, AuthPrimaryButton, AuthScreen } from '../components/auth/AuthScreen';
import { Form } from '../components/ui/Form';
import { authApi } from '../api';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string }>();

  const onSubmit = async (data: { email: string }) => {
    setError('');
    try {
      const result = await authApi.forgotPassword(data.email);
      setSent(true);
      if (result.resetToken) setResetToken(result.resetToken);
    } catch {
      setError('Could not send a reset link. Check the email and try again.');
    }
  };

  return (
    <AuthScreen
      title="Forgot Password"
      subtitle="We'll email you a reset link"
      footer={
        <>
          Remember your password?{' '}
          <Link to="/login" className="font-bold text-primary-600 hover:underline dark:text-primary-300">
            Sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-3.5">
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            If an account exists for that email, a reset link has been sent.
          </p>
          {resetToken && (
            <p className="rounded-2xl bg-white px-3 py-2 text-xs break-all text-neutral-600 shadow-[0_8px_22px_-14px_rgba(59,95,230,0.45)] dark:bg-neutral-900 dark:text-neutral-300 dark:ring-1 dark:ring-white/10">
              Dev token:{' '}
              <Link to={`/reset-password?token=${resetToken}`} className="font-semibold text-primary-600 hover:underline dark:text-primary-300">
                {resetToken.slice(0, 20)}...
              </Link>
            </p>
          )}
        </div>
      ) : (
        <Form busy={isSubmitting} onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
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
            {...register('email', { required: true })}
          />
          <AuthPrimaryButton loading={isSubmitting}>Send Reset Link</AuthPrimaryButton>
        </Form>
      )}
    </AuthScreen>
  );
}
