"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSlackIdByUserName = getSlackIdByUserName;
exports.getOwnerSlackIdsForTool = getOwnerSlackIdsForTool;
exports.getSISlackIds = getSISlackIds;
exports.sendAexCreationDMs = sendAexCreationDMs;
exports.sendAexOwnerApprovedDMs = sendAexOwnerApprovedDMs;
exports.sendAexRejectedByOwnerDM = sendAexRejectedByOwnerDM;
exports.sendAexApprovedBySIDM = sendAexApprovedBySIDM;
/**
 * Mapa de Owners/Sub-owners por ferramenta para o fluxo de Acesso Extraordinário.
 * Usa nome exato como está no banco de usuários.
 */
const client_1 = require("@prisma/client");
const slackService_1 = require("./slackService");
const prisma = new client_1.PrismaClient();
/** Mapa: nome da ferramenta (como no catálogo) -> { owner: nome, subs: nomes[] } */
const TOOL_OWNER_MAP = {
    'JumpCloud': { owner: 'Vladimir Antonio Sesar', subs: ['Luan Matheus dos Santos Silva', 'Allan Von Stein Portela'] },
    'ClickUp': { owner: 'Isabely Wendler', subs: ['Renata Czapiewski Silva'] },
    '3C (Admin 3C)': { owner: 'Allan Von Stein Portela', subs: ['Fernando Mosquer'] },
    '3C PLUS': { owner: 'Allan Von Stein Portela', subs: ['Fernando Mosquer'] },
    'Evolux': { owner: 'Carlos Henrique Marques', subs: ['Pedro Henrique Ferreira do Nascimento'] },
    'Dizify': { owner: 'Marieli Aparecida Ferreira Thomen', subs: ['Jeferson da Cruz'] },
    'NetSuite': { owner: 'Aline Alda da Fonseca Bocchi', subs: ['Fernando Vantroba Takakusa'] },
    'GitLab': { owner: 'Diogo Henrique Hartmann', subs: ['João Paulo Vasconcelos do Vale'] },
    'AWS': { owner: 'Carlos Henrique Marques', subs: ['João Paulo Vasconcelos do Vale'] },
    'GCP': { owner: 'Diogo Henrique Hartmann', subs: ['João Paulo Vasconcelos do Vale'] },
    'Convenia': { owner: 'Raphael Pires Ida', subs: ['Renata Czapiewski Silva'] },
    'Clicsign': { owner: 'Fernando Vantroba Takakusa', subs: ['Aline Alda da Fonseca Bocchi'] },
    'Click Sign': { owner: 'Fernando Vantroba Takakusa', subs: ['Aline Alda da Fonseca Bocchi'] },
    'Meta': { owner: 'Rafael Blaka Schimanski', subs: ['Vanderlei Assis de Andrade Junior'] },
    'META': { owner: 'Rafael Blaka Schimanski', subs: ['Vanderlei Assis de Andrade Junior'] },
    'FiqOn': { owner: 'Guilherme Pinheiro Lemos', subs: ['Lucas Matheus da Cruz'] },
    'N8N': { owner: 'Pablo Emanuel da Silva', subs: ['Eduardo Wosiak'] },
    'Hik-Connect': { owner: 'Vladimir Antonio Sesar', subs: ['Allan Von Stein Portela'] },
    'Hik Connect': { owner: 'Vladimir Antonio Sesar', subs: ['Allan Von Stein Portela'] },
    'ChatGPT': { owner: 'Pablo Emanuel da Silva', subs: ['Wagner Wolff Pretto'] },
    'Chat GPT': { owner: 'Pablo Emanuel da Silva', subs: ['Wagner Wolff Pretto'] },
    'Focus': { owner: 'Aline Alda da Fonseca Bocchi', subs: [] },
    'Vindi': { owner: 'Pablo Emanuel da Silva', subs: ['Ian Ronska Nepomoceno'] },
    'Router': { owner: 'Diogo Henrique Hartmann', subs: ['Ian Ronska Nepomoceno'] },
    'Next Router': { owner: 'Diogo Henrique Hartmann', subs: ['Ian Ronska Nepomoceno'] },
    'NextRouter': { owner: 'Diogo Henrique Hartmann', subs: ['Ian Ronska Nepomoceno'] },
    'Figma': { owner: 'Gabriel Pires Ida', subs: [] },
    'HubSpot': { owner: 'Pablo Emanuel da Silva', subs: ['Deborah Peres'] },
};
/** Time de SI — sempre notificado (apenas informativo) */
const SI_TEAM_NAMES = [
    'Luan Matheus dos Santos Silva',
    'Vladimir Antonio Sesar',
    'Allan Von Stein Portela',
];
function normalizeToolName(name) {
    return (name || '').trim();
}
/** Busca usuário por nome (match exato) e retorna email */
async function getUserEmailByName(name) {
    const u = await prisma.user.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, isActive: true },
        select: { email: true }
    });
    return u?.email ?? null;
}
/** Retorna slackId a partir do nome do usuário */
async function getSlackIdByUserName(name) {
    const email = await getUserEmailByName(name);
    if (!email)
        return null;
    try {
        const app = (0, slackService_1.getSlackApp)();
        const lookup = await app.client.users.lookupByEmail({ email });
        return lookup.user?.id ?? null;
    }
    catch {
        return null;
    }
}
/** Retorna slackIds do owner e sub-owners para uma ferramenta */
async function getOwnerSlackIdsForTool(toolName) {
    const norm = normalizeToolName(toolName);
    const mapping = TOOL_OWNER_MAP[norm] ?? Object.entries(TOOL_OWNER_MAP).find(([key]) => key.toLowerCase() === norm.toLowerCase())?.[1];
    if (!mapping)
        return [];
    const allNames = [mapping.owner, ...mapping.subs].filter(Boolean);
    const ids = [];
    for (const n of allNames) {
        const id = await getSlackIdByUserName(n);
        if (id && !ids.includes(id))
            ids.push(id);
    }
    return ids;
}
/** Retorna slackIds do time de SI */
async function getSISlackIds() {
    const ids = [];
    for (const name of SI_TEAM_NAMES) {
        const id = await getSlackIdByUserName(name);
        if (id && !ids.includes(id))
            ids.push(id);
    }
    return ids;
}
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';
/** Envia DMs para Owner/Sub e SI quando uma solicitação AEX é criada */
async function sendAexCreationDMs(client, requestId, toolName, accessLevel, requesterName, justification) {
    const shortId = requestId.slice(0, 8);
    const ownerIds = await getOwnerSlackIdsForTool(toolName);
    const siIds = await getSISlackIds();
    const ownerMessage = `🔐 *Solicitação de Acesso Extraordinário*

*Solicitante:* ${requesterName}
*Ferramenta:* ${toolName}
*Nível solicitado:* ${accessLevel}
*Justificativa:* ${justification || '—'}

Por favor, avalie a solicitação #${shortId}:`;
    const ownerBlocks = [
        { type: 'section', text: { type: 'mrkdwn', text: ownerMessage } },
        {
            type: 'actions',
            block_id: 'aex_owner_decision',
            elements: [
                { type: 'button', text: { type: 'plain_text', text: '✅ Aprovar', emoji: true }, action_id: 'aex_approve', value: requestId, style: 'primary' },
                { type: 'button', text: { type: 'plain_text', text: '❌ Reprovar', emoji: true }, action_id: 'aex_reject', value: requestId }
            ]
        }
    ];
    for (const channel of ownerIds) {
        try {
            await client.chat.postMessage({ channel, text: ownerMessage, blocks: ownerBlocks });
        }
        catch (e) {
            console.error(`[AEX] Erro ao enviar DM para owner/sub (${channel}):`, e);
        }
    }
    const siMessage = `📋 *Nova solicitação de Acesso Extraordinário aguardando aprovação do Owner*

*Solicitante:* ${requesterName}
*Ferramenta:* ${toolName}
*Nível:* ${accessLevel}
*ID do chamado:* #${shortId}

Aguardando aprovação do owner. Você será notificado quando o owner decidir para que possa aprovar/reprovar no painel.`;
    for (const channel of siIds) {
        if (ownerIds.includes(channel))
            continue;
        try {
            await client.chat.postMessage({ channel, text: siMessage });
        }
        catch (e) {
            console.error(`[AEX] Erro ao enviar DM para SI (${channel}):`, e);
        }
    }
}
/** Envia DM para Owner confirmando aprovação e para SI com link do painel */
async function sendAexOwnerApprovedDMs(client, requestId, toolName, accessLevel, requesterName, ownerSlackId) {
    const shortId = requestId.slice(0, 8);
    const ticketsUrl = `${FRONTEND_URL}/tickets`;
    try {
        await client.chat.postMessage({
            channel: ownerSlackId,
            text: '✅ Você aprovou o acesso. Aguardando validação final do time de SI.'
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao confirmar DM para owner:', e);
    }
    const siIds = await getSISlackIds();
    const siMessage = `✅ *Owner aprovou o Acesso Extraordinário #${shortId}*

*Solicitante:* ${requesterName}
*Ferramenta:* ${toolName}
*Nível:* ${accessLevel}

Acesse o painel para a aprovação final: ${ticketsUrl}`;
    for (const channel of siIds) {
        try {
            await client.chat.postMessage({ channel, text: siMessage });
        }
        catch (e) {
            console.error(`[AEX] Erro ao notificar SI (${channel}):`, e);
        }
    }
}
/** Envia DM para solicitante informando rejeição pelo owner */
async function sendAexRejectedByOwnerDM(client, requesterSlackId, toolName) {
    try {
        await client.chat.postMessage({
            channel: requesterSlackId,
            text: `❌ Sua solicitação de acesso extraordinário para ${toolName} foi reprovada pelo responsável da ferramenta.`
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao notificar solicitante da rejeição:', e);
    }
}
/** Envia DM para solicitante informando aprovação final pelo SI */
async function sendAexApprovedBySIDM(client, requesterSlackId, toolName, accessLevel) {
    try {
        await client.chat.postMessage({
            channel: requesterSlackId,
            text: `✅ Seu acesso extraordinário para ${toolName} - ${accessLevel} foi aprovado! O acesso já está ativo no sistema.`
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao notificar solicitante da aprovação:', e);
    }
}
