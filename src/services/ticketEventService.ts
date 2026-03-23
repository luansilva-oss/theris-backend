/**
 * Notifica o solicitante no Slack sobre eventos do chamado (comentário, anexo, status, responsável).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { getSlackApp, sendDmToSlackUser } from './slackService';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';

const INFRA_REQUEST_TYPES = ['INFRA_SUPPORT', 'INFRA'];
const ACCESS_REQUEST_TYPES = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
const PEOPLE_REQUEST_TYPES = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];

const SUMMARY_MAX_LEN = 120;

function getApp() {
  try {
    return getSlackApp();
  } catch {
    return null;
  }
}

/** Extrai título e resumo do chamado a partir de type, details e justification (para contexto nas notificações Slack). */
export function getRequestContext(request: { type: string; details: string | null; justification: string | null }): { title: string; summary: string } {
  let detailsObj: Record<string, unknown> = {};
  try {
    detailsObj = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
  } catch {
    detailsObj = {};
  }
  const d = detailsObj as Record<string, string | undefined>;

  let title: string;

  if (INFRA_REQUEST_TYPES.includes(request.type)) {
    title = (d.requestTypeLabel || d.requestType || 'Suporte Infra').trim() || 'Suporte Infra';
  } else if (request.type === 'DEPUTY_DESIGNATION' && d.tool) {
    title = `Indicar Deputy: ${(d.tool || '').trim() || '—'}`;
  } else if (PEOPLE_REQUEST_TYPES.includes(request.type)) {
    const actionLabels: Record<string, string> = {
      CHANGE_ROLE: 'Mudança de Cargo',
      HIRING: 'Contratação',
      FIRING: 'Desligamento',
      DEPUTY_DESIGNATION: 'Indicar Deputy',
      ADMISSAO: 'Admissão',
      DEMISSAO: 'Demissão',
      PROMOCAO: 'Promoção'
    };
    const actionLabel = actionLabels[request.type] || request.type;
    const collaborator = (d.collaboratorName || d.substitute || (d.info || '').replace(/^[^:]+:\s*/, '') || '—').trim();
    title = `${actionLabel}: ${collaborator}`;
  } else if (ACCESS_REQUEST_TYPES.includes(request.type) || (request.type === 'DEPUTY_DESIGNATION' && d.tool)) {
    const isNewTool = request.type === 'ACCESS_TOOL' && (d.toolName || (d.info || '').toLowerCase().includes('nova ferramenta'));
    title = (isNewTool ? (d.toolName || d.info || 'Nova ferramenta') : (d.tool || d.info || request.type)).trim() || request.type;
  } else {
    title = (d.info || request.type).trim() || request.type;
  }

  const rawSummary =
    (d.description as string)?.trim() ||
    (d.problem as string)?.trim() ||
    (d.info as string)?.trim() ||
    request.justification?.trim() ||
    '';
  const summary =
    rawSummary.length > SUMMARY_MAX_LEN
      ? rawSummary.slice(0, SUMMARY_MAX_LEN).trim() + '...'
      : rawSummary || '—';

  return { title, summary };
}

/** Rótulos de status para mensagens de DM ao solicitante (STATUS_CHANGED). */
const STATUS_LABELS: Record<string, string> = {
  PENDING_SI: 'PENDENTE_SI',
  PENDENTE_SI: 'PENDENTE_SI',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  IN_PROGRESS: 'EM_ANDAMENTO',
  RESOLVED: 'RESOLVIDO',
  RESOLVIDO: 'RESOLVIDO',
  REJECTED: 'REJEITADO',
  REJEITADO: 'REJEITADO',
  PENDING_OWNER: 'PENDENTE_OWNER',
  PENDENTE_OWNER: 'PENDENTE_OWNER',
  CANCELADO: 'CANCELADO',
  FECHADO: 'FECHADO'
};

function statusLabel(s: string): string {
  return STATUS_LABELS[s] || s;
}

export async function notifyTicketEvent(
  requestId: string,
  eventType: 'TICKET_CREATED' | 'COMMENT_ADDED' | 'ATTACHMENT_ADDED' | 'STATUS_CHANGED' | 'ASSIGNEE_CHANGED',
  payload?: Record<string, unknown>
): Promise<void> {
  console.log('[Chamado] Tentando enviar notificação Slack para chamado:', requestId, 'tipo:', eventType);

  const hasToken = Boolean(process.env.SLACK_BOT_TOKEN);
  if (!hasToken) {
    console.error('[Chamado] Slack não enviado: SLACK_BOT_TOKEN não está definido no ambiente.');
    return;
  }

  const slackApp = getApp();
  if (!slackApp) {
    console.error('[Chamado] Slack não enviado: getSlackApp() retornou null (verifique SLACK_BOT_TOKEN e inicialização do app).');
    return;
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      requester: { select: { email: true, name: true } },
      assignee: { select: { name: true, email: true } }
    }
  });
  if (!request) {
    console.log('[Chamado] Slack não enviado: chamado não encontrado, requestId:', requestId);
    return;
  }

  const { title, summary } = getRequestContext(request);

  const skipRequesterDm =
    (eventType === 'COMMENT_ADDED' && payload?.authorId && String(payload.authorId) === request.requesterId) ||
    (eventType === 'ATTACHMENT_ADDED' && payload?.uploadedById && String(payload.uploadedById) === request.requesterId);

  const aid = request.assigneeId;
  const assigneeEmail = request.assignee?.email;
  let notifyAssignee = false;
  if (aid && assigneeEmail && aid !== request.requesterId) {
    if (eventType === 'COMMENT_ADDED') {
      notifyAssignee = String(payload?.authorId || '') !== aid;
    } else if (eventType === 'ATTACHMENT_ADDED') {
      notifyAssignee = String(payload?.uploadedById || '') !== aid;
    } else if (eventType === 'STATUS_CHANGED') {
      notifyAssignee = String(payload?.actorId || '') !== aid;
    }
  }

  if (skipRequesterDm && !notifyAssignee) {
    console.log('[Chamado] DM omitida ao solicitante e sem executor a notificar, requestId:', requestId);
    return;
  }
  if (!skipRequesterDm && !request.requester?.email && !notifyAssignee) {
    console.log('[Chamado] Slack não enviado: chamado sem requester/email e sem executor, requestId:', requestId);
    return;
  }

  const link = `${FRONTEND_URL}/tickets?id=${requestId}`;

  function buildTexts(forAssignee: boolean): string {
    switch (eventType) {
      case 'TICKET_CREATED':
        return forAssignee
          ? `🎫 *Novo chamado*\nTipo: ${title}\nStatus: ${statusLabel(request.status)}\nVer chamado: ${link}`
          : `🎫 *Seu chamado foi aberto com sucesso!*\nTipo: ${title}\nStatus: ${statusLabel(request.status)}\nVer chamado: ${link}`;
      case 'STATUS_CHANGED': {
        const to = payload?.to != null ? String(payload.to) : request.status;
        if (to === 'CANCELADO') {
          const cancelledByName = (payload?.cancelledByName && String(payload.cancelledByName)) || 'Super Admin';
          return forAssignee
            ? `❌ *Chamado cancelado*\nChamado: ${title}\nCancelado por: ${cancelledByName}\nVer chamado: ${link}`
            : `❌ *Seu chamado foi cancelado.*\nChamado: ${title}\nCancelado por: ${cancelledByName}\nVer chamado: ${link}`;
        }
        const from = payload?.from != null ? statusLabel(String(payload.from)) : request.status;
        const toLabel = statusLabel(to);
        return forAssignee
          ? `🔄 *Status do chamado atualizado*\nChamado: ${title}\nDe: ${from} → Para: ${toLabel}\nVer chamado: ${link}`
          : `🔄 *Seu chamado teve o status atualizado*\nDe: ${from} → Para: ${toLabel}\nVer chamado: ${link}`;
      }
      case 'COMMENT_ADDED': {
        const authorName = (payload?.authorName && String(payload.authorName)) || 'Alguém';
        const snippet = (payload?.body && String(payload.body).slice(0, 200)) || '—';
        return forAssignee
          ? `💬 *Novo comentário no chamado*\nChamado: ${title}\nPor: ${authorName}\n"${snippet}${snippet.length >= 200 ? '…' : ''}"\nVer chamado: ${link}`
          : `💬 *Novo comentário no seu chamado*\nPor: ${authorName}\n"${snippet}${snippet.length >= 200 ? '…' : ''}"\nVer chamado: ${link}`;
      }
      case 'ATTACHMENT_ADDED':
        return forAssignee
          ? `📎 *Novo anexo no chamado*\nChamado: ${title}\nArquivo: ${(payload?.filename && String(payload.filename)) || '—'}\nVer chamado: ${link}`
          : `📎 *Um anexo foi adicionado ao seu chamado*\nArquivo: ${(payload?.filename && String(payload.filename)) || '—'}\nVer chamado: ${link}`;
      case 'ASSIGNEE_CHANGED':
        return forAssignee
          ? `👤 *Responsável pelo chamado alterado*\nChamado: ${title}\nNovo responsável: ${request.assignee?.name || '—'}\nVer chamado: ${link}`
          : `👤 *Responsável pelo chamado alterado*\nNovo responsável: ${request.assignee?.name || '—'}\nVer chamado: ${link}`;
      default:
        return `Chamado: ${title}\nResumo: ${summary}\nVer chamado: ${link}`;
    }
  }

  async function dmByEmail(email: string, text: string): Promise<void> {
    const userLookup = await slackApp.client.users.lookupByEmail({ email });
    const slackUserId = userLookup.user?.id;
    if (!slackUserId) {
      console.warn('[Chamado] Slack: usuário não encontrado para', email, 'chamado:', requestId);
      return;
    }
    await sendDmToSlackUser(slackApp.client, slackUserId, text, [
      { type: 'section', text: { type: 'mrkdwn', text } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${requestId.slice(0, 8)} · Theris Service Desk` }] }
    ]);
  }

  try {
    if (!skipRequesterDm && request.requester?.email) {
      const text = buildTexts(false);
      await dmByEmail(request.requester.email, text);
    }
    if (notifyAssignee && assigneeEmail) {
      const textA = buildTexts(true);
      await dmByEmail(assigneeEmail, textA);
    }
    console.log('[Chamado] Slack enviado com sucesso para chamado:', requestId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined;
    console.error(
      '[Chamado] Erro ao enviar Slack:',
      msg,
      code ? `(code: ${code})` : '',
      '| chamado:', requestId,
      '| Dica: verifique escopo users:read.email e se o e-mail do solicitante existe no workspace.'
    );
    if (err instanceof Error && err.stack) console.error(err.stack);
  }
}
