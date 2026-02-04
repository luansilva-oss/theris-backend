import { PrismaClient } from '@prisma/client';

// Este arquivo existe apenas para satisfazer a chamada do script de deploy do Render
// O comando real deve ser `npx ts-node prisma/seed_full_database.ts`
// Mas como o ambiente parece estar chamando este arquivo, vamos redirecionar a execução.

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 [seed_tools.ts] Redirecionando para seed_full_database.ts...');

    // Vamos apenas rodar o script correto via child_process para garantir isolamento
    const { execSync } = require('child_process');
    try {
        execSync('npx ts-node prisma/seed_full_database.ts', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Erro ao executar seed_full_database.ts via seed_tools.ts', error);
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
