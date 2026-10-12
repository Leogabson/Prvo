import { describe, it, expect } from 'vitest';
import { getTierForScore, VERDICT_TIERS } from '../components/ui/verdict-badge';

describe('apps/web: Verdict badge logic', () => {
  it('correctly maps scores to verdict tiers', () => {
    expect(getTierForScore(0)).toBe('brick');
    expect(getTierForScore(39)).toBe('brick');
    expect(getTierForScore(40)).toBe('ochre');
    expect(getTierForScore(59)).toBe('ochre');
    expect(getTierForScore(60)).toBe('moss');
    expect(getTierForScore(79)).toBe('moss');
    expect(getTierForScore(80)).toBe('verdigris');
    expect(getTierForScore(100)).toBe('verdigris');
  });

  it('provides icon and non-empty label for all 4 verdict tiers', () => {
    const tiers = ['brick', 'ochre', 'moss', 'verdigris'] as const;

    for (const tier of tiers) {
      const config = VERDICT_TIERS[tier];
      expect(config.defaultLabel).toBeDefined();
      expect(config.defaultLabel.length).toBeGreaterThan(0);
      expect(config.icon).toBeDefined();
      expect(config.rangeLabel).toBeDefined();
    }
  });
});
