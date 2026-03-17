/**
 * Configuração centralizada de status de chamados: label em português e variante de cor (success / danger / neutral).
 * Usado pelo badge de status no histórico e em listagens.
 */

export type RequestStatusVariant = 'success' | 'danger' | 'neutral';

/** Cores por variante (Tailwind/design system: green-500, red-500, neutros por tipo de pendência). */
const VARIANT_STYLES: Record<RequestStatusVariant, { bg: string; color: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' },
  danger: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
  neutral: { bg: 'rgba(100, 116, 139, 0.2)', color: '#64748b' }
};

/** Estilos neutros específicos para alguns status (mantém cores atuais do projeto). */
const NEUTRAL_SPECIFIC_STYLES: Record<string, { bg: string; color: string }> = {
  PENDENTE_OWNER: { bg: 'rgba(249, 115, 22, 0.2)', color: '#f97316' },
  PENDING_OWNER: { bg: 'rgba(249, 115, 22, 0.2)', color: '#f97316' },
  PENDENTE_SI: { bg: 'rgba(14, 165, 233, 0.2)', color: '#0EA5E9' },
  PENDING_SI: { bg: 'rgba(14, 165, 233, 0.2)', color: '#0EA5E9' }
};

export type StatusConfigEntry = { label: string; variant: RequestStatusVariant };

/**
 * Mapa de status → label (PT) e variante de cor.
 * Verde: aprovação/conclusão positiva. Vermelho: rejeição/cancelamento. Neutro: em andamento/pendente.
 */
export const REQUEST_STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  // ——— Sucesso (verde) ———
  RESOLVED: { label: 'Resolvido', variant: 'success' },
  APROVADO: { label: 'Aprovado', variant: 'success' },
  APPROVED: { label: 'Aprovado', variant: 'success' },
  RESOLVIDO: { label: 'Resolvido', variant: 'success' },
  CONCLUIDO: { label: 'Concluído', variant: 'success' },
  COMPLETED: { label: 'Concluído', variant: 'success' },

  // ——— Rejeição / cancelamento (vermelho) ———
  CANCELADO: { label: 'Cancelado', variant: 'danger' },
  CANCELLED: { label: 'Cancelado', variant: 'danger' },
  REPROVADO: { label: 'Reprovado', variant: 'danger' },
  REJECTED: { label: 'Reprovado', variant: 'danger' },

  // ——— Neutro (em andamento / pendente) ———
  PENDENTE_GESTOR: { label: 'Pendente (gestor)', variant: 'neutral' },
  PENDENTE_SUB_OWNER: { label: 'Pendente (sub-responsável)', variant: 'neutral' },
  PENDENTE_SI: { label: 'Pendente (SI)', variant: 'neutral' },
  PENDENTE_OWNER: { label: 'Pendente (responsável)', variant: 'neutral' },
  PENDING_OWNER: { label: 'Pendente (Owner)', variant: 'neutral' },
  PENDING_SI: { label: 'Pendente (SI)', variant: 'neutral' },
  PENDING: { label: 'Pendente', variant: 'neutral' },
  PENDING_LEADER: { label: 'Pendente (líder)', variant: 'neutral' },
  EM_ATENDIMENTO: { label: 'Em atendimento', variant: 'neutral' },
  AGENDADO: { label: 'Agendado', variant: 'neutral' },
  IN_PROGRESS: { label: 'Em andamento', variant: 'neutral' },
  EM_ANDAMENTO: { label: 'Em andamento', variant: 'neutral' }
};

/** Opções para dropdowns de filtro (select de status). Ordem e entradas principais. */
export const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDENTE_GESTOR', label: 'Pendente (gestor)' },
  { value: 'PENDENTE_SUB_OWNER', label: 'Pendente (sub-responsável)' },
  { value: 'PENDENTE_SI', label: 'Pendente (SI)' },
  { value: 'PENDENTE_OWNER', label: 'Pendente (responsável)' },
  { value: 'PENDING_OWNER', label: 'Pendente (Owner)' },
  { value: 'PENDING_SI', label: 'Pendente (SI)' },
  { value: 'EM_ATENDIMENTO', label: 'Em atendimento' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'RESOLVIDO', label: 'Resolvido' },
  { value: 'CONCLUIDO', label: 'Concluído' }
];

/**
 * Retorna o label em português para o status. Fallback: "Pendente" para PENDENTE_* ou o próprio status.
 */
export function getRequestStatusLabel(status: string): string {
  if (!status) return '—';
  const key = (status || '').toUpperCase();
  if (REQUEST_STATUS_CONFIG[key]) return REQUEST_STATUS_CONFIG[key].label;
  if (key.startsWith('PENDENTE_')) return 'Pendente';
  return status;
}

/**
 * Retorna { label, bg, color, variant } para renderizar o badge de status (e eventual ícone).
 * Consome REQUEST_STATUS_CONFIG e estilos por variante (ou neutros específicos).
 */
export function getRequestStatusBadgeStyle(status: string): {
  label: string;
  bg: string;
  color: string;
  variant: RequestStatusVariant;
} {
  const key = (status || '').toUpperCase();
  const label = getRequestStatusLabel(status);
  const specific = NEUTRAL_SPECIFIC_STYLES[key];
  if (specific) return { label, ...specific, variant: 'neutral' as RequestStatusVariant };
  const entry = REQUEST_STATUS_CONFIG[key];
  const variant = entry?.variant ?? 'neutral';
  const styles = VARIANT_STYLES[variant];
  return { label, ...styles, variant };
}
