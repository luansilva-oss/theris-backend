import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { API_URL } from '../config';

interface AuditItem {
  id: string;
  tipo: string;
  entidadeTipo: string;
  descricao: string;
  createdAt: string;
  autor?: { name: string } | null;
}

interface EntityAuditHistoryProps {
  entidadeId: string;
  entidadeTipo: 'Role' | 'User' | 'Department' | 'Unit';
  limit?: number;
  /** Callback para abrir a página de histórico completo com filtros */
  onOpenFullHistory?: (params: { entidadeId: string; entidadeTipo: string }) => void;
}

function getBadgeColor(tipo: string): string {
  const verde = ['LOGIN_SUCCESS', 'USER_CREATED', 'USER_ACTIVATED', 'AEX_APPROVED', 'TICKET_RESOLVED', 'DEPARTMENT_CREATED', 'UNIT_CREATED', 'ROLE_CREATED', 'KBS_UPDATED'];
  const vermelho = ['LOGIN_FAILED', 'MFA_FAILED', 'SESSION_EXPIRED', 'USER_OFFBOARDED', 'AEX_OWNER_REJECTED', 'AEX_SI_REJECTED', 'AEX_AUTO_REJECTED', 'DEPARTMENT_DELETED', 'UNIT_DELETED', 'ROLE_DELETED', 'SESSION_REVOKED', 'BULK_SESSION_REVOKED', 'TICKET_REOPENED'];
  const azul = ['AEX_CREATED', 'TICKET_CREATED', 'MFA_SENT', 'CHANGE_ROLE'];
  const amarelo = ['USER_UPDATED', 'USER_ROLE_CHANGED', 'USER_MANAGER_CHANGED', 'TICKET_ASSIGNED', 'TICKET_COMMENTED', 'DEPARTMENT_UPDATED', 'UNIT_UPDATED', 'ROLE_UPDATED', 'AEX_OWNER_APPROVED', 'AEX_SI_APPROVED', 'REPORT_EXPORTED'];
  if (verde.includes(tipo)) return '#22c55e';
  if (vermelho.includes(tipo)) return '#ef4444';
  if (azul.includes(tipo)) return '#0EA5E9';
  if (amarelo.includes(tipo)) return '#eab308';
  if (tipo.startsWith('ROLE_')) return '#3b82f6';
  if (tipo.startsWith('USER_')) return '#0EA5E9';
  if (tipo.startsWith('DEPARTMENT_')) return '#eab308';
  if (tipo.startsWith('UNIT_')) return '#22c55e';
  return '#71717a';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const EntityAuditHistory: React.FC<EntityAuditHistoryProps> = ({
  entidadeId,
  entidadeTipo,
  limit = 5,
  onOpenFullHistory,
}) => {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entidadeId || !entidadeTipo) return;
    setLoading(true);
    fetch(`${API_URL}/api/audit-log?entidadeId=${encodeURIComponent(entidadeId)}&entidadeTipo=${encodeURIComponent(entidadeTipo)}&limit=${limit}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [entidadeId, entidadeTipo, limit]);

  if (loading) {
    return (
      <div style={{ padding: 12, color: '#71717a', fontSize: 13 }}>
        <Clock size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Carregando histórico...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: 12, color: '#71717a', fontSize: 13 }}>
        Nenhum registro de auditoria para esta entidade.
      </div>
    );
  }

  return (
    <div style={{ borderTop: '1px solid #27272a', paddingTop: 12, marginTop: 12 }}>
      <h5 style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={14} /> Histórico recente
      </h5>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((row) => (
          <li key={row.id} style={{ fontSize: 12, color: '#e4e4e7' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              background: `${getBadgeColor(row.tipo)}22`,
              color: getBadgeColor(row.tipo),
              marginRight: 8,
            }}>{row.tipo}</span>
            <span style={{ color: '#a1a1aa' }}>{formatDate(row.createdAt)}</span>
            <span style={{ marginLeft: 8 }}>— {row.descricao}</span>
          </li>
        ))}
      </ul>
      {onOpenFullHistory && (
        <button
          type="button"
          onClick={() => onOpenFullHistory({ entidadeId, entidadeTipo })}
          style={{
            marginTop: 10,
            background: 'transparent',
            border: 'none',
            color: '#38BDF8',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 0,
          }}
        >
          <ExternalLink size={12} /> Ver histórico completo
        </button>
      )}
    </div>
  );
};
