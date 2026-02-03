import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Server, LogOut, Bird,
  Activity, ArrowLeft, Shield, Mail, Lock, ChevronRight
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// Interfaces
interface User { id: string; name: string; email: string; department?: { name: string }; }
interface Tool {
  id: string; name: string;
  owner?: { name: string; email: string };
  subOwner?: { name: string; email: string };
  accesses?: { user: User; status: string }[];
}
interface Request { id: string; details: string; status: string; createdAt: string; requester: User }
type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>('VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

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
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

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

  // Função para agrupar usuários por Nível (Status)
  const getGroupedAccesses = (tool: Tool) => {
    if (!tool.accesses) return {};
    return tool.accesses.reduce((acc, curr) => {
      const level = curr.status; // Ex: "Full (FA - 1)"
      if (!acc[level]) acc[level] = [];
      acc[level].push(curr.user);
      return acc;
    }, {} as Record<string, User[]>);
  };

  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Bird size={48} color="#7C3AED" /></div>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: 10 }}>Theris OS</h1>
        <button onClick={() => handleLogin()} className="google-btn-custom">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" /> Entrar com Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-box"><Bird size={24} style={{ marginRight: 12, color: '#7C3AED' }} /> THERIS</div>
        <div className="user-mini-profile">
          <div style={{ width: 35, height: 35, background: '#7C3AED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{currentUser?.name.charAt(0)}</div>
          <div><div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{currentUser?.name.split(' ')[0]}</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{systemProfile}</div></div>
        </div>
        <nav style={{ flex: 1 }}>
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null); }}><LayoutDashboard size={18} /> Visão Geral</div>
          <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { setActiveTab('TOOLS'); setSelectedTool(null); }}><Server size={18} /> Ferramentas</div>
          {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Auditoria</div>}
        </nav>
        <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="logout-btn"><LogOut size={18} /> Sair</button>
      </aside>

      <main className="main-area">
        <header className="header-bar">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>Painel / <span style={{ color: '#7C3AED' }}>{activeTab === 'TOOLS' && selectedTool ? selectedTool.name : activeTab}</span></h2>
        </header>

        <div className="content-scroll">
          {activeTab === 'DASHBOARD' && (
            <div style={{ maxWidth: 900 }}>
              <h1 style={{ fontSize: '2rem' }}>Olá, <span style={{ color: '#7C3AED' }}>{currentUser?.name.split(' ')[0]}</span></h1>
              <div className="glass-card">
                <h3><Activity size={20} color="#7C3AED" /> Atividade Recente</h3>
                {requests.slice(0, 5).map(r => (
                  <div key={r.id} style={{ padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{JSON.parse(r.details).info || 'Solicitação'}</span>
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: r.status === 'APROVADO' ? '#059669' : '#d97706', color: 'white' }}>{r.status}</span>
                  </div>
                ))}
                {requests.length === 0 && <p style={{ color: '#64748b' }}>Nenhuma atividade recente.</p>}
              </div>
            </div>
          )}

          {activeTab === 'TOOLS' && !selectedTool && (
            <div className="fade-in">
              <div style={{ marginBottom: 30 }}><h3>Ferramentas ({tools.length})</h3></div>
              <div className="tools-grid">
                {tools.map(tool => (
                  <div key={tool.id} className="tool-card" onClick={() => setSelectedTool(tool)}>
                    <div className="tool-icon-placeholder"><Server size={24} /></div>
                    <h4 style={{ fontSize: '1.1rem', margin: '0 0 5px 0', color: 'white' }}>{tool.name}</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Owner: {tool.owner?.name.split(' ')[0] || 'N/A'}</p>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7C3AED' }}>
                      <span>{tool.accesses?.length || 0} Usuários</span>
                      <span>Detalhes →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'TOOLS' && selectedTool && (
            <div className="fade-in">
              <button onClick={() => setSelectedTool(null)} className="btn-back"><ArrowLeft size={18} /> Voltar</button>

              {/* CABEÇALHO */}
              <div className="glass-card" style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                  <div className="tool-icon-placeholder" style={{ width: 60, height: 60, marginBottom: 0 }}><Server size={30} /></div>
                  <div><h1 style={{ margin: 0 }}>{selectedTool.name}</h1><p style={{ color: '#94a3b8', margin: 0 }}>Matriz de Acessos</p></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Owner</div>
                    <div style={{ fontWeight: 600, color: 'white', marginTop: 5 }}>{selectedTool.owner?.name || '--'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedTool.owner?.email}</div>
                  </div>
                  {selectedTool.subOwner && (
                    <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Sub-Owner</div>
                      <div style={{ fontWeight: 600, color: 'white', marginTop: 5 }}>{selectedTool.subOwner?.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedTool.subOwner?.email}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* LISTAGEM POR NÍVEIS (AQUI ESTÁ A MUDANÇA) */}
              <h3 style={{ marginBottom: 20 }}>Usuários e Níveis de Acesso</h3>

              {Object.keys(getGroupedAccesses(selectedTool)).length === 0 ? (
                <p style={{ color: '#64748b' }}>Nenhum usuário cadastrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                  {Object.entries(getGroupedAccesses(selectedTool))
                    .sort((a, b) => a[0].localeCompare(b[0])) // Ordena alfabeticamente os níveis
                    .map(([levelName, users]) => (
                      <div key={levelName} className="fade-in">
                        <div style={{
                          background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.1) 0%, rgba(15, 23, 42, 0) 100%)',
                          padding: '10px 15px', borderRadius: '8px', borderLeft: '4px solid #7C3AED', marginBottom: 15,
                          display: 'flex', alignItems: 'center', gap: 10
                        }}>
                          <Shield size={18} color="#7C3AED" />
                          <h4 style={{ margin: 0, color: '#c4b5fd', fontSize: '1rem' }}>{levelName}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 'auto' }}>{users.length} usuários</span>
                        </div>

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
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'HISTORY' && <div className="glass-card"><h3>Auditoria</h3></div>}
        </div>
      </main>
    </div>
  );
}