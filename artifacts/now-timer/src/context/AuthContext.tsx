import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getAuthToken, getStoredUsername, saveAuth, clearAuth } from '@/lib/authStorage';
import type { Membership } from '@/lib/teamStorage';

export interface AuthUser {
  id: string;
  username: string;
  memberships: Membership[];
}

interface AuthState {
  user: AuthUser | null;
  authToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  linkMembership: (m: Membership) => Promise<void>;
  unlinkMembership: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

async function authRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.status.toString());
  return data as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(getAuthToken);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setIsLoading(false); return; }
    authRequest<{ user: AuthUser }>('GET', '/auth/me', undefined, token)
      .then(({ user: u }) => { setUser(u); setAuthToken(token); })
      .catch(() => { clearAuth(); setAuthToken(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token, user: u } = await authRequest<{ token: string; user: AuthUser }>(
      'POST', '/auth/login', { username, password },
    );
    saveAuth(token, u.username);
    setAuthToken(token);
    setUser(u);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const { token, user: u } = await authRequest<{ token: string; user: AuthUser }>(
      'POST', '/auth/register', { username, password },
    );
    saveAuth(token, u.username);
    setAuthToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuthToken(null);
    setUser(null);
  }, []);

  const linkMembership = useCallback(async (m: Membership) => {
    const token = getAuthToken();
    if (!token) return;
    await authRequest('POST', '/auth/link-membership', m, token);
    setUser((prev) => {
      if (!prev) return prev;
      const already = prev.memberships.some((x) => x.code === m.code);
      if (already) return prev;
      return { ...prev, memberships: [...prev.memberships, m] };
    });
  }, []);

  const unlinkMembership = useCallback(async (code: string) => {
    const token = getAuthToken();
    if (!token) return;
    await authRequest('DELETE', `/auth/link-membership/${code}`, undefined, token);
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, memberships: prev.memberships.filter((x) => x.code !== code) };
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, authToken, isLoading,
      login, register, logout,
      linkMembership, unlinkMembership,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
