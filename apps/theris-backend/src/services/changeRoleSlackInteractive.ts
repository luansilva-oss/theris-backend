/**
 * Superfícies Slack SI para CHANGE_ROLE (canal SI + DMs), espelhando ROOT_ACCESS.
 */
import type { WebClient } from '@slack/web-api';
import type { Request } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { clearSiSlackTrackingFields } from '../slack/siSlackTracking';

export type SiDmRef = { userId: string; ts: string };

function parseSiRefs(raw: unknown): SiDmRef[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter((x: unknown) => {
    const o = x as { userId?: unknown; ts?: unknown };
    return o && typeof o.userId === 'string' && typeof o.ts === 'string';
  }) as SiDmRef[];
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
    ...(blocks ? { blocks: blocks as never } : {})
  });
  if (!pm.ts) throw new Error('postMessage sem ts');
  return { ts: pm.ts };
}

function changeRoleSiBlocks(params: {
  requestId: string;
  collaboratorName: string;
  cargoAtual: string;
  cargoNovo: string;
  kbsAtual: string;
  kbsNovo: string;
  justificativa: string;
}): unknown[] {
  const shortId = params.requestId.slice(0, 8);
  const j = (params.justificativa || '(não informada)').replace(/\n/g, '\n> ');
  const body =
    `🔄 *Mudança de Cargo — aprovação SI (#${shortId})*\n\n` +
    `*Colaborador:* ${params.collaboratorName}\n` +
    `*Cargo atual:* ${params.cargoAtual}\n` +
    `*Novo cargo:* ${params.cargoNovo}\n` +
    `*KBS atual:* \`${params.kbsAtual}\`\n` +
    `*KBS novo:* \`${params.kbsNovo}\`\n` +
    `*Justificativa:*\n>${j}\n\n` +
    `Avalie o chamado:`;
  return [
    { type: 'section', text: { type: 'mrkdwn', text: body } },
    {
      type: 'actions',
      block_id: 'change_role_si_decision',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Aprovar', emoji: true },
          action_id: 'aex_si_approve_v2',
          value: `approve_${params.requestId}`,
          style: 'primary'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '❌ Recusar', emoji: true },
          action_id: 'aex_si_reject_v2',
          value: `reject_${params.requestId}`
        }
      ]
    }
  ];
}

export async function sendSiTeamChangeRoleApprovalSurfaces(
  client: WebClient,
  request: Request & { requester?: { name: string | null } | null }
): Promise<void> {
  let d: Record<string, unknown> = {};
  try {
    d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details as object) || {};
  } catch {
    d = {};
  }
  const collaboratorName = String(d.collaboratorName || d.info || '—').replace(/^[^:]+:\s*/, '') || '—';
  const cur = (d.current as { role?: string; dept?: string }) || {};
  const fut = (d.future as { role?: string; dept?: string }) || {};
  const cargoAtual = String(cur.role || '—');
  const cargoNovo = String(fut.role || '—');
  let kbsAtual = '—';
  let kbsNovo = '—';
  try {
    const oldId = (d as { oldRoleId?: string }).oldRoleId?.trim();
    const newId = ((d.newRoleId as string) || (fut as { roleId?: string }).roleId || '').trim();
    const collabId = ((d.collaboratorId || d.targetUserId) as string | undefined)?.trim();
    if (oldId) {
      const r = await prisma.role.findUnique({ where: { id: oldId }, select: { code: true } });
      kbsAtual = (r?.code || 'sem código').trim() || 'sem código';
    } else if (collabId) {
      const u = await prisma.user.findUnique({ where: { id: collabId }, select: { roleId: true } });
      if (u?.roleId) {
        const r = await prisma.role.findUnique({ where: { id: u.roleId }, select: { code: true } });
        kbsAtual = (r?.code || 'sem código').trim() || 'sem código';
      }
    }
    if (newId) {
      const r = await prisma.role.findUnique({ where: { id: newId }, select: { code: true } });
      kbsNovo = (r?.code || 'sem código').trim() || 'sem código';
    }
  } catch {
    /* best-effort labels */
  }
  const justificativa = String(request.justification || (d.reason as string) || '');

  const blocks = changeRoleSiBlocks({
    requestId: request.id,
    collaboratorName,
    cargoAtual,
    cargoNovo,
    kbsAtual,
    kbsNovo,
    justificativa
  });

  const channelId = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  const plain = `Mudança de Cargo — #${request.id.slice(0, 8)} — ${collaboratorName}`;

  let channelTs: string | undefined;
  if (channelId) {
    try {
      const pm = await client.chat.postMessage({
        channel: channelId,
        text: plain,
        blocks: blocks as never
      });
      channelTs = pm.ts ?? undefined;
    } catch (e) {
      console.error('[CHANGE_ROLE] Falha ao postar no canal SI:', e);
    }
  }

  const recipients = [
    process.env.SLACK_USER_LUAN || process.env.SLACK_ID_LUAN,
    process.env.SLACK_USER_VLADIMIR || process.env.SLACK_ID_VLADIMIR,
    process.env.SLACK_USER_ALLAN || process.env.SLACK_ID_ALLAN
  ]
    .map((s) => (s || '').trim())
    .filter(Boolean);
  const siRecipients = [...new Set(recipients)];
  const refs: SiDmRef[] = [];
  for (const uid of siRecipients) {
    try {
      const { ts } = await openDmPostReturnTs(client, uid, plain, blocks);
      refs.push({ userId: uid, ts });
    } catch (e) {
      console.error('[CHANGE_ROLE] Falha DM SI para', uid, e);
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

function slackApiErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'data' in err) {
    const di = (err as { data?: { error?: string } }).data;
    if (di && typeof di.error === 'string') return di.error;
  }
  return undefined;
}

async function chatUpdateDmMessage(
  client: WebClient,
  userId: string,
  ts: string,
  text: string,
  blocks?: unknown[]
): Promise<void> {
  try {
    const open = await client.conversations.open({ users: userId });
    const channelId = open.channel?.id;
    if (!channelId) return;
    try {
      await client.chat.update({ channel: channelId, ts, text, ...(blocks ? { blocks: blocks as never } : {}) });
    } catch (err: unknown) {
      if (slackApiErrorCode(err) === 'message_not_found') {
        console.warn(
          JSON.stringify({
            event: 'change_role.si_dm.chat_update_skipped',
            reason: 'message_not_found',
            userId,
            ts
          })
        );
        return;
      }
      console.error('[CHANGE_ROLE] chat.update DM falhou', userId, ts, err);
    }
  } catch (e) {
    console.error('[CHANGE_ROLE] conversations.open/chat.update', userId, ts, e);
  }
}

export type ChangeRoleSiFinalizeKind =
  | { kind: 'reject'; actorSlackId: string }
  | {
      kind: 'approve';
      actorSlackId: string;
      collaboratorName: string;
      cargoAtual: string;
      cargoNovo: string;
      ownersNotified: number;
    }
  | { kind: 'approve_automation_failed'; actorSlackId: string; collaboratorName: string; detail: string };

// Cleanup de siSlack* sempre roda (try/finally), mesmo se chat.update
// falhar — evita ts órfãos que virariam message_not_found em crons.
/** Atualiza post no canal SI + DMs SI (remove botões), como finalizeRootAccessSiInteractiveSurfaces. */
export async function finalizeChangeRoleSiInteractiveSurfaces(
  client: WebClient,
  requestId: string,
  opts: ChangeRoleSiFinalizeKind
): Promise<void> {
  const row = await prisma.request.findUnique({
    where: { id: requestId },
    select: { siSlackRootChannelTs: true, siSlackMessageTs: true, siApprovedAt: true }
  });
  if (!row) {
    console.warn(JSON.stringify({ event: 'change_role.finalize_skipped', requestId, reason: 'request_not_found' }));
    return;
  }

  const siCh = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  const dmRefsEarly = parseSiRefs(row.siSlackMessageTs as unknown);
  if (!(siCh && row.siSlackRootChannelTs) && dmRefsEarly.length === 0) {
    await clearSiSlackTrackingFields(requestId);
    return;
  }

  const when = formatSiDecisionTimestampBrt(row.siApprovedAt);
  let mrkdwn: string;
  let plain: string;

  if (opts.kind === 'reject') {
    mrkdwn =
      `❌ *Mudança de Cargo reprovada*\n` +
      `*Reprovado por* <@${opts.actorSlackId}> *em* ${when}\n` +
      `*Chamado:* #${requestId.slice(0, 8)}`;
    plain = `Mudança de Cargo reprovada — #${requestId.slice(0, 8)}`;
  } else if (opts.kind === 'approve_automation_failed') {
    mrkdwn =
      `⚠️ *Mudança de cargo — aprovação SI sem aplicação automática*\n` +
      `*Registrado por* <@${opts.actorSlackId}> *em* ${when}\n` +
      `*Colaborador:* ${opts.collaboratorName}\n` +
      `*Detalhe:* ${opts.detail}\n` +
      `_Revise o chamado e os dados no Theris._`;
    plain = `Mudança de cargo — falha na automação — #${requestId.slice(0, 8)}`;
  } else {
    mrkdwn =
      `✅ *Mudança de Cargo concluída*\n` +
      `*Colaborador:* ${opts.collaboratorName}\n` +
      `*${opts.cargoAtual}* → *${opts.cargoNovo}*\n` +
      `*Aprovado por* <@${opts.actorSlackId}> *em* ${when}\n` +
      `*Owners notificados:* ${opts.ownersNotified}`;
    plain =
      `Mudança de Cargo concluída — ${opts.collaboratorName}: ${opts.cargoAtual} → ${opts.cargoNovo} · SI · owners ${opts.ownersNotified}`;
  }

  const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: mrkdwn } }];

  try {
    if (siCh && row.siSlackRootChannelTs) {
      await client.chat.update({
        channel: siCh,
        ts: row.siSlackRootChannelTs,
        text: plain,
        blocks: blocks as never
      });
    } else if (!row.siSlackRootChannelTs) {
      console.warn(JSON.stringify({ event: 'change_role.finalize_si_channel_ts_null', requestId }));
    }

    for (const r of parseSiRefs(row.siSlackMessageTs as unknown)) {
      await chatUpdateDmMessage(client, r.userId, r.ts, plain, blocks);
    }
  } catch (err: unknown) {
    console.warn(
      JSON.stringify({
        event: 'slack.finalize.partial_failure',
        requestType: 'CHANGE_ROLE',
        requestId,
        err: err instanceof Error ? err.message : String(err)
      })
    );
  } finally {
    await clearSiSlackTrackingFields(requestId);
  }
}
