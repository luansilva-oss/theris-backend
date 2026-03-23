/**
 * Tipos de chamado tratados como Infra (executor via assigneeId, conflito de interesse, comentários, PATCH assignee).
 * Compatível com tickets já persistidos: não há migration nem flag — qualquer linha com `type` ∈ INFRA_TICKET_TYPES
 * passa nas regras na próxima leitura/atualização (ex.: INFRA_SUPPORT criado antes do deploy).
 */
export const INFRA_TICKET_TYPES = ['INFRA', 'INFRA_SUPPORT'] as const;

export function isInfraTicketType(type: string): boolean {
  return (INFRA_TICKET_TYPES as readonly string[]).includes(type);
}
