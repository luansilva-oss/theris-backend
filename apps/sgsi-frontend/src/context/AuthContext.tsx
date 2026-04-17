import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
    if (!userId) {
      setLoading(false);
      return;
    }

    verifySession(userId)
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem('sgsi_user_id');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem('sgsi_user_id');
    setUser(null);
    window.location.href = '/login';
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
