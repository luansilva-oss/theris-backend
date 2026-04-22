import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { computeEffectiveStatus, formatTtlSeconds, type EffectiveStatus } from '../utils/rootAccessStatus';
import type { RootAccessDetails } from '../types/rootAccess';
import { URGENCIA_LABELS } from '../types/rootAccess';
import { API_URL } from '../config';
import type { RootAccessReportItem } from './InfraReport';
import type { Toast } from '../components/ToastContainer';

const STATUS_BADGE: Record<
  EffectiveStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  PENDING_SI: { label: 'Aguardando SI', bg: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: 'rgba(234, 179, 8, 0.35)' },
  APROVADO: { label: 'Aprovado', bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' },
  APPLIED: { label: 'Aplicado', bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
  REJECTED: { label: 'Reprovado', bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },
  FAILED: { label: 'Falha JC', bg: 'rgba(220, 38, 38, 0.15)', color: '#fca5a5', border: 'rgba(220, 38, 38, 0.4)' },
  EXPIRED: { label: 'Expirado', bg: 'rgba(113, 113, 122, 0.2)', color: '#a1a1aa', border: '#3f3f46' },
  REVOKED_EARLY: { label: 'Revogado (admin)', bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.4)' },
  REVOKED_EXPIRED: { label: 'Revogado (expirado)', bg: 'rgba(82, 82, 91, 0.35)', color: '#d4d4d8', border: '#52525b' }
};

function StatusBadge({ status }: { status: EffectiveStatus }) {
  const c = STATUS_BADGE[status];
  return (
    <span
      className="infra-status-badge"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {c.label}
    </span>
  );
}

type DetailData = RootAccessReportItem & { siApprovedBy?: string | null };

type TimelineEvent = {
  label: string;
  timestamp: string;
  by: string;
  icon: string;
  error?: string | null;
};

type Props = {
  currentUserId: string;
  requestId: string;
  systemProfile: string;
  showToast: (message: string, type?: Toast['type']) => void;
};

export default function InfraReportDetail({ currentUserId, requestId, systemProfile, showToast }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/root-access/${encodeURIComponent(requestId)}`, {
        headers: { 'x-user-id': currentUserId }
      });
      if (response.status === 403) {
        throw new Error('Você não tem permissão para ver este registro');
      }
      if (!response.ok) {
        throw new Error('Registro não encontrado');
      }
      const d = (await response.json()) as DetailData;
      setData(d);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setRevokeOpen(false);
    setRevokeReason('');
    setRevokeConfirm(false);
  }, [requestId]);

  const events = useMemo((): TimelineEvent[] => {
    if (!data) return [];
    const d = data.details;
    const list: TimelineEvent[] = [
      {
        label: 'Solicitação criada',
        timestamp: data.createdAt,
        by: data.requester?.name ?? '—',
        icon: '📝'
      }
    ];
    if (data.siApprovedAt) {
      list.push({
        label: data.status === 'REJECTED' ? 'Reprovado pelo SI' : 'Aprovado pelo SI',
        timestamp: data.siApprovedAt,
        by: data.approver?.name ?? '—',
        icon: data.status === 'REJECTED' ? '❌' : '✅'
      });
    }
    if (d?.appliedAt) {
      list.push({
        label: 'Aplicado no JumpCloud',
        timestamp: d.appliedAt,
        by: 'Sistema',
        icon: '🔐'
      });
    }
    if (data.revokedAt) {
      list.push({
        label:
          data.revokeTrigger === 'ADMIN_EARLY'
            ? 'Acesso revogado antecipadamente (admin)'
            : 'Acesso encerrado (expiração + JumpCloud)',
        timestamp: typeof data.revokedAt === 'string' ? data.revokedAt : new Date(data.revokedAt).toISOString(),
        by: data.revokedBy?.name ?? 'Sistema',
        icon: '🔕',
        error: data.revokeReason ?? null
      });
    } else if (d?.statusJc === 'EXPIRED' && d.expiryAt) {
      list.push({
        label: 'Acesso expirado',
        timestamp: d.expiryAt,
        by: 'Automático',
        icon: '⌛'
      });
    }
    if (d?.statusJc === 'FAILED' && d.lastErrorAt) {
      list.push({
        label: 'Falha ao aplicar no JC',
        timestamp: d.lastErrorAt,
        by: 'Sistema',
        icon: '⚠️',
        error: d.lastError
      });
    }
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return list;
  }, [data]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>
        Carregando…
      </div>
    );
  }
  if (error) {
    return (
      <div className="fade-in" style={{ padding: '24px 24px 48px' }}>
        <button type="button" className="btn-text" onClick={() => navigate('/infra-report')} style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={18} /> Voltar ao relatório
        </button>
        <div style={{ color: '#f87171', fontSize: 15 }}>{error}</div>
      </div>
    );
  }
  if (!data) return null;

  const effective = computeEffectiveStatus(data.status, data.details?.statusJc, data.revokeTrigger ?? undefined);
  const d = data.details;

  const canRevoke =
    ['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) &&
    (data.status === 'APROVADO' || data.status === 'APPROVED') &&
    d?.statusJc === 'APPLIED' &&
    !data.revokedAt;

  async function submitRevoke() {
    if (!canRevoke || revokeReason.trim().length < 10 || !revokeConfirm) return;
    setRevokeSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/requests/${encodeURIComponent(requestId)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ reason: revokeReason.trim() })
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        showToast('Acesso revogado com sucesso.', 'success');
        setRevokeOpen(false);
        setRevokeReason('');
        setRevokeConfirm(false);
        await load();
        return;
      }
      if (res.status === 409) {
        showToast('Request não está em status revogável.', 'warning');
        return;
      }
      showToast(body.error || 'Erro ao revogar.', 'error');
    } catch (e) {
      console.error(e);
      showToast('Erro de rede ao revogar.', 'error');
    } finally {
      setRevokeSubmitting(false);
    }
  }

  return (
    <div className="fade-in" style={{ padding: '0 24px 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <button type="button" className="btn-text" onClick={() => navigate('/infra-report')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={18} /> Voltar ao Relatório de Infra
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ color: 'white', fontSize: 22, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={26} /> Acesso root #{data.id.slice(0, 8)}
        </h2>
        <StatusBadge status={effective} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card-base">
          <h3 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Solicitante</h3>
          <p style={{ margin: 0, color: '#fff', fontWeight: 600 }}>{data.requester?.name ?? '—'}</p>
          <p style={{ margin: '8px 0 0', color: '#a1a1aa', fontSize: 14 }}>{data.requester?.email ?? '—'}</p>
        </div>
        {(data.approver || data.siApprovedAt) && (
          <div className="card-base">
            <h3 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aprovador</h3>
            <p style={{ margin: 0, color: '#fff', fontWeight: 600 }}>{data.approver?.name ?? '—'}</p>
            <p style={{ margin: '8px 0 0', color: '#a1a1aa', fontSize: 14 }}>{data.approver?.email ?? ''}</p>
          </div>
        )}
        <div className="card-base">
          <h3 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Device</h3>
          <p style={{ margin: 0 }}>
            <code style={{ fontSize: 13 }}>{d?.hostname ?? '—'}</code>
          </p>
          <p style={{ margin: '10px 0 0', color: '#a1a1aa', fontSize: 13 }}>Empresa: {d?.empresa ?? '—'}</p>
          <p style={{ margin: '4px 0 0', color: '#a1a1aa', fontSize: 13 }}>OS: {d?.os ?? '—'}</p>
        </div>
        <div className="card-base">
          <h3 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duração</h3>
          <p style={{ margin: 0, color: '#e4e4e7' }}>TTL: {d ? formatTtlSeconds(d.ttlSegundos) : '—'}</p>
          <p style={{ margin: '8px 0 0', color: '#a1a1aa', fontSize: 13 }}>
            Expira em: {d?.expiryAt ? new Date(d.expiryAt).toLocaleString('pt-BR') : '—'}
          </p>
          <p style={{ margin: '8px 0 0', color: '#a1a1aa', fontSize: 13 }}>
            Urgência: {d?.urgencia ? URGENCIA_LABELS[d.urgencia] ?? d.urgencia : '—'}
          </p>
        </div>
      </div>

      <div className="card-base" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Justificativa</h3>
        <p style={{ margin: 0, color: '#e4e4e7', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{data.justification || '—'}</p>
      </div>

      <div className="card-base" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Linha do tempo</h3>
        <ul className="infra-timeline">
          {events.map((e, i) => (
            <li key={`${e.label}-${i}`}>
              <span className="timeline-icon">{e.icon}</span>
              <div>
                <strong style={{ color: '#fff' }}>{e.label}</strong>
                <div style={{ color: '#a1a1aa', fontSize: 13, marginTop: 4 }}>{new Date(e.timestamp).toLocaleString('pt-BR')}</div>
                <small style={{ color: '#71717a' }}>por {e.by}</small>
                {e.error ? (
                  <div style={{ color: e.label.includes('revogado') ? '#a1a1aa' : '#f87171', marginTop: 8, fontSize: 13 }}>
                    {e.label.includes('revogado') ? 'Motivo: ' : 'Erro: '}
                    {e.error}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {canRevoke ? (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              setRevokeOpen(true);
              setRevokeReason('');
              setRevokeConfirm(false);
            }}
            style={{
              background: 'rgba(220, 38, 38, 0.2)',
              color: '#fca5a5',
              border: '1px solid rgba(220, 38, 38, 0.5)',
              borderRadius: 8,
              padding: '10px 18px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Revogar agora
          </button>
        </div>
      ) : null}

      {revokeOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          role="presentation"
          onClick={() => !revokeSubmitting && setRevokeOpen(false)}
        >
          <div
            className="card-base"
            style={{ maxWidth: 480, width: '100%', cursor: 'default' }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', color: '#fff' }}>Revogar acesso root</h3>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>
              O sudo será removido imediatamente no JumpCloud. Esta ação é auditada e notificada ao solicitante e ao aprovador.
            </p>
            <label style={{ display: 'block', color: '#e4e4e7', fontSize: 13, marginBottom: 8 }}>Motivo da revogação (mín. 10 caracteres)</label>
            <textarea
              className="form-input"
              rows={4}
              maxLength={500}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              style={{ width: '100%', marginBottom: 8 }}
              placeholder="Descreva o motivo operacional…"
            />
            <div style={{ fontSize: 12, color: revokeReason.trim().length < 10 ? '#f87171' : '#71717a', marginBottom: 14 }}>
              {revokeReason.trim().length}/500
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e4e4e7', fontSize: 14, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={revokeConfirm} onChange={(e) => setRevokeConfirm(e.target.checked)} />
              Confirmo que o acesso será removido imediatamente no JumpCloud.
            </label>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-text" disabled={revokeSubmitting} onClick={() => setRevokeOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={revokeSubmitting || revokeReason.trim().length < 10 || !revokeConfirm}
                onClick={() => void submitRevoke()}
                style={{
                  background: '#b91c1c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontWeight: 600,
                  cursor: revokeSubmitting || revokeReason.trim().length < 10 || !revokeConfirm ? 'not-allowed' : 'pointer',
                  opacity: revokeSubmitting || revokeReason.trim().length < 10 || !revokeConfirm ? 0.5 : 1
                }}
              >
                {revokeSubmitting ? 'Revogando…' : 'Confirmar revogação'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {d && (d.jumpcloudDeviceId || d.jumpcloudAccessRequestId) ? (
        <div className="card-base">
          <h3 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Detalhes técnicos JumpCloud</h3>
          {d.jumpcloudDeviceId ? (
            <p style={{ margin: '6px 0', color: '#e4e4e7', fontSize: 13 }}>
              Device ID: <code>{d.jumpcloudDeviceId}</code>
            </p>
          ) : null}
          {d.jumpcloudUserId ? (
            <p style={{ margin: '6px 0', color: '#e4e4e7', fontSize: 13 }}>
              User ID: <code>{d.jumpcloudUserId}</code>
            </p>
          ) : null}
          {d.jumpcloudAccessRequestId ? (
            <p style={{ margin: '6px 0', color: '#e4e4e7', fontSize: 13 }}>
              Access Request ID: <code>{d.jumpcloudAccessRequestId}</code>
            </p>
          ) : null}
          {d.previousJumpcloudAccessRequestId ? (
            <p style={{ margin: '6px 0', color: '#e4e4e7', fontSize: 13 }}>
              Substituiu anterior: <code>{d.previousJumpcloudAccessRequestId}</code> (sobreposição)
            </p>
          ) : null}
          <p style={{ marginTop: 14 }}>
            <a href="https://console.jumpcloud.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>
              Abrir console JumpCloud
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
