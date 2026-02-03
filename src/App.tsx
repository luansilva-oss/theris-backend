import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Server, LogOut, Bird,
  Activity, ArrowLeft, Shield, Mail, ChevronDown, ChevronRight,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- INTERFACES ---
interface User {
  id: string;
  name: string;
  email: string;
  department?: { name: string };
}

interface Tool {
  id: string;
  name: string;
  owner?: { name: string; email: string };
  subOwner?: { name: string; email: string };
  accesses?: { user: User; status: string }[];
}

interface Request {
  id: string;
  details: string;
  status: string;
  createdAt: string;
  requester: User;
  type: string;
}

type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

export default function App() {
  // --- ESTADOS ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>('VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // Controle de UI
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // --- CARREGAMENTO DE DADOS ---
  const loadData = async () => {
    try {
      const [resTools, resReqs] = await Promise.all([
        fetch(`${API_URL}/api/tools`),
        fetch(`${API_URL}/api/solicitacoes`)
      ]);
      if (resTools.ok) setTools(await resTools.json());
      if (resReqs.ok) setRequests(await resReqs.json());
    } catch (e) { console.error("Erro loadData", e); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(loadData, 15000); // Refresh a cada 15s
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // --- AÇÕES ---

  // 1. Login Google
  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`${API_URL}/api/login/google`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: tokenResponse.access_token })
        });
        const data = await res.json();
        if (res.ok) { setCurrentUser(data.user); setSystemProfile(data.profile); setIsLoggedIn(true); }
        else alert(data.error);
      } catch (e) { alert("Erro de conexão."); }
    }
  });

  // 2. Aprovar / Reprovar (Com Justificativa)
  const handleApprove = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    // Prompt nativo para pegar a justificativa
    const note = window.prompt(
      action === 'APROVAR'
        ? "Digite uma observação (Opcional):"
        : "⚠️ Digite o motivo da REPROVAÇÃO (Obrigatório):"
    );

    // Validação: Reprovação exige texto
    if (action === 'REPROVAR' && !note) {
      alert("Para reprovar, é necessário informar o motivo.");
      return;
    }
    if (note === null) return; // Cancelou

    try {
      const res = await fetch(`${API_URL}/api/solicitacoes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          approverId: currentUser?.id,
          adminNote: note // Envia a nota para o backend notificar no Slack
        })
      });

      if (res.ok) {
        alert(`Solicitação processada! O usuário será notificado no Slack.`);
        loadData();
      } else {
        alert("Erro ao processar.");
      }
    } catch (e) { alert("Erro de conexão."); }
  };

  // --- UTILITÁRIOS UI ---

  // Agrupa usuários por nível
  const getGroupedAccesses = (tool: Tool) => {
    if (!tool.accesses) return {};
    return tool.accesses.reduce((acc, curr) => {
      const level = curr.status;
      if (!acc[level]) acc[level] = [];
      acc[level].push(curr.user);
      return acc;
    }, {} as Record<string, User[]>);
  };

  const toggleLevel = (levelName: string) => {
    setExpandedLevel(expandedLevel === levelName ? null : levelName);
  };

  const resetSelection = () => {
    setSelectedTool(null);
    setExpandedLevel(null);
  };

  // --- RENDERIZAÇÃO ---

  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Bird size={48} color="#7C3AED" /></div>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: 10 }}>Theris OS</h1>
        <p style={{ color: '#94a3b8', marginBottom: 30 }}>Governança de Acessos e Identidade</p>
        <button onClick={() => handleLogin()} className="google-btn-custom">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" alt="G" /> Entrar com Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-box"><Bird size={24} style={{ marginRight: 12, color: '#7C3AED' }} /> THERIS</div>
        <div className="user-mini-profile">
          <div style={{ width: 35, height: 35, background: '#7C3AED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{currentUser?.name.charAt(0)}</div>
          <div><div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{currentUser?.name.split(' ')[0]}</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{systemProfile}</div></div>
        </div>
        <nav style={{ flex: 1 }}>
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); resetSelection(); }}><LayoutDashboard size={18} /> Visão Geral</div>
          <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { setActiveTab('TOOLS'); resetSelection(); }}><Server size={18} /> Ferramentas</div>
          {['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(systemProfile) && <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Auditoria</div>}
        </nav>
        <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="logout-btn"><LogOut size={18} /> Sair</button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="main-area">
        <header className="header-bar">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>Painel / <span style={{ color: '#7C3AED' }}>{activeTab === 'TOOLS' && selectedTool ? selectedTool.name : activeTab}</span></h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#10b981' }}>
            <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></div> Sistema Online
          </div>
        </header>

        <div className="content-scroll">

          {/* --- DASHBOARD --- */}
          {activeTab === 'DASHBOARD' && (
            <div style={{ maxWidth: 1000 }}>
              <h1 style={{ fontSize: '2rem', marginBottom: 20 }}>Olá, <span style={{ color: '#7C3AED' }}>{currentUser?.name.split(' ')[0]}</span></h1>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                {/* COLUNA ESQUERDA: PENDÊNCIAS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(systemProfile) && (
                    <div className="glass-card">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Clock size={20} /> Solicitações Pendentes</h3>
                      {requests.filter(r => r.status.includes('PENDENTE')).length === 0 ? (
                        <p style={{ color: '#64748b', padding: '20px 0' }}>Nenhuma pendência para análise.</p>
                      ) : (
                        <table className="modern-table">
                          <thead><tr><th>Solicitante</th><th>Detalhe</th><th>Status</th><th>Ação</th></tr></thead>
                          <tbody>
                            {requests.filter(r => r.status.includes('PENDENTE')).map(r => (
                              <tr key={r.id}>
                                <td>{r.requester?.name.split(' ')[0]}</td>
                                <td>{JSON.parse(r.details).info || JSON.parse(r.details).tool || r.type}</td>
                                <td><span className="badge PENDENTE">{r.status.replace('PENDENTE_', '')}</span></td>
                                <td style={{ display: 'flex', gap: 10 }}>
                                  <button onClick={() => handleApprove(r.id, 'APROVAR')} className="btn-icon btn-approve" title="Aprovar"><CheckCircle size={20} /></button>
                                  <button onClick={() => handleApprove(r.id, 'REPROVAR')} className="btn-icon btn-reject" title="Reprovar"><XCircle size={20} /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* MEUS PEDIDOS */}
                  <div className="glass-card">
                    <h3>Meus Pedidos Recentes</h3>
                    {requests.filter(r => r.requester.id === currentUser?.id).length === 0 ? (
                      <p style={{ color: '#64748b' }}>Você não fez solicitações recentes.</p>
                    ) : (
                      <table className="modern-table">
                        <thead><tr><th>Tipo</th><th>Status</th><th>Data</th></tr></thead>
                        <tbody>
                          {requests.filter(r => r.requester.id === currentUser?.id).slice(0, 5).map(r => (
                            <tr key={r.id}>
                              <td>{JSON.parse(r.details).info || r.type}</td>
                              <td>
                                <span style={{
                                  fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, color: 'white',
                                  background: r.status === 'APROVADO' ? '#059669' : r.status.includes('PENDENTE') ? '#d97706' : '#ef4444'
                                }}>
                                  {r.status.replace('PENDENTE_', 'AGUARD. ')}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA: FEED */}
                <div className="glass-card">
                  <h3><Activity size={20} color="#7C3AED" /> Feed Global</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 }}>
                    {requests.slice(0, 8).map(r => (
                      <div key={r.id} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: `3px solid ${r.status === 'APROVADO' ? '#10b981' : '#cbd5e1'}` }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{JSON.parse(r.details).info || 'Solicitação'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span>{r.requester?.name.split(' ')[0]}</span>
                          <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- FERRAMENTAS --- */}
          {activeTab === 'TOOLS' && !selectedTool && (
            <div className="fade-in">
              <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Catálogo de Ferramentas</h3>
                <span style={{ background: '#334155', padding: '5px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{tools.length} Apps</span>
              </div>
              <div className="tools-grid">
                {tools.map(tool => (
                  <div key={tool.id} className="tool-card" onClick={() => setSelectedTool(tool)}>
                    <div className="tool-icon-placeholder"><Server size={24} /></div>
                    <h4 style={{ fontSize: '1.1rem', margin: '0 0 5px 0', color: 'white' }}>{tool.name}</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 15 }}>Owner: {tool.owner?.name.split(' ')[0] || 'N/A'}</p>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7C3AED' }}>
                      <span>{tool.accesses?.length || 0} Usuários</span>
                      <span>Ver Matriz →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETALHES DA FERRAMENTA */}
          {activeTab === 'TOOLS' && selectedTool && (
            <div className="fade-in">
              <button onClick={() => resetSelection()} className="btn-back"><ArrowLeft size={18} /> Voltar</button>

              {/* CABEÇALHO */}
              <div className="glass-card" style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                  <div className="tool-icon-placeholder" style={{ width: 60, height: 60, marginBottom: 0 }}><Server size={30} /></div>
                  <div><h1 style={{ margin: 0 }}>{selectedTool.name}</h1><p style={{ color: '#94a3b8', margin: 0 }}>Governança e Matriz de Acessos</p></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                  <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Owner (Responsável)</div>
                    <div style={{ fontWeight: 600, color: 'white', marginTop: 5 }}>{selectedTool.owner?.name || '--'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedTool.owner?.email}</div>
                  </div>
                  {selectedTool.subOwner && (
                    <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Sub-Owner (Backup)</div>
                      <div style={{ fontWeight: 600, color: 'white', marginTop: 5 }}>{selectedTool.subOwner?.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedTool.subOwner?.email}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* LISTA DE NÍVEIS (ACORDEÃO) */}
              <h3 style={{ marginBottom: 20 }}>Níveis de Acesso</h3>

              {Object.keys(getGroupedAccesses(selectedTool)).length === 0 ? (
                <p style={{ color: '#64748b' }}>Nenhum usuário cadastrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {Object.entries(getGroupedAccesses(selectedTool))
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([levelName, users]) => (
                      <div key={levelName} className="fade-in">

                        {/* BARRA DO NÍVEL (CLICÁVEL) */}
                        <div
                          onClick={() => toggleLevel(levelName)}
                          style={{
                            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '15px 20px', borderRadius: '12px', marginBottom: 5,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.borderColor = '#7C3AED'}
                          onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ background: 'rgba(124, 58, 237, 0.2)', padding: 8, borderRadius: 8 }}>
                              <Shield size={20} color="#7C3AED" />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{levelName}</h4>
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{users.length} usuários vinculados</span>
                            </div>
                          </div>
                          {expandedLevel === levelName ? <ChevronDown color="#7C3AED" /> : <ChevronRight color="#64748b" />}
                        </div>

                        {/* LISTA DE USUÁRIOS (EXPANDIDA) */}
                        {expandedLevel === levelName && (
                          <div className="fade-in" style={{
                            padding: '20px',
                            background: 'rgba(0,0,0,0.2)',
                            borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                            marginTop: -5, marginBottom: 15,
                            border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none'
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15 }}>
                              {users.map(u => (
                                <div key={u.id} className="user-block" style={{ background: '#1e293b' }}>
                                  <div style={{ width: 35, height: 35, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                    {u.name.charAt(0)}
                                  </div>
                                  <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 500, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <Mail size={12} /> {u.email}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'HISTORY' && <div className="glass-card"><h3>Auditoria de Logs</h3><p style={{ color: '#94a3b8' }}>Em desenvolvimento.</p></div>}
        </div>
      </main>
    </div>
  );
}