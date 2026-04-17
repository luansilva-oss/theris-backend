import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { getAction, completeAction } from '../lib/api';
import type { Action } from '../lib/api';
import { StatusBadge } from '../components/shared/StatusBadge';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AcaoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) {
      setLoading(false);
      setAction(null);
      return;
    }
    getAction(id).then(setAction).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  async function handleComplete() {
    if (!id) return;
    setSaving(true);
    try {
      await completeAction(id, notes);
      setShowModal(false);
      setNotes('');
      load();
    } catch {
      alert('Erro ao registrar conclusão.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--color-text-muted)' }}>
      Carregando...
    </div>
  );

  if (!action) return (
    <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
      Ação não encontrada.
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate('/acoes')}
        className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
        style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            {action.name}
          </h1>
          <StatusBadge status={action.status} />
        </div>
        {['OVERDUE', 'DUE_SOON', 'IN_PROGRESS', 'SCHEDULED'].includes(action.status) && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80"
            style={{ background: '#22c55e', color: '#fff' }}>
            <CheckCircle size={14} /> Concluir
          </button>
        )}
      </div>

      {/* Info grid */}
      <div className="rounded-xl border p-5 grid grid-cols-2 gap-4"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {[
          { label: 'Tipo', value: action.type },
          { label: 'Frequência', value: action.frequency },
          { label: 'Próximo vencimento', value: formatDate(action.nextDueDate) },
          { label: 'Referência', value: action.referenceCode || '—' },
          { label: 'Controles ISO', value: action.isoControls?.join(', ') || '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>{value}</div>
          </div>
        ))}
        {action.notes && (
          <div className="col-span-2">
            <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Observações</div>
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>{action.notes}</div>
          </div>
        )}
      </div>

      {/* Histórico de execuções */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Histórico de execuções
          </h2>
        </div>
        {!action.executions?.length ? (
          <div className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            Nenhuma execução registrada
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {action.executions.map(ex => (
              <div key={ex.id} className="px-5 py-3 flex items-start justify-between">
                <div>
                  <div className="text-sm" style={{ color: 'var(--color-text)' }}>
                    {ex.completedByName || 'Responsável'}
                  </div>
                  {ex.notes && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {ex.notes}
                    </div>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDateTime(ex.completedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowModal(false)}>
          <div className="rounded-xl p-6 w-full max-w-md border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
              Registrar conclusão
            </h3>
            <textarea
              placeholder="Observações (opcional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none mb-4"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}>Cancelar</button>
              <button onClick={handleComplete} disabled={saving}
                className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
