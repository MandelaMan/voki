import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthField, AuthSubmitButton } from '../components/auth/AuthField';
import { AuthSheetLayout } from '../components/layout/AuthSheetLayout';
import { authApi } from '../api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ password: string }>();

  const onSubmit = async (data: { password: string }) => {
    const token = searchParams.get('token') || '';
    await authApi.resetPassword(token, data.password);
    setDone(true);
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <AuthSheetLayout
      title="Reset Password"
      subtitle="Choose a new secure password for your account."
    >
      {done ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 rounded-2xl">
          Password reset! Redirecting to login…
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AuthField
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            {...register('password', { required: true, minLength: 8 })}
          />
          <div className="pt-2">
            <AuthSubmitButton loading={isSubmitting}>
              Reset Password
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
