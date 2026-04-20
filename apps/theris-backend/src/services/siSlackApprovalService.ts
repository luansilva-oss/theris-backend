/**
 * Aprovação do time de SI via Slack (AEX, Onboarding, Offboarding, Acesso Root).
 * Mantém ts das DMs em Request.siSlackMessageTs para chat.update após decisão.
 */
import type { WebClient } from '@slack/web-api';
import type { Request } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { REQUEST_TYPES } from '../types/requestTypes';
import type { RootAccessDetails } from '../types/rootAccess';
import { URGENCIA_LABELS, isTipoUrgencia } from '../types/rootAccess';
import {
  approveAexViaSlack,
  approveFiringViaSlack,
  approveHiringViaSlack,
  rejectAexViaSlack,
  rejectFiringViaSlack,
  rejectHiringViaSlack
} from '../controllers/solicitacaoController';

export type SiDmRef = { userId: string; ts: string };

export function getSiSlackIdsFromEnv(): string[] {
  const ids = [
    process.env.SLACK_USER_LUAN || process.env.SLACK_ID_LUAN,
    process.env.SLACK_USER_VLADIMIR || process.env.SLACK_ID_VLADIMIR,
    process.env.SLACK_USER_ALLAN || process.env.SLACK_ID_ALLAN
  ]
    .map((s) => (s || '').trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

/** AEX: se o owner que aprovou na etapa 1 for SI, a etapa final vai só para os outros dois. */
export function getSiRecipientSlackIdsForAex(ownerApprovedBySlackId: string | null | undefined): string[] {
  const all = getSiSlackIdsFromEnv();
  if (!ownerApprovedBySlackId || !all.includes(ownerApprovedBySlackId)) return all;
  const rest = all.filter((id) => id !== ownerApprovedBySlackId);
  return rest.length > 0 ? rest : all;
}

/** Onboarding HIRING: exclui o solicitante (não pode aprovar o próprio chamado). Lista vazia → todos (igual AEX). */
export function getSiRecipientSlackIdsForOnboarding(requesterSlackId?: string | null): string[] {
  const all = getSiSlackIdsFromEnv();
  if (!requesterSlackId || !all.includes(requesterSlackId)) return all;
  const filtered = all.filter((id) => id !== requesterSlackId);
  return filtered.length > 0 ? filtered : all;
}

async function openDmPostReturnTs(
  client: WebClient,
  slackUserId: string,
  text: string,
  blocks?: unknown[]
): Promise<{ ts: string }> {
  const open = await client.conversations.open({ users: slackUserId });
  const channelId = open.channel?.id;
  if (!channelId) throw new Error(`conversations.open sem channel para ${slackUserId}`);
  const pm = await client.chat.postMessage({
    channel: channelId,
    text,
    ...(blocks ? { blocks: blocks as any } : {})
  });
  if (!pm.ts) throw new Error('postMessage sem ts');
  return { ts: pm.ts };
}

function aexSiBlocks(
  requestId: string,
  toolName: string,
  accessLevel: string,
  requesterName: string,
  ownerName: string | undefined,
  ownerIsSi: boolean
): unknown[] {
  const shortId = requestId.slice(0, 8);
  let body = `🔐 *Acesso Extraordinário — aprovação SI (#${shortId})*\n\n`;
  body += `*Solicitante:* ${requesterName}\n*Ferramenta:* ${toolName}\n*Nível:* ${accessLevel}\n`;
  if (ownerName) body += `*Owner aprovou:* ${ownerName}\n`;
  if (ownerIsSi && ownerName) {
    body += `\n⚠️ O owner é do time de SI. A aprovação final deve ser feita por *outro* membro do SI (não ${ownerName}).\n`;
  }
  body += `\nAvalie o chamado:`;
  return [
    { type: 'section', text: { type: 'mrkdwn', text: body } },
    {
      type: 'actions',
      block_id: 'aex_si_decision',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Aprovar', emoji: true },
          action_id: 'aex_si_approve_v2',
          value: `approve_${requestId}`,
          style: 'primary'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '❌ Recusar', emoji: true },
          action_id: 'aex_si_reject_v2',
          value: `reject_${requestId}`
        }
      ]
    }
  ];
}

function onboardingSiBlocks(requestId: string, summary: string): unknown[] {
  const shortId = requestId.slice(0, 8);
  const body = `👤 *Onboarding / Contratação — aprovação SI (#${shortId})*\n\n${summary}\n\nAvalie o chamado:`;
  return [
    { type: 'section', text: { type: 'mrkdwn', text: body } },
    {
      type: 'actions',
      block_id: 'aex_si_decision',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Aprovar', emoji: true },
          action_id: 'aex_si_approve_v2',
          value: `approve_${requestId}`,
          style: 'primary'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '❌ Recusar', emoji: true },
          action_id: 'aex_si_reject_v2',
          value: `reject_${requestId}`
        }
      ]
    }
  ];
}

function firingSiBlocks(requestId: string, summary: string): unknown[] {
  const shortId = requestId.slice(0, 8);
  const body = `🔴 *Offboarding — aprovação SI (#${shortId})*\n\n${summary}\n\nAvalie o chamado:`;
  return [
    { type: 'section', text: { type: 'mrkdwn', text: body } },
    {
      type: 'actions',
      block_id: 'aex_si_decision',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Aprovar', emoji: true },
          action_id: 'aex_si_approve_v2',
          value: `approve_${requestId}`,
          style: 'primary'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '❌ Recusar', emoji: true },
          action_id: 'aex_si_reject_v2',
          value: `reject_${requestId}`
        }
      ]
    }
  ];
}

export async function sendSiTeamAexApprovalDms(
  client: WebClient,
  params: {
    requestId: string;
    toolName: string;
    accessLevel: string;
    requesterName: string;
    ownerApprovedSlackId: string;
    ownerDisplayName?: string;
  }
): Promise<void> {
  const recipients = getSiRecipientSlackIdsForAex(params.ownerApprovedSlackId);
  const ownerIsSi = getSiSlackIdsFromEnv().includes(params.ownerApprovedSlackId);
  const blocks = aexSiBlocks(
    params.requestId,
    params.toolName,
    params.accessLevel,
    params.requesterName,
    params.ownerDisplayName,
    ownerIsSi
  );
  const refs: SiDmRef[] = [];
  for (const uid of recipients) {
    try {
      const { ts } = await openDmPostReturnTs(
        client,
        uid,
        `AEX #${params.requestId.slice(0, 8)} — aprovação SI`,
        blocks
      );
      refs.push({ userId: uid, ts });
    } catch (e) {
      console.error('[SI Slack] Falha DM AEX para', uid, e);
    }
  }
  if (refs.length > 0) {
    await prisma.request.update({
      where: { id: params.requestId },
      data: { siSlackMessageTs: refs as unknown as object[] }
    });
  }
}

export async function sendSiTeamOnboardingApprovalDms(
  client: WebClient,
  requestId: string,
  summary: string,
  requesterSlackId?: string | null
): Promise<void> {
  const recipients = getSiRecipientSlackIdsForOnboarding(requesterSlackId);
  const blocks = onboardingSiBlocks(requestId, summary);
  const refs: SiDmRef[] = [];
  for (const uid of recipients) {
    try {
      const { ts } = await openDmPostReturnTs(client, uid, `Onboarding #${requestId.slice(0, 8)} — aprovação SI`, blocks);
      refs.push({ userId: uid, ts });
    } catch (e) {
      console.error('[SI Slack] Falha DM Onboarding para', uid, e);
    }
  }
  if (refs.length > 0) {
    await prisma.request.update({
      where: { id: requestId },
      data: { siSlackMessageTs: refs as unknown as object[] }
    });
  }
}

export async function sendSiTeamFiringApprovalDms(
  client: WebClient,
  requestId: string,
  summary: string,
  requesterSlackId?: string | null
): Promise<void> {
  const recipients = getSiRecipientSlackIdsForOnboarding(requesterSlackId);
  const blocks = firingSiBlocks(requestId, summary);
  const refs: SiDmRef[] = [];
  for (const uid of recipients) {
    try {
      const { ts } = await openDmPostReturnTs(client, uid, `Offboarding #${requestId.slice(0, 8)} — aprovação SI`, blocks);
      refs.push({ userId: uid, ts });
    } catch (e) {
      console.error('[SI Slack] Falha DM Offboarding para', uid, e);
    }
  }
  if (refs.length > 0) {
    await prisma.request.update({
      where: { id: requestId },
      data: { siSlackMessageTs: refs as unknown as object[] }
    });
  }
}

function formatRootAccessExpiryBrt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function parseRootAccessDetails(detailsJson: string | null): RootAccessDetails | null {
  if (!detailsJson) return null;
  try {
    return JSON.parse(detailsJson) as RootAccessDetails;
  } catch {
    return null;
  }
}

/**
 * B2 (substituir no PR2): avisa SI se já existe ROOT_ACCESS aprovado no mesmo hostname
 * com expiry futuro para o mesmo solicitante.
 */
export async function detectActiveRootAccessOverlap(
  requesterId: string,
  hostname: string,
  excludeRequestId: string
): Promise<string | null> {
  const candidates = await prisma.request.findMany({
    where: {
      type: REQUEST_TYPES.ROOT_ACCESS,
      status: { in: ['APROVADO', 'APPROVED'] },
      requesterId,
      id: { not: excludeRequestId }
    },
    select: { id: true, details: true }
  });

  const now = Date.now();
  for (const row of candidates) {
    const d = parseRootAccessDetails(row.details);
    if (!d) continue;
    if (d.hostname !== hostname) continue;
    if (new Date(d.expiryAt).getTime() <= now) continue;
    return (
      `⚠️ *Sobreposição detectada*\n` +
      `Este colaborador já tem acesso root ativo em \`${d.hostname}\` até *${formatRootAccessExpiryBrt(d.expiryAt)}*. ` +
      `Aprovar vai *substituir* o acesso atual pelo novo TTL de *${d.ttlQuantidade} ${d.ttlUnidade.toLowerCase()}* ` +
      `(_TODO(PR2):_ revogação efetiva no JumpCloud).`
    );
  }
  return null;
}

export function rootAccessSiBlocks(request: Request & { requester?: { name: string | null } | null }, activeSudoWarning: string | null): unknown[] {
  const details = parseRootAccessDetails(request.details);
  const requesterName = request.requester?.name?.trim() || 'Colaborador';
  const shortId = request.id.slice(0, 8);
  const urgLabel =
    details?.urgencia && isTipoUrgencia(details.urgencia) ? URGENCIA_LABELS[details.urgencia] : (details?.urgencia ?? '—');

  const hostname = details?.hostname ?? '—';
  const ttlLine = details != null ? `${details.ttlQuantidade} ${details.ttlUnidade.toLowerCase()}` : '—';
  const expiryLine = details?.expiryAt ? formatRootAccessExpiryBrt(details.expiryAt) : '—';

  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🔐 Nova solicitação — Acesso Root', emoji: true }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*Chamado:* #${shortId}\n` +
          `*Solicitante:* ${requesterName}\n` +
          `*Device (hostname):* \`${hostname}\`\n` +
          `*TTL:* ${ttlLine}\n` +
          `*Expira em (hipotético pós-aprovação):* ${expiryLine}\n` +
          `*Urgência:* ${urgLabel}\n` +
          `*Justificativa:*\n>${(request.justification || '(não informada)').replace(/\n/g, '\n> ')}`
      }
    }
  ];

  if (activeSudoWarning) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: activeSudoWarning }
    });
  }

  blocks.push({
    type: 'actions',
    block_id: 'root_si_decision',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '✅ Aprovar', emoji: true },
        style: 'primary',
        action_id: 'root_si_approve_v1',
        value: `approve_${request.id}`
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: '❌ Reprovar', emoji: true },
        style: 'danger',
        action_id: 'root_si_reject_v1',
        value: `reject_${request.id}`
      }
    ]
  });

  return blocks;
}

/** Canal SI + DMs ao time (Luan/Vladimir/Allan) com Block Kit; `siSlackMessageTs` guarda só as DMs (chat.update entre SI). */
export async function sendSiTeamRootAccessDms(params: {
  client: WebClient;
  request: Request & { requester?: { name: string | null } | null };
  activeSudoWarning: string | null;
}): Promise<void> {
  const { client, request, activeSudoWarning } = params;
  const blocks = rootAccessSiBlocks(request, activeSudoWarning);
  const channelId = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  const dmLine = `🔐 Acesso Root — #${request.id.slice(0, 8)}`;

  if (channelId) {
    try {
      await client.chat.postMessage({
        channel: channelId,
        text: dmLine,
        blocks: blocks as never
      });
    } catch (e) {
      console.error('[ROOT_ACCESS] Falha ao postar no canal SI:', e);
    }
  }

  const recipients = getSiSlackIdsFromEnv();
  const refs: SiDmRef[] = [];
  for (const uid of recipients) {
    try {
      const { ts } = await openDmPostReturnTs(client, uid, dmLine, blocks);
      refs.push({ userId: uid, ts });
    } catch (e) {
      console.error('[ROOT_ACCESS] Falha DM SI para', uid, e);
    }
  }
  if (refs.length > 0) {
    await prisma.request.update({
      where: { id: request.id },
      data: { siSlackMessageTs: refs as unknown as object[] }
    });
  }
}

export async function approveRootAccessViaSlack(
  requestId: string,
  actorSlackId: string,
  therisApproverId: string | null
): Promise<'ok' | 'race' | 'bad_status'> {
  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, name: true, email: true } } }
  });
  if (!req || req.status !== 'PENDING_SI' || req.type !== REQUEST_TYPES.ROOT_ACCESS) return 'bad_status';

  const cnt = await prisma.request.updateMany({
    where: { id: requestId, status: 'PENDING_SI', siApprovedBy: null, type: REQUEST_TYPES.ROOT_ACCESS },
    data: {
      status: 'APROVADO',
      siApprovedBy: actorSlackId,
      siApprovedAt: new Date(),
      approverId: therisApproverId,
      ...(therisApproverId ? { assigneeId: therisApproverId } : {}),
      adminNote: 'Aprovado pelo SI (Slack) — Acesso Root.',
      updatedAt: new Date()
    }
  });
  if (cnt.count === 0) return 'race';

  // TODO(PR2): revogar sudo anterior no mesmo device (POST .../revoke) e POST /api/v2/accessrequests com
  // additionalAttributes.sudo = { enabled: true, withoutPassword: false }; persistir jumpcloudAccessRequestId em details.
  console.info(`[ROOT_ACCESS] TODO(PR2): chamar JumpCloud API para request ${requestId}`);

  const details = parseRootAccessDetails(req.details);
  const hostname = details?.hostname ?? 'seu device';

  try {
    const { getSlackApp, sendDmToSlackUser } = await import('./slackService');
    const app = getSlackApp();
    if (app?.client && req.requester?.email) {
      try {
        const lu = await app.client.users.lookupByEmail({ email: req.requester.email });
        const sid = lu.user?.id;
        if (sid) {
          await sendDmToSlackUser(
            app.client,
            sid,
            `✅ *Acesso Root aprovado*\n\n` +
              `Seu pedido de acesso root em \`${hostname}\` foi aprovado pelo time de SI.\n\n` +
              `⏳ *Integração com JumpCloud em desenvolvimento.* Por enquanto, contacte o time de SI para aplicar no device manualmente se precisar de urgência. ` +
              `Isto será automatizado em breve (PR2).`
          );
        }
      } catch (e) {
        console.error('[ROOT_ACCESS] DM ao solicitante (aprovar):', e);
      }
    }
  } catch (e) {
    console.error('[ROOT_ACCESS] Falha ao notificar solicitante (aprovar):', e);
  }

  try {
    const { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } = await import('./slackService');
    const app = getSlackApp();
    if (app?.client) {
      const nm = therisApproverId
        ? await prisma.user.findUnique({ where: { id: therisApproverId }, select: { name: true } })
        : null;
      await postSlackAcessosChannel(
        app.client,
        `✅ Acesso Root aprovado pelo SI · #${requestId.slice(0, 8)} · ${hostname} · ${nm?.name || 'SI'} · ${formatTimestampBrt()} BRT`
      );
    }
  } catch (_) {}

  return 'ok';
}

export async function rejectRootAccessViaSlack(
  requestId: string,
  actorSlackId: string,
  therisApproverId: string | null
): Promise<'ok' | 'race'> {
  const cnt = await prisma.request.updateMany({
    where: { id: requestId, status: 'PENDING_SI', type: REQUEST_TYPES.ROOT_ACCESS },
    data: {
      status: 'REJECTED',
      siApprovedBy: actorSlackId,
      siApprovedAt: new Date(),
      adminNote: 'Reprovado pelo SI (Slack) — Acesso Root.',
      updatedAt: new Date(),
      ...(therisApproverId ? { approverId: therisApproverId, assigneeId: therisApproverId } : {})
    }
  });
  if (cnt.count === 0) return 'race';

  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { email: true } } }
  });
  const details = parseRootAccessDetails(req?.details ?? null);
  const hostname = details?.hostname ?? 'seu device';

  try {
    const { getSlackApp, sendDmToSlackUser } = await import('./slackService');
    const app = getSlackApp();
    if (app?.client && req?.requester?.email) {
      try {
        const lu = await app.client.users.lookupByEmail({ email: req.requester.email });
        const sid = lu.user?.id;
        if (sid) {
          await sendDmToSlackUser(
            app.client,
            sid,
            `❌ *Acesso Root reprovado*\n\n` +
              `Seu pedido de acesso root em \`${hostname}\` foi reprovado pelo time de SI.\n\n` +
              `Se precisar, abra um novo pedido com *\\/infra* → *Acesso Root* e inclua mais detalhes na justificativa.`
          );
        }
      } catch (e) {
        console.error('[ROOT_ACCESS] DM ao solicitante (reprovar):', e);
      }
    }
  } catch (e) {
    console.error('[ROOT_ACCESS] Falha ao notificar solicitante (reprovar):', e);
  }

  try {
    const { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } = await import('./slackService');
    const app = getSlackApp();
    if (app?.client) {
      const nm = therisApproverId
        ? await prisma.user.findUnique({ where: { id: therisApproverId }, select: { name: true } })
        : null;
      await postSlackAcessosChannel(
        app.client,
        `❌ Acesso Root reprovado pelo SI · #${requestId.slice(0, 8)} · ${hostname} · ${nm?.name || 'SI'} · ${formatTimestampBrt()} BRT`
      );
    }
  } catch (_) {}

  return 'ok';
}

async function chatUpdateDmMessage(client: WebClient, userId: string, ts: string, text: string, blocks?: unknown[]): Promise<void> {
  try {
    const open = await client.conversations.open({ users: userId });
    const channelId = open.channel?.id;
    if (!channelId) return;
    await client.chat.update({ channel: channelId, ts, text, ...(blocks ? { blocks: blocks as any } : {}) });
  } catch (e) {
    console.error('[SI Slack] chat.update falhou', userId, ts, e);
  }
}

export async function refreshPeerSiDmsAfterDecision(
  client: WebClient,
  refs: SiDmRef[] | null | undefined,
  actorSlackId: string,
  opts: { approved: boolean; deciderName: string; kind: 'aex' | 'onboarding' | 'firing' | 'root' }
): Promise<void> {
  if (!refs || !Array.isArray(refs)) return;
  for (const r of refs) {
    if (r.userId === actorSlackId) continue;
    const msg = opts.approved
      ? `✅ Este chamado já foi aprovado por *${opts.deciderName}*. Nenhuma ação necessária.`
      : `❌ Este chamado foi recusado por *${opts.deciderName}*.`;
    await chatUpdateDmMessage(client, r.userId, r.ts, msg, [{ type: 'section', text: { type: 'mrkdwn', text: msg } }]);
  }
}

export async function updateActorSiDmConfirmed(
  client: WebClient,
  actorSlackId: string,
  ts: string | undefined,
  text: string
): Promise<void> {
  if (!ts) return;
  await chatUpdateDmMessage(client, actorSlackId, ts, text, [{ type: 'section', text: { type: 'mrkdwn', text } }]);
}

function parseSiRefs(raw: unknown): SiDmRef[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter((x: any) => x && typeof x.userId === 'string' && typeof x.ts === 'string') as SiDmRef[];
}

export async function handleSiDualApprovalSlackAction(params: {
  client: WebClient;
  body: { user?: { id?: string; username?: string }; message?: { ts?: string }; actions?: { action_id?: string; value?: string }[] };
  isApprove: boolean;
  respond?: (msg: object) => Promise<void>;
}): Promise<void> {
  const actorSlackId = params.body.user?.id || '';
  const action = params.body.actions?.[0];
  const rawValue = typeof action?.value === 'string' ? action.value : '';
  const requestId = rawValue.startsWith('approve_')
    ? rawValue.replace(/^approve_/, '')
    : rawValue.replace(/^reject_/, '');
  if (!requestId || !actorSlackId) return;

  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, name: true, email: true } } }
  });
  if (!req) return;

  if (req.status !== 'PENDING_SI') {
    let msg = 'Este chamado já foi concluído ou não está mais aguardando o SI.';
    if (req.siApprovedBy && req.siApprovedBy !== actorSlackId) {
      msg = `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy)}.`;
    }
    await params.respond?.({ response_type: 'ephemeral', text: msg });
    return;
  }

  const isHiring = req.type === 'HIRING';
  const isFiring = req.type === 'FIRING';
  const isAex =
    req.type === 'ACCESS_TOOL_EXTRA' ||
    (['ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'].includes(req.type) && req.isExtraordinary);
  const isRootAccess = req.type === REQUEST_TYPES.ROOT_ACCESS;

  if (!isHiring && !isFiring && !isAex && !isRootAccess) return;

  let requesterSlackIdForFilter: string | null = null;
  if ((isHiring || isFiring) && req.requester?.email) {
    try {
      const lu = await params.client.users.lookupByEmail({ email: req.requester.email });
      requesterSlackIdForFilter = lu.user?.id ?? null;
    } catch (_) {}
  }

  let allowed: string[];
  if (isHiring || isFiring) {
    allowed = getSiRecipientSlackIdsForOnboarding(requesterSlackIdForFilter);
  } else if (isAex) {
    allowed = getSiRecipientSlackIdsForAex(req.ownerApprovedBy ?? undefined);
  } else {
    allowed = getSiSlackIdsFromEnv();
  }
  if (!allowed.includes(actorSlackId)) {
    await params.respond?.({
      response_type: 'ephemeral',
      text: 'Você não está autorizado a aprovar este chamado nesta etapa.'
    });
    return;
  }

  if (isAex && req.ownerApprovedBy && actorSlackId === req.ownerApprovedBy) {
    await params.respond?.({
      response_type: 'ephemeral',
      text: 'Quem aprovou como Owner não pode aprovar também como SI neste chamado.'
    });
    return;
  }

  let deciderName = 'SI';
  try {
    const info = await params.client.users.info({ user: actorSlackId });
    deciderName = info.user?.real_name || info.user?.name || deciderName;
  } catch (_) {}

  let therisApproverId: string | null = null;
  try {
    const info = await params.client.users.info({ user: actorSlackId });
    const email = info.user?.profile?.email;
    if (email) {
      const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      therisApproverId = u?.id ?? null;
    }
  } catch (_) {}

  const refs = parseSiRefs(req.siSlackMessageTs as unknown);
  const actorTs = params.body.message?.ts;

    if (params.isApprove) {
    if (isAex) {
      const r = await approveAexViaSlack(requestId, actorSlackId, therisApproverId);
      if (r === 'bad_status') return;
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r !== 'ok') return;
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `✅ Você aprovou o AEX #${requestId.slice(0, 8)}. O acesso será provisionado.`
      );
      await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
        approved: true,
        deciderName,
        kind: 'aex'
      });
    } else if (isHiring) {
      const r = await approveHiringViaSlack(requestId, actorSlackId, therisApproverId);
      if (r === 'bad_status') return;
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r !== 'ok') return;
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `✅ Você aprovou o onboarding #${requestId.slice(0, 8)}. JumpCloud/Google em processamento.`
      );
      await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
        approved: true,
        deciderName,
        kind: 'onboarding'
      });
    } else if (isFiring) {
      const r = await approveFiringViaSlack(requestId, actorSlackId, therisApproverId);
      if (r === 'bad_status') return;
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r !== 'ok') return;
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `✅ Você aprovou o offboarding #${requestId.slice(0, 8)}. Automação em processamento.`
      );
      await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
        approved: true,
        deciderName,
        kind: 'firing'
      });
    } else if (isRootAccess) {
      const r = await approveRootAccessViaSlack(requestId, actorSlackId, therisApproverId);
      if (r === 'bad_status') return;
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r !== 'ok') return;
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `✅ Você aprovou o Acesso Root #${requestId.slice(0, 8)}.`
      );
      await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
        approved: true,
        deciderName,
        kind: 'root'
      });
    }
  } else {
    if (isAex) {
      const r = await rejectAexViaSlack(requestId, actorSlackId, therisApproverId);
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r !== 'ok') return;
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `❌ Você recusou o AEX #${requestId.slice(0, 8)}.`
      );
      await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
        approved: false,
        deciderName,
        kind: 'aex'
      });
    } else if (isHiring) {
      const r = await rejectHiringViaSlack(requestId, actorSlackId, therisApproverId);
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r !== 'ok') return;
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `❌ Você recusou o onboarding #${requestId.slice(0, 8)}.`
      );
      await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
        approved: false,
        deciderName,
        kind: 'onboarding'
      });
    } else if (isFiring) {
      const r = await rejectFiringViaSlack(requestId, actorSlackId, therisApproverId);
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r !== 'ok') return;
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `❌ Você recusou o offboarding #${requestId.slice(0, 8)}.`
      );
      await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
        approved: false,
        deciderName,
        kind: 'firing'
      });
    } else if (isRootAccess) {
      const r = await rejectRootAccessViaSlack(requestId, actorSlackId, therisApproverId);
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r !== 'ok') return;
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `❌ Você reprovou o Acesso Root #${requestId.slice(0, 8)}.`
      );
      await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
        approved: false,
        deciderName,
        kind: 'root'
      });
    }
  }
}

async function resolveSlackDisplayName(client: WebClient, slackUserId: string): Promise<string> {
  if (!slackUserId) return 'outro aprovador';
  try {
    const info = await client.users.info({ user: slackUserId });
    return info.user?.real_name || info.user?.name || 'outro aprovador';
  } catch (_) {
    return 'outro aprovador';
  }
}
