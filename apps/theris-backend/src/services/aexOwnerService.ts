/**
 * Mapa de Owners/Sub-owners por ferramenta para o fluxo de Acesso Extraordinário.
 * Usa nome exato como está no banco de usuários.
 */
import { PrismaClient } from '@prisma/client';
import { getSlackApp, sendDmToSlackUser } from './slackService';

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
    where: { isActive: true, name: { equals: name, mode: 'insensitive' } },
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
  const { ownerSlackId, subOwnerSlackIds } = await getOwnerAndSubSlackIdsForTool(toolName);
  const all = [ownerSlackId, ...subOwnerSlackIds].filter(Boolean) as string[];
  return [...new Set(all)];
}

/** Retorna owner e sub-owners separadamente (para regra de conflito Líder = Owner).
 * Sub-owners sem Slack ID resolvível são filtrados e gera console.warn com o email. */
export async function getOwnerAndSubSlackIdsForTool(toolName: string): Promise<{ ownerSlackId: string | null; subOwnerSlackIds: string[] }> {
  const norm = normalizeToolName(toolName);
  const mapping = TOOL_OWNER_MAP[norm] ?? Object.entries(TOOL_OWNER_MAP).find(
    ([key]) => key.toLowerCase() === norm.toLowerCase()
  )?.[1];
  if (!mapping) return { ownerSlackId: null, subOwnerSlackIds: [] };
  const ownerSlackId = mapping.owner ? await getSlackIdByUserName(mapping.owner) : null;
  const subOwnerSlackIds: string[] = [];
  for (const n of mapping.subs.filter(Boolean)) {
    const email = await getUserEmailByName(n);
    let id: string | null = null;
    try {
      if (email) {
        const app = getSlackApp();
        const lookup = await app.client.users.lookupByEmail({ email });
        id = lookup.user?.id ?? null;
      }
      if (!id) {
        console.warn('[AEX] Sub-owner sem Slack ID resolvível:', email ?? n);
      } else if (!subOwnerSlackIds.includes(id)) {
        subOwnerSlackIds.push(id);
      }
    } catch (_) {
      console.warn('[AEX] Sub-owner sem Slack ID resolvível:', email ?? n);
    }
  }
  return { ownerSlackId: ownerSlackId ?? null, subOwnerSlackIds };
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

/** Verifica se o slackId pertence ao time de SI (Luan, Vladimir ou Allan) */
export async function isSIMember(slackId: string): Promise<boolean> {
  if (!slackId) return false;
  const siIds = await getSISlackIds();
  return siIds.includes(slackId);
}

/** Verifica se Owner ou Sub-Owner da ferramenta pertence ao time de SI */
export async function isOwnerSIMember(toolName: string): Promise<boolean> {
  const ownerIds = await getOwnerSlackIdsForTool(toolName);
  const siIds = await getSISlackIds();
  return ownerIds.some((id) => siIds.includes(id));
}

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';

/** Envia DMs para Owner/Sub e SI quando uma solicitação AEX é criada (sempre fluxo de 2 etapas).
 * Se requesterId for informado e o Owner da ferramenta for o mesmo que o Líder do solicitante,
 * envia apenas para os sub-owners; se não houver sub-owner, registra warning e envia para o owner. */
export async function sendAexCreationDMs(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requestId: string,
  toolName: string,
  accessLevel: string,
  requesterName: string,
  justification: string,
  opts?: { period?: string; requesterId?: string }
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  const { ownerSlackId, subOwnerSlackIds } = await getOwnerAndSubSlackIdsForTool(toolName);
  let ownerIds: string[];
  if (opts?.requesterId) {
    const requester = await prisma.user.findUnique({
      where: { id: opts.requesterId },
      select: { managerId: true, manager: { select: { email: true } } }
    });
    const leaderEmail = requester?.manager?.email;
    let leaderSlackId: string | null = null;
    if (leaderEmail) {
      try {
        const lookup = await getSlackApp().client.users.lookupByEmail({ email: leaderEmail });
        leaderSlackId = lookup.user?.id ?? null;
      } catch (_) {}
    }
    const ownerIsLeader = ownerSlackId && leaderSlackId && ownerSlackId === leaderSlackId;
    if (ownerIsLeader) {
      const validSubIds = subOwnerSlackIds.filter(Boolean);
      if (validSubIds.length > 0) {
        ownerIds = validSubIds;
      } else {
        console.warn('[AEX] Conflito Líder = Owner: nenhum sub-owner com Slack ID válido. Aprovação pendente de revisão manual.');
        ownerIds = ownerSlackId ? [ownerSlackId] : [];
      }
    } else {
      ownerIds = [ownerSlackId, ...subOwnerSlackIds].filter(Boolean) as string[];
    }
  } else {
    ownerIds = [ownerSlackId, ...subOwnerSlackIds].filter(Boolean) as string[];
  }
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
        { type: 'button', text: { type: 'plain_text', text: '✅ Aprovar', emoji: true }, action_id: 'aex_owner_approve_v2', value: `approve_${requestId}`, style: 'primary' },
        { type: 'button', text: { type: 'plain_text', text: '❌ Reprovar', emoji: true }, action_id: 'aex_owner_reject_v2', value: `reject_${requestId}` }
      ]
    }
  ];

  for (const channel of ownerIds) {
    try {
      await sendDmToSlackUser(client as any, channel, ownerMessage, ownerBlocks);
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
      await sendDmToSlackUser(client as any, channel, siMessage);
    } catch (e) {
      console.error(`[AEX] Erro ao enviar DM para SI (${channel}):`, e);
    }
  }
}

/** NOTIF 1 — DM para o solicitante ao criar o chamado */
export async function sendAexRequesterCreatedDM(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requesterSlackId: string,
  requestId: string,
  toolName: string,
  accessLevel: string
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  try {
    await sendDmToSlackUser(client as any, requesterSlackId, `📋 *Chamado criado com sucesso!*

Seu pedido de acesso extraordinário foi registrado.

*Ferramenta:* ${toolName}
*Nível solicitado:* ${accessLevel}
*ID do chamado:* #${shortId}

A solicitação foi enviada para aprovação do responsável pela ferramenta. Você será notificado a cada atualização.`);
  } catch (e) {
    console.error('[AEX] Erro ao notificar solicitante (criação):', e);
  }
}

/** NOTIF 2A — DM para o solicitante quando Owner aprova (PENDING_SI) */
export async function sendAexRequesterOwnerApprovedDM(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requesterSlackId: string,
  requestId: string,
  toolName: string,
  accessLevel: string
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  try {
    await sendDmToSlackUser(client as any, requesterSlackId, `✅ *Etapa 1 concluída — Owner aprovou!*

O responsável pela ferramenta aprovou sua solicitação.

*Ferramenta:* ${toolName}
*Nível:* ${accessLevel}
*Chamado:* #${shortId}

Agora aguarda aprovação final do time de Segurança da Informação. Você será notificado quando concluído.`);
  } catch (e) {
    console.error('[AEX] Erro ao notificar solicitante (owner aprovou):', e);
  }
}

/** NOTIF 2B — DM para solicitante quando SI aprova primeiro (fluxo PENDENTE_OWNER após SI) */
export async function sendAexRequesterSIApprovedFirstDM(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requesterSlackId: string,
  requestId: string,
  toolName: string,
  accessLevel: string,
  ownerName: string,
  subOwnerName?: string
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  const subLine = subOwnerName ? `\n*Sub-owner:* ${subOwnerName}` : '';
  try {
    await sendDmToSlackUser(client as any, requesterSlackId, `✅ *Etapa 1 concluída — Time de SI aprovou!*

O time de Segurança da Informação aprovou sua solicitação.

*Ferramenta:* ${toolName} — *Owner:* ${ownerName}${subLine}
*Nível:* ${accessLevel}
*Chamado:* #${shortId}

Aguardando aprovação do responsável pela ferramenta.`);
  } catch (e) {
    console.error('[AEX] Erro ao notificar solicitante (SI aprovou primeiro):', e);
  }
}

/** Envia DM para Owner confirmando aprovação e DMs ao SI com botões Aprovar/Recusar. */
export async function sendAexOwnerApprovedDMs(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requestId: string,
  toolName: string,
  accessLevel: string,
  requesterName: string,
  ownerSlackId: string,
  ownerName?: string
): Promise<void> {
  try {
    await sendDmToSlackUser(client as any, ownerSlackId, '✅ Você aprovou o acesso. Aguardando validação final do time de SI.');
  } catch (e) {
    console.error('[AEX] Erro ao confirmar DM para owner:', e);
  }

  const ownerDisplayName = ownerName || 'Owner';

  const { sendSiTeamAexApprovalDms } = await import('./siSlackApprovalService');
  await sendSiTeamAexApprovalDms(client as any, {
    requestId,
    toolName,
    accessLevel,
    requesterName,
    ownerApprovedSlackId: ownerSlackId,
    ownerDisplayName
  });
}

/** NOTIF REJEIÇÃO — DM para solicitante quando Owner reprova */
export async function sendAexRejectedByOwnerDM(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requesterSlackId: string,
  requestId: string,
  toolName: string
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  try {
    await sendDmToSlackUser(client as any, requesterSlackId, `❌ *Solicitação reprovada*

Sua solicitação de acesso extraordinário foi reprovada.

*Ferramenta:* ${toolName}
*Chamado:* #${shortId}
*Reprovado por:* Owner/Responsável pela ferramenta`);
  } catch (e) {
    console.error('[AEX] Erro ao notificar solicitante da rejeição:', e);
  }
}

/** NOTIF REJEIÇÃO — DM para solicitante quando SI reprova */
export async function sendAexRejectedBySIDM(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requesterSlackId: string,
  requestId: string,
  toolName: string
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  try {
    await sendDmToSlackUser(client as any, requesterSlackId, `❌ *Solicitação reprovada*

Sua solicitação de acesso extraordinário foi reprovada.

*Ferramenta:* ${toolName}
*Chamado:* #${shortId}
*Reprovado por:* Time de SI`);
  } catch (e) {
    console.error('[AEX] Erro ao notificar solicitante da rejeição pelo SI:', e);
  }
}

/** NOTIF 3 — DM para solicitante quando ambos aprovaram (APPROVED) */
export async function sendAexApprovedBySIDM(
  client: { chat: { postMessage: (opts: any) => Promise<any> } },
  requesterSlackId: string,
  requestId: string,
  toolName: string,
  accessLevel: string
): Promise<void> {
  const shortId = requestId.slice(0, 8);
  try {
    await sendDmToSlackUser(client as any, requesterSlackId, `🎉 *Acesso liberado!*

Sua solicitação foi totalmente aprovada.

*Ferramenta:* ${toolName}
*Nível de acesso:* ${accessLevel}
*Chamado:* #${shortId}

O acesso já está ativo no sistema.`);
  } catch (e) {
    console.error('[AEX] Erro ao notificar solicitante da aprovação:', e);
  }
}
