import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Iniciando limpeza de duplicatas...');

    const users = await prisma.user.findMany();
    const placeholders = users.filter(u => u.jobTitle === 'Não mapeado');
    const realUsers = users.filter(u => u.jobTitle !== 'Não mapeado');

    console.log(`📊 Encontrados ${placeholders.length} placeholders e ${realUsers.length} usuários reais.`);

    let deletedCount = 0;

    for (const placeholder of placeholders) {
        const prefix = placeholder.email.split('@')[0];

        // Procura um usuário real que tenha o mesmo prefixo parcial no email
        // Ex: alana.gaspar (placeholder) vs alana.maiumy.gaspar (real)
        const match = realUsers.find(real => {
            const realPrefix = real.email.split('@')[0];
            // Verifica se o prefixo do placeholder está contido no real ou vice-versa
            // Ou se eles compartilham os mesmos componentes básicos
            const placeholderParts = prefix.split('.');
            const realParts = realPrefix.split('.');

            // Se as partes principais (primeira e última) batem, é provável que seja o mesmo
            const firstMatch = placeholderParts[0] === realParts[0];
            const lastMatch = placeholderParts[placeholderParts.length - 1] === realParts[realParts.length - 1];

            return firstMatch && lastMatch;
        });

        if (match) {
            console.log(`🗑️ Removendo duplicata: ${placeholder.email} -> Corresponde a ${match.email}`);

            // Antes de deletar, precisamos mover os acessos do placeholder para o usuário real
            await prisma.access.updateMany({
                where: { userId: placeholder.id },
                data: { userId: match.id }
            });

            // Mover solicitações também
            await prisma.request.updateMany({
                where: { requesterId: placeholder.id },
                data: { requesterId: match.id }
            });

            await prisma.user.delete({ where: { id: placeholder.id } });
            deletedCount++;
        }
    }

    console.log(`✅ Limpeza concluída. ${deletedCount} usuários duplicados removidos.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
