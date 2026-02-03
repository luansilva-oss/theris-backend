import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Server, LogOut, Bird,
  Activity, ArrowLeft, Shield, Mail, ChevronDown, ChevronRight,
  CheckCircle, XCircle, Clock, Crown, User as UserIcon, Zap,
  TrendingUp, AlertCircle, Calendar
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- INTERFACES ---
interface User { id: string; name: string; email: string; department?: { name: string }; }
interface Tool { id: string; name: string; owner?: { name: string; email: string }; subOwner?: { name: string; email: string }; accesses?: { user: User; status: string }[]; }
interface Request { id: string; details: string; status: string; createdAt: string; requester: User; type: string; }
type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('theris_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [systemProfile, setSystemProfile] = useState<SystemProfile>(() => (localStorage.getItem('theris_profile') as SystemProfile) || 'VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('theris_user'));
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('theris_activeTab') || 'DASHBOARD');

  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // Stats para o Dashboard
  const stats = {
    pending: requests.filter(r => r.status.includes('PENDENTE')).length,
    approved: requests.filter(r => r.status === 'APROVADO').length,
    total: requests.length,
    myRequests: requests.filter(r => r.requester.id === currentUser?.id).length
  };

  useEffect(() => { localStorage.setItem('theris_activeTab', activeTab); }, [activeTab]);
  useEffect(() => {
    if (selectedTool) localStorage.setItem('theris_selectedToolId', selectedTool.id);
    else if (activeTab === 'TOOLS' && !selectedTool) localStorage.removeItem('theris_selectedToolId');
  }, [selectedTool, activeTab]);

  const loadData = async () => {
    try {
      const [resTools, resReqs] = await Promise.all([fetch(`${API_URL}/api/tools`), fetch(`${API_URL}/api/solicitacoes`)]);
      if (resTools.ok) {
        const toolsData = await resTools.json();
        setTools(toolsData);
        const savedToolId = localStorage.getItem('theris_selectedToolId');
        if (savedToolId && !selectedTool && activeTab === 'TOOLS') {
          const found = toolsData.find((t: Tool) => t.id === savedToolId);
          if (found) setSelectedTool(found);
        }
      }
      if (resReqs.ok) setRequests(await resReqs.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(loadData, 15000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`${API_URL}/api/login/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: tokenResponse.access_token }) });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('theris_user', JSON.stringify(data.user)); localStorage.setItem('theris_profile', data.profile);
          setCurrentUser(data.user); setSystemProfile(data.profile); setIsLoggedIn(true);
        } else alert(data.error);
      } catch (e) { alert("Erro de conexão."); }
    }
  });

  const handleLogout = () => {
    localStorage.clear(); setIsLoggedIn(false); setCurrentUser(null); setActiveTab('DASHBOARD'); setSelectedTool(null);
  };

  const handleApprove = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    const note = window.prompt(action === 'APROVAR' ? "Observação (Opcional):" : "⚠️ Motivo da Reprovação (Obrigatório):");
    if (action === 'REPROVAR' && !note) return alert("Motivo obrigatório.");
    if (note === null) return;
    try {
      const res = await fetch(`${API_URL}/api/solicitacoes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action, approverId: currentUser?.id, adminNote: note }) });
      if (res.ok) { alert("Processado com sucesso!"); loadData(); }
    } catch (e) { alert("Erro de conexão."); }
  };

  const getGroupedAccesses = (tool: Tool) => {
    if (!tool.accesses) return {};
    return tool.accesses.reduce((acc, curr) => {
      const level = curr.status; if (!acc[level]) acc[level] = []; acc[level].push(curr.user); return acc;
    }, {} as Record<string, User[]>);
  };

  const getLevelIcon = (levelName: string) => {
    const lower = levelName.toLowerCase();
    if (lower.includes('admin') || lower.includes('owner')) return <Crown size={20} />;
    if (lower.includes('gestor')) return <Shield size={20} />;
    if (lower.includes('extra')) return <Zap size={20} />;
    return <UserIcon size={20} />;
  };

  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Bird size={50} color="#7C3AED" /></div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', marginBottom: 10 }}>Theris OS</h1>
        <p style={{ color: '#94a3b8', marginBottom: 40 }}>Governança de Identidade e Acessos</p>
        <button onClick={() => handleLogin()} className="google-btn-custom"><img src="https://www.svgrepo.com/show/475656/google-color.svg" width="22" /> Entrar com Google</button>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-box"><Bird size={28} style={{ marginRight: 12, color: '#7C3AED' }} /> THERIS</div>
        <div className="user-mini-profile">
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #7C3AED, #4c1d95)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{currentUser?.name.charAt(0)}</div>
          <div><div style={{ fontSize: '0.95rem', color: 'white', fontWeight: 600 }}>{currentUser?.name.split(' ')[0]}</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{systemProfile}</div></div>
        </div>
        <nav style={{ flex: 1 }}>
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null); }}><LayoutDashboard size={20} /> Visão Geral</div>
          <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { setActiveTab('TOOLS'); setSelectedTool(null); }}><Server size={20} /> Ferramentas</div>
          {['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(systemProfile) && <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={20} /> Auditoria</div>}
        </nav>
        <button onClick={handleLogout} className="logout-btn"><LogOut size={20} /> Encerrar Sessão</button>
      </aside>

      <main className="main-area">
        <header className="header-bar">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Painel <span style={{ color: '#64748b', margin: '0 10px' }}>/</span> <span style={{ color: '#c4b5fd' }}>{activeTab === 'TOOLS' && selectedTool ? selectedTool.name : activeTab}</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '20px' }}>
            <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}></div> Online
          </div>
        </header>

        <div className="content-scroll">

          {/* --- DASHBOARD REMODELADO --- */}
          {activeTab === 'DASHBOARD' && (
            <div style={{ maxWidth: 1100 }}>

              {/* 1. HERO SECTION */}
              <div className="hero-section">
                <div>
                  <h1 style={{ fontSize: '2.5rem', margin: 0, color: 'white', fontWeight: 800 }}>Olá, {currentUser?.name.split(' ')[0]}</h1>
                  <p style={{ color: '#94a3b8', margin: '10px 0 0 0', fontSize: '1.1rem' }}>Aqui está o resumo da governança hoje.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, color: '#cbd5e1', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 15px', borderRadius: '12px' }}>
                  <Calendar size={18} />
                  <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
              </div>

              {/* 2. STATS GRID (KPIs) */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#fbbf24' }}>{stats.pending}</div>
                  <div className="stat-label">Pendentes</div>
                  <Clock className="stat-icon-bg" size={60} color="#fbbf24" />
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#34d399' }}>{stats.approved}</div>
                  <div className="stat-label">Aprovados</div>
                  <CheckCircle className="stat-icon-bg" size={60} color="#34d399" />
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#c4b5fd' }}>{tools.length}</div>
                  <div className="stat-label">Ferramentas</div>
                  <Server className="stat-icon-bg" size={60} color="#c4b5fd" />
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.myRequests}</div>
                  <div className="stat-label">Meus Pedidos</div>
                  <UserIcon className="stat-icon-bg" size={60} color="white" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>

                  {/* 3. LISTA DE TAREFAS (PENDÊNCIAS) */}
                  {['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(systemProfile) && (
                    <div className="glass-card">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 20px 0' }}>
                        <AlertCircle size={22} color="#fbbf24" /> Precisa da sua atenção
                      </h3>

                      {requests.filter(r => r.status.includes('PENDENTE')).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                          <CheckCircle size={40} style={{ marginBottom: 15, opacity: 0.3 }} />
                          <p>Parabéns! Nenhuma pendência na fila.</p>
                        </div>
                      ) : (
                        <div className="request-list">
                          {requests.filter(r => r.status.includes('PENDENTE')).map(r => {
                            const detail = JSON.parse(r.details);
                            return (
                              <div key={r.id} className="request-card">
                                <div className="req-info">
                                  <div className="req-avatar">{r.requester?.name.charAt(0)}</div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: 'white' }}>{detail.info || detail.tool || 'Solicitação'}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                      Solicitado por <span style={{ color: '#cbd5e1' }}>{r.requester?.name}</span>
                                      {detail.target && <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>Nível: {detail.target}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="req-actions">
                                  <button onClick={() => handleApprove(r.id, 'APROVAR')} className="btn-accept"><CheckCircle size={16} /> Aprovar</button>
                                  <button onClick={() => handleApprove(r.id, 'REPROVAR')} className="btn-deny"><XCircle size={16} /> Recusar</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MEUS PEDIDOS (CARD VISUAL) */}
                  <div className="glass-card">
                    <h3 style={{ margin: '0 0 20px 0' }}>Meus Pedidos Recentes</h3>
                    {requests.filter(r => r.requester.id === currentUser?.id).length === 0 ? (
                      <p style={{ color: '#64748b' }}>Nenhum histórico.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {requests.filter(r => r.requester.id === currentUser?.id).slice(0, 5).map(r => (
                          <div key={r.id} style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.status === 'APROVADO' ? '#10b981' : r.status.includes('PENDENTE') ? '#fbbf24' : '#ef4444' }}></div>
                              <span>{JSON.parse(r.details).info || r.type}</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. TIMELINE FEED */}
                <div className="glass-card">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25 }}><Activity size={22} color="#7C3AED" /> Feed Global</h3>
                  <div className="timeline-container">
                    {requests.slice(0, 6).map(r => (
                      <div key={r.id} className="timeline-item">
                        <div className="timeline-dot" style={{ borderColor: r.status === 'APROVADO' ? '#10b981' : r.status === 'REPROVADO' ? '#ef4444' : '#fbbf24' }}></div>
                        <div className="timeline-content">
                          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{JSON.parse(r.details).info || JSON.parse(r.details).tool}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                            {r.status === 'APROVADO' ? 'Aprovado para' : r.status === 'REPROVADO' ? 'Recusado para' : 'Solicitado por'}
                            <strong style={{ color: '#cbd5e1', marginLeft: 4 }}>{r.requester?.name.split(' ')[0]}</strong>
                          </div>
                          <span className="timeline-time">{new Date(r.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TOOLS' && !selectedTool && (
            <div className="fade-in">
              <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.5rem' }}>Catálogo de Ferramentas</h3>
                <span style={{ background: '#334155', padding: '6px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600 }}>{tools.length} Sistemas</span>
              </div>
              <div className="tools-grid">
                {tools.map(tool => (
                  <div key={tool.id} className="tool-card" onClick={() => setSelectedTool(tool)}>
                    <div className="tool-icon-placeholder"><Server size={28} /></div>
                    <h4 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', color: 'white', fontWeight: 700 }}>{tool.name}</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>Owner: <span style={{ color: '#cbd5e1' }}>{tool.owner?.name.split(' ')[0] || 'N/A'}</span></p>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#c4b5fd' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={14} /> {tool.accesses?.length || 0} Usuários</span>
                      <span style={{ fontWeight: 600 }}>Acessar →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'TOOLS' && selectedTool && (
            <div className="fade-in">
              <button onClick={() => { setSelectedTool(null); setExpandedLevel(null); localStorage.removeItem('theris_selectedToolId'); }} className="btn-back"><ArrowLeft size={18} /> Voltar para lista</button>

              <div className="glass-card" style={{ marginBottom: 30, background: 'linear-gradient(120deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 25, marginBottom: 25 }}>
                  <div className="tool-icon-placeholder" style={{ width: 64, height: 64, marginBottom: 0, background: 'rgba(124, 58, 237, 0.2)' }}><Server size={32} color="#a78bfa" /></div>
                  <div><h1 style={{ margin: 0, fontSize: '1.8rem' }}>{selectedTool.name}</h1><p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Painel de Governança e Matriz de Acessos</p></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Owner Responsável</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {selectedTool.owner ? (
                        <>
                          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{selectedTool.owner.name.charAt(0)}</div>
                          <div><div style={{ fontWeight: 600, color: 'white' }}>{selectedTool.owner.name}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedTool.owner.email}</div></div>
                        </>
                      ) : <span style={{ color: '#ef4444' }}>Não definido</span>}
                    </div>
                  </div>
                  {selectedTool.subOwner && (
                    <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Sub-Owner (Backup)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{selectedTool.subOwner.name.charAt(0)}</div>
                        <div><div style={{ fontWeight: 600, color: 'white' }}>{selectedTool.subOwner.name}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedTool.subOwner.email}</div></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <h3 style={{ marginBottom: 25, fontSize: '1.3rem' }}>Níveis de Acesso</h3>
              <div className="level-container">
                {Object.entries(getGroupedAccesses(selectedTool)).sort((a, b) => a[0].localeCompare(b[0])).map(([levelName, users]) => (
                  <div key={levelName} className={`level-card ${expandedLevel === levelName ? 'expanded' : ''}`}>
                    <div className="level-header" onClick={() => setExpandedLevel(expandedLevel === levelName ? null : levelName)}>
                      <div className="level-info">
                        <div className="level-icon">{getLevelIcon(levelName)}</div>
                        <h4 className="level-title">{levelName}</h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <span className="level-count">{users.length} usuários</span>
                        {expandedLevel === levelName ? <ChevronDown size={20} color="#7C3AED" /> : <ChevronRight size={20} color="#64748b" />}
                      </div>
                    </div>
                    <div className={`user-grid-wrapper ${expandedLevel === levelName ? 'open' : ''}`}>
                      <div className="user-grid">
                        {users.map(u => (
                          <div key={u.id} className="user-card">
                            <div className="user-avatar">{u.name.charAt(0)}</div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={12} /> {u.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {Object.keys(getGroupedAccesses(selectedTool)).length === 0 && <p style={{ color: '#64748b', textAlign: 'center' }}>Nenhum nível de acesso configurado.</p>}
              </div>
            </div>
          )}

          {activeTab === 'HISTORY' && <div className="glass-card"><h3>Auditoria</h3><p style={{ color: '#94a3b8' }}>Em desenvolvimento.</p></div>}
        </div>
      </main>
    </div>
  );
}