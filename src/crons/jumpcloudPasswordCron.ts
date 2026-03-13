/**
 * Cron: monitoramento do Password Manager (JumpCloud Directory Insights).
 * Roda a cada 5 minutos; notifica canal de segurança para eventos password_view / password_copy.
 * Deduplicação via JumpCloudEventLog; último timestamp em SystemConfig.
 */
import cron from 'node-cron';
import {
  getLastProcessedEventTimestamp,
  setLastProcessedEventTimestamp,
  fetchPasswordManagerEvents,
  isEventAlreadyProcessed,
  recordEventIfNew,
  notifyPasswordEventToSlack
} from '../services/jumpcloudService';

const CRON_SCHEDULE = '*/5 * * * *'; // a cada 5 minutos

function getDefaultStartTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - 60); // janela padrão: últimos 60 min (enquanto persistência não estiver estável)
  return d.toISOString();
}

export function startJumpCloudPasswordCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('🕐 [Cron] Executando monitoramento JumpCloud Password Manager...');
      try {
        const lastStored = await getLastProcessedEventTimestamp();
        const startTime = lastStored || getDefaultStartTime();
        if (!lastStored) console.log('[JumpCloud] Sem timestamp armazenado; usando janela padrão (últimos 60 min)');
        console.log('[JumpCloud] startTime usado:', startTime);
        const events = await fetchPasswordManagerEvents(startTime);
        console.log('[JumpCloud] Eventos recebidos para processamento:', events.length);
        let maxTimestamp = startTime;
        let slackSendCount = 0;

        for (const event of events) {
          const eventId = event.id ?? (event as any)._id;
          if (!eventId) continue;

          if (await isEventAlreadyProcessed(eventId)) continue;
          const inserted = await recordEventIfNew(event);
          if (!inserted) continue;

          slackSendCount++;
          console.log('[JumpCloud] Iniciando envio ao Slack para', slackSendCount, 'evento(s) (eventId:', eventId, ')');
          try {
            await notifyPasswordEventToSlack(event);
            console.log('[JumpCloud] Slack: envio concluído');
          } catch (err) {
            console.error('[JumpCloud] Erro ao enviar ao Slack:', err);
          }

          const ts = event.timestamp ?? (event as any).timestamp_iso;
          if (ts) {
            const tsStr = new Date(ts).toISOString();
            if (tsStr > maxTimestamp) maxTimestamp = tsStr;
          }
        }

        // Sempre persistir um timestamp ao final para a próxima execução (evita "Sem timestamp" em toda execução)
        const timestampToSave = events.length > 0 && maxTimestamp !== startTime ? maxTimestamp : new Date().toISOString();
        await setLastProcessedEventTimestamp(timestampToSave);
        console.log('✅ [Cron] JumpCloud Password Manager: processados', events.length, 'eventos.');
      } catch (e) {
        console.error('[JumpCloud] Erro no cron Password Manager (não derruba o servidor):', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Cron JumpCloud Password Manager agendado: a cada 5 minutos');
}
