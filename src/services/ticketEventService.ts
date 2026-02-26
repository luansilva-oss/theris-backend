/**
 * Notifica o solicitante no Slack sobre eventos do chamado (comentário, anexo, status, responsável).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { getSlackApp } from './slackService';

function getApp() {
  try {
    return getSlackApp();
  } catch {
    return null;
  }
}

const EVENT_LABELS: Record<string, string> = {
  TICKET_CREATED: 'Seu chamado foi criado',
  COMMENT_ADDED: 'Novo comentário no seu chamado',
  ATTACHMENT_ADDED: 'Novo documento anexado ao chamado',
  STATUS_CHANGED: 'Status do chamado atualizado',
  ASSIGNEE_CHANGED: 'Responsável pelo chamado alterado'
};

export async function notifyTicketEvent(
  requestId: string,
  eventType: 'TICKET_CREATED' | 'COMMENT_ADDED' | 'ATTACHMENT_ADDED' | 'STATUS_CHANGED' | 'ASSIGNEE_CHANGED',
  payload?: Record<string, unknown>
): Promise<void> {
  const hasToken = Boolean(process.env.SLACK_BOT_TOKEN);
  if (!hasToken) {
    console.error('[Slack] Notificação não enviada: SLACK_BOT_TOKEN não está definido no ambiente.');
    return;
  }

  const slackApp = getApp();
  if (!slackApp) {
    console.error('[Slack] Notificação não enviada: getSlackApp() retornou null (verifique SLACK_BOT_TOKEN e inicialização do app).');
    return;
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      requester: { select: { email: true, name: true } },
      assignee: { select: { name: true } }
    }
  });
  if (!request?.requester?.email) return;

  try {
    const userLookup = await slackApp.client.users.lookupByEmail({ email: request.requester.email });
    const slackUserId = userLookup.user?.id;
    if (!slackUserId) {
      console.warn(`⚠️ Slack: usuário não encontrado para ${request.requester.email}`);
      return;
    }

    const label = EVENT_LABELS[eventType] || eventType;
    let text = `*${label}*`;

    if (eventType === 'STATUS_CHANGED' && payload?.from !== undefined && payload?.to !== undefined) {
      text += `\nDe: \`${payload.from}\` → \`${payload.to}\``;
    }
    if (eventType === 'ASSIGNEE_CHANGED' && request.assignee) {
      text += `\nNovo responsável: ${request.assignee.name}`;
    }
    if (eventType === 'COMMENT_ADDED' && payload?.body) {
      const snippet = String(payload.body).slice(0, 300);
      text += `\n\n_${snippet}${snippet.length >= 300 ? '…' : ''}_`;
    }
    if (eventType === 'ATTACHMENT_ADDED' && payload?.filename) {
      text += `\nArquivo: ${payload.filename}`;
    }

    await slackApp.client.chat.postMessage({
      channel: slackUserId,
      text,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${requestId.slice(0, 8)} · Theris Service Desk` }] }
      ]
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined;
    console.error(
      '[Slack] Falha ao notificar no ticketEventService:',
      msg,
      code ? `(code: ${code})` : '',
      '| Token definido:', hasToken,
      '| Dica: verifique escopo users:read.email e se o e-mail do solicitante existe no workspace.'
    );
    if (err instanceof Error && err.stack) console.error(err.stack);
  }
}
