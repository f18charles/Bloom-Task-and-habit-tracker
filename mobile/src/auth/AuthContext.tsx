import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { api, setUnauthorizedHandler, tokenStore } from "../api/client";
import {
  getActiveUserId,
  getCachedUser,
  saveCachedUser,
  setActiveUserId,
} from "../offline/localDb";
import { isDeviceOnline, isNetworkError } from "../offline/syncWorker";
import { User } from "../types";
import {
  BiometricCapability,
  BiometricSettings,
  clearBiometricEnrollment,
  getBiometricCapability,
  getBiometricSettings,
  getBiometricVaultSession,
  promptBiometric,
  saveBiometricEnrollment,
  setBiometricRequireOnLaunch,
  syncBiometricVaultOnLogin,
} from "./biometrics";

interface AuthResult {
  user: User;
  token: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  locked: boolean;
  biometricCapability: BiometricCapability;
  biometricSettings: BiometricSettings;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithBiometrics: () => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>;
  unlockWithBiometrics: () => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>;
  enableBiometrics: (requireOnLaunch?: boolean) => Promise<{ ok: boolean; error?: string }>;
  disableBiometrics: () => Promise<void>;
  toggleRequireOnLaunch: (value: boolean) => Promise<void>;
  forgetBiometricAccount: () => Promise<void>;
  refreshBiometricState: () => Promise<void>;
}

const DEFAULT_CAPABILITY: BiometricCapability = {
  available: false,
  hasHardware: false,
  isEnrolled: false,
  label: "Biometrics",
  icon: "shield-lock-outline",
};

const DEFAULT_SETTINGS: BiometricSettings = {
  enabled: false,
  requireOnLaunch: true,
  savedUser: null,
  hasVaultToken: false,
};

const BACKGROUND_LOCK_GRACE_MS = 30_000;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [biometricCapability, setBiometricCapability] =
    useState<BiometricCapability>(DEFAULT_CAPABILITY);
  const [biometricSettings, setBiometricSettings] =
    useState<BiometricSettings>(DEFAULT_SETTINGS);

  const backgroundedAtRef = useRef<number | null>(null);

  const refreshBiometricState = useCallback(async () => {
    const [cap, settings] = await Promise.all([
      getBiometricCapability(),
      getBiometricSettings(),
    ]);
    setBiometricCapability(cap);
    setBiometricSettings(settings);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      setUser(null);
      setLocked(false);
      await setActiveUserId(null);
      await clearBiometricEnrollment();
      await refreshBiometricState();
    });

    (async () => {
      try {
        const [token, cap, settings] = await Promise.all([
          tokenStore.get(),
          getBiometricCapability(),
          getBiometricSettings(),
        ]);
        setBiometricCapability(cap);
        setBiometricSettings(settings);

        if (token) {
          let resolvedUser: User | null = null;
          const online = await isDeviceOnline();

          if (online) {
            try {
              resolvedUser = await api.get<User>("/auth/me");
              await saveCachedUser(resolvedUser);
              await setActiveUserId(resolvedUser.id);
            } catch (err) {
              if (!isNetworkError(err)) {
                resolvedUser = null;
              } else {
                const activeId = await getActiveUserId();
                if (activeId) {
                  resolvedUser = await getCachedUser(activeId);
                }
                if (!resolvedUser && settings.savedUser) {
                  resolvedUser = settings.savedUser;
                }
              }
            }
          } else {
            const activeId = await getActiveUserId();
            if (activeId) {
              resolvedUser = await getCachedUser(activeId);
            }
            if (!resolvedUser && settings.savedUser) {
              resolvedUser = settings.savedUser;
            }
          }

          if (resolvedUser) {
            setUser(resolvedUser);
            await setActiveUserId(resolvedUser.id);
            if (settings.enabled && settings.requireOnLaunch && cap.available) {
              setLocked(true);
            }
          }
        }
      } catch {
        // Fallback safely to LoginScreen
      } finally {
        setLoading(false);
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [refreshBiometricState]);

  // Auto-lock when returning from background if biometric lock on launch is active
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        if (backgroundedAtRef.current === null) {
          backgroundedAtRef.current = Date.now();
        }
      } else if (nextState === "active") {
        const bgTime = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (
          bgTime &&
          Date.now() - bgTime >= BACKGROUND_LOCK_GRACE_MS &&
          user &&
          biometricSettings.enabled &&
          biometricSettings.requireOnLaunch &&
          biometricCapability.available
        ) {
          setLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [user, biometricSettings, biometricCapability]);

  const finish = useCallback(
    async ({ user: loggedUser, token }: AuthResult) => {
      await tokenStore.set(token);
      await saveCachedUser(loggedUser);
      await setActiveUserId(loggedUser.id);
      await syncBiometricVaultOnLogin(loggedUser, token);
      await refreshBiometricState();
      setLocked(false);
      setUser(loggedUser);
    },
    [refreshBiometricState]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      await finish(
        await api.post<AuthResult>("/auth/login", { email: email.trim(), password })
      );
    },
    [finish]
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      await finish(
        await api.post<AuthResult>("/auth/register", {
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        })
      );
    },
    [finish]
  );

  const logout = useCallback(async () => {
    await tokenStore.clear();
    await setActiveUserId(null);
    setLocked(false);
    setUser(null);
    await refreshBiometricState();
  }, [refreshBiometricState]);

  const loginWithBiometrics = useCallback(async () => {
    const vault = await getBiometricVaultSession();
    if (!vault) {
      return {
        ok: false,
        error: "No biometric session saved. Sign in with email and password first.",
      };
    }

    const res = await promptBiometric(`Sign in as ${vault.user.displayName}`);
    if (!res.ok) return res;

    await tokenStore.set(vault.token);
    await saveCachedUser(vault.user);
    await setActiveUserId(vault.user.id);
    setLocked(false);
    setUser(vault.user);

    // Refresh user profile in background when online; 401 is handled by interceptor.
    isDeviceOnline().then(async (online) => {
      if (!online) return;
      try {
        const freshUser = await api.get<User>("/auth/me");
        await saveCachedUser(freshUser);
        await syncBiometricVaultOnLogin(freshUser, vault.token);
        setUser(freshUser);
      } catch {
        // Offline or transient network error; cached session remains valid.
      }
    });

    return { ok: true };
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    const res = await promptBiometric("Unlock Bloom");
    if (res.ok) {
      setLocked(false);
    }
    return res;
  }, []);

  const enableBiometrics = useCallback(
    async (requireOnLaunch = true) => {
      if (!user) return { ok: false, error: "Sign in first to enable biometrics." };
      const token = await tokenStore.get();
      if (!token) return { ok: false, error: "Session token missing. Sign in again." };

      const verify = await promptBiometric(
        `Enable ${biometricCapability.label} for Bloom`
      );
      if (!verify.ok) {
        return { ok: false, error: verify.error };
      }

      await saveBiometricEnrollment(user, token, requireOnLaunch);
      await refreshBiometricState();
      return { ok: true };
    },
    [user, biometricCapability.label, refreshBiometricState]
  );

  const disableBiometrics = useCallback(async () => {
    await clearBiometricEnrollment();
    setLocked(false);
    await refreshBiometricState();
  }, [refreshBiometricState]);

  const toggleRequireOnLaunch = useCallback(
    async (value: boolean) => {
      await setBiometricRequireOnLaunch(value);
      await refreshBiometricState();
    },
    [refreshBiometricState]
  );

  const forgetBiometricAccount = useCallback(async () => {
    await clearBiometricEnrollment();
    await refreshBiometricState();
  }, [refreshBiometricState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      locked,
      biometricCapability,
      biometricSettings,
      login,
      register,
      logout,
      loginWithBiometrics,
      unlockWithBiometrics,
      enableBiometrics,
      disableBiometrics,
      toggleRequireOnLaunch,
      forgetBiometricAccount,
      refreshBiometricState,
    }),
    [
      user,
      loading,
      locked,
      biometricCapability,
      biometricSettings,
      login,
      register,
      logout,
      loginWithBiometrics,
      unlockWithBiometrics,
      enableBiometrics,
      disableBiometrics,
      toggleRequireOnLaunch,
      forgetBiometricAccount,
      refreshBiometricState,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
