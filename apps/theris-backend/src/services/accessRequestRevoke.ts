/**
 * Revogação unificada de ROOT_ACCESS no JumpCloud + persistência Theris (cron ou admin).
 */
import { prisma } from '../lib/prisma';
import { REQUEST_TYPES } from '../types/requestTypes';
import type { RootAccessDetails } from '../types/rootAccess';
import { revokeAccessRequest as jumpcloudRevokeAccessRequestById } from './jumpcloudAccessRequestService';
import { finalizeRootAccessSlackMessagesForRevoke } from './siSlackApprovalService';
import { getSlackApp, sendDmToSlackUser } from './slackService';

export type RevokeTherisTrigger = 'CRON_EXPIRED' | 'ADMIN_EARLY';

export type RevokeAccessRequestParams = {
  requestId: string;
  trigger: RevokeTherisTrigger;
  /** Obrigatório se trigger === ADMIN_EARLY */
  triggeredById?: string;
  /** Obrigatório se trigger === ADMIN_EARLY (validação HTTP com Zod) */
  reason?: string;
};

export type RevokeAccessRequestResult =
  | { ok: true; jcResponse?: unknown }
  | { ok: false; error: 'invalid_status' | 'wrong_type' | 'missing_access_request' | string };

function parseDetails(raw: string | null): RootAccessDetails | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RootAccessDetails;
  } catch {
    return null;
  }
}

async function dmUserAboutRevoke(email: string | undefined, text: string): Promise<void> {
  const e = email?.trim();
  if (!e) return;
  try {
    const app = getSlackApp();
    if (!app?.client) return;
    const lu = await app.client.users.lookupByEmail({ email: e });
    const sid = lu.user?.id;
    if (sid) await sendDmToSlackUser(app.client, sid, text);
  } catch (err) {
    console.error('[ROOT_ACCESS revoke] DM falhou:', email, err);
  }
}

export async function revokeAccessRequest(params: RevokeAccessRequestParams): Promise<RevokeAccessRequestResult> {
  const { requestId, trigger } = params;
  if (trigger === 'ADMIN_EARLY') {
    if (!params.triggeredById?.trim()) {
      return { ok: false, error: 'missing_triggered_by' };
    }
  }

  const row = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } }
    }
  });

  if (!row || row.type !== REQUEST_TYPES.ROOT_ACCESS) {
    return { ok: false, error: 'wrong_type' };
  }

  if (row.revokedAt != null || row.status === 'REVOKED') {
    return { ok: false, error: 'invalid_status' };
  }

  const st = (row.status || '').trim();
  if (st !== 'APROVADO' && st !== 'APPROVED') {
    return { ok: false, error: 'invalid_status' };
  }

  const details = parseDetails(row.details);
  if (!details || details.statusJc !== 'APPLIED') {
    return { ok: false, error: 'invalid_status' };
  }

  const jcId = details.jumpcloudAccessRequestId?.trim();
  if (!jcId) {
    return { ok: false, error: 'missing_access_request' };
  }

  const jc = await jumpcloudRevokeAccessRequestById(jcId);
  if (jc.ok === false) {
    console.error('[revokeAccessRequest] JumpCloud falhou', { requestId, jc });
    return { ok: false, error: jc.error || 'jc_revoke_failed' };
  }

  const updatedDetails: RootAccessDetails = {
    ...details,
    statusJc: 'EXPIRED'
  };

  const actorLabel =
    trigger === 'ADMIN_EARLY' && params.triggeredById
      ? (await prisma.user.findUnique({ where: { id: params.triggeredById }, select: { name: true } }))?.name?.trim() ||
        'Administrador'
      : 'Sistema (expiração)';

  await finalizeRootAccessSlackMessagesForRevoke({
    siSlackRootChannelTs: row.siSlackRootChannelTs,
    siSlackMessageTs: row.siSlackMessageTs,
    hostname: details.hostname || '—',
    trigger,
    reason: params.reason ?? null,
    actorLabel
  });

  const revokeEnum = trigger === 'CRON_EXPIRED' ? 'CRON_EXPIRED' : 'ADMIN_EARLY';

  await prisma.request.update({
    where: { id: requestId },
    data: {
      status: 'REVOKED',
      details: JSON.stringify(updatedDetails),
      revokedAt: new Date(),
      revokedById: trigger === 'ADMIN_EARLY' ? params.triggeredById!.trim() : null,
      revokeReason: trigger === 'ADMIN_EARLY' ? (params.reason ?? '').trim() || null : null,
      revokeTrigger: revokeEnum,
      siSlackRootChannelTs: null,
      siSlackMessageTs: null,
      updatedAt: new Date()
    }
  });

  const { registrarMudanca } = await import('../lib/auditLog');
  await registrarMudanca({
    tipo: 'ROOT_ACCESS_REVOKED',
    entidadeTipo: 'Request',
    entidadeId: requestId,
    descricao:
      trigger === 'ADMIN_EARLY'
        ? `Acesso root revogado antecipadamente (${details.hostname || requestId}).`
        : `Acesso root revogado após expiração (${details.hostname || requestId}).`,
    dadosAntes: { status: row.status },
    dadosDepois: {
      status: 'REVOKED',
      revokeTrigger: trigger,
      revokeReason: params.reason ?? null
    },
    autorId: trigger === 'ADMIN_EARLY' ? params.triggeredById : undefined
  }).catch((e) => console.error('[revokeAccessRequest] HistoricoMudanca:', e));

  const host = details.hostname || 'device';
  const reasonBlock =
    trigger === 'ADMIN_EARLY' && params.reason?.trim()
      ? `\n*Motivo informado pelo SI/admin:*\n${params.reason.trim()}\n`
      : '\n';
  const byLine =
    trigger === 'ADMIN_EARLY'
      ? `*Revogado por:* ${actorLabel}\n`
      : `*Encerramento:* expiração do TTL (automático)\n`;

  const dmCommon =
    `🔕 *Acesso Root encerrado*\n\n` +
    `O sudo temporário em \`${host}\` foi *revogado no JumpCloud*.\n\n` +
    byLine +
    reasonBlock +
    `_Pode levar alguns minutos para refletir no device._`;

  await dmUserAboutRevoke(row.requester?.email ?? undefined, dmCommon);

  if (row.approver?.email && row.approver.email !== row.requester?.email) {
    await dmUserAboutRevoke(row.approver.email, dmCommon);
  }

  return { ok: true, jcResponse: jc };
}
