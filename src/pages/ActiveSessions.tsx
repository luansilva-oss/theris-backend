import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, LogOut } from 'lucide-react';
import { API_URL } from '../config';
import { CustomConfirmModal } from '../components/CustomConfirmModal';

type ShowToast = (message: string, type?: string) => void;

export interface SessionItem {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userDepartment: string;
  lastActivity: string;
  createdAt: string;
  minutesActive: number;
  minutesSinceActivity: number;
}

const PROFILE_COLORS: Record<string, string> = {
  VIEWER: '#64748b',
  ADMIN: '#0EA5E9',
  SUPER_ADMIN: '#f59e0b',
  APPROVER: '#10b981',
  GESTOR: '#0EA5E9',
};

function formatRelativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) return 'agora';
  if (minutesAgo < 60) return `há ${minutesAgo} min`;
  const h = Math.floor(minutesAgo / 60);
  const m = minutesAgo % 60;
  if (h === 1 && m === 0) return 'há 1h';
  if (m === 0) return `há ${h}h`;
  return `há ${h}h ${m}min`;
}

function formatSessionDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export const ActiveSessions: React.FC<{ currentUserId: string; showToast?: ShowToast }> = ({ currentUserId, showToast }) => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<SessionItem | null>(null);
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchSessions = useCallback(() => {
    fetch(`${API_URL}/api/admin/sessions`, {
      credentials: 'include',
      headers: { 'x-user-id': currentUserId },
    })
      .then((r) => {
        if (r.status === 403) throw new Error('Acesso negado');
        return r.json();
      })
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [currentUserId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const t = setInterval(fetchSessions, 60 * 1000);
    return () => clearInterval(t);
  }, [fetchSessions]);

  const handleRevokeOne = (session: SessionItem) => {
    if (session.userId === currentUserId) return;
    setRevokeTarget(session);
  };

  const confirmRevokeOne = () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    setRevoking(true);
    fetch(`${API_URL}/api/admin/sessions/${target.userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'x-user-id': currentUserId },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao revogar');
        setRemovingId(target.userId);
        setTimeout(() => {
          setSessions((prev) => prev.filter((s) => s.userId !== target.userId));
          setRemovingId(null);
        }, 300);
        showToast?.('Sessão revogada com sucesso.', 'success');
      })
      .catch(() => showToast?.('Erro ao revogar sessão.', 'error'))
      .finally(() => {
        setRevoking(false);
        setRevokeTarget(null);
      });
  };

  const confirmRevokeAll = () => {
    setRevoking(true);
    fetch(`${API_URL}/api/admin/sessions`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'x-user-id': currentUserId },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao revogar');
        return r.json();
      })
      .then((data) => {
        const count = (data as { count?: number }).count ?? 0;
        setSessions((prev) => prev.filter((s) => s.userId === currentUserId));
        showToast?.(`${count} sessão(ões) revogada(s).`, 'success');
      })
      .catch(() => showToast?.('Erro ao revogar sessões.', 'error'))
      .finally(() => {
        setRevoking(false);
        setRevokeAllConfirm(false);
      });
  };

  return (
    <div className="card-base" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Monitor size={20} color="#0EA5E9" /> Sessões Ativas
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              background: 'rgba(14, 165, 233, 0.2)',
              color: '#38BDF8',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {sessions.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setRevokeAllConfirm(true)}
          disabled={sessions.length <= 1}
          style={{
            background: 'transparent',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: sessions.length <= 1 ? 'not-allowed' : 'pointer',
            opacity: sessions.length <= 1 ? 0.6 : 1,
          }}
        >
          <LogOut size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Revogar Todas
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando...</div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Monitor size={40} style={{ opacity: 0.5 }} />
          <span>Nenhuma sessão ativa no momento.</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Usuário</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Perfil</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Departamento</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Último acesso</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Tempo de sessão</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((row) => {
                const isSelf = row.userId === currentUserId;
                const isRemoving = removingId === row.userId;
                const profileColor = PROFILE_COLORS[row.userRole] ?? '#64748b';
                return (
                  <tr
                    key={row.sessionId}
                    style={{
                      borderBottom: '1px solid #334155',
                      opacity: isRemoving ? 0,
                      transform: isRemoving ? 'translateY(-4px)' : undefined,
                      transition: 'opacity 0.3s ease, transform 0.3s ease',
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
                            color: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {(row.userName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{row.userName}</div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>{row.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          background: `${profileColor}22`,
                          color: profileColor,
                        }}
                      >
                        {row.userRole}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{row.userDepartment || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#e2e8f0' }} title={formatFullDate(row.lastActivity)}>
                      {formatRelativeTime(row.minutesSinceActivity)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{formatSessionDuration(row.minutesActive)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {isSelf ? (
                        <span
                          title="Não é possível revogar sua própria sessão"
                          style={{ color: '#64748b', fontSize: 12, cursor: 'not-allowed' }}
                        >
                          —
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevokeOne(row)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Revogar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CustomConfirmModal
        isOpen={!!revokeTarget}
        title="Revogar sessão"
        message={
          revokeTarget
            ? `Tem certeza que deseja encerrar a sessão de ${revokeTarget.userName}? Ele será desconectado na próxima ação realizada.`
            : ''
        }
        confirmLabel="Sim, revogar"
        cancelLabel="Cancelar"
        onConfirm={confirmRevokeOne}
        onClose={() => setRevokeTarget(null)}
        isDestructive
      />

      <CustomConfirmModal
        isOpen={revokeAllConfirm}
        title="Revogar todas as sessões"
        message="Tem certeza que deseja encerrar todas as outras sessões ativas? Todos os usuários (exceto você) serão desconectados na próxima ação."
        confirmLabel="Sim, revogar todas"
        cancelLabel="Cancelar"
        onConfirm={confirmRevokeAll}
        onClose={() => setRevokeAllConfirm(false)}
        isDestructive
      />
    </div>
  );
};
