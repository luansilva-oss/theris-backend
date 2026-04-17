import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  getActions, completeAction, createAction, updateAction, deleteAction,
} from '../lib/api';
import type { Action, ActionStatus, ActionFrequency } from '../lib/api';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { frequencyLabels, typeLabels, statusLabels } from '../lib/labels';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

const statusOptions: { value: ActionStatus | ''; label: string }[] = [
  { value: '',            label: 'Todos os status' },
  { value: 'OVERDUE',    label: 'Atrasadas' },
  { value: 'DUE_SOON',   label: 'Vencendo em breve' },
  { value: 'SCHEDULED',  label: 'Agendadas' },
  { value: 'IN_PROGRESS',label: 'Em andamento' },
  { value: 'COMPLETED',  label: 'Concluídas' },
];

const frequencyOptions: { value: ActionFrequency; label: string }[] = [
  { value: 'DAILY',      label: 'Diário' },
  { value: 'WEEKLY',     label: 'Semanal' },
  { value: 'BIWEEKLY',   label: 'Quinzenal' },
  { value: 'MONTHLY',    label: 'Mensal' },
  { value: 'QUARTERLY',  label: 'Trimestral' },
  { value: 'SEMIANNUAL', label: 'Semestral' },
  { value: 'ANNUAL',     label: 'Anual' },
  { value: 'ON_DEMAND',  label: 'Conforme Demanda' },
];

const typeOptions = [
  { value: 'MEETING',  label: 'Reunião/Ação' },
  { value: 'REVIEW',   label: 'Revisão' },
  { value: 'AUDIT',    label: 'Auditoria' },
  { value: 'TRAINING', label: 'Treinamento' },
  { value: 'ACTIVITY', label: 'Atividade' },
  { value: 'REPORT',   label: 'Relatório' },
];

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

const emptyForm = {
  name: '',
  type: 'REVIEW',
  frequency: 'MONTHLY' as ActionFrequency,
  isoControls: '',
  nextDueAt: '',
  notes: '',
};

export function AcoesPage() {
  const navigate = useNavigate();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState<Action | null>(null);
  const [completingNotes, setCompletingNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [confirmData, setConfirmData] = useState<{ message: string; onConfirm: () => void } | null>(null);

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

  function openCreate() {
    setEditingAction(null);
    setForm(emptyForm);
    setShowFormModal(true);
  }

  function openEdit(action: Action, e: MouseEvent) {
    e.stopPropagation();
    setEditingAction(action);
    setForm({
      name: action.name,
      type: action.type,
      frequency: action.frequency,
      isoControls: (action.isoControls ?? []).join(', '),
      nextDueAt: action.nextDueDate ? action.nextDueDate.slice(0, 10) : '',
      notes: action.notes ?? '',
    });
    setShowFormModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type,
      frequency: form.frequency,
      isoControls: form.isoControls.split(',').map(s => s.trim()).filter(Boolean),
      nextDueAt: form.nextDueAt ? new Date(form.nextDueAt).toISOString() : new Date().toISOString(),
      notes: form.notes || null,
    };
    try {
      if (editingAction) {
        await updateAction(editingAction.id, payload);
      } else {
        await createAction({ ...payload, responsibleEmail: 'luan.silva@grupo-3c.com' });
      }
      setShowFormModal(false);
      load();
    } catch {
      toast('Erro ao salvar ação.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(action: Action, e: MouseEvent) {
    e.stopPropagation();
    setConfirmData({
      message: `Excluir a ação "${action.name}"? Esta operação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmData(null);
        try {
          await deleteAction(action.id);
          toast('Ação excluída com sucesso.', 'success');
          load();
        } catch {
          toast('Erro ao excluir ação.', 'error');
        }
      },
    });
  }

  async function handleComplete() {
    if (!showCompleteModal) return;
    setCompleting(true);
    try {
      await completeAction(showCompleteModal.id, completingNotes);
      setShowCompleteModal(null);
      toast('Conclusão registrada com sucesso!', 'success');
      setCompletingNotes('');
      load();
    } catch {
      toast('Erro ao registrar conclusão.', 'error');
    } finally {
      setCompleting(false);
    }
  }

  const inputStyle = {
    background: 'var(--color-bg)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Ações Recorrentes
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Controle do CON-G3C-10 — Mapa de ações recorrentes do SGSI
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80"
          style={{ background: 'var(--color-primary)', color: '#fff' }}>
          <Plus size={14} /> Nova ação
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Buscar ação..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border outline-none"
          style={{ ...inputStyle, width: 240 }} />
        <select value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ActionStatus | '')}
          className="text-sm px-3 py-2 rounded-lg border outline-none"
          style={inputStyle}>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                {['Ação', 'Tipo', 'Frequência', 'Próximo vencimento', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {filtered.map(action => (
                <tr key={action.id}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onClick={() => navigate(`/acoes/${action.id}`)}>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                    <div className="font-medium">{action.name}</div>
                    {action.isoControls?.length > 0 && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        ISO: {action.isoControls.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {typeLabels[action.type] ?? action.type}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {frequencyLabels[action.frequency] ?? action.frequency}
                  </td>
                  <td className="px-4 py-3">
                    <span style={{
                      color: action.status === 'OVERDUE' ? 'var(--color-danger)'
                        : action.status === 'DUE_SOON' ? 'var(--color-warning)'
                        : 'var(--color-text-muted)',
                      fontWeight: ['OVERDUE', 'DUE_SOON'].includes(action.status) ? 600 : 400,
                      fontSize: '0.8rem',
                    }}>
                      {formatDate(action.nextDueDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3" title={statusLabels[action.status]}>
                    <StatusBadge status={action.status} />
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {['OVERDUE', 'DUE_SOON', 'IN_PROGRESS', 'SCHEDULED'].includes(action.status) && (
                        <button onClick={() => setShowCompleteModal(action)}
                          title="Concluir"
                          className="p-1.5 rounded hover:opacity-80"
                          style={{ color: '#22c55e' }}>
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button onClick={e => openEdit(action, e)}
                        title="Editar"
                        className="p-1.5 rounded hover:opacity-80"
                        style={{ color: 'var(--color-text-muted)' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={e => handleDelete(action, e)}
                        title="Excluir"
                        className="p-1.5 rounded hover:opacity-80"
                        style={{ color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal criar/editar */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowFormModal(false)}>
          <div className="rounded-xl p-6 w-full max-w-lg border overflow-y-auto max-h-[90vh]"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text)' }}>
              {editingAction ? 'Editar ação' : 'Nova ação recorrente'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                    style={inputStyle}>
                    {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Frequência</label>
                  <select value={form.frequency}
                    onChange={e => setForm(f => ({ ...f, frequency: e.target.value as ActionFrequency }))}
                    className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                    style={inputStyle}>
                    {frequencyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Próximo vencimento</label>
                <input type="date" value={form.nextDueAt}
                  onChange={e => setForm(f => ({ ...f, nextDueAt: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={inputStyle} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                  Controles ISO (separados por vírgula)
                </label>
                <input value={form.isoControls}
                  onChange={e => setForm(f => ({ ...f, isoControls: e.target.value }))}
                  placeholder="5.15, 8.2, ..."
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={inputStyle} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
                  style={inputStyle} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowFormModal(false)}
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {saving ? 'Salvando...' : editingAction ? 'Salvar alterações' : 'Criar ação'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <textarea placeholder="Observações (opcional)" value={completingNotes}
              onChange={e => setCompletingNotes(e.target.value)} rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none mb-4"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCompleteModal(null)}
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}>Cancelar</button>
              <button onClick={handleComplete} disabled={completing}
                className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {completing ? 'Salvando...' : 'Confirmar conclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <ConfirmDialog
          message={confirmData.message}
          danger
          confirmLabel="Excluir"
          onConfirm={confirmData.onConfirm}
          onCancel={() => setConfirmData(null)}
        />
      )}
    </div>
  );
}
