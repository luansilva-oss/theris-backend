import { PrismaClient } from '@prisma/client';
import { notifyTicketEvent } from './ticketEventService';

const prisma = new PrismaClient();

/**
 * Marca o chamado VPN como RESOLVED após concessão do acesso (JumpCloud),
 * dispara STATUS_CHANGED e retorna o request atualizado.
 * Usado no fluxo de aprovação do SI quando o líder já aprovou.
 */
export async function resolveVpnTicket(
  ticketId: string,
  approverId?: string
) {
  await prisma.request.update({
    where: { id: ticketId },
    data: { status: 'RESOLVED', updatedAt: new Date() }
  });
  try {
    await notifyTicketEvent(ticketId, 'STATUS_CHANGED', {
      from: 'PENDING_SI',
      to: 'RESOLVED',
      authorId: approverId
    });
  } catch (_) {}
  return prisma.request.findUnique({
    where: { id: ticketId },
    include: { requester: true, assignee: { select: { name: true } } }
  });
}
