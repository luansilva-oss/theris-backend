/**
 * Tipos de chamado Infra: inbox (inboxDepartmentId + inboxRoleId), executor em assigneeId,
 * permissões via isInboxMember, exceção de conflito solicitante/aprovador em updateSolicitacao.
 * Tickets antigos sem inbox: só ADMIN (ou SUPER_ADMIN sempre) operam até a inbox ser definida.
 */
export const INFRA_TICKET_TYPES = ['INFRA', 'INFRA_SUPPORT'] as const;

export function isInfraTicketType(type: string): boolean {
  return (INFRA_TICKET_TYPES as readonly string[]).includes(type);
}

/** Snapshot mínimo do usuário para checagem de inbox (carregar do Prisma). */
export type InboxCheckUser = {
  departmentId: string | null;
  roleId: string | null;
  systemProfile: string;
};

/** Snapshot mínimo do chamado com campos de inbox. */
export type InboxCheckRequest = {
  inboxDepartmentId: string | null;
  inboxRoleId: string | null;
};

/**
 * Quem pode agir operacionalmente no chamado Infra (comentar, status, assignee, anexos, aprovar no fluxo):
 * - Inbox definida (dept + role): usuário com mesmo departmentId e roleId do chamado.
 * - Inbox não definida: ADMIN ou SUPER_ADMIN (fallback SI).
 * - SUPER_ADMIN: sempre pode agir (desbloqueio operacional).
 */
export function isInboxMember(user: InboxCheckUser | null | undefined, request: InboxCheckRequest): boolean {
  if (!user) return false;
  if (user.systemProfile === 'SUPER_ADMIN') return true;
  const inboxDefined = Boolean(request.inboxDepartmentId && request.inboxRoleId);
  if (!inboxDefined) {
    return user.systemProfile === 'ADMIN';
  }
  return user.departmentId === request.inboxDepartmentId && user.roleId === request.inboxRoleId;
}
