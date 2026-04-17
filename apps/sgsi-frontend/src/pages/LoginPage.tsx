import { ShieldCheck } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

const THERIS_API = import.meta.env.VITE_THERIS_API_URL || 'http://localhost:3000';

export function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${THERIS_API}/api/login/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: tokenResponse.access_token }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Acesso negado. Verifique se seu e-mail está cadastrado no Theris.');
          return;
        }

        const data = await res.json();
        localStorage.setItem('sgsi_user_id', data.user.id);
        localStorage.setItem('sgsi_user', JSON.stringify(data.user));
        window.location.href = '/';
      } catch {
        setError('Erro ao conectar com o servidor. Tente novamente.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Erro ao autenticar com o Google. Tente novamente.');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm p-8 rounded-xl border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck size={28} style={{ color: 'var(--color-primary)' }} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}>
              Grupo 3C
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              SGSI Dashboard
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <button
          onClick={() => handleLogin()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-medium border transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background: '#fff',
            color: '#374151',
            borderColor: '#d1d5db'
          }}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="18" alt="Google" />
          {loading ? 'Entrando...' : 'Entrar com Google'}
        </button>

        <p className="mt-6 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Acesso restrito ao time de SI e liderança do Grupo 3C
        </p>
      </div>
    </div>
  );
}
