import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, Server, FileText, LogOut, Bird,
  ArrowLeft, Shield, CheckCircle, XCircle, Clock, Crown,
  Lock, Layers, ChevronDown, ChevronRight,
  Users, Building, Briefcase, // Ícone para Gestão de Pessoas
  Pen, PlusCircle, Edit2, Timer, Zap, ShieldCheck, RefreshCw, Activity, Trash2, Settings, Plus, MessageSquare,   Filter, X, Download, Monitor
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
import { CreateDepartmentModal } from './components/CreateDepartmentModal';
import { EditUnitModal } from './components/EditUnitModal';
import { UnitMigrationWizardModal } from './components/UnitMigrationWizardModal';
import { DeleteDepartmentModal } from './components/DeleteDepartmentModal';
import { EditRoleKitModal } from './components/EditRoleKitModal';
import { DeleteRoleModal } from './components/DeleteRoleModal';
import { EntityAuditHistory } from './components/EntityAuditHistory';
import { ReportExportModal } from './components/ReportExportModal';
import { AuditLog } from './pages/AuditLog';
import { CollaboratorDetails } from './pages/CollaboratorDetails';
import { LoginAttempts } from './pages/LoginAttempts';
import { ActiveSessions } from './pages/ActiveSessions';
import LandingPage from './pages/LandingPage';
import { useLocation, useParams, useNavigate, useSearchParams, Navigate, Routes, Route } from 'react-router-dom';
import { ToastContainer, Toast } from './components/ToastContainer';
import { CustomConfirmModal } from './components/CustomConfirmModal';
import { API_URL } from './config';
import { setUserIdGetter, setSessionExpiredCallback } from './lib/api';
import { useSessionTimeout } from './hooks/useSessionTimeout';

// --- TYPES ---
interface User {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  department?: string;
  unit?: string;
  departmentId?: string | null;
  unitId?: string | null;
  departmentRef?: { id: string; name: string } | null;
  unitRef?: { id: string; name: string } | null;
  systemProfile: string;
  managerId?: string | null;
  manager?: { name: string };
  myDeputy?: User;
}

const userDeptName = (u: User) => u.departmentRef?.name ?? u.department ?? '';
const userUnitName = (u: User) => u.unitRef?.name ?? u.unit ?? '';

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
    createdAt?: string;
    level?: string;
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
/** Entrada do histórico do chamado (HistoricoMudanca) retornada pelo backend. */
interface RequestHistoryEntry {
  id: string;
  tipo: string;
  createdAt: string;
  descricao?: string;
  dadosAntes?: { status?: string; responsavel?: string | null };
  dadosDepois?: { status?: string; responsavel?: string | null };
  autor?: { name: string } | null;
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
  actionDate?: string | null;
  comments?: RequestComment[];
  attachments?: RequestAttachment[];
  requestHistory?: RequestHistoryEntry[];
}

interface KBUFerramenta {
  id: string;
  nome: string;
  sigla?: string | null;
  ownerNome?: string | null;
  ownerEmail?: string | null;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  PENDING_OWNER: 'Pendente (Owner)',
  PENDING_SI: 'Pendente (SI)',
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

function getRequestStatusBadgeStyle(status: string): { label: string; bg: string; color: string } {
  const s = (status || '').toUpperCase();
  if (s === 'PENDENTE_OWNER' || s === 'PENDING_OWNER') return { label: getStatusLabel(status), bg: 'rgba(249, 115, 22, 0.2)', color: '#f97316' };
  if (s === 'PENDENTE_SI' || s === 'PENDING_SI') return { label: getStatusLabel(status), bg: 'rgba(14, 165, 233, 0.2)', color: '#0EA5E9' };
  if (s === 'APROVADO') return { label: getStatusLabel(status), bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' };
  if (s === 'REPROVADO') return { label: getStatusLabel(status), bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
  if (s === 'RESOLVIDO' || s === 'EM_ATENDIMENTO' || s === 'CONCLUIDO' || s === 'AGENDADO') return { label: getStatusLabel(status), bg: 'rgba(21, 128, 61, 0.2)', color: '#15803d' };
  return { label: getStatusLabel(status), bg: 'rgba(100, 116, 139, 0.2)', color: '#64748b' };
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
    return { category: 'Acessos', categoryColor: '#38BDF8', title, lines };
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
      const period = (r as { accessPeriodRaw?: string }).accessPeriodRaw ?? (d.duration != null && d.unit ? `${d.duration} ${d.unit}` : null);
      if (period) lines.push({ label: 'Período', value: period });
    }
    if (r.justification) lines.push({ label: 'Justificativa', value: r.justification });
    return { category: 'Acessos', categoryColor: '#38BDF8', title, lines };
  }

  // Fallback genérico
  const title = (d.info as string) || r.type;
  const lines: { label: string; value: string }[] = [];
  if (d.info && d.info !== title) lines.push({ label: 'Resumo', value: d.info as string });
  if (r.justification) lines.push({ label: 'Justificativa', value: r.justification });
  return { category: 'Acessos', categoryColor: '#38BDF8', title, lines };
}

/** Formata timestamp em horário de Brasília (America/Sao_Paulo) para exibição no histórico do chamado. */
function formatEventDateBRT(createdAt: string): string {
  return new Date(createdAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/** Formata valor para exibição de data (YYYY-MM-DD → dd/MM/yyyy ou Date). */
function formatDateValue(val: unknown): string | null {
  if (val == null || val === '') return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    const date = typeof val === 'string' ? new Date(val) : (val as Date);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (_) {}
  return null;
}

/**
 * Monta as linhas de detalhe do evento "Solicitação criada" no Histórico do chamado.
 * Usada para qualquer chamado aberto (novo ou antigo). Exibe apenas campos com valor (!== null/undefined/'').
 * Chamados criados antes dos novos campos do modal (managerName, contractType, equipmentReturn, etc.) terão
 * details incompleto — os campos ausentes são omitidos naturalmente. Campos antigos (collaboratorName, role,
 * dept, reason, current, future, etc.) são lidos normalmente para chamados já existentes.
 */
function getTicketHistoryDetailLines(chamado: Request): { label: string; value: string }[] {
  let d: Record<string, unknown> = {};
  try {
    d = typeof chamado.details === 'string' ? JSON.parse(chamado.details || '{}') : (chamado.details as Record<string, unknown> || {});
  } catch {
    return [];
  }
  const lines: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      lines.push({ label, value: String(value).trim() });
    }
  };
  const actionDateFormatted = chamado.actionDate
    ? new Date(chamado.actionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;
  const startDateDisplay = formatDateValue(d.startDate) ?? actionDateFormatted;

  const type = chamado.type;
  const subtipo = d.subtipo as string | undefined;

  // HIRING
  if (type === 'HIRING') {
    push('Colaborador', d.collaboratorName);
    push('Cargo', d.role);
    push('Departamento', d.dept ?? d.department);
    push('Data de início', startDateDisplay ?? d.startDate);
    push('Gestor', d.managerName);
    push('E-mail corporativo', d.corporateEmail);
    push('Tipo', d.contractType);
    push('Observações', d.obs);
    if (chamado.justification) lines.push({ label: 'Justificativa', value: chamado.justification });
    return lines;
  }

  // FIRING / LEAVER / OFFBOARDING / DEMISSAO
  if (type === 'FIRING' || type === 'DEMISSAO' || type === 'OFFBOARDING') {
    push('Colaborador', d.collaboratorName);
    push('Cargo', d.role);
    push('Departamento', d.dept);
    push('Data de desligamento', formatDateValue(d.actionDate) ?? actionDateFormatted);
    push('Motivo', d.reason);
    push('Gestor', d.managerName);
    push('Devolução de equipamento', d.equipmentReturn);
    push('Observações', d.obs);
    if (chamado.justification && !d.reason) lines.push({ label: 'Justificativa', value: chamado.justification });
    return lines;
  }

  // CHANGE_ROLE (Mudança de Cargo)
  if (type === 'CHANGE_ROLE' && subtipo === 'MUDANCA_CARGO') {
    push('Colaborador', d.collaboratorName);
    const curr = d.current as Record<string, string> | undefined;
    const fut = d.future as Record<string, string> | undefined;
    push('Cargo atual', curr?.role);
    push('Novo cargo', fut?.role ?? d.newRoleName);
    push('Departamento atual', curr?.dept);
    push('Novo departamento', fut?.dept ?? d.newDeptName);
    push('Data de início', formatDateValue(d.actionDate) ?? actionDateFormatted);
    push('Justificativa', d.reason ?? chamado.justification);
    push('Gestor atual', d.managerCurrent);
    push('Novo gestor', d.managerNew);
    return lines;
  }

  // CHANGE_ROLE (Mudança de Departamento) / CHANGE_DEPARTMENT
  if (type === 'CHANGE_ROLE' && (subtipo === 'MUDANCA_DEPARTAMENTO' || !subtipo)) {
    push('Colaborador', d.collaboratorName);
    const curr = d.current as Record<string, string> | undefined;
    const fut = d.future as Record<string, string> | undefined;
    push('Departamento atual', curr?.dept);
    push('Novo departamento', fut?.dept ?? d.newDeptName);
    push('Cargo atual', curr?.role);
    push('Novo cargo', fut?.role ?? d.newRoleName);
    push('Gestor atual', d.managerCurrent);
    push('Novo gestor', d.managerNew);
    push('Data de início', formatDateValue(d.actionDate) ?? actionDateFormatted);
    push('Justificativa', d.reason ?? chamado.justification);
    return lines;
  }

  // DEPUTY_DESIGNATION (sem tool = /pessoas)
  if (type === 'DEPUTY_DESIGNATION' && !d.tool) {
    push('Colaborador', d.substituteName ?? d.substitute);
    push('Cargo', d.role);
    push('Departamento', d.dept);
    if (chamado.justification) lines.push({ label: 'Justificativa', value: chamado.justification });
    return lines;
  }

  // VPN_ACCESS (Acesso a VPN)
  if (type === 'VPN_ACCESS') {
    push('Nível', d.vpnLevel);
    push('Patrimônio', d.assetNumber);
    push('SO', d.operatingSystem);
    push('Justificativa', d.justification ?? chamado.justification);
    return lines;
  }

  // Acessos / AEX / Infra / genérico
  if (actionDateFormatted) lines.push({ label: 'Data de Ação', value: actionDateFormatted });
  if (chamado.justification) lines.push({ label: 'Justificativa', value: chamado.justification });
  push('Ferramenta', d.tool ?? d.toolName);
  push('Nível solicitado', d.target ?? d.targetValue);
  const period = (chamado as { accessPeriodRaw?: string }).accessPeriodRaw ?? (d.duration != null && d.unit ? `${d.duration} ${d.unit}` : null);
  if (period) lines.push({ label: 'Período', value: period });
  push('Urgência', d.urgencyLabel ?? d.urgency);
  push('Tipo de solicitação', d.requestTypeLabel ?? d.requestType);
  push('Descrição / Problema', d.description);
  if (d.collaboratorName) lines.push({ label: 'Colaborador', value: String(d.collaboratorName) });
  const c = d.current as Record<string, string> | undefined;
  if (c && (c.role || c.dept)) lines.push({ label: 'Cargo/Depto atual', value: [c.role, c.dept].filter(Boolean).join(' / ') });
  const f = d.future as Record<string, string> | undefined;
  if (f && (f.role || f.dept)) lines.push({ label: 'Cargo/Depto futuro', value: [f.role, f.dept].filter(Boolean).join(' / ') });
  push('Substituto', [d.substituteName, d.substituteEmail].filter(Boolean).map(String).join(' · ') || undefined);
  push('Motivo', d.reason);
  push('Info', d.info);
  return lines;
}

type ChamadoTimelineEvent =
  | { kind: 'TICKET_CREATED'; createdAt: string; request: Request }
  | { kind: 'STATUS_CHANGED'; createdAt: string; from: string; to: string; authorName: string }
  | { kind: 'ASSIGNEE_CHANGED'; createdAt: string; assigneeName: string; authorName: string }
  | { kind: 'COMMENT_ADDED'; createdAt: string; comment: RequestComment }
  | { kind: 'ATTACHMENT_ADDED'; createdAt: string; attachment: RequestAttachment };

/** Monta a timeline do chamado (abertura + histórico + comentários + anexos) ordenada por createdAt asc. */
function buildChamadoTimeline(request: Request): ChamadoTimelineEvent[] {
  const events: ChamadoTimelineEvent[] = [];

  events.push({ kind: 'TICKET_CREATED', createdAt: request.createdAt, request });

  const history = (request as Request & { requestHistory?: RequestHistoryEntry[] }).requestHistory || [];
  for (const h of history) {
    if (h.tipo === 'TICKET_CREATED') continue;
    if (h.tipo === 'TICKET_ASSIGNED') {
      const to = (h.dadosDepois?.responsavel ?? '—') as string;
      events.push({ kind: 'ASSIGNEE_CHANGED', createdAt: h.createdAt, assigneeName: to, authorName: h.autor?.name ?? 'Sistema' });
      continue;
    }
    if (h.tipo === 'STATUS_CHANGED' || h.tipo === 'TICKET_RESOLVED' || h.tipo === 'TICKET_REOPENED') {
      const from = (h.dadosAntes?.status ?? '—') as string;
      const to = (h.dadosDepois?.status ?? '—') as string;
      events.push({ kind: 'STATUS_CHANGED', createdAt: h.createdAt, from, to, authorName: h.autor?.name ?? 'Sistema' });
      continue;
    }
  }

  for (const c of request.comments || []) {
    events.push({ kind: 'COMMENT_ADDED', createdAt: c.createdAt, comment: c });
  }
  for (const a of request.attachments || []) {
    events.push({ kind: 'ATTACHMENT_ADDED', createdAt: a.createdAt, attachment: a });
  }

  events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return events;
}

export default function App() {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const match = location.pathname.match(/^\/collaborators\/([^/]+)/);
  const collaboratorId = match ? match[1] : null;

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const s = localStorage.getItem('theris_user'); return s ? JSON.parse(s) : null;
  });
  const [systemProfile, setSystemProfile] = useState<SystemProfile>(() => (localStorage.getItem('theris_profile') as SystemProfile) || 'VIEWER');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMfaRequired, setIsMfaRequired] = useState(false);

  useEffect(() => {
    setUserIdGetter(() => currentUser?.id);
  }, [currentUser?.id]);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // activeTab derivado da URL (pathname como fonte da verdade)
  const pathname = location.pathname;
  const activeTab = pathname.startsWith('/collaborators/') ? 'PEOPLE' : // highlight PEOPLE quando em detalhes
    pathname === '/dashboard' ? 'DASHBOARD' :
    pathname === '/people' ? 'PEOPLE' :
    pathname.startsWith('/tools') ? 'TOOLS' :
    pathname === '/history' ? 'HISTORY' :
    pathname === '/audit-log' ? 'AUDIT_LOG' :
    pathname === '/login-attempts' ? 'LOGIN_ATTEMPTS' :
    pathname === '/active-sessions' ? 'ACTIVE_SESSIONS' :
    pathname === '/tickets' ? 'TICKETS' :
    pathname === '/my-tickets' ? 'MY_TICKETS' :
    'DASHBOARD';

  // DADOS
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Lista de colaboradores
  const [units, setUnits] = useState<any[]>([]); // Estrutura Unit -> Department -> Role (da API)
  const [departments, setDepartments] = useState<any[]>([]); // Lista plana (derivada de units) para modais
  const [roles, setRoles] = useState<any[]>([]); // Lista plana (derivada de units) para modais

  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [kbuTools, setKbuTools] = useState<KBUFerramenta[]>([]);
  const [showAddKbuForm, setShowAddKbuForm] = useState(false);
  const [newKbuNome, setNewKbuNome] = useState('');
  const [newKbuOwnerNome, setNewKbuOwnerNome] = useState('');
  const [newKbuOwnerEmail, setNewKbuOwnerEmail] = useState('');
  const [kbuEditOwnerModal, setKbuEditOwnerModal] = useState<{ open: boolean; id: string | null; nome: string; ownerNome: string; ownerEmail: string }>({ open: false, id: null, nome: '', ownerNome: '', ownerEmail: '' });
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // FILTROS (Relatório)
  type ReportCategoryFilter = 'ALL' | 'GESTAO_PESSOAS' | 'GESTAO_ACESSOS' | 'TI_INFRA';
  const [searchParams, setSearchParams] = useSearchParams();
  const [reportCategoryFilter, setReportCategoryFilter] = useState<ReportCategoryFilter>(() => {
    const c = searchParams.get('category');
    if (c === 'GESTAO_PESSOAS' || c === 'GESTAO_ACESSOS' || c === 'TI_INFRA') return c;
    return 'ALL';
  });
  const [reportPeriodStart, setReportPeriodStart] = useState(() => searchParams.get('startDate') || '');
  const [reportPeriodEnd, setReportPeriodEnd] = useState(() => searchParams.get('endDate') || '');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APROVADO' | 'REPROVADO' | 'PENDENTE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const REQUEST_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'ACCESS_TOOL', label: 'Kit Padrão / Acesso Ferramenta' },
    { value: 'ACCESS_CHANGE', label: 'Alteração de Acesso' },
    { value: 'ACCESS_TOOL_EXTRA', label: 'Kit Especial / Acesso Extraordinário' },
    { value: 'VPN_ACCESS', label: 'Acesso a VPN' },
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
  const [chamadoScheduledAt, setChamadoScheduledAt] = useState('');
  const [assigneeSearchOpen, setAssigneeSearchOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [expandedKbsSection, setExpandedKbsSection] = useState(false);
  const [isExtraordinaryOpen, setIsExtraordinaryOpen] = useState(false);

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

  const [isEditUnitModalOpen, setIsEditUnitModalOpen] = useState(false);
  const [selectedUnitForEdit, setSelectedUnitForEdit] = useState<{ id: string; name: string } | null>(null);
  const [isCreateDepartmentModalOpen, setIsCreateDepartmentModalOpen] = useState(false);
  const [selectedUnitForAddDept, setSelectedUnitForAddDept] = useState<{ id: string; name: string } | null>(null);
  const [unitMigrationData, setUnitMigrationData] = useState<{ unit: { id: string; name: string }; departments: { id: string; name: string; rolesCount: number }[] } | null>(null);
  const [auditLogFilters, setAuditLogFilters] = useState<{ entidadeId?: string; entidadeTipo?: string }>({});
  const [isAddCollaboratorModalOpen, setIsAddCollaboratorModalOpen] = useState(false);
  const [addCollaboratorContext, setAddCollaboratorContext] = useState<{ role: { id: string; name: string }; department: { id: string; name: string } } | null>(null);
  const [addCollaboratorName, setAddCollaboratorName] = useState('');
  const [addCollaboratorEmail, setAddCollaboratorEmail] = useState('');
  const [addCollaboratorSubmitting, setAddCollaboratorSubmitting] = useState(false);

  /** Painel Viewer: ferramentas do Meu Kit Básico (RoleKitItem do cargo do usuário) */
  const [viewerKitTools, setViewerKitTools] = useState<{ id: string; toolName: string; toolCode: string; accessLevelDesc: string }[]>([]);
  /** Painel Viewer: acessos extraordinários (tabela Access com isExtraordinary) */
  const [viewerExtraordinaryTools, setViewerExtraordinaryTools] = useState<{ id: string; toolName: string; levelLabel: string }[]>([]);
  /** Dashboard ADMIN/SUPER_ADMIN: AEX do usuário logado (GET my-tickets + filter tipo AEX) */
  const [dashboardAexTickets, setDashboardAexTickets] = useState<Request[]>([]);

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

  // Sessão expirada por inatividade (60 min) ou 401 SESSION_EXPIRED do backend
  const sessionExpiredRef = useRef<() => void>(() => {});
  useEffect(() => {
    sessionExpiredRef.current = () => {
      localStorage.clear();
      showToast('Sua sessão expirou por inatividade. Faça login novamente.', 'warning');
      setIsLoggedIn(false);
      setCurrentUser(null);
      setIsMfaRequired(false);
      navigate('/login');
    };
  }, [showToast, navigate]);
  useEffect(() => {
    setSessionExpiredCallback(() => sessionExpiredRef.current());
    return () => setSessionExpiredCallback(null);
  }, []);
  useSessionTimeout(() => sessionExpiredRef.current(), { enabled: isLoggedIn });

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
      const s = r?.status || '';
      const isPending = s.startsWith('PENDENTE') || s === 'PENDING_OWNER' || s === 'PENDING_SI' || s === 'EM_ATENDIMENTO' || s === 'AGENDADO';
      if (!isPending) return false;
      if (systemProfile === 'VIEWER') return r?.requester?.id === currentUser?.id;
      return true;
    }).length,
    approved: requests.filter(r => {
      if (r?.status !== 'APROVADO') return false;
      if (systemProfile === 'VIEWER') return r?.requester?.id === currentUser?.id;
      return true;
    }).length,
    total: requests.filter(r => {
      if (systemProfile === 'VIEWER') return r?.requester?.id === currentUser?.id;
      return true;
    }).length,
    myReqs: requests.filter(r => r?.requester?.id === currentUser?.id).length
  };

  useEffect(() => { if (!pathname.startsWith('/collaborators/')) localStorage.setItem('theris_activeTab', activeTab); }, [pathname, activeTab]);
  useEffect(() => { if (!pathname.startsWith('/tools')) setSelectedTool(null); }, [pathname]);
  // Sync URL query params → auditLogFilters quando em /audit-log
  useEffect(() => {
    if (pathname === '/audit-log') {
      const sp = new URLSearchParams(location.search);
      const eid = sp.get('entidadeId');
      const etipo = sp.get('entidadeTipo');
      if (eid || etipo) setAuditLogFilters(prev => ({ ...prev, entidadeId: eid || prev.entidadeId, entidadeTipo: etipo || prev.entidadeTipo }));
    }
  }, [pathname, location.search]);

  // Sync URL query params → Relatório quando em /history
  useEffect(() => {
    if (pathname !== '/history') return;
    const cat = searchParams.get('category');
    const start = searchParams.get('startDate') || '';
    const end = searchParams.get('endDate') || '';
    if (cat === 'GESTAO_PESSOAS' || cat === 'GESTAO_ACESSOS' || cat === 'TI_INFRA') setReportCategoryFilter(cat);
    else setReportCategoryFilter('ALL');
    setReportPeriodStart(start);
    setReportPeriodEnd(end);
  }, [pathname, searchParams]);

  const applyReportFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.set('category', reportCategoryFilter);
    if (reportPeriodStart) next.set('startDate', reportPeriodStart);
    else next.delete('startDate');
    if (reportPeriodEnd) next.set('endDate', reportPeriodEnd);
    else next.delete('endDate');
    setSearchParams(next, { replace: true });
  };

  // Redirecionar VIEWER que tenta acessar /audit-log diretamente
  useEffect(() => {
    if (pathname === '/audit-log' && systemProfile === 'VIEWER') {
      navigate('/dashboard');
    }
  }, [pathname, systemProfile, navigate]);
  // Redirecionar não-SUPER_ADMIN que tenta acessar /active-sessions
  useEffect(() => {
    if (pathname === '/active-sessions' && systemProfile !== 'SUPER_ADMIN') {
      navigate('/dashboard');
    }
  }, [pathname, systemProfile, navigate]);
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

  // Refrescar perfil do usuário (manager, etc.) para exibir no Dashboard 'Meu perfil'
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id) return;
    const headers: HeadersInit = { 'x-user-id': currentUser.id };
    fetch(`${API_URL}/api/users/me`, { headers })
      .then((res) => res.ok ? res.json() : null)
      .then((profile) => { if (profile) setCurrentUser(profile); })
      .catch(() => {});
  }, [isLoggedIn, currentUser?.id]);

  // LOAD DATA
  const loadData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      const [resTools, resReqs, resKbu] = await Promise.all([
        fetch(`${API_URL}/api/tools`),
        fetch(`${API_URL}/api/solicitacoes`, { headers }),
        fetch(`${API_URL}/api/kbu`)
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
      if (resKbu?.ok) setKbuTools(await resKbu.json());

      // Carrega usuários se estiver na aba de gestão ou Gestão de Chamados (para select Responsável)
      if (activeTab === 'PEOPLE' || activeTab === 'TICKETS') {
        const resUsers = await fetch(`${API_URL}/api/users`);
        if (resUsers.ok) setAllUsers(await resUsers.json());
      }
      if (activeTab === 'PEOPLE') {
        const resDepts = await fetch(`${API_URL}/api/structure`, { credentials: 'include' });
        if (resDepts.ok) {
          const structData = await resDepts.json();
          const unitList = structData.units || [];
          setUnits(unitList);
          setDepartments(unitList.flatMap((u: any) => (u.departments || []).map((d: any) => ({ ...d, unitId: u.id, unit: { name: u.name } }))));
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

  const anyStructureModalOpen = isEditRoleKitModalOpen || isManageStructureOpen || isEditDeptModalOpen || isDeleteDeptModalOpen || isCreateDepartmentModalOpen || isEditUnitModalOpen || isDeleteRoleModalOpen;

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      const interval = setInterval(() => {
        if (anyStructureModalOpen) return;
        loadData();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, activeTab, anyStructureModalOpen]);

  useEffect(() => {
    if (isLoggedIn && (activeTab === 'TICKETS' || activeTab === 'MY_TICKETS')) loadTicketList();
  }, [isLoggedIn, activeTab, ticketCategoryTab]);

  /** Carrega Meu Kit Básico (e Acessos Extraordinários para VIEWER) no Dashboard: VIEWER usa no Meu Painel; ADMIN/SUPER_ADMIN usam no bloco Minha Visão */
  useEffect(() => {
    const isViewer = systemProfile === 'VIEWER';
    const isAdminOrSuper = systemProfile === 'ADMIN' || systemProfile === 'SUPER_ADMIN';
    if (!isLoggedIn || activeTab !== 'DASHBOARD' || !currentUser?.id || (!isViewer && !isAdminOrSuper)) {
      if (!isViewer && !isAdminOrSuper) {
        setViewerKitTools([]);
        setViewerExtraordinaryTools([]);
      }
      return;
    }
    const headers: HeadersInit = { 'x-user-id': currentUser.id };
    fetch(`${API_URL}/api/users/me/tools`, { headers })
      .then((res) => res.ok ? res.json() : { kitTools: [], extraordinaryTools: [] })
      .then((data) => {
        if (Array.isArray(data)) {
          setViewerKitTools(data);
          if (!isViewer) setViewerExtraordinaryTools([]);
        } else {
          setViewerKitTools(data.kitTools ?? []);
          setViewerExtraordinaryTools(isViewer ? (data.extraordinaryTools ?? []) : []);
        }
      })
      .catch(() => {
        setViewerKitTools([]);
        setViewerExtraordinaryTools([]);
      });
  }, [isLoggedIn, systemProfile, activeTab, currentUser?.id]);

  /** Carrega AEX do usuário logado para o bloco AEX no Dashboard (ADMIN/SUPER_ADMIN) */
  useEffect(() => {
    const isAdminOrSuper = systemProfile === 'ADMIN' || systemProfile === 'SUPER_ADMIN';
    if (!isLoggedIn || !isAdminOrSuper || activeTab !== 'DASHBOARD' || !currentUser?.id) {
      if (!isAdminOrSuper) setDashboardAexTickets([]);
      return;
    }
    const headers: HeadersInit = { 'x-user-id': currentUser.id };
    fetch(`${API_URL}/api/solicitacoes/my-tickets`, { headers })
      .then((res) => res.ok ? res.json() : [])
      .then((list: Request[]) => {
        const aexTypes = ['ACCESS_TOOL_EXTRA', 'EXTRAORDINARIO'];
        const aex = list.filter((r) => aexTypes.includes(r.type) && r.status === 'APROVADO');
        setDashboardAexTickets(aex);
      })
      .catch(() => setDashboardAexTickets([]));
  }, [isLoggedIn, systemProfile, activeTab, currentUser?.id]);

  const loadChamadoDetail = async () => {
    if (!selectedChamadoId) return;
    setChamadoDetailLoading(true);
    try {
      const isViewerContext = activeTab === 'MY_TICKETS';
      const headers: HeadersInit = {};
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      if (isViewerContext) headers['x-context'] = 'my-tickets';
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
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 403 && (err.error === 'PARTIAL_APPROVAL' || err.error === 'SAME_APPROVER')) {
          showToast(err.message || 'Aprovação dupla necessária.', 'warning');
        } else {
          showToast('Erro ao atualizar.', 'error');
        }
      }
    } catch (e) {
      showToast('Erro ao atualizar.', 'error');
    }
  };

  const handleChamadoApprove = async (action: 'APROVAR' | 'REPROVADO') => {
    if (!selectedChamadoId || !chamadoDetail || !currentUser?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/solicitacoes/${selectedChamadoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          approverId: currentUser.id,
          adminNote: action === 'APROVAR' ? 'Aprovado pelo painel.' : 'Reprovado pelo painel.'
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setChamadoDetail(prev => prev ? { ...prev, ...updated } : updated);
        loadTicketList();
        showToast(action === 'APROVAR' ? 'Chamado aprovado.' : 'Chamado reprovado.', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || err.error || 'Erro ao processar.', 'error');
      }
    } catch (e) {
      showToast('Erro ao processar aprovação.', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!selectedChamadoId || !chamadoCommentInput.trim()) return;
    const kind = activeTab === 'MY_TICKETS' ? 'COMMENT' : chamadoCommentKind;
    const scheduledAt = kind === 'SCHEDULED_TASK' ? chamadoScheduledAt : null;
    if (kind === 'SCHEDULED_TASK' && !scheduledAt) {
      showToast('Informe a data e hora da tarefa agendada.', 'warning');
      return;
    }
    // AEX: bloqueio de solução até aprovação dupla completa
    if (kind === 'SOLUTION' && chamadoDetail && (chamadoDetail as { canAddSolution?: boolean }).canAddSolution === false) {
      const msg = (chamadoDetail as { solutionBlockReason?: string }).solutionBlockReason || 'Não é possível adicionar solução neste momento.';
      showToast(`🔒 ${msg}`, 'warning');
      return;
    }
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
        setChamadoScheduledAt('');
        if (kind === 'SOLUTION') {
          const patchRes = await fetch(`${API_URL}/api/solicitacoes/${selectedChamadoId}/metadata`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APROVADO' })
          });
          if (patchRes.ok) {
            const updated = await patchRes.json();
            setChamadoDetail(prev => prev ? { ...prev, ...updated } : updated);
            loadTicketList();
            showToast('Solução registrada e chamado concluído.', 'success');
          } else {
            showToast('Comentário adicionado. Atualize o status manualmente.', 'info');
          }
        } else if (kind === 'SCHEDULED_TASK' && scheduledAt) {
          const patchRes = await fetch(`${API_URL}/api/solicitacoes/${selectedChamadoId}/metadata`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'AGENDADO', scheduledAt: new Date(scheduledAt).toISOString() })
          });
          if (patchRes.ok) {
            const updated = await patchRes.json();
            setChamadoDetail(prev => prev ? { ...prev, ...updated } : updated);
            loadTicketList();
            showToast('Tarefa agendada e status atualizado.', 'success');
          } else {
            showToast('Comentário adicionado. Atualize a data manualmente.', 'info');
          }
        } else {
          showToast('Comentário adicionado.', 'success');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 403 && err.error === 'AEX_SOLUTION_BLOCKED') {
          showToast(`🔒 ${err.message || 'Não é possível adicionar solução neste momento.'}`, 'warning');
        } else {
          showToast('Erro ao adicionar comentário.', 'error');
        }
      }
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
        navigate('/dashboard');
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

  const handleLogout = () => { localStorage.clear(); setIsLoggedIn(false); setCurrentUser(null); navigate('/'); setSelectedTool(null); setIsMfaRequired(false); };

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

  const handleKbuOpenEditOwner = (item: KBUFerramenta) => {
    setKbuEditOwnerModal({
      open: true,
      id: item.id,
      nome: item.nome,
      ownerNome: item.ownerNome ?? '',
      ownerEmail: item.ownerEmail ?? ''
    });
  };

  const handleKbuConfirmEditOwner = async () => {
    if (kbuEditOwnerModal.id == null) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      const res = await fetch(`${API_URL}/api/kbu/${kbuEditOwnerModal.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nome: kbuEditOwnerModal.nome.trim(),
          ownerNome: kbuEditOwnerModal.ownerNome.trim() || null,
          ownerEmail: kbuEditOwnerModal.ownerEmail.trim() || null
        })
      });
      if (res.ok) {
        loadData();
        showToast('Ferramenta KBU atualizada.', 'success');
        setKbuEditOwnerModal(prev => ({ ...prev, open: false }));
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data?.error || 'Erro ao atualizar.', 'error');
      }
    } catch {
      showToast('Erro de rede.', 'error');
    }
  };

  const handleKbuRemoveFromModal = () => {
    const item = kbuEditOwnerModal.id != null ? kbuTools.find(t => t.id === kbuEditOwnerModal.id) : null;
    if (!item) return;
    customConfirm({
      title: 'Remover do KBU?',
      message: `Remover "${item.nome}" do Kit Básico Universal?`,
      isDestructive: true,
      confirmLabel: 'Remover',
      onConfirm: async () => {
        try {
          const headers: Record<string, string> = {};
          if (currentUser?.id) headers['x-user-id'] = currentUser.id;
          const res = await fetch(`${API_URL}/api/kbu/${item.id}`, { method: 'DELETE', headers });
          if (res.ok) {
            setKbuEditOwnerModal(prev => ({ ...prev, open: false }));
            loadData();
            showToast('Ferramenta removida do KBU.', 'success');
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(data?.error || 'Erro ao remover.', 'error');
          }
        } catch {
          showToast('Erro de rede.', 'error');
        }
      }
    });
  };

  const handleKbuRemove = async (item: KBUFerramenta) => {
    if (!window.confirm(`Remover "${item.nome}" do Kit Básico Universal?`)) return;
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      const res = await fetch(`${API_URL}/api/kbu/${item.id}`, { method: 'DELETE', headers });
      if (res.ok) {
        loadData();
        showToast('Ferramenta removida do KBU.', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data?.error || 'Erro ao remover.', 'error');
      }
    } catch {
      showToast('Erro de rede.', 'error');
    }
  };

  const handleKbuAdd = async () => {
    const nome = newKbuNome.trim();
    if (!nome) {
      showToast('Informe o nome da ferramenta.', 'warning');
      return;
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      const res = await fetch(`${API_URL}/api/kbu`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nome,
          ownerNome: newKbuOwnerNome.trim() || null,
          ownerEmail: newKbuOwnerEmail.trim() || null
        })
      });
      if (res.ok) {
        setNewKbuNome('');
        setNewKbuOwnerNome('');
        setNewKbuOwnerEmail('');
        setShowAddKbuForm(false);
        loadData();
        showToast('Ferramenta adicionada ao KBU.', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data?.error || 'Erro ao adicionar.', 'error');
      }
    } catch {
      showToast('Erro de rede.', 'error');
    }
  };

  const handleDeleteUnit = async (unit: { id: string; name: string }) => {
    try {
      const res = await fetch(`${API_URL}/api/structure/units/${unit.id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
        showToast('Unidade excluída.', 'success');
        return;
      }
      const data = await res.json();
      if (res.status === 409 && data.code === 'UNIT_HAS_DEPENDENCIES' && data.unit && Array.isArray(data.departments)) {
        setUnitMigrationData({ unit: data.unit, departments: data.departments });
        return;
      }
      showToast(data.error || 'Erro ao excluir unidade.', 'error');
    } catch {
      showToast('Erro de conexão.', 'error');
    }
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
        if (selectedChamadoId === modalTargetId) loadChamadoDetail?.();
        showToast(`Solicitação ${modalAction === 'aprovar' ? 'aprovada' : modalAction === 'pendente' ? 'marcada como pendente' : 'reprovada'} com sucesso!`, "success");
      } else {
        const data = await res.json();
        showToast(data.message || data.error || "Erro ao processar solicitação.", "error");
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
      const dept = userDeptName(u) || 'Geral';
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
  // Rota / fora do layout: renderiza apenas LandingPage (ou redirect). Demais rotas em renderNonLanding.
  const renderNonLanding = () => {
    if (pathname === '/login' && isLoggedIn) return <Navigate to="/dashboard" replace />;
    if (pathname === '/login' && !isLoggedIn) return (
    <div className="login-wrapper">
      <div className="login-marketing">
        <div className="marketing-content fade-in">
          <div className="marketing-badge">
            <Zap size={14} fill="#38BDF8" /> Disponível para todo o ecossistema
          </div>
          <h1 style={{ color: 'white' }}>
            Domine a <span style={{ color: '#0EA5E9' }}>Governança</span> de Acessos da sua empresa.
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
              <div style={{ background: 'rgba(14, 165, 233, 0.15)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                <Bird size={36} color="#38BDF8" />
              </div>
              <h2>Boas-vindas ao Theris</h2>
              <p className="subtitle">Acesse sua conta corporativa para continuar.</p>

              {isLoading ? (
                <div style={{ marginTop: 20, color: '#0EA5E9', fontSize: '14px', fontWeight: 500 }}>
                  <div className="spinner" style={{ border: '3px solid rgba(14, 165, 233, 0.2)', borderTop: '3px solid #0EA5E9', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
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
              <div className="mfa-icon-wrapper" style={{ margin: '0 auto 20px' }}><Lock size={32} color="#0EA5E9" /></div>
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
                {isLoading ? 'Verificando...' : 'Confirmar Acesso'}
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
    if (!isLoggedIn) return <Navigate to="/login" replace />;

    return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-box"><Bird size={24} color="#0EA5E9" /> THERIS OS</div>
        <div className="nav-section">
          {(['SUPER_ADMIN', 'GESTOR', 'ADMIN', 'APPROVER'].includes(systemProfile)) ? (
            <>
              <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { navigate('/dashboard'); setSelectedTool(null); }}><LayoutDashboard size={18} /> Visão Geral</div>
              {systemProfile !== 'APPROVER' && (
                <>
                  <div className={`nav-item ${activeTab === 'PEOPLE' ? 'active' : ''}`} onClick={() => navigate('/people')}><Users size={18} /> Gestão de Pessoas</div>
                  <div className={`nav-item ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => { navigate('/tools'); setSelectedTool(null); }}><Layers size={18} /> Catálogo</div>
                </>
              )}
              <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => navigate('/history')}><FileText size={18} /> Relatório</div>
              <div className={`nav-item ${activeTab === 'AUDIT_LOG' ? 'active' : ''}`} onClick={() => { navigate('/audit-log'); setAuditLogFilters({}); }}><Clock size={18} /> Histórico</div>
              {systemProfile === 'SUPER_ADMIN' && (
                <div className={`nav-item ${activeTab === 'LOGIN_ATTEMPTS' ? 'active' : ''}`} onClick={() => navigate('/login-attempts')}><Shield size={18} /> Tentativas de Login</div>
              )}
              {systemProfile === 'SUPER_ADMIN' && (
                <div className={`nav-item ${activeTab === 'ACTIVE_SESSIONS' ? 'active' : ''}`} onClick={() => navigate('/active-sessions')}><Monitor size={18} /> Sessões Ativas</div>
              )}
              <div className={`nav-item ${activeTab === 'TICKETS' ? 'active' : ''}`} onClick={() => navigate('/tickets')}><MessageSquare size={18} /> Gestão de Chamados</div>
            </>
          ) : (
            <>
              <div className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => { navigate('/dashboard'); setSelectedTool(null); }}><LayoutDashboard size={18} /> Meu Painel</div>
              <div className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => navigate('/history')}><FileText size={18} /> Relatório</div>
              <div className={`nav-item ${activeTab === 'MY_TICKETS' ? 'active' : ''}`} onClick={() => { navigate('/my-tickets'); setSelectedChamadoId(null); setChamadoDetail(null); }}><MessageSquare size={18} /> Chamados relacionados</div>
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
          <div className="page-title">Pagina: <span>{collaboratorId ? 'DETALHES DO COLABORADOR' : activeTab === 'TOOLS' && selectedTool ? selectedTool.name : activeTab === 'PEOPLE' ? 'GESTÃO DE PESSOAS' : activeTab === 'MY_TICKETS' ? 'CHAMADOS RELACIONADOS' : activeTab === 'AUDIT_LOG' ? 'HISTÓRICO DE MUDANÇAS' : activeTab === 'LOGIN_ATTEMPTS' ? 'TENTATIVAS DE LOGIN' : activeTab === 'ACTIVE_SESSIONS' ? 'SESSÕES ATIVAS' : activeTab}</span></div>
        </header>

        <div className="content-scroll">

          {/* DETALHES DO COLABORADOR */}
          {collaboratorId && (
            <CollaboratorDetails
              id={collaboratorId}
              onBack={() => navigate('/people')}
              onOpenAuditHistory={(entidadeId, entidadeTipo) => {
                setAuditLogFilters({ entidadeId, entidadeTipo });
                navigate(`/audit-log?entidadeId=${encodeURIComponent(entidadeId)}&entidadeTipo=${encodeURIComponent(entidadeTipo)}`);
              }}
              onUpdate={loadData}
              currentUser={currentUser ? { id: currentUser.id, systemProfile: currentUser.systemProfile } : undefined}
              allUsers={allUsers}
              showToast={showToast}
            />
          )}

          {/* CONTEÚDO PADRÃO (quando não está em /collaborators/:id) */}
          {!collaboratorId && activeTab === 'DASHBOARD' && (
            <>
              {/* Bloco pessoal – hierarquia: Header, Meu Perfil, KBU, KBS, AEX; só ADMIN e SUPER_ADMIN */}
              {(systemProfile === 'ADMIN' || systemProfile === 'SUPER_ADMIN') && currentUser && (
                <div className="dashboard-personal-block">
                  {/* 1. Header: Olá, [Nome] + data atual */}
                  <div className="dashboard-personal-block-section">
                    <h1 style={{ fontSize: '28px', color: 'white', margin: 0, marginBottom: 4 }}>Olá, {currentUser.name?.split(' ')[0] ?? 'Usuário'}</h1>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>

                  {/* 2. Meu Perfil: grid compacto 3 colunas */}
                  <div className="dashboard-personal-block-section card-base dashboard-profile-grid-wrap">
                    <h3 style={{ color: '#38BDF8', marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={18} /> Meu Perfil
                    </h3>
                    <div className="dashboard-profile-grid">
                      <div className="dashboard-profile-field">
                        <div className="dashboard-profile-label">Cargo</div>
                        <div className="dashboard-profile-value">{(currentUser as { role?: { name: string } }).role?.name || currentUser.jobTitle || '—'}</div>
                      </div>
                      <div className="dashboard-profile-field">
                        <div className="dashboard-profile-label">Departamento</div>
                        <div className="dashboard-profile-value">{userDeptName(currentUser) || '—'}</div>
                      </div>
                      <div className="dashboard-profile-field">
                        <div className="dashboard-profile-label">Unidade</div>
                        <div className="dashboard-profile-value">{(currentUser as { unitRef?: { name: string } }).unitRef?.name || '—'}</div>
                      </div>
                      <div className="dashboard-profile-field">
                        <div className="dashboard-profile-label">KBS Code</div>
                        <div className="dashboard-profile-value">{((currentUser as { role?: { code: string | null } }).role?.code || '').split(/\s+e\s+/)[0]?.trim() || (currentUser as { role?: { code: string } }).role?.code || '—'}</div>
                      </div>
                      <div className="dashboard-profile-field">
                        <div className="dashboard-profile-label">E-mail</div>
                        <div className="dashboard-profile-value"><a href={`mailto:${currentUser.email}`} style={{ color: '#38BDF8', textDecoration: 'none' }}>{currentUser.email || '—'}</a></div>
                      </div>
                      <div className="dashboard-profile-field">
                        <div className="dashboard-profile-label">Gestor</div>
                        <div className="dashboard-profile-value">{currentUser.manager?.name || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* 3. KBU – Kit Básico Universal (uma única instância) */}
                  <div className="dashboard-personal-block-section card-base">
                    <h3 style={{ color: '#38BDF8', marginBottom: 8, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={18} /> KBU – Kit Básico Universal
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>Este é o kit de ferramentas padrão de todos os colaboradores do Grupo 3C.</p>
                    {kbuTools.length === 0 ? (
                      <p style={{ color: '#71717a', fontSize: 14 }}>Nenhuma ferramenta no KBU no momento.</p>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 20, color: '#e4e4e7', fontSize: 14, lineHeight: 1.8 }}>
                        {kbuTools.map((f) => (
                          <li key={f.id}>{f.nome}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* 4. KBS – Meu Kit Básico */}
                  <div className="dashboard-personal-block-section card-base">
                    <h3 style={{ color: '#22c55e', marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={18} /> KBS – Meu Kit Básico
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
                              <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Nível de Acesso</th>
                              <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Criticidade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewerKitTools.map((row) => (
                              <tr key={row.id} style={{ borderBottom: '1px solid #1f1f22' }}>
                                <td style={{ padding: '14px 16px', color: '#e4e4e7', fontWeight: 500 }}>{row.toolName}</td>
                                <td style={{ padding: '14px 16px', color: '#a1a1aa' }}>{(row as { levelLabel?: string }).levelLabel ?? row.accessLevelDesc}</td>
                                <td style={{ padding: '14px 16px' }}>
                                  {(row as { criticality?: string }).criticality ? (
                                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                                      {(row as { criticality?: string }).criticality}
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 5. AEX – Acessos Extraordinários (ADMIN e SUPER_ADMIN apenas) */}
                  <div className="dashboard-personal-block-section card-base">
                    <h3 style={{ color: '#38BDF8', marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Timer size={18} /> AEX – Acessos Extraordinários
                    </h3>
                    {dashboardAexTickets.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '24px 16px', color: '#71717a', fontSize: 14, margin: 0 }}>Nenhum acesso extraordinário ativo no momento.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left' }}>
                              <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Ferramenta</th>
                              <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Status</th>
                              <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Data de solicitação</th>
                              <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Data de expiração</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardAexTickets.map((r) => {
                              const toolName = (r as Request & { toolName?: string }).toolName ?? (() => {
                                try {
                                  const d = typeof r.details === 'string' ? JSON.parse(r.details || '{}') : r.details;
                                  return d?.toolName ?? d?.tool ?? d?.ferramenta ?? '—';
                                } catch { return '—'; }
                              })();
                              const created = new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                              const days = (r as Request & { accessPeriodDays?: number }).accessPeriodDays;
                              const expiresAt = days != null ? new Date(new Date(r.createdAt).getTime() + days * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                              return (
                                <tr key={r.id} style={{ borderBottom: '1px solid #1f1f22' }}>
                                  <td style={{ padding: '14px 16px', color: '#e4e4e7', fontWeight: 500 }}>{toolName}</td>
                                  <td style={{ padding: '14px 16px', color: '#a1a1aa' }}>{getStatusLabel(r.status)}</td>
                                  <td style={{ padding: '14px 16px', color: '#a1a1aa' }}>{created}</td>
                                  <td style={{ padding: '14px 16px', color: '#a1a1aa' }}>{expiresAt}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bento-grid fade-in">
              {/* Header + data e KBU só para VIEWER (ADMIN/SUPER_ADMIN têm no bloco Minha Visão) */}
              {systemProfile === 'VIEWER' && (
                <>
                  <div className="card-base cell-hero" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderColor: '#334155' }}>
                    <h1 style={{ fontSize: '28px', color: 'white', marginBottom: 10 }}>Olá, {currentUser?.name?.split(' ')[0]}</h1>
                    <p style={{ color: '#94a3b8' }}>Painel de controle operacional ativo.</p>
                  </div>
                  <div className="card-base cell-date">
                    <div style={{ fontSize: '42px', fontWeight: 800, color: 'white' }}>{new Date().getDate()}</div>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#a1a1aa' }}>{new Date().toLocaleDateString('pt-BR', { month: 'short' })}</div>
                  </div>
                  <div className="card-base" style={{ gridColumn: '1 / -1', padding: 24, border: '1px solid #27272a' }}>
                    <h3 style={{ color: '#38BDF8', marginBottom: 8, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={18} /> KBU – Kit Básico Universal
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>Este é o kit de ferramentas padrão de todos os colaboradores do Grupo 3C.</p>
                    {kbuTools.length === 0 ? (
                      <p style={{ color: '#71717a', fontSize: 14 }}>Nenhuma ferramenta no KBU no momento.</p>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 20, color: '#e4e4e7', fontSize: 14, lineHeight: 1.8 }}>
                        {kbuTools.map((f) => (
                          <li key={f.id}>{f.nome}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {/* Viewer: meu perfil (card completo, igual CollaboratorDetails, sem botão Editar) */}
              {systemProfile === 'VIEWER' && currentUser && (
                <div className="card-base" style={{ gridColumn: '1 / -1', padding: 24, border: '1px solid #27272a' }}>
                  <h3 style={{ color: '#38BDF8', marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} /> Meu perfil
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white' }}>
                        {(currentUser.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: 'white', marginBottom: 4 }}>{currentUser.name || '—'}</div>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: (currentUser as { isActive?: boolean }).isActive !== false ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: (currentUser as { isActive?: boolean }).isActive !== false ? '#22c55e' : '#ef4444' }}>
                          {(currentUser as { isActive?: boolean }).isActive !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>Cargo</div>
                        <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{(currentUser as { role?: { name: string } }).role?.name || currentUser.jobTitle || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>Departamento</div>
                        <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{userDeptName(currentUser) || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>Unidade</div>
                        <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{(currentUser as { unitRef?: { name: string } }).unitRef?.name || '—'}</div>
                      </div>
                      {(currentUser as { role?: { code: string | null } }).role?.code && (
                        <div>
                          <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>KBS code</div>
                          <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{((currentUser as { role?: { code: string } }).role?.code || '').split(/\s+e\s+/)[0]?.trim() || (currentUser as { role?: { code: string } }).role?.code}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>E-mail</div>
                        <a href={`mailto:${currentUser.email}`} style={{ color: '#38BDF8', textDecoration: 'none' }}>{currentUser.email || '—'}</a>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 4 }}>Gestor direto</div>
                        <div style={{ color: '#f4f4f5', fontWeight: 500 }}>{currentUser.manager?.name || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Viewer: Meu Kit Básico (fonte única: GET /api/users/me/tools) */}
              {systemProfile === 'VIEWER' && currentUser && (
                <>
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
                            <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Nível de Acesso</th>
                            <th style={{ padding: '12px 16px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>Criticidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewerKitTools.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid #1f1f22' }}>
                              <td style={{ padding: '14px 16px', color: '#e4e4e7', fontWeight: 500 }}>{row.toolName}</td>
                              <td style={{ padding: '14px 16px', color: '#a1a1aa' }}>{(row as { levelLabel?: string }).levelLabel ?? row.accessLevelDesc}</td>
                              <td style={{ padding: '14px 16px' }}>
                                {(row as { criticality?: string }).criticality ? (
                                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                                    {(row as { criticality?: string }).criticality}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {/* Viewer: Acessos Extraordinários (tabela Access isExtraordinary) */}
                <div className="card-base" style={{ gridColumn: '1 / -1', padding: 24, border: '1px solid #27272a' }}>
                  <h3 style={{ color: '#38BDF8', marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Timer size={18} /> Acessos Extraordinários
                  </h3>
                  {viewerExtraordinaryTools.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 24px', color: '#71717a', fontSize: 14, lineHeight: 1.5 }}>
                      Você não possui acessos extraordinários ativos no momento.
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
                          {viewerExtraordinaryTools.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid #1f1f22' }}>
                              <td style={{ padding: '14px 16px', color: '#e4e4e7', fontWeight: 500 }}>{row.toolName}</td>
                              <td style={{ padding: '14px 16px', color: '#a1a1aa' }}>{row.levelLabel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                </>
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
                          background: actionNeededFilter === f ? (f === 'Infra' ? 'rgba(251, 191, 36, 0.2)' : f === 'Acessos' ? 'rgba(14, 165, 233, 0.2)' : f === 'Pessoas' ? 'rgba(52, 211, 153, 0.2)' : '#334155') : '#1E293B',
                          color: actionNeededFilter === f ? (f === 'Infra' ? '#fbbf24' : f === 'Acessos' ? '#38BDF8' : f === 'Pessoas' ? '#34d399' : '#e4e4e7') : '#71717a',
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
                      const isPendingStatus = (s: string) => (s && (s.startsWith('PENDENTE') || s === 'PENDING_OWNER' || s === 'PENDING_SI' || s === 'EM_ATENDIMENTO' || s === 'AGENDADO'));
                      const pendingForMe = requests.filter(r => {
                        if (!isPendingStatus(r.status)) return false;
                        if (systemProfile === 'SUPER_ADMIN' || systemProfile === 'ADMIN') return true;
                        return r.approverId === currentUser?.id || r.assigneeId === currentUser?.id || r.approverId == null;
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
                              <button
                                className="btn-mini approve"
                                onClick={() => { navigate('/tickets'); setSelectedChamadoId(r.id); }}
                              >
                                Acessar chamado
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className={`card-base ${systemProfile === 'VIEWER' ? '' : 'cell-feed'}`} style={systemProfile === 'VIEWER' ? { gridColumn: '1 / -1' } : undefined}>
                <div className="card-header"><span className="card-title">Feed Recente</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests
                    .filter(r => systemProfile === 'VIEWER' ? r?.requester?.id === currentUser?.id : true)
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
            </>
          )}

          {/* GESTÃO DE PESSOAS INTERATIVA (LISTA EM CASCATA) */}
          {!collaboratorId && activeTab === 'PEOPLE' && (
            <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: 'white', fontSize: 20, margin: 0 }}>Gestão de Pessoas</h2>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <PersonnelListView
                  units={units}
                  users={allUsers.filter(u => userDeptName(u) && userDeptName(u) !== 'Geral')}
                  departments={departments.filter((d: any) => d.name !== 'Geral')}
                  roles={roles}
                  onEditUser={(user) => {
                    setSelectedUser(user);
                    setIsEditUserModalOpen(true);
                  }}
                  onViewCollaborator={(user) => {
                    const path = `/collaborators/${user.id}`;
                    console.log('navigating to', path);
                    navigate(path);
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
                  onAddCollaborator={systemProfile === 'SUPER_ADMIN' ? (role, dept) => {
                    setAddCollaboratorContext({ role: { id: role.id, name: role.name }, department: { id: dept.id, name: dept.name } });
                    setAddCollaboratorName('');
                    setAddCollaboratorEmail('');
                    setIsAddCollaboratorModalOpen(true);
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
                  onAddDepartmentToUnit={['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) ? (unit) => {
                    setSelectedUnitForAddDept(unit);
                    setIsCreateDepartmentModalOpen(true);
                  } : undefined}
                  onEditUnit={['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) ? (unit) => {
                    setSelectedUnitForEdit(unit);
                    setIsEditUnitModalOpen(true);
                  } : undefined}
                  onDeleteUnit={['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) ? handleDeleteUnit : undefined}
                />
              </div>
            </div>
          )}

          {/* KBU — Kit Básico Universal (topo do Catálogo, visível para todos os perfis) */}
          {!collaboratorId && activeTab === 'TOOLS' && !selectedTool && (
            <div className="fade-in" style={{ marginBottom: 32 }}>
              <h2 style={{ color: 'white', fontSize: 20, marginBottom: 12 }}>Kit Básico Universal (KBU)</h2>
              <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 16 }}>Ferramentas padrão para todos os colaboradores.</p>
              {systemProfile === 'SUPER_ADMIN' && showAddKbuForm && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Nome da ferramenta"
                    value={newKbuNome}
                    onChange={(e) => setNewKbuNome(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F0F9FF', minWidth: 180 }}
                  />
                  <input
                    type="text"
                    placeholder="Nome do responsável"
                    value={newKbuOwnerNome}
                    onChange={(e) => setNewKbuOwnerNome(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F0F9FF', minWidth: 140 }}
                  />
                  <input
                    type="text"
                    placeholder="E-mail do responsável"
                    value={newKbuOwnerEmail}
                    onChange={(e) => setNewKbuOwnerEmail(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F0F9FF', minWidth: 160 }}
                  />
                  <button type="button" onClick={handleKbuAdd} className="btn-mini" style={{ padding: '8px 16px' }}>Adicionar</button>
                  <button type="button" onClick={() => { setShowAddKbuForm(false); setNewKbuNome(''); setNewKbuOwnerNome(''); setNewKbuOwnerEmail(''); }} className="btn-mini btn-mini-cancel" style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #334155', color: '#94A3B8' }}>Cancelar</button>
                </div>
              )}
              {systemProfile === 'SUPER_ADMIN' && !showAddKbuForm && (
                <button type="button" onClick={() => setShowAddKbuForm(true)} className="btn-mini" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PlusCircle size={14} /> Adicionar ferramenta ao KBU
                </button>
              )}
              <div className="kbu-grid">
                {kbuTools.map((item) => (
                  <div
                    key={item.id}
                    className="tool-tile"
                    role={systemProfile === 'SUPER_ADMIN' ? 'button' : undefined}
                    onClick={systemProfile === 'SUPER_ADMIN' ? () => handleKbuOpenEditOwner(item) : undefined}
                    style={systemProfile !== 'SUPER_ADMIN' ? { cursor: 'default' } : undefined}
                  >
                    <div className="tile-icon"><Layers size={24} /></div>
                    <div className="tile-info">
                      <h3>{item.nome}</h3>
                      <p>{item.ownerNome?.trim() || 'Sem responsável'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATÁLOGO DE TOOLS (LISTA) */}
          {!collaboratorId && activeTab === 'TOOLS' && !selectedTool && (
            <div className="fade-in">
              <h2 style={{ color: 'white', fontSize: 20, marginBottom: 20 }}>Sistemas Conectados</h2>
              <div className="tools-wrapper">
                {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) && (
                  <div className="tool-tile add-new" onClick={() => setIsCreateModalOpen(true)} style={{ border: '2px dashed #3f3f46', background: 'transparent' }}>
                    <div className="tile-icon" style={{ background: 'transparent' }}><PlusCircle size={24} color="#0EA5E9" /></div>
                    <div className="tile-info">
                      <h3 style={{ color: '#38BDF8' }}>Adicionar Ferramenta</h3>
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
          {!collaboratorId && activeTab === 'TOOLS' && selectedTool && (
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
                  <div style={{ fontSize: 10, color: '#38BDF8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Owner (Dono)</div>
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
                <div className="card-base" style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderLeft: '3px solid #0EA5E9' }}>
                  <div style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Descrição</div>
                  <div style={{ color: '#a1a1aa', fontSize: 14, lineHeight: '1.5', maxHeight: '60px', overflowY: 'auto' }}>
                    {selectedTool.description || "Gestão e automação de acessos via Theris OS."}
                  </div>
                </div>
              </div>

              {/* ACESSOS POR CARGO / KBS (Accordion) */}
              <div className="card-base" style={{ padding: 0, overflow: 'hidden', border: '1px solid #27272a', marginTop: 8 }}>
                <div
                  onClick={() => setExpandedKbsSection(prev => !prev)}
                  style={{
                    padding: '16px 20px',
                    background: expandedKbsSection ? 'rgba(34, 197, 94, 0.08)' : '#18181b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: expandedKbsSection ? '1px solid #27272a' : 'none'
                  }}
                >
                  <h3 style={{ color: '#22c55e', margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={20} /> Acessos por Cargo / KBS
                  </h3>
                  <ChevronRight size={20} color="#22c55e" style={{ transform: expandedKbsSection ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
                {expandedKbsSection && (
                  <div style={{ padding: 20 }}>
                    {(!selectedTool.kbsByRole || selectedTool.kbsByRole.length === 0) ? (
                      <div style={{ textAlign: 'center', color: '#52525b', padding: 32, borderStyle: 'dashed', borderColor: 'rgba(34, 197, 94, 0.2)', borderRadius: 8 }}>
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
                  </div>
                )}
              </div>

              {/* LISTA DE USUÁRIOS AGRUPADOS POR NÍVEL (PERMANENTE) */}
              <h3 style={{ color: '#d4d4d8', marginBottom: 15, fontSize: 18, marginTop: 32 }}>Níveis de Acesso da Ferramenta</h3>

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
                          <span style={{ fontWeight: 600, color: '#f4f4f5', fontSize: 15 }}>
                            {(() => {
                              const descData = (selectedTool.accessLevelDescriptions as any)?.[level];
                              const description = typeof descData === 'object' ? descData.description : (typeof descData === 'string' ? descData : null);
                              return description ? `${level} - ${description}` : level;
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

              {/* ACESSOS EXTRAORDINÁRIOS (Temporários) — Accordion */}
              <div className="card-base" style={{ padding: 0, overflow: 'hidden', border: '1px solid #27272a', marginTop: 40 }}>
                <div
                  onClick={() => setIsExtraordinaryOpen(prev => !prev)}
                  style={{
                    padding: '16px 20px',
                    background: isExtraordinaryOpen ? 'rgba(14, 165, 233, 0.1)' : '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: isExtraordinaryOpen ? '1px solid #27272a' : 'none'
                  }}
                >
                  <h3 style={{ color: '#c084fc', margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Timer size={20} /> Acessos Extraordinários (Temporários)
                  </h3>
                  <ChevronRight size={20} color="#c084fc" style={{ transform: isExtraordinaryOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
                {isExtraordinaryOpen && (
                  <div style={{ padding: 20 }}>
                    {(() => {
                      const { extraordinary, extraordinaryApprovals } = getGroupedAccesses(selectedTool);
                      const hasExtra = extraordinary.length > 0 || extraordinaryApprovals.length > 0;
                      if (!hasExtra) {
                        return (
                          <div style={{ textAlign: 'center', color: '#52525b', padding: 40, borderStyle: 'dashed', borderColor: 'rgba(167, 139, 250, 0.2)', borderRadius: 8 }}>
                            Nenhum acesso extraordinário vigente.
                          </div>
                        );
                      }
                      const statusLabel = (s: string) => s === 'ACTIVE' ? 'ATIVO' : s === 'INACTIVE' ? 'INATIVO' : s;
                      const statusColor = (s: string) => s === 'ACTIVE' ? '#22c55e' : s === 'INACTIVE' ? '#ef4444' : '#71717a';
                      const formatDataConcessao = (d: string | Date | undefined) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                      const duracaoTexto = (dur: number | undefined, u: string | undefined) => (dur != null && u) ? `${dur} ${u}` : 'Não informada';
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* Cabeçalho da lista */}
                          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 140px 100px 90px minmax(80px, auto)', gap: 12, padding: '8px 16px', fontSize: 10, color: '#71717a', textTransform: 'uppercase', fontWeight: 700, borderBottom: '1px solid #27272a' }}>
                            <span></span>
                            <span>Colaborador</span>
                            <span>Status</span>
                            <span>Nível</span>
                            <span>Duração</span>
                            <span>Desde</span>
                            <span></span>
                          </div>
                          {extraordinary.map((acc) => (
                            <div key={acc.id || acc.user.id} style={{
                              display: 'grid',
                              gridTemplateColumns: '40px 1fr 80px 140px 100px 90px minmax(80px, auto)',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              background: 'rgba(167, 139, 250, 0.05)',
                              border: '1px solid rgba(167, 139, 250, 0.15)',
                              borderRadius: 8
                            }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2e1065', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                                {acc.user.name.charAt(0)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{acc.user.name}</div>
                                <div style={{ color: '#a1a1aa', fontSize: 12 }}>{acc.user.email}</div>
                              </div>
                              <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: `${statusColor(acc.status)}22`, color: statusColor(acc.status), fontWeight: 700, textTransform: 'uppercase' }}>
                                {statusLabel(acc.status)}
                              </span>
                              <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: 'rgba(14, 165, 233, 0.2)', color: '#38BDF8', fontWeight: 600 }}>
                                {acc.level ?? '—'}
                              </span>
                              <div style={{ color: '#f4f4f5', fontSize: 13 }}>{duracaoTexto(acc.duration, acc.unit)}</div>
                              <div style={{ color: '#a1a1aa', fontSize: 12 }}>{formatDataConcessao(acc.createdAt)}</div>
                              {['ADMIN', 'SUPER_ADMIN'].includes(systemProfile) ? (
                                <button
                                  className="btn-mini"
                                  style={{ padding: '6px 10px', display: 'flex', gap: 4, alignItems: 'center', background: '#27272a', justifySelf: 'start' }}
                                  onClick={() => { setSelectedAccess(acc); setIsEditAccessModalOpen(true); }}
                                >
                                  <Pen size={12} /> Editar
                                </button>
                              ) : <span />}
                            </div>
                          ))}
                          {extraordinaryApprovals.map((req) => (
                            <div key={req.id} style={{
                              display: 'grid',
                              gridTemplateColumns: '40px 1fr 80px 140px 100px 90px minmax(80px, auto)',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              background: 'rgba(167, 139, 250, 0.05)',
                              border: '1px solid rgba(167, 139, 250, 0.15)',
                              borderRadius: 8
                            }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2e1065', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                                {req.requesterName.charAt(0)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{req.requesterName}</div>
                                <div style={{ color: '#a1a1aa', fontSize: 12 }}>{req.requesterEmail ?? '—'}</div>
                              </div>
                              <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: '#22c55e22', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase' }}>Aprovado</span>
                              <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: 'rgba(14, 165, 233, 0.2)', color: '#38BDF8', fontWeight: 600 }}>{req.level}</span>
                              <div style={{ color: '#f4f4f5', fontSize: 13 }}>Não informada</div>
                              <div style={{ color: '#a1a1aa', fontSize: 12 }}>{formatDataConcessao(req.approvedAt)}</div>
                              <span></span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AUDITORIA */}
          {!collaboratorId && activeTab === 'HISTORY' && (
            <div className="fade-in">
              <h2 style={{ color: 'white', fontSize: 20, margin: 0, marginBottom: 12 }}>Relatório de Chamados</h2>
              {/* Header: Total à esquerda, Personalizar Colunas + Baixar à direita */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, position: 'relative' }}>
                <div style={{ fontSize: 12, color: '#71717a' }}>
                  {systemProfile === 'VIEWER' ? 'Seus registros' : 'Total de Registros'}: {
                    requests.filter(r => {
                      if (r.status === 'PENDENTE') return false;
                      if (systemProfile === 'VIEWER') return r?.requester?.id === currentUser?.id;
                      return true;
                    }).length
                  }
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowFilterPanel(prev => !prev)}
                    className="input-base"
                    style={{ height: 40, background: '#18181b', fontSize: 12, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #27272a', borderRadius: 8, cursor: 'pointer', color: '#e4e4e7' }}
                  >
                    <Settings size={14} color="#0EA5E9" /> Personalizar Colunas
                  </button>
                  {systemProfile === 'SUPER_ADMIN' && (
                    <button
                      onClick={() => setShowExportModal(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', height: 40,
                        background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #0EA5E9',
                        color: '#38BDF8', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      <Download size={14} /> Baixar Relatório
                    </button>
                  )}
                  {showFilterPanel && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
                      background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, padding: 16, minWidth: 320, boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', marginBottom: 12 }}>Tipos de solicitação</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                        {REQUEST_TYPE_OPTIONS.map(opt => (
                          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#e4e4e7', fontSize: 12 }}>
                            <input type="checkbox" checked={typeFilterEnabled[opt.value] !== false} onChange={e => setTypeFilterEnabled(prev => ({ ...prev, [opt.value]: e.target.checked }))} />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', marginBottom: 8 }}>Colunas visíveis</div>
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
              {/* Barra de filtros: uma linha horizontal (nowrap; wrap em &lt;1024px via CSS) */}
              <div className="report-filters-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder={systemProfile === 'VIEWER' ? "Buscar em seus pedidos..." : "Buscar por nome do solicitante ou ID..."}
                  className="input-base"
                  style={{ minWidth: 180, flex: 1, height: 40, padding: '8px 12px', background: '#18181b', fontSize: 12, borderRadius: 8, boxSizing: 'border-box' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <input
                  type="date"
                  placeholder="De"
                  value={reportPeriodStart}
                  onChange={e => setReportPeriodStart(e.target.value)}
                  className="input-base"
                  title="De"
                  style={{ width: 130, flexShrink: 0, height: 40, background: '#18181b', fontSize: 12, cursor: 'pointer' }}
                />
                <input
                  type="date"
                  value={reportPeriodEnd}
                  onChange={e => setReportPeriodEnd(e.target.value)}
                  className="input-base"
                  placeholder="Até"
                  title="Até"
                  style={{ width: 130, flexShrink: 0, height: 40, background: '#18181b', fontSize: 12, cursor: 'pointer' }}
                />
                <select
                  className="input-base"
                  style={{ width: 130, flexShrink: 0, height: 40, background: '#18181b', fontSize: 12, padding: '0 10px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="ALL">Status: Todos</option>
                  <option value="PENDENTE">Ação Pendente</option>
                  <option value="APROVADO">Concluído / Aprovado</option>
                  <option value="REPROVADO">Recusado / Reprovado</option>
                </select>
                {(['ALL', 'GESTAO_PESSOAS', 'GESTAO_ACESSOS', 'TI_INFRA'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setReportCategoryFilter(f)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      border: 'none',
                      transition: 'all 0.2s',
                      background: reportCategoryFilter === f ? (f === 'TI_INFRA' ? 'rgba(251, 191, 36, 0.2)' : f === 'GESTAO_ACESSOS' ? 'rgba(34, 197, 94, 0.2)' : f === 'GESTAO_PESSOAS' ? 'rgba(167, 139, 250, 0.2)' : '#27272a') : 'transparent',
                      color: reportCategoryFilter === f ? (f === 'TI_INFRA' ? '#fbbf24' : f === 'GESTAO_ACESSOS' ? '#22c55e' : f === 'GESTAO_PESSOAS' ? '#38BDF8' : 'white') : '#71717a',
                      cursor: 'pointer',
                    }}
                  >
                    {f === 'ALL' ? 'Todos' : f === 'GESTAO_PESSOAS' ? 'Pessoas' : f === 'GESTAO_ACESSOS' ? 'Acessos' : 'Infra'}
                  </button>
                ))}
                <button
                  onClick={applyReportFilters}
                  style={{ height: 40, padding: '0 16px', flexShrink: 0, background: '#3f3f46', border: '1px solid #52525b', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Filtrar
                </button>
              </div>

              <div className="card-base" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
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
                        if (systemProfile === 'VIEWER' && r?.requester?.id !== currentUser?.id) return false;

                        // 1. Filtro por tipo (personalizado)
                        const typeKey = REQUEST_TYPE_OPTIONS.some(o => o.value === r.type) ? r.type : '__OTHER__';
                        if (typeFilterEnabled[typeKey] === false) return false;

                        // 2. Filtro de Status
                        if (statusFilter !== 'ALL') {
                          if (statusFilter === 'PENDENTE') {
                            if (!r.status.startsWith('PENDENTE')) return false;
                          } else if (r.status !== statusFilter) return false;
                        }

                        // 3. Filtro de Categoria
                        const GESTAO_PESSOAS_TYPES = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
                        const GESTAO_ACESSOS_TYPES = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
                        const TI_INFRA_TYPES = ['INFRA_SUPPORT'];
                        if (reportCategoryFilter === 'GESTAO_PESSOAS' && !GESTAO_PESSOAS_TYPES.includes(r.type)) return false;
                        if (reportCategoryFilter === 'GESTAO_ACESSOS' && !GESTAO_ACESSOS_TYPES.includes(r.type)) return false;
                        if (reportCategoryFilter === 'TI_INFRA' && !TI_INFRA_TYPES.includes(r.type)) return false;

                        // 4. Filtro de Período
                        const dateVal = new Date(r.updatedAt || r.createdAt).getTime();
                        if (reportPeriodStart) {
                          const start = new Date(reportPeriodStart).setHours(0, 0, 0, 0);
                          if (dateVal < start) return false;
                        }
                        if (reportPeriodEnd) {
                          const end = new Date(reportPeriodEnd + 'T23:59:59').getTime();
                          if (dateVal > end) return false;
                        }

                        // 5. Busca
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
                          'VPN_ACCESS': 'Acesso a VPN',
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
                          if ((r as { actionDate?: string }).actionDate) parts.push(`Data de Ação: ${new Date((r as { actionDate: string }).actionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`);
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
                                  color: category === 'Gestão de Ferramentas' ? '#38BDF8' :
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
                                    <Shield size={14} color="#0EA5E9" />
                                    <span style={{ color: '#38BDF8' }}>{r.approver.name}</span>
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
                              <td style={{ padding: '16px', color: '#71717a' }}>
                                {r.adminNote || '-'}
                              </td>
                            )}
                            {visibleColumns.justificativa !== false && (
                              <td style={{ padding: '16px', color: '#a1a1aa', fontSize: 12 }}>
                                {r.justification || '-'}
                              </td>
                            )}
                            {visibleColumns.detalhes !== false && (
                              <td style={{ padding: '16px', color: '#a1a1aa', fontSize: 11 }}>
                                {formatDetails()}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    {requests.filter(r => {
                      if (systemProfile === 'VIEWER' && r?.requester?.id !== currentUser?.id) return false;
                      const typeKey = REQUEST_TYPE_OPTIONS.some(o => o.value === r.type) ? r.type : '__OTHER__';
                      if (typeFilterEnabled[typeKey] === false) return false;
                      if (statusFilter !== 'ALL') {
                        if (statusFilter === 'PENDENTE' && !r.status.startsWith('PENDENTE')) return false;
                        if (statusFilter !== 'PENDENTE' && r.status !== statusFilter) return false;
                      }
                      const GESTAO_PESSOAS_TYPES = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
                      const GESTAO_ACESSOS_TYPES = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
                      const TI_INFRA_TYPES = ['INFRA_SUPPORT'];
                      if (reportCategoryFilter === 'GESTAO_PESSOAS' && !GESTAO_PESSOAS_TYPES.includes(r.type)) return false;
                      if (reportCategoryFilter === 'GESTAO_ACESSOS' && !GESTAO_ACESSOS_TYPES.includes(r.type)) return false;
                      if (reportCategoryFilter === 'TI_INFRA' && !TI_INFRA_TYPES.includes(r.type)) return false;
                      const dateVal2 = new Date(r.updatedAt || r.createdAt).getTime();
                      if (reportPeriodStart) {
                        const start2 = new Date(reportPeriodStart).setHours(0, 0, 0, 0);
                        if (dateVal2 < start2) return false;
                      }
                      if (reportPeriodEnd) {
                        const end2 = new Date(reportPeriodEnd + 'T23:59:59').getTime();
                        if (dateVal2 > end2) return false;
                      }
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

          {/* HISTÓRICO DE AUDITORIA (oculto para VIEWER) */}
          {!collaboratorId && activeTab === 'AUDIT_LOG' && systemProfile !== 'VIEWER' && (
            <AuditLog
              initialEntidadeId={auditLogFilters.entidadeId}
              initialEntidadeTipo={auditLogFilters.entidadeTipo}
            />
          )}

          {/* TENTATIVAS DE LOGIN (apenas SUPER_ADMIN) */}
          {!collaboratorId && activeTab === 'LOGIN_ATTEMPTS' && systemProfile === 'SUPER_ADMIN' && currentUser && (
            <LoginAttempts currentUserId={currentUser.id} />
          )}

          {/* SESSÕES ATIVAS (apenas SUPER_ADMIN) */}
          {!collaboratorId && activeTab === 'ACTIVE_SESSIONS' && systemProfile === 'SUPER_ADMIN' && currentUser && (
            <ActiveSessions currentUserId={currentUser.id} showToast={showToast} />
          )}

          {/* GESTÃO DE CHAMADOS / CHAMADOS RELACIONADOS (Viewer) */}
          {!collaboratorId && (activeTab === 'TICKETS' || activeTab === 'MY_TICKETS') && (
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
                          {(() => {
                            const isAex = ['ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'].includes(chamadoDetail.type) || chamadoDetail.isExtraordinary;
                            const isVpn = chamadoDetail.type === 'VPN_ACCESS';
                            const isDualApproval = isAex || isVpn;
                            const ownerApprovedBy = (chamadoDetail as { ownerApprovedBy?: string }).ownerApprovedBy;
                            const siApprovedBy = (chamadoDetail as { siApprovedBy?: string }).siApprovedBy;
                            const firstApproverLabel = isVpn ? 'Líder' : 'Owner';
                            if (!isDualApproval || chamadoDetail.status === 'APROVADO' || chamadoDetail.status === 'REPROVADO' || chamadoDetail.status === 'RESOLVED') return null;
                            if (chamadoDetail.status === 'PENDING_OWNER' && !ownerApprovedBy && !siApprovedBy) {
                              return (
                                <div style={{ background: 'rgba(167, 139, 250, 0.15)', borderRadius: 12, padding: 16, border: '1px solid rgba(167, 139, 250, 0.4)' }}>
                                  <span style={{ color: '#38BDF8', fontSize: 14 }}>🔒 Este chamado requer aprovação dupla: {isVpn ? 'Líder direto' : 'Owner/Sub-owner da ferramenta'} + Time de SI. Aguardando aprovação do {firstApproverLabel}.</span>
                                </div>
                              );
                            }
                            if (chamadoDetail.status === 'PENDING_SI' && ownerApprovedBy) {
                              return (
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: 12, padding: 16, border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                                  <span style={{ color: '#22c55e', fontSize: 14 }}>✅ {firstApproverLabel} aprovou. Aguardando aprovação final do Time de SI.</span>
                                </div>
                              );
                            }
                            if (chamadoDetail.status === 'PENDENTE_OWNER' && siApprovedBy) {
                              return (
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: 12, padding: 16, border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                                  <span style={{ color: '#22c55e', fontSize: 14 }}>✅ Time de SI aprovou. Aguardando aprovação do {isVpn ? 'líder' : 'Owner/Sub-owner'}.</span>
                                </div>
                              );
                            }
                            if ((ownerApprovedBy || siApprovedBy) && !(ownerApprovedBy && siApprovedBy)) {
                              return (
                                <div style={{ background: 'rgba(39, 39, 42, 0.6)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #3f3f46' }}>
                                  <Lock size={24} color="#71717a" />
                                  <span style={{ color: '#a1a1aa', fontSize: 14 }}>🔒 Não é possível encerrar este chamado ainda. Ambas as partes precisam aprovar antes do fechamento. Aguardando: {ownerApprovedBy ? 'Time de SI' : firstApproverLabel}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {buildChamadoTimeline(chamadoDetail).map((ev, idx) => {
                            const ts = formatEventDateBRT(ev.createdAt);
                            const boxStyle = { padding: 12, background: '#1E293B', borderRadius: 8, borderLeft: '3px solid #0EA5E9' } as const;
                            const boxStyleAlt = { padding: 12, background: '#18181b', borderRadius: 8 } as const;
                            const labelStyle = { fontSize: 12, color: '#a1a1aa' };
                            const metaStyle = { fontSize: 11, color: '#71717a', marginBottom: 4 };

                            if (ev.kind === 'TICKET_CREATED') {
                              return (
                                <div key={`created-${idx}`} style={boxStyle}>
                                  <div style={metaStyle}>Abertura · {ts}</div>
                                  <div style={{ fontSize: 13, color: '#e4e4e7', marginBottom: 8 }}>Solicitação criada · {ev.request.type}</div>
                                  {ev.request.status === 'PENDING_SI' && (['ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'].includes(ev.request.type) || ev.request.type === 'VPN_ACCESS') && (ev.request as { ownerApprovedByName?: string }).ownerApprovedByName && (
                                    <>
                                      <div style={labelStyle}>Aprovado pelo {ev.request.type === 'VPN_ACCESS' ? 'Líder' : 'Owner'}: {(ev.request as { ownerApprovedByName: string }).ownerApprovedByName}</div>
                                      {(ev.request as { ownerIsSIMember?: boolean }).ownerIsSIMember && (
                                        <div style={{ ...labelStyle, marginBottom: 8, background: 'rgba(251, 191, 36, 0.1)', padding: '8px 12px', borderRadius: 8 }}>⚠️ O Owner desta ferramenta é do time de SI. A aprovação final deve ser feita por outro integrante do time.</div>
                                      )}
                                    </>
                                  )}
                                  {getTicketHistoryDetailLines(ev.request).map((l, i) => (
                                    <div key={i} style={{ marginTop: 6, ...labelStyle }}>
                                      <span style={{ color: '#71717a' }}>{l.label}:</span> {l.value}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            if (ev.kind === 'STATUS_CHANGED') {
                              return (
                                <div key={`status-${idx}-${ev.createdAt}`} style={boxStyleAlt}>
                                  <div style={{ fontSize: 13, color: '#e4e4e7', marginBottom: 6 }}>🔄 Status atualizado</div>
                                  <div style={{ ...labelStyle, marginTop: 4 }}><span style={{ color: '#71717a' }}>De:</span> {getStatusLabel(ev.from)} → <span style={{ color: '#71717a' }}>Para:</span> {getStatusLabel(ev.to)}</div>
                                  <div style={metaStyle}>Por: {ev.authorName} · {ts}</div>
                                </div>
                              );
                            }
                            if (ev.kind === 'ASSIGNEE_CHANGED') {
                              return (
                                <div key={`assignee-${idx}-${ev.createdAt}`} style={boxStyleAlt}>
                                  <div style={{ fontSize: 13, color: '#e4e4e7', marginBottom: 6 }}>👤 Responsável atualizado</div>
                                  <div style={{ ...labelStyle, marginTop: 4 }}><span style={{ color: '#71717a' }}>Para:</span> {ev.assigneeName}</div>
                                  <div style={metaStyle}>Por: {ev.authorName} · {ts}</div>
                                </div>
                              );
                            }
                            if (ev.kind === 'COMMENT_ADDED') {
                              const c = ev.comment;
                              return (
                                <div key={c.id} style={boxStyleAlt}>
                                  <div style={{ fontSize: 13, color: '#e4e4e7', marginBottom: 6 }}>💬 Novo comentário</div>
                                  <div style={{ ...labelStyle, marginTop: 4 }}><span style={{ color: '#71717a' }}>Por:</span> {c.author?.name || 'Sistema'} · {ts}</div>
                                  <div style={{ fontSize: 13, color: '#e4e4e7', whiteSpace: 'pre-wrap', marginTop: 6 }}>&quot;{c.body}&quot;</div>
                                  {c.kind !== 'COMMENT' && <span style={{ marginTop: 4, display: 'block', fontSize: 11, color: '#38BDF8' }}>({c.kind === 'SOLUTION' ? 'Solução' : 'Tarefa agendada'})</span>}
                                </div>
                              );
                            }
                            if (ev.kind === 'ATTACHMENT_ADDED') {
                              const a = ev.attachment;
                              return (
                                <div key={a.id} style={boxStyleAlt}>
                                  <div style={{ fontSize: 13, color: '#e4e4e7', marginBottom: 6 }}>📎 Anexo adicionado</div>
                                  <div style={{ ...labelStyle, marginTop: 4 }}><span style={{ color: '#71717a' }}>Arquivo:</span> {a.filename}</div>
                                  <div style={metaStyle}>Por: {a.uploadedBy?.name ?? 'Sistema'} · {ts}</div>
                                  <a href={a.fileUrl.startsWith('http') ? a.fileUrl : `${API_URL}${a.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', fontSize: 12, marginTop: 4, display: 'inline-block' }}>Abrir arquivo</a>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                        <div style={{ padding: 16, borderTop: '1px solid #27272a' }}>
                          {(chamadoDetail.status === 'APROVADO' || chamadoDetail.status === 'REPROVADO') ? (
                            <div style={{ background: 'rgba(39, 39, 42, 0.6)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #3f3f46' }}>
                              <Lock size={24} color="#71717a" />
                              <span style={{ color: '#a1a1aa', fontSize: 14 }}>🔒 Este chamado foi encerrado e não aceita novas mensagens.</span>
                            </div>
                          ) : (
                            <>
                              {(activeTab === 'MY_TICKETS') ? null : (
                                <>
                                  <select className="input-base" style={{ marginBottom: 8, background: '#18181b', fontSize: 12 }} value={chamadoCommentKind} onChange={e => { setChamadoCommentKind(e.target.value as any); if (e.target.value !== 'SCHEDULED_TASK') setChamadoScheduledAt(''); }}>
                                    <option value="COMMENT">Comentário</option>
                                    <option value="SOLUTION">Adicionar uma solução</option>
                                    <option value="SCHEDULED_TASK">Criar uma tarefa agendada</option>
                                  </select>
                                  {chamadoCommentKind === 'SOLUTION' && (chamadoDetail as { canAddSolution?: boolean }).canAddSolution === false && (chamadoDetail as { solutionBlockReason?: string }).solutionBlockReason && (
                                    <div style={{ background: 'rgba(167, 139, 250, 0.15)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid rgba(167, 139, 250, 0.4)' }}>
                                      <span style={{ color: '#38BDF8', fontSize: 14 }}>🔒 {(chamadoDetail as { solutionBlockReason: string }).solutionBlockReason}</span>
                                    </div>
                                  )}
                                  {chamadoCommentKind === 'SCHEDULED_TASK' && (
                                    <div style={{ marginBottom: 8 }}>
                                      <label style={{ display: 'block', fontSize: 11, color: '#71717a', marginBottom: 4 }}>Data e horário planejado</label>
                                      <input
                                        type="datetime-local"
                                        className="input-base"
                                        style={{ width: '100%', background: '#18181b', fontSize: 12 }}
                                        value={chamadoScheduledAt}
                                        onChange={e => setChamadoScheduledAt(e.target.value)}
                                        onClick={e => { const t = e.currentTarget; if (t.showPicker) t.showPicker(); }}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                              {(() => {
                                const solutionBlocked = chamadoCommentKind === 'SOLUTION' && (chamadoDetail as { canAddSolution?: boolean })?.canAddSolution === false;
                                return (
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
                                <button type="button" className="btn-mini" style={{ background: solutionBlocked ? '#0284C7' : '#0EA5E9', opacity: solutionBlocked ? 0.6 : 1, cursor: solutionBlocked ? 'not-allowed' : 'pointer' }} onClick={handleAddComment} disabled={solutionBlocked}>Enviar</button>
                              </div>
                                );
                              })()}
                              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <input type="file" ref={chamadoFileInputRef} style={{ display: 'none' }} onChange={handleChamadoAddAttachment} />
                                <button type="button" className="btn-mini" style={{ background: '#27272a', color: '#e4e4e7' }} onClick={() => chamadoFileInputRef.current?.click()} disabled={chamadoAttachmentUploading}>
                                  {chamadoAttachmentUploading ? 'Enviando...' : 'Adicionar documento'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Sidebar metadados */}
                      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card-base" style={{ padding: 20 }}>
                          <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Data e hora de abertura</div>
                          <div style={{ color: '#e4e4e7' }}>{new Date(chamadoDetail.createdAt).toLocaleString('pt-BR')}</div>
                        </div>
                        {chamadoDetail.actionDate && (
                          <div className="card-base" style={{ padding: 20 }}>
                            <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Data de Ação</div>
                            <div style={{ color: '#e4e4e7' }}>{new Date(chamadoDetail.actionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                          </div>
                        )}
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
                        {(() => {
                          const isAex = ['ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'].includes(chamadoDetail.type) || chamadoDetail.isExtraordinary;
                          const isVpn = chamadoDetail.type === 'VPN_ACCESS';
                          const showDualApprovalButtons = (isAex || isVpn) && chamadoDetail.status === 'PENDING_SI' && (chamadoDetail as { ownerApprovedBy?: string }).ownerApprovedBy && activeTab !== 'MY_TICKETS' && ['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(systemProfile);
                          return (
                            <>
                              {showDualApprovalButtons && (
                                <div className="card-base" style={{ padding: 20 }}>
                                  <label style={{ display: 'block', fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>{isVpn ? 'Ação VPN' : 'Ação AEX'}</label>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className="btn-mini approve" style={{ flex: 1 }} onClick={() => handleChamadoApprove('APROVAR')}>Aprovar</button>
                                    <button type="button" className="btn-mini" style={{ flex: 1, background: '#dc2626', color: 'white' }} onClick={() => handleChamadoApprove('REPROVADO')}>Reprovar</button>
                                  </div>
                                </div>
                              )}
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
                            </>
                          );
                        })()}
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
                        <div className="card-base" style={{ padding: 20, position: 'relative' }}>
                          <label style={{ display: 'block', fontSize: 11, color: '#71717a', textTransform: 'uppercase', marginBottom: 8 }}>Responsável</label>
                          {(activeTab === 'MY_TICKETS') ? (
                            <div style={{ color: '#e4e4e7', fontSize: 13 }}>{chamadoDetail.assignee?.name || '— Não atribuído'}</div>
                          ) : (
                            <>
                              <input
                                type="text"
                                className="input-base"
                                style={{ width: '100%', background: '#18181b', fontSize: 12 }}
                                value={assigneeSearchOpen ? assigneeSearchQuery : (chamadoDetail.assignee?.name || '')}
                                onChange={e => { setAssigneeSearchQuery(e.target.value); setAssigneeSearchOpen(true); }}
                                onFocus={() => { setAssigneeSearchOpen(true); setAssigneeSearchQuery(''); }}
                                onBlur={() => setTimeout(() => { setAssigneeSearchOpen(false); setAssigneeSearchQuery(''); }, 150)}
                                placeholder="— Não atribuído ou busque por nome..."
                              />
                              {assigneeSearchOpen && (() => {
                                const searchTerm = assigneeSearchQuery.trim();
                                const filteredUsers = allUsers
                                  .filter((u: User) => ['ADMIN', 'SUPER_ADMIN', 'APPROVER'].includes(u.systemProfile))
                                  .filter((u: User) => !searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()));
                                return (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, zIndex: 50, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                                  <div
                                    style={{ padding: '10px 12px', cursor: 'pointer', color: '#e4e4e7', fontSize: 13, borderBottom: '1px solid #27272a' }}
                                    onMouseDown={e => { e.preventDefault(); handleChamadoMetadataChange('assigneeId', null); setAssigneeSearchOpen(false); setAssigneeSearchQuery(''); }}
                                  >
                                    — Não atribuído
                                  </div>
                                  {filteredUsers.map((u: User) => (
                                      <div
                                        key={u.id}
                                        style={{ padding: '10px 12px', cursor: 'pointer', color: '#e4e4e7', fontSize: 13, borderBottom: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: 2 }}
                                        className="hover:bg-zinc-800"
                                        onMouseDown={(e) => { e.preventDefault(); handleChamadoMetadataChange('assigneeId', u.id); setAssigneeSearchOpen(false); setAssigneeSearchQuery(''); }}
                                      >
                                        <span>{u.name}</span>
                                        {u.email && <span style={{ fontSize: 11, color: '#71717a' }}>{u.email}</span>}
                                      </div>
                                    ))}
                                </div>
                                );
                              })()}
                            </>
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
                      color: ticketCategoryTab === cat ? (cat === 'Infra' ? '#fbbf24' : cat === 'Acessos' ? '#38BDF8' : cat === 'Pessoas' ? '#22c55e' : 'white') : '#71717a'
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
                    <Filter size={14} color="#0EA5E9" /> Filtros
                  </button>
                </div>
              </div>

              {/* Painel de filtros */}
              {showTicketFilterPanel && (
                <div className="card-base" style={{ marginBottom: 16, padding: 20, background: '#18181b', border: '1px solid #27272a' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', marginBottom: 12 }}>Filtros combinados</div>
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
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
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

              <div style={{ overflowX: 'auto' }}>
                {ticketList.length === 0 ? (
                  <div className="card-base" style={{ textAlign: 'center', color: '#52525b', padding: 48, borderStyle: 'dashed' }}>
                    Nenhum chamado encontrado com os filtros aplicados.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0f172a' }}>
                    <thead>
                      <tr style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Categoria</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Assunto</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Solicitante</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Data</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketList.map(r => {
                        const card = getRequestCardContent(r);
                        const statusStyle = getRequestStatusBadgeStyle(r.status);
                        const categoryShort = card.category === 'Acessos' ? 'ACESSOS' : card.category === 'Pessoas' ? 'PESSOAS' : 'INFRA';
                        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                        return (
                          <tr
                            key={r.id}
                            style={{
                              height: 52,
                              borderBottom: '1px solid #1e293b',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '0 16px' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: card.categoryColor, textTransform: 'uppercase' }}>{categoryShort}</span>
                            </td>
                            <td style={{ padding: '0 16px', color: '#e4e4e7', fontWeight: 500 }}>{card.title}</td>
                            <td style={{ padding: '0 16px', color: '#94A3B8' }}>{r.requester?.name ?? '—'}</td>
                            <td style={{ padding: '0 16px', color: '#94A3B8', fontSize: 12 }}>{dateStr}</td>
                            <td style={{ padding: '0 16px' }}>
                              <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                            </td>
                            <td style={{ padding: '0 16px', textAlign: 'right' }}>
                              <button
                                type="button"
                                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#0EA5E9', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                onClick={() => setSelectedChamadoId(r.id)}
                              >
                                Acessar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
            onOpenAuditHistory={(entidadeId, entidadeTipo) => {
              setIsEditUserModalOpen(false);
              setSelectedUser(null);
              setAuditLogFilters({ entidadeId, entidadeTipo });
              navigate(`/audit-log?entidadeId=${encodeURIComponent(entidadeId)}&entidadeTipo=${encodeURIComponent(entidadeTipo)}`);
            }}
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
        onViewCollaborator={(user) => {
          setIsManageStructureOpen(false);
          setSelectedStructureDept(null);
          navigate(`/collaborators/${user.id}`);
        }}
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

      {/* UNIT & DEPARTMENT MODALS */}
      <EditUnitModal
        isOpen={isEditUnitModalOpen}
        onClose={() => { setIsEditUnitModalOpen(false); setSelectedUnitForEdit(null); }}
        unit={selectedUnitForEdit}
        onUpdated={loadData}
        showToast={showToast}
      />
      <CreateDepartmentModal
        isOpen={isCreateDepartmentModalOpen}
        onClose={() => { setIsCreateDepartmentModalOpen(false); setSelectedUnitForAddDept(null); }}
        unit={selectedUnitForAddDept}
        onCreated={loadData}
        showToast={showToast}
      />

      {/* Modal Adicionar Colaborador (Super Admin) — por Cargo */}
      {isAddCollaboratorModalOpen && addCollaboratorContext && (
        <div className="modal-overlay" onClick={() => setIsAddCollaboratorModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0, color: '#f4f4f5' }}>Adicionar Colaborador</h2>
              <button type="button" onClick={() => setIsAddCollaboratorModalOpen(false)} className="btn-icon" aria-label="Fechar"><X size={20} /></button>
            </div>
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: '#a1a1aa', fontSize: 13, margin: 0 }}>
                Cargo: <strong style={{ color: '#e4e4e7' }}>{addCollaboratorContext.role.name}</strong> · Departamento: <strong style={{ color: '#e4e4e7' }}>{addCollaboratorContext.department.name}</strong>
              </p>
              <div className="form-group">
                <label style={{ fontSize: 12 }}>Nome</label>
                <input
                  value={addCollaboratorName}
                  onChange={e => setAddCollaboratorName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="Nome completo"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12 }}>E-mail <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="email"
                  value={addCollaboratorEmail}
                  onChange={e => setAddCollaboratorEmail(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="email@empresa.com"
                />
              </div>
              <button
                type="button"
                disabled={!addCollaboratorEmail.trim() || addCollaboratorSubmitting}
                onClick={async () => {
                  const email = addCollaboratorEmail.trim().toLowerCase();
                  if (!email) return showToast('E-mail é obrigatório.', 'warning');
                  setAddCollaboratorSubmitting(true);
                  try {
                    const res = await fetch(`${API_URL}/api/users/manual-add`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: addCollaboratorName.trim() || undefined,
                        email,
                        roleId: addCollaboratorContext.role.id,
                        departmentId: addCollaboratorContext.department.id
                      })
                    });
                    let data: { error?: string } = {};
                    try {
                      data = await res.json();
                    } catch {
                      // Resposta não é JSON (ex.: 500 com HTML)
                      data = { error: `Erro do servidor (${res.status}). Tente novamente.` };
                    }
                    if (res.status === 200 || res.status === 201) {
                      showToast('Colaborador adicionado/vinculado com sucesso!', 'success');
                      setIsAddCollaboratorModalOpen(false);
                      setAddCollaboratorContext(null);
                      loadData();
                    } else {
                      showToast(data.error || `Erro ao adicionar colaborador (${res.status}).`, 'error');
                    }
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.';
                    showToast(msg, 'error');
                  } finally {
                    setAddCollaboratorSubmitting(false);
                  }
                }}
                className="btn-verify"
                style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {addCollaboratorSubmitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <UnitMigrationWizardModal
        isOpen={!!unitMigrationData}
        onClose={() => setUnitMigrationData(null)}
        unit={unitMigrationData?.unit ?? null}
        departments={unitMigrationData?.departments ?? []}
        otherUnits={units.filter((u: any) => u.id !== unitMigrationData?.unit?.id)}
        allDepartments={departments}
        onSuccess={loadData}
        showToast={showToast}
      />
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
            userCount={selectedDeptForAction ? allUsers.filter(u => (u.departmentId === selectedDeptForAction.id || userDeptName(u) === selectedDeptForAction.name)).length : 0}
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
        units={units}
        departments={departments}
        onUpdate={loadData}
        showToast={showToast}
        onOpenAuditHistory={(entidadeId, entidadeTipo) => {
          setIsEditRoleKitModalOpen(false);
          setSelectedRoleForKit(null);
          setAuditLogFilters({ entidadeId, entidadeTipo });
          navigate(`/audit-log?entidadeId=${encodeURIComponent(entidadeId)}&entidadeTipo=${encodeURIComponent(entidadeTipo)}`);
        }}
      />

      <DeleteRoleModal
        isOpen={isDeleteRoleModalOpen}
        onClose={() => { setIsDeleteRoleModalOpen(false); setSelectedRoleForDelete(null); }}
        role={selectedRoleForDelete}
        units={units}
        userCountInRole={selectedRoleForDelete ? allUsers.filter(u =>
          u.roleId === selectedRoleForDelete.id ||
          (u.jobTitle === selectedRoleForDelete.name && (u.departmentId === selectedRoleForDelete.departmentId || userDeptName(u) === departments.find(d => d.id === selectedRoleForDelete.departmentId)?.name))
        ).length : 0}
        onDeleted={loadData}
        showToast={showToast}
      />

      {/* CUSTOM UI OVERLAYS */}
      {currentUser && (
        <ReportExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => showToast('Relatório exportado com sucesso!', 'success')}
          currentUserId={currentUser.id}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Modal KBU (SUPER_ADMIN): Nome da Ferramenta + Responsável (Nome e E-mail) + Cancelar / Remover do KBU / Salvar */}
      {kbuEditOwnerModal.open && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setKbuEditOwnerModal(prev => ({ ...prev, open: false }))}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 600 }}>Ferramenta KBU</h3>
              <button type="button" onClick={() => setKbuEditOwnerModal(prev => ({ ...prev, open: false }))} className="btn-icon" aria-label="Fechar">
                <X size={20} color="#71717a" />
              </button>
            </div>
            <label style={{ display: 'block', fontSize: 12, color: '#71717a', marginBottom: 6 }}>Nome da Ferramenta</label>
            <input
              type="text"
              value={kbuEditOwnerModal.nome}
              onChange={e => setKbuEditOwnerModal(prev => ({ ...prev, nome: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F0F9FF', fontSize: 14, marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <label style={{ display: 'block', fontSize: 12, color: '#71717a', marginBottom: 6 }}>Responsável</label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Nome"
                value={kbuEditOwnerModal.ownerNome}
                onChange={e => setKbuEditOwnerModal(prev => ({ ...prev, ownerNome: e.target.value }))}
                style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F0F9FF', fontSize: 14, boxSizing: 'border-box' }}
              />
              <input
                type="text"
                placeholder="E-mail"
                value={kbuEditOwnerModal.ownerEmail}
                onChange={e => setKbuEditOwnerModal(prev => ({ ...prev, ownerEmail: e.target.value }))}
                style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F0F9FF', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setKbuEditOwnerModal(prev => ({ ...prev, open: false }))} className="btn-text" style={{ padding: '10px 20px', fontSize: '14px' }}>Cancelar</button>
              <button type="button" onClick={() => handleKbuRemoveFromModal()} style={{ padding: '10px 20px', fontSize: '14px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.6)', cursor: 'pointer', fontWeight: 600, background: 'transparent', color: '#f87171' }}>Remover do KBU</button>
              <button type="button" onClick={handleKbuConfirmEditOwner} style={{ padding: '10px 20px', fontSize: '14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: '#0EA5E9', color: 'white' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

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
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={renderNonLanding()} />
    </Routes>
  );
}