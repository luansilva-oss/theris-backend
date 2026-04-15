import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { API_URL } from '../config';

interface LoginAttemptItem {
  id: string;
  email: string | null;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  failReason: string | null;
  createdAt: string;
}

const FAIL_REASON_LABELS: Record<string, string> = {
  GOOGLE_AUTH_FAILED: 'Falha no Google',
  DOMAIN_DENIED: 'Domínio negado',
  USER_NOT_FOUND: 'Usuário não encontrado',
  MFA_SEND_FAILED: 'Falha ao enviar MFA',
  MFA_INVALID: 'Código MFA inválido',
  MFA_EXPIRED: 'Código MFA expirado',
  RATE_LIMITED: 'Rate limit',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export const LoginAttempts: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
  const [items, setItems] = useState<LoginAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [filterEmail, setFilterEmail] = useState('');
  const [filterIp, setFilterIp] = useState('');
  const [filterSince, setFilterSince] = useState('');

  const fetchAttempts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '100');
    params.set('page', '1');
    if (onlyFailed) params.set('onlyFailed', 'true');
    if (filterEmail.trim()) params.set('email', filterEmail.trim());
    if (filterIp.trim()) params.set('ip', filterIp.trim());
    if (filterSince.trim()) params.set('since', filterSince.trim());
    fetch(`${API_URL}/api/admin/login-attempts?${params}`, {
      credentials: 'include',
      headers: { 'x-user-id': currentUserId }
    })
      .then((r) => {
        if (r.status === 403) throw new Error('Acesso negado');
        return r.json();
      })
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttempts();
  }, [onlyFailed, currentUserId]);

  const failedByIpLast24h = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const count: Record<string, number> = {};
    items.forEach((i) => {
      if (!i.success && new Date(i.createdAt).getTime() >= since) {
        count[i.ipAddress] = (count[i.ipAddress] || 0) + 1;
      }
    });
    return count;
  }, [items]);

  const suspiciousIps = useMemo(() => {
    const set = new Set<string>();
    Object.entries(failedByIpLast24h).forEach(([ip, n]) => {
      if (n > 5) set.add(ip);
    });
    return set;
  }, [failedByIpLast24h]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (filterEmail.trim()) {
      const q = filterEmail.trim().toLowerCase();
      list = list.filter((i) => (i.email || '').toLowerCase().includes(q));
    }
    if (filterIp.trim()) {
      const q = filterIp.trim();
      list = list.filter((i) => i.ipAddress.includes(q));
    }
    if (filterSince.trim()) {
      const since = new Date(filterSince).getTime();
      list = list.filter((i) => new Date(i.createdAt).getTime() >= since);
    }
    return list;
  }, [items, filterEmail, filterIp, filterSince]);

  return (
    <div className="card-base" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={20} color="#0EA5E9" /> Tentativas de Login
        </h2>
        <button type="button" onClick={fetchAttempts} disabled={loading} className="btn-mini" style={{ background: '#1E293B', border: '1px solid #334155', color: '#e2e8f0' }}>
          <RefreshCw size={14} style={{ marginRight: 6 }} /> Atualizar
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 13 }}>
          <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
          Apenas falhas
        </label>
        <span style={{ color: '#64748b', fontSize: 12 }}>|</span>
        <input
          type="text"
          placeholder="Filtrar e-mail"
          value={filterEmail}
          onChange={(e) => setFilterEmail(e.target.value)}
          className="form-input"
          style={{ width: 180, padding: '8px 12px', fontSize: 12 }}
        />
        <input
          type="text"
          placeholder="Filtrar IP"
          value={filterIp}
          onChange={(e) => setFilterIp(e.target.value)}
          className="form-input"
          style={{ width: 140, padding: '8px 12px', fontSize: 12 }}
        />
        <input
          type="datetime-local"
          placeholder="Desde"
          value={filterSince}
          onChange={(e) => setFilterSince(e.target.value)}
          className="form-input"
          style={{ width: 200, padding: '8px 12px', fontSize: 12 }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Data/Hora</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>E-mail</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>IP</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Resultado</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Motivo</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>User Agent</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{formatDate(row.createdAt)}</td>
                    <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{row.email || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: '#e2e8f0' }}>{row.ipAddress}</span>
                      {suspiciousIps.has(row.ipAddress) && (
                        <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 600 }}>
                          IP suspeito
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          background: row.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: row.success ? '#22c55e' : '#ef4444'
                        }}
                      >
                        {row.success ? 'Sucesso' : 'Falha'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                      {row.failReason ? FAIL_REASON_LABELS[row.failReason] || row.failReason : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.userAgent || ''}>
                      {row.userAgent || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
