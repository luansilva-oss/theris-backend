/**
 * Notifica o solicitante no Slack sobre eventos do chamado (comentário, anexo, status, responsável).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { getSlackApp, sendDmToSlackUser } from './slackService';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';

const INFRA_REQUEST_TYPES = ['INFRA_SUPPORT'];
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
function getRequestContext(request: { type: string; details: string | null; justification: string | null }): { title: string; summary: string } {
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
  PENDENTE_OWNER: 'PENDENTE_OWNER'
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
      assignee: { select: { name: true } }
    }
  });
  if (!request?.requester?.email) {
    console.log('[Chamado] Slack não enviado: chamado sem requester/email, requestId:', requestId);
    return;
  }

  const { title, summary } = getRequestContext(request);

  try {
    const userLookup = await slackApp.client.users.lookupByEmail({ email: request.requester.email });
    const slackUserId = userLookup.user?.id;
    if (!slackUserId) {
      console.warn('[Chamado] Slack não enviado: usuário não encontrado para', request.requester.email, 'chamado:', requestId);
      return;
    }

    // Não enviar DM ao solicitante quando o autor do evento é o próprio solicitante
    if (eventType === 'COMMENT_ADDED' && payload?.authorId && String(payload.authorId) === request.requesterId) {
      console.log('[Chamado] DM omitida: comentário do próprio solicitante, requestId:', requestId);
      return;
    }
    if (eventType === 'ATTACHMENT_ADDED' && payload?.uploadedById && String(payload.uploadedById) === request.requesterId) {
      console.log('[Chamado] DM omitida: anexo do próprio solicitante, requestId:', requestId);
      return;
    }

    const link = `${FRONTEND_URL}/tickets?id=${requestId}`;
    let text: string;

    switch (eventType) {
      case 'TICKET_CREATED':
        text = `🎫 *Seu chamado foi aberto com sucesso!*\nTipo: ${title}\nStatus: ${statusLabel(request.status)}\nVer chamado: ${link}`;
        break;
      case 'STATUS_CHANGED':
        const from = payload?.from != null ? statusLabel(String(payload.from)) : request.status;
        const to = payload?.to != null ? statusLabel(String(payload.to)) : request.status;
        text = `🔄 *Seu chamado teve o status atualizado*\nDe: ${from} → Para: ${to}\nVer chamado: ${link}`;
        break;
      case 'COMMENT_ADDED': {
        const authorName = (payload?.authorName && String(payload.authorName)) || 'Alguém';
        const snippet = (payload?.body && String(payload.body).slice(0, 200)) || '—';
        text = `💬 *Novo comentário no seu chamado*\nPor: ${authorName}\n"${snippet}${snippet.length >= 200 ? '…' : ''}"\nVer chamado: ${link}`;
        break;
      }
      case 'ATTACHMENT_ADDED':
        text = `📎 *Um anexo foi adicionado ao seu chamado*\nArquivo: ${(payload?.filename && String(payload.filename)) || '—'}\nVer chamado: ${link}`;
        break;
      case 'ASSIGNEE_CHANGED':
        text = `👤 *Responsável pelo chamado alterado*\nNovo responsável: ${request.assignee?.name || '—'}\nVer chamado: ${link}`;
        break;
      default:
        text = `Chamado: ${title}\nResumo: ${summary}\nVer chamado: ${link}`;
    }

    await sendDmToSlackUser(slackApp.client, slackUserId, text, [
      { type: 'section', text: { type: 'mrkdwn', text } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${requestId.slice(0, 8)} · Theris Service Desk` }] }
    ]);
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
