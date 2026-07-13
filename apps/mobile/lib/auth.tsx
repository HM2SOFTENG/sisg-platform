import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import {
  fetchDashboardSummary,
  loginAdmin,
  logoutAdminSession,
  refreshAdminSession,
  verifyAdminSession,
} from "@sisg/api-client";
import type { AuthSession, DashboardSummary } from "@sisg/types";
import { clearStoredSession, loadStoredSession, saveStoredSession } from "./session";
import { formatApiError, normalizeApiBaseUrl, resolveDefaultApiBaseUrl } from "./api";

type AuthContextValue = {
  apiBaseUrl: string;
  setApiBaseUrl: (value: string) => void;
  session: AuthSession | null;
  dashboard: DashboardSummary | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  login: (params: { email?: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshDashboard: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [apiBaseUrl, setApiBaseUrlState] = useState(resolveDefaultApiBaseUrl);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl) || resolveDefaultApiBaseUrl();

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      try {
        const storedSession = await loadStoredSession();

        if (!storedSession || cancelled) {
          return;
        }

        setApiBaseUrlState(storedSession.apiBaseUrl);
        setSession(storedSession.session);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshDashboard() {
    if (!session) {
      setDashboard(null);
      return;
    }

    const nextDashboard = await fetchDashboardSummary({
      accessToken: session.accessToken,
      baseUrl: normalizedApiBaseUrl,
    });

    setDashboard(nextDashboard);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (!hydrated) {
          return;
        }

        if (!session) {
          if (!cancelled) {
            setDashboard(null);
            setLoading(false);
          }
          return;
        }

        let activeSession: AuthSession | null = session;
        const authStatus = await verifyAdminSession({
          accessToken: activeSession.accessToken,
          baseUrl: normalizedApiBaseUrl,
        });

        if (!authStatus.authenticated && activeSession.refreshToken) {
          activeSession = await refreshAdminSession({
            baseUrl: normalizedApiBaseUrl,
            refreshToken: activeSession.refreshToken,
          });

          if (!cancelled) {
            setSession(activeSession);
          }
        } else if (!authStatus.authenticated) {
          if (!cancelled) {
            setSession(null);
            setDashboard(null);
            setLoading(false);
          }
          return;
        }

        const nextDashboard = await fetchDashboardSummary({
          accessToken: activeSession.accessToken,
          baseUrl: normalizedApiBaseUrl,
        });

        if (!cancelled) {
          setDashboard(nextDashboard);
          setLoading(false);
        }
      } catch (nextError) {
        if (!cancelled) {
          setSession(null);
          setDashboard(null);
          setError(formatApiError(nextError, normalizedApiBaseUrl));
          setLoading(false);
        }

        await clearStoredSession();
      }
    }

    setLoading(true);
    setError(null);
    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [hydrated, normalizedApiBaseUrl, session]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void saveStoredSession({
      apiBaseUrl: normalizedApiBaseUrl,
      session,
    });
  }, [hydrated, normalizedApiBaseUrl, session]);

  async function login(params: { email?: string; password: string }) {
    setLoading(true);
    setError(null);

    try {
      const nextSession = await loginAdmin(params, {
        baseUrl: normalizedApiBaseUrl,
      });
      setSession(nextSession);
      setDashboard(
        await fetchDashboardSummary({
          accessToken: nextSession.accessToken,
          baseUrl: normalizedApiBaseUrl,
        }),
      );
    } catch (nextError) {
      setError(formatApiError(nextError, normalizedApiBaseUrl));
      throw nextError;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    if (session?.accessToken) {
      void logoutAdminSession({
        accessToken: session.accessToken,
        baseUrl: normalizedApiBaseUrl,
      });
    }

    setSession(null);
    setDashboard(null);
    setError(null);
    void clearStoredSession();
  }

  return (
    <AuthContext.Provider
      value={{
        apiBaseUrl: normalizedApiBaseUrl,
        setApiBaseUrl: setApiBaseUrlState,
        session,
        dashboard,
        hydrated,
        loading,
        error,
        login,
        logout,
        refreshDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
