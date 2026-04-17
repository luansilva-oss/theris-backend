import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { getActions, completeAction } from '../lib/api';
import type { Action, ActionStatus } from '../lib/api';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';

const statusOptions: { value: ActionStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'OVERDUE', label: 'Atrasadas' },
  { value: 'DUE_SOON', label: 'Vencendo em breve' },
  { value: 'SCHEDULED', label: 'Agendadas' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluídas' },
];

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export function AcoesPage() {
  const navigate = useNavigate();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | ''>('');
  const [search, setSearch] = useState('');
  const [completing, setCompleting] = useState<string | null>(null);
  const [completingNotes, setCompletingNotes] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState<Action | null>(null);

  const load = () => {
    setLoading(true);
    getActions(statusFilter || undefined)
      .then(setActions)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = actions.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.referenceCode ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleComplete() {
    if (!showCompleteModal) return;
    setCompleting(showCompleteModal.id);
    try {
      await completeAction(showCompleteModal.id, completingNotes);
      setShowCompleteModal(null);
      setCompletingNotes('');
      load();
    } catch {
      alert('Erro ao registrar conclusão.');
    } finally {
      setCompleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          Ações Recorrentes
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Controle do CON-G3C-10 — Mapa de ações recorrentes do SGSI
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar ação..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border outline-none"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
            width: 240,
          }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ActionStatus | '')}
          className="text-sm px-3 py-2 rounded-lg border outline-none"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message="Nenhuma ação encontrada" icon="📋" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Ação', 'Frequência', 'Próximo vencimento', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {filtered.map(action => (
                <tr key={action.id} className="hover:opacity-80 transition-opacity cursor-pointer"
                  onClick={() => navigate(`/acoes/${action.id}`)}>
                  <td className="px-5 py-3" style={{ color: 'var(--color-text)' }}>
                    <div className="font-medium">{action.name}</div>
                    {action.referenceCode && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {action.referenceCode}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-text-muted)' }}>
                    {action.frequency}
                  </td>
                  <td className="px-5 py-3">
                    <span style={{
                      color: action.status === 'OVERDUE' ? 'var(--color-danger)'
                        : action.status === 'DUE_SOON' ? 'var(--color-warning)'
                        : 'var(--color-text-muted)',
                      fontWeight: ['OVERDUE', 'DUE_SOON'].includes(action.status) ? 600 : 400,
                    }}>
                      {formatDate(action.nextDueDate)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={action.status} />
                  </td>
                  <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {['OVERDUE', 'DUE_SOON', 'IN_PROGRESS', 'SCHEDULED'].includes(action.status) && (
                        <button
                          onClick={() => setShowCompleteModal(action)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                          style={{ background: '#22c55e22', color: '#22c55e' }}>
                          <CheckCircle size={12} /> Concluir
                        </button>
                      )}
                      <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal concluir */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowCompleteModal(null)}>
          <div className="rounded-xl p-6 w-full max-w-md border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              Concluir ação
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {showCompleteModal.name}
            </p>
            <textarea
              placeholder="Observações (opcional)"
              value={completingNotes}
              onChange={e => setCompletingNotes(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none mb-4"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCompleteModal(null)}
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}>
                Cancelar
              </button>
              <button onClick={handleComplete} disabled={!!completing}
                className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {completing ? 'Salvando...' : 'Confirmar conclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
