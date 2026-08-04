import React, { createContext, useContext, useEffect, useState } from 'react';

export interface DbUser {
  uid: string;
  email: string;
  name: string | null;
  role: string | null;
  groupId: string | null;
  active: boolean | null;
}

interface AuthContextType {
  dbUser: DbUser | null;
  token: string | null;
  isGuest: boolean;
  setGuest: (val: boolean) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const TOKEN_KEY = 'cd_auth_token';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (authToken: string): Promise<DbUser> => {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error('Không lấy được thông tin người dùng');
    const data = (await res.json()) as DbUser;
    setDbUser(data);
    return data;
  };

  // Khôi phục phiên đăng nhập đã lưu
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    setToken(saved);
    fetchDbUser(saved)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setDbUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Sai tài khoản hoặc mật khẩu');
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    await fetchDbUser(data.token);
    setIsGuest(false);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setDbUser(null);
    setIsGuest(false);
  };

  const refreshUser = async () => {
    if (token) await fetchDbUser(token);
  };

  return (
    <AuthContext.Provider
      value={{
        dbUser,
        token,
        isGuest,
        setGuest: setIsGuest,
        login,
        logout,
        loading,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
