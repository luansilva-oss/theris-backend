import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, FileText, Clock, 
  CheckCircle, XCircle, ShieldCheck, Server, ChevronRight, 
  ChevronDown, LogOut, Lock, User, MapPin, Award,
  Bird, // Ícone do Pássaro (Marca)
  Activity, TrendingUp, AlertCircle, Calendar, Zap
} from 'lucide-react';
// Importação simplificada para evitar erros de tipagem
import { GoogleLogin } from '@react-oauth/google';
import './App.css';

// --- CONFIGURAÇÕES DO SISTEMA ---
const LEADER_KEYWORDS = ['Líder', 'Head', 'Tech Lead', 'Coordenador', 'Gerente', 'Gestor'];

const DEPT_ORDER = [
  'Board', 'Lideranças & Gestão', 'Tecnologia e Segurança', 'Produto', 
  'Produto 3C+', 'Produto Evolux', 'Produto FiqOn', 'Produto Dizify',
  'Comercial', 'Comercial Contact', 'Marketing', 'Atendimento ao Cliente', 
  'Pessoas e Cultura', 'Administrativo'
];

// --- INTERFACES DE DADOS ---
interface Manager { id: string; name: string; }
interface User { id: string; name: string; role: { name: string }; departmentId: string; manager?: Manager; }
interface Role { id: string; name: string; users: User[]; }
interface Department { id: string; name: string; roles: Role[]; }
interface Tool { id: string; name: string; owner: { name: string; id: string }; accessLevels: { create: { name: string }[] } | null; }
interface Request { id: string; requesterId: string; requester: { name: string }; lastApprover?: { name: string }; type: string; status: string; currentApproverRole: string; details: string; justification: string; createdAt: string; }

// Perfis de Acesso (RBAC)
type SystemProfile = 'ADMIN' | 'APPROVER' | 'VIEWER';

export default function App() {
  // --- ESTADOS GLOBAIS ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>('VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  
  // --- DADOS DO BACKEND ---
  const [structure, setStructure] = useState<Department[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // --- FORMULÁRIOS ---
  const [formType, setFormType] = useState('CHANGE_ROLE');
  const [formDetails, setFormDetails] = useState('');
  const [formJustification, setFormJustification] = useState('');

  // Data atual para o Header
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  // --- CARREGAMENTO DE DADOS (Load) ---
  const loadData = async () => {
    try {
      const [resStruct, resTools, resUsers, resReqs] = await Promise.all([
        fetch('http://localhost:3000/api/structure'),
        fetch('http://localhost:3000/api/tools'),
        fetch('http://localhost:3000/api/users'),
        fetch('http://localhost:3000/api/solicitacoes')
      ]);

      const rawStruct: Department[] = await resStruct.json();
      const dUsers = await resUsers.json();
      const dTools = await resTools.json();
      const dReqs = await resReqs.json();

      // Lógica de Organograma: Separar Líderes vs Operacional
      const finalStructure: Department[] = [];
      const leadershipRoles: Role[] = [];
      const boardDept = rawStruct.find(d => d.name === 'Board');
      if (boardDept) finalStructure.push(boardDept);

      rawStruct.filter(d => d.name !== 'Board').forEach(dept => {
        const leaders = dept.roles.filter(r => LEADER_KEYWORDS.some(k => r.name.includes(k)));
        const staff = dept.roles.filter(r => !LEADER_KEYWORDS.some(k => r.name.includes(k)));
        
        // Adiciona líderes na aba virtual "Lideranças"
        if (leaders.length > 0) leaders.forEach(l => leadershipRoles.push({ ...l, name: `${l.name} (${dept.name})` }));
        // Mantém depto original se tiver staff
        if (staff.length > 0) finalStructure.push({ ...dept, roles: staff });
      });

      if (leadershipRoles.length > 0) finalStructure.push({ id: 'liderancas-virtual-id', name: 'Lideranças & Gestão', roles: leadershipRoles });

      // Ordenação Enterprise
      finalStructure.sort((a, b) => {
        let idxA = DEPT_ORDER.indexOf(a.name);
        let idxB = DEPT_ORDER.indexOf(b.name);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });

      setStructure(finalStructure);
      setTools(dTools);
      setAllUsers(dUsers);
      setRequests(dReqs);
    } catch (e) { console.error("Erro crítico ao carregar dados:", e); }
  };

  useEffect(() => { loadData(); }, []);

  // --- AUTENTICAÇÃO SSO GOOGLE ---
  const responseGoogle = async (credentialResponse: any) => {
    try {
      const res = await fetch('http://localhost:3000/api/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialResponse.credential,
          clientId: credentialResponse.clientId
        })
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentUser(data.user);
        setSystemProfile(data.profile);
        setIsLoggedIn(true);
        setActiveTab(data.profile === 'VIEWER' ? 'PROFILE' : 'DASHBOARD');
      } else {
        alert(`❌ Acesso Negado: ${data.error}`);
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Falha de conexão com o servidor.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSystemProfile('VIEWER');
  };

  // --- AÇÕES DE NEGÓCIO ---
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await fetch('http://localhost:3000/api/solicitacoes', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ requesterId: currentUser.id, type: formType, details: { info: formDetails }, justification: formJustification })
    });
    alert("Solicitação enviada com sucesso!"); setFormDetails(''); setFormJustification(''); loadData(); 
  };

  const handleApprove = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    if (!currentUser) return;
    const res = await fetch(`http://localhost:3000/api/solicitacoes/${id}`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ status: action === 'APROVAR' ? 'APROVADO' : 'REPROVADO', approverId: currentUser.id })
    });
    if (res.ok) loadData(); else alert("Erro: Permissão negada ou violação de Compliance.");
  };

  // --- SUB-COMPONENTES DE UI ---

  const StatCard = ({ title, value, icon, color, subtext }: any) => (
    <div className="glass-card" style={{position: 'relative', overflow: 'hidden'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
        <div>
          <div style={{color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>{title}</div>
          <div style={{fontSize: '2rem', fontWeight: 700, color: 'white', marginTop: '5px'}}>{value}</div>
          {subtext && <div style={{fontSize: '0.75rem', color: color, marginTop: '5px', display:'flex', alignItems:'center', gap:'4px'}}><TrendingUp size={12}/> {subtext}</div>}
        </div>
        <div style={{background: `${color}20`, padding: '10px', borderRadius: '12px', color: color}}>
          {icon}
        </div>
      </div>
      {/* Decoração de fundo */}
      <div style={{position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1, transform: 'scale(2.5)', color: color}}>
        {icon}
      </div>
    </div>
  );

  const ActivityFeed = () => (
    <div className="glass-card" style={{height: '100%'}}>
      <h3 style={{marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px'}}>
        <Activity size={20} color="#0ea5e9"/> Atividade Recente
      </h3>
      <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
        {requests.slice(0, 5).map(r => (
          <div key={r.id} style={{display:'flex', gap:'12px', alignItems:'center', borderBottom:'1px solid #33415530', paddingBottom:'12px'}}>
            <div style={{minWidth:'32px', height:'32px', borderRadius:'50%', background: r.status === 'APROVADO' ? '#10b98120' : '#f59e0b20', display:'flex', alignItems:'center', justifyContent:'center'}}>
              {r.status === 'APROVADO' ? <CheckCircle size={16} color="#10b981"/> : <Clock size={16} color="#f59e0b"/>}
            </div>
            <div>
              <div style={{fontSize:'0.9rem', color:'white', fontWeight:500}}>
                <span style={{color:'#cbd5e1'}}>{r.requester.name}</span> solicitou <span style={{color:'#0ea5e9'}}>{JSON.parse(r.details).info}</span>
              </div>
              <div style={{fontSize:'0.75rem', color:'#64748b', marginTop:'2px'}}>
                {new Date(r.createdAt).toLocaleDateString()} • {r.status.replace('_',' ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- RENDERIZAÇÃO PRINCIPAL ---

  // TELA 1: LOGIN (LAYOUT SPLIT SCREEN PREMIUM)
  if (!isLoggedIn) {
    return (
      <div className="login-wrapper">
        
        {/* LADO ESQUERDO: BRANDING & MARKETING */}
        <div className="login-brand-section">
          <div className="brand-content">
            <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'30px'}}>
               <div style={{background:'white', padding:'10px', borderRadius:'12px', display:'flex'}}>
                 <Bird size={32} color="#0ea5e9" strokeWidth={2}/>
               </div>
               <span style={{fontSize:'2rem', fontWeight: 700, letterSpacing:'-1px', color:'white'}}>THERIS</span>
            </div>
            
            <h1 style={{fontSize:'3.5rem', lineHeight:'1.1', marginBottom:'20px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
              Governança de <br/>Identidade Inteligente.
            </h1>
            
            <p style={{fontSize:'1.1rem', color:'#cbd5e1', maxWidth:'500px', lineHeight:'1.6'}}>
              Centralize acessos, automatize auditorias e garanta compliance em toda a organização com a plataforma líder do Grupo 3C.
            </p>

            <div style={{marginTop:'40px', display:'flex', gap:'30px'}}>
               <div>
                 <h3 style={{color:'white', fontSize:'1.5rem', fontWeight:700}}>+100</h3>
                 <span style={{color:'#64748b'}}>Colaboradores</span>
               </div>
               <div>
                 <h3 style={{color:'white', fontSize:'1.5rem', fontWeight:700}}>100%</h3>
                 <span style={{color:'#64748b'}}>Auditável</span>
               </div>
               <div>
                 <h3 style={{color:'white', fontSize:'1.5rem', fontWeight:700}}>24/7</h3>
                 <span style={{color:'#64748b'}}>Monitoramento</span>
               </div>
            </div>
          </div>
          
          {/* Elemento Decorativo (Pássaro Gigante) */}
          <Bird className="giant-bg-icon" size={600} strokeWidth={0.5} color="white"/>
        </div>

        {/* LADO DIREITO: LOGIN FORM */}
        <div className="login-form-section">
          <div className="login-box">
             <div style={{textAlign:'center', marginBottom:'40px'}}>
               <h2 style={{fontSize:'2rem', color:'white', marginBottom:'10px'}}>Acesse sua conta</h2>
               <p style={{color:'#64748b'}}>Utilize suas credenciais corporativas</p>
             </div>

             <div className="google-btn-wrapper">
               <GoogleLogin
                  onSuccess={responseGoogle}
                  onError={() => alert('Falha no Login')}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="100%"
               />
             </div>

             <div style={{marginTop:'30px', textAlign:'center', fontSize:'0.8rem', color:'#475569'}}>
               <Lock size={12} style={{verticalAlign:'middle', marginRight:'5px'}}/>
               Ambiente Seguro & Criptografado
               <br/>
               © 2025 Grupo 3C - Tecnologia
             </div>
          </div>
        </div>
      </div>
    );
  }

  // TELA 2: SISTEMA INTERNO (DASHBOARD)
  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand" style={{display:'flex', flexDirection:'column', alignItems:'start', gap:'0px', paddingBottom:'20px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <Bird size={28} color="#0ea5e9" /> 
            <span style={{fontSize:'1.4rem', fontWeight: 700, letterSpacing:'1px'}}>THERIS</span>
          </div>
        </div>

        <div className="user-mini-profile">
          <div className="avatar">{currentUser?.name.charAt(0)}</div>
          <div className="info">
            <div className="name">{currentUser?.name.split(' ')[0]}</div>
            <div className="role">{systemProfile}</div>
          </div>
        </div>

        <nav className="nav-menu">
          {systemProfile !== 'VIEWER' && (
            <>
              <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}><LayoutDashboard size={18} /> Visão Geral</div>
              <div className={`nav-item ${activeTab === 'REQUESTS' ? 'active' : ''}`} onClick={() => setActiveTab('REQUESTS')}><Clock size={18} /> Solicitações</div>
            </>
          )}
          {systemProfile === 'ADMIN' && (
            <>
              <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Auditoria</div>
              <div className={`nav-item ${activeTab === 'ORG' ? 'active' : ''}`} onClick={() => setActiveTab('ORG')}><Users size={18} /> Organograma</div>
              <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => setActiveTab('TOOLS')}><Server size={18} /> Ferramentas</div>
            </>
          )}
          {systemProfile === 'VIEWER' && (
             <div className={`nav-item ${activeTab === 'PROFILE' ? 'active' : ''}`} onClick={() => setActiveTab('PROFILE')}><User size={18} /> Meu Perfil</div>
          )}
        </nav>
        <button onClick={handleLogout} className="logout-btn"><LogOut size={16}/> Sair</button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="main-area">
        {/* HEADER */}
        <header className="header-bar">
           <div>
             <h2 style={{color:'white', fontSize:'1.2rem'}}>
               {activeTab === 'DASHBOARD' ? 'Visão Geral' : 
                activeTab === 'ORG' ? 'Estrutura Organizacional' :
                activeTab === 'REQUESTS' ? 'Central de Solicitações' : 'Painel'}
             </h2>
             <div style={{color:'#94a3b8', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'5px'}}>
               <Calendar size={12}/> {today}
             </div>
           </div>
           <div className="status-badge">
             <div className="dot"></div> Sistema Operante
           </div>
        </header>

        <div className="content-scroll">
          
          {/* --- CONTEÚDO: DASHBOARD --- */}
          {activeTab === 'DASHBOARD' && systemProfile !== 'VIEWER' && (
            <div className="dashboard-grid">
               {/* 1. HERO BANNER */}
               <div className="hero-banner">
                 <div>
                   <h1>Olá, {currentUser?.name.split(' ')[0]}! 👋</h1>
                   <p>Você tem <strong style={{color:'#f59e0b'}}>{requests.filter(r=>r.status.includes('PENDENTE')).length} solicitações</strong> aguardando sua análise hoje.</p>
                 </div>
                 <div className="hero-actions">
                   <button className="secondary-btn" onClick={() => document.getElementById('req-form')?.scrollIntoView({behavior:'smooth'})}>Nova Solicitação</button>
                 </div>
               </div>

               {/* 2. CARDS DE MÉTRICAS */}
               <div className="stats-container">
                 <StatCard 
                    title="Total de Colaboradores" 
                    value={allUsers.length} 
                    icon={<Users size={24}/>} 
                    color="#6366f1" 
                    subtext="+12% este mês"
                 />
                 <StatCard 
                    title="Solicitações Pendentes" 
                    value={requests.filter(r=>r.status.includes('PENDENTE')).length} 
                    icon={<AlertCircle size={24}/>} 
                    color="#f59e0b" 
                    subtext="Ação Necessária"
                 />
                 <StatCard 
                    title="Aprovações Realizadas" 
                    value={requests.filter(r=>r.status === 'APROVADO').length} 
                    icon={<CheckCircle size={24}/>} 
                    color="#10b981" 
                    subtext="Eficiência Alta"
                 />
                 <StatCard 
                    title="Ferramentas Ativas" 
                    value={tools.length} 
                    icon={<Server size={24}/>} 
                    color="#0ea5e9" 
                    subtext="Sistemas Monitorados"
                 />
               </div>

               {/* 3. DIVISÃO: FORMULÁRIO + FEED */}
               <div className="dashboard-split">
                  <div className="glass-card" id="req-form">
                    <h3 style={{marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px'}}>
                      <Zap size={20} color="#f59e0b"/> Ações Rápidas
                    </h3>
                    <form onSubmit={handleCreateRequest} className="modern-form">
                       <div className="form-group">
                         <label>Tipo de Acesso</label>
                         <select onChange={e=>setFormType(e.target.value)} className="modern-input">
                           <option value="CHANGE_ROLE">Alteração de Cargo</option>
                           <option value="ACCESS_TOOL">Acesso a Ferramenta</option>
                         </select>
                       </div>
                       
                       <div className="form-group">
                         <label>Detalhes do Pedido</label>
                         {formType === 'ACCESS_TOOL' ? (
                            <select onChange={e=>setFormDetails(e.target.value)} className="modern-input">
                              <option value="">Selecione a Ferramenta...</option>
                              {tools.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                         ) : (
                            <input placeholder="Ex: Promoção para Pleno" onChange={e=>setFormDetails(e.target.value)} className="modern-input"/>
                         )}
                       </div>

                       <div className="form-group full-width">
                         <label>Justificativa (Compliance)</label>
                         <input placeholder="Motivo da solicitação..." onChange={e=>setFormJustification(e.target.value)} className="modern-input"/>
                       </div>

                       <button type="submit" className="primary-btn full-width">Enviar Solicitação</button>
                    </form>
                  </div>
                  
                  {/* FEED LATERAL */}
                  <ActivityFeed />
               </div>
            </div>
          )}

          {/* --- CONTEÚDO: SOLICITAÇÕES --- */}
          {activeTab === 'REQUESTS' && systemProfile !== 'VIEWER' && (
            <div className="glass-card full-height">
               <table className="modern-table">
                  <thead><tr><th>SOLICITANTE</th><th>PEDIDO</th><th>STATUS</th><th style={{textAlign:'right'}}>AÇÃO</th></tr></thead>
                  <tbody>
                     {requests.filter(r=> !['APROVADO','REPROVADO'].includes(r.status)).map(r => (
                        <tr key={r.id}>
                           <td style={{fontWeight:500}}>{r.requester.name}</td>
                           <td style={{color:'#cbd5e1'}}>{JSON.parse(r.details).info}</td>
                           <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                           <td style={{textAlign:'right'}}>
                              <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                                 <button onClick={()=>handleApprove(r.id,'APROVAR')} className="btn-icon btn-approve"><CheckCircle size={18}/></button>
                                 <button onClick={()=>handleApprove(r.id,'REPROVAR')} className="btn-icon btn-reject"><XCircle size={18}/></button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}

          {/* --- CONTEÚDO: ORGANOGRAMA --- */}
          {activeTab === 'ORG' && systemProfile === 'ADMIN' && (
            <div className="glass-card">
              {structure.map(dept => (
                <div key={dept.id} className="dept-item">
                  <div onClick={() => setExpandedDepts(p => p.includes(dept.id)?p.filter(i=>i!==dept.id):[...p,dept.id])} className="dept-header">
                     {expandedDepts.includes(dept.id) ? <ChevronDown size={18} color="#0ea5e9"/> : <ChevronRight size={18}/>}
                     <span>{dept.name}</span>
                  </div>
                  {expandedDepts.includes(dept.id) && (
                    <div className="dept-content">
                      {dept.roles.map((r,i) => (
                        <div key={i} className="role-group">
                           <div className="role-title">{r.name}</div>
                           <div className="user-tags">
                             {r.users.map(u => <div key={u.id} className="user-tag">{u.name}</div>)}
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* --- CONTEÚDO: PERFIL (VIEWER) --- */}
          {activeTab === 'PROFILE' && (
            <div className="profile-container">
              <div className="glass-card profile-header-card">
                 <div className="profile-avatar-lg">{currentUser?.name.charAt(0)}</div>
                 <div>
                   <h1>{currentUser?.name}</h1>
                   <p>{currentUser?.role.name}</p>
                 </div>
              </div>
              <div className="glass-card">
                 <h3>Meus Acessos</h3>
                 <div className="access-list">
                    <div className="access-item">
                      <div className="icon"><Lock size={16}/></div>
                      <div className="info">Email Corporativo (@grupo-3c.com)</div>
                      <div className="status active">Ativo</div>
                    </div>
                    {requests.filter(r => r.requesterId === currentUser?.id && r.status === 'APROVADO').map(access => (
                       <div key={access.id} className="access-item">
                         <div className="icon"><Server size={16}/></div>
                         <div className="info">{JSON.parse(access.details).info}</div>
                         <div className="status active">Ativo</div>
                       </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
          
          {/* TABS SIMPLES PARA ADMIN (FERRAMENTAS/HISTORICO) - Opcionais para visual */}
          {activeTab === 'TOOLS' && systemProfile === 'ADMIN' && (
             <div className="glass-card">
                <h3>Catálogo de Ferramentas</h3>
                <table className="modern-table" style={{marginTop:'20px'}}>
                   <thead><tr><th>NOME</th><th>OWNER</th></tr></thead>
                   <tbody>
                      {tools.map(t => (<tr key={t.id}><td>{t.name}</td><td>{t.owner?.name}</td></tr>))}
                   </tbody>
                </table>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}