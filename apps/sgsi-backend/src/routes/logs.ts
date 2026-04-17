import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /logs — retorna logs de cron + execuções de ações
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [cronLogs, occurrences] = await Promise.all([
      prisma.sgsiCronLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 200,
      }),
      prisma.sgsiOccurrence.findMany({
        orderBy: { executedAt: 'desc' },
        take: 200,
        include: { action: { select: { name: true } } },
      }),
    ]);

    const cronEntries = cronLogs.map(l => ({
      id: l.id,
      kind: 'cron' as const,
      label: cronLabel(l.cronName),
      detail: l.success
        ? `${l.alertsSent ?? 0} alertas enviados, ${l.actionsProcessed ?? 0} ações processadas`
        : `Erro: ${JSON.stringify(l.errorDetails)}`,
      success: l.success,
      timestamp: l.startedAt,
    }));

    const occurrenceEntries = occurrences.map(o => ({
      id: o.id,
      kind: 'execution' as const,
      label: `Ação concluída: ${o.action.name}`,
      detail: o.notes ?? '',
      success: true,
      timestamp: o.executedAt,
    }));

    const all = [...cronEntries, ...occurrenceEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 300);

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

function cronLabel(name: string): string {
  const map: Record<string, string> = {
    'alerta-antecipado': '⚠️ Slack: Alerta antecipado (7 dias)',
    'dia-do-vencimento': '🔔 Slack: Notificação dia do vencimento',
    'verificacao-atrasos': '🚨 Slack: Marcação de ações atrasadas',
    'relatorio-semanal': '📊 Slack: Relatório semanal enviado',
  };
  return map[name] ?? name;
}

export default router;
