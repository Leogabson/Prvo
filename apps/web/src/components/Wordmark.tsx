import * as React from 'react';
import { cn } from '@/lib/utils';

export interface WordmarkProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  dotClassName?: string;
}

export function Wordmark({ className, dotClassName, ...props }: WordmarkProps) {
  return (
    <svg
      viewBox="0 0 130 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-auto', className)}
      role="img"
      aria-label="prvo logo"
      {...props}
    >
      <text
        x="0"
        y="30"
        fill="currentColor"
        className="font-fraunces font-bold"
        style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: '34px',
          letterSpacing: '-0.04em',
        }}
      >
        prvo
      </text>
      <circle
        cx="78"
        cy="13"
        r="3.5"
        className={cn('fill-vermilion', dotClassName)}
      />
    </svg>
  );
}
