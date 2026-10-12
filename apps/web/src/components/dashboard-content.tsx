'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import type { Idea } from '@prvo/shared';

export function DashboardContent() {
  const { usage, refreshMe } = useAuth();
  const { toast } = useToast();
  const [ideas, setIdeas] = React.useState<Idea[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'draft' | 'archived'>('all');

  // Dialog state
  const [dialogAction, setDialogAction] = React.useState<{
    type: 'archive' | 'restore' | 'delete';
    idea: Idea;
  } | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const fetchIdeas = React.useCallback(async () => {
    try {
      const url = statusFilter === 'all' ? '/ideas' : `/ideas?status=${statusFilter}`;
      const data = await apiFetch<{ ideas: Idea[] }>(url);
      setIdeas(data.ideas);
    } catch {
      toast('Failed to load ideas', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  React.useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleConfirmAction = async () => {
    if (!dialogAction) return;
    setIsProcessing(true);
    const { type, idea } = dialogAction;

    try {
      if (type === 'archive') {
        await apiFetch(`/ideas/${idea.id}/archive`, { method: 'POST' });
        toast(`"${idea.title}" archived.`, 'success');
      } else if (type === 'restore') {
        await apiFetch(`/ideas/${idea.id}/restore`, { method: 'POST' });
        toast(`"${idea.title}" restored.`, 'success');
      } else if (type === 'delete') {
        await apiFetch(`/ideas/${idea.id}`, { method: 'DELETE' });
        toast(`"${idea.title}" deleted.`, 'success');
      }
      setDialogAction(null);
      await fetchIdeas();
      await refreshMe();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const isLimitReached = usage ? usage.activeIdeas >= usage.limit : false;

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header & Usage */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-border">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-bold text-ink">Dashboard</h1>
            <p className="text-sm text-ink-muted">
              {usage ? (
                <span className="font-mono">
                  {usage.activeIdeas} of {usage.limit} ideas used
                </span>
              ) : (
                'Track your validation verdicts and demand signals.'
              )}
            </p>
          </div>

          <div>
            {isLimitReached ? (
              <div className="flex flex-col sm:items-end gap-1">
                <Button variant="primary" disabled className="opacity-50 cursor-not-allowed">
                  New Idea
                </Button>
                <p className="text-xs text-ink-muted">
                  You have used all {usage?.limit} ideas on the free plan.
                </p>
              </div>
            ) : (
              <Link href="/ideas/new">
                <Button variant="primary" className="bg-vermilion hover:bg-vermilion/90">
                  New Idea
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 text-xs font-medium border-b border-stone-border pb-3">
          {(['all', 'active', 'draft', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-md capitalize transition-colors ${
                statusFilter === tab
                  ? 'bg-ink text-paper font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-stone/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Ideas Grid or Empty State */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-ink-muted">Loading your ideas...</div>
        ) : ideas.length === 0 ? (
          <div className="p-12 text-center rounded-md border border-stone-border bg-paper space-y-4 max-w-md mx-auto my-8">
            <div className="w-10 h-10 rounded-full bg-stone/40 text-ink mx-auto flex items-center justify-center font-serif text-lg font-bold">
              P
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-semibold text-ink">No ideas found</h3>
              <p className="text-sm text-ink-muted">
                {statusFilter === 'all'
                  ? 'Submit your first startup idea to begin evidence-based validation.'
                  : `No ideas found in "${statusFilter}".`}
              </p>
            </div>
            {statusFilter === 'all' && !isLimitReached && (
              <Link href="/ideas/new">
                <Button variant="primary" className="bg-vermilion hover:bg-vermilion/90">
                  Create your first idea
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea) => {
              const currentVer = idea.currentVersion || idea.current_version;
              return (
                <Card key={idea.id} className="flex flex-col justify-between border-stone-border hover:border-ink/30 transition-all">
                  <CardHeader className="space-y-2 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={idea.status === 'active' ? 'primary' : 'outline'} className="capitalize text-xs">
                          {idea.status}
                        </Badge>
                        {currentVer && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {currentVer.stage.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono text-ink-muted">
                        {new Date(idea.createdAt || idea.created_at || Date.now()).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <CardTitle className="font-serif text-lg text-ink line-clamp-2">
                      <Link href={`/ideas/${idea.id}`} className="hover:text-vermilion transition-colors">
                        {idea.title}
                      </Link>
                    </CardTitle>

                    {currentVer && (
                      <p className="text-xs text-ink-muted line-clamp-3">
                        {currentVer.problem}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-4">
                    {/* Plain honest score label */}
                    <div className="pt-3 border-t border-stone-border/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-ink-muted">Validation score:</span>
                      <span className="text-ink-muted">No score yet</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link href={`/ideas/${idea.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          View & Edit
                        </Button>
                      </Link>

                      {idea.status === 'archived' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-verdigris hover:text-verdigris/80"
                          onClick={() => setDialogAction({ type: 'restore', idea })}
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-ink-muted hover:text-ink"
                          onClick={() => setDialogAction({ type: 'archive', idea })}
                        >
                          Archive
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 text-vermilion hover:text-vermilion/80"
                        onClick={() => setDialogAction({ type: 'delete', idea })}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={Boolean(dialogAction)}
          onClose={() => setDialogAction(null)}
          onConfirm={handleConfirmAction}
          isLoading={isProcessing}
          variant={dialogAction?.type === 'delete' ? 'danger' : 'default'}
          title={
            dialogAction?.type === 'archive'
              ? 'Archive idea'
              : dialogAction?.type === 'restore'
              ? 'Restore idea'
              : 'Delete idea'
          }
          description={
            dialogAction?.type === 'archive'
              ? `Are you sure you want to archive "${dialogAction?.idea.title}"? This will free up an active idea slot.`
              : dialogAction?.type === 'restore'
              ? `Restore "${dialogAction?.idea.title}" to active status? This consumes an active idea slot.`
              : `Permanently delete "${dialogAction?.idea.title}"? This action cannot be undone.`
          }
          confirmLabel={
            dialogAction?.type === 'archive'
              ? 'Archive'
              : dialogAction?.type === 'restore'
              ? 'Restore'
              : 'Delete'
          }
        />
      </main>
    </div>
  );
}
