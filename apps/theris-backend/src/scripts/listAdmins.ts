/**
 * Lista usuários com perfil SUPER_ADMIN e ADMIN (consulta direta no banco).
 * Uso: npx tsx src/scripts/listAdmins.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { systemProfile: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    select: { name: true, email: true, systemProfile: true },
    orderBy: [{ systemProfile: 'desc' }, { name: 'asc' }],
  });

  console.log('--- SUPER_ADMIN ---');
  const superAdmins = users.filter((u) => u.systemProfile === 'SUPER_ADMIN');
  if (superAdmins.length === 0) console.log('(nenhum)');
  else superAdmins.forEach((u) => console.log(`  ${u.name} | ${u.email}`));

  console.log('');
  console.log('--- ADMIN ---');
  const admins = users.filter((u) => u.systemProfile === 'ADMIN');
  if (admins.length === 0) console.log('(nenhum)');
  else admins.forEach((u) => console.log(`  ${u.name} | ${u.email}`));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
