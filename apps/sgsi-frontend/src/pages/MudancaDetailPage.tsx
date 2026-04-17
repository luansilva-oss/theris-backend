import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getChange, updateChange, decideChange, closeChange } from '../lib/api';
import type { Change } from '../lib/api';
import { StatusBadge } from '../components/shared/StatusBadge';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export function MudancaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [change, setChange] = useState<Change | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [decision, setDecision] = useState('');
  const { toast } = useToast();
  const [confirmClose, setConfirmClose] = useState(false);

  const load = () => {
    if (!id) {
      setLoading(false);
      setChange(null);
      return;
    }
    getChange(id).then(c => {
      setChange(c);
      setMeetingDate(c.meetingDate?.slice(0, 10) || '');
      setMeetingNotes(c.meetingNotes || '');
      setDecision(c.decision || '');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  async function handleScheduleMeeting() {
    if (!id || !meetingDate) return;
    setSaving(true);
    try {
      await updateChange(id, { status: 'MEETING_SCHEDULED', meetingDate: new Date(meetingDate).toISOString(), meetingNotes });
      toast('Reunião agendada.', 'success');
      load();
    } catch { toast('Erro ao agendar reunião.', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDecide() {
    if (!id || !decision) return;
    setSaving(true);
    try {
      await decideChange(id, decision, []);
      toast('Decisão registrada.', 'success');
      load();
    } catch { toast('Erro ao registrar decisão.', 'error'); }
    finally { setSaving(false); }
  }

  const lifecycle: { status: string; label: string }[] = [
    { status: 'OPEN', label: 'Aberta' },
    { status: 'MEETING_SCHEDULED', label: 'Reunião agendada' },
    { status: 'DECISION_RECORDED', label: 'Decisão registrada' },
    { status: 'CLOSED', label: 'Encerrada' },
  ];

  const currentIdx = lifecycle.findIndex(l => l.status === change?.status);

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: 'var(--color-text-muted)' }}>Carregando...</div>;
  if (!change) return <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>Mudança não encontrada.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate('/mudancas')}
        className="flex items-center gap-2 text-sm hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={14} /> Voltar
      </button>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded"
            style={{ background: change.urgency === 'IMEDIATA' ? '#ef444422' : '#f59e0b22', color: change.urgency === 'IMEDIATA' ? '#ef4444' : '#f59e0b' }}>
            {change.urgency}
          </span>
          <StatusBadge status={change.status} type="change" />
        </div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>{change.title}</h1>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>Timeline</h2>
        <div className="flex items-center gap-0">
          {lifecycle.map((step, idx) => (
            <div key={step.status} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: idx <= currentIdx ? 'var(--color-primary)' : 'var(--color-border)',
                    color: idx <= currentIdx ? '#fff' : 'var(--color-text-muted)',
                  }}>
                  {idx + 1}
                </div>
                <div className="text-xs mt-1 text-center w-20" style={{ color: idx <= currentIdx ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  {step.label}
                </div>
              </div>
              {idx < lifecycle.length - 1 && (
                <div className="flex-1 h-px mx-1" style={{ background: idx < currentIdx ? 'var(--color-primary)' : 'var(--color-border)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border p-5 space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {change.description && (
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Descrição</div>
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>{change.description}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Aberta em</div>
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>{formatDate(change.createdAt)}</div>
          </div>
          {change.isoControls?.length > 0 && (
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Controles ISO</div>
              <div className="text-sm" style={{ color: 'var(--color-text)' }}>{change.isoControls.join(', ')}</div>
            </div>
          )}
          {change.meetingDate && (
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Data da reunião</div>
              <div className="text-sm" style={{ color: 'var(--color-text)' }}>{formatDate(change.meetingDate)}</div>
            </div>
          )}
          {change.decision && (
            <div className="col-span-2">
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Decisão</div>
              <div className="text-sm" style={{ color: 'var(--color-text)' }}>{change.decision}</div>
            </div>
          )}
        </div>
      </div>

      {/* Ações por status */}
      {change.status === 'OPEN' && (
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Agendar reunião</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Data da reunião</label>
              <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
          </div>
          <textarea value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)}
            placeholder="Notas da reunião (opcional)" rows={2}
            className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          <button onClick={handleScheduleMeeting} disabled={saving || !meetingDate}
            className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}>
            {saving ? 'Salvando...' : 'Confirmar agendamento'}
          </button>
        </div>
      )}

      {change.status === 'MEETING_SCHEDULED' && (
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Registrar decisão</h2>
          <textarea value={decision} onChange={e => setDecision(e.target.value)}
            placeholder="Descreva a decisão tomada..." rows={3}
            className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          <button onClick={handleDecide} disabled={saving || !decision.trim()}
            className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}>
            {saving ? 'Salvando...' : 'Registrar decisão'}
          </button>
        </div>
      )}

      {change.status === 'DECISION_RECORDED' && (
        <button onClick={() => setConfirmClose(true)} disabled={saving}
          className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
          style={{ background: '#22c55e', color: '#fff' }}>
          {saving ? 'Encerrando...' : 'Encerrar mudança'}
        </button>
      )}

      {confirmClose && (
        <ConfirmDialog
          message="Encerrar esta mudança? Ela ficará como concluída."
          confirmLabel="Encerrar"
          onConfirm={async () => {
            setConfirmClose(false);
            if (!id) return;
            setSaving(true);
            try {
              await closeChange(id);
              toast('Mudança encerrada.', 'success');
              load();
            } catch {
              toast('Erro ao encerrar.', 'error');
            } finally {
              setSaving(false);
            }
          }}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </div>
  );
}
