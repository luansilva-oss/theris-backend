/**
 * Aprovação do time de SI via Slack (AEX e Onboarding Contratação).
 * Mantém ts das DMs em Request.siSlackMessageTs para chat.update após decisão.
 */
import type { WebClient } from '@slack/web-api';
import { prisma } from '../lib/prisma';
import {
  approveAexViaSlack,
  approveHiringViaSlack,
  rejectAexViaSlack,
  rejectHiringViaSlack
} from '../controllers/solicitacaoController';

export type SiDmRef = { userId: string; ts: string };

function getSiSlackIdsFromEnv(): string[] {
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

export function getSiRecipientSlackIdsForOnboarding(): string[] {
  return getSiSlackIdsFromEnv();
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

export async function sendSiTeamOnboardingApprovalDms(client: WebClient, requestId: string, summary: string): Promise<void> {
  const recipients = getSiRecipientSlackIdsForOnboarding();
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
  opts: { approved: boolean; deciderName: string; kind: 'aex' | 'onboarding' }
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
  const isAex =
    req.type === 'ACCESS_TOOL_EXTRA' ||
    (['ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'].includes(req.type) && req.isExtraordinary);

  if (!isHiring && !isAex) return;

  const allowed =
    isHiring ? getSiRecipientSlackIdsForOnboarding() : getSiRecipientSlackIdsForAex(req.ownerApprovedBy ?? undefined);
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
