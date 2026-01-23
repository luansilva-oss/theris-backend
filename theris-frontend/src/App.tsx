import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, FileText, Clock, 
  CheckCircle, XCircle, ShieldCheck, Server, ChevronRight, 
  ChevronDown, LogOut, Lock, User, MapPin, Award
} from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import './App.css';

// --- CONFIGURAÇÕES VISUAIS ---
const LEADER_KEYWORDS = ['Líder', 'Head', 'Tech Lead', 'Coordenador', 'Gerente', 'Gestor'];

const DEPT_ORDER = [
  'Board', 'Lideranças & Gestão', 'Tecnologia e Segurança', 'Produto', 
  'Produto 3C+', 'Produto Evolux', 'Produto FiqOn', 'Produto Dizify',
  'Comercial', 'Comercial Contact', 'Marketing', 'Atendimento ao Cliente', 
  'Pessoas e Cultura', 'Administrativo'
];

// --- INTERFACES ---
interface Manager { id: string; name: string; }
interface User { id: string; name: string; role: { name: string }; departmentId: string; manager?: Manager; }
interface Role { id: string; name: string; users: User[]; }
interface Department { id: string; name: string; roles: Role[]; }
interface Tool { id: string; name: string; owner: { name: string; id: string }; accessLevels: { create: { name: string }[] } | null; }
interface Request { id: string; requesterId: string; requester: { name: string }; lastApprover?: { name: string }; type: string; status: string; currentApproverRole: string; details: string; justification: string; createdAt: string; }

// Tipos de Perfil de Acesso
type SystemProfile = 'ADMIN' | 'APPROVER' | 'VIEWER';

export default function App() {
  // --- ESTADOS DE SESSÃO ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>('VIEWER');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- DADOS DO SISTEMA ---
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

  // --- CARREGAMENTO DE DADOS ---
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

      // Processamento do Organograma (Lideranças)
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
      
      // NOTA: Removemos a seleção automática de usuário. Agora exige login.
    } catch (e) { console.error("Erro ao carregar sistema:", e); }
  };

  useEffect(() => { loadData(); }, []);

  // --- LOGIN COM GOOGLE ---
  const responseGoogle = async (credentialResponse: CredentialResponse) => {
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
        // Redireciona baseado no perfil
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

  // --- AÇÕES DO SISTEMA ---
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
    if (res.ok) loadData(); else alert("Erro ou violação de Compliance.");
  };

  // --- COMPONENTES VISUAIS ---

  // Tela de Perfil (Viewer)
  const MyProfile = () => {
    const myAccesses = requests.filter(r => r.requesterId === currentUser?.id && r.status === 'APROVADO');
    const myDeptName = structure.find(d => d.roles.some(r => r.users.some(u => u.id === currentUser?.id)))?.name || "Geral";

    return (
      <div className="card" style={{maxWidth:'800px', margin:'0 auto'}}>
        <div style={{display:'flex', alignItems:'center', gap:'20px', marginBottom:'30px', borderBottom:'1px solid #334155', paddingBottom:'20px'}}>
           <div style={{width:'80px', height:'80px', background:'#0ea5e9', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', fontWeight:'bold', color:'white'}}>
             {currentUser?.name.charAt(0)}
           </div>
           <div>
             <h2 style={{fontSize:'1.8rem', color:'white'}}>{currentUser?.name}</h2>
             <div style={{color:'#94a3b8', fontSize:'1rem'}}>{currentUser?.role.name}</div>
             <div style={{color:'#0ea5e9', fontSize:'0.9rem', marginTop:'5px'}}>{myDeptName}</div>
           </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
          <div style={{background:'#0f172a', padding:'20px', borderRadius:'8px', border:'1px solid #1e293b'}}>
            <h4 style={{color:'#64748b', marginBottom:'15px', display:'flex', alignItems:'center', gap:'8px'}}><Award size={18}/> LIDERANÇA</h4>
            {currentUser?.manager ? (
               <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                 <div style={{width:'40px', height:'40px', background:'#334155', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}><User size={20} color="#cbd5e1"/></div>
                 <div><div style={{color:'white', fontWeight:'bold'}}>{currentUser.manager.name}</div><div style={{color:'#94a3b8', fontSize:'0.8rem'}}>Gestor Direto</div></div>
               </div>
            ) : <div style={{color:'#f59e0b'}}>Liderança Topo</div>}
          </div>
          <div style={{background:'#0f172a', padding:'20px', borderRadius:'8px', border:'1px solid #1e293b'}}>
            <h4 style={{color:'#64748b', marginBottom:'15px', display:'flex', alignItems:'center', gap:'8px'}}><MapPin size={18}/> DEPARTAMENTO</h4>
            <div style={{color:'white', fontSize:'1.1rem'}}>{myDeptName}</div>
          </div>
        </div>

        <h3 style={{marginTop:'30px', marginBottom:'15px', display:'flex', alignItems:'center', gap:'10px'}}><Lock size={20} color="#0ea5e9"/> Meus Acessos</h3>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr style={{textAlign:'left', color:'#94a3b8', borderBottom:'1px solid #334155'}}><th style={{padding:'10px'}}>RECURSO</th><th style={{padding:'10px'}}>STATUS</th></tr></thead>
          <tbody>
            <tr><td style={{padding:'15px', color:'white'}}>Email Corporativo</td><td style={{padding:'15px'}}><span className="badge APROVADO">ATIVO</span></td></tr>
            {myAccesses.map(access => (
              <tr key={access.id} style={{borderTop:'1px solid #1e293b'}}>
                <td style={{padding:'15px', color:'white'}}>{JSON.parse(access.details).info}</td>
                <td style={{padding:'15px'}}><span className="badge APROVADO">ATIVO</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Organograma
  const OrgChart = () => (
    <div className="card">
      <h3 style={{marginBottom:'20px'}}><Users size={22}/> Organograma</h3>
      {structure.map(dept => (
        <div key={dept.id} style={{marginBottom:'10px'}}>
          <div onClick={() => setExpandedDepts(p => p.includes(dept.id)?p.filter(i=>i!==dept.id):[...p,dept.id])}
            style={{background:'rgba(14,165,233,0.1)', padding:'12px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px'}}>
             {expandedDepts.includes(dept.id) ? <ChevronDown size={18} color="#0ea5e9"/> : <ChevronRight size={18}/>}
             <span style={{color:'white', fontWeight:'bold'}}>{dept.name}</span>
          </div>
          {expandedDepts.includes(dept.id) && (
            <div style={{paddingLeft:'20px', marginTop:'10px', borderLeft:'1px solid #334155'}}>
              {dept.roles.map((r,i) => (
                <div key={i} style={{marginBottom:'15px'}}>
                   <div style={{color:'#94a3b8', fontSize:'0.8rem'}}>{r.name}</div>
                   <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                     {r.users.map(u => (
                       <div key={u.id} style={{background:'#0f172a', padding:'5px 10px', borderRadius:'4px', border:'1px solid #1e293b', fontSize:'0.8rem', color:'white'}}>
                         {u.name}
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
  );

  // --- RENDERIZAÇÃO PRINCIPAL ---

  // TELA 1: LOGIN
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card" style={{textAlign:'center'}}>
          <ShieldCheck size={48} color="#0ea5e9" style={{marginBottom:'10px'}}/>
          <h1 style={{fontSize:'1.8rem', color:'white', marginBottom:'30px'}}>Theris <span style={{color:'#0ea5e9'}}>IGA</span></h1>
          
          <div style={{display:'flex', justifyContent:'center', marginBottom:'20px'}}>
            <GoogleLogin
              onSuccess={responseGoogle}
              onError={() => alert('Falha no Login com Google')}
              theme="filled_black"
              shape="pill"
              text="signin_with"
            />
          </div>
          <p style={{color:'#64748b', fontSize:'0.8rem', marginTop:'20px'}}>Acesso exclusivo @grupo-3c.com</p>
        </div>
      </div>
    );
  }

  // TELA 2: SISTEMA
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand"><ShieldCheck size={28} /> THERIS <span>IGA</span></div>
        <div style={{padding:'0 20px', marginBottom:'20px', fontSize:'0.8rem', color:'#64748b'}}>
           PERFIL: <strong style={{color:'#0ea5e9'}}>{systemProfile}</strong>
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

        <button onClick={handleLogout} style={{marginTop:'auto', margin:'20px', background:'transparent', border:'1px solid #ef4444', color:'#ef4444', padding:'10px', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
           <LogOut size={16}/> Sair
        </button>
      </aside>

      <main className="main-area">
        <header className="header-bar">
           <div><h2 style={{color:'white'}}>Painel IGA</h2></div>
           <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#cbd5e1'}}>
              <div style={{textAlign:'right'}}>
                 <div style={{fontWeight:'bold'}}>{currentUser?.name}</div>
                 <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{currentUser?.role.name}</div>
              </div>
              <div style={{width:'40px', height:'40px', background:'#1e293b', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #334155'}}>{currentUser?.name.charAt(0)}</div>
           </div>
        </header>

        {/* DASHBOARD (Admin/Approver) */}
        {activeTab === 'DASHBOARD' && systemProfile !== 'VIEWER' && (
          <>
             <div className="stats-row">
               <div className="stat-box"><div className="stat-title">Fila Geral</div><div className="stat-val" style={{color:'#f59e0b'}}>{requests.filter(r=>r.status.includes('PENDENTE')).length}</div></div>
               <div className="stat-box"><div className="stat-title">Minha Responsabilidade</div><div className="stat-val" style={{color:'#0ea5e9'}}>{
                 systemProfile === 'ADMIN' ? requests.filter(r=>r.status.includes('PENDENTE')).length : 
                 requests.filter(r=> r.status === 'PENDENTE_RH' || r.status === 'PENDENTE_OWNER').length
               }</div></div>
             </div>
             <div className="card">
                <h3>Nova Solicitação</h3>
                <form onSubmit={handleCreateRequest} style={{display:'flex', gap:'15px', marginTop:'15px'}}>
                   <select onChange={e=>setFormType(e.target.value)} style={{flex:1}}><option value="CHANGE_ROLE">Cargo</option><option value="ACCESS_TOOL">Ferramenta</option></select>
                   {formType === 'ACCESS_TOOL' ? (
                      <select onChange={e=>setFormDetails(e.target.value)} style={{flex:2}}><option value="">Selecione...</option>{tools.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}</select>
                   ) : <input placeholder="Detalhes" onChange={e=>setFormDetails(e.target.value)} style={{flex:2}}/>}
                   <input placeholder="Justificativa" onChange={e=>setFormJustification(e.target.value)} style={{flex:2}}/>
                   <button type="submit" className="primary-btn">Solicitar</button>
                </form>
             </div>
          </>
        )}

        {/* LISTA (Admin/Approver) */}
        {activeTab === 'REQUESTS' && systemProfile !== 'VIEWER' && (
           <div className="card">
              <h3>Fila de Aprovação</h3>
              <table style={{width:'100%', borderCollapse:'collapse', marginTop:'15px'}}>
                 <thead><tr style={{textAlign:'left', color:'#94a3b8'}}><th style={{padding:'10px'}}>SOLICITANTE</th><th>PEDIDO</th><th>STATUS</th><th>AÇÃO</th></tr></thead>
                 <tbody>
                    {requests.filter(r=> !['APROVADO','REPROVADO'].includes(r.status)).map(r => (
                       <tr key={r.id} style={{borderTop:'1px solid #334155'}}>
                          <td style={{padding:'15px', color:'white'}}>{r.requester.name}</td>
                          <td style={{color:'#cbd5e1'}}>{JSON.parse(r.details).info}</td>
                          <td><span className="badge PENDENTE">{r.status}</span></td>
                          <td>
                             <div style={{display:'flex', gap:'10px'}}>
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

        {activeTab === 'PROFILE' && <MyProfile />}
        {activeTab === 'ORG' && systemProfile === 'ADMIN' && <OrgChart />}
        
        {activeTab === 'TOOLS' && systemProfile === 'ADMIN' && (
           <div className="card"><h3>Ferramentas</h3><ul style={{marginTop:'15px', listStyle:'none'}}>{tools.map(t=><li key={t.id} style={{padding:'10px', borderBottom:'1px solid #334155', color:'white'}}>{t.name} (Owner: {t.owner?.name})</li>)}</ul></div>
        )}
        
        {activeTab === 'HISTORY' && systemProfile === 'ADMIN' && (
           <div className="card"><h3>Auditoria</h3><div style={{color:'#94a3b8', padding:'20px'}}>Histórico de logs completo disponível.</div></div>
        )}

      </main>
    </div>
  );
}