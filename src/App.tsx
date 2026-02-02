import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Clock, CheckCircle, XCircle,
  Server, LogOut, Bird, Activity, ArrowLeft, Shield, Mail
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

// URL da API (Relativa em produção, Localhost em dev)
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

interface User { id: string; name: string; email: string; role?: { name: string }; department?: { name: string }; }
interface Tool {
  id: string; name: string;
  owner?: { name: string; email: string };
  subOwner?: { name: string; email: string };
  accesses?: { user: User; status: string }[]; // Lista de quem tem acesso
}
interface Request { id: string; requester: User; type: string; status: string; details: string; createdAt: string; }
type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

export default function App() {
  // Estados Globais
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>('VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // Dados
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // Estado de Navegação da Aba Ferramentas (Block Navigation)
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
    if (isLoggedIn) { loadData(); }
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
      } catch (e) { alert("Erro de conexão"); }
    }
  });

  // Renderização condicional para Login
  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Bird size={40} color="#7C3AED" /></div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginBottom: 10 }}>Theris OS</h1>
        <p style={{ color: '#94a3b8', marginBottom: 30 }}>Governança de Acessos e Identidade</p>
        <button onClick={() => handleLogin()} className="google-btn-custom">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" alt="G" /> Entrar com Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      {/* SIDEBAR CORRIGIDA */}
      <aside className="sidebar">
        <div className="brand-box"><Bird size={24} style={{ marginRight: 12, color: '#7C3AED' }} /> THERIS</div>

        <div className="user-mini-profile">
          <div style={{ width: 35, height: 35, background: '#7C3AED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{currentUser?.name.charAt(0)}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{currentUser?.name.split(' ')[0]}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{systemProfile}</div>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null); }}>
            <LayoutDashboard size={18} /> Visão Geral
          </div>
          <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { setActiveTab('TOOLS'); setSelectedTool(null); }}>
            <Server size={18} /> Ferramentas
          </div>
          {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
            <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}>
              <FileText size={18} /> Auditoria
            </div>
          )}
        </nav>

        <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="logout-btn">
          <LogOut size={18} /> Sair
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="main-area">
        <header className="header-bar">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
            Painel / <span style={{ color: '#7C3AED' }}>{activeTab === 'DASHBOARD' ? 'Visão Geral' : activeTab === 'TOOLS' ? 'Governança' : activeTab}</span>
          </h2>
        </header>

        <div className="content-scroll">

          {/* --- DASHBOARD (Simplificado para focar na mudança das Tools) --- */}
          {activeTab === 'DASHBOARD' && (
            <div style={{ maxWidth: '800px' }}>
              <h1 style={{ fontSize: '2rem', marginBottom: 20 }}>Bem-vindo, {currentUser?.name.split(' ')[0]}</h1>
              <div className="glass-card">
                <h3><Activity size={20} color="#7C3AED" /> Atividade Recente</h3>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests.length === 0 ? <p style={{ color: '#64748b' }}>Nenhuma atividade recente.</p> :
                    requests.slice(0, 3).map(r => (
                      <div key={r.id} style={{ padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{JSON.parse(r.details).tool || 'Solicitação'}</span>
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: r.status === 'APROVADO' ? '#059669' : '#d97706' }}>{r.status}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* --- FERRAMENTAS (NOVA VISÃO DE BLOCOS) --- */}
          {activeTab === 'TOOLS' && (
            <>
              {!selectedTool ? (
                // NÍVEL 1: GRID DE FERRAMENTAS
                <div className="fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                    <h3>Ferramentas Gerenciadas</h3>
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{tools.length} Sistemas integrados</span>
                  </div>

                  <div className="tools-grid">
                    {tools.map(tool => (
                      <div key={tool.id} className="tool-card" onClick={() => setSelectedTool(tool)}>
                        <div className="tool-icon-placeholder"><Server size={24} /></div>
                        <h4 style={{ fontSize: '1.2rem', margin: '0 0 5px 0' }}>{tool.name}</h4>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>Gerenciado por {tool.owner?.name.split(' ')[0] || 'N/A'}</p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15 }}>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                            <Users size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                            {tool.accesses?.length || 0} Usuários
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#7C3AED' }}>Ver detalhes →</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // NÍVEL 2: DETALHES (BLOCOS DE USUÁRIOS)
                <div className="fade-in">
                  <button onClick={() => setSelectedTool(null)} className="btn-back">
                    <ArrowLeft size={18} /> Voltar para lista
                  </button>

                  <div className="glass-card" style={{ marginBottom: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                      <div className="tool-icon-placeholder" style={{ width: 60, height: 60, marginBottom: 0 }}><Server size={30} /></div>
                      <div>
                        <h1 style={{ margin: 0 }}>{selectedTool.name}</h1>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Painel de Governança</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div style={{ padding: 15, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Owner (Responsável Técnico)</div>
                        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Shield size={16} color="#10b981" /> {selectedTool.owner?.name || 'Não definido'}
                        </div>
                      </div>
                      <div style={{ padding: 15, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Sub-Owner (Backup)</div>
                        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Shield size={16} color="#3b82f6" /> {selectedTool.subOwner?.name || 'Não definido'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <h3 style={{ marginBottom: 20 }}>Usuários com Acesso</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 15 }}>
                    {selectedTool.accesses?.map(access => (
                      <div key={access.user.id} className="user-block">
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {access.user.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{access.user.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Mail size={12} /> {access.user.email}
                          </div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: 4 }}>ATIVO</span>
                        </div>
                      </div>
                    ))}
                    {(!selectedTool.accesses || selectedTool.accesses.length === 0) && (
                      <p style={{ color: '#64748b' }}>Nenhum usuário vinculado a esta ferramenta.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'HISTORY' && <div className="glass-card"><h3>Auditoria</h3><p>Logs do sistema indisponíveis no momento.</p></div>}
        </div>
      </main>
    </div>
  );
}