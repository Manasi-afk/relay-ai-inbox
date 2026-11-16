import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, tokenStore } from '../lib/api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [token, setToken] = useState(tokenStore.get());

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api('/auth/me'),
    enabled: Boolean(token),
    refetchInterval: (q) => (q.state.data?.mailboxes?.some((m) => m.status === 'syncing') ? 1500 : 30000),
  });

  const signIn = useCallback((t) => {
    tokenStore.set(t);
    qc.clear();
    setToken(t);
  }, [qc]);

  const signOut = useCallback(() => {
    tokenStore.clear();
    qc.clear();
    setToken(null);
  }, [qc]);

  useEffect(() => {
    const h = () => signOut();
    window.addEventListener('relay:unauthorized', h);
    return () => window.removeEventListener('relay:unauthorized', h);
  }, [signOut]);

  return (
    <AuthCtx.Provider value={{ token, me: me.data, meLoading: Boolean(token) && me.isPending, meError: me.error, signIn, signOut, refetchMe: me.refetch }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
