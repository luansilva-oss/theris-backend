/**
 * Cron: revisão periódica de acessos (90 dias). Roda diariamente às 09:00.
 * Notifica Owners no Slack; falha na notificação não derruba o servidor.
 */
import cron from 'node-cron';
import { runReviewAccessNotification } from '../services/reviewAccessService';

const CRON_SCHEDULE = '0 9 * * *'; // 09:00 todos os dias

export function startReviewAccessCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('🕐 [Cron] Executando revisão periódica de acessos (90 dias)...');
      try {
        await runReviewAccessNotification();
        console.log('✅ [Cron] Revisão de acessos concluída.');
      } catch (e) {
        console.error('❌ [Cron] Erro na revisão de acessos (não derruba o servidor):', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Cron de revisão de acessos (90 dias) agendado: todos os dias às 09:00 (Brasília)');
}
