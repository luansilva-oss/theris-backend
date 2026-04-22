import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, CheckCircle, Layers, Download } from 'lucide-react';
import { computeEffectiveStatus, formatTtlSeconds, type EffectiveStatus } from '../utils/rootAccessStatus';
import type { RootAccessDetails } from '../types/rootAccess';
import { API_URL } from '../config';
import type { Toast } from '../components/ToastContainer';
import { rowMatchesRootAccessFilters, type RootAccessFilterRow } from '../lib/rootAccessReportFilters';

export type RootAccessReportItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  siApprovedAt: string | null;
  justification: string;
  requester: { id: string; name: string; email: string } | null;
  approver: { id: string; name: string; email: string } | null;
  revokedAt?: string | null;
  revokedBy?: { id: string; name: string; email: string } | null;
  revokeReason?: string | null;
  revokeTrigger?: 'CRON_EXPIRED' | 'ADMIN_EARLY' | null;
  details: RootAccessDetails | null;
};

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

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

type Props = {
  currentUserId: string;
  showToast: (message: string, type?: Toast['type']) => void;
  systemProfile: string;
};

function itemToFilterRow(item: RootAccessReportItem): RootAccessFilterRow {
  return {
    id: item.id,
    createdAt: item.createdAt,
    status: item.status,
    requesterId: item.requester?.id ?? null,
    requester: item.requester,
    details: item.details ? JSON.stringify(item.details) : null,
    revokedAt: item.revokedAt ?? null,
    revokeTrigger: item.revokeTrigger ?? null
  };
}

function localDayToIso(dateStr: string, end: boolean): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, d, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return dt.toISOString();
}

export default function InfraReport({ currentUserId, showToast, systemProfile }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<RootAccessReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<EffectiveStatus | 'ALL'>('ALL');

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/root-access`, {
          headers: { 'x-user-id': currentUserId }
        });
        if (!response.ok) throw new Error('Falha ao carregar');
        const data = (await response.json()) as RootAccessReportItem[];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setItems([]);
          showToast('Não foi possível carregar o relatório de infra.', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const filtered = useMemo(() => {
    return items.filter((item) =>
      rowMatchesRootAccessFilters(itemToFilterRow(item), {
        searchTerm,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        statusFilter
      })
    );
  }, [items, searchTerm, startDate, endDate, statusFilter]);

  const metrics = useMemo(() => {
    const total = filtered.length;
    const avgTtlSeconds =
      total === 0 ? 0 : filtered.reduce((acc, item) => acc + (item.details?.ttlSegundos ?? 0), 0) / total;
    const approvedCount = filtered.filter((item) => {
      const s = computeEffectiveStatus(item.status, item.details?.statusJc, item.revokeTrigger ?? undefined);
      return s === 'APPLIED' || s === 'APROVADO' || s === 'EXPIRED' || s === 'REVOKED_EXPIRED' || s === 'REVOKED_EARLY';
    }).length;
    const approvalRate = total === 0 ? 0 : approvedCount / total;
    const overlapsCount = filtered.filter((item) => item.details?.previousJumpcloudAccessRequestId != null).length;
    return {
      total,
      avgTtlSeconds,
      avgTtlFormatted: formatTtlSeconds(Math.floor(avgTtlSeconds)),
      approvalRate,
      approvalRateFormatted: `${Math.round(approvalRate * 100)}%`,
      overlapsCount
    };
  }, [filtered]);

  function handleClearFilters() {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
  }

  async function handleExportCsv() {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(systemProfile)) return;
    if (!startDate || !endDate) {
      showToast('Selecione as datas De e Até para exportar.', 'warning');
      return;
    }
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('type', 'ROOT_ACCESS');
      params.set('from', localDayToIso(startDate, false));
      params.set('to', localDayToIso(endDate, true));
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const q = searchTerm.trim();
      if (q) params.set('searchTerm', q);
      const res = await fetch(`${API_URL}/api/requests/export?${params}`, { headers: { 'x-user-id': currentUserId } });
      if (res.status === 403) {
        showToast('Sem permissão para exportar.', 'error');
        return;
      }
      if (!res.ok) {
        let msg = 'Falha no export';
        try {
          const err = (await res.json()) as { error?: string };
          if (err?.error) msg = err.error;
        } catch {
          /* ignore */
        }
        showToast(msg, 'error');
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      const fn = cd?.match(/filename="([^"]+)"/)?.[1] ?? 'infra-export.csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fn;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export concluído.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar.', 'error');
    } finally {
      setExporting(false);
    }
  }

  const canExport = ['ADMIN', 'SUPER_ADMIN'].includes(systemProfile);

  return (
    <div className="fade-in" style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ color: 'white', fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} /> Relatório de Infra
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: 13, margin: '8px 0 0' }}>Pedidos de acesso root (JumpCloud), após filtro: {metrics.total}</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={!canExport || exporting || !startDate || !endDate}
          title={
            !canExport
              ? 'Apenas administradores podem exportar'
              : !startDate || !endDate
                ? 'Selecione De e Até para exportar'
                : 'Baixar CSV com os mesmos filtros da tabela'
          }
          onClick={() => void handleExportCsv()}
          style={{
            opacity: !canExport || !startDate || !endDate ? 0.55 : 1,
            cursor: !canExport || !startDate || !endDate || exporting ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Download size={16} /> {exporting ? 'Exportando…' : 'Baixar Relatório'}
        </button>
      </div>

      <div className="metrics-grid">
        <MetricCard icon={<Layers size={22} />} label="Total de pedidos" value={metrics.total.toString()} />
        <MetricCard icon={<Clock size={22} />} label="TTL médio" value={metrics.avgTtlFormatted} />
        <MetricCard icon={<CheckCircle size={22} />} label="Taxa de aprovação" value={metrics.approvalRateFormatted} />
        <MetricCard icon={<Shield size={22} />} label="Sobreposições" value={metrics.overlapsCount.toString()} />
      </div>

      <div
        className="report-filters-bar"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, background: '#18181b', padding: 16, borderRadius: 12, border: '1px solid #27272a', alignItems: 'center' }}
      >
        <input
          type="text"
          placeholder="Solicitante, e-mail, hostname ou ID…"
          className="form-input"
          style={{ flex: '1 1 220px', minWidth: 180 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <input type="date" className="form-input" style={{ width: 'auto' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="form-input" style={{ width: 'auto' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: 200 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EffectiveStatus | 'ALL')}
        >
          <option value="ALL">Status: todos</option>
          <option value="PENDING_SI">Aguardando SI</option>
          <option value="APROVADO">Aprovado (aguardando JC)</option>
          <option value="APPLIED">Aplicado</option>
          <option value="REJECTED">Reprovado</option>
          <option value="FAILED">Falha JC</option>
          <option value="EXPIRED">Expirado</option>
          <option value="REVOKED_EARLY">Revogado (admin)</option>
          <option value="REVOKED_EXPIRED">Revogado (expirado)</option>
        </select>
        <button type="button" className="btn-text" onClick={handleClearFilters}>
          Limpar filtros
        </button>
      </div>

      <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left', color: '#a1a1aa' }}>
                <th style={{ padding: '12px 16px' }}>ID</th>
                <th style={{ padding: '12px 16px' }}>Solicitante</th>
                <th style={{ padding: '12px 16px' }}>Device</th>
                <th style={{ padding: '12px 16px' }}>TTL</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Aprovador</th>
                <th style={{ padding: '12px 16px' }}>Data</th>
                <th style={{ padding: '12px 16px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#52525b' }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((item) => {
                  const effective = computeEffectiveStatus(item.status, item.details?.statusJc, item.revokeTrigger ?? undefined);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #27272a', color: '#e4e4e7' }}>
                      <td style={{ padding: '12px 16px' }} title={item.id}>
                        #{item.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {item.requester?.name ?? '—'}
                        <br />
                        <small style={{ color: '#71717a' }}>{item.requester?.email ?? ''}</small>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ fontSize: 12 }}>{item.details?.hostname ?? '—'}</code>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {item.details ? formatTtlSeconds(item.details.ttlSegundos) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={effective} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>{item.approver?.name ?? '—'}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button type="button" className="btn-text" onClick={() => navigate(`/infra-report/${item.id}`)}>
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
