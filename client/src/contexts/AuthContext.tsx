import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('sisg_admin_token');
    setIsAuthenticated(false);
  }, []);

  const verifyToken = useCallback(async () => {
    const token = localStorage.getItem('sisg_admin_token');
    if (!token) {
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

      if (response.ok) {
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        clearAuthState();
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  useEffect(() => {
    const verificationInterval = setInterval(() => {
      const token = localStorage.getItem('sisg_admin_token');
      if (token && isAuthenticated) {
        verifyToken();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(verificationInterval);
  }, [verifyToken, isAuthenticated]);

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('sisg_admin_token', data.token);
        setIsAuthenticated(true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('sisg_admin_token');
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
    const token = localStorage.getItem('sisg_admin_token');
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearAuthState();
    }

    return response;
  }, [clearAuthState]);

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
