/**
 * Recertificação de AEX: notificação ao Owner/colaborador ao atingir min(createdAt+90d, expiresAt);
 * após 2 dias sem ação, revoga ap_* no JumpCloud e marca REVOKED.
 * Diariamente às 07:30 America/Sao_Paulo — ver startRecertifyExtraordinaryAccessCron().
 */
import cron from 'node-cron';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { registrarMudanca } from '../lib/auditLog';
import { getSlackApp, sendDmToSlackUser, formatTimestampBrt } from '../services/slackService';
import { getSystemUserIdByEmail } from '../services/jumpcloudService';
import { revokeExtraordinaryAccessOnJumpCloud } from '../services/jumpcloudGroupSyncService';

const CRON_SCHEDULE = '30 7 * * *'; // 07:30 todos os dias (America/Sao_Paulo)
const MS_PER_DAY = 86400000;
const MS_90_DAYS = 90 * MS_PER_DAY;

type RecertAccessRow = Prisma.AccessGetPayload<{
  include: {
    user: true;
    tool: { include: { owner: { select: { id: true; email: true; name: true } } } };
  };
}>;

/** Data limite para exigir recertificação: o menor entre createdAt+90d e expiresAt (se houver). */
function effectiveRecertificationDueAt(createdAt: Date, expiresAt: Date | null): Date {
  const end90 = new Date(createdAt.getTime() + MS_90_DAYS);
  if (!expiresAt) return end90;
  return expiresAt.getTime() < end90.getTime() ? expiresAt : end90;
}

function fireRecertOwnerDm(
  collaboratorName: string,
  toolName: string,
  toolCode: string,
  createdAtBrt: string,
  deadlineBrt: string,
  ownerEmail: string | null | undefined
): void {
  const app = getSlackApp();
  if (!app?.client || !ownerEmail?.trim()) {
    console.warn('[recertifyExtraordinaryAccess] Owner sem e-mail Slack; DM omitida:', toolName);
    return;
  }
  const client = app.client;
  void (async () => {
    try {
      const lu = await client.users.lookupByEmail({ email: ownerEmail.trim() });
      const sid = lu.user?.id;
      if (!sid) {
        console.warn('[recertifyExtraordinaryAccess] Owner não encontrado no Slack:', ownerEmail);
        return;
      }
      const plain = `⚠️ Recertificação AEX: ${collaboratorName} — ${toolName} (${toolCode})`;
      const blocks: Record<string, unknown>[] = [
        {
          type: 'header',
          text: { type: 'plain_text', text: '⚠️ Recertificação de Acesso Extraordinário', emoji: true }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `O colaborador *${collaboratorName}* possui acesso extraordinário à ferramenta\n` +
              `*${toolName}* (\`${toolCode}\`) sob sua responsabilidade há 90 dias ou mais.\n\n` +
              `Este acesso precisa ser *revogado manualmente* por você diretamente\n` +
              `no sistema *${toolName}*.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📅 Acesso concedido em: ${createdAtBrt}\n⏰ Prazo para revogação: *${deadlineBrt}*`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text:
                '⚠️ Caso o acesso não seja revogado no sistema até o prazo,\n' +
                'o Theris removerá automaticamente o acesso do grupo JumpCloud em 2 dias.\n' +
                'Para manter o acesso, um novo chamado de AEX deve ser aberto.'
            }
          ]
        }
      ];
      await sendDmToSlackUser(client, sid, plain, blocks as any);
    } catch (e) {
      console.error('[recertifyExtraordinaryAccess] DM Owner recert:', e);
    }
  })();
}

function fireRecertCollaboratorDm(userEmail: string | undefined, toolName: string): void {
  const app = getSlackApp();
  if (!app?.client || !userEmail?.trim()) return;
  const client = app.client;
  void (async () => {
    try {
      const lu = await client.users.lookupByEmail({ email: userEmail.trim() });
      const sid = lu.user?.id;
      if (!sid) return;
      const plain = `🔒 Seu AEX em ${toolName} atingiu o período máximo.`;
      const blocks: Record<string, unknown>[] = [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🔒 Seu acesso extraordinário atingiu o período máximo', emoji: true }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `Seu acesso extraordinário à ferramenta *${toolName}* atingiu o período\n` +
              `máximo de 90 dias e será encerrado em breve.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Caso precise continuar utilizando esta ferramenta, abra um novo chamado\nvia */acessos* no Slack.'
          }
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: 'O acesso será removido automaticamente em 2 dias caso não seja renovado.' }
          ]
        }
      ];
      await sendDmToSlackUser(client, sid, plain, blocks as any);
    } catch (e) {
      console.error('[recertifyExtraordinaryAccess] DM colaborador recert:', e);
    }
  })();
}

function fireRevokeOwnerDm(collaboratorName: string, toolName: string, ownerEmail: string | null | undefined): void {
  const app = getSlackApp();
  if (!app?.client || !ownerEmail?.trim()) return;
  const client = app.client;
  void (async () => {
    try {
      const lu = await client.users.lookupByEmail({ email: ownerEmail.trim() });
      const sid = lu.user?.id;
      if (!sid) return;
      const plain = `🔴 JumpCloud: AEX de ${collaboratorName} em ${toolName} removido automaticamente.`;
      const blocks: Record<string, unknown>[] = [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🔴 Acesso JumpCloud removido automaticamente', emoji: true }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `O prazo de 2 dias para revogação manual do acesso de *${collaboratorName}*\n` +
              `à ferramenta *${toolName}* foi encerrado.\n` +
              `O Theris removeu o acesso do grupo JumpCloud automaticamente.`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `⚠️ Certifique-se de que o acesso também foi revogado diretamente\nno sistema *${toolName}*.`
            }
          ]
        }
      ];
      await sendDmToSlackUser(client, sid, plain, blocks as any);
    } catch (e) {
      console.error('[recertifyExtraordinaryAccess] DM Owner pós-revogação:', e);
    }
  })();
}

function fireRevokeCollaboratorDm(userEmail: string | undefined, toolName: string): void {
  const app = getSlackApp();
  if (!app?.client || !userEmail?.trim()) return;
  const client = app.client;
  void (async () => {
    try {
      const lu = await client.users.lookupByEmail({ email: userEmail.trim() });
      const sid = lu.user?.id;
      if (!sid) return;
      const plain = `🔒 Acesso extraordinário encerrado: ${toolName}`;
      const blocks: Record<string, unknown>[] = [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🔒 Acesso extraordinário encerrado', emoji: true }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `Seu acesso extraordinário à ferramenta *${toolName}* foi encerrado.\n` +
              `Caso precise de novo acesso, abra um chamado via */acessos*.`
          }
        }
      ];
      await sendDmToSlackUser(client, sid, plain, blocks as any);
    } catch (e) {
      console.error('[recertifyExtraordinaryAccess] DM colaborador pós-revogação:', e);
    }
  })();
}

function scheduleJcRevoke(email: string, acronym: string | null | undefined): void {
  const code = (acronym || '').trim();
  if (!code || !/^ap_/i.test(code)) return;
  void (async () => {
    try {
      const jcId = await getSystemUserIdByEmail(email);
      if (jcId) await revokeExtraordinaryAccessOnJumpCloud(jcId, code);
    } catch (e) {
      console.error('[recertifyExtraordinaryAccess] JumpCloud revoke:', email, code, e);
    }
  })();
}

export async function recertifyExtraordinaryAccess(): Promise<void> {
  const now = new Date();
  const channelId = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  const dateBrt = formatTimestampBrt(now);
  const deadlinePlus2Brt = formatTimestampBrt(new Date(now.getTime() + 2 * MS_PER_DAY));
  const twoDaysAgo = new Date(now.getTime() - 2 * MS_PER_DAY);

  const notifiedLines: string[] = [];
  const revokedLines: string[] = [];
  let nNotified = 0;
  let nRevoked = 0;

  let pool: RecertAccessRow[] = [];
  try {
    pool = await prisma.access.findMany({
      where: {
        isExtraordinary: true,
        status: { not: 'REVOKED' }
      },
      include: {
        user: true,
        tool: { include: { owner: { select: { id: true, email: true, name: true } } } }
      }
    });
  } catch (e) {
    console.error('[recertifyExtraordinaryAccess] Falha ao listar Access:', e);
    return;
  }

  // --- PASSO A ---
  const stepA = pool.filter(
    (r) =>
      r.recertificationNotifiedAt == null &&
      effectiveRecertificationDueAt(r.createdAt, r.expiresAt).getTime() <= now.getTime()
  );

  for (const row of stepA) {
    const toolName = row.tool?.name ?? 'Ferramenta';
    const toolCode = (row.tool?.acronym || '').trim() || '—';
    const collabName = row.user?.name ?? '—';
    const createdAtBrt = formatTimestampBrt(row.createdAt);
    const ownerEmail = row.tool?.owner?.email;
    const ownerName = row.tool?.owner?.name ?? '—';

    try {
      await prisma.access.update({
        where: { id: row.id },
        data: { recertificationNotifiedAt: now }
      });
    } catch (e) {
      console.error('[recertifyExtraordinaryAccess] Falha ao marcar recertificationNotifiedAt:', row.id, e);
      continue;
    }

    nNotified += 1;
    notifiedLines.push(
      `• ${collabName} → *${toolName}* → Owner: ${ownerName} → prazo *${deadlinePlus2Brt}*`
    );

    fireRecertOwnerDm(collabName, toolName, toolCode, createdAtBrt, deadlinePlus2Brt, ownerEmail);
    fireRecertCollaboratorDm(row.user?.email, toolName);
  }

  // --- PASSO B ---
  let stepB: RecertAccessRow[] = [];
  try {
    stepB = await prisma.access.findMany({
      where: {
        isExtraordinary: true,
        status: { not: 'REVOKED' },
        recertificationNotifiedAt: { not: null, lte: twoDaysAgo }
      },
      include: {
        user: true,
        tool: { include: { owner: { select: { id: true, email: true, name: true } } } }
      }
    });
  } catch (e) {
    console.error('[recertifyExtraordinaryAccess] Falha ao listar PASSO B:', e);
    stepB = [];
  }

  const revokedAtBrt = formatTimestampBrt(now);
  for (const row of stepB) {
    const toolName = row.tool?.name ?? 'Ferramenta';
    const collabName = row.user?.name ?? '—';
    const ownerEmail = row.tool?.owner?.email;

    try {
      await prisma.access.update({
        where: { id: row.id },
        data: { status: 'REVOKED' }
      });
    } catch (e) {
      console.error('[recertifyExtraordinaryAccess] Falha REVOKED:', row.id, e);
      continue;
    }

    await registrarMudanca({
      tipo: 'AEX_RECERTIFICATION_REVOKED',
      entidadeTipo: 'Access',
      entidadeId: row.id,
      descricao: `AEX revogado por recertificação (prazo 2 dias): ${toolName} — ${collabName}`,
      dadosAntes: {
        userId: row.userId,
        toolId: row.toolId,
        status: row.status,
        recertificationNotifiedAt: row.recertificationNotifiedAt?.toISOString() ?? null,
        isExtraordinary: row.isExtraordinary
      },
      dadosDepois: { status: 'REVOKED' }
    }).catch((err) => console.warn('[recertifyExtraordinaryAccess] Auditoria:', row.id, err));

    scheduleJcRevoke(row.user?.email ?? '', row.tool?.acronym);
    fireRevokeOwnerDm(collabName, toolName, ownerEmail);
    fireRevokeCollaboratorDm(row.user?.email, toolName);

    nRevoked += 1;
    revokedLines.push(`• ${collabName} → *${toolName}* → revogado em ${revokedAtBrt}`);
  }

  // --- PASSO C: SI ---
  const app = getSlackApp();
  if (!channelId || !app?.client) {
    console.warn('[recertifyExtraordinaryAccess] SI channel ou Slack indisponível; resumo apenas em log.');
    console.log(
      `[recertifyExtraordinaryAccess] ${dateBrt} · Notificados: ${nNotified} · Revogados: ${nRevoked}`
    );
    return;
  }

  try {
    if (nNotified === 0 && nRevoked === 0) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `✅ Nenhum acesso extraordinário pendente de recertificação. · ${dateBrt} BRT`
      });
      return;
    }

    const blocks: Record<string, unknown>[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🔄 Recertificação de Acessos Extraordinários · ${dateBrt}`, emoji: true }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Notificados hoje (aguardando revogação manual):* ${nNotified}\n` +
            (notifiedLines.length ? notifiedLines.join('\n') : '_Nenhum._')
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Revogados automaticamente (prazo expirado):* ${nRevoked}\n` +
            (revokedLines.length ? revokedLines.join('\n') : '_Nenhum._')
        }
      }
    ];

    await app.client.chat.postMessage({
      channel: channelId,
      text: `🔄 Recertificação AEX · Notificados: ${nNotified} · Revogados: ${nRevoked} · ${dateBrt}`,
      blocks: blocks as any,
      mrkdwn: true
    });
  } catch (e) {
    console.error('[recertifyExtraordinaryAccess] Falha resumo SI:', e);
  }
}

export function startRecertifyExtraordinaryAccessCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('🕐 [Cron] Recertificação de acessos extraordinários...');
      try {
        await recertifyExtraordinaryAccess();
        console.log('✅ [Cron] Recertificação AEX concluída.');
      } catch (e) {
        console.error('❌ [Cron] Erro na recertificação AEX:', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Recertificação de AEX: diariamente às 07:30 (Brasília)');
}
