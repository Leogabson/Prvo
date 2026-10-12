'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createIdeaSchema,
  type CreateIdeaInput,
  BUSINESS_MODELS,
  IDEA_STAGES,
  INDUSTRIES,
} from '@prvo/shared';
import { useAuth, ProtectedRoute } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Navbar } from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

function NewIdeaForm() {
  const router = useRouter();
  const { usage, refreshMe } = useAuth();
  const { toast } = useToast();
  const [submitStatus, setSubmitStatus] = React.useState<'draft' | 'active'>('active');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateIdeaInput>({
    resolver: zodResolver(createIdeaSchema),
    defaultValues: {
      title: '',
      problem: '',
      target_customer: '',
      solution: '',
      business_model: 'subscription',
      stage: 'idea_only',
      industry: 'b2b_saas',
      region: '',
      status: 'active',
    },
  });

  const selectedIndustry = watch('industry');
  const titleVal = watch('title') || '';
  const problemVal = watch('problem') || '';
  const targetVal = watch('target_customer') || '';
  const solutionVal = watch('solution') || '';
  const regionVal = watch('region') || '';

  const isLimitReached = usage ? usage.activeIdeas >= usage.limit : false;

  const onSubmit = async (data: CreateIdeaInput) => {
    try {
      const payload = { ...data, status: submitStatus };
      const res = await apiFetch<{ idea: { id: string; title: string } }>('/ideas', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast(`"${res.idea.title}" saved successfully.`, 'success');
      await refreshMe();
      router.push(`/ideas/${res.idea.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save idea';
      toast(msg, 'error');
    }
  };

  if (isLimitReached) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-ink">Plan limit reached</h2>
        <p className="text-sm text-ink-muted">
          You have reached your limit of {usage?.limit} active ideas on the free plan. Archive an existing idea from your dashboard to free up a slot.
        </p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="space-y-1 pb-4 border-b border-stone-border">
        <div className="text-xs text-ink-muted mb-1">
          <Link href="/dashboard" className="hover:text-ink">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="font-serif text-2xl font-bold text-ink">Submit Startup Idea</h1>
        <p className="text-sm text-ink-muted">
          Define the customer problem and proposed solution to establish your validation baseline.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Working Title</Label>
            <span className="text-xs font-mono text-ink-muted">{titleVal.length} / 120</span>
          </div>
          <Input
            id="title"
            placeholder="e.g. Stripe for Micro-Consultants"
            {...register('title')}
          />
          <p className="text-xs text-ink-muted">Short, recognizable working title for your startup idea.</p>
          {errors.title && <p className="text-xs text-vermilion">{errors.title.message}</p>}
        </div>

        {/* Problem */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="problem">Customer Problem</Label>
            <span className="text-xs font-mono text-ink-muted">{problemVal.length} / 1000</span>
          </div>
          <Textarea
            id="problem"
            rows={4}
            placeholder="What exact pain point or operational bottleneck is your customer experiencing?"
            {...register('problem')}
          />
          <p className="text-xs text-ink-muted">The specific pain or inefficiency your customers experience (min 20 chars).</p>
          {errors.problem && <p className="text-xs text-vermilion">{errors.problem.message}</p>}
        </div>

        {/* Target Customer */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="target_customer">Target Customer</Label>
            <span className="text-xs font-mono text-ink-muted">{targetVal.length} / 500</span>
          </div>
          <Input
            id="target_customer"
            placeholder="e.g. Solo accountants with 10-50 small business clients"
            {...register('target_customer')}
          />
          <p className="text-xs text-ink-muted">Who feels this problem most acutely and will pay for a solution? (min 10 chars).</p>
          {errors.target_customer && <p className="text-xs text-vermilion">{errors.target_customer.message}</p>}
        </div>

        {/* Solution */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="solution">Proposed Solution</Label>
            <span className="text-xs font-mono text-ink-muted">{solutionVal.length} / 1500</span>
          </div>
          <Textarea
            id="solution"
            rows={4}
            placeholder="How does your product solve this problem better than existing alternatives?"
            {...register('solution')}
          />
          <p className="text-xs text-ink-muted">Your proposed product or workflow that solves the problem (min 20 chars).</p>
          {errors.solution && <p className="text-xs text-vermilion">{errors.solution.message}</p>}
        </div>

        {/* Business Model & Stage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="business_model">Business Model</Label>
            <Select id="business_model" {...register('business_model')}>
              {BUSINESS_MODELS.map((model) => (
                <option key={model} value={model} className="capitalize">
                  {model.replace('_', ' ')}
                </option>
              ))}
            </Select>
            <p className="text-xs text-ink-muted">How you plan to charge or capture value.</p>
            {errors.business_model && <p className="text-xs text-vermilion">{errors.business_model.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stage">Current Stage</Label>
            <Select id="stage" {...register('stage')}>
              {IDEA_STAGES.map((stg) => (
                <option key={stg} value={stg} className="capitalize">
                  {stg.replace('_', ' ')}
                </option>
              ))}
            </Select>
            <p className="text-xs text-ink-muted">Your current development or validation phase.</p>
            {errors.stage && <p className="text-xs text-vermilion">{errors.stage.message}</p>}
          </div>
        </div>

        {/* Business Model Note */}
        <div className="space-y-1.5">
          <Label htmlFor="business_model_note">Pricing or Revenue Note (optional)</Label>
          <Input
            id="business_model_note"
            placeholder="e.g. $49/mo flat pricing or 1% take rate on transactions"
            {...register('business_model_note')}
          />
          <p className="text-xs text-ink-muted">Optional details regarding your monetization assumptions.</p>
        </div>

        {/* Industry & Region */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Select id="industry" {...register('industry')}>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind} className="capitalize">
                  {ind.replace('_', ' ')}
                </option>
              ))}
            </Select>
            <p className="text-xs text-ink-muted">Primary market sector.</p>
            {errors.industry && <p className="text-xs text-vermilion">{errors.industry.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="region">Geographic Focus</Label>
              <span className="text-xs font-mono text-ink-muted">{regionVal.length} / 80</span>
            </div>
            <Input
              id="region"
              placeholder="e.g. United States, Global, UK & EU"
              {...register('region')}
            />
            <p className="text-xs text-ink-muted">Geographic market you are focusing on initially (2 to 80 chars).</p>
            {errors.region && <p className="text-xs text-vermilion">{errors.region.message}</p>}
          </div>
        </div>

        {/* Industry Other input if industry === 'other' */}
        {selectedIndustry === 'other' && (
          <div className="space-y-1.5">
            <Label htmlFor="industry_other">Custom Industry</Label>
            <Input
              id="industry_other"
              placeholder="Please specify your market sector"
              {...register('industry_other')}
            />
            {errors.industry_other && <p className="text-xs text-vermilion">{errors.industry_other.message}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-border">
          <Button
            type="submit"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setSubmitStatus('draft')}
          >
            Save draft
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-vermilion hover:bg-vermilion/90"
            disabled={isSubmitting}
            onClick={() => setSubmitStatus('active')}
          >
            {isSubmitting ? 'Saving idea...' : 'Save idea'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewIdeaPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-paper">
        <Navbar />
        <main className="flex-1">
          <NewIdeaForm />
        </main>
      </div>
    </ProtectedRoute>
  );
}
