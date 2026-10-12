'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@prvo/shared';
import { apiFetch } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      // Intentionally show generic message even on error
    } finally {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="font-serif text-2xl font-bold text-ink">Reset password</h1>
            <p className="text-sm text-ink-muted">Enter your account email to receive a recovery link.</p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 rounded-md border border-stone-border bg-[#F2F8F6] text-sm text-ink space-y-2">
                <p className="font-medium text-verdigris">Check your inbox</p>
                <p className="text-xs text-ink-muted">
                  If that email is registered, we have sent password reset instructions. The link is valid for 1 hour.
                </p>
              </div>
              <div className="text-center">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Return to log in
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="founder@example.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-vermilion">{errors.email.message}</p>}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-vermilion hover:bg-vermilion/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending instructions...' : 'Send reset instructions'}
              </Button>

              <p className="text-center text-xs text-ink-muted">
                Remember your password?{' '}
                <Link href="/login" className="text-verdigris hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
