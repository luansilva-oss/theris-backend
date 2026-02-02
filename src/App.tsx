import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Server, LogOut, Bird,
  Activity, ArrowLeft, Shield, Mail, Lock
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

// Lógica de URL: Vazio em produção (usa relativo), Localhost em desenvolvimento
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- INTERFACES ---
interface User {
  id: string;
  name: string;
  email: string;
  role?: { name: string };
  department?: { name: string };
}

interface Tool {
  id: string;
  name: string;
  owner?: { name: string; email: string };
  subOwner?: { name: string; email: string };
  // Acessos agora trazem o STATUS, que é o nome do Cargo na ferramenta (ex: 'Admin (GL-1)')
  accesses?: { user: User; status: string }[];
}

interface Request {
  id: string;
  requester: User;
  type: string;
  status: string;
  details: string;
  createdAt: string;
}

type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

export default function App() {
  // --- ESTADOS GLOBAIS ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>('VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // --- DADOS ---
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // Navegação da Aba Ferramentas (Block Navigation)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  // --- CARREGAMENTO DE DADOS ---
  const loadData = async () => {
    try {
      const [resTools, resReqs] = await Promise.all([
        fetch(`${API_URL}/api/tools`),
        fetch(`${API_URL}/api/solicitacoes`)
      ]);
      if (resTools.ok) setTools(await resTools.json());
      if (resReqs.ok) setRequests(await resReqs.json());
    } catch (e) { console.error("Erro ao carregar dados", e); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      // Auto-refresh suave a cada 30s
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // --- LOGIN ---
  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`${API_URL}/api/login/google`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: tokenResponse.access_token })
        });
        const data = await res.json();
        if (res.ok) {
          setCurrentUser(data.user);
          setSystemProfile(data.profile);
          setIsLoggedIn(true);
        } else {
          alert("Falha na autenticação: " + data.error);
        }
      } catch (e) { alert("Erro de conexão com o servidor."); }
    },
    onError: () => alert("Login cancelado ou falhou.")
  });

  // --- TELA DE LOGIN ---
  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Bird size={48} color="#7C3AED" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: 10 }}>Theris OS</h1>
        <p style={{ color: '#94a3b8', marginBottom: 30 }}>Governança de Acessos e Identidade</p>

        <button onClick={() => handleLogin()} className="google-btn-custom">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" alt="G" />
          Entrar com Google Institucional
        </button>

        <p style={{ marginTop: 20, fontSize: '0.8rem', color: '#475569' }}>
          Acesso restrito a colaboradores do Grupo 3C
        </p>
      </div>
    </div>
  );

  // --- APLICAÇÃO PRINCIPAL ---
  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-box">
          <Bird size={24} style={{ marginRight: 12, color: '#7C3AED' }} />
          THERIS
        </div>

        <div className="user-mini-profile">
          <div style={{
            width: 35, height: 35, background: '#7C3AED', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white'
          }}>
            {currentUser?.name.charAt(0)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', color: 'white' }}>
              {currentUser?.name.split(' ')[0]}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{systemProfile}</div>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
            onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null); }}>
            <LayoutDashboard size={18} /> Visão Geral
          </div>
          <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`}
            onClick={() => { setActiveTab('TOOLS'); setSelectedTool(null); }}>
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
            Painel / <span style={{ color: '#7C3AED' }}>
              {activeTab === 'DASHBOARD' ? 'Visão Geral' :
                activeTab === 'TOOLS' ? (selectedTool ? selectedTool.name : 'Catálogo de Ferramentas') :
                  activeTab}
            </span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#10b981' }}>
            <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></div>
            Sistema Online
          </div>
        </header>

        <div className="content-scroll">

          {/* --- DASHBOARD --- */}
          {activeTab === 'DASHBOARD' && (
            <div style={{ maxWidth: '900px' }}>
              <h1 style={{ fontSize: '2rem', marginBottom: 20 }}>Olá, <span style={{ color: '#7C3AED' }}>{currentUser?.name.split(' ')[0]}</span></h1>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                <div className="glass-card">
                  <h3><Activity size={20} color="#7C3AED" /> Atividade Recente</h3>
                  <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {requests.length === 0 ?
                      <p style={{ color: '#64748b' }}>Nenhuma solicitação pendente.</p> :
                      requests.slice(0, 5).map(r => (
                        <div key={r.id} style={{
                          padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{JSON.parse(r.details).info || JSON.parse(r.details).tool || 'Solicitação'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                          </div>
                          <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 4, background: r.status === 'APROVADO' ? '#059669' : '#d97706', color: 'white' }}>
                            {r.status.replace('PENDENTE_', 'AGUARD. ')}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                <div className="glass-card">
                  <h3><Lock size={20} color="#3b82f6" /> Meus Acessos</h3>
                  <p style={{ color: '#94a3b8', marginTop: 10 }}>Você possui acesso registrado em <strong>{tools.filter(t => t.accesses?.some(a => a.user.id === currentUser?.id)).length}</strong> ferramentas gerenciadas.</p>
                </div>
              </div>
            </div>
          )}

          {/* --- FERRAMENTAS (Lógica de Blocos) --- */}
          {activeTab === 'TOOLS' && (
            <>
              {!selectedTool ? (
                // NÍVEL 1: LISTA DE BLOCOS (CARDS)
                <div className="fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Ferramentas Gerenciadas</h3>
                      <p style={{ margin: '5px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Selecione uma ferramenta para ver a matriz de acesso.</p>
                    </div>
                    <span style={{ fontSize: '0.9rem', background: '#334155', padding: '5px 10px', borderRadius: 6, color: 'white' }}>
                      {tools.length} Sistemas
                    </span>
                  </div>

                  <div className="tools-grid">
                    {tools.map(tool => (
                      <div key={tool.id} className="tool-card" onClick={() => setSelectedTool(tool)}>
                        <div className="tool-icon-placeholder"><Server size={24} /></div>
                        <h4 style={{ fontSize: '1.1rem', margin: '0 0 5px 0', color: 'white' }}>{tool.name}</h4>

                        <div style={{ marginBottom: 15 }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Owner</div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{tool.owner?.name.split(' ')[0] || 'N/A'}</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 15 }}>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                            <Users size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                            {tool.accesses?.length || 0}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#7C3AED' }}>Ver Acessos →</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // NÍVEL 2: DETALHES DA FERRAMENTA
                <div className="fade-in">
                  <button onClick={() => setSelectedTool(null)} className="btn-back">
                    <ArrowLeft size={18} /> Voltar para lista
                  </button>

                  {/* CABEÇALHO DA FERRAMENTA */}
                  <div className="glass-card" style={{ marginBottom: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 25 }}>
                      <div className="tool-icon-placeholder" style={{ width: 60, height: 60, marginBottom: 0 }}><Server size={30} /></div>
                      <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{selectedTool.name}</h1>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Governança e Matriz de Acessos</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                      {/* Bloco Owner */}
                      <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Owner (Responsável)</div>
                        {selectedTool.owner ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedTool.owner.name.charAt(0)}</div>
                            <div>
                              <div style={{ fontWeight: 500, color: 'white' }}>{selectedTool.owner.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedTool.owner.email}</div>
                            </div>
                          </div>
                        ) : <span style={{ color: '#ef4444' }}>Não definido</span>}
                      </div>

                      {/* Bloco Sub-Owner */}
                      {selectedTool.subOwner && (
                        <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Sub-Owner (Backup)</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedTool.subOwner.name.charAt(0)}</div>
                            <div>
                              <div style={{ fontWeight: 500, color: 'white' }}>{selectedTool.subOwner.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedTool.subOwner.email}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LISTA DE USUÁRIOS (CARDS) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3>Usuários com Acesso</h3>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{selectedTool.accesses?.length || 0} usuários listados</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 15 }}>
                    {selectedTool.accesses?.sort((a, b) => a.status.localeCompare(b.status)).map((access, idx) => (
                      <div key={`${access.user.id}-${idx}`} className="user-block">
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: access.status.includes('Admin') || access.status.includes('Owner') ? '#7C3AED' : '#334155',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
                        }}>
                          {access.user.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {access.user.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Mail size={12} /> {access.user.email}
                          </div>
                        </div>
                        <div style={{ marginLeft: '10px' }}>
                          {/* AQUI ESTÁ A MÁGICA: Exibe o status personalizado (Ex: Admin GL-1) */}
                          <span style={{
                            fontSize: '0.7rem',
                            background: access.status.toLowerCase().includes('admin') || access.status.toLowerCase().includes('full') ? 'rgba(124, 58, 237, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                            color: access.status.toLowerCase().includes('admin') || access.status.toLowerCase().includes('full') ? '#c4b5fd' : '#cbd5e1',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {access.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!selectedTool.accesses || selectedTool.accesses.length === 0) && (
                      <p style={{ color: '#64748b', gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>
                        Nenhum usuário vinculado a esta ferramenta.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'HISTORY' && (
            <div className="glass-card">
              <h3>Auditoria</h3>
              <p style={{ color: '#94a3b8' }}>Logs do sistema em desenvolvimento.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}