import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core Brand & Surface Tokens (mapped through CSS variables)
        vermilion: {
          DEFAULT: 'var(--color-vermilion)',
          hover: 'var(--color-vermilion-hover)',
          text: 'var(--color-vermilion-foreground)',
        },
        ink: 'var(--color-ink)',
        paper: 'var(--color-paper)',
        stone: {
          DEFAULT: 'var(--color-stone)',
          border: 'var(--color-stone-border)',
          card: 'var(--color-stone-card)',
        },
        verdigris: {
          DEFAULT: 'var(--color-verdigris)',
          foreground: 'var(--color-verdigris-foreground)',
        },

        // Verdict Threshold Badges
        verdict: {
          brick: 'var(--color-verdict-brick)',
          'brick-bg': 'var(--color-verdict-brick-bg)',
          ochre: 'var(--color-verdict-ochre)',
          'ochre-bg': 'var(--color-verdict-ochre-bg)',
          moss: 'var(--color-verdict-moss)',
          'moss-bg': 'var(--color-verdict-moss-bg)',
          verdigris: 'var(--color-verdict-verdigris)',
          'verdigris-bg': 'var(--color-verdict-verdigris-bg)',
        },

        // Semantic shadcn mapping
        border: 'var(--color-stone-border)',
        background: 'var(--color-paper)',
        foreground: 'var(--color-ink)',
        card: {
          DEFAULT: 'var(--color-stone-card)',
          foreground: 'var(--color-ink)',
        },
        primary: {
          DEFAULT: 'var(--color-vermilion)',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: 'var(--color-verdigris)',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: 'var(--color-stone)',
          foreground: 'var(--color-muted-foreground)',
        },
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
      },
      fontFamily: {
        fraunces: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-instrument)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-mono)', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        none: 'none',
      },
    },
  },
  plugins: [],
};

export default config;
