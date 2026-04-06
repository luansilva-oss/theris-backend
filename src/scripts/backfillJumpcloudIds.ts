/**
 * Preenche User.jumpcloudId para colaboradores ativos @grupo-3c.com ainda sem ID no Theris.
 * Uso: npx tsx src/scripts/backfillJumpcloudIds.ts
 * Requer: DATABASE_URL, JUMPCLOUD_API_KEY
 */
import dotenv from 'dotenv';

dotenv.config();

import { PrismaClient } from '@prisma/client';
import { getSystemUserIdByEmail } from '../services/jumpcloudService';

const prisma = new PrismaClient();

const DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function backfillJumpcloudIds(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      jumpcloudId: null,
      isActive: true,
      email: { contains: '@grupo-3c.com', mode: 'insensitive' }
    },
    select: { id: true, email: true }
  });

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  console.log(`[BACKFILL] Início — ${users.length} usuário(s) candidatos.`);

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    try {
      const jumpcloudId = await getSystemUserIdByEmail(u.email);
      if (jumpcloudId) {
        await prisma.user.update({
          where: { id: u.id },
          data: { jumpcloudId }
        });
        updated += 1;
        console.info('[BACKFILL] Atualizado:', u.email, '→', jumpcloudId);
      } else {
        notFound += 1;
        console.warn('[BACKFILL] Não encontrado no JumpCloud:', u.email);
      }
    } catch (e) {
      errors += 1;
      console.error('[BACKFILL] Erro ao processar', u.email, e);
    }

    if (i < users.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(
    `[BACKFILL] Concluído — processados: ${users.length} · atualizados: ${updated} · não encontrados: ${notFound} · erros: ${errors}`
  );
}

async function main() {
  await backfillJumpcloudIds();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
