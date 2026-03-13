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
  d.setMinutes(d.getMinutes() - 10); // janela inicial: últimos 10 min
  return d.toISOString();
}

export function startJumpCloudPasswordCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('🕐 [Cron] Executando monitoramento JumpCloud Password Manager...');
      try {
        const startTime = (await getLastProcessedEventTimestamp()) || getDefaultStartTime();
        const events = await fetchPasswordManagerEvents(startTime);
        let maxTimestamp = startTime;

        for (const event of events) {
          const eventId = event.id ?? (event as any)._id;
          if (!eventId) continue;

          if (await isEventAlreadyProcessed(eventId)) continue;
          const inserted = await recordEventIfNew(event);
          if (!inserted) continue;

          await notifyPasswordEventToSlack(event);

          const ts = event.timestamp ?? (event as any).timestamp_iso;
          if (ts) {
            const tsStr = new Date(ts).toISOString();
            if (tsStr > maxTimestamp) maxTimestamp = tsStr;
          }
        }

        if (events.length > 0 && maxTimestamp !== startTime) {
          await setLastProcessedEventTimestamp(maxTimestamp);
        }
        console.log('✅ [Cron] JumpCloud Password Manager: processados', events.length, 'eventos.');
      } catch (e) {
        console.error('[JumpCloud] Erro no cron Password Manager (não derruba o servidor):', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Cron JumpCloud Password Manager agendado: a cada 5 minutos');
}
