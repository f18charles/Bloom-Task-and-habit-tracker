import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "../api/client";
import { User } from "../types";

interface AuthResult {
  user: User;
  token: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      try {
        if (await tokenStore.get()) setUser(await api.get<User>("/auth/me"));
      } catch {
        // 401 is handled by the interceptor; on network errors we just show login.
      } finally {
        setLoading(false);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, []);

  const finish = useCallback(async ({ user, token }: AuthResult) => {
    await tokenStore.set(token);
    setUser(user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) =>
        finish(await api.post<AuthResult>("/auth/login", { email: email.trim(), password })),
      register: async (displayName, email, password) =>
        finish(
          await api.post<AuthResult>("/auth/register", {
            displayName: displayName.trim(),
            email: email.trim(),
            password,
          })
        ),
      logout: async () => {
        await tokenStore.clear();
        setUser(null);
      },
    }),
    [user, loading, finish]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
