/**
 * Aprovação do time de SI via Slack (AEX, Onboarding, Offboarding, Acesso Root).
 * DMs SI: `siSlackMessageTs` [{ userId, ts }]. ROOT_ACCESS também persiste `siSlackRootChannelTs` (ts no canal SI).
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
import {
  createSudoAccessRequest,
  revokeAccessRequest,
  validateUserDeviceLink
} from './jumpcloudAccessRequestService';

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
 * B2: avisa SI se já existe ROOT_ACCESS aprovado no mesmo device (hostname + JumpCloud system id)
 * com expiração futura para o mesmo solicitante.
 */
export async function detectActiveRootAccessOverlap(
  requesterId: string,
  hostname: string,
  excludeRequestId: string,
  jumpcloudDeviceId?: string | null
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
    const expMs = new Date(d.expiryAt).getTime();
    if (!Number.isFinite(expMs) || expMs <= now) continue;
    if (d.statusJc === 'EXPIRED' || d.statusJc === 'FAILED') continue;
    if (jumpcloudDeviceId && d.jumpcloudDeviceId && d.jumpcloudDeviceId !== jumpcloudDeviceId) continue;
    return (
      `⚠️ *Sobreposição detectada*\n` +
      `Este colaborador já tem acesso root ativo em \`${d.hostname}\` até *${formatRootAccessExpiryBrt(d.expiryAt)}*. ` +
      `Aprovar vai *substituir* o acesso atual pelo novo TTL de *${d.ttlQuantidade} ${d.ttlUnidade.toLowerCase()}* ` +
      `(revoga o access request JumpCloud anterior após criar o novo).`
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
          `*Expira em:* ${expiryLine}\n` +
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

/**
 * Canal SI + DMs ao time (Luan/Vladimir/Allan) com Block Kit.
 * `siSlackRootChannelTs` = ts no canal SI; `siSlackMessageTs` = DMs (chat.update após decisão).
 */
export async function sendSiTeamRootAccessDms(params: {
  client: WebClient;
  request: Request & { requester?: { name: string | null } | null };
  activeSudoWarning: string | null;
}): Promise<void> {
  const { client, request, activeSudoWarning } = params;
  const blocks = rootAccessSiBlocks(request, activeSudoWarning);
  const channelId = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  const dmLine = `🔐 Acesso Root — #${request.id.slice(0, 8)}`;

  let channelTs: string | undefined;
  if (channelId) {
    try {
      const pm = await client.chat.postMessage({
        channel: channelId,
        text: dmLine,
        blocks: blocks as never
      });
      channelTs = pm.ts ?? undefined;
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

  const data: { siSlackRootChannelTs?: string; siSlackMessageTs?: object[] } = {};
  if (channelTs) data.siSlackRootChannelTs = channelTs;
  if (refs.length > 0) data.siSlackMessageTs = refs as unknown as object[];
  if (Object.keys(data).length > 0) {
    await prisma.request.update({
      where: { id: request.id },
      data
    });
  }
}

type PriorActiveSudoRow = {
  id: string;
  details: RootAccessDetails;
  jumpcloudAccessRequestId: string;
};

async function findPriorActiveSudo(
  requesterId: string,
  jumpcloudDeviceId: string,
  excludeRequestId: string
): Promise<PriorActiveSudoRow | null> {
  const rows = await prisma.request.findMany({
    where: {
      type: REQUEST_TYPES.ROOT_ACCESS,
      status: { in: ['APROVADO', 'APPROVED'] },
      requesterId,
      id: { not: excludeRequestId }
    },
    select: { id: true, details: true }
  });
  const now = Date.now();
  for (const row of rows) {
    const d = parseRootAccessDetails(row.details);
    if (!d) continue;
    if (d.jumpcloudDeviceId !== jumpcloudDeviceId) continue;
    if (d.statusJc !== 'APPLIED') continue;
    const jid = d.jumpcloudAccessRequestId?.trim();
    if (!jid) continue;
    const expMs = new Date(d.expiryAt).getTime();
    if (!Number.isFinite(expMs) || expMs <= now) continue;
    return { id: row.id, details: d, jumpcloudAccessRequestId: jid };
  }
  return null;
}

async function markRootAccessJumpCloudFailed(
  requestId: string,
  base: RootAccessDetails,
  errorMessage: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const updated: RootAccessDetails = {
    ...base,
    statusJc: 'FAILED',
    lastError: errorMessage.slice(0, 2000),
    lastErrorAt: nowIso
  };
  await prisma.request.update({
    where: { id: requestId },
    data: { details: JSON.stringify(updated), updatedAt: new Date() }
  });
}

async function postSiRootAccessAlert(text: string): Promise<void> {
  try {
    const { getSlackApp } = await import('./slackService');
    const app = getSlackApp();
    const ch = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
    if (app?.client && ch) {
      await app.client.chat.postMessage({ channel: ch, text });
    }
  } catch (e) {
    console.error('[ROOT_ACCESS] Falha ao postar alerta SI:', e);
  }
}

async function notifySiPriorRevokeFailure(params: {
  requesterName: string | null | undefined;
  hostname: string;
  priorRequestId: string;
  priorAccessRequestId: string;
  error: string;
  httpStatus: number;
}): Promise<void> {
  const jcUrl = 'https://console.jumpcloud.com/';
  const isServer = params.httpStatus >= 500;
  const logFn = isServer ? console.error.bind(console) : console.warn.bind(console);
  logFn('[ROOT_ACCESS] Revoke access request falhou:', params.httpStatus, params.error.slice(0, 300));
  const msg =
    `⚠️ *ROOT_ACCESS — revogação manual necessária*\n` +
    `O acesso root *anterior* de *${params.requesterName ?? 'colaborador'}* em \`${params.hostname}\` ` +
    `não foi revogado automaticamente no JumpCloud.\n` +
    `*Request Theris (anterior):* \`${params.priorRequestId.slice(0, 8)}…\`\n` +
    `*Access request ID:* \`${params.priorAccessRequestId}\`\n` +
    `*HTTP:* ${params.httpStatus}\n` +
    `*Erro:* \`${params.error.replace(/`/g, "'").slice(0, 500)}\`\n` +
    `Revogue manualmente em ${jcUrl}`;
  await postSiRootAccessAlert(msg);
}

export type ApproveRootAccessResult =
  | 'ok'
  | 'race'
  | 'bad_status'
  | 'revalidation_failed'
  | 'jc_create_failed';

export async function approveRootAccessViaSlack(
  requestId: string,
  actorSlackId: string,
  therisApproverId: string | null,
  deciderDisplayName: string
): Promise<ApproveRootAccessResult> {
  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, name: true, email: true } } }
  });
  if (!req || req.status !== 'PENDING_SI' || req.type !== REQUEST_TYPES.ROOT_ACCESS) return 'bad_status';

  const details0 = parseRootAccessDetails(req.details);
  if (!details0) return 'bad_status';

  const jcUser = details0.jumpcloudUserId?.trim() ?? '';
  const jcDevice = details0.jumpcloudDeviceId?.trim() ?? '';
  const hostname = details0.hostname ?? 'seu device';

  if (!jcUser || !jcDevice) {
    const cntMissing = await prisma.request.updateMany({
      where: { id: requestId, status: 'PENDING_SI', siApprovedBy: null, type: REQUEST_TYPES.ROOT_ACCESS },
      data: {
        status: 'REJECTED',
        siApprovedBy: actorSlackId,
        siApprovedAt: new Date(),
        approverId: therisApproverId,
        ...(therisApproverId ? { assigneeId: therisApproverId } : {}),
        adminNote: 'Rejeição automática — IDs JumpCloud ausentes no pedido (dados inconsistentes).',
        updatedAt: new Date()
      }
    });
    if (cntMissing.count === 0) return 'race';
    try {
      const { getSlackApp, sendDmToSlackUser } = await import('./slackService');
      const app = getSlackApp();
      if (app?.client && req.requester?.email) {
        const lu = await app.client.users.lookupByEmail({ email: req.requester.email });
        const sid = lu.user?.id;
        if (sid) {
          await sendDmToSlackUser(
            app.client,
            sid,
            `❌ *Falha ao aplicar acesso no JumpCloud*\n\n` +
              `O pedido de acesso root em \`${hostname}\` não pôde ser processado porque faltam dados de integração. Contate SI.`
          );
        }
      }
    } catch (e) {
      console.error('[ROOT_ACCESS] DM ao solicitante (IDs ausentes):', e);
    }
    return 'revalidation_failed';
  }

  const reval = await validateUserDeviceLink(jcUser, jcDevice);
  if (reval.ok === false) {
    const note = `Rejeição automática — revalidação JumpCloud: ${reval.error} ${reval.details ?? ''}`.slice(0, 900);
    const cntR = await prisma.request.updateMany({
      where: { id: requestId, status: 'PENDING_SI', siApprovedBy: null, type: REQUEST_TYPES.ROOT_ACCESS },
      data: {
        status: 'REJECTED',
        siApprovedBy: actorSlackId,
        siApprovedAt: new Date(),
        approverId: therisApproverId,
        ...(therisApproverId ? { assigneeId: therisApproverId } : {}),
        adminNote: note,
        updatedAt: new Date()
      }
    });
    if (cntR.count === 0) return 'race';
    try {
      const { getSlackApp, sendDmToSlackUser } = await import('./slackService');
      const app = getSlackApp();
      if (app?.client && req.requester?.email) {
        const lu = await app.client.users.lookupByEmail({ email: req.requester.email });
        const sid = lu.user?.id;
        if (sid) {
          await sendDmToSlackUser(
            app.client,
            sid,
            `❌ *Falha ao aplicar acesso no JumpCloud*\n\n` +
              `O vínculo entre você e o device \`${hostname}\` no JumpCloud mudou desde o envio do pedido. ` +
              `O chamado foi encerrado automaticamente. Contate SI se precisar de ajuda.`
          );
        }
      }
    } catch (e) {
      console.error('[ROOT_ACCESS] DM ao solicitante (revalidação):', e);
    }
    return 'revalidation_failed';
  }

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

  const expiryIso = new Date(Date.now() + details0.ttlSegundos * 1000).toISOString();
  const prior =
    req.requesterId != null
      ? await findPriorActiveSudo(req.requesterId, jcDevice, requestId)
      : null;

  const createResult = await createSudoAccessRequest({
    jumpcloudUserId: jcUser,
    jumpcloudDeviceId: jcDevice,
    expiryIso,
    justification: (req.justification ?? '').trim() || 'ROOT_ACCESS'
  });

  if (createResult.ok === false) {
    await markRootAccessJumpCloudFailed(
      requestId,
      details0,
      `POST /accessrequests: ${createResult.error} (HTTP ${createResult.status})`
    );
    await postSiRootAccessAlert(
      `⚠️ *ROOT_ACCESS — falha ao criar no JumpCloud*\n` +
        `*Chamado:* #${requestId.slice(0, 8)}\n` +
        `*Device:* \`${hostname}\`\n` +
        `*HTTP:* ${createResult.status}\n` +
        `\`${createResult.error.replace(/`/g, "'").slice(0, 500)}\``
    );
    try {
      const { getSlackApp, sendDmToSlackUser } = await import('./slackService');
      const app = getSlackApp();
      if (app?.client && req.requester?.email) {
        const lu = await app.client.users.lookupByEmail({ email: req.requester.email });
        const sid = lu.user?.id;
        if (sid) {
          await sendDmToSlackUser(
            app.client,
            sid,
            `❌ *Falha ao aplicar acesso no JumpCloud*\n\n` +
              `Não foi possível aplicar sudo em \`${hostname}\`. Contate SI e informe o chamado #${requestId.slice(0, 8)}.`
          );
        }
      }
    } catch (e) {
      console.error('[ROOT_ACCESS] DM ao solicitante (create falhou):', e);
    }
    return 'jc_create_failed';
  }

  if (prior) {
    const revokeResult = await revokeAccessRequest(prior.jumpcloudAccessRequestId);
    if (revokeResult.ok === true) {
      const priorDetails: RootAccessDetails = {
        ...prior.details,
        statusJc: 'EXPIRED',
        lastError: null,
        lastErrorAt: null
      };
      await prisma.request.update({
        where: { id: prior.id },
        data: { details: JSON.stringify(priorDetails), updatedAt: new Date() }
      });
      if (revokeResult.alreadyGone) {
        console.info(`[ROOT_ACCESS] Revoke prior ${prior.jumpcloudAccessRequestId}: já não aplicável`);
      }
    } else if (revokeResult.ok === false) {
      await notifySiPriorRevokeFailure({
        requesterName: req.requester?.name,
        hostname,
        priorRequestId: prior.id,
        priorAccessRequestId: prior.jumpcloudAccessRequestId,
        error: revokeResult.error,
        httpStatus: revokeResult.status
      });
      const priorDetails: RootAccessDetails = {
        ...prior.details,
        statusJc: 'EXPIRED',
        lastError: `Revogação automática falhou (HTTP ${revokeResult.status}): ${revokeResult.error}`.slice(0, 2000),
        lastErrorAt: new Date().toISOString()
      };
      await prisma.request.update({
        where: { id: prior.id },
        data: { details: JSON.stringify(priorDetails), updatedAt: new Date() }
      });
    }
  }

  const updatedDetails: RootAccessDetails = {
    ...details0,
    jumpcloudAccessRequestId: createResult.accessRequestId,
    appliedAt: new Date().toISOString(),
    statusJc: 'APPLIED',
    expiryAt: expiryIso,
    previousJumpcloudAccessRequestId: prior?.jumpcloudAccessRequestId ?? null,
    rawAccessRequestResponse: createResult.rawResponse,
    lastError: null,
    lastErrorAt: null
  };

  await prisma.request.update({
    where: { id: requestId },
    data: { details: JSON.stringify(updatedDetails), updatedAt: new Date() }
  });

  const expBrt = formatRootAccessExpiryBrt(expiryIso);
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
            `✅ *Acesso Root aplicado*\n\n` +
              `Seu acesso root em \`${hostname}\` foi aprovado por *${deciderDisplayName}* e aplicado no JumpCloud.\n\n` +
              `⏰ *Expira em:* ${expBrt} (horário de Brasília)\n` +
              `⏱️ Pode levar até ~10 minutos para refletir no seu device.\n\n` +
              `Se precisar de mais tempo após expirar, abra um novo chamado com *\\/infra* → *Acesso Root*.`
          );
        }
      } catch (e) {
        console.error('[ROOT_ACCESS] DM ao solicitante (aprovar):', e);
      }
    }
  } catch (e) {
    console.error('[ROOT_ACCESS] Falha ao notificar solicitante (aprovar):', e);
  }

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

  return 'ok';
}

function slackApiErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'data' in err) {
    const d = (err as { data?: { error?: string } }).data;
    if (d && typeof d.error === 'string') return d.error;
  }
  return undefined;
}

async function chatUpdateDmMessage(client: WebClient, userId: string, ts: string, text: string, blocks?: unknown[]): Promise<void> {
  try {
    const open = await client.conversations.open({ users: userId });
    const channelId = open.channel?.id;
    if (!channelId) return;
    try {
      await client.chat.update({ channel: channelId, ts, text, ...(blocks ? { blocks: blocks as any } : {}) });
    } catch (err: unknown) {
      if (slackApiErrorCode(err) === 'message_not_found') {
        console.warn(`[SI Slack] chat.update ignorado (DM não encontrada): ${userId} ${ts}`);
        return;
      }
      console.error('[SI Slack] chat.update falhou', userId, ts, err);
    }
  } catch (e) {
    console.error('[SI Slack] chat.update / conversations.open falhou', userId, ts, e);
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

function formatSiDecisionTimestampBrt(d?: Date | null): string {
  const x = d && !Number.isNaN(d.getTime()) ? d : new Date();
  return x.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export type RootAccessSiFinalizeKind =
  | { kind: 'reject' }
  | {
      kind: 'approve_applied';
      expiryIso: string;
      /** Menção Slack do solicitante (lookup por e-mail); se ausente, usa requesterNameFallback. */
      requesterSlackId?: string | null;
      requesterNameFallback?: string | null;
    }
  | { kind: 'approve_jc_failed'; failureSummary: string }
  | { kind: 'revalidate_rejected' };

/** Remove botões: atualiza post no canal SI (`siSlackRootChannelTs`) + cada DM em `siSlackMessageTs`. */
async function finalizeRootAccessSiInteractiveSurfaces(
  client: WebClient,
  requestId: string,
  opts: { actorSlackId: string } & RootAccessSiFinalizeKind
): Promise<void> {
  const row = await prisma.request.findUnique({
    where: { id: requestId },
    select: { siSlackRootChannelTs: true, siSlackMessageTs: true, details: true, siApprovedAt: true }
  });
  if (!row) return;

  const details = parseRootAccessDetails(row.details);
  const hostname = details?.hostname ?? '—';
  const ttlLine = details != null ? `${details.ttlQuantidade} ${details.ttlUnidade.toLowerCase()}` : '—';
  const when = formatSiDecisionTimestampBrt(row.siApprovedAt);

  let emoji: string;
  let title: string;
  let mrkdwn: string;
  let plain: string;

  if (opts.kind === 'reject') {
    emoji = '❌';
    title = 'Acesso Root reprovado';
    mrkdwn =
      `${emoji} *${title}*\n` +
      `*Reprovado por* <@${opts.actorSlackId}> *em* ${when}\n` +
      `*Device:* \`${hostname}\`\n` +
      `*TTL (solicitado):* ${ttlLine}`;
    plain = `${emoji} ${title} — Reprovado em ${when} · ${hostname}`;
  } else if (opts.kind === 'revalidate_rejected') {
    emoji = '⚠️';
    title = 'Acesso Root — revalidação JumpCloud falhou';
    mrkdwn =
      `${emoji} *${title}*\n` +
      `*Registrado por* <@${opts.actorSlackId}> *em* ${when}\n` +
      `*Device:* \`${hostname}\`\n` +
      `O pedido foi *rejeitado automaticamente* porque o vínculo usuário/device no JumpCloud não coincide mais com o envio original.`;
    plain = `${emoji} ${title} — ${when} · ${hostname}`;
  } else if (opts.kind === 'approve_jc_failed') {
    emoji = '⚠️';
    title = 'Acesso Root — falha ao aplicar no JumpCloud';
    mrkdwn =
      `${emoji} *${title}*\n` +
      `*Aprovado por* <@${opts.actorSlackId}> *em* ${when}\n` +
      `*Device:* \`${hostname}\`\n` +
      `*TTL (solicitado):* ${ttlLine}\n` +
      `*Detalhe:* ${opts.failureSummary}\n` +
      `_Ação manual necessária no JumpCloud._`;
    plain = `${emoji} ${title} — ${when} · ${hostname}`;
  } else {
    emoji = '✅';
    title = 'Acesso Root aplicado';
    const expBrt = formatRootAccessExpiryBrt(opts.expiryIso);
    const reqSid = opts.requesterSlackId?.trim();
    const solicitadoPor =
      reqSid && reqSid.length > 0
        ? `*Solicitado por:* <@${reqSid}>`
        : `*Solicitado por:* ${(opts.requesterNameFallback ?? '—').trim() || '—'}`;
    mrkdwn =
      `${emoji} *${title}*\n` +
      `${solicitadoPor}\n` +
      `*Aplicado por:* <@${opts.actorSlackId}> *em* ${when}\n` +
      `*Device:* \`${hostname}\`\n` +
      `*TTL (solicitado):* ${ttlLine}\n` +
      `*Expira em:* ${expBrt} (BRT)`;
    plain = `${emoji} ${title} — ${when} · ${hostname} · expira ${expBrt}`;
  }

  const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: mrkdwn } }];

  const siCh = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  if (siCh && row.siSlackRootChannelTs) {
    try {
      await client.chat.update({
        channel: siCh,
        ts: row.siSlackRootChannelTs,
        text: plain,
        blocks: blocks as never
      });
    } catch (e) {
      console.error('[ROOT_ACCESS] chat.update canal SI (final):', e);
    }
  }

  for (const r of parseSiRefs(row.siSlackMessageTs as unknown)) {
    await chatUpdateDmMessage(client, r.userId, r.ts, plain, blocks);
  }
}

/** Atualiza post no canal SI + DMs SI após revogação no JumpCloud (sem alterar o Prisma — o caller limpa `siSlack*`). */
export async function finalizeRootAccessSlackMessagesForRevoke(opts: {
  siSlackRootChannelTs: string | null | undefined;
  siSlackMessageTs: unknown;
  hostname: string;
  trigger: 'CRON_EXPIRED' | 'ADMIN_EARLY';
  reason?: string | null;
  actorLabel: string;
}): Promise<void> {
  const { getSlackApp } = await import('./slackService');
  const app = getSlackApp();
  if (!app?.client) return;
  const client = app.client;
  const triggerLine =
    opts.trigger === 'ADMIN_EARLY'
      ? `*Revogação:* antecipada (${opts.actorLabel}).`
      : `*Revogação:* expiração atingida (automático).`;
  const reasonLine = opts.reason?.trim() ? `*Motivo registrado:* ${opts.reason.trim()}\n` : '';
  const emoji = '🔕';
  const title = 'Acesso Root encerrado';
  const mrkdwn =
    `${emoji} *${title}*\n` +
    `${triggerLine}\n` +
    reasonLine +
    `*Device:* \`${opts.hostname}\`\n` +
    `_O sudo temporário foi revogado no JumpCloud._`;
  const plain = `${emoji} ${title} — ${opts.hostname}`;

  const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: mrkdwn } }];

  const siCh = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  if (siCh && opts.siSlackRootChannelTs) {
    try {
      await client.chat.update({
        channel: siCh,
        ts: opts.siSlackRootChannelTs,
        text: plain,
        blocks: blocks as never
      });
    } catch (e) {
      console.error('[ROOT_ACCESS] chat.update canal SI (revoke):', e);
    }
  }

  for (const r of parseSiRefs(opts.siSlackMessageTs as unknown)) {
    await chatUpdateDmMessage(client, r.userId, r.ts, plain, blocks);
  }
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
      const r = await approveRootAccessViaSlack(requestId, actorSlackId, therisApproverId, deciderName);
      if (r === 'bad_status') return;
      if (r === 'race') {
        await params.respond?.({
          response_type: 'ephemeral',
          text: `Este chamado já foi tratado por ${await resolveSlackDisplayName(params.client, req.siApprovedBy || '')}.`
        });
        return;
      }
      if (r === 'revalidation_failed') {
        await finalizeRootAccessSiInteractiveSurfaces(params.client, requestId, {
          kind: 'revalidate_rejected',
          actorSlackId
        });
        await updateActorSiDmConfirmed(
          params.client,
          actorSlackId,
          actorTs,
          `⚠️ Chamado #${requestId.slice(0, 8)} encerrado automaticamente (JumpCloud).`
        );
        await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
          approved: false,
          deciderName,
          kind: 'root'
        });
        await params.respond?.({
          response_type: 'ephemeral',
          text: 'O pedido foi encerrado automaticamente (validação JumpCloud). O solicitante foi notificado.'
        });
        return;
      }
      if (r === 'jc_create_failed') {
        await finalizeRootAccessSiInteractiveSurfaces(params.client, requestId, {
          kind: 'approve_jc_failed',
          actorSlackId,
          failureSummary: 'Falha ao criar access request no JumpCloud (ver detalhes no Theris).'
        });
        await updateActorSiDmConfirmed(
          params.client,
          actorSlackId,
          actorTs,
          `⚠️ Aprovação registrada, mas a aplicação no JumpCloud falhou. O solicitante e o canal SI foram alertados.`
        );
        await refreshPeerSiDmsAfterDecision(params.client, refs, actorSlackId, {
          approved: true,
          deciderName,
          kind: 'root'
        });
        await params.respond?.({
          response_type: 'ephemeral',
          text: 'Aprovação registrada, mas o JumpCloud retornou erro ao aplicar sudo. Verifique o canal SI.'
        });
        return;
      }
      if (r !== 'ok') return;
      const rowAfter = await prisma.request.findUnique({
        where: { id: requestId },
        select: { details: true }
      });
      const dAfter = parseRootAccessDetails(rowAfter?.details ?? null);
      const expiryIso = dAfter?.expiryAt ?? '';
      let requesterSlackId: string | null = null;
      if (req.requester?.email) {
        try {
          const lu = await params.client.users.lookupByEmail({ email: req.requester.email });
          requesterSlackId = lu.user?.id ?? null;
        } catch (_) {
          requesterSlackId = null;
        }
      }
      await finalizeRootAccessSiInteractiveSurfaces(params.client, requestId, {
        kind: 'approve_applied',
        actorSlackId,
        expiryIso,
        requesterSlackId,
        requesterNameFallback: req.requester?.name ?? null
      });
      await updateActorSiDmConfirmed(
        params.client,
        actorSlackId,
        actorTs,
        `✅ Você aprovou o Acesso Root #${requestId.slice(0, 8)}. JumpCloud: aplicado.`
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
      await finalizeRootAccessSiInteractiveSurfaces(params.client, requestId, {
        kind: 'reject',
        actorSlackId
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
