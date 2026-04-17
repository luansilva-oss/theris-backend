import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { verifySession } from '../lib/api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  systemProfile: string;
  sgsiRole?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('sgsi_user_id');
    const cached = localStorage.getItem('sgsi_user');

    if (!userId) {
      setLoading(false);
      return;
    }

    if (cached) {
      try {
        setUser(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {}
    }

    verifySession(userId)
      .then((data) => {
        setUser(data);
        localStorage.setItem('sgsi_user', JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem('sgsi_user_id');
    localStorage.removeItem('sgsi_user');
        localStorage.removeItem('sgsi_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem('sgsi_user_id');
    localStorage.removeItem('sgsi_user');
    setUser(null);
    window.location.href = '/';
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
