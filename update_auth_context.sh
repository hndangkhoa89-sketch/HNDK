cat << 'INNEREOF' > src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface DbUser {
  uid: string;
  email: string;
  name: string | null;
  role: string | null;
  groupId: string | null;
  active: boolean | null;
}

interface AuthContextType {
  user: User | any | null;
  dbUser: DbUser | null;
  token: string | null;
  isGuest: boolean;
  setGuest: (val: boolean) => void;
  login: (email?: string, password?: string) => Promise<void>;
  register: (email?: string, password?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | any | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
        return data;
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    const customToken = localStorage.getItem('custom_auth_token');
    
    if (customToken) {
      setToken(customToken);
      setUser({ uid: 'admin-local', email: 'admin@system.local', displayName: 'Admin' });
      fetchDbUser(customToken).then(() => setLoading(false)).catch(() => {
        localStorage.removeItem('custom_auth_token');
        setToken(null);
        setUser(null);
        setLoading(false);
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (localStorage.getItem('custom_auth_token')) return; // ignore firebase if custom token exists
      setUser(u);
      if (u) {
        const t = await u.getIdToken();
        setToken(t);
        await fetchDbUser(t);
      } else {
        setToken(null);
        setDbUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email?: string, password?: string) => {
    try {
      if (email === 'admin@system.local' || (!email?.includes('@') && email === 'admin')) {
        // Custom backend login
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: password?.replace('_system', '') })
        });
        if (!res.ok) {
          throw new Error('Sai tài khoản hoặc mật khẩu');
        }
        const data = await res.json();
        localStorage.setItem('custom_auth_token', data.token);
        setToken(data.token);
        setUser({ uid: 'admin-local', email: 'admin@system.local', displayName: 'Admin' });
        await fetchDbUser(data.token);
        setIsGuest(false);
        return;
      }
      
      if (email && password) {
        await signInWithEmailAndPassword(auth, email, password);
        setIsGuest(false);
      } else {
        throw new Error('Email and password required');
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const register = async (email?: string, password?: string) => {
    try {
      if (email && password) {
        await createUserWithEmailAndPassword(auth, email, password);
        setIsGuest(false);
      } else {
        throw new Error('Email and password required');
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (email) {
        await sendPasswordResetEmail(auth, email);
      } else {
        throw new Error('Email required');
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('custom_auth_token');
    await signOut(auth);
    setToken(null);
    setUser(null);
    setDbUser(null);
    setIsGuest(false);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchDbUser(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, token, isGuest, setGuest: setIsGuest, login, register, resetPassword, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
INNEREOF
