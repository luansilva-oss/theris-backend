import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  ShieldCheck,
  Server,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import './App.css';

// --- CONFIGURAÇÃO VISUAL ---

// Quem vai para a aba de Lideranças
const LEADER_KEYWORDS = [
  'Líder', 'Head', 'Tech Lead', 'Coordenador', 'Coordenadora', 'Gerente', 'Gestor'
];

// Ordem dos departamentos operacionais
const DEPT_ORDER = [
  'Board',
  'Lideranças & Gestão',
  'Tecnologia e Segurança',
  'Produto',
  'Produto 3C+',
  'Produto Evolux',
  'Produto FiqOn',
  'Produto Dizify',
  'Automações',
  'Comercial',
  'Comercial Contact',
  'Comercial Dizify',
  'Expansão',
  'Parcerias',
  'Marketing',
  'Atendimento ao Cliente',
  'Atendimento ao Cliente FiqOn',
  'Professional Service',
  'Operações',
  'Administrativo',
  'Pessoas e Cultura',
  'Instituto 3C'
];

// --- INTERFACES ---
interface Manager { id: string; name: string; }
interface User { id: string; name: string; role: { name: string }; departmentId: string; manager?: Manager; }
interface Role { id: string; name: string; users: User[]; }
interface Department { id: string; name: string; roles: Role[]; }
interface Tool { id: string; name: string; owner: { name: string }; accessLevels: { create: { name: string }[] } | null; }
interface Request { id: string; requester: { name: string }; lastApprover?: { name: string }; type: string; status: string; currentApproverRole: string; details: string; justification: string; createdAt: string; }

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('ORG');
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  
  const [structure, setStructure] = useState<Department[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // Form States
  const [formType, setFormType] = useState('CHANGE_ROLE');
  const [formDetails, setFormDetails] = useState('');
  const [formJustification, setFormJustification] = useState('');

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
      
      // --- LÓGICA DE AGRUPAMENTO (Mantida, só mudou o visual) ---
      
      const finalStructure: Department[] = [];
      const leadershipRoles: Role[] = [];

      const boardDept = rawStruct.find(d => d.name === 'Board');
      if (boardDept) finalStructure.push(boardDept);

      const otherDepts = rawStruct.filter(d => d.name !== 'Board');

      otherDepts.forEach(dept => {
        const leaders = dept.roles.filter(r => LEADER_KEYWORDS.some(k => r.name.includes(k)));
        const staff = dept.roles.filter(r => !LEADER_KEYWORDS.some(k => r.name.includes(k)));

        if (leaders.length > 0) {
          leaders.forEach(l => {
             leadershipRoles.push({ ...l, name: `${l.name} (${dept.name})` }); 
          });
        }

        if (staff.length > 0) {
          finalStructure.push({ ...dept, roles: staff });
        }
      });

      if (leadershipRoles.length > 0) {
        finalStructure.push({
          id: 'liderancas-virtual-id',
          name: 'Lideranças & Gestão',
          roles: leadershipRoles
        });
      }

      finalStructure.sort((a, b) => {
        let indexA = DEPT_ORDER.indexOf(a.name);
        let indexB = DEPT_ORDER.indexOf(b.name);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
      });

      setStructure(finalStructure);
      setTools(await resTools.json());
      setAllUsers(dUsers);
      setRequests(await resReqs.json());

      if (!currentUser && dUsers.length > 0) setCurrentUser(dUsers[0]);

      const boardId = boardDept?.id;
      if (boardId) setExpandedDepts([boardId, 'liderancas-virtual-id']);

    } catch (e) { console.error("Erro ao carregar:", e); }
  };

  useEffect(() => { loadData(); }, []);

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]);
  };

  // Actions
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !formJustification) return alert("Justificativa obrigatória!");
    await fetch('http://localhost:3000/api/solicitacoes', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ requesterId: currentUser.id, type: formType, details: { info: formDetails }, justification: formJustification })
    });
    alert("Enviado!"); setFormDetails(''); setFormJustification(''); loadData(); setActiveTab('REQUESTS');
  };

  const handleApprove = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    if (!currentUser || !confirm(`Confirma ${action}?`)) return;
    const res = await fetch(`http://localhost:3000/api/solicitacoes/${id}`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ status: action === 'APROVAR' ? 'APROVADO' : 'REPROVADO', approverId: currentUser.id })
    });
    if (res.ok) loadData(); else { const err = await res.json(); alert(`⛔ ${err.error}`); }
  };

  // --- COMPONENTES ---
  const OrgChart = () => (
    <div className="card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:'1px solid #334155', paddingBottom:'15px'}}>
        <h3 style={{display: 'flex', alignItems: 'center', gap: '10px'}}><Users size={22} color="#0ea5e9"/> Estrutura Organizacional</h3>
        <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Hierarquia: Board → Líderes → Operação</span>
      </div>

      {structure.map(dept => {
        const isOpen = expandedDepts.includes(dept.id);
        const isBoard = dept.name === 'Board';
        // Removida a distinção visual forçada para "Lideranças"

        // Cores e Estilos (Board continua roxo para hierarquia, o resto é padrão azul)
        let borderColor = 'transparent';
        let bgColor = 'transparent';
        let iconColor = '#64748b';
        let textColor = '#cbd5e1';

        if (isOpen) {
          if (isBoard) { 
            borderColor = '#6366f1'; 
            bgColor = 'rgba(99, 102, 241, 0.2)'; 
            iconColor = '#6366f1'; 
            textColor = '#f1f5f9'; 
          } else { 
            // Padrão Azul para TODO o resto (incluindo Lideranças)
            borderColor = '#0ea5e9'; 
            bgColor = 'rgba(14, 165, 233, 0.1)'; 
            iconColor = '#0ea5e9'; 
            textColor = '#f1f5f9'; 
          }
        }

        return (
          <div key={dept.id} style={{marginBottom: '10px'}}>
            <div 
              onClick={() => toggleDept(dept.id)}
              style={{
                display:'flex', alignItems:'center', gap:'10px', 
                background: bgColor, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                border: '1px solid', borderColor: borderColor, transition: 'all 0.2s ease'
              }}
            >
              {isOpen ? <ChevronDown size={20} color={iconColor}/> : <ChevronRight size={20} color="#64748b"/>}
              
              <div style={{fontWeight:'bold', fontSize:'1.1rem', color: textColor, display:'flex', alignItems:'center', gap:'8px'}}>
                {dept.name} 
                {isBoard && <span style={{fontSize:'0.65rem', background:'#6366f1', color:'white', padding:'2px 6px', borderRadius:'4px'}}>C-LEVEL</span>}
              </div>
              
              <div style={{marginLeft:'auto', fontSize:'0.75rem', background:'#1e293b', padding:'2px 8px', borderRadius:'10px', color:'#94a3b8'}}>
                {dept.roles.reduce((acc, role) => acc + role.users.length, 0)} pessoas
              </div>
            </div>

            {isOpen && (
              <div style={{marginTop:'10px', marginLeft:'15px', paddingLeft:'20px', borderLeft:`1px solid ${iconColor}`, animation: 'fadeIn 0.3s'}}>
                {dept.roles.map((role, idx) => (
                  <div key={idx} style={{marginBottom:'20px', paddingTop:'10px'}}>
                    <div style={{color:'#94a3b8', fontSize:'0.85rem', marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px', textTransform:'uppercase'}}>
                       <ShieldCheck size={14}/> {role.name}
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'10px'}}>
                      {role.users.map(u => (
                        <div key={u.id} style={{
                          background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', 
                          padding: '10px', minWidth: '240px', display:'flex', flexDirection:'column',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:'600', color:'#f1f5f9'}}>
                             {/* Bolinha Azul Padrão (Roxo se for Board) */}
                             <div style={{width:8, height:8, background: isBoard ? '#6366f1' : '#10b981', borderRadius:'50%'}}></div>
                             {u.name}
                          </div>
                          {u.manager ? (
                             <div style={{fontSize:'0.75rem', color:'#64748b', marginTop:'6px', display:'flex', gap:'4px', alignItems:'center'}}>
                               <span style={{opacity:0.6}}>Gestor:</span> <span style={{color:'#cbd5e1'}}>{u.manager.name.split(' ')[0]}</span>
                             </div>
                          ) : (
                             <div style={{fontSize:'0.75rem', color: isBoard ? '#f59e0b' : '#6366f1', marginTop:'6px', fontWeight:'bold'}}>★ Executivo</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const ToolCatalog = () => (
    <div className="card">
      <h3 style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'}}><Server size={22} color="#0ea5e9"/> Ferramentas</h3>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead><tr style={{background: '#1e293b', textAlign: 'left', fontSize: '0.85rem', color:'#94a3b8'}}><th style={{padding: '15px'}}>FERRAMENTA</th><th style={{padding: '15px'}}>OWNER</th><th style={{padding: '15px'}}>ACESSOS</th></tr></thead>
        <tbody>
          {tools.map(t => (
            <tr key={t.id} style={{borderBottom: '1px solid #334155'}}>
              <td style={{padding: '15px', fontWeight: '600', color:'#f1f5f9'}}>{t.name}</td>
              <td style={{padding: '15px', color: '#cbd5e1'}}>{t.owner?.name || '-'}</td>
              <td style={{padding: '15px'}}><div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>{t.accessLevels?.create?.map((lvl: any, i: number) => (<span key={i} style={{background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem'}}>{lvl.name}</span>))}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!currentUser) return <div className="app-layout" style={{justifyContent:'center', alignItems:'center'}}>Carregando...</div>;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand"><ShieldCheck size={28} /> THERIS <span>IGA</span></div>
        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}><LayoutDashboard size={18} /> Visão Geral</div>
          <div className={`nav-item ${activeTab === 'REQUESTS' ? 'active' : ''}`} onClick={() => setActiveTab('REQUESTS')}><Clock size={18} /> Solicitações</div>
          <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Auditoria</div>
          <div style={{height: '1px', background: '#334155', margin: '15px 0'}}></div>
          <div className={`nav-item ${activeTab === 'ORG' ? 'active' : ''}`} onClick={() => setActiveTab('ORG')}><Users size={18} /> Organograma</div>
          <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => setActiveTab('TOOLS')}><Server size={18} /> Ferramentas</div>
        </nav>
      </aside>

      <main className="main-area">
        <header className="header-bar">
          <div><h2 style={{fontSize: '1.5rem', fontWeight: 600, color: 'white'}}>Painel de Governança</h2><p style={{color: '#94a3b8', fontSize: '0.9rem', marginTop:'4px'}}>Bem-vindo, {currentUser.name}</p></div>
          <div className="simulator-box"><span style={{fontSize: '0.8rem', color: '#64748b', fontWeight: 600}}>SIMULAR:</span><select className="user-selector" style={{background:'#1e293b', border:'none', color:'white', padding:'5px', borderRadius:'4px', width:'200px'}} value={currentUser.id} onChange={(e) => { const u = allUsers.find(x => x.id === e.target.value); if (u) setCurrentUser(u); }}>{allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        </header>

        {activeTab === 'DASHBOARD' && (
          <>
            <div className="stats-row">
              <div className="stat-box"><div className="stat-title">Pendentes</div><div className="stat-val" style={{color: '#f59e0b'}}>{requests.filter(r => r.status.includes('PENDENTE')).length}</div></div>
              <div className="stat-box"><div className="stat-title">Aprovados</div><div className="stat-val" style={{color: '#10b981'}}>{requests.filter(r => r.status === 'APROVADO').length}</div></div>
              <div className="stat-box"><div className="stat-title">Colaboradores</div><div className="stat-val">{allUsers.length}</div></div>
              <div className="stat-box"><div className="stat-title">Ferramentas</div><div className="stat-val">{tools.length}</div></div>
            </div>
            <div className="card">
              <h3 style={{marginBottom: '20px'}}>Nova Solicitação</h3>
              <form onSubmit={handleCreateRequest} style={{display: 'flex', gap: '15px', alignItems: 'flex-end'}}>
                <div style={{flex: 1}}><label>Tipo</label><select value={formType} onChange={e => { setFormType(e.target.value); setFormDetails(''); }}><option value="CHANGE_ROLE">👔 Mudança de Cargo</option><option value="ACCESS_TOOL">💻 Acesso a Ferramenta</option></select></div>
                <div style={{flex: 2}}><label>Detalhes</label>{formType === 'ACCESS_TOOL' ? <select value={formDetails} onChange={e => setFormDetails(e.target.value)}><option value="">-- Selecione --</option>{tools.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select> : <input placeholder="Ex: Novo Cargo" value={formDetails} onChange={e => setFormDetails(e.target.value)} />}</div>
                <div style={{flex: 2}}><label>Justificativa</label><input placeholder="Compliance..." value={formJustification} onChange={e => setFormJustification(e.target.value)} /></div>
                <button type="submit" className="primary-btn">Enviar</button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'ORG' && <OrgChart />}
        {activeTab === 'TOOLS' && <ToolCatalog />}

        {(activeTab === 'REQUESTS' || activeTab === 'HISTORY') && (
          <div className="card">
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}><h3>{activeTab === 'REQUESTS' ? 'Fila de Aprovação' : 'Log de Auditoria'}</h3></div>
             <table style={{width: '100%', borderCollapse: 'collapse'}}>
               <thead><tr style={{textAlign: 'left', borderBottom: '1px solid #334155', color:'#94a3b8'}}><th style={{padding: '15px'}}>SOLICITANTE</th><th style={{padding: '15px'}}>DETALHES</th><th style={{padding: '15px'}}>STATUS</th>{activeTab === 'REQUESTS' && <th style={{padding: '15px', textAlign: 'right'}}>AÇÃO</th>}</tr></thead>
               <tbody>
                 {requests.filter(r => { const isClosed = r.status === 'APROVADO' || r.status === 'REPROVADO'; return activeTab === 'REQUESTS' ? !isClosed : isClosed; }).map(r => (
                   <tr key={r.id} style={{borderBottom: '1px solid #1e293b'}}>
                     <td style={{padding: '15px', color:'#f8fafc'}}>{r.requester.name}</td>
                     <td style={{padding: '15px', color: '#cbd5e1'}}>{JSON.parse(r.details).info}</td>
                     <td style={{padding: '15px'}}><span className={`badge ${r.status.includes('PENDENTE') ? 'PENDENTE' : r.status}`}>{r.status.replace('_', ' ')}</span></td>
                     {activeTab === 'REQUESTS' && (<td style={{padding: '15px', textAlign: 'right'}}><div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}><button onClick={() => handleApprove(r.id, 'APROVAR')} className="btn-icon btn-approve"><CheckCircle size={18} /></button><button onClick={() => handleApprove(r.id, 'REPROVAR')} className="btn-icon btn-reject"><XCircle size={18} /></button></div></td>)}
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </main>
    </div>
  );
}