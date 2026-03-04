"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTicketEvent = notifyTicketEvent;
/**
 * Notifica o solicitante no Slack sobre eventos do chamado (comentário, anexo, status, responsável).
 */
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const slackService_1 = require("./slackService");
const INFRA_REQUEST_TYPES = ['INFRA_SUPPORT'];
const ACCESS_REQUEST_TYPES = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
const PEOPLE_REQUEST_TYPES = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
const SUMMARY_MAX_LEN = 120;
function getApp() {
    try {
        return (0, slackService_1.getSlackApp)();
    }
    catch {
        return null;
    }
}
/** Extrai título e resumo do chamado a partir de type, details e justification (para contexto nas notificações Slack). */
function getRequestContext(request) {
    let detailsObj = {};
    try {
        detailsObj = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
    }
    catch {
        detailsObj = {};
    }
    const d = detailsObj;
    let title;
    if (INFRA_REQUEST_TYPES.includes(request.type)) {
        title = (d.requestTypeLabel || d.requestType || 'Suporte Infra').trim() || 'Suporte Infra';
    }
    else if (request.type === 'DEPUTY_DESIGNATION' && d.tool) {
        title = `Indicar Deputy: ${(d.tool || '').trim() || '—'}`;
    }
    else if (PEOPLE_REQUEST_TYPES.includes(request.type)) {
        const actionLabels = {
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
    }
    else if (ACCESS_REQUEST_TYPES.includes(request.type) || (request.type === 'DEPUTY_DESIGNATION' && d.tool)) {
        const isNewTool = request.type === 'ACCESS_TOOL' && (d.toolName || (d.info || '').toLowerCase().includes('nova ferramenta'));
        title = (isNewTool ? (d.toolName || d.info || 'Nova ferramenta') : (d.tool || d.info || request.type)).trim() || request.type;
    }
    else {
        title = (d.info || request.type).trim() || request.type;
    }
    const rawSummary = d.description?.trim() ||
        d.problem?.trim() ||
        d.info?.trim() ||
        request.justification?.trim() ||
        '';
    const summary = rawSummary.length > SUMMARY_MAX_LEN
        ? rawSummary.slice(0, SUMMARY_MAX_LEN).trim() + '...'
        : rawSummary || '—';
    return { title, summary };
}
const EVENT_LABELS = {
    TICKET_CREATED: 'Seu chamado foi criado',
    COMMENT_ADDED: 'Novo comentário no seu chamado',
    ATTACHMENT_ADDED: 'Novo documento anexado ao chamado',
    STATUS_CHANGED: 'Status do chamado atualizado',
    ASSIGNEE_CHANGED: 'Responsável pelo chamado alterado'
};
async function notifyTicketEvent(requestId, eventType, payload) {
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
    if (!request?.requester?.email)
        return;
    const { title, summary } = getRequestContext(request);
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
        text += `\n\nChamado: ${title}\nResumo: ${summary}`;
        await slackApp.client.chat.postMessage({
            channel: slackUserId,
            text,
            blocks: [
                { type: 'section', text: { type: 'mrkdwn', text } },
                { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${requestId.slice(0, 8)} · Theris Service Desk` }] }
            ]
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
        console.error('[Slack] Falha ao notificar no ticketEventService:', msg, code ? `(code: ${code})` : '', '| Token definido:', hasToken, '| Dica: verifique escopo users:read.email e se o e-mail do solicitante existe no workspace.');
        if (err instanceof Error && err.stack)
            console.error(err.stack);
    }
}
