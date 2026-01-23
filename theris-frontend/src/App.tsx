import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, FileText, Clock, 
  CheckCircle, XCircle, ShieldCheck, Server, ChevronRight, 
  ChevronDown, LogOut, Lock, User, MapPin, Award,
  Bird, Activity, TrendingUp, AlertCircle, Calendar, Zap,
  Hash, UserCheck, ShieldAlert, UserPlus
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import './App.css';

// --- CONFIGURAÇÕES ---
const LEADER_KEYWORDS = ['Líder', 'Head', 'Tech Lead', 'Coordenador', 'Gerente', 'Gestor'];
const DEPT_ORDER = [
  'Board', 'Lideranças & Gestão', 'Tecnologia e Segurança', 'Produto', 
  'Produto 3C+', 'Produto Evolux', 'Produto FiqOn', 'Produto Dizify',
  'Comercial', 'Comercial Contact', 'Marketing', 'Atendimento ao Cliente', 
  'Pessoas e Cultura', 'Administrativo'
];

// --- INTERFACES ---
interface Manager { id: string; name: string; }
interface User { 
  id: string; name: string; 
  role?: { name: string }; 
  department?: { name: string }; 
  departmentId: string; 
  manager?: Manager; 
  deputyId?: string;
}
interface Role { id: string; name: string; users: User[]; }
interface Department { id: string; name: string; roles: Role[]; }
interface Tool { id: string; name: string; owner?: { name: string; id: string }; accessLevels: { create: { name: string }[] } | null; }

interface Request { 
  id: string; requesterId: string; requester: { name: string }; lastApprover?: { name: string }; 
  type: string; status: string; currentApproverRole: string; 
  details: string; justification: string; createdAt: string; updatedAt: string; 
  isExtraordinary: boolean; 
}

type SystemProfile = 'ADMIN' | 'APPROVER' | 'VIEWER';

// --- SUB-COMPONENTES (Separados para não quebrar o layout) ---

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'APROVADO') return <span className="badge APROVADO">APROVADO</span>;
  if (status === 'REPROVADO') return <span className="badge REPROVADO">REPROVADO</span>;
  
  let label = 'PENDENTE';
  let colorClass = 'PENDENTE';
  
  if (status === 'PENDENTE_GESTOR') label = 'AGUARD. GESTOR';
  if (status === 'PENDENTE_OWNER') { label = 'AGUARD. OWNER'; colorClass = 'PENDENTE_OWNER'; }
  if (status === 'PENDENTE_SUB_OWNER') { label = 'AGUARD. SUB-OWNER'; colorClass = 'PENDENTE_OWNER'; }
  if (status === 'PENDENTE_SI') { label = 'AGUARD. SI (SEGURANÇA)'; colorClass = 'PENDENTE_SI'; }

  return <span className={`badge ${colorClass}`}>{label}</span>;
};

const ActivityFeed = ({ requests }: { requests: Request[] }) => (
  <div className="glass-card" style={{height: '100%', minHeight: '400px'}}>
    <h3 style={{marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px'}}>
      <Activity size={20} color="#0ea5e9"/> Atividade Recente
    </h3>
    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
      {requests.slice(0, 5).map(r => {
        // Safe parse do JSON
        let info = "Detalhes não disponíveis";
        try {
            const parsed = JSON.parse(r.details);
            info = parsed.info || info;
        } catch (e) {}

        return (
          <div key={r.id} style={{display:'flex', gap:'12px', alignItems:'center', borderBottom:'1px solid #33415530', paddingBottom:'12px'}}>
            <div style={{minWidth:'32px', height:'32px', borderRadius:'50%', background: r.status === 'APROVADO' ? '#10b98120' : '#f59e0b20', display:'flex', alignItems:'center', justifyContent:'center'}}>
              {r.status === 'APROVADO' ? <CheckCircle size={16} color="#10b981"/> : <Clock size={16} color="#f59e0b"/>}
            </div>
            <div>
              <div style={{fontSize:'0.9rem', color:'white', fontWeight:500}}>
                <span style={{color:'#cbd5e1'}}>{r.requester?.name || 'Usuário'}</span> solicitou <span style={{color:'#0ea5e9'}}>{info}</span>
              </div>
              <div style={{fontSize:'0.75rem', color:'#64748b', marginTop:'2px'}}>
                {new Date(r.createdAt).toLocaleDateString()} • {r.status.replace('_',' ')}
              </div>
            </div>
          </div>
        );
      })}
      {requests.length === 0 && <div style={{color:'#64748b', fontSize:'0.9rem'}}>Nenhuma atividade recente.</div>}
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>('VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  
  const [structure, setStructure] = useState<Department[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // Form States
  const [formType, setFormType] = useState('CHANGE_ROLE');
  const [formDetails, setFormDetails] = useState(''); 
  const [formJustification, setFormJustification] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetDept, setTargetDept] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [isExtraordinary, setIsExtraordinary] = useState(false);

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

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

      const finalStructure: Department[] = [];
      const leadershipRoles: Role[] = [];
      const boardDept = rawStruct.find(d => d.name === 'Board');
      if (boardDept) finalStructure.push(boardDept);

      rawStruct.filter(d => d.name !== 'Board').forEach(dept => {
        const leaders = dept.roles.filter(r => LEADER_KEYWORDS.some(k => r.name.includes(k)));
        const staff = dept.roles.filter(r => !LEADER_KEYWORDS.some(k => r.name.includes(k)));
        if (leaders.length > 0) leaders.forEach(l => leadershipRoles.push({ ...l, name: `${l.name} (${dept.name})` }));
        if (staff.length > 0) finalStructure.push({ ...dept, roles: staff });
      });

      if (leadershipRoles.length > 0) finalStructure.push({ id: 'liderancas-virtual-id', name: 'Lideranças & Gestão', roles: leadershipRoles });

      finalStructure.sort((a, b) => {
        let idxA = DEPT_ORDER.indexOf(a.name);
        let idxB = DEPT_ORDER.indexOf(b.name);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });

      setStructure(finalStructure);
      setTools(dTools);
      setAllUsers(dUsers);
      setRequests(dReqs);
    } catch (e) { console.error("Erro ao carregar dados:", e); }
  };

  useEffect(() => { loadData(); }, []);

  const responseGoogle = async (credentialResponse: any) => {
    try {
      const res = await fetch('http://localhost:3000/api/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential, clientId: credentialResponse.clientId })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setSystemProfile(data.profile);
        setIsLoggedIn(true);
        setActiveTab(data.profile === 'VIEWER' ? 'PROFILE' : 'DASHBOARD');
      } else { alert(`❌ Acesso Negado: ${data.error}`); }
    } catch (error) { console.error(error); alert("Falha de conexão."); }
  };

  const handleLogout = () => { setIsLoggedIn(false); setCurrentUser(null); setSystemProfile('VIEWER'); };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    let finalDetails = { info: '', toolName: '', accessLevel: '', targetUserId: '' };
    
    if (formType === 'CHANGE_ROLE') {
       finalDetails.info = `Mudança para: ${targetRole} (${targetDept})`;
    } else if (formType === 'ACCESS_TOOL') {
       finalDetails.info = `Acesso: ${formDetails}`;
       finalDetails.toolName = formDetails; 
       finalDetails.accessLevel = 'User'; 
    } else if (formType === 'NOMINATE_DEPUTY') {
       const deputy = allUsers.find(u => u.id === targetUserId);
       finalDetails.info = `Nomeação de Deputy: ${deputy?.name}`;
       finalDetails.targetUserId = targetUserId;
    }

    const beneficiaryId = (formType === 'NOMINATE_DEPUTY') ? currentUser.id : (targetUserId || currentUser.id);

    await fetch('http://localhost:3000/api/solicitacoes', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ 
        requesterId: beneficiaryId, 
        type: formType, 
        details: finalDetails, 
        justification: formJustification,
        isExtraordinary 
      })
    });
    
    alert("Solicitação enviada!");
    setFormDetails(''); setIsExtraordinary(false); loadData();
  };

  const handleApprove = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    await fetch(`http://localhost:3000/api/solicitacoes/${id}`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ status: action, approverId: currentUser?.id })
    });
    loadData();
  };

  const availableRoles = targetDept ? structure.find(d => d.name === targetDept)?.roles || [] : [];

  // --- RENDER ---
  if (!isLoggedIn) {
    return (
      <div className="login-wrapper">
        <div className="ambient-background">
          <div className="cloud cloud-1"></div>
          <div className="cloud cloud-2"></div>
          <div className="cloud cloud-3"></div>
        </div>
        <div className="fog-layer"></div>
        <div className="login-brand-section glass-panel-left">
          <div className="brand-content">
            <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'30px'}}>
               <div style={{background:'rgba(255,255,255,0.1)', padding:'10px', borderRadius:'12px', display:'flex', border:'1px solid rgba(255,255,255,0.2)'}}>
                 <Bird size={32} color="#0ea5e9" strokeWidth={2}/>
               </div>
               <span style={{fontSize:'2rem', fontWeight: 700, letterSpacing:'-1px', color:'white', textShadow:'0 2px 10px rgba(0,0,0,0.3)'}}>THERIS</span>
            </div>
            <h1 style={{fontSize:'3.5rem', lineHeight:'1.1', marginBottom:'20px', color:'white', textShadow:'0 4px 20px rgba(0,0,0,0.5)'}}>
              Governança de <br/>Identidade <span style={{color:'#38bdf8'}}>Inteligente.</span>
            </h1>
            <p style={{fontSize:'1.1rem', color:'#e2e8f0', maxWidth:'500px', lineHeight:'1.6', textShadow:'0 2px 5px rgba(0,0,0,0.5)'}}>
              Centralize acessos, automatize auditorias e garanta compliance com a plataforma líder do Grupo 3C.
            </p>
          </div>
          <Bird className="giant-bg-icon" size={700} strokeWidth={0.3} color="white"/>
        </div>
        <div className="login-form-section glass-panel-right">
          <div className="login-box">
             <div style={{textAlign:'center', marginBottom:'40px'}}>
               <h2 style={{fontSize:'2rem', color:'white', marginBottom:'10px', fontWeight:600}}>Acesse sua conta</h2>
               <p style={{color:'#94a3b8', fontSize:'1rem'}}>Utilize suas credenciais corporativas</p>
             </div>
             <div className="google-btn-wrapper">
               <GoogleLogin
                  onSuccess={responseGoogle}
                  onError={() => alert('Falha no Login')}
                  theme="filled_black" shape="pill" size="large" text="continue_with" width="100%"
               />
             </div>
             <div style={{marginTop:'40px', textAlign:'center', fontSize:'0.85rem', color:'#64748b', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'20px'}}>
               <Lock size={14} style={{verticalAlign:'middle', marginRight:'6px', color:'#0ea5e9'}}/>
               Ambiente Seguro & Criptografado
               <div style={{marginTop:'5px', opacity:0.7}}>© 2025 Grupo 3C - Tecnologia</div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand" style={{display:'flex', flexDirection:'column', alignItems:'start', gap:'0px', paddingBottom:'20px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <Bird size={28} color="#0ea5e9" /> 
            <span style={{fontSize:'1.4rem', fontWeight: 700, letterSpacing:'1px'}}>THERIS</span>
          </div>
        </div>

        <div className="user-mini-profile">
          <div className="avatar">{currentUser?.name ? currentUser.name.charAt(0) : 'U'}</div>
          <div className="info">
            <div className="name">{currentUser?.name?.split(' ')[0] || 'Usuário'}</div>
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
          {(systemProfile === 'APPROVER' || systemProfile === 'ADMIN') && (
               <div className={`nav-item ${activeTab === 'DEPUTY' ? 'active' : ''}`} onClick={() => {setFormType('NOMINATE_DEPUTY'); setActiveTab('DASHBOARD'); document.getElementById('req-form')?.scrollIntoView({behavior:'smooth'})}}>
                  <UserPlus size={18} /> Indicar Deputy
               </div>
           )}
          {systemProfile === 'VIEWER' && (
             <div className={`nav-item ${activeTab === 'PROFILE' ? 'active' : ''}`} onClick={() => setActiveTab('PROFILE')}><User size={18} /> Meu Perfil</div>
          )}
        </nav>
        <button onClick={handleLogout} className="logout-btn"><LogOut size={16}/> Sair</button>
      </aside>

      <main className="main-area">
        <header className="header-bar">
           <div>
             <h2 style={{color:'white', fontSize:'1.2rem'}}>
               {activeTab === 'DASHBOARD' ? 'Visão Geral' : 
                activeTab === 'ORG' ? 'Estrutura Organizacional' :
                activeTab === 'REQUESTS' ? 'Central de Solicitações' : 
                activeTab === 'HISTORY' ? 'Log de Auditoria & Compliance' : 'Painel'}
             </h2>
             <div style={{color:'#94a3b8', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'5px'}}><Calendar size={12}/> {today}</div>
           </div>
           <div className="status-badge"><div className="dot"></div> Sistema Operante</div>
        </header>

        <div className="content-scroll">
          
          {activeTab === 'DASHBOARD' && systemProfile !== 'VIEWER' && (
            <div className="dashboard-grid">
               <div className="hero-banner">
                 <div>
                   <h1>Olá, {currentUser?.name?.split(' ')[0] || 'Colaborador'}! 👋</h1>
                   <p>Você tem <strong style={{color:'#f59e0b'}}>{requests.filter(r=>r.status.includes('PENDENTE')).length} solicitações</strong> aguardando sua análise hoje.</p>
                 </div>
                 <div className="hero-actions"><button className="secondary-btn" onClick={() => document.getElementById('req-form')?.scrollIntoView({behavior:'smooth'})}>Nova Solicitação</button></div>
               </div>

               <div className="stats-container">
                 <div className="glass-card"><div style={{color:'#94a3b8', textTransform:'uppercase', fontSize:'0.8rem', fontWeight:600}}>Colaboradores</div><div style={{fontSize:'2rem', fontWeight:700, color:'white'}}>{allUsers.length}</div></div>
                 <div className="glass-card"><div style={{color:'#94a3b8', textTransform:'uppercase', fontSize:'0.8rem', fontWeight:600}}>Pendentes</div><div style={{fontSize:'2rem', fontWeight:700, color:'#f59e0b'}}>{requests.filter(r=>r.status.includes('PENDENTE')).length}</div></div>
                 <div className="glass-card"><div style={{color:'#94a3b8', textTransform:'uppercase', fontSize:'0.8rem', fontWeight:600}}>Processadas</div><div style={{fontSize:'2rem', fontWeight:700, color:'#10b981'}}>{requests.filter(r=>['APROVADO','REPROVADO'].includes(r.status)).length}</div></div>
               </div>

               <div className="dashboard-split">
                  <div className="glass-card" id="req-form">
                    <h3 style={{marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px'}}>
                        {formType === 'NOMINATE_DEPUTY' ? <UserPlus size={20} color="#f59e0b"/> : <Zap size={20} color="#f59e0b"/>}
                        {formType === 'NOMINATE_DEPUTY' ? 'Nomear Substituto (Deputy)' : 'Ações Rápidas'}
                    </h3>
                    
                    <form onSubmit={handleCreateRequest} className="modern-form">
                       {formType === 'NOMINATE_DEPUTY' ? (
                           <div className="form-group full-width">
                             <label>Quem será seu substituto?</label>
                             <select className="modern-input" value={targetUserId} onChange={e => setTargetUserId(e.target.value)}>
                                <option value="">-- Selecione o Colaborador --</option>
                                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                             <p style={{fontSize:'0.8rem', color:'#94a3b8', marginTop:'5px'}}>* Esta ação passará por aprovação de SI.</p>
                           </div>
                       ) : (
                           <>
                             <div className="form-group full-width">
                               <label>Colaborador (Beneficiário)</label>
                               <select className="modern-input" value={targetUserId} onChange={e => setTargetUserId(e.target.value)}>
                                  <option value="">-- Eu mesmo ({currentUser?.name}) --</option>
                                  {allUsers.filter(u => u.id !== currentUser?.id).sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                                    <option key={u.id} value={u.id}>{u.name} - {u.role?.name || 'Sem Cargo'}</option>
                                  ))}
                               </select>
                             </div>

                             <div className="form-group full-width">
                               <label>Tipo de Solicitação</label>
                               <select onChange={e=>{setFormType(e.target.value); setTargetDept(''); setTargetRole(''); setFormDetails('')}} className="modern-input" value={formType}>
                                 <option value="CHANGE_ROLE">Alteração de Cargo / Departamento</option>
                                 <option value="ACCESS_TOOL">Acesso a Ferramenta</option>
                               </select>
                             </div>
                             
                             {formType === 'CHANGE_ROLE' ? (
                               <>
                                 <div className="form-group">
                                   <label>Novo Departamento</label>
                                   <select className="modern-input" value={targetDept} onChange={e => { setTargetDept(e.target.value); setTargetRole(''); }}>
                                     <option value="">-- Selecione o Depto --</option>
                                     {structure.map(d => (<option key={d.id} value={d.name}>{d.name}</option>))}
                                   </select>
                                 </div>
                                 <div className="form-group">
                                   <label>Novo Cargo</label>
                                   <select className="modern-input" value={targetRole} onChange={e => setTargetRole(e.target.value)} disabled={!targetDept}>
                                     <option value="">-- Selecione o Cargo --</option>
                                     {availableRoles.map((r, i) => (<option key={i} value={r.name}>{r.name.split('(')[0].trim()}</option>))}
                                   </select>
                                 </div>
                               </>
                             ) : (
                               <>
                                <div className="form-group full-width">
                                    <label>Ferramenta Desejada</label>
                                    <select onChange={e=>setFormDetails(e.target.value)} className="modern-input" value={formDetails}>
                                      <option value="">-- Selecione a Ferramenta --</option>
                                      {tools.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                                    </select>
                                 </div>
                                 <div className="form-group full-width" style={{background:'rgba(245, 158, 11, 0.1)', padding:'15px', borderRadius:'10px', border:'1px solid rgba(245, 158, 11, 0.3)'}}>
                                     <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', color:'#f59e0b', fontWeight:'bold'}}>
                                         <input type="checkbox" checked={isExtraordinary} onChange={e=>setIsExtraordinary(e.target.checked)} />
                                         <ShieldAlert size={18}/> Solicitar Acesso Extraordinário / Admin?
                                     </label>
                                     <p style={{fontSize:'0.8rem', color:'#cbd5e1', marginTop:'5px', marginLeft:'25px'}}>
                                         Marque apenas se o acesso fugir do padrão do cargo. Exigirá aprovação de Segurança da Informação.
                                     </p>
                                 </div>
                               </>
                             )}
                           </>
                       )}

                       <div className="form-group full-width">
                         <label>Justificativa (Compliance)</label>
                         <input placeholder="Motivo da alteração..." value={formJustification} onChange={e=>setFormJustification(e.target.value)} className="modern-input"/>
                       </div>

                       <button type="submit" className="primary-btn full-width">Enviar Solicitação</button>
                    </form>
                  </div>
                  {/* FEED - AGORA É UM COMPONENTE SEPARADO E SEGURO */}
                  <ActivityFeed requests={requests} />
               </div>
            </div>
          )}

          {activeTab === 'REQUESTS' && systemProfile !== 'VIEWER' && (
            <div className="glass-card full-height">
               <table className="modern-table">
                  <thead><tr><th>SOLICITANTE</th><th>PEDIDO</th><th>STATUS</th><th style={{textAlign:'right'}}>AÇÃO</th></tr></thead>
                  <tbody>
                     {requests.filter(r=> !['APROVADO','REPROVADO'].includes(r.status)).map(r => {
                        let info = 'Detalhes...';
                        try { info = JSON.parse(r.details).info } catch (e) {}

                        return (
                        <tr key={r.id}>
                           <td style={{fontWeight:500}}>{r.requester?.name} {r.isExtraordinary && <ShieldAlert size={14} color="#f59e0b" style={{verticalAlign:'middle'}}/>}</td>
                           <td style={{color:'#cbd5e1'}}>{info}</td>
                           <td><StatusBadge status={r.status} /></td>
                           <td style={{textAlign:'right'}}>
                              <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                                 <button onClick={()=>handleApprove(r.id,'APROVAR')} className="btn-icon btn-approve"><CheckCircle size={18}/></button>
                                 <button onClick={()=>handleApprove(r.id,'REPROVAR')} className="btn-icon btn-reject"><XCircle size={18}/></button>
                              </div>
                           </td>
                        </tr>
                     )})}
                  </tbody>
               </table>
            </div>
          )}

          {activeTab === 'HISTORY' && systemProfile === 'ADMIN' && (
            <div className="glass-card">
              <div style={{marginBottom:'20px'}}>
                <h3>Histórico de Transações & Auditoria</h3>
                <p style={{color:'#94a3b8', fontSize:'0.9rem'}}>Registro imutável de todas as alterações de identidade e acesso.</p>
              </div>
              <table className="modern-table">
                <thead><tr><th>ID REF (UUID)</th><th>DATA</th><th>SOLICITANTE</th><th>DETALHES DA AÇÃO</th><th>APROVADO POR</th><th>STATUS FINAL</th></tr></thead>
                <tbody>
                  {requests.filter(r => ['APROVADO', 'REPROVADO'].includes(r.status)).map(r => {
                     let info = ''; try { info = JSON.parse(r.details).info } catch (e) {}
                     return (
                    <tr key={r.id}>
                      <td style={{fontFamily:'monospace', color:'#64748b', fontSize:'0.75rem'}}><div style={{display:'flex', alignItems:'center', gap:'5px'}}><Hash size={12}/> {r.id.slice(0, 8)}...</div></td>
                      <td style={{color:'#cbd5e1'}}>{new Date(r.updatedAt || r.createdAt).toLocaleDateString()}</td>
                      <td style={{fontWeight:500}}>{r.requester?.name}</td>
                      <td><span style={{color:'white'}}>{info}</span><div style={{fontSize:'0.75rem', color:'#64748b', marginTop:'2px'}}>Justificativa: {r.justification}</div></td>
                      <td>{r.lastApprover ? (<div style={{display:'flex', alignItems:'center', gap:'6px', color:'#cbd5e1'}}><UserCheck size={14} color="#10b981"/> {r.lastApprover.name}</div>) : <span style={{color:'#64748b'}}>-</span>}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  )})}
                  {requests.filter(r => ['APROVADO', 'REPROVADO'].includes(r.status)).length === 0 && (
                    <tr><td colSpan={6} style={{textAlign:'center', padding:'40px', color:'#64748b'}}>Nenhum registro auditado encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

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
                           <div className="user-tags">{r.users.map(u => <div key={u.id} className="user-tag">{u.name}</div>)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="profile-container">
              <div className="glass-card profile-header-card">
                 <div className="profile-avatar-lg">{currentUser?.name ? currentUser.name.charAt(0) : 'U'}</div>
                 <div>
                   <h1>{currentUser?.name || 'Usuário'}</h1>
                   <p>{currentUser?.role?.name || 'Sem Cargo Definido'}</p>
                 </div>
              </div>
              <div className="glass-card">
                 <h3>Meus Acessos</h3>
                 <div className="access-list">
                    <div className="access-item">
                      <div className="icon"><Lock size={16}/></div><div className="info">Email Corporativo (@grupo-3c.com)</div><div className="status active">Ativo</div>
                    </div>
                    {requests.filter(r => r.requesterId === currentUser?.id && r.status === 'APROVADO').map(access => {
                       let info = ''; try { info = JSON.parse(access.details).info } catch (e) {}
                       return (
                       <div key={access.id} className="access-item">
                         <div className="icon"><Server size={16}/></div><div className="info">{info}</div><div className="status active">Ativo</div>
                       </div>
                    )})}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'TOOLS' && systemProfile === 'ADMIN' && (
             <div className="glass-card">
                <h3>Catálogo de Ferramentas</h3>
                <table className="modern-table" style={{marginTop:'20px'}}>
                   <thead><tr><th>NOME</th><th>OWNER</th></tr></thead>
                   <tbody>{tools.map(t => (<tr key={t.id}><td>{t.name}</td><td>{t.owner?.name || 'Sem Dono'}</td></tr>))}</tbody>
                </table>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}