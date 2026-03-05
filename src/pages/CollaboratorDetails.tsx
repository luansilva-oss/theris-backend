import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Mail, Briefcase, Building2, Hash, Clock } from 'lucide-react';
import { API_URL } from '../config';
import { EntityAuditHistory } from '../components/EntityAuditHistory';

interface CollaboratorDetailsData {
  user: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string | null;
    isActive: boolean;
    departmentRef?: { id: string; name: string } | null;
    unitRef?: { id: string; name: string } | null;
    role?: { id: string; name: string; code: string | null } | null;
    manager?: { id: string; name: string } | null;
  };
  kbsFerramentas: { ferramenta: string; sigla: string; nivel: string; critico: boolean }[];
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

interface Props {
  id: string;
  onBack: () => void;
  onOpenAuditHistory?: (entidadeId: string, entidadeTipo: string) => void;
}

export const CollaboratorDetails: React.FC<Props> = ({ id, onBack, onOpenAuditHistory }) => {
  const navigate = useNavigate();
  const handleBack = () => navigate('/people');
  const [data, setData] = useState<CollaboratorDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'acessos' | 'historico' | 'timeline'>('acessos');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/users/${id}/details`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) {
          if (r.status === 404) throw new Error('Colaborador não encontrado');
          throw new Error('Erro ao carregar dados');
        }
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14 }}>
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
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14 }}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <div style={{ color: '#ef4444', fontSize: 16 }}>{error || 'Colaborador não encontrado'}</div>
      </div>
    );
  }

  const { user, kbsFerramentas, historicoCargos } = data;
  const initial = (user?.name?.charAt(0) || '?').toUpperCase();

  return (
    <div style={{ padding: 24 }} className="fade-in">
      <button
        onClick={handleBack}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#a78bfa',
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
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
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
                <span>{user.role.code}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={16} color="#71717a" style={{ flexShrink: 0 }} />
              <a href={`mailto:${user?.email}`} style={{ color: '#a78bfa', textDecoration: 'none' }}>{user?.email || '—'}</a>
            </div>
            {user?.manager && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserIcon size={16} color="#71717a" style={{ flexShrink: 0 }} />
                <span>Gestor: {user.manager?.name}</span>
              </div>
            )}
          </div>
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
              <div>
                {kbsFerramentas.length === 0 ? (
                  <div style={{ color: '#71717a', fontSize: 14 }}>Nenhum acesso cadastrado</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {kbsFerramentas.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          padding: 12,
                          background: '#09090b',
                          borderRadius: 8,
                          border: '1px solid #27272a',
                        }}
                      >
                        <span style={{ flex: 1, color: '#e4e4e7', fontWeight: 500 }}>{f.ferramenta}</span>
                        <span style={{ color: '#a1a1aa', fontSize: 13 }}>{f.sigla}</span>
                        <span style={{ color: '#a78bfa', fontSize: 13 }}>{f.nivel}</span>
                        {f.critico && (
                          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>Crítico</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'historico' && (
              <EntityAuditHistory
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
