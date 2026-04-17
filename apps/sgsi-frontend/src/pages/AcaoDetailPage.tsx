import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { getAction, completeAction, updateAction } from '../lib/api';
import type { Action } from '../lib/api';
import { StatusBadge } from '../components/shared/StatusBadge';
import { frequencyLabels, typeLabels } from '../lib/labels';

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
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = () => {
    if (!id) { setLoading(false); setAction(null); return; }
    getAction(id).then(a => {
      setAction(a);
      setNotesValue(a.notes ?? '');
    }).finally(() => setLoading(false));
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
    } catch { alert('Erro ao registrar conclusão.'); }
    finally { setSaving(false); }
  }

  async function handleSaveNotes() {
    if (!id) return;
    setSavingNotes(true);
    try {
      await updateAction(id, { notes: notesValue });
      setEditingNotes(false);
      load();
    } catch { alert('Erro ao salvar observações.'); }
    finally { setSavingNotes(false); }
  }

  const inputStyle = {
    background: 'var(--color-bg)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
  };

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: 'var(--color-text-muted)' }}>Carregando...</div>;
  if (!action) return <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>Ação não encontrada.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate('/acoes')}
        className="flex items-center gap-2 text-sm hover:opacity-80"
        style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{action.name}</h1>
          <StatusBadge status={action.status} />
        </div>
        {['OVERDUE', 'DUE_SOON', 'IN_PROGRESS', 'SCHEDULED'].includes(action.status) && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 shrink-0"
            style={{ background: '#22c55e', color: '#fff' }}>
            <CheckCircle size={14} /> Concluir
          </button>
        )}
      </div>

      {/* Info grid */}
      <div className="rounded-xl border p-5 grid grid-cols-2 gap-x-8 gap-y-5"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Tipo</div>
          <div className="text-sm" style={{ color: 'var(--color-text)' }}>{typeLabels[action.type] ?? action.type}</div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Frequência</div>
          <div className="text-sm" style={{ color: 'var(--color-text)' }}>{frequencyLabels[action.frequency] ?? action.frequency}</div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Próximo vencimento</div>
          <div className="text-sm font-medium" style={{
            color: action.status === 'OVERDUE' ? 'var(--color-danger)'
              : action.status === 'DUE_SOON' ? 'var(--color-warning)'
              : 'var(--color-text)',
          }}>
            {formatDate(action.nextDueDate)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Referência</div>
          <div className="text-sm" style={{ color: 'var(--color-text)' }}>{action.referenceCode || '—'}</div>
        </div>
        <div className="col-span-2">
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Controles ISO</div>
          <div className="text-sm" style={{ color: 'var(--color-text)' }}>
            {action.isoControls?.length ? action.isoControls.join(', ') : '—'}
          </div>
        </div>

        {/* Observações inline */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Observações</div>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)}
                className="text-xs hover:opacity-80"
                style={{ color: 'var(--color-primary)' }}>Editar</button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea value={notesValue} onChange={e => setNotesValue(e.target.value)}
                rows={3} className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
                style={inputStyle} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setEditingNotes(false); setNotesValue(action.notes ?? ''); }}
                  className="text-xs px-3 py-1.5 rounded hover:opacity-80"
                  style={{ color: 'var(--color-text-muted)' }}>Cancelar</button>
                <button onClick={handleSaveNotes} disabled={savingNotes}
                  className="text-xs px-3 py-1.5 rounded font-medium hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}>
                  {savingNotes ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm" style={{ color: action.notes ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
              {action.notes || 'Nenhuma observação'}
            </div>
          )}
        </div>
      </div>

      {/* Histórico de execuções */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Histórico de execuções</h2>
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
                  <div className="text-sm" style={{ color: 'var(--color-text)' }}>{ex.completedByName || 'Responsável'}</div>
                  {ex.notes && <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{ex.notes}</div>}
                </div>
                <div className="text-xs shrink-0 ml-4" style={{ color: 'var(--color-text-muted)' }}>{formatDateTime(ex.completedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal concluir */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowModal(false)}>
          <div className="rounded-xl p-6 w-full max-w-md border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Registrar conclusão</h3>
            <textarea placeholder="Observações (opcional)" value={notes}
              onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none mb-4"
              style={inputStyle} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
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
