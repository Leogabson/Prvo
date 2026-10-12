'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@prvo/shared';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import { useToast } from '@/components/ui/toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  const { login, user } = useAuth();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  React.useEffect(() => {
    if (user) {
      router.push(returnTo);
    }
  }, [user, router, returnTo]);

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      await login(data);
      toast('Signed in successfully.', 'success');
      router.push(returnTo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setServerError(msg);
      toast(msg, 'error');
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-serif text-2xl font-bold text-ink">Welcome back</h1>
        <p className="text-sm text-ink-muted">Sign in to your Prvo account.</p>
      </div>

      {serverError && (
        <div className="p-3 text-sm rounded-md border border-vermilion/40 bg-[#FFF5F2] text-vermilion" role="alert">
          {serverError}
        </div>
      )}

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-verdigris hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-vermilion">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full bg-vermilion hover:bg-vermilion/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-xs text-ink-muted">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-verdigris hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <React.Suspense fallback={<div className="text-sm text-ink-muted">Loading...</div>}>
          <LoginForm />
        </React.Suspense>
      </main>
    </div>
  );
}
