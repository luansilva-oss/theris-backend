/**
 * Cron: marca ROOT_ACCESS aplicados como expirados em `details.statusJc` e avisa o solicitante (DM Slack).
 * A cada 5 minutos (America/Sao_Paulo), alinhado ao Password Manager.
 */
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import type { RootAccessDetails } from '../types/rootAccess';
import { REQUEST_TYPES } from '../types/requestTypes';
import { revokeAccessRequest } from '../services/accessRequestRevoke';

const CRON_SCHEDULE = '*/5 * * * *';

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

    const r = await revokeAccessRequest({ requestId: req.id, trigger: 'CRON_EXPIRED' });
    if (r.ok === false) {
      console.warn(`[Cron ROOT_ACCESS expiry] Revogação não aplicada ${req.id}:`, r.error);
      continue;
    }

    console.info(`[Cron ROOT_ACCESS expiry] Request ${req.id} revogado (JumpCloud + Theris)`);
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
