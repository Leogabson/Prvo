'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@prvo/shared';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import { useToast } from '@/components/ui/toast';

export default function SignupPage() {
  const router = useRouter();
  const { register: registerAuth, user } = useAuth();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  React.useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      await registerAuth(data);
      toast('Welcome to Prvo! Your account has been created.', 'success');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setServerError(msg);
      toast(msg, 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="font-serif text-2xl font-bold text-ink">Create your account</h1>
            <p className="text-sm text-ink-muted">Start validating startup ideas with evidence.</p>
          </div>

          {serverError && (
            <div className="p-3 text-sm rounded-md border border-vermilion/40 bg-[#FFF5F2] text-vermilion" role="alert">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ada Lovelace"
                autoComplete="name"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-vermilion">{errors.name.message}</p>}
            </div>

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
              <Label htmlFor="password">Password</Label>
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
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-xs text-ink-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-verdigris hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
