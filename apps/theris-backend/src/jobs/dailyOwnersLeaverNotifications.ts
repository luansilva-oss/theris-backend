/**
 * Cron diário 17:00 America/Sao_Paulo: envia notificarOwnersDesligamento para Leavers
 * aprovados com ownersNotifiedAt null e último dia (BRT) já atingido.
 * Usa `details.leaverOwnerNotifySnapshot` persistido na aprovação (cargo já foi limpo no Theris).
 */
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import {
  extractLeaverScheduleDayYyyyMmDdFromDetails,
  isLeaverLastDayOnOrBeforeTodayBrt
} from '../utils/leaverOwnerNotificationSchedule';

const prisma = new PrismaClient();
const CRON_SCHEDULE = '0 17 * * *';

type LeaverOwnerNotifySnapshot = {
  kitItems: { toolName: string; accessLevelDesc: string | null }[];
  departmentName: string;
  unitName: string;
  jobTitle: string;
  collaboratorName: string;
};

export async function runDailyOwnersLeaverNotifications(): Promise<void> {
  console.log('[LeaverOwnersCron] Início.');
  let success = 0;
  let errors = 0;
  try {
    const candidates = await prisma.request.findMany({
      where: {
        type: 'FIRING',
        status: { in: ['APROVADO', 'APPROVED'] },
        ownersNotifiedAt: null
      },
      select: { id: true, details: true, actionDate: true }
    });

    const eligible = candidates.filter((row) => {
      let d: Record<string, unknown> = {};
      try {
        d = typeof row.details === 'string' ? JSON.parse(row.details || '{}') : ((row.details || {}) as Record<string, unknown>);
      } catch {
        return false;
      }
      const lastDayYmd = extractLeaverScheduleDayYyyyMmDdFromDetails(d, row.actionDate);
      return isLeaverLastDayOnOrBeforeTodayBrt(lastDayYmd);
    });

    console.log(`[LeaverOwnersCron] Candidatos: ${candidates.length}, elegíveis (último dia ≤ hoje BRT ou sem data): ${eligible.length}.`);

    const slack = await import('../services/slackService');
    const { registrarMudanca } = await import('../lib/auditLog');

    for (const row of eligible) {
      try {
        let d: Record<string, unknown> = {};
        try {
          d = typeof row.details === 'string' ? JSON.parse(row.details || '{}') : ((row.details || {}) as Record<string, unknown>);
        } catch {
          errors += 1;
          continue;
        }
        const snap = d.leaverOwnerNotifySnapshot as LeaverOwnerNotifySnapshot | undefined;
        const actionDateStr =
          row.actionDate instanceof Date
            ? row.actionDate.toISOString().slice(0, 10)
            : typeof row.actionDate === 'string'
              ? row.actionDate
              : null;

        if (snap && Array.isArray(snap.kitItems) && snap.kitItems.length > 0) {
          await slack.notificarOwnersDesligamento(
            row.id,
            snap.collaboratorName || '—',
            snap.jobTitle || '—',
            snap.departmentName || '—',
            snap.unitName || '—',
            snap.kitItems,
            actionDateStr
          );
        }

        await prisma.request.update({
          where: { id: row.id },
          data: { ownersNotifiedAt: new Date() }
        });

        const lastDayYmd = extractLeaverScheduleDayYyyyMmDdFromDetails(d, row.actionDate);
        await registrarMudanca({
          tipo: 'LEAVER_OWNERS_NOTIFIED_BY_CRON',
          entidadeTipo: 'Request',
          entidadeId: row.id,
          descricao: 'Notificação aos Owners do desligamento enviada pelo cron diário (17h BRT).',
          dadosDepois: {
            notifiedAt: new Date().toISOString(),
            scheduledLastDay: lastDayYmd
          }
        });
        success += 1;
      } catch (e) {
        errors += 1;
        console.error('[LeaverOwnersCron] Falha processando', row.id, e);
      }
    }
  } catch (e) {
    console.error('[LeaverOwnersCron] Erro geral:', e);
  }
  console.log(`[LeaverOwnersCron] Fim. Sucesso: ${success}, erros: ${errors}.`);
}

export function startDailyOwnersLeaverNotificationsCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      try {
        await runDailyOwnersLeaverNotifications();
      } catch (e) {
        console.error('[Cron] dailyOwnersLeaverNotifications:', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Cron notificação Owners (Leaver): diariamente às 17:00 (Brasília)');
}
