/**
 * Cron diário: onboarding HIRING aprovado cuja data de ação (BRT) é hoje —
 * lembretes no canal SLACK_ACESSOS_CHANNEL_ID para criação do usuário no Slack (fora do escopo JumpCloud/Google).
 */
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } from '../services/slackService';

export function startOnboardingSlackActionDateCron(): void {
  cron.schedule(
    '30 8 * * *',
    async () => {
      try {
        const app = getSlackApp();
        if (!app?.client) {
          console.log('[Cron] onboarding Slack actionDate: sem Slack app');
          return;
        }

        const dayStr = new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' });

        const candidates = await prisma.request.findMany({
          where: {
            type: 'HIRING',
            status: 'APROVADO',
            slackActionDateNotifiedAt: null,
            actionDate: { not: null }
          },
          select: { id: true, details: true, actionDate: true }
        });

        for (const r of candidates) {
          if (!r.actionDate) continue;
          const adStr = new Date(r.actionDate).toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' });
          if (adStr !== dayStr) continue;

          let nome = '—';
          let cargo = '—';
          let departamento = '—';
          let unidade = '—';
          let email = '—';
          try {
            const d = JSON.parse(r.details || '{}') as Record<string, unknown>;
            nome = String(d.collaboratorName || d.fullName || nome);
            cargo = String(d.role || cargo);
            departamento = String(d.department || d.dept || departamento);
            unidade = String(d.unit || unidade);
            email = String(d.corporateEmail || d.collaboratorEmail || d.email || email);
          } catch (_) {}

          const short = r.id.slice(0, 8);
          const body = `📅 *Ação manual necessária — Criação no Slack*

*Novo colaborador:* ${nome}
*Cargo:* ${cargo} | *Departamento:* ${departamento} | *Unidade:* ${unidade}
*E-mail corporativo:* ${email}
*Ticket:* #${short}

⚠️ A criação do usuário no Slack deve ser feita manualmente hoje.
Acesse slack.com/admin, crie o usuário com o e-mail acima e adicione
aos canais do seu departamento.

Após criar, registre no ticket via painel: https://theris.grupo-3c.com/tickets

· ${formatTimestampBrt()} BRT`;

          await postSlackAcessosChannel(app.client, body);

          await prisma.request.update({
            where: { id: r.id },
            data: { slackActionDateNotifiedAt: new Date() }
          });
        }
      } catch (e) {
        console.error('[Cron] onboardingSlackActionDate:', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('[Cron] Onboarding lembrete data-ação Slack: diário 08:30 BRT');
}
