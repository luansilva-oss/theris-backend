/**
 * Expiração automática de Acessos Extraordinários (Theris + JumpCloud ap_*).
 * Diariamente às 08:00 America/Sao_Paulo — ver startExpireExtraordinaryAccessCron().
 */
import cron from 'node-cron';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { registrarMudanca } from '../lib/auditLog';
import { getSlackApp, sendDmToSlackUser, formatTimestampBrt } from '../services/slackService';
import { getSystemUserIdByEmail } from '../services/jumpcloudService';
import { revokeExtraordinaryAccessOnJumpCloud } from '../services/jumpcloudGroupSyncService';

const CRON_SCHEDULE = '0 8 * * *'; // 08:00 todos os dias (America/Sao_Paulo)

type ExpiredAccessRow = Prisma.AccessGetPayload<{
  include: { user: true; tool: true };
}>;

type JcOutcome = 'ok' | 'fail' | 'skip';

async function runJumpCloudRevokeForRow(email: string, toolCode: string | null | undefined): Promise<JcOutcome> {
  const code = (toolCode || '').trim();
  if (!code || !/^ap_/i.test(code)) return 'skip';
  const jcId = await getSystemUserIdByEmail(email);
  if (!jcId) return 'fail';
  try {
    await revokeExtraordinaryAccessOnJumpCloud(jcId, code);
    return 'ok';
  } catch (e) {
    console.error('[expireExtraordinaryAccess] Falha ao revogar no JumpCloud:', email, code, e);
    return 'fail';
  }
}

export async function expireExtraordinaryAccess(): Promise<void> {
  const now = new Date();
  const channelId = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  const dateBrt = formatTimestampBrt(now);

  let rows: ExpiredAccessRow[] = [];
  try {
    rows = await prisma.access.findMany({
      where: {
        isExtraordinary: true,
        expiresAt: { not: null, lte: now },
        status: { not: 'REVOKED' }
      },
      include: {
        user: true,
        tool: true
      }
    });
  } catch (e) {
    console.error('[expireExtraordinaryAccess] Falha ao listar acessos expirados:', e);
    return;
  }

  const jcPromises: Promise<JcOutcome>[] = [];
  const listLines: string[] = [];
  let jcOk = 0;
  let jcFail = 0;

  const app = getSlackApp();

  for (const row of rows) {
    const toolName = row.tool?.name ?? 'Ferramenta';
    const userEmail = row.user?.email;
    const expiresAt = row.expiresAt;

    try {
      await prisma.access.update({
        where: { id: row.id },
        data: { status: 'REVOKED' }
      });
    } catch (e) {
      console.error('[expireExtraordinaryAccess] Falha ao atualizar Access', row.id, e);
      continue;
    }

    if (expiresAt && userEmail) {
      const expiresBrt = formatTimestampBrt(expiresAt);
      const dmText =
        `🔒 Seu acesso extraordinário à ferramenta *${toolName}* expirou em ${expiresBrt} BRT.\n` +
        `Se precisar de novo acesso, abra uma solicitação via /acessos.`;
      if (app?.client) {
        try {
          const lookup = await app.client.users.lookupByEmail({ email: userEmail });
          const slackId = lookup.user?.id;
          if (slackId) {
            await sendDmToSlackUser(app.client, slackId, dmText);
          }
        } catch (e) {
          console.warn('[expireExtraordinaryAccess] DM Slack não enviado:', userEmail, e);
        }
      }
    }

    await registrarMudanca({
      tipo: 'AEX_EXPIRED',
      entidadeTipo: 'Access',
      entidadeId: row.id,
      descricao: `Acesso extraordinário expirado automaticamente: ${toolName}`,
      dadosAntes: {
        userId: row.userId,
        toolId: row.toolId,
        status: row.status,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        isExtraordinary: row.isExtraordinary
      },
      dadosDepois: { status: 'REVOKED' }
    }).catch((e) => console.warn('[expireExtraordinaryAccess] Auditoria:', row.id, e));

    const email = row.user?.email ?? '';
    jcPromises.push(runJumpCloudRevokeForRow(email, row.tool?.acronym));

    listLines.push(`• ${row.user?.name ?? '—'} (${email || '—'}) — ${toolName}`);
  }

  const jcOutcomes = await Promise.all(jcPromises);
  for (const o of jcOutcomes) {
    if (o === 'ok') jcOk += 1;
    else if (o === 'fail') jcFail += 1;
  }

  const n = rows.length;
  if (!channelId) {
    console.warn('[expireExtraordinaryAccess] SLACK_SI_CHANNEL_ID não definido; resumo não enviado.');
    console.log(
      `[expireExtraordinaryAccess] ${dateBrt} · Total: ${n} · JumpCloud OK: ${jcOk} · Falhas: ${jcFail}`
    );
    return;
  }

  if (!app?.client) {
    console.warn('[expireExtraordinaryAccess] Slack app indisponível; resumo não enviado.');
    return;
  }

  const listBlock =
    listLines.length > 0 ? listLines.join('\n') : '_Nenhum registro processado nesta execução._';

  const text =
    `🕐 *Expiração de Acessos Extraordinários* · ${dateBrt}\n` +
    `Total expirados: ${n}\n` +
    `Removidos do JumpCloud: ${jcOk} · Falhas: ${jcFail}\n` +
    listBlock;

  try {
    await app.client.chat.postMessage({
      channel: channelId,
      text,
      mrkdwn: true
    });
    console.log(`[expireExtraordinaryAccess] Resumo enviado ao canal SI (${n} expirado(s)).`);
  } catch (e) {
    console.error('[expireExtraordinaryAccess] Falha ao postar resumo no Slack:', e);
  }
}

export function startExpireExtraordinaryAccessCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('🕐 [Cron] Expiração de acessos extraordinários...');
      try {
        await expireExtraordinaryAccess();
        console.log('✅ [Cron] Expiração de AEX concluída.');
      } catch (e) {
        console.error('❌ [Cron] Erro na expiração de AEX:', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Expiração de Acessos Extraordinários: diariamente às 08:00 (Brasília)');
}
