/**
 * Cron: notificação de senha JumpCloud próxima de expirar.
 * Roda diariamente às 08:00; consulta usuários com senha expirando em 7 dias.
 * DM para cada usuário (se existir no Theris e no Slack); resumo no canal de segurança.
 * Prevenção de spam: SenhaExpiracaoNotificacao (máx 1x por dia por usuário).
 */
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import {
  fetchUsersWithPasswordExpiring,
  sendPasswordExpiryDm,
  sendPasswordExpirySummary,
  wasPasswordExpiryNotifiedToday,
  recordPasswordExpiryNotification
} from '../services/jumpcloudService';
import { getSlackApp } from '../services/slackService';

const prisma = new PrismaClient();
const CRON_SCHEDULE = '0 8 * * *'; // 08:00 todos os dias
const DAYS_AHEAD = 7;

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function startJumpCloudPasswordExpiryCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('🕐 [Cron] Executando aviso de expiração de senha JumpCloud...');
      try {
        const jcUsers = await fetchUsersWithPasswordExpiring(DAYS_AHEAD);
        if (jcUsers.length === 0) {
          console.log('[JumpCloud] Nenhum usuário com senha expirando nos próximos 7 dias.');
          return;
        }

        const slackApp = getSlackApp();
        const client = slackApp?.client;
        const summaryItems: { name: string; email: string; daysLeft: number }[] = [];

        for (const jc of jcUsers) {
          const email = (jc.email ?? jc.username ?? '').toString().trim();
          if (!email) continue;

          const expiryDate = jc.password_expiration_date
            ? new Date(jc.password_expiration_date)
            : new Date();
          const now = new Date();
          const daysLeft = daysBetween(now, expiryDate);
          if (daysLeft <= 0) continue;

          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true }
          });
          if (!user) {
            summaryItems.push({
              name: (jc.username ?? email).toString(),
              email,
              daysLeft
            });
            continue;
          }

          const alreadySent = await wasPasswordExpiryNotifiedToday(user.id);
          if (alreadySent) {
            summaryItems.push({ name: user.name, email, daysLeft });
            continue;
          }

          let slackUserId: string | null = null;
          if (client) {
            try {
              const lookup = await client.users.lookupByEmail({ email });
              slackUserId = lookup.user?.id ?? null;
            } catch (_) {}
          }

          if (slackUserId) {
            await sendPasswordExpiryDm(slackUserId, user.name, expiryDate, daysLeft);
            await recordPasswordExpiryNotification(user.id);
          }

          summaryItems.push({ name: user.name, email, daysLeft });
        }

        await sendPasswordExpirySummary(summaryItems);
        console.log('✅ [Cron] JumpCloud expiração de senha: processados', jcUsers.length, 'usuários.');
      } catch (e) {
        console.error('[JumpCloud] Erro no cron expiração de senha (não derruba o servidor):', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Cron JumpCloud expiração de senha agendado: todos os dias às 08:00 (Brasília)');
}
