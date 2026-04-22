/**
 * Status efetivo de ROOT_ACCESS para UI (combina `Request.status` + `details.statusJc`).
 * Usado pelo frontend do Theris; funções puras, seguro importar no backend se necessário.
 */
export type EffectiveStatus =
  | 'PENDING_SI'
  | 'APROVADO'
  | 'APPLIED'
  | 'REJECTED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REVOKED_EARLY'
  | 'REVOKED_EXPIRED';

export function computeEffectiveStatus(
  requestStatus: string,
  detailsStatusJc: string | null | undefined,
  revokeTrigger?: 'CRON_EXPIRED' | 'ADMIN_EARLY' | null
): EffectiveStatus {
  if (requestStatus === 'REVOKED') {
    if (revokeTrigger === 'ADMIN_EARLY') return 'REVOKED_EARLY';
    return 'REVOKED_EXPIRED';
  }
  if (requestStatus === 'REJECTED') return 'REJECTED';
  if (requestStatus === 'PENDING_SI') return 'PENDING_SI';
  if (detailsStatusJc === 'APPLIED') return 'APPLIED';
  if (detailsStatusJc === 'FAILED') return 'FAILED';
  if (detailsStatusJc === 'EXPIRED') return 'EXPIRED';
  return 'APROVADO';
}

export function formatTtlSeconds(seconds: number): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  if (seconds < 60) return '< 1 min';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (h === 0) return `${d}d`;
  return `${d}d ${h}h`;
}
