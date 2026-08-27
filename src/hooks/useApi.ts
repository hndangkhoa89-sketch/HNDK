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
    
    const contentType = res.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => '');

    if (!res.ok) {
      const message = typeof payload === 'object' && payload !== null && 'error' in payload
        ? String(payload.error)
        : typeof payload === 'string' && payload.trim()
          ? payload.slice(0, 200)
          : `API request failed (${res.status})`;
      throw new Error(message);
    }

    return payload;
  }, [token, isGuest]);

  return { request };
}
