import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-verdigris select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-stone-card text-ink border-stone-border',
        outline:
          'border-stone-border text-ink bg-transparent',
        primary:
          'border-transparent bg-vermilion text-white',
        secondary:
          'border-transparent bg-verdigris text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
