import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Clock, CheckCircle, XCircle,
  Server, ChevronRight, ChevronDown, LogOut, Lock, User,
  Bird, Activity, Calendar, List, Search, Filter, ShieldCheck, Zap
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;

// --- INTERFACES ATUALIZADAS ---
interface User {
  id: string; name: string; email: string; role?: { name: string }; department?: { name: string };
  manager?: { id: string; name: string; }; myDeputy?: { id: string; name: string; };
}

// A interface TOOL agora suporta a governança completa
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
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [targetUserId, setTargetUserId] = useState('');

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const loadData = async () => {
    try {
      const [resStruct, resTools, resUsers, resReqs] = await Promise.all([
        fetch(`${API_URL}/api/structure`), fetch(`${API_URL}/api/tools`), fetch(`${API_URL}/api/users`), fetch(`${API_URL}/api/solicitacoes`)
      ]);

      setStructure(await resStruct.json());
      setTools(await resTools.json());
      setAllUsers(await resUsers.json());
      setRequests(await resReqs.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(loadData, 5000); // Auto-refresh a cada 5s
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // LOGIN
  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`${API_URL}/api/login/google`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: tokenResponse.access_token })
        });
        const data = await res.json();
        if (res.ok) { setCurrentUser(data.user); setSystemProfile(data.profile); setIsLoggedIn(true); }
        else { alert(`Erro: ${data.error}`); }
      } catch (error) { alert("Erro de conexão"); }
    }, onError: () => alert('Falha Login Google')
  });

  const handleApprove = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    if (!confirm(`Confirmar ${action}?`)) return;
    const res = await fetch(`${API_URL}/api/solicitacoes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action, approverId: currentUser?.id })
    });
    if (res.ok) loadData();
  };

  const handleDeputyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica simplificada de deputy request
    alert("Funcionalidade em desenvolvimento");
  };

  // --- RENDER ---
  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="brand-header"><div className="logo-container"><Bird size={28} color="white" /></div><h1 className="brand-title">Theris OS</h1></div>
        <button onClick={() => handleLogin()} className="google-btn-custom"><img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" /> Entrar com Google</button>
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
          <div><h2 style={{ color: '#7C3AED', margin: 0 }}>Painel / {activeTab}</h2></div>
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
                      <table className="modern-table">
                        <thead><tr><th>Quem</th><th>O quê</th><th>Status</th><th>Ação</th></tr></thead>
                        <tbody>{requests.filter(r => r.status.includes('PENDENTE')).map(r => (
                          <tr key={r.id}>
                            <td>{r.requester?.name}</td>
                            <td>{JSON.parse(r.details).info || JSON.parse(r.details).tool || 'Pedido'}</td>
                            <td><StatusBadge status={r.status} /></td>
                            <td><button onClick={() => handleApprove(r.id, 'APROVAR')} className="btn-icon btn-approve"><CheckCircle size={16} /></button></td>
                          </tr>
                        ))}</tbody>
                      </table>
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