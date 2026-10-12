'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { SafeUser, UserUsage, LoginInput, RegisterInput } from '@prvo/shared';
import {
  apiFetch,
  setAccessToken,
  silentRefresh,
  setOnAuthExpired,
} from './api-client';

interface AuthContextType {
  user: SafeUser | null;
  usage: UserUsage | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  googleOAuthEnabled: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SafeUser | null>(null);
  const [usage, setUsage] = React.useState<UserUsage | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [googleOAuthEnabled] = React.useState(false); // Cleanly disabled in dev if missing
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ user: SafeUser; usage: UserUsage }>('/me');
      setUser(res.user);
      setUsage(res.usage);
    } catch {
      setUser(null);
      setUsage(null);
    }
  }, []);

  // Silent refresh on initial load
  React.useEffect(() => {
    setOnAuthExpired(() => {
      setUser(null);
      setUsage(null);
      setAccessToken(null);
      if (pathname && !['/login', '/signup', '/forgot-password', '/reset-password', '/'].includes(pathname)) {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
      }
    });

    let isMounted = true;

    async function initAuth() {
      try {
        const token = await silentRefresh();
        if (token && isMounted) {
          await fetchProfile();
        }
      } catch {
        // Not authenticated
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [fetchProfile, pathname, router]);

  const login = async (input: LoginInput) => {
    const res = await apiFetch<{ user: SafeUser; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
    await fetchProfile();
  };

  const register = async (input: RegisterInput) => {
    const res = await apiFetch<{ user: SafeUser; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
    await fetchProfile();
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
      setUsage(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usage,
        isLoading,
        login,
        register,
        logout,
        refreshMe: fetchProfile,
        googleOAuthEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Protects child pages and handles returnTo redirect
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && !user) {
      const returnTo = pathname ? `?returnTo=${encodeURIComponent(pathname)}` : '';
      router.push(`/login${returnTo}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-vermilion border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-ink-muted font-sans">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
