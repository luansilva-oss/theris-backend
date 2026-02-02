import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Clock, CheckCircle, XCircle,
  Server, ChevronRight, ChevronDown, LogOut, Lock, User,
  Bird, Activity, Calendar, List, Search, Filter, ShieldCheck, Zap
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

// --- CORREÇÃO CRÍTICA AQUI ---
// Se estiver rodando localmente, aponta para o backend na porta 3000.
// Se estiver em produção (Render), usa string vazia para o navegador usar o caminho relativo (/api/...)
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : '';

// --- INTERFACES ---
interface User {
  id: string; name: string; email: string; role?: { name: string }; department?: { name: string };
  manager?: { id: string; name: string; }; myDeputy?: { id: string; name: string; };
}

interface Tool {
  id: string;
  name: string;
  owner?: { name: string; email: string };
  subOwner?: { name: string; email: string };
  accesses?: { user: { name: string; email: string } }[];
}

interface Request { id: string; requesterId: string; requester: User; type: string; status: string; details: string; justification: string; createdAt: string; updatedAt: string; isExtraordinary: boolean; lastApprover?: { name: string }; }
interface Department { id: string; name: string; roles: Role[]; }
interface Role { id: string; name: string; users: User[]; }

type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

// --- COMPONENTES AUXILIARES ---
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'APROVADO') return <span className="badge APROVADO">APROVADO</span>;
  if (status === 'REPROVADO') return <span className="badge REPROVADO">REPROVADO</span>;

  let label = 'PENDENTE';
  let colorClass = 'PENDENTE';
  if (status === 'PENDENTE_OWNER') { label = 'AGUARD. OWNER'; colorClass = 'PENDENTE_OWNER'; }
  if (status === 'PENDENTE_SUB_OWNER') { label = 'AGUARD. SUB-OWNER'; colorClass = 'PENDENTE_OWNER'; }
  if (status === 'PENDENTE_SI') { label = 'AGUARD. SI'; colorClass = 'PENDENTE_SI'; }
  if (status === 'PENDENTE_GESTOR') label = 'AGUARD. GESTOR';

  return <span className={`badge ${colorClass}`}>{label}</span>;
};

const ActivityFeed = ({ requests }: { requests: Request[] }) => (
  <div className="glass-card" style={{ height: '100%', minHeight: '400px' }}>
    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Activity size={20} color="#7C3AED" /> Atividade Recente
    </h3>
    <div className="activity-list">
      {requests.slice(0, 6).map(r => {
        let info = "Solicitação";
        try { const parsed = JSON.parse(r.details); info = parsed.info || parsed.tool || info; } catch (e) { }
        return (
          <div key={r.id} className="activity-item">
            <div className={`status-indicator ${r.status}`}></div>
            <div>
              <div className="act-title"><span style={{ color: '#cbd5e1' }}>{r.requester?.name.split(' ')[0]}</span> - {info}</div>
              <div className="act-date">{new Date(r.createdAt).toLocaleDateString()} • {r.status.replace('PENDENTE_', 'AGUARD. ')}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>('VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // Dados
  const [structure, setStructure] = useState<Department[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // Filtros (mantidos para uso futuro)
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    try {
      // Como API_URL pode ser vazio em produção, a rota vira apenas "/api/..." (relativo)
      const [resStruct, resTools, resUsers, resReqs] = await Promise.all([
        fetch(`${API_URL}/api/structure`),
        fetch(`${API_URL}/api/tools`),
        fetch(`${API_URL}/api/users`),
        fetch(`${API_URL}/api/solicitacoes`)
      ]);

      if (resStruct.ok) setStructure(await resStruct.json());
      if (resTools.ok) setTools(await resTools.json());
      if (resUsers.ok) setAllUsers(await resUsers.json());
      if (resReqs.ok) setRequests(await resReqs.json());
    } catch (e) { console.error("Erro ao carregar dados:", e); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(loadData, 10000); // Aumentei para 10s para não sobrecarregar
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // LOGIN
  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log("Enviando token para:", `${API_URL}/api/login/google`);
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
          alert(`Erro no login: ${data.error || 'Falha desconhecida'}`);
        }
      } catch (error) {
        console.error(error);
        alert("Erro de conexão com o servidor. Verifique o console.");
      }
    }, onError: () => alert('O Google recusou o login.')
  });

  const handleApprove = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    if (!confirm(`Deseja realmente ${action}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/solicitacoes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, approverId: currentUser?.id })
      });
      if (res.ok) loadData();
      else alert("Erro ao processar aprovação.");
    } catch (e) { alert("Erro de conexão."); }
  };

  // --- RENDER ---
  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="brand-header"><div className="logo-container"><Bird size={28} color="white" /></div><h1 className="brand-title">Theris OS</h1></div>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '20px' }}>Faça login com sua conta institucional</p>
        <button onClick={() => handleLogin()} className="google-btn-custom">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" alt="G" />
          Entrar com Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-box"><Bird size={28} color="#7C3AED" style={{ marginRight: 10 }} /> THERIS</div>
        <div className="user-mini-profile">
          <div className="avatar">{currentUser?.name.charAt(0)}</div>
          <div className="info"><div className="name">{currentUser?.name.split(' ')[0]}</div><div className="role">{systemProfile}</div></div>
        </div>
        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}><LayoutDashboard size={20} /><span className="nav-text">Visão Geral</span></div>
          {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
            <>
              <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={20} /><span className="nav-text">Auditoria</span></div>
              <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => setActiveTab('TOOLS')}><Server size={20} /><span className="nav-text">Ferramentas</span></div>
              <div className={`nav-item ${activeTab === 'ORG' ? 'active' : ''}`} onClick={() => setActiveTab('ORG')}><Users size={20} /><span className="nav-text">Organograma</span></div>
            </>
          )}
        </nav>
        <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="logout-btn"><LogOut size={20} /> Sair</button>
      </aside>

      <main className="main-area">
        <header className="header-bar">
          <div><h2 style={{ color: '#7C3AED', margin: 0 }}>Painel / {activeTab === 'DASHBOARD' ? 'Visão Geral' : activeTab}</h2></div>
          <div className="status-badge"><div className="dot"></div> Online</div>
        </header>

        <div className="content-scroll">
          {/* DASHBOARD */}
          {activeTab === 'DASHBOARD' && (
            <div className="dashboard-grid">
              <div className="hero-banner"><h1>Olá, <span style={{ color: '#7C3AED' }}>{currentUser?.name.split(' ')[0]}</span></h1></div>
              <div className="dashboard-split">
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* APROVAÇÕES PENDENTES */}
                  {systemProfile !== 'VIEWER' && (
                    <div className="glass-card">
                      <h3><Clock size={20} /> Pendências</h3>
                      {requests.filter(r => r.status.includes('PENDENTE')).length === 0 ? (
                        <p style={{ color: '#94a3b8', padding: '10px' }}>Nenhuma pendência no momento.</p>
                      ) : (
                        <table className="modern-table">
                          <thead><tr><th>Quem</th><th>O quê</th><th>Status</th><th>Ação</th></tr></thead>
                          <tbody>{requests.filter(r => r.status.includes('PENDENTE')).map(r => (
                            <tr key={r.id}>
                              <td>{r.requester?.name}</td>
                              <td>{JSON.parse(r.details).info || JSON.parse(r.details).tool || 'Pedido'}</td>
                              <td><StatusBadge status={r.status} /></td>
                              <td>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <button onClick={() => handleApprove(r.id, 'APROVAR')} title="Aprovar" className="btn-icon btn-approve"><CheckCircle size={16} /></button>
                                  <button onClick={() => handleApprove(r.id, 'REPROVAR')} title="Reprovar" className="btn-icon btn-reject" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><XCircle size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </div>
                  )}
                  <div className="glass-card">
                    <h3>Meus Pedidos</h3>
                    <table className="modern-table"><tbody>{requests.filter(r => r.requesterId === currentUser?.id).slice(0, 5).map(r => (<tr key={r.id}><td>{r.type}</td><td><StatusBadge status={r.status} /></td></tr>))}</tbody></table>
                  </div>
                </div>
                <div style={{ flex: 1 }}><ActivityFeed requests={requests} /></div>
              </div>
            </div>
          )}

          {/* FERRAMENTAS (GOVERNANÇA) */}
          {activeTab === 'TOOLS' && (
            <div className="glass-card">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={20} color="#7C3AED" /> Governança de Ferramentas
              </h3>
              <table className="modern-table">
                <thead><tr><th>FERRAMENTA</th><th>OWNER</th><th>SUB-OWNER</th><th>USUÁRIOS ATIVOS</th></tr></thead>
                <tbody>
                  {tools.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, color: 'white' }}>{t.name}</td>
                      <td>
                        {t.owner ? (
                          <div><div style={{ color: '#fff' }}>{t.owner.name}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.owner.email}</div></div>
                        ) : <span style={{ color: '#ef4444' }}>Sem Owner</span>}
                      </td>
                      <td>
                        {t.subOwner ? (
                          <div><div style={{ color: '#cbd5e1' }}>{t.subOwner.name}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.subOwner.email}</div></div>
                        ) : <span style={{ color: '#64748b' }}>--</span>}
                      </td>
                      <td>
                        {t.accesses && t.accesses.length > 0 ? (
                          <div style={{ color: '#10b981', fontWeight: 'bold' }}>{t.accesses.length} Usuários</div>
                        ) : <span style={{ color: '#64748b' }}>0 Usuários</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* OUTRAS ABAS (Simplificadas) */}
          {activeTab === 'HISTORY' && <div className="glass-card"><h3>Histórico</h3><p>Use os filtros para buscar logs antigos.</p></div>}
          {activeTab === 'ORG' && <div className="glass-card"><h3>Organograma</h3><p>Estrutura carregada: {structure.length} departamentos.</p></div>}
        </div>
      </main>
    </div>
  );
}