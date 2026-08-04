import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

export function useApi() {
  const { token, isGuest } = useAuth();
  
  const request = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    if (!token && !isGuest) throw new Error('Not authenticated');
    
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'API Error');
    }
    return res.json();
  }, [token, isGuest]);

  return { request };
}
