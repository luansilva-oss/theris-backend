import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, Server, FileText, LogOut, Bird,
  ArrowLeft, Shield, CheckCircle, XCircle, Clock, Crown,
  Search, Lock, Layers, ChevronDown, ChevronRight,
  Users, Building, Briefcase, // Ícone para Gestão de Pessoas
  Pen, PlusCircle, Edit2, Timer, Zap, ShieldCheck, RefreshCw, Activity, Trash2, Settings, Plus, MessageSquare, Filter
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
import PersonnelListView from './components/PersonnelListView';
import { EditDepartmentModal } from './components/EditDepartmentModal';
import { DeleteDepartmentModal } from './components/DeleteDepartmentModal';
import { EditRoleKitModal } from './components/EditRoleKitModal';
import { DeleteRoleModal } from './components/DeleteRoleModal';
import { ToastContainer, Toast } from './components/ToastContainer';
import { CustomConfirmModal } from './components/CustomConfirmModal';
import { API_URL } from './config';

// --- TYPES ---
interface User {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  department?: string;
  unit?: string;
  systemProfile: string;
  managerId?: string | null;
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
  accessLevelDescriptions?: any;
  criticality?: string;
  isCritical?: boolean;
  accesses?: {
    id: string;
    user: User;
    status: string;
    isExtraordinary: boolean;
    duration?: number;
    unit?: string;
  }[];
  /** Sincronização KBS: membros permanentes por nível (Gestão de Pessoas) */
  kbsMembersByLevel?: { level: string; users: { id: string; name: string; email: string }[] }[];
  /** KBS por Cargo: cargos (roles) que têm a ferramenta como padrão, nível e colaboradores */
  kbsByRole?: { roleId: string; roleName: string; departmentName: string; accessLevelDesc: string; userCount: number; users: { id: string; name: string; email: string }[] }[];
  /** Sincronização Aprovações: tickets de acesso extraordinário aprovados */
  extraordinaryApprovals?: { id: string; requesterName: string; requesterEmail?: string; level: string; approvedAt: string; justification: string | null }[];
}

interface RequestComment {
  id: string;
  body: string;
  kind: string;
  createdAt: string;
  author?: User | null;
}
interface RequestAttachment {
  id: string;
  filename: string;
  fileUrl: string;
  mimeType?: string | null;
  createdAt: string;
  uploadedBy?: { id: string; name: string } | null;
}
interface Request {
  id: string;
  details: string;
  justification?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  requester: User;
  approver?: User;
  approverId?: string | null;
  assignee?: User;
  assigneeId?: string | null;
  type: string;
  adminNote?: string;
  scheduledAt?: string | null;
  comments?: RequestComment[];
  attachments?: RequestAttachment[];
}

type SystemProfile = 'SUPER_ADMIN' | 'ADMIN' | 'APPROVER' | 'VIEWER' | 'GESTOR';

const SESSION_DURATION = 3 * 60 * 60 * 1000; // 3 Horas

// Tipos por categoria para cards de aprovação (Visão Geral)
const ACCESS_REQUEST_TYPES = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
const PEOPLE_REQUEST_TYPES = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
const INFRA_REQUEST_TYPES = ['INFRA_SUPPORT'];

// Labels de status padronizados em toda a UI
const STATUS_LABELS: Record<string, string> = {
  PENDENTE_GESTOR: 'Pendente (gestor)',
  PENDENTE_SUB_OWNER: 'Pendente (sub-responsável)',
  PENDENTE_SI: 'Pendente (SI)',
  PENDENTE_OWNER: 'Pendente (responsável)',
  EM_ATENDIMENTO: 'Em atendimento',
  AGENDADO: 'Agendado',
  APROVADO: 'Aprovado',
  REPROVADO: 'Recusado',
};
function getStatusLabel(status: string): string {
  if (!status) return '—';
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  if (status.startsWith('PENDENTE_')) return 'Pendente';
  return status;
}

function getRequestCardContent(r: Request): { category: 'Acessos' | 'Pessoas' | 'Infra'; categoryColor: string; title: string; lines: { label: string; value: string }[] } {
  let detailsObj: Record<string, unknown> = {};
  try {
    detailsObj = typeof r.details === 'string' ? JSON.parse(r.details || '{}') : (r.details || {});
  } catch (_) {}
  const d = detailsObj as Record<string, string | Record<string, string> | undefined>;

  // Infra: problema/solicitação e prioridade
  if (INFRA_REQUEST_TYPES.includes(r.type)) {
    const title = (d.requestTypeLabel as string) || (d.requestType as string) || 'Suporte Infra';
    const lines: { label: string; value: string }[] = [];
    if (d.urgencyLabel || d.urgency) lines.push({ label: 'Prioridade', value: (d.urgencyLabel as string) || (d.urgency as string) || '—' });
    if (d.description) lines.push({ label: 'Problema / Solicitação', value: (d.description as string).slice(0, 300) });
    return { category: 'Infra', categoryColor: '#fbbf24', title, lines };
  }

  // Indicar Deputy do /acessos: categoria Acessos, título e linhas específicos
  if (r.type === 'DEPUTY_DESIGNATION' && d.tool) {
    const toolName = (d.tool as string) || '—';
    const title = `Indicar Deputy: ${toolName}`;
    const lines: { label: string; value: string }[] = [];
    const subName = (d.substituteName as string) || (d.substitute as string) || '';
    const subEmail = (d.substituteEmail as string) || '';
    const subDisplay = subName && subEmail ? `${subName} (${subEmail})` : subName || subEmail || '—';
    lines.push({ label: 'Substituto', value: subDisplay });
    lines.push({ label: 'Ferramenta', value: toolName });
    const justification = (d.justification as string) || r.justification;
    if (justification) lines.push({ label: 'Justificativa', value: justification });
    return { category: 'Acessos', categoryColor: '#a78bfa', title, lines };
  }

  // Pessoas: ação de RH, colaborador e mudança
  if (PEOPLE_REQUEST_TYPES.includes(r.type)) {
    const actionLabels: Record<string, string> = {
      CHANGE_ROLE: 'Mudança de Cargo',
      HIRING: 'Contratação',
      FIRING: 'Desligamento',
      DEPUTY_DESIGNATION: 'Indicar Deputy'
    };
    const actionLabel = actionLabels[r.type] || r.type;
    const collaborator = (d.collaboratorName as string) || (d.substitute as string) || (d.info as string)?.replace(/^[^:]+:\s*/, '') || '—';
    const title = `${actionLabel}: ${collaborator}`;
    const lines: { label: string; value: string }[] = [];

    if (r.type === 'CHANGE_ROLE') {
      const curr = d.current as Record<string, string> | undefined;
      const fut = d.future as Record<string, string> | undefined;
      if (curr?.role || curr?.dept) lines.push({ label: 'Situação atual', value: [curr?.role, curr?.dept].filter(Boolean).join(' / ') });
      if (fut?.role || fut?.dept) lines.push({ label: 'Nova situação', value: [fut?.role, fut?.dept].filter(Boolean).join(' / ') });
      if (d.reason) lines.push({ label: 'Motivo', value: d.reason as string });
    }
    if (r.type === 'HIRING') {
      if (d.startDate) lines.push({ label: 'Data de início', value: d.startDate as string });
      if (d.role) lines.push({ label: 'Cargo', value: d.role as string });
      if (d.dept) lines.push({ label: 'Departamento', value: d.dept as string });
      if (d.obs) lines.push({ label: 'Observação', value: d.obs as string });
    }
    if (r.type === 'FIRING') {
      if (d.role) lines.push({ label: 'Cargo', value: d.role as string });
      if (d.dept) lines.push({ label: 'Departamento', value: d.dept as string });
      if (d.reason) lines.push({ label: 'Motivo', value: d.reason as string });
    }
    if (r.type === 'DEPUTY_DESIGNATION' && !d.tool) {
      if (d.role) lines.push({ label: 'Cargo', value: d.role as string });
      if (d.dept) lines.push({ label: 'Departamento', value: d.dept as string });
      if (r.justification) lines.push({ label: 'Justificativa', value: r.justification });
    }
    return { category: 'Pessoas', categoryColor: '#34d399', title, lines };
  }

  // Acessos: ferramenta, nível e justificativa (ou nova ferramenta com os 5 campos)
  if (ACCESS_REQUEST_TYPES.includes(r.type) || (r.type === 'DEPUTY_DESIGNATION' && d.tool)) {
    const isNewTool = r.type === 'ACCESS_TOOL' && (d.toolName || (d.info as string)?.toLowerCase().includes('nova ferramenta'));
    const title = isNewTool ? (d.toolName as string) || (d.info as string) || 'Nova ferramenta' : (d.tool as string) || (d.info as string) || r.type;
    const lines: { label: string; value: string }[] = [];

    if (isNewTool) {
      if (d.owner) lines.push({ label: 'Owner', value: d.owner as string });
      if (d.subOwner) lines.push({ label: 'Sub-Owner', value: d.subOwner as string });
      if (d.description) lines.push({ label: 'Descrição', value: (d.description as string).slice(0, 200) });
      if (d.accessLevels) lines.push({ label: 'Níveis de acesso', value: (d.accessLevels as string).slice(0, 200) });
    } else {
      if (d.target) lines.push({ label: 'Nível desejado', value: d.target as string });
      if (d.beneficiary) lines.push({ label: 'Beneficiário', value: d.beneficiary as string });
      if (d.duration != null && d.unit) lines.push({ label: 'Duração', value: `${d.duration} ${d.unit}` });
    }
    if (r.justification) lines.push({ label: 'Justificativa', value: r.justification });
    return { category: 'Acessos', categoryColor: '#a78bfa', title, lines };
  }

  // Fallback genérico
  const title = (d.info as string) || r.type;
  const lines: { label: string; value: string }[] = [];
  if (d.info && d.info !== title) lines.push({ label: 'Resumo', value: d.info as string });
  if (r.justification) lines.push({ label: 'Justificativa', value: r.justification });
  return { category: 'Acessos', categoryColor: '#a78bfa', title, lines };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const s = localStorage.getItem('theris_user'); return s ? JSON.parse(s) : null;
  });
  const [systemProfile, setSystemProfile] = useState<SystemProfile>(() => (localStorage.getItem('theris_profile') as SystemProfile) || 'VIEWER');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('theris_activeTab') || 'DASHBOARD');

  // DADOS
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Lista de colaboradores
  const [units, setUnits] = useState<any[]>([]); // Estrutura Unit -> Department -> Role (da API)
  const [departments, setDepartments] = useState<any[]>([]); // Lista plana (derivada de units) para modais
  const [roles, setRoles] = useState<any[]>([]); // Lista plana (derivada de units) para modais

  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // FILTROS
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'THERIS' | 'INFRA'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APROVADO' | 'REPROVADO' | 'PENDENTE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const REQUEST_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'ACCESS_TOOL', label: 'Kit Padrão / Acesso Ferramenta' },
    { value: 'ACCESS_CHANGE', label: 'Alteração de Acesso' },
    { value: 'ACCESS_TOOL_EXTRA', label: 'Kit Especial / Acesso Extraordinário' },
    { value: 'CHANGE_ROLE', label: 'Mudança de Cargo' },
    { value: 'HIRING', label: 'Contratação' },
    { value: 'FIRING', label: 'Desligamento' },
    { value: 'DEPUTY_DESIGNATION', label: 'Indicar Deputy' },
    { value: 'INFRA_SUPPORT', label: 'Suporte Infra / TI' },
    { value: '__OTHER__', label: 'Outros' }
  ];
  const [typeFilterEnabled, setTypeFilterEnabled] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    REQUEST_TYPE_OPTIONS.forEach(opt => { o[opt.value] = true; });
    return o;
  });
  const COLUMN_OPTIONS: { key: string; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'assunto', label: 'Assunto' },
    { key: 'status', label: 'Status' },
    { key: 'solicitante', label: 'Solicitante' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'data', label: 'Data' },
    { key: 'observacao', label: 'Observação' },
    { key: 'justificativa', label: 'Justificativa' },
    { key: 'detalhes', label: 'Detalhes (campos do Slack)' }
  ];
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    COLUMN_OPTIONS.forEach(c => { o[c.key] = true; });
    return o;
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [actionNeededFilter, setActionNeededFilter] = useState<'ALL' | 'Pessoas' | 'Acessos' | 'Infra'>('ALL');

  // Gestão de Chamados
  const [ticketList, setTicketList] = useState<Request[]>([]);
  const [ticketCategoryTab, setTicketCategoryTab] = useState<'Todos' | 'Pessoas' | 'Acessos' | 'Infra'>('Todos');
  const [showTicketFilterPanel, setShowTicketFilterPanel] = useState(false);
  const [ticketFilters, setTicketFilters] = useState<{
    status: string;
    requesterSearch: string;
    assigneeId: string;
    period: string;
    startDate: string;
    endDate: string;
  }>({ status: 'ALL', requesterSearch: '', assigneeId: '', period: 'ALL', startDate: '', endDate: '' });
  const [selectedChamadoId, setSelectedChamadoId] = useState<string | null>(null);
  const [chamadoDetail, setChamadoDetail] = useState<Request | null>(null);
  const [chamadoDetailLoading, setChamadoDetailLoading] = useState(false);
  const [chamadoCommentInput, setChamadoCommentInput] = useState('');
  const [chamadoCommentKind, setChamadoCommentKind] = useState<'COMMENT' | 'SOLUTION' | 'SCHEDULED_TASK'>('COMMENT');
  const [chamadoAttachmentUploading, setChamadoAttachmentUploading] = useState(false);
  const chamadoFileInputRef = useRef<HTMLInputElement>(null);

  // MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'aprovar' | 'reprovar' | 'pendente'>('aprovar');
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);

  // EDIT MODAL
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedAccess, setSelectedAccess] = useState<any>(null);
  const [isEditAccessModalOpen, setIsEditAccessModalOpen] = useState(false);
  const [isManageStructureOpen, setIsManageStructureOpen] = useState(false);
  const [selectedStructureDept, setSelectedStructureDept] = useState<string | null>(null);
  const [isManageLevelModalOpen, setIsManageLevelModalOpen] = useState(false);
  const [selectedLevelName, setSelectedLevelName] = useState<string | null>(null);
  const [isEditDeptModalOpen, setIsEditDeptModalOpen] = useState(false);
  const [isDeleteDeptModalOpen, setIsDeleteDeptModalOpen] = useState(false);
  const [selectedDeptForAction, setSelectedDeptForAction] = useState<any>(null);
  const [isEditRoleKitModalOpen, setIsEditRoleKitModalOpen] = useState(false);
  const [selectedRoleForKit, setSelectedRoleForKit] = useState<any>(null);
  const [selectedDepartmentForNewRole, setSelectedDepartmentForNewRole] = useState<any>(null);
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false);
  const [selectedRoleForDelete, setSelectedRoleForDelete] = useState<any>(null);

  /** Painel Viewer: ferramentas do Meu Kit Básico (RoleKitItem do cargo do usuário) */
  const [viewerKitTools, setViewerKitTools] = useState<{ id: string; toolName: string; toolCode: string; accessLevelDesc: string }[]>([]);

  // NOTIFICAÇÕES E CONFIRMAÇÕES
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const customConfirm = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmLabel?: string;
  }) => {
    setConfirmConfig({ ...config, isOpen: true });
  };

  // Stats
  const stats = {
    pending: requests.filter(r => {
      if (!r.status.includes('PENDENTE')) return false;
      if (systemProfile === 'VIEWER') return r.requester.id === currentUser?.id;
      return true;
    }).length,
    approved: requests.filter(r => {
      if (r.status !== 'APROVADO') return false;
      if (systemProfile === 'VIEWER') return r.requester.id === currentUser?.id;
      return true;
    }).length,
    total: requests.filter(r => {
      if (systemProfile === 'VIEWER') return r.requester.id === currentUser?.id;
      return true;
    }).length,
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
          showToast("Sessão expirada.", "warning"); handleLogout();
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

      // Carrega usuários se estiver na aba de gestão ou Gestão de Chamados (para select Responsável)
      if (activeTab === 'PEOPLE' || activeTab === 'TICKETS') {
        const resUsers = await fetch(`${API_URL}/api/users`);
        if (resUsers.ok) setAllUsers(await resUsers.json());
      }
      if (activeTab === 'PEOPLE') {
        const resDepts = await fetch(`${API_URL}/api/structure`);
        if (resDepts.ok) {
          const structData = await resDepts.json();
          const unitList = structData.units || [];
          setUnits(unitList);
          setDepartments(unitList.flatMap((u: any) => u.departments || []));
          setRoles(unitList.flatMap((u: any) => (u.departments || []).flatMap((d: any) => d.roles || [])));
        }
      }

    } catch (e) { console.error(e); }
  };

  const loadTicketList = async () => {
    const isMyTickets = activeTab === 'MY_TICKETS';
    try {
      const params = new URLSearchParams();
      if (ticketFilters.status && ticketFilters.status !== 'ALL') params.set('status', ticketFilters.status);
      if (!isMyTickets && ticketFilters.assigneeId) params.set('assigneeId', ticketFilters.assigneeId);
      if (!isMyTickets && ticketFilters.requesterSearch.trim()) params.set('requester', ticketFilters.requesterSearch.trim());
      if (ticketCategoryTab !== 'Todos') params.set('category', ticketCategoryTab);
      if (ticketFilters.period === 'TODAY') {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        params.set('startDate', d.toISOString());
        params.set('endDate', new Date().toISOString());
      } else if (ticketFilters.period === 'LAST_7') {
        const end = new Date();
        const start = new Date(); start.setDate(start.getDate() - 7);
        params.set('startDate', start.toISOString());
        params.set('endDate', end.toISOString());
      } else if (ticketFilters.period === 'LAST_30') {
        const end = new Date();
        const start = new Date(); start.setDate(start.getDate() - 30);
        params.set('startDate', start.toISOString());
        params.set('endDate', end.toISOString());
      } else if (ticketFilters.startDate) params.set('startDate', ticketFilters.startDate);
      if (ticketFilters.endDate) params.set('endDate', ticketFilters.endDate);
      const url = isMyTickets ? `${API_URL}/api/solicitacoes/my-tickets?${params.toString()}` : `${API_URL}/api/solicitacoes?${params.toString()}`;
      const headers: HeadersInit = {};
      if (isMyTickets && currentUser?.id) headers['x-user-id'] = currentUser.id;
      const res = await fetch(url, { headers });
      if (res.ok) setTicketList(await res.json());
      else setTicketList([]);
    } catch (e) {
      setTicketList([]);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    if (isLoggedIn && (activeTab === 'TICKETS' || activeTab === 'MY_TICKETS')) loadTicketList();
  }, [isLoggedIn, activeTab, ticketCategoryTab]);

  /** Carrega Meu Kit Básico para perfil VIEWER no Dashboard */
  useEffect(() => {
    if (!isLoggedIn || systemProfile !== 'VIEWER' || activeTab !== 'DASHBOARD' || !currentUser?.id) {
      if (systemProfile !== 'VIEWER') setViewerKitTools([]);
      return;
    }
    const headers: HeadersInit = { 'x-user-id': currentUser.id };
    fetch(`${API_URL}/api/users/me/tools`, { headers })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setViewerKitTools(Array.isArray(data) ? data : []))
      .catch(() => setViewerKitTools([]));
  }, [isLoggedIn, systemProfile, activeTab, currentUser?.id]);

  const loadChamadoDetail = async () => {
    if (!selectedChamadoId) return;
    setChamadoDetailLoading(true);
    try {
      const isViewerContext = activeTab === 'MY_TICKETS';
      const headers: HeadersInit = {};
      if (isViewerContext && currentUser?.id) {
        headers['x-context'] = 'my-tickets';
        headers['x-user-id'] = currentUser.id;
      }
      const res = await fetch(`${API_URL}/api/solicitacoes/${selectedChamadoId}`, { headers });
      if (res.ok) setChamadoDetail(await res.json());
      else setChamadoDetail(null);
    } catch {
      setChamadoDetail(null);
    }
    setChamadoDetailLoading(false);
  };

  useEffect(() => {
    if (selectedChamadoId) loadChamadoDetail();
    else setChamadoDetail(null);
  }, [selectedChamadoId, activeTab]);

  const handleChamadoMetadataChange = async (field: 'status' | 'assigneeId' | 'scheduledAt', value: string | null) => {
    if (!selectedChamadoId) return;
    try {
      const body: any = {};
      if (field === 'status') body.status = value;
      if (field === 'assigneeId') body.assigneeId = value || null;
      if (field === 'scheduledAt') body.scheduledAt = value ? new Date(value).toISOString() : null;
      const res = await fetch(`${API_URL}/api/solicitacoes/${selectedChamadoId}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const updated = await res.json();
        setChamadoDetail(prev => prev ? { ...prev, ...updated } : updated);
        loadTicketList();
      }
    } catch (e) {
      showToast('Erro ao atualizar.', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!selectedChamadoId || !chamadoCommentInput.trim()) return;
    const kind = activeTab === 'MY_TICKETS' ? 'COMMENT' : chamadoCommentKind;
    try {
      const res = await fetch(`${API_URL}/api/solicitacoes/${selectedChamadoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: chamadoCommentInput.trim(), kind, authorId: currentUser?.id })
      });
      if (res.ok) {
        const comment = await res.json();
        setChamadoDetail(prev => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : prev);
        setChamadoCommentInput('');
        showToast('Comentário adicionado.', 'success');
      } else showToast('Erro ao adicionar comentário.', 'error');
    } catch {
      showToast('Erro de conexão.', 'error');
    }
  };

  const handleChamadoAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChamadoId) return;
    e.target.value = '';
    setChamadoAttachmentUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string)?.split(',')[1];
        if (!base64) { setChamadoAttachmentUploading(false); showToast('Falha ao ler arquivo.', 'error'); return; }
        const res = await fetch(`${API_URL}/api/solicitacoes/${selectedChamadoId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, fileBase64: base64, mimeType: file.type || null, uploadedById: currentUser?.id || null })
        });
        if (res.ok) {
          const attachment = await res.json();
          setChamadoDetail(prev => prev ? { ...prev, attachments: [...(prev.attachments || []), attachment] } : prev);
          showToast('Documento anexado.', 'success');
        } else showToast('Erro ao anexar.', 'error');
        setChamadoAttachmentUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Erro de conexão.', 'error');
      setChamadoAttachmentUploading(false);
    }
  };

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
          showToast(data.error, "error");
          setIsLoading(false);
        }
      } catch (e) {
        showToast("Erro de conexão.", "error");
        setIsLoading(false);
      }
    },
    onError: () => setIsLoading(false)
  });

  const handleMfaVerify = async () => {
    if (mfaCode.length < 6) return showToast("Digite o código de 6 dígitos.", "warning");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-mfa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser?.id, code: mfaCode }) });
      const data = await res.json();
      if (res.ok && data.valid) {
        localStorage.setItem('theris_user', JSON.stringify(currentUser));
        localStorage.setItem('theris_profile', systemProfile);
        localStorage.setItem('theris_session_start', Date.now().toString());
        setIsLoggedIn(true); setIsMfaRequired(false);
        showToast("Bem-vindo de volta!", "success");
      } else {
        showToast(data.error || "Código inválido.", "error"); setMfaCode('');
      }
    } catch (e) { showToast("Erro ao verificar.", "error"); }
    setIsLoading(false);
  };

  const handleMfaChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 6);
    setMfaCode(clean);
  };

  const handleLogout = () => { localStorage.clear(); setIsLoggedIn(false); setCurrentUser(null); setActiveTab('DASHBOARD'); setSelectedTool(null); setIsMfaRequired(false); };

  const handleDeleteTool = async (id: string) => {
    customConfirm({
      title: "Excluir Ferramenta?",
      message: "🚨 TEM CERTEZA? Isso excluirá permanentemente esta ferramenta e todos os seus históricos de acesso!",
      isDestructive: true,
      confirmLabel: "Sim, Excluir",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/api/tools/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedTool(null);
            loadData();
            showToast("Ferramenta excluída.", "success");
          } else {
            showToast("Erro ao excluir ferramenta.", "error");
          }
        } catch (e) {
          showToast("Erro de rede.", "error");
        }
      }
    });
  };

  const handleOpenApprove = (id: string, action: 'APROVAR' | 'REPROVAR' | 'PENDENTE') => {
    setModalTargetId(id);
    setModalAction(action.toLowerCase() as any);
    setModalOpen(true);
  };

  const handleConfirmApprove = async (note: string) => {
    if (!modalTargetId) return;

    if (modalAction === 'reprovar' && !note.trim()) {
      showToast("⚠️ Para recusar, é obrigatório informar o motivo.", "warning");
      return;
    }

    const apiStatus = modalAction === 'aprovar' ? 'APROVAR' : (modalAction === 'pendente' ? 'PENDENTE_GESTOR' : 'REPROVAR');

    try {
      const res = await fetch(`${API_URL}/api/solicitacoes/${modalTargetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: apiStatus,
          approverId: currentUser?.id,
          adminNote: note
        })
      });

      if (res.ok) {
        loadData();
        setModalOpen(false);
        setModalTargetId(null);
        showToast(`Solicitação ${modalAction === 'aprovar' ? 'aprovada' : modalAction === 'pendente' ? 'marcada como pendente' : 'reprovada'} com sucesso!`, "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Erro ao processar solicitação.", "error");
      }
    } catch (e) {
      showToast("Erro de conexão ao processar solicitação.", "error");
    }
  };

  const getGroupedAccesses = (tool: Tool) => {
    const fromKbs = (tool.kbsMembersByLevel && tool.kbsMembersByLevel.length > 0);
    const permanent: Record<string, { user: User }[]> = {};

    if (fromKbs) {
      for (const { level, users } of tool.kbsMembersByLevel!) {
        permanent[level] = users.map(u => ({ user: { id: u.id, name: u.name, email: u.email } as User }));
      }
    } else {
      const levels = tool.availableAccessLevels || [];
      levels.forEach(lvl => { permanent[lvl] = []; });
      (tool.accesses || []).filter(a => !a.isExtraordinary).forEach(curr => {
        const level = curr.status;
        if (!permanent[level]) permanent[level] = [];
        permanent[level].push(curr);
      });
    }

    const extraordinary = (tool.accesses || []).filter(a => a.isExtraordinary);
    const extraordinaryApprovals = tool.extraordinaryApprovals || [];
    return { permanent, extraordinary, extraordinaryApprovals };
  };

  const handleDeleteUser = async (userToDelete: User) => {
    customConfirm({
      title: "Excluir Colaborador?",
      message: `Tem certeza que deseja excluir o usuário ${userToDelete.name}?`,
      isDestructive: true,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/api/users/${userToDelete.id}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            setAllUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            if (selectedUser?.id === userToDelete.id) setSelectedUser(null);
            showToast("Colaborador removido.", "success");
          } else {
            const data = await res.json();
            showToast(data.error || "Erro ao excluir usuário.", "error");
          }
        } catch (error) {
          showToast("Erro ao excluir usuário.", "error");
        }
      }
    });
  };

  const getGroupedPeople = () => {
    const grouped: Record<string, Record<string, User[]>> = {};
    departments.forEach((d: any) => {
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

  const handleManagerChange = async (userId: string, newManagerId: string | null) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-requester-id': currentUser?.id || ''
        },
        body: JSON.stringify({ managerId: newManagerId })
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Erro ao reatribuir gestor.", "error");
        loadData(); // Reverte visualmente se falhar
      } else {
        showToast("Hierarquia atualizada!", "success");
        loadData();
      }
    } catch (e) {
      showToast("Erro de conexão ao alterar hierarquia.", "error");
      loadData();
    }
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
          {(['SUPER_ADMIN', 'GESTOR', 'ADMIN', 'APPROVER'].includes(systemProfile)) ? (
            <>
              <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null) }}><LayoutDashboard size={18} /> Visão Geral</div>
              {systemProfile !== 'APPROVER' && (
                <>
                  <div className={`nav-item ${activeTab === 'PEOPLE' ? 'active' : ''}`} onClick={() => setActiveTab('PEOPLE')}><Users size={18} /> Gestão de Pessoas</div>
                  <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { setActiveTab('TOOLS'); setSelectedTool(null) }}><Layers size={18} /> Catálogo</div>
                </>
              )}
              <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Solicitações</div>
              <div className={`nav-item ${activeTab === 'TICKETS' ? 'active' : ''}`} onClick={() => setActiveTab('TICKETS')}><MessageSquare size={18} /> Gestão de Chamados</div>
            </>
          ) : (
            <>
              <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { setActiveTab('DASHBOARD'); setSelectedTool(null) }}><LayoutDashboard size={18} /> Meu Painel</div>
              <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}><FileText size={18} /> Solicitações</div>
              <div className={`nav-item ${activeTab === 'MY_TICKETS' ? 'active' : ''}`} onClick={() => { setActiveTab('MY_TICKETS'); setSelectedChamadoId(null); setChamadoDetail(null); }}><MessageSquare size={18} /> Chamados relacionados</div>
            </>
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
          <div className="page-title">Pagina: <span>{activeTab === 'TOOLS' && selectedTool ? selectedTool.name : activeTab === 'PEOPLE' ? 'GESTÃO DE PESSOAS' : activeTab === 'MY_TICKETS' ? 'CHAMADOS RELACIONADOS' : activeTab}</span></div>
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

              {/* Viewer: meu perfil (gestor, cargo, departamento, kit básico) */}
              {systemProfile === 'VIEWER' && currentUser && (
                <div className="card-base" style={{ gridColumn: '1 / -1', padding: 24, border: '1px solid #27272a' }}>
                  <h3 style={{ color: '#a78bfa', marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} /> Meu perfil
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>Gestor direto</div>
                      <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{allUsers.find(u => u.id === currentUser.id)?.manager?.name || currentUser.manager?.name || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>Cargo</div>
                      <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{currentUser.jobTitle || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>Departamento</div>
                      <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{currentUser.department || '—'}</div>
                    </div>
                  </div>
                  </div>
              )}

              {/* Viewer: Meu Kit Básico (fonte única: GET /api/users/me/tools) */}
              {systemProfile === 'VIEWER' && currentUser && (
                <div className="card-base" style={{ gridColumn: '1 / -1', padding: 24, border: '1px solid #27272a' }}>
                  <h3 style={{ color: '#22c55e', marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={18} /> Meu Kit Básico
                  </h3>
                  {viewerKitTools.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 24px', color: '#71717a', fontSize: 14, lineHeight: 1.5 }}>
                      Seu gestor ainda está configurando os acessos do seu cargo. Quando o kit básico for definido na Gestão de Pessoas, as ferramentas e níveis aparecerão aqui.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left' }}>
                            <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Ferramenta</th>
                            <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Nível de acesso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewerKitTools.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid #1f1f22' }}>
                              <td style={{ padding: '14px 16px', color: '#e4e4e7', fontWeight: 500 }}>{row.toolName}</td>
                              <td style={{ padding: '14px 16px', color: '#a1a1aa' }}>{row.accessLevelDesc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

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
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {(['ALL', 'Pessoas', 'Acessos', 'Infra'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setActionNeededFilter(f)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: '1px solid #27272a',
                          background: actionNeededFilter === f ? (f === 'Infra' ? 'rgba(251, 191, 36, 0.2)' : f === 'Acessos' ? 'rgba(167, 139, 250, 0.2)' : f === 'Pessoas' ? 'rgba(52, 211, 153, 0.2)' : '#27272a') : '#18181b',
                          color: actionNeededFilter === f ? (f === 'Infra' ? '#fbbf24' : f === 'Acessos' ? '#a78bfa' : f === 'Pessoas' ? '#34d399' : '#e4e4e7') : '#71717a',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {f === 'ALL' ? 'Todos' : f}
                      </button>
                    ))}
                  </div>
                  <div className="action-tiles-wrap">
                    {(() => {
                      const pendingForMe = requests.filter(r => {
                        if (!r.status.includes('PENDENTE')) return false;
                        return r.approverId === currentUser?.id || r.approverId == null;
                      });
                      const byCategory = actionNeededFilter === 'ALL' ? pendingForMe : pendingForMe.filter(r => getRequestCardContent(r).category === actionNeededFilter);
                      if (byCategory.length === 0) {
                        return <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 14 }}>{pendingForMe.length === 0 ? 'Nenhuma pendência.' : `Nenhuma pendência em "${actionNeededFilter === 'ALL' ? 'Todos' : actionNeededFilter}".`}</div>;
                      }
                      return byCategory.map(r => {
                        const { category, categoryColor, title, lines } = getRequestCardContent(r);
                        return (
                          <div key={r.id} className="action-tile">
                            <div className="action-tile-inner">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: categoryColor, border: `1px solid ${categoryColor}`, padding: '2px 8px', borderRadius: 6 }}>{category}</span>
                                <h4 style={{ margin: 0, flex: 1, fontSize: 15 }}>{title}</h4>
                              </div>
                              {lines.length > 0 && (
                                <div className="action-tile-details">
                                  {lines.map((l, i) => (
                                    <div key={i}><span className="action-tile-label">{l.label}:</span> {l.value}</div>
                                  ))}
                                </div>
                              )}
                              <p className="action-tile-requester">Solicitante: {r.requester?.name}</p>
                            </div>
                            <div className="action-tile-buttons">
                              {r.type === 'INFRA_SUPPORT' ? (
                                <>
                                  <button className="btn-mini approve" onClick={() => handleOpenApprove(r.id, 'APROVAR')}>Concluído</button>
                                  <button className="btn-mini btn-pendente" onClick={() => handleOpenApprove(r.id, 'PENDENTE')}>Pendente</button>
                                  <button className="btn-mini reject" onClick={() => handleOpenApprove(r.id, 'REPROVAR')}>Recusado</button>
                                </>
                              ) : (
                                <>
                                  <button className="btn-mini approve" onClick={() => handleOpenApprove(r.id, 'APROVAR')}>Aprovar</button>
                                  <button className="btn-mini reject" onClick={() => handleOpenApprove(r.id, 'REPROVAR')}>Recusar</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className="card-base cell-feed">
                <div className="card-header"><span className="card-title">Feed Recente</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests
                    .filter(r => systemProfile === 'VIEWER' ? r.requester.id === currentUser?.id : true)
                    .slice(0, 5)
                    .map(r => {
                      const { category, title } = getRequestCardContent(r);
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #27272a' }}>
                          {r.status === 'APROVADO' ? <CheckCircle size={16} color="#10b981" /> :
                            r.status === 'REPROVADO' ? <XCircle size={16} color="#ef4444" /> :
                              <Clock size={16} color="#fbbf24" />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: '#d4d4d8' }}>{title}</div>
                            <div style={{ fontSize: 10, color: '#52525b', fontFamily: 'monospace' }}>{category} · #{r.id.split('-')[0].toUpperCase()}</div>
                          </div>
                          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#52525b' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* GESTÃO DE PESSOAS INTERATIVA (LISTA EM CASCATA) */}
          {activeTab === 'PEOPLE' && (
            <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: 'white', fontSize: 20, margin: 0 }}>Gestão de Pessoas</h2>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <PersonnelListView
                  units={units}
                  users={allUsers.filter(u => u.department && u.department !== 'Geral')}
                  departments={departments.filter((d: any) => d.name !== 'Geral')}
                  roles={roles}
                  onEditUser={(user) => {
                    setSelectedUser(user);
                    setIsEditUserModalOpen(true);
                  }}
                  onDeleteUser={['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) ? handleDeleteUser : undefined}
                  onEditDepartment={(dept) => {
                    setSelectedDeptForAction(dept);
                    setIsEditDeptModalOpen(true);
                  }}
                  onDeleteDepartment={(dept) => {
                    setSelectedDeptForAction(dept);
                    setIsDeleteDeptModalOpen(true);
                  }}
                  onAddRole={['ADMIN', 'SUPER_ADMIN', 'GESTOR'].includes(systemProfile) ? (dept) => {
                    setSelectedDepartmentForNewRole(dept);
                    setSelectedRoleForKit(null);
                    setIsEditRoleKitModalOpen(true);
                  } : undefined}
                  onEditRole={['ADMIN', 'SUPER_ADMIN', 'GESTOR'].includes(systemProfile) ? (role) => {
                    setSelectedRoleForKit(role);
                    setSelectedDepartmentForNewRole(null);
                    setIsEditRoleKitModalOpen(true);
                  } : undefined}
                  onDeleteRole={['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) ? (role) => {
                    setSelectedRoleForDelete({
                      ...role,
                      department: role.department || { name: departments.find(d => d.id === role.departmentId)?.name ?? '' }
                    });
                    setIsDeleteRoleModalOpen(true);
                  } : undefined}
                />
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

              {/* ACESSOS POR CARGO / KBS (Gestão de Pessoas → Catálogo) */}
              <h3 style={{ color: '#22c55e', marginTop: 8, marginBottom: 15, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={20} /> Acessos por Cargo / KBS
              </h3>
              {(!selectedTool.kbsByRole || selectedTool.kbsByRole.length === 0) ? (
                <div className="card-base" style={{ textAlign: 'center', color: '#52525b', padding: 32, borderStyle: 'dashed', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                  Nenhum cargo na Gestão de Pessoas (KBS) possui esta ferramenta como padrão. Configure os Role Kits nos cargos para refletir aqui.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedTool.kbsByRole.map((row) => (
                    <div key={row.roleId} className="card-base" style={{ padding: 20, border: '1px solid #27272a', background: 'rgba(34, 197, 94, 0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#e4e4e7', fontSize: 15 }}>{row.roleName}</div>
                          <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>{row.departmentName}</div>
                          <div style={{ fontSize: 12, color: '#22c55e', marginTop: 6 }}>Nível padrão: {row.accessLevelDesc}</div>
                        </div>
                        <div style={{ fontSize: 11, color: '#a1a1aa', background: '#18181b', padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>
                          {row.userCount} {row.userCount === 1 ? 'colaborador' : 'colaboradores'}
                        </div>
                      </div>
                      {row.users.length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #27272a', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {row.users.slice(0, 12).map((u) => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#18181b', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#27272a', color: '#a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{u.name.charAt(0)}</div>
                              <span style={{ color: '#e4e4e7' }}>{u.name}</span>
                              <span style={{ color: '#52525b', fontSize: 11 }}>{u.email}</span>
                            </div>
                          ))}
                          {row.users.length > 12 && <span style={{ color: '#71717a', fontSize: 12, alignSelf: 'center' }}>+{row.users.length - 12} mais</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* LISTA DE USUÁRIOS AGRUPADOS POR NÍVEL (PERMANENTE) */}
              <h3 style={{ color: '#d4d4d8', marginBottom: 15, fontSize: 18, marginTop: 32 }}>Membros Permanentes</h3>

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
                          {(() => {
                            // Logic to resolve icon: 1. Custom Icon (string), 2. Default regex
                            const descData = (selectedTool.accessLevelDescriptions as any)?.[level];
                            const customIcon = typeof descData === 'object' ? descData.icon : null;
                            const description = typeof descData === 'object' ? descData.description : (typeof descData === 'string' ? descData : null);

                            if (customIcon === 'Crown') return <Crown size={20} color="#fbbf24" fill="rgba(251, 191, 36, 0.2)" />;
                            if (customIcon === 'Shield') return <Shield size={20} color="#a1a1aa" />;
                            if (customIcon === 'Star') return <Zap size={20} color="#f472b6" />; // Example mapping
                            // Fallback to regex if no custom icon
                            if (level.toLowerCase().match(/admin|owner|proprietário|full/)) return <Crown size={20} color="#fbbf24" fill="rgba(251, 191, 36, 0.2)" />;
                            return <Shield size={20} color="#a1a1aa" />;
                          })()}
                          <span style={{ fontWeight: 600, color: '#f4f4f5', fontSize: 15 }}>{level}</span>
                          <span style={{ fontSize: 10, color: '#71717a', marginLeft: 8 }}>
                            {(() => {
                              const descData = (selectedTool.accessLevelDescriptions as any)?.[level];
                              const description = typeof descData === 'object' ? descData.description : (typeof descData === 'string' ? descData : null);
                              return description && ` - ${description.substring(0, 30)}${description.length > 30 ? '...' : ''}`;
                            })()}
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

              {/* LISTA DE ACESSOS EXTRAORDINÁRIOS (sincronizada com Aprovações) */}
              <h3 style={{ color: '#c084fc', marginTop: 40, marginBottom: 15, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Timer size={20} /> Acessos Extraordinários (Temporários)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(() => {
                  const { extraordinary, extraordinaryApprovals } = getGroupedAccesses(selectedTool);
                  const hasExtra = extraordinary.length > 0 || extraordinaryApprovals.length > 0;
                  if (!hasExtra) {
                    return (
                      <div className="card-base" style={{ textAlign: 'center', color: '#52525b', padding: 40, borderStyle: 'dashed', borderColor: 'rgba(167, 139, 250, 0.2)' }}>
                        Nenhum acesso extraordinário vigente.
                      </div>
                    );
                  }
                  return (
                    <>
                      {extraordinary.map((acc) => (
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
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div>
                              <div style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Duração Pedida</div>
                              <div style={{ color: '#f4f4f5', fontWeight: 600 }}>{acc.duration} {acc.unit}</div>
                            </div>
                            {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
                              <button
                                className="btn-mini"
                                style={{ padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center', background: '#27272a' }}
                                onClick={() => { setSelectedAccess(acc); setIsEditAccessModalOpen(true); }}
                              >
                                <Pen size={12} /> Editar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {extraordinaryApprovals.map((req) => (
                        <div key={req.id} className="card-base" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          padding: '16px 24px',
                          background: 'rgba(167, 139, 250, 0.05)',
                          border: '1px solid rgba(167, 139, 250, 0.1)'
                        }}>
                          <div style={{ width: 42, height: 42, borderRadius: '12px', background: '#2e1065', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                            {req.requesterName.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: 'white', fontWeight: 600 }}>{req.requesterName}</span>
                              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>
                                {req.level}
                              </span>
                            </div>
                            {req.requesterEmail && <div style={{ color: '#a1a1aa', fontSize: 12 }}>{req.requesterEmail}</div>}
                            {req.justification && <div style={{ color: '#71717a', fontSize: 12, marginTop: 6 }}>{req.justification}</div>}
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 11, color: '#71717a' }}>
                            <div style={{ textTransform: 'uppercase', fontWeight: 700 }}>Aprovado em</div>
                            <div style={{ color: '#f4f4f5' }}>{new Date(req.approvedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* AUDITORIA */}
          {activeTab === 'HISTORY' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ color: 'white', fontSize: 20, margin: 0 }}>Logs de Auditoria</h2>
                <div style={{ fontSize: 12, color: '#71717a' }}>
                  {systemProfile === 'VIEWER' ? 'Seus registros' : 'Total de Registros'}: {
                    requests.filter(r => {
                      if (r.status === 'PENDENTE') return false;
                      if (systemProfile === 'VIEWER') return r.requester.id === currentUser?.id;
                      return true;
                    }).length
                  }
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginBottom: 20, alignItems: 'center' }}>
                {/* BUSCA */}
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                  <input
                    type="text"
                    placeholder={systemProfile === 'VIEWER' ? "Buscar em seus pedidos..." : "Buscar por nome do solicitante ou ID..."}
                    className="input-base"
                    style={{ paddingLeft: 40, background: '#18181b', width: '100%' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* FILTRO ORIGEM */}
                <div style={{ display: 'flex', gap: 4, background: '#18181b', borderRadius: 8, padding: 4, border: '1px solid #27272a' }}>
                  {(['ALL', 'THERIS', 'INFRA'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setSourceFilter(f)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', transition: 'all 0.2s',
                        background: sourceFilter === f ? (f === 'INFRA' ? 'rgba(251, 191, 36, 0.2)' : f === 'THERIS' ? 'rgba(167, 139, 250, 0.2)' : '#27272a') : 'transparent',
                        color: sourceFilter === f ? (f === 'INFRA' ? '#fbbf24' : f === 'THERIS' ? '#a78bfa' : 'white') : '#71717a',
                        cursor: 'pointer'
                      }}
                    >
                      {f === 'ALL' ? 'Todos' : f === 'THERIS' ? 'Theris' : 'TI / Infra'}
                    </button>
                  ))}
                </div>

                {/* FILTRO STATUS */}
                <select
                  className="input-base"
                  style={{ width: 'auto', background: '#18181b', fontSize: 12, padding: '4px 10px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="ALL">Status: Todos</option>
                  <option value="PENDENTE">Ação Pendente</option>
                  <option value="APROVADO">Concluído / Aprovado</option>
                  <option value="REPROVADO">Recusado / Reprovado</option>
                </select>

                {/* PERSONALIZAR VISUALIZAÇÃO */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowFilterPanel(prev => !prev)}
                    className="input-base"
                    style={{ background: '#18181b', fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #27272a' }}
                  >
                    <Settings size={14} color="#a78bfa" /> Personalizar filtro
                  </button>
                  {showFilterPanel && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
                      background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, padding: 16, minWidth: 320, boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 12 }}>Tipos de solicitação</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                        {REQUEST_TYPE_OPTIONS.map(opt => (
                          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#e4e4e7', fontSize: 12 }}>
                            <input type="checkbox" checked={typeFilterEnabled[opt.value] !== false} onChange={e => setTypeFilterEnabled(prev => ({ ...prev, [opt.value]: e.target.checked }))} />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>Colunas visíveis</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {COLUMN_OPTIONS.map(c => (
                          <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#e4e4e7', fontSize: 11 }}>
                            <input type="checkbox" checked={visibleColumns[c.key] !== false} onChange={e => setVisibleColumns(prev => ({ ...prev, [c.key]: e.target.checked }))} />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-base" style={{ padding: 0, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa', textAlign: 'left' }}>
                      {visibleColumns.id !== false && <th style={{ padding: '16px', fontWeight: 600 }}>ID</th>}
                      {visibleColumns.categoria !== false && <th style={{ padding: '16px', fontWeight: 600 }}>CATEGORIA</th>}
                      {visibleColumns.assunto !== false && <th style={{ padding: '16px', fontWeight: 600 }}>ASSUNTO</th>}
                      {visibleColumns.status !== false && <th style={{ padding: '16px', fontWeight: 600 }}>STATUS</th>}
                      {visibleColumns.solicitante !== false && <th style={{ padding: '16px', fontWeight: 600 }}>SOLICITANTE</th>}
                      {visibleColumns.responsavel !== false && <th style={{ padding: '16px', fontWeight: 600 }}>RESPONSÁVEL</th>}
                      {visibleColumns.data !== false && <th style={{ padding: '16px', fontWeight: 600 }}>DATA & HORA</th>}
                      {visibleColumns.observacao !== false && <th style={{ padding: '16px', fontWeight: 600 }}>OBSERVAÇÃO</th>}
                      {visibleColumns.justificativa !== false && <th style={{ padding: '16px', fontWeight: 600 }}>JUSTIFICATIVA</th>}
                      {visibleColumns.detalhes !== false && <th style={{ padding: '16px', fontWeight: 600 }}>DETALHES (Slack)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {requests
                      .filter(r => {
                        // 0. Filtro de permissão
                        if (systemProfile === 'VIEWER' && r.requester.id !== currentUser?.id) return false;

                        // 1. Filtro por tipo (personalizado)
                        const typeKey = REQUEST_TYPE_OPTIONS.some(o => o.value === r.type) ? r.type : '__OTHER__';
                        if (typeFilterEnabled[typeKey] === false) return false;

                        // 2. Filtro de Status
                        if (statusFilter !== 'ALL') {
                          if (statusFilter === 'PENDENTE') {
                            if (!r.status.startsWith('PENDENTE')) return false;
                          } else if (r.status !== statusFilter) return false;
                        }

                        // 3. Filtro de Origem
                        const INFRA_TYPES = ['INFRA_SUPPORT'];
                        const isInfra = INFRA_TYPES.includes(r.type);
                        if (sourceFilter === 'THERIS' && isInfra) return false;
                        if (sourceFilter === 'INFRA' && !isInfra) return false;

                        // 4. Busca
                        if (searchTerm) {
                          const term = searchTerm.toLowerCase();
                          const matchesName = r.requester?.name?.toLowerCase().includes(term);
                          const matchesId = r.id.toLowerCase().includes(term);
                          const detailsStr = (r as any).details ? String((r as any).details) : '';
                          const matchesDetails = detailsStr.toLowerCase().includes(term);
                          if (!matchesName && !matchesId && !matchesDetails) return false;
                        }

                        return true;
                      })
                      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
                      .map(r => {
                        // MAPEAR CATEGORIA E ASSUNTO
                        let category = "Geral";
                        let subject = r.type;

                        const TOOL_TYPES = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO', 'ACCESS_TOOL_EXTRA'];
                        const PEOPLE_TYPES = ['DEPUTY_DESIGNATION', 'CHANGE_ROLE', 'HIRING', 'FIRING', 'PROMOCAO', 'DEMISSAO', 'ADMISSAO'];
                        const INFRA_TYPES = ['INFRA_SUPPORT'];

                        if (TOOL_TYPES.includes(r.type)) category = "Gestão de Ferramentas";
                        else if (PEOPLE_TYPES.includes(r.type)) category = "Gestão de Pessoas";
                        else if (INFRA_TYPES.includes(r.type)) category = "Infraestrutura & TI";

                        // Assunto amigável
                        const subjectMap: Record<string, string> = {
                          'ACCESS_TOOL': 'Novo Acesso',
                          'ACESSO_FERRAMENTA': 'Novo Acesso',
                          'ACCESS_CHANGE': 'Alteração de Acesso',
                          'EXTRAORDINARIO': 'Acesso Extraordinário',
                          'ACCESS_TOOL_EXTRA': 'Acesso Extraordinário',
                          'DEPUTY_DESIGNATION': 'Designação de Substituto',
                          'CHANGE_ROLE': 'Mudança de Cargo',
                          'PROMOCAO': 'Promoção',
                          'ADMISSAO': 'Admissão / Onboarding',
                          'DEMISSAO': 'Desligamento / Offboarding',
                          'FIRING': 'Desligamento / Offboarding',
                          'INFRA_SUPPORT': 'Suporte de TI / Hardware'
                        };
                        subject = subjectMap[r.type] || r.type;

                        let detailsParsed: Record<string, unknown> = {};
                        try {
                          detailsParsed = typeof r.details === 'string' ? JSON.parse(r.details || '{}') : (r.details || {});
                        } catch (_) { }
                        const formatDetails = () => {
                          const d = detailsParsed as any;
                          const parts: string[] = [];
                          if (d.info) parts.push(d.info);
                          if (r.type === 'CHANGE_ROLE' && d.current) parts.push(`Atual: ${d.current.role || ''} / ${d.current.dept || ''}`);
                          if (r.type === 'CHANGE_ROLE' && d.future) parts.push(`Novo: ${d.future.role || ''} / ${d.future.dept || ''}`);
                          if (d.collaboratorName) parts.push(`Colaborador: ${d.collaboratorName}`);
                          if (d.reason) parts.push(`Motivo: ${d.reason}`);
                          if (d.startDate) parts.push(`Início: ${d.startDate}`);
                          if (d.role) parts.push(`Cargo: ${d.role}`);
                          if (d.dept) parts.push(`Depto: ${d.dept}`);
                          if (d.tool) parts.push(`Ferramenta: ${d.tool}`);
                          if (d.toolName) parts.push(`Ferramenta: ${d.toolName}`);
                          if (d.owner) parts.push(`Owner: ${d.owner}`);
                          if (d.subOwner) parts.push(`Sub-Owner: ${d.subOwner}`);
                          if (d.accessLevels) parts.push(`Níveis: ${d.accessLevels}`);
                          if (d.current && typeof d.current === 'string') parts.push(`Nível atual: ${d.current}`);
                          if (d.target) parts.push(`Nível desejado: ${d.target}`);
                          if (d.beneficiary) parts.push(`Beneficiário: ${d.beneficiary}`);
                          if (d.duration != null && d.unit) parts.push(`Duração: ${d.duration} ${d.unit}`);
                          if (d.substituteName || d.substituteEmail) parts.push(`Substituto: ${[d.substituteName, d.substituteEmail].filter(Boolean).join(' · ')}`);
                          else if (d.substitute) parts.push(`Substituto: ${d.substitute}`);
                          if (d.obs) parts.push(`Obs: ${d.obs}`);
                          if (d.requestTypeLabel || d.requestType) parts.push(`Tipo: ${d.requestTypeLabel || d.requestType}`);
                          if (d.description) parts.push(`Descrição: ${d.description}`);
                          if (d.urgencyLabel || d.urgency) parts.push(`Urgência: ${d.urgencyLabel || d.urgency}`);
                          return parts.length ? parts.join(' · ') : '-';
                        };

                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid #1f1f22', color: '#e4e4e7' }}>
                            {visibleColumns.id !== false && (
                              <td style={{ padding: '16px', fontSize: 11, color: '#71717a', fontFamily: 'monospace' }} title={r.id}>
                                #{r.id.split('-')[0].toUpperCase()}
                              </td>
                            )}
                            {visibleColumns.categoria !== false && (
                              <td style={{ padding: '16px' }}>
                                <span style={{
                                  fontSize: 12,
                                  color: category === 'Gestão de Ferramentas' ? '#a78bfa' :
                                    category === 'Gestão de Pessoas' ? '#34d399' :
                                      category === 'Infraestrutura & TI' ? '#fbbf24' : '#a1a1aa',
                                  fontWeight: 600
                                }}>
                                  {category}
                                </span>
                              </td>
                            )}
                            {visibleColumns.assunto !== false && <td style={{ padding: '16px', fontSize: 13 }}>{subject}</td>}
                            {visibleColumns.status !== false && (
                              <td style={{ padding: '16px' }}>
                                <span style={{
                                  padding: '4px 10px', borderRadius: '20px', fontSize: 11, fontWeight: 700,
                                  backgroundColor: r.status === 'APROVADO' ? 'rgba(16, 185, 129, 0.2)' :
                                    r.status === 'REPROVADO' ? 'rgba(239, 68, 68, 0.2)' :
                                      r.status.startsWith('PENDENTE') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(113, 113, 122, 0.2)',
                                  color: r.status === 'APROVADO' ? '#34d399' :
                                    r.status === 'REPROVADO' ? '#f87171' :
                                      r.status.startsWith('PENDENTE') ? '#fbbf24' : '#a1a1aa',
                                  border: r.status === 'APROVADO' ? '1px solid #059669' :
                                    r.status === 'REPROVADO' ? '1px solid #b91c1c' :
                                      r.status.startsWith('PENDENTE') ? '1px solid #d97706' : '1px solid #3f3f46',
                                  display: 'inline-flex', alignItems: 'center', gap: 5
                                }}>
                                  {r.status === 'APROVADO' ? <CheckCircle size={10} /> :
                                    r.status === 'REPROVADO' ? <XCircle size={10} /> : <Clock size={10} />}
                                  {getStatusLabel(r.status)}
                                </span>
                              </td>
                            )}
                            {visibleColumns.solicitante !== false && (
                              <td style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                                    {r.requester?.name?.charAt(0) || '?'}
                                  </div>
                                  <span>{r.requester?.name || 'Usuário Removido'}</span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.responsavel !== false && (
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
                            )}
                            {visibleColumns.data !== false && (
                              <td style={{ padding: '16px', color: '#a1a1aa' }}>
                                {new Date(r.updatedAt || r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                            )}
                            {visibleColumns.observacao !== false && (
                              <td style={{ padding: '16px', color: '#71717a', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.adminNote}>
                                {r.adminNote || '-'}
                              </td>
                            )}
                            {visibleColumns.justificativa !== false && (
                              <td style={{ padding: '16px', color: '#a1a1aa', maxWidth: '180px', fontSize: 12 }} title={r.justification || ''}>
                                {(r.justification || '-').toString().slice(0, 60)}{(r.justification && r.justification.length > 60) ? '…' : ''}
                              </td>
                            )}
                            {visibleColumns.detalhes !== false && (
                              <td style={{ padding: '16px', color: '#a1a1aa', maxWidth: '280px', fontSize: 11 }} title={formatDetails()}>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{formatDetails()}</span>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    {requests.filter(r => {
                      if (systemProfile === 'VIEWER' && r.requester.id !== currentUser?.id) return false;
                      const typeKey = REQUEST_TYPE_OPTIONS.some(o => o.value === r.type) ? r.type : '__OTHER__';
                      if (typeFilterEnabled[typeKey] === false) return false;
                      if (statusFilter !== 'ALL') {
                        if (statusFilter === 'PENDENTE' && !r.status.startsWith('PENDENTE')) return false;
                        if (statusFilter !== 'PENDENTE' && r.status !== statusFilter) return false;
                      }
                      const INFRA_TYPES = ['INFRA_SUPPORT'];
                      if (sourceFilter === 'THERIS' && INFRA_TYPES.includes(r.type)) return false;
                      if (sourceFilter === 'INFRA' && !INFRA_TYPES.includes(r.type)) return false;
                      if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        const match = r.requester?.name?.toLowerCase().includes(term) || r.id.toLowerCase().includes(term) || String((r as any).details || '').toLowerCase().includes(term);
                        if (!match) return false;
                      }
                      return true;
                    }).length === 0 && (
                      <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#52525b' }}>Nenhum registro encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GESTÃO DE CHAMADOS / CHAMADOS RELACIONADOS (Viewer) */}
          {(activeTab === 'TICKETS' || activeTab === 'MY_TICKETS') && (
            <div className="fade-in">
              {selectedChamadoId ? (
                /* Detalhe do chamado: chat + sidebar */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <button type="button" className="btn-text" onClick={() => { setSelectedChamadoId(null); setChamadoDetail(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ArrowLeft size={18} /> Voltar à lista
                    </button>
                  </div>
                  {chamadoDetailLoading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>Carregando...</div>
                  ) : chamadoDetail ? (
                    <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
                      {/* Área principal: chat */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden', background: '#09090b' }}>
                        <div style={{ padding: 16, borderBottom: '1px solid #27272a', color: '#e4e4e7', fontWeight: 600 }}>
                          Histórico do chamado
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ padding: 12, background: '#18181b', borderRadius: 8, borderLeft: '3px solid #7c3aed' }}>
                            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Abertura · {new Date(chamadoDetail.createdAt).toLocaleString('pt-BR')}</div>
                            <div style={{ fontSize: 13, color: '#e4e4e7' }}>Solicitação criada · {chamadoDetail.type}</div>
                            {chamadoDetail.justification && <div style={{ marginTop: 8, fontSize: 12, color: '#a1a1aa' }}>{chamadoDetail.justification}</div>}
                          </div>
                          {(chamadoDetail.comments || []).map(c => (
                            <div key={c.id} style={{ padding: 12, background: '#18181b', borderRadius: 8 }}>
                              <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>
                                {c.author?.name || 'Sistema'} · {new Date(c.createdAt).toLocaleString('pt-BR')}
                                {c.kind !== 'COMMENT' && <span style={{ marginLeft: 8, color: '#a78bfa' }}>({c.kind === 'SOLUTION' ? 'Solução' : 'Tarefa agendada'})</span>}
                              </div>
                              <div style={{ fontSize: 13, color: '#e4e4e7', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                            </div>
                          ))}
                          {(chamadoDetail.attachments || []).map(a => (
                            <div key={a.id} style={{ padding: 12, background: '#18181b', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FileText size={18} color="#71717a" />
                              <a href={a.fileUrl.startsWith('http') ? a.fileUrl : `${API_URL}${a.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', fontSize: 13 }}>{a.filename}</a>
                              <span style={{ fontSize: 11, color: '#52525b' }}>{a.uploadedBy?.name} · {new Date(a.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: 16, borderTop: '1px solid #27272a' }}>
                          {(activeTab === 'MY_TICKETS') ? null : (
                            <select className="input-base" style={{ marginBottom: 8, background: '#18181b', fontSize: 12 }} value={chamadoCommentKind} onChange={e => setChamadoCommentKind(e.target.value as any)}>
                              <option value="COMMENT">Comentário</option>
                              <option value="SOLUTION">Adicionar uma solução</option>
                              <option value="SCHEDULED_TASK">Criar uma tarefa agendada</option>
                            </select>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="text"
                              className="input-base"
                              placeholder="Escreva sua mensagem..."
                              style={{ flex: 1, background: '#18181b' }}
                              value={chamadoCommentInput}
                              onChange={e => setChamadoCommentInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                            />
                            <button type="button" className="btn-mini" style={{ background: '#7c3aed' }} onClick={handleAddComment}>Enviar</button>
                          </div>
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <input type="file" ref={chamadoFileInputRef} style={{ display: 'none' }} onChange={handleChamadoAddAttachment} />
                            <button type="button" className="btn-mini" style={{ background: '#27272a', color: '#e4e4e7' }} onClick={() => chamadoFileInputRef.current?.click()} disabled={chamadoAttachmentUploading}>
                              {chamadoAttachmentUploading ? 'Enviando...' : 'Adicionar documento'}
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Sidebar metadados */}
                      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card-base" style={{ padding: 20 }}>
                          <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Data e hora</div>
                          <div style={{ color: '#e4e4e7' }}>{new Date(chamadoDetail.createdAt).toLocaleString('pt-BR')}</div>
                        </div>
                        <div className="card-base" style={{ padding: 20 }}>
                          <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Tipo / Categoria</div>
                          <div style={{ color: '#e4e4e7' }}>{(getRequestCardContent(chamadoDetail).category)} · {chamadoDetail.type}</div>
                        </div>
                        {INFRA_REQUEST_TYPES.includes(chamadoDetail.type) && (() => {
                          let d: any = {}; try { d = JSON.parse(chamadoDetail.details || '{}'); } catch {} 
                          return (d.urgencyLabel || d.urgency) ? (
                            <div className="card-base" style={{ padding: 20 }}>
                              <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Urgência</div>
                              <div style={{ color: '#e4e4e7' }}>{d.urgencyLabel || d.urgency || '—'}</div>
                            </div>
                          ) : null;
                        })()}
                        <div className="card-base" style={{ padding: 20 }}>
                          <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Solicitante</div>
                          <div style={{ color: '#e4e4e7' }}>{chamadoDetail.requester?.name}</div>
                          <div style={{ fontSize: 12, color: '#a1a1aa' }}>{chamadoDetail.requester?.email}</div>
                        </div>
                        <div className="card-base" style={{ padding: 20 }}>
                          <label style={{ display: 'block', fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Status</label>
                          {(activeTab === 'MY_TICKETS') ? (
                            <div style={{ color: '#e4e4e7', fontSize: 13 }}>{getStatusLabel(chamadoDetail.status)}</div>
                          ) : (
                            <select
                              className="input-base"
                              style={{ width: '100%', background: '#18181b', fontSize: 12 }}
                              value={chamadoDetail.status}
                              onChange={e => handleChamadoMetadataChange('status', e.target.value)}
                            >
                              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {chamadoDetail.status === 'AGENDADO' && (
                          <div className="card-base" style={{ padding: 20 }}>
                            <label style={{ display: 'block', fontSize: 11, color: '#71717a', marginBottom: 8 }}>Data agendada</label>
                            {(activeTab === 'MY_TICKETS') ? (
                              <div style={{ color: '#e4e4e7', fontSize: 13 }}>{chamadoDetail.scheduledAt ? new Date(chamadoDetail.scheduledAt).toLocaleString('pt-BR') : '—'}</div>
                            ) : (
                              <input type="datetime-local" className="input-base" style={{ width: '100%', background: '#18181b' }} value={chamadoDetail.scheduledAt ? new Date(chamadoDetail.scheduledAt).toISOString().slice(0, 16) : ''} onChange={e => handleChamadoMetadataChange('scheduledAt', e.target.value || null)} />
                            )}
                          </div>
                        )}
                        <div className="card-base" style={{ padding: 20 }}>
                          <label style={{ display: 'block', fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Responsável</label>
                          {(activeTab === 'MY_TICKETS') ? (
                            <div style={{ color: '#e4e4e7', fontSize: 13 }}>{chamadoDetail.assignee?.name || '— Não atribuído'}</div>
                          ) : (
                            <select
                              className="input-base"
                              style={{ width: '100%', background: '#18181b', fontSize: 12 }}
                              value={chamadoDetail.assigneeId || ''}
                              onChange={e => handleChamadoMetadataChange('assigneeId', e.target.value || null)}
                            >
                              <option value="">— Não atribuído</option>
                              {allUsers.filter((u: User) => ['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(u.systemProfile)).map((u: User) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>Chamado não encontrado.</div>
                  )}
                </div>
              ) : (
                <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ color: 'white', fontSize: 20, margin: 0 }}>{activeTab === 'MY_TICKETS' ? 'Chamados relacionados' : 'Gestão de Chamados'}</h2>
              </div>
              {/* Abas de categoria */}
              <div style={{ display: 'flex', gap: 4, background: '#18181b', borderRadius: 8, padding: 4, border: '1px solid #27272a', marginBottom: 16 }}>
                {(['Todos', 'Pessoas', 'Acessos', 'Infra'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setTicketCategoryTab(cat)}
                    style={{
                      padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: ticketCategoryTab === cat ? (cat === 'Infra' ? 'rgba(251, 191, 36, 0.2)' : cat === 'Acessos' ? 'rgba(167, 139, 250, 0.2)' : cat === 'Pessoas' ? 'rgba(34, 197, 94, 0.2)' : '#27272a') : 'transparent',
                      color: ticketCategoryTab === cat ? (cat === 'Infra' ? '#fbbf24' : cat === 'Acessos' ? '#a78bfa' : cat === 'Pessoas' ? '#22c55e' : 'white') : '#71717a'
                    }}
                  >
                    {cat}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowTicketFilterPanel(prev => !prev)}
                    className="input-base"
                    style={{ background: showTicketFilterPanel ? '#27272a' : '#18181b', fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #27272a', cursor: 'pointer' }}
                  >
                    <Filter size={14} color="#a78bfa" /> Filtros
                  </button>
                </div>
              </div>

              {/* Painel de filtros */}
              {showTicketFilterPanel && (
                <div className="card-base" style={{ marginBottom: 16, padding: 20, background: '#18181b', border: '1px solid #27272a' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 12 }}>Filtros combinados</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#71717a', marginBottom: 4 }}>Status</label>
                      <select
                        className="input-base"
                        style={{ width: '100%', background: '#09090b', fontSize: 12 }}
                        value={ticketFilters.status}
                        onChange={e => setTicketFilters(f => ({ ...f, status: e.target.value }))}
                      >
                        <option value="ALL">Todos</option>
                        <option value="PENDENTE">Pendente</option>
                        <option value="APROVADO">Aprovado</option>
                        <option value="REPROVADO">Recusado</option>
                      </select>
                    </div>
                    {activeTab !== 'MY_TICKETS' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#71717a', marginBottom: 4 }}>Solicitante (nome ou e-mail)</label>
                      <input
                        type="text"
                        className="input-base"
                        style={{ width: '100%', background: '#09090b', fontSize: 12 }}
                        placeholder="Buscar..."
                        value={ticketFilters.requesterSearch}
                        onChange={e => setTicketFilters(f => ({ ...f, requesterSearch: e.target.value }))}
                      />
                    </div>
                    )}
                    {activeTab !== 'MY_TICKETS' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#71717a', marginBottom: 4 }}>Responsável</label>
                      <select
                        className="input-base"
                        style={{ width: '100%', background: '#09090b', fontSize: 12 }}
                        value={ticketFilters.assigneeId}
                        onChange={e => setTicketFilters(f => ({ ...f, assigneeId: e.target.value }))}
                      >
                        <option value="">Todos</option>
                        {allUsers.filter((u: User) => ['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(u.systemProfile)).map((u: User) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    )}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#71717a', marginBottom: 4 }}>Período</label>
                      <select
                        className="input-base"
                        style={{ width: '100%', background: '#09090b', fontSize: 12 }}
                        value={ticketFilters.period}
                        onChange={e => setTicketFilters(f => ({ ...f, period: e.target.value }))}
                      >
                        <option value="ALL">Todos</option>
                        <option value="TODAY">Hoje</option>
                        <option value="LAST_7">Últimos 7 dias</option>
                        <option value="LAST_30">Últimos 30 dias</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <button type="button" className="btn-mini" onClick={loadTicketList} style={{ padding: '8px 14px' }}>Aplicar</button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ticketList.length === 0 ? (
                  <div className="card-base" style={{ textAlign: 'center', color: '#52525b', padding: 48, borderStyle: 'dashed' }}>
                    Nenhum chamado encontrado com os filtros aplicados.
                  </div>
                ) : (
                  ticketList.map(r => {
                    const card = getRequestCardContent(r);
                    return (
                      <div key={r.id} className="card-base" style={{ padding: 20, border: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: card.categoryColor, textTransform: 'uppercase' }}>{card.category}</span>
                            <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{card.title}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4 }}>{r.requester?.name} · {new Date(r.createdAt).toLocaleString('pt-BR')}</div>
                          <div style={{ fontSize: 12, color: '#71717a' }}>Status: {getStatusLabel(r.status)}</div>
                        </div>
                        <button
                          className="btn-mini"
                          style={{ background: '#7c3aed', color: 'white', padding: '10px 20px' }}
                          onClick={() => setSelectedChamadoId(r.id)}
                        >
                          Acessar chamado
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
                </>
              )}
            </div>
          )}
        </div>
      </main >

      <ModalObservacao isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleConfirmApprove} titulo={modalAction === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Reprovação'} tipo={modalAction} />

      {
        selectedTool && (
          <EditToolModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            tool={selectedTool}
            onUpdate={loadData}
            showToast={showToast}
          />
        )
      }

      {
        selectedUser && (
          <EditUserModal
            isOpen={isEditUserModalOpen}
            onClose={() => {
              setIsEditUserModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onUpdate={loadData}
            currentUser={{ id: currentUser?.id || '', systemProfile }}
            allUsers={allUsers}
            showToast={showToast}
          />
        )
      }

      <CreateToolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadData}
        showToast={showToast}
      />

      <EditAccessModal
        isOpen={isEditAccessModalOpen}
        onClose={() => setIsEditAccessModalOpen(false)}
        access={selectedAccess}
        toolId={selectedTool?.id || ''}
        onUpdate={loadData}
        showToast={showToast}
      />

      {/* RENDERIZAR O MODAL DE ESTRUTURA */}
      <ManageStructureModal
        isOpen={isManageStructureOpen}
        onClose={() => {
          setIsManageStructureOpen(false);
          setSelectedStructureDept(null);
        }}
        onUpdate={loadData}
        initialDepartment={selectedStructureDept}
        allUsers={allUsers}
        showToast={showToast}
        customConfirm={customConfirm}
      />

      {
        selectedTool && selectedLevelName && (
          <ManageLevelModal
            isOpen={isManageLevelModalOpen}
            onClose={() => {
              setIsManageLevelModalOpen(false);
              setSelectedLevelName(null);
            }}
            tool={selectedTool as any}
            levelName={selectedLevelName}
            onUpdate={loadData}
            showToast={showToast}
            customConfirm={customConfirm}
          />
        )
      }

      {/* DEPARTMENT MANAGEMENT MODALS */}
      <EditDepartmentModal
        isOpen={isEditDeptModalOpen}
        onClose={() => setIsEditDeptModalOpen(false)}
        department={selectedDeptForAction}
        onUpdated={loadData}
        showToast={showToast}
      />
      {
        isDeleteDeptModalOpen && (
          <DeleteDepartmentModal
            isOpen={isDeleteDeptModalOpen}
            onClose={() => setIsDeleteDeptModalOpen(false)}
            department={selectedDeptForAction}
            allDepartments={departments}
            userCount={selectedDeptForAction ? allUsers.filter(u => u.department === selectedDeptForAction.name).length : 0}
            onDeleted={loadData}
            showToast={showToast}
            customConfirm={customConfirm}
          />
        )
      }

      <EditRoleKitModal
        isOpen={isEditRoleKitModalOpen}
        onClose={() => { setIsEditRoleKitModalOpen(false); setSelectedRoleForKit(null); setSelectedDepartmentForNewRole(null); }}
        role={selectedRoleForKit}
        departmentId={selectedRoleForKit ? selectedRoleForKit.departmentId : (selectedDepartmentForNewRole?.id ?? null)}
        onUpdate={loadData}
        showToast={showToast}
      />

      <DeleteRoleModal
        isOpen={isDeleteRoleModalOpen}
        onClose={() => { setIsDeleteRoleModalOpen(false); setSelectedRoleForDelete(null); }}
        role={selectedRoleForDelete}
        units={units}
        userCountInRole={selectedRoleForDelete ? allUsers.filter(u =>
          u.roleId === selectedRoleForDelete.id ||
          (u.jobTitle === selectedRoleForDelete.name && u.department === departments.find(d => d.id === selectedRoleForDelete.departmentId)?.name)
        ).length : 0}
        onDeleted={loadData}
        showToast={showToast}
      />

      {/* CUSTOM UI OVERLAYS */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <CustomConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        confirmLabel={confirmConfig.confirmLabel}
      />
    </div >
  );
}