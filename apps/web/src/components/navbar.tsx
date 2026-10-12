'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from './ui/button';

export function Navbar() {
  const { user, usage, logout } = useAuth();

  return (
    <header className="border-b border-stone-border bg-paper sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-ink font-serif text-lg font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-vermilion inline-block" />
            Prvo
          </Link>
          {user && (
            <nav className="hidden sm:flex items-center gap-4 text-sm font-medium text-ink-muted">
              <Link href="/dashboard" className="hover:text-ink transition-colors">
                Dashboard
              </Link>
              <Link href="/ideas/new" className="hover:text-ink transition-colors">
                New Idea
              </Link>
            </nav>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-4 text-sm">
            {usage && (
              <span className="text-xs font-mono text-ink-muted hidden md:inline-block">
                {usage.activeIdeas} of {usage.limit} ideas used
              </span>
            )}
            <Link href="/settings" className="hover:text-ink text-ink-muted transition-colors">
              {user.name || user.email}
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="text-xs"
            >
              Log out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">
                Sign up
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
