import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthField, AuthSubmitButton } from '../components/auth/AuthField';
import { AuthSheetLayout } from '../components/layout/AuthSheetLayout';
import { authApi } from '../api';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string }>();

  const onSubmit = async (data: { email: string }) => {
    const result = await authApi.forgotPassword(data.email);
    setSent(true);
    if (result.resetToken) setResetToken(result.resetToken);
  };

  return (
    <AuthSheetLayout
      title="Forgot Password"
      subtitle="Enter your email and we'll send you a link to reset your password."
    >
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 rounded-2xl">
            If the email exists, a reset link has been sent.
          </p>
          {resetToken && (
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-4 text-sm break-all">
              Dev token:{' '}
              <Link to={`/reset-password?token=${resetToken}`} className="font-semibold text-primary-600 hover:underline">
                {resetToken.slice(0, 20)}...
              </Link>
            </div>
          )}
          <Link to="/login" className="block text-center text-sm font-bold text-primary-600 hover:underline">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AuthField
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email', { required: true })}
          />
          <div className="pt-2">
            <AuthSubmitButton loading={isSubmitting}>
              Send Reset Link
            </AuthSubmitButton>
          </div>
          <p className="text-center text-sm text-slate-500 pt-2">
            <Link to="/login" className="font-bold text-primary-600 hover:underline">
              Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthSheetLayout>
  );
}
