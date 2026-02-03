import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Server, FileText, LogOut, Bird,
  ArrowLeft, Shield, CheckCircle, XCircle, Clock, Crown,
  Search, Bell, Lock, Layers, ChevronDown, ChevronRight,
  Users // <--- ÍCONE NOVO
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

import { ModalObservacao } from './components/ModalObservacao';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- TYPES ---
interface User { id: string; name: string; email: string; jobTitle?: string; department?: string; manager?: { name: string }; }
interface Tool { id: string; name: string; owner?: User; subOwner?: User; accesses?: { user: User; status: string }[]; }

interface Request {
  id: string;
  details: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  requester: User;
  approver?: User;
  type: string;
  adminNote?: string;
}

type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

const SESSION_DURATION = 3 * 60 * 60 * 1000;

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const s = localStorage.getItem('theris_user'); return s ? JSON.parse(s) : null;
  });
  const [systemProfile, setSystemProfile] = useState<SystemProfile>(() => (localStorage.getItem('theris_profile') as SystemProfile) || 'VIEWER');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('theris_activeTab') || 'DASHBOARD');

  // DADOS
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // <--- ESTADO PARA LISTA DE PESSOAS

  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'aprovar' | 'reprovar'>('aprovar');
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);

  // Stats
  const stats = {
    pending: requests.filter(r => r.status.includes('PENDENTE')).length,
    approved: requests.filter(r => r.status === 'APROVADO').length,
    total: requests.length,
    myReqs: requests.filter(r => r.requester.id === currentUser?.id).length
  };

  useEffect(() => { localStorage.setItem('theris_activeTab', activeTab); }, [activeTab]);
  useEffect(() => {
    if (selectedTool) localStorage.setItem('theris_selectedToolId', selectedTool.id);
    else if (activeTab === 'TOOLS' && !selectedTool) localStorage.removeItem('theris_selectedToolId');
  }, [selectedTool, activeTab]);

  // Session Check
  useEffect(() => {
    const checkSession = () => {
      const storedUser = localStorage.getItem('theris_user');
      const sessionStart = localStorage.getItem('theris_session_start');
      if (storedUser && sessionStart) {
        if (Date.now() - parseInt(sessionStart) > SESSION_DURATION) {
          alert("Sessão expirada."); handleLogout();
        } else setIsLoggedIn(true);
      } else setIsLoggedIn(false);
    };
    checkSession();
    const timer = setInterval(checkSession, 60000);
    return () => clearInterval(timer);
  }, []);

  // LOAD DATA
  const loadData = async () => {
    try {
      const [resTools, resReqs] = await Promise.all([
        fetch(`${API_URL}/api/tools`),
        fetch(`${API_URL}/api/solicitacoes`)
      ]);

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

      // BUSCA USUÁRIOS SE A ABA FOR PESSOAS
      if (activeTab === 'PEOPLE') {
        const resUsers = await fetch(`${API_URL}/api/users`);
        if (resUsers.ok) setAllUsers(await resUsers.json());
      }

    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, activeTab]); // Adicionei activeTab para recarregar quando mudar de aba

  // Actions
  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/login/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: tokenResponse.access_token }) });
        const data = await res.json();
        if (res.ok) {
          setCurrentUser(data.user); setSystemProfile(data.profile);
          await fetch(`${API_URL}/api/auth/send-mfa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: data.user.id }) });
          setIsLoading(false);
          setIsMfaRequired(true);
        } else {
          alert(data.error);
          setIsLoading(false);
        }
      } catch (e) {
        alert("Erro de conexão.");
        setIsLoading(false);
      }
    },
    onError: () => setIsLoading(false)
  });

  const handleMfaVerify = async () => {
    if (mfaCode.length < 6) return alert("Digite o código de 6 dígitos.");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-mfa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser?.id, code: mfaCode }) });
      const data = await res.json();
      if (res.ok && data.valid) {
        localStorage.setItem('theris_user', JSON.stringify(currentUser));
        localStorage.setItem('theris_profile', systemProfile);
        localStorage.setItem('theris_session_start', Date.now().toString());
        setIsLoggedIn(true); setIsMfaRequired(false);
      } else {
        alert(data.error || "Código inválido."); setMfaCode('');
      }
    } catch (e) { alert("Erro ao verificar."); }
    setIsLoading(false);
  };

  const handleMfaChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 6);
    setMfaCode(clean);
  };

  const handleLogout = () => { localStorage.clear(); setIsLoggedIn(false); setCurrentUser(null); setActiveTab('DASHBOARD'); setSelectedTool(null); setIsMfaRequired(false); };

  const handleOpenApprove = (id: string, action: 'APROVAR' | 'REPROVAR') => {
    setModalTargetId(id);
    setModalAction(action === 'APROVAR' ? 'aprovar' : 'reprovar');
    setModalOpen(true);
  };

  const handleConfirmApprove = async (note: string) => {
    if (!modalTargetId) return;

    if (modalAction === 'reprovar' && !note.trim()) {
      alert("⚠️ Para recusar, é obrigatório informar o motivo.");
      return;
    }

    const apiStatus = modalAction === 'aprovar' ? 'APROVAR' : 'REPROVAR';

    try {
      await fetch(`${API_URL}/api/solicitacoes/${modalTargetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: apiStatus,
          approverId: currentUser?.id,
          adminNote: note
        })
      });
      loadData();
      setModalOpen(false);
      setModalTargetId(null);
    } catch (e) {
      alert("Erro de conexão ao processar solicitação.");
    }
  };

  const getGroupedAccesses = (tool: Tool) => {
    if (!tool.accesses) return {};
    return tool.accesses.reduce((acc, curr) => {
      const level = curr.status; if (!acc[level]) acc[level] = []; acc[level].push(curr.user); return acc;
    }, {} as Record<string, User[]>);
  };

  // --- RENDER ---

  if (isMfaRequired) return (
    <div className="login-wrapper">
      <div className="login-card mfa-container">
        <div className="mfa-icon-wrapper"><Lock size={40} color="#8b5cf6" /></div>
        <h2 style={{ color: 'white', margin: 0 }}>Código de Segurança</h2>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Enviamos um código para <strong>{currentUser?.email}</strong>.</p>
        <input className="mfa-input-single" type="text" value={mfaCode} onChange={(e) => handleMfaChange(e.target.value)} placeholder="000000" autoFocus />
        <button onClick={handleMfaVerify} className="btn-verify" disabled={isLoading}>{isLoading ? 'Verificando...' : 'Confirmar Acesso'}</button>
        <button onClick={() => { setIsMfaRequired(false); setCurrentUser(null); setMfaCode(''); }} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', marginTop: 10 }}>Voltar</button>
      </div>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-card fade-in">
        <Bird size={60} color="#8b5cf6" style={{ marginBottom: 20 }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 10px 0', background: 'linear-gradient(to right, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Theris OS</h1>
        <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Governança de Identidade & Acessos</p>
        {isLoading ? (
          <div style={{ marginTop: 20, color: '#8b5cf6' }}>Conectando ao servidor...</div>
        ) : (
          <button onClick={() => handleLogin()} className="btn-google"><img src="https://www.svgrepo.com/show/475656/google-color.svg" width="18" /> Continuar com Workspace</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-box"><Bird size={24} color="#7c3aed" /> THERIS OS</div>
        <div className="nav-section">
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null) }}><LayoutDashboard size={18} /> Visão Geral</div>

          {/* NOVA ABA GESTÃO DE PESSOAS */}
          <div className={`nav-item ${activeTab === 'PEOPLE' ? 'active' : ''}`} onClick={() => setActiveTab('PEOPLE')}><Users size={18} /> Gestão de Pessoas</div>

          <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { setActiveTab('TOOLS'); setSelectedTool(null) }}><Layers size={18} /> Catálogo</div>
          {['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(systemProfile) && <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Auditoria</div>}
        </div>
        <div className="user-mini-profile">
          <div className="avatar-small">{currentUser?.name.charAt(0)}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{currentUser?.name.split(' ')[0]}</div>
            <div style={{ fontSize: 11, color: '#71717a' }}>{systemProfile}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn"><LogOut size={14} /> Sair do Sistema</button>
      </aside>

      {/* MAIN CANVAS */}
      <main className="main-area">
        <header className="header-bar">
          <div className="page-title">Pagina: <span>{activeTab === 'TOOLS' && selectedTool ? selectedTool.name : activeTab === 'PEOPLE' ? 'GESTÃO DE PESSOAS' : activeTab}</span></div>
          <div style={{ display: 'flex', gap: 20 }}><Search size={18} color="#71717a" /><Bell size={18} color="#71717a" /></div>
        </header>

        <div className="content-scroll">

          {/* DASHBOARD */}
          {activeTab === 'DASHBOARD' && (
            <div className="bento-grid fade-in">
              <div className="card-base cell-hero" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #09090b 100%)', borderColor: '#312e81' }}>
                <h1 style={{ fontSize: '28px', color: 'white', marginBottom: 10 }}>Olá, {currentUser?.name.split(' ')[0]}</h1>
                <p style={{ color: '#a5b4fc' }}>Painel de controle operacional ativo.</p>
              </div>

              <div className="card-base cell-date">
                <div style={{ fontSize: '42px', fontWeight: 800, color: 'white' }}>{new Date().getDate()}</div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#a1a1aa' }}>{new Date().toLocaleDateString('pt-BR', { month: 'short' })}</div>
              </div>

              <div className="card-base cell-stat">
                <div className="card-header"><span className="card-title">Pendentes</span><Clock size={16} color="#fbbf24" /></div>
                <div className="metric-value">{stats.pending}</div>
              </div>

              <div className="card-base cell-stat">
                <div className="card-header"><span className="card-title">Aprovados</span><CheckCircle size={16} color="#10b981" /></div>
                <div className="metric-value">{stats.approved}</div>
              </div>

              <div className="card-base cell-tasks">
                <div className="card-header"><span className="card-title">Ação Necessária</span></div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {requests.filter(r => r.status.includes('PENDENTE')).length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 14 }}>Nenhuma pendência.</div>
                  ) : (
                    requests.filter(r => r.status.includes('PENDENTE')).map(r => (
                      <div key={r.id} className="action-row">
                        <div className="action-info">
                          <h4>{JSON.parse(r.details).info || JSON.parse(r.details).tool}</h4>
                          <p>Solicitante: {r.requester?.name}</p>
                        </div>
                        <div className="action-buttons">
                          <button className="btn-mini approve" onClick={() => handleOpenApprove(r.id, 'APROVAR')}>Aprovar</button>
                          <button className="btn-mini reject" onClick={() => handleOpenApprove(r.id, 'REPROVAR')}>Recusar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card-base cell-feed">
                <div className="card-header"><span className="card-title">Feed Recente</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests.slice(0, 5).map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #27272a' }}>
                      {r.status === 'APROVADO' ? <CheckCircle size={16} color="#10b981" /> : <Clock size={16} color="#fbbf24" />}
                      <div style={{ fontSize: 13, color: '#d4d4d8' }}>{JSON.parse(r.details).info || r.type}</div>
                      <div style={{ marginLeft: 'auto', fontSize: 11, color: '#52525b' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GESTÃO DE PESSOAS (NOVA TELA) */}
          {activeTab === 'PEOPLE' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ color: 'white', fontSize: 20, margin: 0 }}>Colaboradores</h2>
                <div style={{ fontSize: 12, color: '#71717a' }}>{allUsers.length} Usuários Cadastrados</div>
              </div>

              <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa', textAlign: 'left' }}>
                      <th style={{ padding: '16px', fontWeight: 600 }}>NOME COMPLETO</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>CARGO</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>DEPARTAMENTO</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>GESTOR DIRETO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #1f1f22', color: '#e4e4e7' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#4c1d95', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: '#71717a' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: '#d4d4d8' }}>{u.jobTitle || '-'}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: '#27272a', color: '#a1a1aa', fontSize: 12 }}>
                            {u.department || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: '#a78bfa' }}>
                          {u.manager ? u.manager.name : <span style={{ color: '#52525b', fontStyle: 'italic' }}>-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATÁLOGO DE TOOLS */}
          {activeTab === 'TOOLS' && !selectedTool && (
            <div className="fade-in">
              <h2 style={{ color: 'white', fontSize: 20, marginBottom: 20 }}>Sistemas Conectados</h2>
              <div className="tools-wrapper">
                {tools.map(tool => (
                  <div key={tool.id} className="tool-tile" onClick={() => setSelectedTool(tool)}>
                    <div className="tile-icon"><Server size={24} /></div>
                    <div className="tile-info">
                      <h3>{tool.name}</h3>
                      <p>{tool.owner ? tool.owner.name.split(' ')[0] : 'Sem Owner'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOOL DETAILS */}
          {activeTab === 'TOOLS' && selectedTool && (
            <div className="fade-in">
              <button onClick={() => { setSelectedTool(null); setExpandedLevel(null) }} className="btn-text" style={{ marginBottom: 20 }}><ArrowLeft size={16} /> Voltar</button>

              <div className="detail-header">
                <div className="detail-title">
                  <h1>{selectedTool.name}</h1>
                  <div className="detail-meta">
                    <span>OWNER: {selectedTool.owner?.name || '--'}</span>
                    <span>SUB: {selectedTool.subOwner?.name || '--'}</span>
                    <span>USUÁRIOS: {selectedTool.accesses?.length}</span>
                  </div>
                </div>
                <div className="tile-icon" style={{ width: 60, height: 60 }}><Server size={30} /></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.keys(getGroupedAccesses(selectedTool)).length === 0 && <p style={{ color: '#52525b' }}>Sem dados.</p>}
                {Object.entries(getGroupedAccesses(selectedTool)).sort((a, b) => a[0].localeCompare(b[0])).map(([level, users]) => (
                  <div key={level} className="level-group">
                    <div className="level-trigger" onClick={() => setExpandedLevel(expandedLevel === level ? null : level)}>
                      <div className="level-name">
                        {level.toLowerCase().includes('admin') ? <Crown size={16} color="#fbbf24" /> : <Shield size={16} color="#71717a" />}
                        {level}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <span className="level-meta">{users.length} users</span>
                        {expandedLevel === level ? <ChevronDown size={16} color="#a1a1aa" /> : <ChevronRight size={16} color="#52525b" />}
                      </div>
                    </div>
                    {expandedLevel === level && (
                      <div className="level-content">
                        {users.map(u => (
                          <div key={u.id} className="user-pill">
                            <div className="pill-avatar">{u.name.charAt(0)}</div>
                            <div className="pill-info">
                              <div className="pill-name">{u.name}</div>
                              <div className="pill-email">{u.email}</div>
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

          {/* AUDITORIA */}
          {activeTab === 'HISTORY' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ color: 'white', fontSize: 20, margin: 0 }}>Logs de Auditoria</h2>
                <div style={{ fontSize: 12, color: '#71717a' }}>Total de Registros: {requests.filter(r => r.status !== 'PENDENTE').length}</div>
              </div>
              <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa', textAlign: 'left' }}>
                      <th style={{ padding: '16px', fontWeight: 600 }}>STATUS</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>SOLICITANTE</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>RESPONSÁVEL (APROVADOR)</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>DATA & HORA</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>OBSERVAÇÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests
                      .filter(r => r.status !== 'PENDENTE')
                      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
                      .map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #1f1f22', color: '#e4e4e7' }}>
                          <td style={{ padding: '16px' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '20px', fontSize: 11, fontWeight: 700,
                              backgroundColor: r.status === 'APROVADO' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: r.status === 'APROVADO' ? '#34d399' : '#f87171',
                              border: r.status === 'APROVADO' ? '1px solid #059669' : '1px solid #b91c1c',
                              display: 'inline-flex', alignItems: 'center', gap: 5
                            }}>
                              {r.status === 'APROVADO' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {r.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                                {r.requester.name.charAt(0)}
                              </div>
                              <span>{r.requester.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            {r.approver ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Shield size={14} color="#a78bfa" />
                                <span style={{ color: '#a78bfa' }}>{r.approver.name}</span>
                              </div>
                            ) : (
                              <span style={{ color: '#52525b', fontStyle: 'italic' }}>Sistema / Automático</span>
                            )}
                          </td>
                          <td style={{ padding: '16px', color: '#a1a1aa' }}>
                            {new Date(r.updatedAt || r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '16px', color: '#71717a', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.adminNote}>
                            {r.adminNote || '-'}
                          </td>
                        </tr>
                      ))}
                    {requests.filter(r => r.status !== 'PENDENTE').length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#52525b' }}>Nenhum registro de auditoria encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <ModalObservacao isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirmApprove} titulo={modalAction === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Reprovação'} tipo={modalAction} />
    </div>
  );
}