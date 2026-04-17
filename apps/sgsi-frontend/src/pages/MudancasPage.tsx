import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { getChanges, createChange } from '../lib/api';
import type { Change, ChangeUrgency } from '../lib/api';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

export function MudancasPage() {
  const navigate = useNavigate();
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', urgency: 'IMEDIATA' as ChangeUrgency, isoControls: '' });

  const load = () => {
    setLoading(true);
    getChanges().then(setChanges).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const open = changes.filter(c => c.status !== 'CLOSED');
  const closed = changes.filter(c => c.status === 'CLOSED');

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createChange({
        title: form.title,
        description: form.description,
        urgency: form.urgency,
        isoControls: form.isoControls.split(',').map(s => s.trim()).filter(Boolean),
      });
      setShowModal(false);
      setForm({ title: '', description: '', urgency: 'IMEDIATA', isoControls: '' });
      load();
    } catch {
      alert('Erro ao criar mudança.');
    } finally {
      setSaving(false);
    }
  }

  const ChangeRow = ({ change }: { change: Change }) => (
    <div className="flex items-center justify-between px-5 py-3 hover:opacity-80 transition-opacity cursor-pointer border-b last:border-0"
      style={{ borderColor: 'var(--color-border)' }}
      onClick={() => navigate(`/mudancas/${change.id}`)}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium px-2 py-0.5 rounded"
          style={{
            background: change.urgency === 'IMEDIATA' ? '#ef444422' : '#f59e0b22',
            color: change.urgency === 'IMEDIATA' ? '#ef4444' : '#f59e0b',
          }}>
          {change.urgency}
        </span>
        <div>
          <div className="text-sm" style={{ color: 'var(--color-text)' }}>{change.title}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Aberta em {formatDate(change.createdAt)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={change.status} type="change" />
        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Mudanças Urgentes
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Controle ISO 27001 — 6.3 — Planejamento de mudanças
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80"
          style={{ background: 'var(--color-primary)', color: '#fff' }}>
          <Plus size={14} /> Nova mudança
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          Em aberto ({open.length})
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Carregando...</div>
        ) : open.length === 0 ? (
          <EmptyState message="Nenhuma mudança em aberto" icon="✅" />
        ) : (
          open.map(c => <ChangeRow key={c.id} change={c} />)
        )}
      </div>

      {closed.length > 0 && (
        <div className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            Histórico ({closed.length})
          </div>
          {closed.map(c => <ChangeRow key={c.id} change={c} />)}
        </div>
      )}

      {/* Modal nova mudança */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowModal(false)}>
          <div className="rounded-xl p-6 w-full max-w-lg border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text)' }}>
              Registrar mudança urgente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Urgência</label>
                <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value as ChangeUrgency }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  <option value="IMEDIATA">IMEDIATA</option>
                  <option value="PLANEJADA">PLANEJADA</option>
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Controles ISO impactados (separados por vírgula)</label>
                <input value={form.isoControls} onChange={e => setForm(f => ({ ...f, isoControls: e.target.value }))}
                  placeholder="6.3, 9.3, ..."
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.title.trim()}
                className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {saving ? 'Salvando...' : 'Registrar mudança'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
