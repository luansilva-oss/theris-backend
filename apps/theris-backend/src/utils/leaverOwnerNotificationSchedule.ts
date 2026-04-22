/**
 * Agendamento das notificações aos Owners no fluxo Leaver (BRT, corte 17:00).
 * Usa America/Sao_Paulo via Intl (mesma abordagem de formatDateOnlyBrt no slackService).
 */

const TZ = 'America/Sao_Paulo';

/** Data civil atual em BRT como YYYY-MM-DD (comparação lexicográfica segura). */
export function getBrtTodayYyyyMmDd(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

/** Hora atual 0–23 em BRT. */
export function getBrtHour(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    hour12: false
  }).formatToParts(now);
  const hourPart = h.find((p) => p.type === 'hour')?.value;
  return hourPart != null ? parseInt(hourPart, 10) : 0;
}

/** Normaliza string de data para YYYY-MM-DD ou null. */
export function normalizeLeaverLastDayToYyyyMmDd(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(t.length <= 10 ? `${t}T12:00:00-03:00` : t);
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  return null;
}

/**
 * Dia efetivo para regras de agendamento: details.lastDay, senão actionDate em details,
 * senão coluna actionDate do Request (último dia útil / desligamento).
 */
export function extractLeaverScheduleDayYyyyMmDdFromDetails(
  details: Record<string, unknown>,
  actionDateColumn: Date | string | null | undefined
): string | null {
  const d = details as Record<string, string | undefined>;
  const fromDetails = normalizeLeaverLastDayToYyyyMmDd(d.lastDay) || normalizeLeaverLastDayToYyyyMmDd(d.actionDate) || normalizeLeaverLastDayToYyyyMmDd(d.startDate);
  if (fromDetails) return fromDetails;
  if (actionDateColumn == null) return null;
  if (actionDateColumn instanceof Date && !Number.isNaN(actionDateColumn.getTime())) {
    return actionDateColumn.toISOString().slice(0, 10);
  }
  if (typeof actionDateColumn === 'string') {
    return normalizeLeaverLastDayToYyyyMmDd(actionDateColumn);
  }
  return null;
}

/**
 * true = disparar notificarOwnersDesligamento na aprovação SI.
 * lastDay vazio/null → imediato; passado → imediato; hoje após 17h BRT → imediato;
 * hoje antes de 17h ou futuro → agendar (false).
 */
export function shouldNotifyOwnersNow(lastDayYyyyMmDd: string | null | undefined): boolean {
  const ymd = lastDayYyyyMmDd != null ? normalizeLeaverLastDayToYyyyMmDd(lastDayYyyyMmDd) : null;
  if (!ymd) return true;
  const today = getBrtTodayYyyyMmDd();
  if (ymd < today) return true;
  if (ymd > today) return false;
  return getBrtHour() >= 17;
}

/** Para filtro do cron: último dia já chegou em BRT (inclui vazio → tratar como elegível no job). */
export function isLeaverLastDayOnOrBeforeTodayBrt(lastDayYyyyMmDd: string | null): boolean {
  if (!lastDayYyyyMmDd) return true;
  const ymd = normalizeLeaverLastDayToYyyyMmDd(lastDayYyyyMmDd);
  if (!ymd) return true;
  return ymd <= getBrtTodayYyyyMmDd();
}
