/**
 * Mapa de Owners/Sub-owners por ferramenta para o fluxo de Acesso Extraordinário.
 * Usa nome exato como está no banco de usuários.
 */
import { PrismaClient } from '@prisma/client';
import { getSlackApp } from './slackService';

const prisma = new PrismaClient();

/** Mapa: nome da ferramenta (como no catálogo) -> { owner: nome, subs: nomes[] } */
const TOOL_OWNER_MAP: Record<string, { owner: string; subs: string[] }> = {
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

function normalizeToolName(name: string): string {
  return (name || '').trim();
}

/** Busca usuário por nome (match exato) e retorna email */
async function getUserEmailByName(name: string): Promise<string | null> {
  const u = await prisma.user.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, isActive: true },
    select: { email: true }
  });
  return u?.email ?? null;
}

/** Retorna slackId a partir do nome do usuário */
export async function getSlackIdByUserName(name: string): Promise<string | null> {
  const email = await getUserEmailByName(name);
  if (!email) return null;
  try {
    const app = getSlackApp();
    const lookup = await app.client.users.lookupByEmail({ email });
    return lookup.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Retorna slackIds do owner e sub-owners para uma ferramenta */
export async function getOwnerSlackIdsForTool(toolName: string): Promise<string[]> {
  const norm = normalizeToolName(toolName);
  const mapping = TOOL_OWNER_MAP[norm] ?? Object.entries(TOOL_OWNER_MAP).find(
    ([key]) => key.toLowerCase() === norm.toLowerCase()
  )?.[1];
  if (!mapping) return [];
  const allNames = [mapping.owner, ...mapping.subs].filter(Boolean);
  const ids: string[] = [];
  for (const n of allNames) {
    const id = await getSlackIdByUserName(n);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Retorna slackIds do time de SI */
export async function getSISlackIds(): Promise<string[]> {
  const ids: string[] = [];
  for (const name of SI_TEAM_NAMES) {
    const id = await getSlackIdByUserName(name);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';

/** Envia DMs para Owner/Sub e SI quando uma solicitação AEX é criada */
export async function sendAexCreationDMs(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requestId: string,
  toolName: string,
  accessLevel: string,
  requesterName: string,
  justification: string
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  const ownerIds = await getOwnerSlackIdsForTool(toolName);
  const siIds = await getSISlackIds();

  const ownerMessage = `🔐 *Solicitação de Acesso Extraordinário*

*Solicitante:* ${requesterName}
*Ferramenta:* ${toolName}
*Nível solicitado:* ${accessLevel}
*Justificativa:* ${justification || '—'}

Por favor, avalie a solicitação #${shortId}:`;

  const ownerBlocks: any[] = [
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
    } catch (e) {
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
    if (ownerIds.includes(channel)) continue;
    try {
      await client.chat.postMessage({ channel, text: siMessage });
    } catch (e) {
      console.error(`[AEX] Erro ao enviar DM para SI (${channel}):`, e);
    }
  }
}

/** Envia DM para Owner confirmando aprovação e para SI com link do painel */
export async function sendAexOwnerApprovedDMs(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requestId: string,
  toolName: string,
  accessLevel: string,
  requesterName: string,
  ownerSlackId: string
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  const ticketsUrl = `${FRONTEND_URL}/tickets`;

  try {
    await client.chat.postMessage({
      channel: ownerSlackId,
      text: '✅ Você aprovou o acesso. Aguardando validação final do time de SI.'
    });
  } catch (e) {
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
    } catch (e) {
      console.error(`[AEX] Erro ao notificar SI (${channel}):`, e);
    }
  }
}

/** Envia DM para solicitante informando rejeição pelo owner */
export async function sendAexRejectedByOwnerDM(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requesterSlackId: string,
  toolName: string
): Promise<void> {
  try {
    await client.chat.postMessage({
      channel: requesterSlackId,
      text: `❌ Sua solicitação de acesso extraordinário para ${toolName} foi reprovada pelo responsável da ferramenta.`
    });
  } catch (e) {
    console.error('[AEX] Erro ao notificar solicitante da rejeição:', e);
  }
}

/** Envia DM para solicitante informando aprovação final pelo SI */
export async function sendAexApprovedBySIDM(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requesterSlackId: string,
  toolName: string,
  accessLevel: string
): Promise<void> {
  try {
    await client.chat.postMessage({
      channel: requesterSlackId,
      text: `✅ Seu acesso extraordinário para ${toolName} - ${accessLevel} foi aprovado! O acesso já está ativo no sistema.`
    });
  } catch (e) {
    console.error('[AEX] Erro ao notificar solicitante da aprovação:', e);
  }
}
