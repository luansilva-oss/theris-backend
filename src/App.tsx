import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Server, FileText, LogOut, Bird, Activity,
  ArrowLeft, Shield, Mail, ChevronDown, ChevronRight, CheckCircle,
  XCircle, Clock, Crown, Zap, User as UserIcon, Bell, Search
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- TYPES ---
interface User { id: string; name: string; email: string; }
interface Tool { id: string; name: string; owner?: User; subOwner?: User; accesses?: { user: User; status: string }[]; }
interface Request { id: string; details: string; status: string; createdAt: string; requester: User; type: string; }
type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const s = localStorage.getItem('theris_user'); return s ? JSON.parse(s) : null;
  });
  const [systemProfile, setSystemProfile] = useState<SystemProfile>(() => (localStorage.getItem('theris_profile') as SystemProfile) || 'VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('theris_user'));
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('theris_activeTab') || 'DASHBOARD');

  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // Stats Dinâmicos
  const stats = {
    pending: requests.filter(r => r.status.includes('PENDENTE')).length,
    approved: requests.filter(r => r.status === 'APROVADO').length,
    users: 142, // Exemplo, poderia vir do backend
    myReqs: requests.filter(r => r.requester.id === currentUser?.id).length
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
        const savedId = localStorage.getItem('theris_selectedToolId');
        if (savedId && !selectedTool && activeTab === 'TOOLS') {
          const found = toolsData.find((t: Tool) => t.id === savedId);
          if (found) setSelectedTool(found);
        }
      }
      if (resReqs.ok) setRequests(await resReqs.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(loadData, 10000);
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

  const handleLogout = () => { localStorage.clear(); setIsLoggedIn(false); setCurrentUser(null); setActiveTab('DASHBOARD'); setSelectedTool(null); };

  const handleApprove = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    const note = window.prompt(action === 'APROVAR' ? "Observação (Opcional):" : "⚠️ Motivo da Reprovação:");
    if (action === 'REPROVAR' && !note) return alert("Motivo obrigatório.");
    if (note === null) return;
    try {
      await fetch(`${API_URL}/api/solicitacoes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action, approverId: currentUser?.id, adminNote: note }) });
      loadData();
    } catch (e) { alert("Erro de conexão."); }
  };

  const getGroupedAccesses = (tool: Tool) => {
    if (!tool.accesses) return {};
    return tool.accesses.reduce((acc, curr) => {
      const level = curr.status; if (!acc[level]) acc[level] = []; acc[level].push(curr.user); return acc;
    }, {} as Record<string, User[]>);
  };

  // --- RENDER ---
  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card fade-in">
        <Bird size={60} color="#8b5cf6" style={{ marginBottom: 20 }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 10px 0', background: 'linear-gradient(to right, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Theris OS</h1>
        <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Governança de Identidade & Acessos</p>
        <button onClick={() => handleLogin()} className="google-btn-custom"><img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" /> Entrar com Workspace</button>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-box"><Bird size={28} color="#8b5cf6" /> THERIS</div>
        <nav style={{ flex: 1 }}>
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null) }}><LayoutDashboard size={20} /> Overview</div>
          <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { setActiveTab('TOOLS'); setSelectedTool(null) }}><Server size={20} /> Ferramentas</div>
          {['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(systemProfile) && <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={20} /> Logs</div>}
        </nav>
        <div className="user-mini-profile">
          <div style={{ width: 35, height: 35, borderRadius: '10px', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{currentUser?.name.charAt(0)}</div>
          <div><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentUser?.name.split(' ')[0]}</div><div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{systemProfile}</div></div>
        </div>
        <button onClick={handleLogout} className="logout-btn"><LogOut size={16} /> Sair</button>
      </aside>

      {/* MAIN AREA */}
      <main className="main-area">
        <header className="header-bar">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e5e7eb' }}>{activeTab === 'TOOLS' && selectedTool ? selectedTool.name : activeTab}</h2>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <Search size={20} color="#9ca3af" />
            <Bell size={20} color="#9ca3af" />
          </div>
        </header>

        <div className="content-scroll">

          {/* --- DASHBOARD BENTO GRID --- */}
          {activeTab === 'DASHBOARD' && (
            <div className="bento-grid fade-in">
              {/* HERO */}
              <div className="premium-card bento-hero">
                <div className="hero-content">
                  <h1>Bem-vindo, {currentUser?.name.split(' ')[0]}</h1>
                  <p>Aqui está o panorama de governança de hoje.</p>
                </div>
              </div>

              {/* DATE */}
              <div className="premium-card bento-date">
                <div className="date-display">
                  <div className="date-big">{new Date().getDate()}</div>
                  <div className="date-small">{new Date().toLocaleDateString('pt-BR', { month: 'long', weekday: 'short' })}</div>
                </div>
              </div>

              {/* STATS */}
              <div className="premium-card bento-stat">
                <div className="stat-box">
                  <div className="stat-label"><Clock size={16} color="#fbbf24" /> PENDENTES</div>
                  <div className="stat-number">{stats.pending}</div>
                </div>
                <Clock className="stat-icon-faded" />
              </div>

              <div className="premium-card bento-stat">
                <div className="stat-box">
                  <div className="stat-label"><CheckCircle size={16} color="#10b981" /> APROVADOS</div>
                  <div className="stat-number">{stats.approved}</div>
                </div>
                <CheckCircle className="stat-icon-faded" />
              </div>

              <div className="premium-card bento-stat">
                <div className="stat-box">
                  <div className="stat-label"><Server size={16} color="#c4b5fd" /> APPS</div>
                  <div className="stat-number">{tools.length}</div>
                </div>
                <Server className="stat-icon-faded" />
              </div>

              <div className="premium-card bento-stat">
                <div className="stat-box">
                  <div className="stat-label"><UserIcon size={16} color="#fff" /> MEUS</div>
                  <div className="stat-number">{stats.myReqs}</div>
                </div>
              </div>

              {/* LISTA DE PENDÊNCIAS */}
              <div className="premium-card bento-list">
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Zap size={18} color="#fbbf24" /> Ação Necessária</h3>
                {requests.filter(r => r.status.includes('PENDENTE')).length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>Tudo em dia! Nenhuma pendência.</p>
                ) : (
                  <div style={{ marginTop: 20 }}>
                    {requests.filter(r => r.status.includes('PENDENTE')).map(r => (
                      <div key={r.id} className="action-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                          <div className="action-avatar">{r.requester?.name.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{JSON.parse(r.details).info || r.type}</div>
                            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Solicitado por {r.requester?.name.split(' ')[0]}</div>
                          </div>
                        </div>
                        <div className="action-btns">
                          <button className="btn-ok" onClick={() => handleApprove(r.id, 'APROVAR')}>Aprovar</button>
                          <button className="btn-no" onClick={() => handleApprove(r.id, 'REPROVAR')}>Recusar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FEED / TIMELINE */}
              <div className="premium-card bento-feed">
                <h3 style={{ marginTop: 0, marginBottom: 25 }}>Atividade Recente</h3>
                <div className="timeline-wrapper">
                  {requests.slice(0, 5).map(r => (
                    <div key={r.id} className="timeline-row">
                      <div className="t-icon">
                        {r.status === 'APROVADO' ? <CheckCircle size={18} color="#10b981" /> : r.status.includes('PENDENTE') ? <Clock size={18} color="#fbbf24" /> : <XCircle size={18} color="#ef4444" />}
                      </div>
                      <div className="t-content">
                        <h4>{JSON.parse(r.details).info || JSON.parse(r.details).tool || 'Solicitação'}</h4>
                        <p>{r.status} • {r.requester?.name.split(' ')[0]} • {new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- TOOLS CATALOG --- */}
          {activeTab === 'TOOLS' && !selectedTool && (
            <div className="fade-in">
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 30 }}>Catálogo de Sistemas</h2>
              <div className="tools-bento">
                {tools.map(tool => (
                  <div key={tool.id} className="tool-tile" onClick={() => setSelectedTool(tool)}>
                    <div className="tile-glow"></div>
                    <Server size={32} color="#8b5cf6" style={{ marginBottom: 15 }} />
                    <h3>{tool.name}</h3>
                    <p>{tool.owner?.name.split(' ')[0] || 'Sem Owner'}</p>
                    <div style={{ marginTop: 20, fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 600 }}>
                      {tool.accesses?.length || 0} Membros
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TOOL DETAILS --- */}
          {activeTab === 'TOOLS' && selectedTool && (
            <div className="fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
              <button onClick={() => { setSelectedTool(null); setExpandedLevel(null) }} className="btn-back"><ArrowLeft size={18} /> Voltar</button>

              <div className="premium-card" style={{ marginBottom: 30, display: 'flex', alignItems: 'center', gap: 30 }}>
                <div style={{ width: 80, height: 80, background: 'rgba(139, 92, 246, 0.2)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Server size={40} color="#8b5cf6" />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem' }}>{selectedTool.name}</h1>
                  <p style={{ color: '#9ca3af', margin: '5px 0 0 0' }}>Matriz de Governança de Acessos</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
                <div className="premium-card">
                  <small style={{ textTransform: 'uppercase', color: '#6b7280', letterSpacing: '1px', fontSize: '0.75rem' }}>Owner Responsável</small>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 15 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{selectedTool.owner?.name.charAt(0) || '?'}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{selectedTool.owner?.name || 'Não definido'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{selectedTool.owner?.email}</div>
                    </div>
                  </div>
                </div>
                {selectedTool.subOwner && (
                  <div className="premium-card">
                    <small style={{ textTransform: 'uppercase', color: '#6b7280', letterSpacing: '1px', fontSize: '0.75rem' }}>Sub-Owner (Backup)</small>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 15 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{selectedTool.subOwner.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{selectedTool.subOwner.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{selectedTool.subOwner.email}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <h3 style={{ marginBottom: 20 }}>Níveis de Permissão</h3>
              <div className="level-container">
                {Object.keys(getGroupedAccesses(selectedTool)).length === 0 && <p style={{ color: '#6b7280' }}>Nenhum usuário cadastrado.</p>}
                {Object.entries(getGroupedAccesses(selectedTool)).sort((a, b) => a[0].localeCompare(b[0])).map(([level, users]) => (
                  <div key={level} className="level-block">
                    <div className="level-head" onClick={() => setExpandedLevel(expandedLevel === level ? null : level)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {level.toLowerCase().includes('admin') ? <Crown size={20} color="#fbbf24" /> : <Shield size={20} color="#9ca3af" />}
                        <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{level}</span>
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{users.length}</span>
                      </div>
                      {expandedLevel === level ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    {expandedLevel === level && (
                      <div className="level-body">
                        {users.map(u => (
                          <div key={u.id} className="user-chip">
                            <div className="chip-avatar">{u.name.charAt(0)}</div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{u.email.split('@')[0]}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'HISTORY' && <div className="premium-card"><h3 style={{ margin: 0 }}>Logs de Auditoria</h3><p>Funcionalidade em desenvolvimento.</p></div>}

        </div>
      </main>
    </div>
  );
}