import dotenv from 'dotenv';
dotenv.config();

const THERIS_API_URL = process.env.THERIS_API_URL || 'http://localhost:3000';
const THERIS_SERVICE_TOKEN = process.env.THERIS_SERVICE_TOKEN || '';

async function therisGet<T>(path: string): Promise<T> {
  const res = await fetch(`${THERIS_API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-service-token': THERIS_SERVICE_TOKEN,
    },
  });

  if (!res.ok) {
    throw new Error(`Theris API error: ${res.status} ${res.statusText} — ${path}`);
  }

  return res.json() as Promise<T>;
}

export interface TherisUser {
  id: string;
  name: string;
  email: string;
  systemProfile: string;
  isActive?: boolean;
  unitRef?: { name: string } | null;
  departmentRef?: { name: string } | null;
}

export const therisClient = {
  // Lista todos os usuários ativos
  getUsers: (): Promise<TherisUser[]> =>
    therisGet<TherisUser[]>('/api/sgsi-integration/users'),

  // Busca usuário por email
  getUserByEmail: (email: string): Promise<TherisUser> =>
    therisGet<TherisUser>(`/api/sgsi-integration/users/by-email/${encodeURIComponent(email)}`),

  // Lista membros do time de SI (SUPER_ADMIN)
  getSiMembers: (): Promise<TherisUser[]> =>
    therisGet<TherisUser[]>('/api/sgsi-integration/users/si-members'),

  // Lista membros do Board (ADMIN + SUPER_ADMIN)
  getBoardMembers: (): Promise<TherisUser[]> =>
    therisGet<TherisUser[]>('/api/sgsi-integration/users/board'),
};
