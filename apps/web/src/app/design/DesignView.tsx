'use client';

import * as React from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { VerdictBadge } from '@/components/ui/verdict-badge';
import { Moon, Sun, ArrowLeft } from 'lucide-react';

interface ColorSwatch {
  name: string;
  variable: string;
  hexLight: string;
  hexDark: string;
  usage: string;
  contrastNote?: string;
}

const BRAND_COLORS: ColorSwatch[] = [
  {
    name: 'Vermilion',
    variable: '--color-vermilion',
    hexLight: '#C93B17',
    hexDark: '#E5502B',
    usage: 'Primary brand accent, primary CTA buttons',
    contrastNote: 'White text on light vermilion gives 5.1:1 contrast (WCAG AA).',
  },
  {
    name: 'Ink',
    variable: '--color-ink',
    hexLight: '#16140F',
    hexDark: '#FBF8F1',
    usage: 'Base text in light mode, background in dark mode',
  },
  {
    name: 'Paper',
    variable: '--color-paper',
    hexLight: '#FBF8F1',
    hexDark: '#16140F',
    usage: 'Base background in light mode, text in dark mode',
  },
  {
    name: 'Stone',
    variable: '--color-stone',
    hexLight: '#E8E2D4',
    hexDark: '#24221C',
    usage: 'Card surfaces, borders, and dividers',
  },
  {
    name: 'Verdigris',
    variable: '--color-verdigris',
    hexLight: '#1F5C4D',
    hexDark: '#3FA28A',
    usage: 'Secondary accents, active links, focus outlines',
  },
];

const VERDICT_COLORS: ColorSwatch[] = [
  {
    name: 'Brick (Score 0–39)',
    variable: '--color-verdict-brick',
    hexLight: '#7C2616',
    hexDark: '#E06A55',
    usage: 'High/Critical risk validation verdicts',
  },
  {
    name: 'Ochre (Score 40–59)',
    variable: '--color-verdict-ochre',
    hexLight: '#9A6A12',
    hexDark: '#E5A836',
    usage: 'Moderate risk, inconclusive market signals',
  },
  {
    name: 'Moss (Score 60–79)',
    variable: '--color-verdict-moss',
    hexLight: '#4F7A3A',
    hexDark: '#7DB860',
    usage: 'Promising validation with qualified risks',
  },
  {
    name: 'Verdigris (Score 80–100)',
    variable: '--color-verdict-verdigris',
    hexLight: '#1F5C4D',
    hexDark: '#3FA28A',
    usage: 'Strong proof, high market conviction',
  },
];

export function DesignView() {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-paper text-ink transition-colors duration-150">
      <header className="border-b border-stone-border bg-stone-card px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
            </Link>
            <span className="text-stone-border">|</span>
            <Wordmark className="h-6 text-ink" />
            <span className="font-mono text-xs bg-stone px-2 py-0.5 rounded-md text-ink">
              Design System Tokens
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsDark((prev) => !prev)}
            className="flex items-center gap-2"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4" /> Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" /> Switch to Dark Mode
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 space-y-12">
        {/* Intro */}
        <section className="space-y-2 border-b border-stone-border pb-6">
          <h1 className="font-fraunces text-3xl font-semibold tracking-tight text-ink">
            Design Tokens & Primitives
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Strict editorial design system. Flat surfaces, 6px borders, 1px stone dividers, and zero AI glows.
            Current mode: <span className="font-mono font-semibold text-ink">{isDark ? 'Dark Mode' : 'Light Mode'}</span>.
          </p>
        </section>

        {/* 1. Core Brand Colors */}
        <section className="space-y-4">
          <div>
            <h2 className="font-fraunces text-xl font-semibold text-ink">1. Core Palette</h2>
            <p className="text-xs text-muted-foreground">Tokens mapped via CSS variables for light & dark modes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {BRAND_COLORS.map((color) => (
              <div
                key={color.name}
                className="border border-stone-border rounded-md bg-stone-card p-4 space-y-3"
              >
                <div
                  className="h-16 w-full rounded-md border border-stone-border flex items-center justify-center font-mono text-xs font-semibold"
                  style={{
                    backgroundColor: `var(${color.variable})`,
                    color: color.name === 'Vermilion' ? '#FFFFFF' : 'var(--color-ink)',
                  }}
                >
                  {isDark ? color.hexDark : color.hexLight}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{color.name}</h3>
                  <p className="text-xs text-muted-foreground">{color.usage}</p>
                </div>
                {color.contrastNote && (
                  <p className="text-[11px] text-verdigris font-mono bg-paper p-1.5 rounded-md border border-stone-border">
                    {color.contrastNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 2. Verdict Badges */}
        <section className="space-y-4">
          <div>
            <h2 className="font-fraunces text-xl font-semibold text-ink">2. Verdict Badges</h2>
            <p className="text-xs text-muted-foreground">
              Verdicts always pair an icon, explicit label, and score font in IBM Plex Mono. Never color alone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-stone-border rounded-md bg-stone-card p-4 space-y-3">
              <span className="font-mono text-xs text-muted-foreground">Score 0–39 (Brick)</span>
              <div>
                <VerdictBadge score={28} tier="brick" />
              </div>
              <p className="text-xs text-muted-foreground">Critical risks detected. Low product viability.</p>
            </div>

            <div className="border border-stone-border rounded-md bg-stone-card p-4 space-y-3">
              <span className="font-mono text-xs text-muted-foreground">Score 40–59 (Ochre)</span>
              <div>
                <VerdictBadge score={48} tier="ochre" />
              </div>
              <p className="text-xs text-muted-foreground">Uncertain signal. Requires further problem interviews.</p>
            </div>

            <div className="border border-stone-border rounded-md bg-stone-card p-4 space-y-3">
              <span className="font-mono text-xs text-muted-foreground">Score 60–79 (Moss)</span>
              <div>
                <VerdictBadge score={72} tier="moss" />
              </div>
              <p className="text-xs text-muted-foreground">Promising market demand with addressable risks.</p>
            </div>

            <div className="border border-stone-border rounded-md bg-stone-card p-4 space-y-3">
              <span className="font-mono text-xs text-muted-foreground">Score 80–100 (Verdigris)</span>
              <div>
                <VerdictBadge score={92} tier="verdigris" />
              </div>
              <p className="text-xs text-muted-foreground">Strong evidence and proof before building.</p>
            </div>
          </div>

          <div className="border border-stone-border rounded-md bg-stone-card p-4">
            <h4 className="text-xs font-semibold text-ink mb-2">Verdict Tokens Palette</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {VERDICT_COLORS.map((v) => (
                <div key={v.name} className="space-y-1.5">
                  <div
                    className="h-8 rounded-md border border-stone-border"
                    style={{ backgroundColor: `var(${v.variable})` }}
                  />
                  <div className="text-xs font-semibold text-ink">{v.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {isDark ? v.hexDark : v.hexLight}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Typography Scale */}
        <section className="space-y-4">
          <div>
            <h2 className="font-fraunces text-xl font-semibold text-ink">3. Typography Scale</h2>
            <p className="text-xs text-muted-foreground">
              Fraunces for editorial headings, Instrument Sans for body & UI, IBM Plex Mono for scores & data.
            </p>
          </div>

          <div className="border border-stone-border rounded-md bg-stone-card p-6 space-y-6">
            <div className="border-b border-stone-border pb-4">
              <span className="font-mono text-xs text-muted-foreground">Fraunces Display Heading (32px)</span>
              <p className="font-fraunces text-3xl font-bold text-ink mt-1">
                Proof before you build.
              </p>
            </div>

            <div className="border-b border-stone-border pb-4">
              <span className="font-mono text-xs text-muted-foreground">Fraunces Section Heading (24px)</span>
              <p className="font-fraunces text-2xl font-semibold text-ink mt-1">
                Early-stage validation verdict & risk analysis
              </p>
            </div>

            <div className="border-b border-stone-border pb-4">
              <span className="font-mono text-xs text-muted-foreground">Instrument Sans Body (15px)</span>
              <p className="font-sans text-base text-ink mt-1 max-w-2xl leading-relaxed">
                Objective scoring across four pillars: competitor saturation, customer willingness to pay, unit economics feasibility, and technical execution risk.
              </p>
            </div>

            <div>
              <span className="font-mono text-xs text-muted-foreground">IBM Plex Mono Data (14px)</span>
              <p className="font-mono text-sm text-ink mt-1">
                SCORE: 84/100 | SAMPLES: 240 | P-VAL: 0.012 | MARGIN_ERR: ±3.8%
              </p>
            </div>
          </div>
        </section>

        {/* 4. Buttons & Inputs */}
        <section className="space-y-4">
          <div>
            <h2 className="font-fraunces text-xl font-semibold text-ink">4. Buttons & Inputs</h2>
            <p className="text-xs text-muted-foreground">6px radius, stone borders, minimal shadow, flat surfaces.</p>
          </div>

          <div className="border border-stone-border rounded-md bg-stone-card p-6 space-y-6">
            <div className="space-y-3">
              <span className="font-mono text-xs text-muted-foreground">Button Variants</span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="default">Primary Vermilion</Button>
                <Button variant="secondary">Secondary Stone</Button>
                <Button variant="outline">Outline Border</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="link">Inline Link</Button>
                <Button variant="default" disabled>Disabled State</Button>
              </div>
            </div>

            <div className="space-y-3">
              <span className="font-mono text-xs text-muted-foreground">Input Elements</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Startup Idea or Problem Statement</label>
                  <Input placeholder="e.g. Automated bookkeeping for freelance arborists" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Target Audience Description</label>
                  <Input placeholder="e.g. Solo tree contractors in Pacific Northwest" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Cards & Containers */}
        <section className="space-y-4">
          <div>
            <h2 className="font-fraunces text-xl font-semibold text-ink">5. Cards & Surface Style</h2>
            <p className="text-xs text-muted-foreground">1px stone borders, flat stone background, 6px radius.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>Market Saturation Analysis</CardTitle>
                  <VerdictBadge score={84} />
                </div>
                <CardDescription>
                  Evaluated across 14 incumbent SaaS tools and 6 direct search queries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-ink">
                <p>
                  High niche concentration found with low digital advertising bids. Incumbents suffer from poor mobile workflow compliance.
                </p>
              </CardContent>
              <CardFooter className="justify-between text-xs text-muted-foreground">
                <span className="font-mono">UPDATED: 2026-10-12</span>
                <span className="text-verdigris font-medium hover:underline cursor-pointer">
                  Inspect raw signals →
                </span>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>Customer Willingness to Pay</CardTitle>
                  <VerdictBadge score={38} />
                </div>
                <CardDescription>
                  Preliminary survey responses from 45 targeted participants.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-ink">
                <p>
                  Over 70% of respondents currently utilize manual paper spreadsheets and express reluctance to add a monthly subscription above $15/mo.
                </p>
              </CardContent>
              <CardFooter className="justify-between text-xs text-muted-foreground">
                <span className="font-mono">CONFIDENCE: LOW (N=45)</span>
                <span className="text-verdigris font-medium hover:underline cursor-pointer">
                  View survey breakdown →
                </span>
              </CardFooter>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
