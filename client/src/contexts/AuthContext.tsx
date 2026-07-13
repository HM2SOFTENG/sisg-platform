import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ACCESS_TOKEN_KEY = 'sisg_admin_token';
const REFRESH_TOKEN_KEY = 'sisg_admin_refresh_token';

type AuthStatusResponse =
  | { authenticated: false }
  | { authenticated: true; accessToken: string; refreshToken?: string };

type LoginResponse = {
  accessToken?: string;
  refreshToken?: string;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setIsAuthenticated(false);
  }, []);

  const storeSession = useCallback((session: LoginResponse) => {
    if (!session.accessToken) {
      clearAuthState();
      return false;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    if (session.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    }
    setIsAuthenticated(true);
    return true;
  }, [clearAuthState]);

  const refreshSession = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearAuthState();
      return false;
    }

    try {
      const response = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuthState();
        return false;
      }

      const data = await response.json() as LoginResponse;
      return storeSession(data);
    } catch (error) {
      console.error('Session refresh failed:', error);
      clearAuthState();
      return false;
    }
  }, [clearAuthState, storeSession]);

  const verifyToken = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
        await refreshSession();
      }
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json() as AuthStatusResponse;

      if (response.ok && data.authenticated) {
        setIsAuthenticated(true);
      } else {
        await refreshSession();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, [clearAuthState, refreshSession]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  useEffect(() => {
    const verificationInterval = setInterval(() => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token && isAuthenticated) {
        verifyToken();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(verificationInterval);
  }, [verifyToken, isAuthenticated]);

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json() as LoginResponse;
        return storeSession(data);
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, [storeSession]);

  const logout = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }
    clearAuthState();
  };

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const withAuthHeaders = (accessToken?: string) => {
      const headers = new Headers(options.headers || {});
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    };

    let response = await fetch(url, {
      ...options,
      headers: withAuthHeaders(localStorage.getItem(ACCESS_TOKEN_KEY) || undefined),
    });

    if (response.status !== 401) {
      return response;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
      clearAuthState();
      return response;
    }

    response = await fetch(url, {
      ...options,
      headers: withAuthHeaders(localStorage.getItem(ACCESS_TOKEN_KEY) || undefined),
    });

    if (response.status === 401) {
      clearAuthState();
    }

    return response;
  }, [clearAuthState, refreshSession]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
