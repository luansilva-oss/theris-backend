import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Limpando todos os usuários...');
    // Apaga todos os usuários (O Cascade deve apagar as relações se configurado, ou apaga por ordem)
    await prisma.access.deleteMany({});
    await prisma.request.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('✅ Banco limpo com sucesso.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());