'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@prvo/shared';
import { apiFetch } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  React.useEffect(() => {
    if (token) {
      setValue('token', token);
    }
  }, [token, setValue]);

  const onSubmit = async (data: ResetPasswordInput) => {
    setErrorMsg(null);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setSuccess(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid or expired reset token');
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="font-serif text-2xl font-bold text-ink">Invalid link</h1>
        <p className="text-sm text-ink-muted">
          This password reset link is missing a valid token. Please request a new link.
        </p>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            Request new link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-serif text-2xl font-bold text-ink">Set new password</h1>
        <p className="text-sm text-ink-muted">Choose a strong password for your account.</p>
      </div>

      {errorMsg && (
        <div className="p-3 text-sm rounded-md border border-vermilion/40 bg-[#FFF5F2] text-vermilion" role="alert">
          {errorMsg}
        </div>
      )}

      {success ? (
        <div className="space-y-4">
          <div className="p-4 rounded-md border border-stone-border bg-[#F2F8F6] text-sm text-ink space-y-2">
            <p className="font-medium text-verdigris">Password updated</p>
            <p className="text-xs text-ink-muted">
              Your password has been changed successfully. You can now log in with your new credentials.
            </p>
          </div>
          <Link href="/login">
            <Button variant="primary" className="w-full bg-vermilion hover:bg-vermilion/90">
              Log in now
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('token')} />

          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 10 characters"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-vermilion">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-ink-muted">Must be at least 10 characters long.</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full bg-vermilion hover:bg-vermilion/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving password...' : 'Save new password'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <React.Suspense fallback={<div className="text-sm text-ink-muted">Loading...</div>}>
          <ResetPasswordForm />
        </React.Suspense>
      </main>
    </div>
  );
}
