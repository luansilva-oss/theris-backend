import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { computeEffectiveStatus, formatTtlSeconds, type EffectiveStatus } from '../utils/rootAccessStatus';
import type { RootAccessDetails } from '../types/rootAccess';
import { URGENCIA_LABELS } from '../types/rootAccess';
import { API_URL } from '../config';
import type { RootAccessReportItem } from './InfraReport';

const STATUS_BADGE: Record<
  EffectiveStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  PENDING_SI: { label: 'Aguardando SI', bg: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: 'rgba(234, 179, 8, 0.35)' },
  APROVADO: { label: 'Aprovado', bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' },
  APPLIED: { label: 'Aplicado', bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
  REJECTED: { label: 'Reprovado', bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },
  FAILED: { label: 'Falha JC', bg: 'rgba(220, 38, 38, 0.15)', color: '#fca5a5', border: 'rgba(220, 38, 38, 0.4)' },
  EXPIRED: { label: 'Expirado', bg: 'rgba(113, 113, 122, 0.2)', color: '#a1a1aa', border: '#3f3f46' }
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
};

export default function InfraReportDetail({ currentUserId, requestId }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
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
        if (!cancelled) setData(d);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, requestId]);

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
    if (d?.statusJc === 'EXPIRED' && d.expiryAt) {
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

  const effective = computeEffectiveStatus(data.status, data.details?.statusJc);
  const d = data.details;

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
                {e.error ? <div style={{ color: '#f87171', marginTop: 8, fontSize: 13 }}>Erro: {e.error}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

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
