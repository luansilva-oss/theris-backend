"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSlackIdByUserName = getSlackIdByUserName;
exports.getOwnerSlackIdsForTool = getOwnerSlackIdsForTool;
exports.getSISlackIds = getSISlackIds;
exports.isSIMember = isSIMember;
exports.isOwnerSIMember = isOwnerSIMember;
exports.sendAexCreationDMs = sendAexCreationDMs;
exports.sendAexRequesterCreatedDM = sendAexRequesterCreatedDM;
exports.sendAexRequesterOwnerApprovedDM = sendAexRequesterOwnerApprovedDM;
exports.sendAexRequesterSIApprovedFirstDM = sendAexRequesterSIApprovedFirstDM;
exports.sendAexOwnerApprovedDMs = sendAexOwnerApprovedDMs;
exports.sendAexRejectedByOwnerDM = sendAexRejectedByOwnerDM;
exports.sendAexRejectedBySIDM = sendAexRejectedBySIDM;
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
/** Verifica se o slackId pertence ao time de SI (Luan, Vladimir ou Allan) */
async function isSIMember(slackId) {
    if (!slackId)
        return false;
    const siIds = await getSISlackIds();
    return siIds.includes(slackId);
}
/** Verifica se Owner ou Sub-Owner da ferramenta pertence ao time de SI */
async function isOwnerSIMember(toolName) {
    const ownerIds = await getOwnerSlackIdsForTool(toolName);
    const siIds = await getSISlackIds();
    return ownerIds.some((id) => siIds.includes(id));
}
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';
/** Envia DMs para Owner/Sub e SI quando uma solicitação AEX é criada (sempre fluxo de 2 etapas) */
async function sendAexCreationDMs(client, requestId, toolName, accessLevel, requesterName, justification, opts) {
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
                { type: 'button', text: { type: 'plain_text', text: '✅ Aprovar', emoji: true }, action_id: 'aex_owner_approve_v2', value: `approve_${requestId}`, style: 'primary' },
                { type: 'button', text: { type: 'plain_text', text: '❌ Reprovar', emoji: true }, action_id: 'aex_owner_reject_v2', value: `reject_${requestId}` }
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
/** NOTIF 1 — DM para o solicitante ao criar o chamado */
async function sendAexRequesterCreatedDM(client, requesterSlackId, requestId, toolName, accessLevel) {
    const shortId = requestId.slice(0, 8);
    try {
        await client.chat.postMessage({
            channel: requesterSlackId,
            text: `📋 *Chamado criado com sucesso!*

Seu pedido de acesso extraordinário foi registrado.

*Ferramenta:* ${toolName}
*Nível solicitado:* ${accessLevel}
*ID do chamado:* #${shortId}

A solicitação foi enviada para aprovação do responsável pela ferramenta. Você será notificado a cada atualização.`
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao notificar solicitante (criação):', e);
    }
}
/** NOTIF 2A — DM para o solicitante quando Owner aprova (PENDING_SI) */
async function sendAexRequesterOwnerApprovedDM(client, requesterSlackId, requestId, toolName, accessLevel) {
    const shortId = requestId.slice(0, 8);
    try {
        await client.chat.postMessage({
            channel: requesterSlackId,
            text: `✅ *Etapa 1 concluída — Owner aprovou!*

O responsável pela ferramenta aprovou sua solicitação.

*Ferramenta:* ${toolName}
*Nível:* ${accessLevel}
*Chamado:* #${shortId}

Agora aguarda aprovação final do time de Segurança da Informação. Você será notificado quando concluído.`
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao notificar solicitante (owner aprovou):', e);
    }
}
/** NOTIF 2B — DM para solicitante quando SI aprova primeiro (fluxo PENDENTE_OWNER após SI) */
async function sendAexRequesterSIApprovedFirstDM(client, requesterSlackId, requestId, toolName, accessLevel, ownerName, subOwnerName) {
    const shortId = requestId.slice(0, 8);
    const subLine = subOwnerName ? `\n*Sub-owner:* ${subOwnerName}` : '';
    try {
        await client.chat.postMessage({
            channel: requesterSlackId,
            text: `✅ *Etapa 1 concluída — Time de SI aprovou!*

O time de Segurança da Informação aprovou sua solicitação.

*Ferramenta:* ${toolName} — *Owner:* ${ownerName}${subLine}
*Nível:* ${accessLevel}
*Chamado:* #${shortId}

Aguardando aprovação do responsável pela ferramenta.`
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao notificar solicitante (SI aprovou primeiro):', e);
    }
}
/** Envia DM para Owner confirmando aprovação e para SI com link do painel.
 * Se o Owner for do time de SI, inclui aviso: aprovação final deve ser feita por outro integrante. */
async function sendAexOwnerApprovedDMs(client, requestId, toolName, accessLevel, requesterName, ownerSlackId, ownerName) {
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
    const ownerIsSI = await isSIMember(ownerSlackId);
    const ownerDisplayName = ownerName || 'Owner';
    let siMessage = `✅ *Owner aprovou o Acesso Extraordinário #${shortId}*

*Solicitante:* ${requesterName}
*Ferramenta:* ${toolName}
*Nível:* ${accessLevel}`;
    if (ownerIsSI) {
        siMessage += `

⚠️ Atenção: o Owner (${ownerDisplayName}) é do time de SI.
A aprovação final deve ser feita por Luan, Vladimir ou Allan — exceto ${ownerDisplayName}.`;
    }
    siMessage += `

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
/** NOTIF REJEIÇÃO — DM para solicitante quando Owner reprova */
async function sendAexRejectedByOwnerDM(client, requesterSlackId, requestId, toolName) {
    const shortId = requestId.slice(0, 8);
    try {
        await client.chat.postMessage({
            channel: requesterSlackId,
            text: `❌ *Solicitação reprovada*

Sua solicitação de acesso extraordinário foi reprovada.

*Ferramenta:* ${toolName}
*Chamado:* #${shortId}
*Reprovado por:* Owner/Responsável pela ferramenta`
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao notificar solicitante da rejeição:', e);
    }
}
/** NOTIF REJEIÇÃO — DM para solicitante quando SI reprova */
async function sendAexRejectedBySIDM(client, requesterSlackId, requestId, toolName) {
    const shortId = requestId.slice(0, 8);
    try {
        await client.chat.postMessage({
            channel: requesterSlackId,
            text: `❌ *Solicitação reprovada*

Sua solicitação de acesso extraordinário foi reprovada.

*Ferramenta:* ${toolName}
*Chamado:* #${shortId}
*Reprovado por:* Time de SI`
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao notificar solicitante da rejeição pelo SI:', e);
    }
}
/** NOTIF 3 — DM para solicitante quando ambos aprovaram (APPROVED) */
async function sendAexApprovedBySIDM(client, requesterSlackId, requestId, toolName, accessLevel) {
    const shortId = requestId.slice(0, 8);
    try {
        await client.chat.postMessage({
            channel: requesterSlackId,
            text: `🎉 *Acesso liberado!*

Sua solicitação foi totalmente aprovada.

*Ferramenta:* ${toolName}
*Nível de acesso:* ${accessLevel}
*Chamado:* #${shortId}

O acesso já está ativo no sistema.`
        });
    }
    catch (e) {
        console.error('[AEX] Erro ao notificar solicitante da aprovação:', e);
    }
}
