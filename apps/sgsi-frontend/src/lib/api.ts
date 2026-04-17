const SGSI_API = import.meta.env.VITE_SGSI_API_URL || 'http://localhost:3001';
const THERIS_API = import.meta.env.VITE_THERIS_API_URL || 'http://localhost:3000';
const SERVICE_TOKEN = import.meta.env.VITE_THERIS_SERVICE_TOKEN || '';

function getUserId(): string | null {
  return localStorage.getItem('sgsi_user_id');
}

async function sgsiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SGSI_API}${path}`);
  if (!res.ok) throw new Error(`SGSI API error: ${res.status}`);
  return res.json();
}

async function sgsiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${SGSI_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`SGSI API error: ${res.status}`);
  return res.json();
}

async function sgsiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SGSI_API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SGSI API error: ${res.status}`);
  return res.json();
}

async function sgsiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${SGSI_API}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`SGSI API error: ${res.status}`);
  return res.json();
}

export async function verifySession(userId: string): Promise<{
  id: string;
  name: string;
  email: string;
  systemProfile: string;
}> {
  const res = await fetch(`${THERIS_API}/api/sgsi-integration/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-token': SERVICE_TOKEN,
      'x-user-id': userId,
    },
  });
  if (!res.ok) throw new Error('Sessão inválida');
  return res.json();
}

// Ações recorrentes
export const actionsApi = {
  list: () => sgsiGet<any[]>('/actions'),
  get: (id: string) => sgsiGet<any>(`/actions/${id}`),
  create: (data: unknown) => sgsiPost<any>('/actions', data),
  update: (id: string, data: unknown) => sgsiPatch<any>(`/actions/${id}`, data),
  complete: (id: string, data: unknown) => sgsiPost<any>(`/actions/${id}/complete`, data),
};

// Mudanças urgentes
export const changesApi = {
  list: () => sgsiGet<any[]>('/changes'),
  get: (id: string) => sgsiGet<any>(`/changes/${id}`),
  create: (data: unknown) => sgsiPost<any>('/changes', data),
  update: (id: string, data: unknown) => sgsiPatch<any>(`/changes/${id}`, data),
  decide: (id: string, data: unknown) => sgsiPost<any>(`/changes/${id}/decide`, data),
  close: (id: string) => sgsiPost<any>(`/changes/${id}/close`),
  addImpact: (id: string, data: unknown) => sgsiPost<any>(`/changes/${id}/impacts`, data),
};

// Usuários e acesso
export const accessApi = {
  list: () => sgsiGet<any[]>('/access'),
  grant: (data: unknown) => sgsiPost<any>('/access', data),
  update: (email: string, data: unknown) => sgsiPatch<any>(`/access/${encodeURIComponent(email)}`, data),
  revoke: (email: string) => sgsiDelete<any>(`/access/${encodeURIComponent(email)}`),
};

export const usersApi = {
  list: () => sgsiGet<any[]>('/users'),
  siMembers: () => sgsiGet<any[]>('/users/si-members'),
};

export { getUserId };
