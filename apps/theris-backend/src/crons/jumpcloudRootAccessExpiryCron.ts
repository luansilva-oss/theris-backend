/**
 * Cron: marca ROOT_ACCESS aplicados como expirados em `details.statusJc` e avisa o solicitante (DM Slack).
 * A cada 5 minutos (America/Sao_Paulo), alinhado ao Password Manager.
 */
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import type { RootAccessDetails } from '../types/rootAccess';
import { REQUEST_TYPES } from '../types/requestTypes';
import { getSlackApp, sendDmToSlackUser } from '../services/slackService';

const CRON_SCHEDULE = '*/5 * * * *';

function formatExpiryBrt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function parseDetails(raw: string | null): RootAccessDetails | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RootAccessDetails;
  } catch {
    return null;
  }
}

async function processExpiredRootAccess(): Promise<void> {
  const nowMs = Date.now();

  const candidates = await prisma.request.findMany({
    where: {
      type: REQUEST_TYPES.ROOT_ACCESS,
      status: { in: ['APROVADO', 'APPROVED'] }
    },
    include: { requester: { select: { email: true, name: true } } }
  });

  for (const req of candidates) {
    const details = parseDetails(req.details);
    if (!details) continue;
    if (details.statusJc !== 'APPLIED') continue;
    const expMs = new Date(details.expiryAt).getTime();
    if (!Number.isFinite(expMs) || expMs > nowMs) continue;

    const updatedDetails: RootAccessDetails = {
      ...details,
      statusJc: 'EXPIRED'
    };

    await prisma.request.update({
      where: { id: req.id },
      data: { details: JSON.stringify(updatedDetails), updatedAt: new Date() }
    });

    const email = req.requester?.email?.trim();
    if (email) {
      try {
        const app = getSlackApp();
        if (app?.client) {
          const lu = await app.client.users.lookupByEmail({ email });
          const sid = lu.user?.id;
          if (sid) {
            const when = formatExpiryBrt(details.expiryAt);
            await sendDmToSlackUser(
              app.client,
              sid,
              `⌛ *Acesso Root expirado*\n\n` +
                `Seu acesso root em \`${details.hostname}\` expirou em *${when}* (horário de Brasília).\n\n` +
                `Se precisar de mais tempo, abra um novo chamado com *\\/infra* → *Acesso Root*.`
            );
          }
        }
      } catch (e) {
        console.error(`[Cron ROOT_ACCESS expiry] DM falhou para ${email}:`, e);
      }
    }

    console.info(`[Cron ROOT_ACCESS expiry] Request ${req.id} marcado como EXPIRED`);
  }
}

export function startJumpCloudRootAccessExpiryCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      try {
        await processExpiredRootAccess();
      } catch (err) {
        console.error('[Cron ROOT_ACCESS expiry] erro global:', err);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Cron ROOT_ACCESS expiração agendado: a cada 5 minutos (Brasília)');
}
