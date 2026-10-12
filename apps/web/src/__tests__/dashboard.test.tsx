import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardContent } from '@/components/dashboard-content';

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}));

// Mock Auth Context
const mockUseAuth = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Toast
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { apiFetch } from '@/lib/api-client';

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty state with a call to action when no ideas exist', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'founder@example.com', name: 'Founder' },
      usage: { activeIdeas: 0, limit: 3 },
      refreshMe: vi.fn(),
    });

    vi.mocked(apiFetch).mockResolvedValueOnce({ ideas: [] });

    render(<DashboardContent />);

    // Wait for ideas to finish loading
    await waitFor(() => {
      expect(screen.getByText(/No ideas found/i)).toBeDefined();
    });

    expect(screen.getByText(/Submit your first startup idea to begin evidence-based validation/i)).toBeDefined();
    expect(screen.getByRole('link', { name: /Create your first idea/i })).toBeDefined();
    expect(screen.getAllByText((content) => content.includes('0') && content.includes('3 ideas used')).length).toBeGreaterThan(0);
  });

  it('renders the plan limit reached state when user has used 3 of 3 ideas', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'founder@example.com', name: 'Founder' },
      usage: { activeIdeas: 3, limit: 3 },
      refreshMe: vi.fn(),
    });

    const mockIdeas = [
      {
        id: '1',
        title: 'Idea One',
        status: 'active',
        created_at: new Date().toISOString(),
        current_version: { stage: 'idea_only', problem: 'Problem 1' },
      },
      {
        id: '2',
        title: 'Idea Two',
        status: 'active',
        created_at: new Date().toISOString(),
        current_version: { stage: 'prototype', problem: 'Problem 2' },
      },
      {
        id: '3',
        title: 'Idea Three',
        status: 'draft',
        created_at: new Date().toISOString(),
        current_version: { stage: 'researching', problem: 'Problem 3' },
      },
    ];

    vi.mocked(apiFetch).mockResolvedValueOnce({ ideas: mockIdeas });

    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getAllByText((content) => content.includes('3') && content.includes('3 ideas used')).length).toBeGreaterThan(0);
    });

    // The New Idea button should be disabled
    const newIdeaBtn = screen.getByRole('button', { name: /New Idea/i });
    expect(newIdeaBtn.hasAttribute('disabled')).toBe(true);

    // Limit explanation shown
    expect(screen.getByText(/You have used all 3 ideas on the free plan/i)).toBeDefined();

    // Verify "No score yet" is shown on idea cards
    const noScoreBadges = screen.getAllByText('No score yet');
    expect(noScoreBadges.length).toBe(3);
  });
});
