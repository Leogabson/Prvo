import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';
import { Button } from '@/components/ui/button';
import { BRAND_TAGLINE } from '@prvo/shared';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-paper text-ink">
      <div className="w-full max-w-md border border-stone-border bg-stone-card rounded-md p-8 text-center space-y-6 shadow-none">
        <div className="flex justify-center">
          <Wordmark className="h-10 text-ink" />
        </div>

        <p className="font-fraunces text-xl font-medium text-ink">
          {BRAND_TAGLINE}
        </p>

        <p className="text-sm text-muted-foreground leading-relaxed">
          System foundation configured. Early-stage idea validation backed by market evidence, risk scoring, and customer signal.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/design">
            <Button variant="default" className="w-full sm:w-auto">
              View Design Tokens (/design)
            </Button>
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="secondary" className="w-full sm:w-auto">
              Documentation
            </Button>
          </a>
        </div>
      </div>
    </main>
  );
}
