'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateMeSchema, type UpdateMeInput } from '@prvo/shared';
import { useAuth, ProtectedRoute } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Navbar } from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

function SettingsContent() {
  const { user, usage, refreshMe } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateMeInput>({
    resolver: zodResolver(updateMeSchema),
    defaultValues: {
      name: user?.name || '',
      avatar_url: user?.avatar_url || '',
    },
  });

  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UpdateMeInput) => {
    try {
      await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      await refreshMe();
      toast('Profile updated successfully.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      toast(msg, 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="space-y-1 pb-4 border-b border-stone-border">
        <h1 className="font-serif text-2xl font-bold text-ink">Account Settings</h1>
        <p className="text-sm text-ink-muted">Manage your profile details and view subscription limits.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Details Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-paper p-5 rounded-md border border-stone-border">
          <h2 className="font-serif text-base font-semibold text-ink">Profile Information</h2>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-stone/20 cursor-not-allowed opacity-75" />
            <p className="text-xs text-ink-muted">Account email address cannot be changed.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" placeholder="Your name" {...register('name')} />
            {errors.name && <p className="text-xs text-vermilion">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input id="avatar_url" placeholder="https://example.com/avatar.jpg" {...register('avatar_url')} />
            {errors.avatar_url && <p className="text-xs text-vermilion">{errors.avatar_url.message}</p>}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              className="bg-vermilion hover:bg-vermilion/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving changes...' : 'Save changes'}
            </Button>
          </div>
        </form>

        {/* Subscription & Plan Status */}
        <div className="bg-paper p-5 rounded-md border border-stone-border space-y-3">
          <h2 className="font-serif text-base font-semibold text-ink">Plan & Limits</h2>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-ink-muted">Current Plan:</span>
              <div className="text-ink font-semibold uppercase">{user?.plan || 'Free'}</div>
            </div>
            <div className="space-y-1">
              <span className="text-ink-muted">Active Ideas:</span>
              <div className="text-ink font-semibold">
                {usage?.activeIdeas ?? 0} / {usage?.limit ?? 3}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-paper">
        <Navbar />
        <main className="flex-1">
          <SettingsContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}
