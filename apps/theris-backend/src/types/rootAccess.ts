import { REQUEST_TYPES } from './requestTypes';

export type TipoEmpresa = 'PLUS' | 'INS' | 'EVO';
export type TipoOS = 'LIN' | 'WIN' | 'MAC';
export type TipoTTLUnidade = 'MINUTOS' | 'HORAS' | 'DIAS';
export type TipoUrgencia = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const TTL_MAX_SEGUNDOS = 15 * 86400;

export const TTL_UNIDADE_PARA_SEGUNDOS: Record<TipoTTLUnidade, number> = {
  MINUTOS: 60,
  HORAS: 3600,
  DIAS: 86400
};

export const JUSTIFICATIVA_MIN_CHARS = 20;

export const EMPRESA_LABELS: Record<TipoEmpresa, string> = {
  PLUS: '3C Plus',
  INS: 'Instituto 3C',
  EVO: 'Evolux'
};

export const OS_LABELS: Record<TipoOS, string> = {
  LIN: 'Linux',
  WIN: 'Windows',
  MAC: 'macOS'
};

export const URGENCIA_LABELS: Record<TipoUrgencia, string> = {
  LOW: '🟢 Baixa',
  MEDIUM: '🟡 Média',
  HIGH: '🟠 Alta',
  CRITICAL: '🔴 Crítica'
};

/** JSON em `Request.details` para `type === ROOT_ACCESS` (PR1 + campos reservados PR2). */
export type RootAccessDetails = {
  subtipo: typeof REQUEST_TYPES.ROOT_ACCESS;
  hostname: string;
  empresa: TipoEmpresa | null;
  os: TipoOS | null;
  patrimonio: string | null;
  hostnameCustom: string | null;
  ttlQuantidade: number;
  ttlUnidade: TipoTTLUnidade;
  ttlSegundos: number;
  expiryAt: string;
  urgencia: TipoUrgencia;
  /** PR2: JumpCloud system id */
  jumpcloudDeviceId: string | null;
  /** PR2: JumpCloud user id (system user) */
  jumpcloudUserId: string | null;
  /** PR2: retorno POST /accessrequests */
  jumpcloudAccessRequestId: string | null;
  appliedAt: string | null;
  statusJc: 'APPLIED' | 'FAILED' | 'EXPIRED' | null;

  /** PR2: ID do access request antigo revogado (auditoria sobreposição B2) */
  previousJumpcloudAccessRequestId?: string | null;

  /** PR2: último erro JC (diagnóstico) */
  lastError?: string | null;
  lastErrorAt?: string | null;

  /** PR2: response bruta do POST create (debug temporário) */
  rawAccessRequestResponse?: unknown;
};

export function isTipoEmpresa(s: string): s is TipoEmpresa {
  return s === 'PLUS' || s === 'INS' || s === 'EVO';
}

export function isTipoOS(s: string): s is TipoOS {
  return s === 'LIN' || s === 'WIN' || s === 'MAC';
}

export function isTipoTTLUnidade(s: string): s is TipoTTLUnidade {
  return s === 'MINUTOS' || s === 'HORAS' || s === 'DIAS';
}

export function isTipoUrgencia(s: string): s is TipoUrgencia {
  return s === 'LOW' || s === 'MEDIUM' || s === 'HIGH' || s === 'CRITICAL';
}
