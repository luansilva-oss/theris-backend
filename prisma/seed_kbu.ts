/**
 * Seed KBU (Kit Básico Universal): insere as ferramentas padrão se a tabela estiver vazia.
 * Executar após prisma db push ou migrate: npx ts-node prisma/seed_kbu.ts
 */
import { PrismaClient } from '@prisma/client';

const KBU_FERRAMENTAS = [
  'Ponto Mais',
  'Convenia',
  'Google Workspace',
  'Slack',
  'Simplybook',
  'ClickUp',
  'JumpCloud'
];

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.kBUFerramenta.count();
  if (count > 0) {
    console.log('🌱 Seed KBU — tabela já populada. Nada a fazer.');
    return;
  }
  for (const nome of KBU_FERRAMENTAS) {
    await prisma.kBUFerramenta.create({ data: { nome } });
  }
  console.log(`✅ Seed KBU — ${KBU_FERRAMENTAS.length} ferramentas criadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
