import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Server, FileText, LogOut, Bird,
  ArrowLeft, Shield, CheckCircle, XCircle, Clock, Crown,
  Search, Bell, Lock, Layers, ChevronDown, ChevronRight,
  Users, Building, Briefcase // Ícone para Gestão de Pessoas
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import './App.css';

import { ModalObservacao } from './components/ModalObservacao';
import { EditToolModal } from './components/EditToolModal';
import { CreateToolModal } from './components/CreateToolModal';
import { EditUserModal } from './components/EditUserModal';
import { EditAccessModal } from './components/EditAccessModal';
import { ManageStructureModal } from './components/ManageStructureModal';
import { ManageLevelModal } from './components/ManageLevelModal';
import { Pen, PlusCircle, Edit2, Timer, Zap, ShieldCheck, RefreshCw, Activity, Trash2, Settings, Plus } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// --- TYPES ---
interface User {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  department?: string;
  systemProfile: string; // Adicionado para RBAC
  manager?: { name: string };
  myDeputy?: User;
}

interface Tool {
  id: string;
  name: string;
  description?: string;
  acronym?: string;
  owner?: User;
  subOwner?: User;
  toolGroupId?: string;
  toolGroup?: { id: string; name: string };
  availableAccessLevels?: string[];
  accesses?: {
    id: string; // ID do registro de acesso
    user: User;
    status: string; // Nível
    isExtraordinary: boolean;
    duration?: number;
    unit?: string;
  }[];
}

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

type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER' | 'GESTOR';

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

  // DADOS
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Lista de colaboradores
  const [departments, setDepartments] = useState<any[]>([]); // Lista mestra de departamentos

  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'aprovar' | 'reprovar'>('aprovar');
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);

  // EDIT MODAL
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedAccess, setSelectedAccess] = useState<any>(null);
  const [isEditAccessModalOpen, setIsEditAccessModalOpen] = useState(false);
  const [isManageStructureOpen, setIsManageStructureOpen] = useState(false);
  const [isManageLevelModalOpen, setIsManageLevelModalOpen] = useState(false);
  const [selectedLevelName, setSelectedLevelName] = useState<string | null>(null);

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
        // Mantém ferramenta selecionada atualizada
        if (selectedTool) {
          const updatedSelected = toolsData.find((t: Tool) => t.id === selectedTool.id);
          if (updatedSelected) setSelectedTool(updatedSelected);
        } else {
          // Recupera seleção do localStorage se existir
          const savedId = localStorage.getItem('theris_selectedToolId');
          if (savedId && activeTab === 'TOOLS') {
            const found = toolsData.find((t: Tool) => t.id === savedId);
            if (found) setSelectedTool(found);
          }
        }
      }
      if (resReqs.ok) setRequests(await resReqs.json());

      // Carrega usuários se estiver na aba de gestão
      if (activeTab === 'PEOPLE') {
        const [resUsers, resDepts] = await Promise.all([
          fetch(`${API_URL}/api/users`),
          fetch(`${API_URL}/api/structure`)
        ]);
        if (resUsers.ok) setAllUsers(await resUsers.json());
        if (resDepts.ok) {
          const structData = await resDepts.json();
          setDepartments(structData.departments || []);
        }
      }

    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, activeTab]);

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

  const handleDeleteTool = async (id: string) => {
    if (!window.confirm('🚨 TEM CERTEZA? Isso excluirá permanentemente esta ferramenta e todos os seus históricos de acesso!')) return;
    try {
      const res = await fetch(`${API_URL}/api/tools/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTool(null);
        loadData();
      } else {
        alert("Erro ao excluir ferramenta.");
      }
    } catch (e) {
      alert("Erro de rede.");
    }
  };

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
    if (!tool.accesses) return { permanent: {}, extraordinary: [] };

    // Initialize with all available levels
    const initialPermanent = (tool.availableAccessLevels || []).reduce((acc, lvl) => {
      acc[lvl] = [];
      return acc;
    }, {} as Record<string, any[]>);

    return tool.accesses.reduce((acc, curr) => {
      if (curr.isExtraordinary) {
        acc.extraordinary.push(curr);
      } else {
        const level = curr.status;
        if (!acc.permanent[level]) acc.permanent[level] = [];
        acc.permanent[level].push(curr);
      }
      return acc;
    }, { permanent: initialPermanent, extraordinary: [] as any[] });
  };

  const getGroupedPeople = () => {
    const grouped: Record<string, Record<string, User[]>> = {};

    // Inicializa com todos os departamentos conhecidos
    departments.forEach(d => {
      grouped[d.name] = {};
    });

    allUsers.forEach(u => {
      const dept = u.department || 'Geral';
      const role = u.jobTitle || 'Sem Cargo';
      if (!grouped[dept]) grouped[dept] = {};
      if (!grouped[dept][role]) grouped[dept][role] = [];
      grouped[dept][role].push(u);
    });
    return grouped;
  };

  // --- RENDER ---

  if (!isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-marketing">
        <div className="marketing-content fade-in">
          <div className="marketing-badge">
            <Zap size={14} fill="#a78bfa" /> Disponível para todo o ecossistema
          </div>
          <h1 style={{ color: 'white' }}>
            Domine a <span style={{ color: '#7c3aed' }}>Governança</span> de Acessos da sua empresa.
          </h1>
          <p>
            O Theris OS centraliza identidades, automatiza solicitações e garante compliance em tempo real para times de alta performance.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon"><ShieldCheck size={24} /></div>
              <div className="feature-text">
                <div>Segurança Nível Enterprise</div>
                <div>SSO nativo e MFA obrigatório em todas as camadas.</div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Clock size={24} /></div>
              <div className="feature-text">
                <div>Acessos Extraordinários</div>
                <div>Gestão granular de permissões temporárias com expiração.</div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><RefreshCw size={24} /></div>
              <div className="feature-text">
                <div>Sincronização Ativa</div>
                <div>Integração contínua com Convenia e sistemas legados.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card fade-in">
          {!isMfaRequired ? (
            <>
              <div style={{ background: 'rgba(124, 58, 237, 0.1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                <Bird size={36} color="#a78bfa" />
              </div>
              <h2>Boas-vindas ao Theris</h2>
              <p className="subtitle">Acesse sua conta corporativa para continuar.</p>

              {isLoading ? (
                <div style={{ marginTop: 20, color: '#8b5cf6', fontSize: '14px', fontWeight: 500 }}>
                  <div className="spinner" style={{ border: '3px solid rgba(139, 92, 246, 0.1)', borderTop: '3px solid #8b5cf6', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
                  Configurando ambiente...
                </div>
              ) : (
                <button onClick={() => handleLogin()} className="btn-google">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" alt="Google" />
                  Entrar com Google Workspace
                </button>
              )}
            </>
          ) : (
            <div className="mfa-container">
              <div className="mfa-icon-wrapper" style={{ margin: '0 auto 20px' }}><Lock size={32} color="#8b5cf6" /></div>
              <h2 style={{ color: 'white', margin: 0, fontSize: 20 }}>Código de Segurança</h2>
              <p className="subtitle" style={{ marginBottom: 24 }}>Enviamos um código para <strong>{currentUser?.email}</strong>.</p>
              <input
                className="mfa-input-single"
                type="text"
                value={mfaCode}
                onChange={(e) => handleMfaChange(e.target.value)}
                placeholder="000000"
                autoFocus
              />
              <button onClick={handleMfaVerify} className="btn-verify" disabled={isLoading}>
                {isLoading ? 'Verificando...' : 'Confirmador Acesso'}
              </button>
              <button
                onClick={() => { setIsMfaRequired(false); setCurrentUser(null); setMfaCode(''); }}
                style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', marginTop: 20, fontSize: 13 }}
              >
                Voltar ao login
              </button>
            </div>
          )}

          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 20, justifyContent: 'center' }}>
            <div style={{ color: '#52525b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={12} /> Compliance 100%
            </div>
            <div style={{ color: '#52525b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={12} /> Status: Online
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-box"><Bird size={24} color="#7c3aed" /> THERIS OS</div>
        <div className="nav-section">
          {['SUPER_ADMIN', 'GESTOR', 'ADMIN'].includes(systemProfile) ? (
            <>
              <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null) }}><LayoutDashboard size={18} /> Visão Geral</div>
              <div className={`nav-item ${activeTab === 'PEOPLE' ? 'active' : ''}`} onClick={() => setActiveTab('PEOPLE')}><Users size={18} /> Gestão de Pessoas</div>
              <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { setActiveTab('TOOLS'); setSelectedTool(null) }}><Layers size={18} /> Catálogo</div>
              <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Solicitações</div>
            </>
          ) : systemProfile === 'APPROVER' ? (
            <>
              <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null) }}><LayoutDashboard size={18} /> Visão Geral</div>
              <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Solicitações</div>
            </>
          ) : (
            <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null) }}><LayoutDashboard size={18} /> Meu Painel</div>
          )}
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

              {(systemProfile === 'SUPER_ADMIN' || systemProfile === 'GESTOR' || systemProfile === 'ADMIN' || systemProfile === 'APPROVER') && (
                <>
                  <div className="card-base cell-stat">
                    <div className="card-header"><span className="card-title">Pendentes</span><Clock size={16} color="#fbbf24" /></div>
                    <div className="metric-value">{stats.pending}</div>
                  </div>

                  <div className="card-base cell-stat">
                    <div className="card-header"><span className="card-title">Aprovados</span><CheckCircle size={16} color="#10b981" /></div>
                    <div className="metric-value">{stats.approved}</div>
                  </div>
                </>
              )}

              {(systemProfile === 'SUPER_ADMIN' || systemProfile === 'GESTOR' || systemProfile === 'ADMIN' || systemProfile === 'APPROVER') && (
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
              )}

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

          {/* GESTÃO DE PESSOAS MODERNA (AGRUPADA POR DEPARTAMENTO) */}
          {activeTab === 'PEOPLE' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <h2 style={{ color: 'white', fontSize: 20, margin: 0 }}>Gestão de Pessoas</h2>
                  {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
                    <button
                      onClick={() => setIsManageStructureOpen(true)}
                      className="btn-mini"
                      style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.2)' }}
                    >
                      <Settings size={14} /> Gerenciar Estrutura
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#71717a' }}>{allUsers.length} Colaboradores Ativos</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(getGroupedPeople())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dept, roles]) => (
                    <div key={dept} className="card-base" style={{ padding: 0, overflow: 'hidden', border: '1px solid #27272a' }}>
                      {/* HEADER DEPARTAMENTO */}
                      <div
                        onClick={() => setExpandedDept(expandedDept === dept ? null : dept)}
                        style={{
                          padding: '16px 24px',
                          background: '#18181b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Building size={20} color="#a78bfa" />
                          <span style={{ fontWeight: 700, color: 'white', fontSize: 16 }}>{dept}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 11, color: '#a1a1aa', background: '#27272a', padding: '2px 8px', borderRadius: 4 }}>
                            {Object.values(roles).flat().length} Pessoas
                          </span>
                          {expandedDept === dept ? <ChevronDown size={18} color="#a1a1aa" /> : <ChevronRight size={18} color="#52525b" />}
                        </div>
                      </div>

                      {/* LISTA DE CARGOS NO DEPARTAMENTO */}
                      {expandedDept === dept && (
                        <div style={{ background: '#09090b', padding: '8px 24px 24px 24px' }}>
                          {Object.entries(roles)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([role, users]) => (
                              <div key={role} style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderLeft: '2px solid #3f3f46', paddingLeft: 12 }}>
                                  <Briefcase size={14} color="#71717a" />
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 }}>{role}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                  {users.map(u => (
                                    <div key={u.id} style={{ background: '#18181b', padding: 12, borderRadius: 8, border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2e1065', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                        {u.name.charAt(0)}
                                      </div>
                                      <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ color: 'white', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                                        <div style={{ color: '#52525b', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                                      </div>
                                      {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
                                        <button
                                          className="btn-icon"
                                          style={{ padding: '6px' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedUser(u);
                                            setIsEditUserModalOpen(true);
                                          }}
                                        >
                                          <Edit2 size={14} color="#a1a1aa" />
                                        </button>
                                      )}
                                      {u.manager && (
                                        <div title={`Gestor: ${u.manager.name}`} style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa' }}></div>
                                      )}
                                    </div>
                                  ))}
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

          {/* CATÁLOGO DE TOOLS (LISTA) */}
          {activeTab === 'TOOLS' && !selectedTool && (
            <div className="fade-in">
              <h2 style={{ color: 'white', fontSize: 20, marginBottom: 20 }}>Sistemas Conectados</h2>
              <div className="tools-wrapper">
                {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
                  <div className="tool-tile add-new" onClick={() => setIsCreateModalOpen(true)} style={{ border: '2px dashed #3f3f46', background: 'transparent' }}>
                    <div className="tile-icon" style={{ background: 'transparent' }}><PlusCircle size={24} color="#a78bfa" /></div>
                    <div className="tile-info">
                      <h3 style={{ color: '#a78bfa' }}>Adicionar Ferramenta</h3>
                      <p>Cadastrar novo sistema</p>
                    </div>
                  </div>
                )}
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

          {/* TOOL DETAILS (VISUAL ATUALIZADO COM OWNER E NÍVEIS) */}
          {activeTab === 'TOOLS' && selectedTool && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <button onClick={() => { setSelectedTool(null); setExpandedLevel(null) }} className="btn-text">
                  <ArrowLeft size={16} /> Voltar para o Catálogo
                </button>
                {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setIsEditModalOpen(true)} className="btn-mini" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Pen size={14} /> Editar Sistema
                    </button>
                    <button onClick={() => handleDeleteTool(selectedTool.id)} className="btn-mini" style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                )}
              </div>

              {/* CABEÇALHO DA FERRAMENTA + OWNERS (4 BLOCKS) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>

                {/* BLOCK 1: OWNER */}
                <div className="card-base" style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Owner (Dono)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2e1065', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
                      {selectedTool.owner?.name.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>{selectedTool.owner?.name || 'Não definido'}</div>
                      <div style={{ fontSize: 12, color: '#52525b' }}>{selectedTool.owner?.email}</div>
                    </div>
                  </div>
                </div>

                {/* BLOCK 2: SUB-OWNER */}
                <div className="card-base" style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)' }}>
                  <div style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Sub-Owner</div>
                  {selectedTool.subOwner ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1c1917', border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', fontWeight: 700, fontSize: 14 }}>
                        {selectedTool.subOwner.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ color: '#e4e4e7', fontWeight: 600, fontSize: 16 }}>{selectedTool.subOwner.name}</div>
                        <div style={{ fontSize: 12, color: '#52525b' }}>{selectedTool.subOwner.email}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#3f3f46', fontSize: 14, fontStyle: 'italic', marginTop: 10 }}>Pendente de definição</div>
                  )}
                </div>

                {/* BLOCK 3: DEPUTY (Só mostra se aprovado) */}
                <div className="card-base" style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)' }}>
                  <div style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Deputy (Substituto)</div>
                  {selectedTool.owner?.myDeputy ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontWeight: 700, fontSize: 14 }}>
                        {selectedTool.owner.myDeputy.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ color: '#34d399', fontWeight: 600, fontSize: 16 }}>{selectedTool.owner.myDeputy.name}</div>
                        <div style={{ fontSize: 12, color: '#52525b' }}>{selectedTool.owner.myDeputy.email}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#3f3f46', fontSize: 14, fontStyle: 'italic', marginTop: 10 }}>Nenhum indicado</div>
                  )}
                </div>

                {/* BLOCK 4: DESCRIÇÃO */}
                <div className="card-base" style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)', borderLeft: '3px solid #a78bfa' }}>
                  <div style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Descrição</div>
                  <div style={{ color: '#a1a1aa', fontSize: 14, lineHeight: '1.5', maxHeight: '60px', overflowY: 'auto' }}>
                    {selectedTool.description || "Gestão e automação de acessos via Theris OS."}
                  </div>
                </div>
              </div>

              {/* LISTA DE USUÁRIOS AGRUPADOS POR NÍVEL (PERMANENTE) */}
              <h3 style={{ color: '#d4d4d8', marginBottom: 15, fontSize: 18 }}>Membros Permanentes</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.keys(getGroupedAccesses(selectedTool).permanent).length === 0 && (
                  <div className="card-base" style={{ textAlign: 'center', color: '#52525b', padding: 40, borderStyle: 'dashed' }}>
                    Nenhum membro permanente vinculado.
                  </div>
                )}

                {Object.entries(getGroupedAccesses(selectedTool).permanent)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([level, accessRecords]) => (
                    <div key={level} className="card-base" style={{ padding: 0, overflow: 'hidden', border: '1px solid #27272a', transition: 'all 0.2s' }}>

                      <div
                        onClick={() => {
                          setSelectedLevelName(level);
                          setIsManageLevelModalOpen(true);
                        }}
                        style={{
                          padding: '16px 24px',
                          background: '#18181b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          borderBottom: expandedLevel === level ? '1px solid #27272a' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {level.toLowerCase().match(/admin|owner|proprietário|full/)
                            ? <Crown size={20} color="#fbbf24" fill="rgba(251, 191, 36, 0.2)" />
                            : <Shield size={20} color="#a1a1aa" />}
                          <span style={{ fontWeight: 600, color: '#f4f4f5', fontSize: 15 }}>{level}</span>
                          <span style={{ fontSize: 10, color: '#71717a', marginLeft: 8 }}>
                            {(selectedTool.accessLevelDescriptions as any)?.[level] &&
                              ` - ${(selectedTool.accessLevelDescriptions as any)[level].substring(0, 30)}${((selectedTool.accessLevelDescriptions as any)[level].length > 30 ? '...' : '')}`
                            }
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                          <span style={{ fontSize: 11, color: '#a1a1aa', background: '#27272a', padding: '4px 8px', borderRadius: 6, fontWeight: 500 }}>
                            {accessRecords.length} Colaboradores
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLevelName(level);
                              setIsManageLevelModalOpen(true);
                            }}
                            className="btn-mini"
                            style={{ padding: '4px 8px', fontSize: 11, background: '#27272a', border: '1px solid #3f3f46', height: 'auto', display: 'flex', gap: 4 }}
                          >
                            <Plus size={12} /> Add
                          </button>
                          <Edit2 size={16} color="#52525b" />
                        </div>
                      </div>

                      {expandedLevel === level && (
                        <div style={{ background: '#09090b' }}>
                          {accessRecords.map((acc, idx) => (
                            <div key={acc.user.id} style={{
                              padding: '14px 24px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16,
                              borderBottom: idx === accessRecords.length - 1 ? 'none' : '1px solid #1f1f22'
                            }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#27272a', color: '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, border: '1px solid #3f3f46' }}>
                                {acc.user.name.charAt(0)}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: '#e4e4e7', fontSize: 14, fontWeight: 500 }}>{acc.user.name}</div>
                                <div style={{ color: '#71717a', fontSize: 12 }}>{acc.user.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* LISTA DE ACESSOS EXTRAORDINÁRIOS (NOVO) */}
              <h3 style={{ color: '#c084fc', marginTop: 40, marginBottom: 15, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Timer size={20} /> Acessos Extraordinários (Temporários)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {getGroupedAccesses(selectedTool).extraordinary.length === 0 ? (
                  <div className="card-base" style={{ textAlign: 'center', color: '#52525b', padding: 40, borderStyle: 'dashed', borderColor: 'rgba(167, 139, 250, 0.2)' }}>
                    Nenhum acesso extraordinário vigente.
                  </div>
                ) : (
                  getGroupedAccesses(selectedTool).extraordinary.map((acc) => (
                    <div key={acc.user.id} className="card-base" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 24px',
                      background: 'rgba(167, 139, 250, 0.05)',
                      border: '1px solid rgba(167, 139, 250, 0.1)'
                    }}>
                      <div style={{ width: 42, height: 42, borderRadius: '12px', background: '#2e1065', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                        {acc.user.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'white', fontWeight: 600 }}>{acc.user.name}</span>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>
                            {acc.status}
                          </span>
                        </div>
                        <div style={{ color: '#a1a1aa', fontSize: 12 }}>{acc.user.email}</div>
                      </div>

                      {/* DURAÇÃO */}
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Duração Pedida</div>
                          <div style={{ color: '#f4f4f5', fontWeight: 600 }}>{acc.duration} {acc.unit}</div>
                        </div>

                        {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
                          <button
                            className="btn-mini"
                            style={{ padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center', background: '#27272a' }}
                            onClick={() => {
                              setSelectedAccess(acc);
                              setIsEditAccessModalOpen(true);
                            }}
                          >
                            <Pen size={12} /> Editar
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
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
                      <th style={{ padding: '16px', fontWeight: 600 }}>ID</th>
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
                          <td style={{ padding: '16px', fontSize: 11, color: '#71717a', fontFamily: 'monospace' }} title={r.id}>
                            #{r.id.split('-')[0].toUpperCase()}
                          </td>
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

      {selectedTool && (
        <EditToolModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          tool={selectedTool}
          onUpdate={loadData}
        />
      )}

      {selectedUser && (
        <EditUserModal
          isOpen={isEditUserModalOpen}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUpdate={loadData}
          currentUser={{ id: currentUser?.id || '', systemProfile }}
        />
      )}

      <CreateToolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadData}
      />

      <EditAccessModal
        isOpen={isEditAccessModalOpen}
        onClose={() => {
          setIsEditAccessModalOpen(false);
          setSelectedAccess(null);
        }}
        access={selectedAccess}
        toolId={selectedTool?.id || ''}
        onUpdate={loadData}
      />

      <ManageStructureModal
        isOpen={isManageStructureOpen}
        onClose={() => setIsManageStructureOpen(false)}
        onUpdate={loadData}
      />

      {selectedTool && selectedLevelName && (
        <ManageLevelModal
          isOpen={isManageLevelModalOpen}
          onClose={() => {
            setIsManageLevelModalOpen(false);
            setSelectedLevelName(null);
          }}
          tool={selectedTool}
          levelName={selectedLevelName}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}