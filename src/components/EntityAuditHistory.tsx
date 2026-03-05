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
  if (tipo.startsWith('ROLE_')) return '#3b82f6';
  if (tipo.startsWith('USER_')) return '#8b5cf6';
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
            color: '#a78bfa',
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
