import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) {
      setError('Informe o ID de sessão do Theris.');
      return;
    }
    localStorage.setItem('sgsi_user_id', userId.trim());
    window.location.href = '/dashboard';
  }

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

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-text-muted)' }}>
              ID de Sessão (Theris)
            </label>
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Cole seu user ID aqui"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          Acesso restrito ao time de SI e liderança do Grupo 3C
        </p>
      </div>
    </div>
  );
}
