/**
 * Filtros do Relatório de Infra — mesma lógica no cliente (InfraReport) e no export CSV (servidor).
 */
import { computeEffectiveStatus, type EffectiveStatus } from '../utils/rootAccessStatus';

export type RootAccessFilterParams = {
  searchTerm?: string;
  /** Data local YYYY-MM-DD (início do dia) */
  startDate?: string;
  /** Data local YYYY-MM-DD (fim do dia inclusive) */
  endDate?: string;
  statusFilter?: EffectiveStatus | 'ALL';
  /** Filtra por solicitante Theris */
  userId?: string;
  /** JumpCloud system id do device */
  deviceId?: string;
};

export type RootAccessFilterRow = {
  id: string;
  createdAt: Date | string;
  status: string;
  requesterId?: string | null;
  requester?: { name?: string | null; email?: string | null } | null;
  details: string | null;
  revokedAt?: Date | string | null;
  revokeTrigger?: 'CRON_EXPIRED' | 'ADMIN_EARLY' | null;
};

function parseDetailsHostnameDevice(raw: string | null): { hostname: string; deviceId: string | null; statusJc: string | null } {
  if (!raw) return { hostname: '', deviceId: null, statusJc: null };
  try {
    const j = JSON.parse(raw) as { hostname?: string; jumpcloudDeviceId?: string | null; statusJc?: string | null };
    return {
      hostname: (j.hostname || '').toLowerCase(),
      deviceId: j.jumpcloudDeviceId?.trim() || null,
      statusJc: j.statusJc ?? null
    };
  } catch {
    return { hostname: '', deviceId: null, statusJc: null };
  }
}

export function rowMatchesRootAccessFilters(row: RootAccessFilterRow, f: RootAccessFilterParams): boolean {
  const d = parseDetailsHostnameDevice(row.details ?? null);
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);

  if (f.userId && (row.requesterId || '') !== f.userId) return false;

  if (f.deviceId && (d.deviceId || '') !== f.deviceId.trim()) return false;

  const term = (f.searchTerm || '').trim().toLowerCase();
  if (term) {
    const matchesRequester =
      row.requester?.name?.toLowerCase().includes(term) || row.requester?.email?.toLowerCase().includes(term);
    const matchesHostname = d.hostname.includes(term);
    const matchesId = row.id.toLowerCase().includes(term);
    if (!matchesRequester && !matchesHostname && !matchesId) return false;
  }

  if (f.startDate) {
    if (createdAt < new Date(f.startDate)) return false;
  }
  if (f.endDate) {
    const end = new Date(f.endDate);
    end.setHours(23, 59, 59, 999);
    if (createdAt > end) return false;
  }

  if (f.statusFilter && f.statusFilter !== 'ALL') {
    const effective = computeEffectiveStatus(row.status, d.statusJc, row.revokeTrigger ?? undefined);
    if (effective !== f.statusFilter) return false;
  }

  return true;
}
