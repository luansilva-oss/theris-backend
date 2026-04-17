import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { enviarDm, enviarCanal, enviarDmTimeSI } from '../integrations/slackClient';

const prisma = new PrismaClient();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// CRON 1 — Alerta antecipado: 08h00 BRT (11h00 UTC), todo dia
export function startAlertaAntecipado(): void {
  cron.schedule('0 11 * * *', async () => {
    console.log('[SGSI CRON] Alerta antecipado — iniciando');
    const log = await prisma.sgsiCronLog.create({
      data: { cronName: 'alerta-antecipado', startedAt: new Date() },
    });

    try {
      const em7dias = addDays(new Date(), 7);
      const hoje = new Date();

      const acoes = await prisma.sgsiRecurringAction.findMany({
        where: {
          isActive: true,
          status: { in: ['SCHEDULED', 'DUE_SOON'] },
          nextDueAt: { gte: hoje, lte: em7dias },
          lastAlertSentAt: { lt: hoje },
        },
      });

      let alertsSent = 0;
      for (const acao of acoes) {
        const diasRestantes = Math.ceil(
          (acao.nextDueAt.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );
        const texto = `⚠️ *Ação SGSI vence em ${diasRestantes} dia(s)*\n\n*${acao.name}*\nFrequência: ${acao.frequency}\nVencimento: ${acao.nextDueAt.toLocaleDateString('pt-BR')}\n\nAcesse o SGSI Dashboard para registrar a conclusão.`;

        await enviarDm(acao.responsibleEmail, texto);
        await enviarDmTimeSI(texto);
        await prisma.sgsiRecurringAction.update({
          where: { id: acao.id },
          data: { status: 'DUE_SOON', lastAlertSentAt: new Date() },
        });
        alertsSent++;
      }

      await prisma.sgsiCronLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), success: true, actionsProcessed: acoes.length, alertsSent },
      });
      console.log(`[SGSI CRON] Alerta antecipado — ${alertsSent} alertas enviados`);
    } catch (err) {
      await prisma.sgsiCronLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), success: false, errorsCount: 1, errorDetails: { error: String(err) } },
      });
      console.error('[SGSI CRON] Alerta antecipado — erro:', err);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('📅 SGSI CRON alerta antecipado agendado: diário às 08h00 BRT');
}

// CRON 2 — Dia do vencimento: 08h30 BRT (11h30 UTC), todo dia
export function startDiaDoVencimento(): void {
  cron.schedule('30 11 * * *', async () => {
    console.log('[SGSI CRON] Dia do vencimento — iniciando');
    const log = await prisma.sgsiCronLog.create({
      data: { cronName: 'dia-do-vencimento', startedAt: new Date() },
    });

    try {
      const hoje = new Date();
      const amanha = addDays(hoje, 1);

      const acoes = await prisma.sgsiRecurringAction.findMany({
        where: {
          isActive: true,
          status: { in: ['SCHEDULED', 'DUE_SOON'] },
          nextDueAt: { gte: hoje, lt: amanha },
        },
      });

      let alertsSent = 0;
      for (const acao of acoes) {
        const texto = `🔔 *Ação SGSI vence hoje*\n\n*${acao.name}*\nResponsável: ${acao.responsibleEmail}\nFrequência: ${acao.frequency}`;

        await enviarDm(acao.responsibleEmail, texto);
        await enviarDmTimeSI(texto);
        await enviarCanal(texto);
        await prisma.sgsiRecurringAction.update({
          where: { id: acao.id },
          data: { status: 'IN_PROGRESS', lastDueSentAt: new Date() },
        });
        alertsSent++;
      }

      await prisma.sgsiCronLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), success: true, actionsProcessed: acoes.length, alertsSent },
      });
      console.log(`[SGSI CRON] Dia do vencimento — ${alertsSent} notificações enviadas`);
    } catch (err) {
      await prisma.sgsiCronLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), success: false, errorsCount: 1, errorDetails: { error: String(err) } },
      });
      console.error('[SGSI CRON] Dia do vencimento — erro:', err);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('📅 SGSI CRON dia do vencimento agendado: diário às 08h30 BRT');
}

// CRON 3 — Verificação de atrasos: 09h00 BRT (12h00 UTC), todo dia
export function startVerificacaoAtrasos(): void {
  cron.schedule('0 12 * * *', async () => {
    console.log('[SGSI CRON] Verificação de atrasos — iniciando');
    const log = await prisma.sgsiCronLog.create({
      data: { cronName: 'verificacao-atrasos', startedAt: new Date() },
    });

    try {
      const agora = new Date();

      const acoes = await prisma.sgsiRecurringAction.findMany({
        where: {
          isActive: true,
          status: { in: ['SCHEDULED', 'DUE_SOON', 'IN_PROGRESS'] },
          nextDueAt: { lt: agora },
        },
      });

      let alertsSent = 0;
      for (const acao of acoes) {
        const texto = `🚨 *Ação SGSI em atraso*\n\n*${acao.name}*\nVenceu em: ${acao.nextDueAt.toLocaleDateString('pt-BR')}\nResponsável: ${acao.responsibleEmail}\n\nPor favor, registre a conclusão ou justifique o atraso no SGSI Dashboard.`;

        await enviarDm(acao.responsibleEmail, texto);
        await enviarDmTimeSI(texto);
        await prisma.sgsiRecurringAction.update({
          where: { id: acao.id },
          data: { status: 'OVERDUE' },
        });
        alertsSent++;
      }

      await prisma.sgsiCronLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), success: true, actionsProcessed: acoes.length, alertsSent },
      });
      console.log(`[SGSI CRON] Verificação de atrasos — ${acoes.length} ações marcadas como OVERDUE`);
    } catch (err) {
      await prisma.sgsiCronLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), success: false, errorsCount: 1, errorDetails: { error: String(err) } },
      });
      console.error('[SGSI CRON] Verificação de atrasos — erro:', err);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('📅 SGSI CRON verificação de atrasos agendado: diário às 09h00 BRT');
}

// CRON 4 — Relatório semanal: 08h00 BRT, toda segunda-feira
export function startRelatorioSemanal(): void {
  cron.schedule('0 11 * * 1', async () => {
    console.log('[SGSI CRON] Relatório semanal — iniciando');
    const log = await prisma.sgsiCronLog.create({
      data: { cronName: 'relatorio-semanal', startedAt: new Date() },
    });

    try {
      const [emDia, proximas, atrasadas, mudancasAbertas] = await Promise.all([
        prisma.sgsiRecurringAction.count({ where: { isActive: true, status: 'SCHEDULED' } }),
        prisma.sgsiRecurringAction.count({ where: { isActive: true, status: 'DUE_SOON' } }),
        prisma.sgsiRecurringAction.count({ where: { isActive: true, status: 'OVERDUE' } }),
        prisma.sgsiChange.count({ where: { status: { in: ['OPEN', 'MEETING_SCHEDULED'] } } }),
      ]);

      const texto = `📊 *Relatório Semanal SGSI*\n\n✅ Em dia: *${emDia}*\n⚠️ Próximas do vencimento: *${proximas}*\n🚨 Atrasadas: *${atrasadas}*\n🔄 Mudanças urgentes abertas: *${mudancasAbertas}*\n\n_${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}_`;

      await enviarCanal(texto);
      await enviarDmTimeSI(texto);

      await prisma.sgsiCronLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), success: true, actionsProcessed: emDia + proximas + atrasadas, alertsSent: 1 },
      });
      console.log('[SGSI CRON] Relatório semanal enviado');
    } catch (err) {
      await prisma.sgsiCronLog.update({
        where: { id: log.id },
        data: { finishedAt: new Date(), success: false, errorsCount: 1, errorDetails: { error: String(err) } },
      });
      console.error('[SGSI CRON] Relatório semanal — erro:', err);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('📅 SGSI CRON relatório semanal agendado: segunda-feira às 08h00 BRT');
}

export function startAllCrons(): void {
  startAlertaAntecipado();
  startDiaDoVencimento();
  startVerificacaoAtrasos();
  startRelatorioSemanal();
}
