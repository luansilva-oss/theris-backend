#!/usr/bin/env node
/**
 * Invalida todas as sessoes ativas se FORCE_SESSION_INVALIDATION=true.
 *
 * Roda entre `prisma migrate deploy` e `node dist/index.js` no buildCommand
 * do Render. Idempotente: pode rodar 1x ou 100x, resultado e o mesmo.
 *
 * Uso em deploys:
 *   Deploy de transicao (ex.: sabado 26/abr): FORCE_SESSION_INVALIDATION=true
 *   Proximos deploys:                          FORCE_SESSION_INVALIDATION=false
 *
 * Apos deploy com flag=true: deixe a var em false ou remova, pra nao
 * forcar logout em TODOS usuarios em cada deploy subsequente.
 *
 * Sem dependencias externas (usa somente @prisma/client ja instalado).
 *
 * Refs: refactor-auth bloco-9/16.
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
  const flag = (process.env.FORCE_SESSION_INVALIDATION || '').toLowerCase();
  if (flag !== 'true' && flag !== '1') {
    console.log('[invalidate-sessions] FORCE_SESSION_INVALIDATION nao ativo, pulando.');
    return;
  }

  const prisma = new PrismaClient();

  try {
    console.log('[invalidate-sessions] FORCE_SESSION_INVALIDATION=true — revogando sessoes...');

    // Usamos $executeRawUnsafe com TRUNCATE pra ser rapido e resetar indices.
    // As 3 tabelas nao tem FK pra tabelas sensiveis (so referenciam User via ON DELETE CASCADE).
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "MfaChallenge" RESTART IDENTITY CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "RefreshToken" RESTART IDENTITY CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Session" RESTART IDENTITY CASCADE');

    console.log('[invalidate-sessions] OK — Session, RefreshToken, MfaChallenge truncados.');
    console.log('[invalidate-sessions] ⚠️  Todos usuarios precisarao relogar no proximo acesso.');
  } catch (err) {
    console.error('[invalidate-sessions] FALHA:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[invalidate-sessions] Uncaught:', err);
  process.exit(1);
});
