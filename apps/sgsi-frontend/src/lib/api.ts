const SGSI_API = import.meta.env.VITE_SGSI_API_URL || 'http://localhost:3001';
const THERIS_API = import.meta.env.VITE_THERIS_API_URL || 'http://localhost:3000';
const SERVICE_TOKEN = import.meta.env.VITE_THERIS_SERVICE_TOKEN || '';

function getUserId(): string | null {
  return localStorage.getItem('sgsi_user_id');
}

async function sgsiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SGSI_API}${path}`);
  if (!res.ok) throw new Error(`SGSI GET ${path} failed: ${res.status}`);
  return res.json();
}

async function sgsiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${SGSI_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`SGSI POST ${path} failed: ${res.status}`);
  return res.json();
}

async function sgsiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${SGSI_API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`SGSI PATCH ${path} failed: ${res.status}`);
  return res.json();
}

// AUTH
export async function verifySession(userId: string) {
  const res = await fetch(`${THERIS_API}/api/sgsi-integration/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Service-Token': SERVICE_TOKEN },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Session invalid');
  return res.json();
}

// ACTIONS
export type ActionStatus = 'SCHEDULED' | 'DUE_SOON' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED';
export type ActionFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'ON_DEMAND';

export type Action = {
  id: string;
  name: string;
  type: string;
  frequency: ActionFrequency;
  status: ActionStatus;
  nextDueDate: string | null;
  responsibleId: string;
  responsibleName?: string;
  isoControls: string[];
  referenceCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  executions?: ActionExecution[];
}

export type ActionExecution = {
  id: string;
  actionId: string;
  completedById: string;
  completedByName?: string;
  completedAt: string;
  notes: string | null;
  nextDueDate: string | null;
}

/** Campos extras aceitos pelo SGSI ao criar/atualizar ações (além de Partial<Action>). */
export type ActionUpsertPayload = Partial<Action> & {
  nextDueAt?: string | null;
  responsibleEmail?: string;
  conGc10Ref?: string;
};

export const getActions = (status?: ActionStatus) =>
  sgsiGet<Action[]>(`/actions${status ? `?status=${status}` : ''}`);

export const getAction = (id: string) =>
  sgsiGet<Action>(`/actions/${id}`);

export const createAction = (data: ActionUpsertPayload) =>
  sgsiPost<Action>('/actions', data);

export const updateAction = (id: string, data: ActionUpsertPayload) =>
  sgsiPatch<Action>(`/actions/${id}`, data);

export const completeAction = (id: string, notes?: string) =>
  sgsiPost<ActionExecution>(`/actions/${id}/complete`, {
    completedById: getUserId(),
    notes,
  });

// CHANGES
export type ChangeStatus = 'OPEN' | 'MEETING_SCHEDULED' | 'DECISION_RECORDED' | 'CLOSED';
export type ChangeUrgency = 'IMEDIATA' | 'PLANEJADA';

export type Change = {
  id: string;
  title: string;
  description: string;
  urgency: ChangeUrgency;
  status: ChangeStatus;
  isoControls: string[];
  registeredById: string;
  registeredByName?: string;
  meetingDate: string | null;
  meetingNotes: string | null;
  decision: string | null;
  decisionParticipants: string[];
  createdAt: string;
  updatedAt: string;
  impactedActions?: Action[];
}

export const getChanges = () => sgsiGet<Change[]>('/changes');
export const getChange = (id: string) => sgsiGet<Change>(`/changes/${id}`);
export const createChange = (data: Partial<Change>) =>
  sgsiPost<Change>('/changes', { ...data, registeredById: getUserId() });
export const updateChange = (id: string, data: Partial<Change>) =>
  sgsiPatch<Change>(`/changes/${id}`, data);
export const decideChange = (id: string, decision: string, participants: string[]) =>
  sgsiPost(`/changes/${id}/decide`, { decision, participants });
export const closeChange = (id: string) =>
  sgsiPost(`/changes/${id}/close`);

// ACCESS
export type SgsiRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export type SgsiUser = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: SgsiRole;
  isActive: boolean;
  grantedById: string;
  createdAt: string;
}

export const getAccessList = () => sgsiGet<SgsiUser[]>('/access');
export const grantAccess = (email: string, role: SgsiRole) =>
  sgsiPost('/access', { email, role, grantedById: getUserId() });
export const updateAccess = (email: string, role: SgsiRole) =>
  sgsiPatch(`/access/${email}`, { role });
export const revokeAccess = (email: string) =>
  sgsiPatch(`/access/${email}`, { isActive: false });

export const deleteAction = (id: string) =>
  sgsiPatch<Action>(`/actions/${id}`, { isActive: false });

export interface LogEntry {
  id: string;
  kind: 'cron' | 'execution';
  label: string;
  detail: string;
  success: boolean;
  timestamp: string;
}

export const getLogs = () => sgsiGet<LogEntry[]>('/logs');
