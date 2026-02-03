import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Server, FileText, LogOut, Bird,
  ArrowLeft, Shield, CheckCircle, Clock, Crown,
  Search, Bell, Lock, Layers, ChevronDown, ChevronRight
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

// IMPORTAÇÃO DO NOVO COMPONENTE
import { ModalObservacao } from './components/ModalObservacao';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- TYPES ---
interface User { id: string; name: string; email: string; }
interface Tool { id: string; name: string; owner?: User; subOwner?: User; accesses?: { user: User; status: string }[]; }
interface Request { id: string; details: string; status: string; createdAt: string; requester: User; type: string; }
type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER';

const SESSION_DURATION = 3 * 60 * 60 * 1000; // 3 Horas

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
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // --- NOVOS ESTADOS PARA O MODAL ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'aprovar' | 'reprovar'>('aprovar'); // Usado pelo Modal (visual)
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);
  // ----------------------------------

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
    if (isLoggedIn) { loadData(); const interval = setInterval(loadData, 10000); return () => clearInterval(interval); }
  }, [isLoggedIn]);

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

  // --- LÓGICA NOVA: ABRIR MODAL ---
  const handleOpenApprove = (id: string, action: 'APROVAR' | 'REPROVAR') => {
    setModalTargetId(id);
    // Converte o status da API (UPPERCASE) para o tipo do Modal (lowercase)
    setModalAction(action === 'APROVAR' ? 'aprovar' : 'reprovar');
    setModalOpen(true);
  };

  // --- LÓGICA NOVA: CONFIRMAR NO MODAL ---
  const handleConfirmApprove = async (note: string) => {
    if (!modalTargetId) return;

    // Validação: Reprovação exige motivo
    if (modalAction === 'reprovar' && !note.trim()) {
      alert("⚠️ Para recusar, é obrigatório informar o motivo.");
      return; // Não fecha o modal
    }

    // Converte de volta para o padrão da API
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

      // Sucesso
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
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
          Enviamos um código para <strong>{currentUser?.email}</strong>.
        </p>
        <input
          className="mfa-input-single"
          type="text"
          value={mfaCode}
          onChange={(e) => handleMfaChange(e.target.value)}
          placeholder="000000"
          autoFocus
        />
        <button onClick={handleMfaVerify} className="btn-verify" disabled={isLoading}>
          {isLoading ? 'Verificando...' : 'Confirmar Acesso'}
        </button>
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
      {/* SIDEBAR FIXED */}
      <aside className="sidebar">
        <div className="brand-box"><Bird size={24} color="#7c3aed" /> THERIS OS</div>
        <div className="nav-section">
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null) }}><LayoutDashboard size={18} /> Visão Geral</div>
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
          <div className="page-title">Pagina: <span>{activeTab === 'TOOLS' && selectedTool ? selectedTool.name : activeTab}</span></div>
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
                          {/* ATENÇÃO: AQUI MUDOU A CHAMADA DA FUNÇÃO */}
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

          {activeTab === 'HISTORY' && <div className="card-base"><h3 style={{ margin: 0, color: 'white' }}>Logs de Auditoria</h3><p style={{ color: '#71717a' }}>Em construção.</p></div>}
        </div>
      </main>

      {/* COMPONENTE DO MODAL (FORA DO MAIN) */}
      <ModalObservacao
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmApprove}
        titulo={modalAction === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Reprovação'}
        tipo={modalAction}
      />

    </div>
  );
}