import * as React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VerdictTier = 'brick' | 'ochre' | 'moss' | 'verdigris';

export interface VerdictConfig {
  tier: VerdictTier;
  rangeLabel: string;
  defaultLabel: string;
  icon: LucideIcon;
  colorClasses: string;
}

export const VERDICT_TIERS: Record<VerdictTier, VerdictConfig> = {
  brick: {
    tier: 'brick',
    rangeLabel: '0–39',
    defaultLabel: 'Critical Risk',
    icon: AlertOctagon,
    colorClasses:
      'border-verdict-brick text-verdict-brick bg-verdict-brick-bg',
  },
  ochre: {
    tier: 'ochre',
    rangeLabel: '40–59',
    defaultLabel: 'Uncertain Signal',
    icon: AlertTriangle,
    colorClasses:
      'border-verdict-ochre text-verdict-ochre bg-verdict-ochre-bg',
  },
  moss: {
    tier: 'moss',
    rangeLabel: '60–79',
    defaultLabel: 'Promising Signal',
    icon: CheckCircle2,
    colorClasses:
      'border-verdict-moss text-verdict-moss bg-verdict-moss-bg',
  },
  verdigris: {
    tier: 'verdigris',
    rangeLabel: '80–100',
    defaultLabel: 'Strong Proof',
    icon: ShieldCheck,
    colorClasses:
      'border-verdict-verdigris text-verdict-verdigris bg-verdict-verdigris-bg',
  },
};

export function getTierForScore(score: number): VerdictTier {
  if (score < 40) return 'brick';
  if (score < 60) return 'ochre';
  if (score < 80) return 'moss';
  return 'verdigris';
}

export interface VerdictBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  score?: number;
  tier?: VerdictTier;
  label?: string;
  showScore?: boolean;
}

export function VerdictBadge({
  score,
  tier: explicitTier,
  label: explicitLabel,
  showScore = true,
  className,
  ...props
}: VerdictBadgeProps) {
  const tier = explicitTier ?? (typeof score === 'number' ? getTierForScore(score) : 'verdigris');
  const config = VERDICT_TIERS[tier];
  const Icon = config.icon;
  const label = explicitLabel ?? config.defaultLabel;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium tracking-tight select-none',
        config.colorClasses,
        className,
      )}
      {...props}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="font-sans font-semibold">{label}</span>
      {showScore && typeof score === 'number' && (
        <span className="font-mono text-xs opacity-90 pl-1 border-l border-current/25">
          {score}/100
        </span>
      )}
    </div>
  );
}
