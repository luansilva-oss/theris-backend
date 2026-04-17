import { useEffect, useState } from 'react';
import { UserPlus, ShieldOff } from 'lucide-react';
import { getAccessList, grantAccess, updateAccess, revokeAccess } from '../lib/api';
import type { SgsiUser, SgsiRole } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

const roleColors: Record<SgsiRole, string> = {
  ADMIN: '#3b82f6',
  MEMBER: '#8b5cf6',
  VIEWER: '#64748b',
};

export function AcessoPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SgsiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'MEMBER' as SgsiRole });
  const isAdmin = user?.sgsiRole === 'ADMIN';
  const { toast } = useToast();
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getAccessList().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleGrant() {
    if (!form.email.trim()) return;
    setSaving(true);
    try {
      await grantAccess(form.email, form.role);
      setShowModal(false);
      toast('Acesso concedido.', 'success');
      setForm({ email: '', role: 'MEMBER' });
      load();
    } catch { toast('Erro ao conceder acesso. Verifique o e-mail.', 'error'); }
    finally { setSaving(false); }
  }

  async function handleChangeRole(email: string, role: SgsiRole) {
    try { await updateAccess(email, role); load(); }
    catch { toast('Erro ao atualizar papel.', 'error'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Acesso</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Gestão de usuários com acesso ao SGSI Dashboard
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#fff' }}>
            <UserPlus size={14} /> Conceder acesso
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="rounded-xl border px-5 py-4 text-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          Você tem acesso de leitura a esta seção. Apenas ADMINs podem gerenciar usuários.
        </div>
      )}

      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Usuário', 'Papel', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
                {isAdmin && (
                  <th className="text-left px-5 py-3 text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)' }}>Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <div className="font-medium" style={{ color: 'var(--color-text)' }}>{u.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{u.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    {isAdmin ? (
                      <select value={u.role} onChange={e => handleChangeRole(u.email, e.target.value as SgsiRole)}
                        className="text-xs px-2 py-1 rounded border outline-none"
                        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: roleColors[u.role] }}>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <span className="text-xs font-medium" style={{ color: roleColors[u.role] }}>{u.role}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ background: u.isActive ? '#22c55e22' : '#ef444422', color: u.isActive ? '#22c55e' : '#ef4444' }}>
                      {u.isActive ? 'Ativo' : 'Revogado'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3">
                      {u.email !== user?.email && u.isActive && (
                        <button onClick={() => setConfirmRevoke(u.email)}
                          className="flex items-center gap-1 text-xs hover:opacity-80"
                          style={{ color: '#ef4444' }}>
                          <ShieldOff size={12} /> Revogar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowModal(false)}>
          <div className="rounded-xl p-6 w-full max-w-md border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text)' }}>Conceder acesso</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>E-mail (@grupo-3c.com)</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="nome@grupo-3c.com"
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Papel</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as SgsiRole }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  <option value="ADMIN">ADMIN — Acesso total</option>
                  <option value="MEMBER">MEMBER — Leitura + conclusão de ações</option>
                  <option value="VIEWER">VIEWER — Somente leitura</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}>Cancelar</button>
              <button onClick={handleGrant} disabled={saving || !form.email.trim()}
                className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {saving ? 'Salvando...' : 'Conceder acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRevoke && (
        <ConfirmDialog
          message={`Revogar acesso de ${confirmRevoke}?`}
          danger
          confirmLabel="Revogar"
          onConfirm={async () => {
            const email = confirmRevoke;
            setConfirmRevoke(null);
            try {
              await revokeAccess(email);
              toast('Acesso revogado.', 'success');
              load();
            } catch {
              toast('Erro ao revogar acesso.', 'error');
            }
          }}
          onCancel={() => setConfirmRevoke(null)}
        />
      )}
    </div>
  );
}
