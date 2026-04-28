import { prisma } from '../lib/prisma';

/**
 * Limpa `Request.siSlackRootChannelTs` e `Request.siSlackMessageTs`.
 *
 * **QUANDO CHAMAR**
 * - Para tipos com `finalize*` dedicado (ROOT_ACCESS, CHANGE_ROLE, HIRING,
 *   FIRING): chamar **dentro** do finalize, no fim, após `chat.update` do canal
 *   e das DMs.
 * - Para tipos **sem** `finalize*` (atualmente: AEX): chamar em
 *   `handleSiDualApprovalSlackAction` (`siSlackApprovalService.ts`), **após**
 *   `refreshPeerSiDmsAfterDecision`.
 *
 * Ao adicionar branch novo no handler: garanta que o cleanup roda em
 * **exatamente um** dos dois lugares acima — nunca os dois (log `clear_failed`
 * / duplicado no segundo) nem nenhum (risco de `message_not_found` periódico
 * em `chat.update`).
 *
 * Falhas no cleanup: `console.warn`, sem throw. O fluxo principal já completou.
 */
export async function clearSiSlackTrackingFields(requestId: string): Promise<void> {
  try {
    await prisma.request.update({
      where: { id: requestId },
      data: {
        siSlackRootChannelTs: null,
        siSlackMessageTs: null
      }
    });
    console.info(JSON.stringify({ event: 'slack.tracking_fields.cleared', requestId }));
  } catch (e) {
    console.warn(JSON.stringify({ event: 'slack.tracking_fields.clear_failed', requestId, err: String(e) }));
  }
}
