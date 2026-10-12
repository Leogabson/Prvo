'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateIdeaSchema,
  type UpdateIdeaInput,
  BUSINESS_MODELS,
  IDEA_STAGES,
  INDUSTRIES,
  type Idea,
  type IdeaVersion,
} from '@prvo/shared';
import { useAuth, ProtectedRoute } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Navbar } from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

function IdeaDetailContent() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { toast } = useToast();
  const { refreshMe } = useAuth();

  const [idea, setIdea] = React.useState<Idea | null>(null);
  const [currentVersion, setCurrentVersion] = React.useState<IdeaVersion | null>(null);
  const [versions, setVersions] = React.useState<IdeaVersion[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateIdeaInput>({
    resolver: zodResolver(updateIdeaSchema),
  });

  const selectedIndustry = watch('industry');
  const titleVal = watch('title') || '';
  const problemVal = watch('problem') || '';
  const targetVal = watch('target_customer') || '';
  const solutionVal = watch('solution') || '';
  const regionVal = watch('region') || '';

  const populateForm = React.useCallback((v: IdeaVersion | null, currentIdea: Idea | null) => {
    if (!v) return;
    reset({
      title: v.title,
      problem: v.problem,
      target_customer: v.targetCustomer || v.target_customer || '',
      solution: v.solution,
      business_model: (v.businessModel || v.business_model || 'subscription'),
      business_model_note: v.businessModelNote || v.business_model_note || '',
      stage: v.stage,
      industry: v.industry,
      industry_other: v.industryOther || v.industry_other || '',
      region: v.region,
      status: currentIdea?.status === 'archived' ? 'active' : ((currentIdea?.status as 'draft' | 'active') || 'active'),
    });
  }, [reset]);

  const loadData = React.useCallback(async () => {
    if (!id) return;
    try {
      const [ideaData, versionsData] = await Promise.all([
        apiFetch<{ idea: Idea; currentVersion: IdeaVersion | null }>(`/ideas/${id}`),
        apiFetch<{ versions: IdeaVersion[] }>(`/ideas/${id}/versions`),
      ]);

      setIdea(ideaData.idea);
      setCurrentVersion(ideaData.currentVersion);
      setVersions(versionsData.versions);

      if (ideaData.currentVersion) {
        populateForm(ideaData.currentVersion, ideaData.idea);
      }
    } catch {
      toast('Failed to load idea details', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, populateForm, toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (isEditing && currentVersion) {
      populateForm(currentVersion, idea);
    }
  }, [isEditing, currentVersion, idea, populateForm]);

  const onUpdateSubmit = async (data: UpdateIdeaInput) => {
    try {
      const res = await apiFetch<{ idea: Idea; currentVersion: IdeaVersion }>(`/ideas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      toast(`Saved as Version ${res.currentVersion.versionNumber}`, 'success');
      setIsEditing(false);
      await loadData();
      await refreshMe();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast(msg, 'error');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiFetch(`/ideas/${id}`, { method: 'DELETE' });
      toast('Idea deleted', 'success');
      await refreshMe();
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast(msg, 'error');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!idea) return;
    try {
      if (idea.status === 'archived') {
        await apiFetch(`/ideas/${id}/restore`, { method: 'POST' });
        toast('Idea restored to active status', 'success');
      } else {
        await apiFetch(`/ideas/${id}/archive`, { method: 'POST' });
        toast('Idea moved to archive', 'success');
      }
      await loadData();
      await refreshMe();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast(msg, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-ink-muted">
        Loading idea details...
      </div>
    );
  }

  if (!idea || !currentVersion) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="font-serif text-xl font-bold text-ink">Idea not found</h2>
        <p className="text-sm text-ink-muted">This idea does not exist or has been removed.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-border">
        <div className="space-y-1">
          <div className="text-xs text-ink-muted mb-1">
            <Link href="/dashboard" className="hover:text-ink">
              ← Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl font-bold text-ink">{idea.title}</h1>
            <Badge variant={idea.status === 'active' ? 'primary' : 'outline'} className="capitalize text-xs">
              {idea.status}
            </Badge>
            <Badge variant="outline" className="capitalize text-xs">
              {currentVersion.stage.replace('_', ' ')}
            </Badge>
            <span className="text-xs font-mono text-ink-muted">
              v{currentVersion.versionNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit Idea
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleArchive}
            className="text-xs text-ink-muted hover:text-ink"
          >
            {idea.status === 'archived' ? 'Restore' : 'Archive'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-xs text-vermilion hover:text-vermilion/80"
          >
            Delete
          </Button>
        </div>
      </div>

      {isEditing ? (
        /* Edit Mode: Creates New Version */
        <div className="space-y-6 bg-paper p-6 rounded-md border border-stone-border">
          <div className="flex items-center justify-between pb-3 border-b border-stone-border">
            <h2 className="font-serif text-lg font-semibold text-ink">
              Create Version {(currentVersion.versionNumber ?? currentVersion.version_number ?? 1) + 1}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>

          <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Working Title</Label>
                <span className="text-xs font-mono text-ink-muted">{titleVal.length} / 120</span>
              </div>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-xs text-vermilion">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="problem">Customer Problem</Label>
                <span className="text-xs font-mono text-ink-muted">{problemVal.length} / 1000</span>
              </div>
              <Textarea id="problem" rows={4} {...register('problem')} />
              {errors.problem && <p className="text-xs text-vermilion">{errors.problem.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="target_customer">Target Customer</Label>
                <span className="text-xs font-mono text-ink-muted">{targetVal.length} / 500</span>
              </div>
              <Input id="target_customer" {...register('target_customer')} />
              {errors.target_customer && <p className="text-xs text-vermilion">{errors.target_customer.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="solution">Proposed Solution</Label>
                <span className="text-xs font-mono text-ink-muted">{solutionVal.length} / 1500</span>
              </div>
              <Textarea id="solution" rows={4} {...register('solution')} />
              {errors.solution && <p className="text-xs text-vermilion">{errors.solution.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="business_model">Business Model</Label>
                <Select id="business_model" {...register('business_model')}>
                  {BUSINESS_MODELS.map((m) => (
                    <option key={m} value={m} className="capitalize">
                      {m.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stage">Current Stage</Label>
                <Select id="stage" {...register('stage')}>
                  {IDEA_STAGES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="business_model_note">Pricing or Revenue Note (optional)</Label>
              <Input id="business_model_note" {...register('business_model_note')} />
            </div>

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
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="region">Geographic Focus</Label>
                  <span className="text-xs font-mono text-ink-muted">{regionVal.length} / 80</span>
                </div>
                <Input id="region" {...register('region')} />
                {errors.region && <p className="text-xs text-vermilion">{errors.region.message}</p>}
              </div>
            </div>

            {selectedIndustry === 'other' && (
              <div className="space-y-1.5">
                <Label htmlFor="industry_other">Custom Industry</Label>
                <Input id="industry_other" {...register('industry_other')} />
                {errors.industry_other && <p className="text-xs text-vermilion">{errors.industry_other.message}</p>}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-border">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="bg-vermilion hover:bg-vermilion/90"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Saving version...'
                  : `Save as Version ${(currentVersion.versionNumber ?? currentVersion.version_number ?? 1) + 1}`}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* Read View */
        <div className="space-y-6">
          {/* Main Attributes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-stone-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase tracking-wider text-ink-muted font-mono">
                  Customer Problem
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {currentVersion.problem}
              </CardContent>
            </Card>

            <Card className="border-stone-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase tracking-wider text-ink-muted font-mono">
                  Proposed Solution
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {currentVersion.solution}
              </CardContent>
            </Card>
          </div>

          {/* Secondary Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-md border border-stone-border bg-paper text-xs">
            <div className="space-y-1">
              <div className="text-ink-muted uppercase font-mono">Target Customer</div>
              <div className="text-ink font-medium">{currentVersion.targetCustomer}</div>
            </div>
            <div className="space-y-1">
              <div className="text-ink-muted uppercase font-mono">Business Model</div>
              <div className="text-ink font-medium capitalize">
                {((currentVersion.businessModel || currentVersion.business_model) || 'other').replace('_', ' ')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-ink-muted uppercase font-mono">Industry</div>
              <div className="text-ink font-medium capitalize">
                {currentVersion.industry === 'other'
                  ? currentVersion.industryOther || 'Other'
                  : currentVersion.industry.replace('_', ' ')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-ink-muted uppercase font-mono">Geographic Focus</div>
              <div className="text-ink font-medium">{currentVersion.region}</div>
            </div>
          </div>

          {/* Validation Score Status */}
          <div className="p-4 rounded-md border border-stone-border bg-paper flex items-center justify-between text-xs font-mono">
            <span className="text-ink-muted">Evidence & Analysis Verdict:</span>
            <span className="text-ink-muted font-semibold">No score yet</span>
          </div>

          {/* Version History List */}
          <div className="space-y-3 pt-4 border-t border-stone-border">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-ink">Version History</h2>
              <span className="text-xs font-mono text-ink-muted">
                {versions.length} {versions.length === 1 ? 'version' : 'versions'}
              </span>
            </div>

            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-md border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                    v.id === currentVersion.id
                      ? 'border-ink/40 bg-stone/20'
                      : 'border-stone-border bg-paper'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-ink">Version {v.versionNumber}</span>
                      {v.id === currentVersion.id && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          Current
                        </Badge>
                      )}
                      <span className="font-semibold text-ink">{v.title}</span>
                    </div>
                    <p className="text-ink-muted line-clamp-1">{v.problem}</p>
                  </div>

                  <span className="font-mono text-ink-muted whitespace-nowrap">
                    {v.createdAt || v.created_at
                      ? new Date(v.createdAt || v.created_at!).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        variant="danger"
        title="Delete idea"
        description={`Permanently delete "${idea.title}"? This will remove all versions and history.`}
        confirmLabel="Delete permanently"
      />
    </div>
  );
}

export default function IdeaDetailPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-paper">
        <Navbar />
        <main className="flex-1">
          <IdeaDetailContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}
