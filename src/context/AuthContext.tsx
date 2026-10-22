import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  api,
  getApiBaseUrl,
  setApiBaseUrl,
  getStoredToken,
  getStoredUser,
  setStoredUser,
} from '@/services/api';

interface UserData {
  id: number;
  hovaten: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  loading: boolean;
  backendUrl: string;
  updateBackendUrl: (url: string) => Promise<void>;
  login: (email: string, matkhau: string) => Promise<any>;
  register: (hovaten: string, email: string, matkhau: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  backendUrl: '',
  updateBackendUrl: async () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [backendUrl, setBackendUrlState] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    try {
      const currentUrl = await getApiBaseUrl();
      setBackendUrlState(currentUrl);

      const savedToken = await getStoredToken();
      const savedUser = await getStoredUser();

      setToken(savedToken);
      setUser(savedUser);

      if (savedToken) {
        try {
          const res = await api.auth.getMe();
          if (res?.user) {
            setUser(res.user);
          }
        } catch {
          // Token expired or server unreachable, keep cached user
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const updateBackendUrl = async (newUrl: string) => {
    await setApiBaseUrl(newUrl);
    setBackendUrlState(newUrl);
  };

  const login = async (email: string, matkhau: string) => {
    const res = await api.auth.login(email, matkhau);
    if (res?.token) {
      setToken(res.token);
    }
    let currentUser = res?.user || null;
    setUser(currentUser);

    // Tự động lấy thông tin người dùng đầy đủ (họ tên, vai trò, avatar)
    try {
      const meRes = await api.auth.getMe();
      if (meRes?.user) {
        currentUser = { ...currentUser, ...meRes.user };
        setUser(currentUser);
        await setStoredUser(currentUser);
      }
    } catch {
      // fallback to current user
    }
    return res;
  };

  const register = async (hovaten: string, email: string, matkhau: string) => {
    return api.auth.register(hovaten, email, matkhau);
  };

  const logout = async () => {
    await api.auth.logout();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.getMe();
      if (res?.user) {
        setUser(res.user);
      }
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        backendUrl,
        updateBackendUrl,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
