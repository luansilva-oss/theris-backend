/**
 * Cron job: todos os dias às 09:00, busca usuários que atingiram 90 dias
 * desde lastPasswordChangeAt e envia DM no Slack lembrando de trocar senhas.
 */
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendPasswordReminderDM } from '../services/passwordReminderSlack';

const prisma = new PrismaClient();

const CRON_SCHEDULE = '0 9 * * *'; // 09:00 todos os dias (horário do servidor)
const DAYS_THRESHOLD = 90;

export function startPasswordReminderCron() {
  cron.schedule(CRON_SCHEDULE, async () => {
    console.log('🕐 [Cron] Executando job de lembrete de senha (90 dias)...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thresholdDate = new Date(today);
      thresholdDate.setDate(thresholdDate.getDate() - DAYS_THRESHOLD);

      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { lastPasswordChangeAt: { lte: thresholdDate } },
            { lastPasswordChangeAt: null },
          ],
          email: { not: null },
        },
        include: {
          accesses: {
            include: { tool: true },
          },
        },
      });

      if (users.length === 0) {
        console.log('   Nenhum usuário no ciclo de 90 dias.');
        return;
      }

      console.log(`   ${users.length} usuário(s) para notificar.`);
      for (const user of users) {
        const toolNames = [...new Set(user.accesses.map(a => a.tool?.name).filter(Boolean))] as string[];
        const result = await sendPasswordReminderDM({
          userEmail: user.email,
          userName: user.name,
          toolNames: toolNames.length > 0 ? toolNames : undefined,
        });
        if (result.ok) {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastPasswordChangeAt: new Date() },
          });
        }
      }
      console.log('✅ [Cron] Lembrete de senha concluído.');
    } catch (e) {
      console.error('❌ [Cron] Erro no job de lembrete de senha:', e);
    }
  });
  console.log(`📅 Cron de lembrete de senha (90 dias) agendado: todos os dias às 09:00`);
}
