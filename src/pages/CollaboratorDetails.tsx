import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Mail, Briefcase, Building2, Hash, Clock, Pencil, Shield } from 'lucide-react';
import { API_URL } from '../config';
import { EntityAuditHistory } from '../components/EntityAuditHistory';
import { EditUserModal } from '../components/EditUserModal';

interface CollaboratorDetailsData {
  user: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string | null;
    isActive: boolean;
    systemProfile?: string;
    departmentRef?: { id: string; name: string } | null;
    unitRef?: { id: string; name: string } | null;
    role?: { id: string; name: string; code: string | null; leaderId?: string | null } | null;
    manager?: { id: string; name: string } | null;
  };
  kbsFerramentas: { ferramenta: string; sigla: string; nivel: string; critico: boolean; criticidade?: string }[];
  acessosExtraordinarios?: { ferramenta: string; sigla: string; nivel: string; critico: boolean; criticidade?: string }[];
  historicoCargos: {
    id: string;
    tipo: string;
    descricao: string;
    dadosAntes?: Record<string, unknown> | null;
    dadosDepois?: Record<string, unknown> | null;
    createdAt: string;
    autor?: { name: string } | null;
  }[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SYSTEM_PROFILE_LABELS: Record<string, string> = {
  VIEWER: 'Visualizador',
  APPROVER: 'Aprovador',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Administrador',
  GESTOR: 'Gestor',
};
function getSystemProfileLabel(profile?: string | null): string {
  if (!profile) return '—';
  return SYSTEM_PROFILE_LABELS[profile] ?? profile;
}

interface Props {
  id: string;
  onBack: () => void;
  onOpenAuditHistory?: (entidadeId: string, entidadeTipo: string) => void;
  onUpdate?: () => void;
  currentUser?: { id: string; systemProfile: string };
  allUsers?: { id: string; name: string; jobTitle?: string }[];
  showToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CollaboratorDetails: React.FC<Props> = ({ id, onBack, onOpenAuditHistory, onUpdate, currentUser, allUsers = [], showToast }) => {
  const navigate = useNavigate();
  const handleBack = () => navigate('/people');
  const [data, setData] = useState<CollaboratorDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'acessos' | 'historico' | 'timeline'>('acessos');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [historicoRefreshKey, setHistoricoRefreshKey] = useState(0);

  const fetchDetails = () =>
    fetch(`${API_URL}/api/users/${id}/details`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) {
          if (r.status === 404) throw new Error('Colaborador não encontrado');
          throw new Error('Erro ao carregar dados');
        }
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Erro ao carregar colaborador'));

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchDetails().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !data) return;
    if (activeTab === 'historico' || activeTab === 'timeline') {
      fetchDetails();
    }
  }, [activeTab, id]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14 }}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          <div style={{ background: '#18181b', borderRadius: 12, padding: 24, border: '1px solid #27272a', minHeight: 280 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#27272a', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 20, background: '#27272a', borderRadius: 4, marginTop: 16, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 14, background: '#27272a', borderRadius: 4, marginTop: 12, width: '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
          <div style={{ background: '#18181b', borderRadius: 12, padding: 24, border: '1px solid #27272a' }}>
            <div style={{ height: 24, background: '#27272a', borderRadius: 4, width: '30%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 36, background: '#27272a', borderRadius: 8, flex: 1, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
            <div style={{ height: 200, background: '#27272a', borderRadius: 8, marginTop: 24, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14 }}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <div style={{ color: '#ef4444', fontSize: 16 }}>{error || 'Colaborador não encontrado'}</div>
      </div>
    );
  }

  const { user, kbsFerramentas, acessosExtraordinarios = [], historicoCargos } = data;
  const managerViaRole =
    Boolean(user?.manager?.id && user?.role?.leaderId && user.manager.id === user.role.leaderId);
  const canEdit = currentUser && (currentUser.systemProfile === 'SUPER_ADMIN' || currentUser.systemProfile === 'GESTOR' || currentUser.systemProfile === 'ADMIN');

  const editUserPayload = useMemo(
    () => ({
      id: user.id,
      name: user.name,
      email: user.email,
      jobTitle: user.jobTitle ?? undefined,
      departmentId: user.departmentRef?.id ?? null,
      unitId: user.unitRef?.id ?? null,
      departmentRef: user.departmentRef ?? null,
      unitRef: user.unitRef ?? null,
      systemProfile: (user as { systemProfile?: string }).systemProfile || 'VIEWER',
      managerId: user.manager?.id ?? null,
      roleId: user.role?.id ?? null,
      isActive: user.isActive,
    }),
    [
      user.id,
      user.name,
      user.email,
      user.jobTitle,
      user.departmentRef?.id,
      user.departmentRef?.name,
      user.unitRef?.id,
      user.unitRef?.name,
      (user as { systemProfile?: string }).systemProfile,
      user.manager?.id,
      user.role?.id,
      user.isActive,
    ]
  );

  const loadDetails = () => fetchDetails().catch(() => {});

  const handleEditSave = async () => {
    await (onUpdate?.() ?? Promise.resolve());
    await loadDetails();
    setHistoricoRefreshKey(k => k + 1);
  };
  const initial = (user?.name?.charAt(0) || '?').toUpperCase();

  return (
    <div style={{ padding: 24 }} className="fade-in">
      <button
        onClick={handleBack}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#38BDF8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 24,
          fontSize: 14,
        }}
      >
        <ArrowLeft size={18} /> Voltar
      </button>

      <div className="collaborator-details-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 24, alignItems: 'start' }}>
        {/* Coluna esquerda — Card de perfil */}
        <div
          style={{
            background: '#18181b',
            borderRadius: 12,
            padding: 24,
            border: '1px solid #27272a',
            position: 'sticky',
            top: 24,
          }}
        >
          {canEdit && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid #0EA5E9',
                  color: '#38BDF8',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Pencil size={14} /> Editar
              </button>
            </div>
          )}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: 'white',
              marginBottom: 16,
            }}
          >
            {initial}
          </div>
          <h1 style={{ color: 'white', fontSize: 20, margin: 0, marginBottom: 8 }}>{user?.name || '—'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: user?.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: user?.isActive ? '#22c55e' : '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {user?.isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s ease-in-out infinite' }} />}
              {user?.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: '#e4e4e7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Briefcase size={16} color="#71717a" style={{ flexShrink: 0 }} />
              <span>{user?.role?.name || user?.jobTitle || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={16} color="#71717a" style={{ flexShrink: 0 }} />
              <span>Depto: {user?.departmentRef?.name || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={16} color="#71717a" style={{ flexShrink: 0 }} />
              <span>Unidade: {user?.unitRef?.name || '—'}</span>
            </div>
            {user?.role?.code && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Hash size={16} color="#71717a" style={{ flexShrink: 0 }} />
                <span>{(user.role.code || '').split(/\s+e\s+/)[0]?.trim() || user.role.code}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={16} color="#71717a" style={{ flexShrink: 0 }} />
              <span>Perfil de acesso: {getSystemProfileLabel((user as { systemProfile?: string })?.systemProfile)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={16} color="#71717a" style={{ flexShrink: 0 }} />
              <a href={`mailto:${user?.email}`} style={{ color: '#38BDF8', textDecoration: 'none' }}>{user?.email || '—'}</a>
            </div>
            {user?.manager && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <UserIcon size={16} color="#71717a" style={{ flexShrink: 0 }} />
                <span>
                  Gestor: {user.manager?.name}
                  {managerViaRole && (
                    <span style={{ color: '#71717a', fontSize: 12, fontWeight: 500, marginLeft: 6 }}>(via cargo)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {canEdit && isEditModalOpen && currentUser && showToast && (
            <EditUserModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              user={editUserPayload}
              onUpdate={handleEditSave}
              currentUser={currentUser!}
              allUsers={allUsers}
              showToast={showToast}
              onOpenAuditHistory={onOpenAuditHistory}
            />
          )}
        </div>

        {/* Coluna direita — Abas */}
        <div style={{ background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #27272a' }}>
            {(['acessos', 'historico', 'timeline'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '14px 20px',
                  background: activeTab === tab ? '#27272a' : 'transparent',
                  border: 'none',
                  color: activeTab === tab ? '#fff' : '#71717a',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {tab === 'acessos' && 'Acessos'}
                {tab === 'historico' && 'Histórico'}
                {tab === 'timeline' && 'Linha do tempo'}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>
            {activeTab === 'acessos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Kit Básico */}
                <section>
                  <h4 style={{ color: '#e4e4e7', fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Kit Básico</h4>
                  {kbsFerramentas.length === 0 ? (
                    <div style={{ color: '#71717a', fontSize: 14 }}>Nenhum acesso desta categoria.</div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#27272a' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Ferramenta</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>ID</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Nível de Acesso</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Criticidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kbsFerramentas.map((f, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #27272a' }}>
                              <td style={{ padding: '12px 16px', color: '#e4e4e7', fontWeight: 500 }}>{f.ferramenta}</td>
                              <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>{f.sigla}</td>
                              <td style={{ padding: '12px 16px', color: '#38BDF8' }}>{f.nivel}</td>
                              <td style={{ padding: '12px 16px' }}>
                                {f.critico || f.criticidade ? (
                                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                                    {f.criticidade || 'Crítico'}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Acessos Extraordinários */}
                <section>
                  <h4 style={{ color: '#e4e4e7', fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Acessos Extraordinários</h4>
                  {acessosExtraordinarios.length === 0 ? (
                    <div style={{ color: '#71717a', fontSize: 14 }}>Nenhum acesso desta categoria.</div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#27272a' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Ferramenta</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>ID</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Nível de Acesso</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Criticidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {acessosExtraordinarios.map((f, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #27272a' }}>
                              <td style={{ padding: '12px 16px', color: '#e4e4e7', fontWeight: 500 }}>{f.ferramenta}</td>
                              <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>{f.sigla}</td>
                              <td style={{ padding: '12px 16px', color: '#38BDF8' }}>{f.nivel}</td>
                              <td style={{ padding: '12px 16px' }}>
                                {f.critico || f.criticidade ? (
                                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                                    {f.criticidade || 'Crítico'}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'historico' && (
              <EntityAuditHistory
                key={`audit-${user?.id}-${historicoRefreshKey}`}
                entidadeId={user?.id || ''}
                entidadeTipo="User"
                limit={10}
                onOpenFullHistory={onOpenAuditHistory ? (p) => onOpenAuditHistory(p.entidadeId, p.entidadeTipo) : undefined}
              />
            )}

            {activeTab === 'timeline' && (
              <div>
                {historicoCargos.length === 0 ? (
                  <div style={{ color: '#71717a', fontSize: 14 }}>Nenhuma mudança de cargo registrada</div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {historicoCargos.map(h => {
                      const antes = h.dadosAntes as Record<string, string> | undefined;
                      const depois = h.dadosDepois as Record<string, string> | undefined;
                      const cargoAntes = antes?.jobTitle || antes?.departmentName || '—';
                      const cargoDepois = depois?.jobTitle || depois?.departmentName || '—';
                      const dept = depois?.departmentName || antes?.departmentName || '—';
                      return (
                        <li
                          key={h.id}
                          style={{
                            padding: 14,
                            background: '#09090b',
                            borderRadius: 8,
                            border: '1px solid #27272a',
                            fontSize: 13,
                          }}
                        >
                          <div style={{ color: '#71717a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={14} />
                            {formatDate(h.createdAt)}
                          </div>
                          <div style={{ color: '#e4e4e7' }}>
                            {cargoAntes} → {cargoDepois}
                          </div>
                          <div style={{ color: '#a1a1aa', marginTop: 4 }}>Departamento: {dept}</div>
                          {h.autor && <div style={{ color: '#71717a', marginTop: 4, fontSize: 12 }}>Autor: {h.autor.name}</div>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
