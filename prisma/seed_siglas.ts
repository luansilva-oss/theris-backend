/**
 * Atualiza as siglas (acronym) das ferramentas no Catálogo conforme a tabela oficial.
 * Não apaga dados existentes; apenas atualiza o campo acronym.
 * Uso: npx ts-node prisma/seed_siglas.ts  ou  npm run seed:siglas
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Sigla correta → nomes possíveis da ferramenta (match case-insensitive) */
const SIGLAS: { acronym: string; nameMatches: string[] }[] = [
  { acronym: 'AE', nameMatches: ['Evolux', 'Aplicação Evolux'] },
  { acronym: 'AS', nameMatches: ['AWS'] },
  { acronym: 'CG', nameMatches: ['ChatGPT', 'Chat GPT'] },
  { acronym: 'CK', nameMatches: ['ClickUp'] },
  { acronym: 'CP', nameMatches: ['3C PLUS', '3C Plus', 'Aplicação da 3C'] },
  { acronym: 'CS', nameMatches: ['ClickSign', 'Clicsign', 'Click Sign'] },
  { acronym: 'CV', nameMatches: ['Convenia'] },
  { acronym: 'DZ', nameMatches: ['Dizify'] },
  { acronym: 'FG', nameMatches: ['Figma'] },
  { acronym: 'FQ', nameMatches: ['FiqOn'] },
  { acronym: 'FU', nameMatches: ['Focus'] },
  { acronym: 'GC', nameMatches: ['GCP', 'Google Cloud'] },
  { acronym: 'GL', nameMatches: ['GitLab', 'Gitlab'] },
  { acronym: 'HC', nameMatches: ['Hik-Connect', 'Hik Connect'] },
  { acronym: 'HS', nameMatches: ['HubSpot'] },
  { acronym: 'JC', nameMatches: ['JumpCloud'] },
  { acronym: 'MT', nameMatches: ['META', 'Meta'] },
  { acronym: 'NA', nameMatches: ['n8n', 'N8N'] },
  { acronym: 'OR', nameMatches: ['Oracle', 'Next Suit'] },
  { acronym: 'RR', nameMatches: ['Router', 'Next Router', 'NextRouter'] },
  { acronym: 'VI', nameMatches: ['Vindi'] },
];

async function main() {
  let updated = 0;
  for (const { acronym, nameMatches } of SIGLAS) {
    for (const name of nameMatches) {
      const tools = await prisma.tool.findMany({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { name: { contains: name, mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, acronym: true }
      });
      for (const tool of tools) {
        if (tool.acronym !== acronym) {
          await prisma.tool.update({
            where: { id: tool.id },
            data: { acronym }
          });
          console.log(`  ${tool.name} → sigla atualizada para "${acronym}"`);
          updated++;
        }
      }
    }
  }
  console.log(`\n✅ Seed siglas concluído. ${updated} ferramenta(s) atualizada(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
