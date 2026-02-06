import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Iniciando varredura agressiva de duplicatas...');

    const allUsers = await prisma.user.findMany({
        include: { accesses: true, toolsOwned: true, toolsSubOwned: true }
    });

    // Agrupa por e-mail normalizado (lowercase)
    const emailGroups = new Map<string, typeof allUsers>();

    for (const u of allUsers) {
        const email = u.email.trim().toLowerCase();
        if (!emailGroups.has(email)) {
            emailGroups.set(email, []);
        }
        emailGroups.get(email)?.push(u);
    }

    let mergedCount = 0;

    for (const [email, group] of emailGroups.entries()) {
        if (group.length > 1) {
            console.log(`⚠️ Encontrados ${group.length} registros para ${email}:`);

            // 1. Eleger o "Principal" (o que tem mais acessos ou mais ferramentas ou o mais antigo)
            // Score based prioritization
            group.sort((a, b) => {
                const scoreA = a.accesses.length * 10 + a.toolsOwned.length * 5 + (a.jobTitle !== 'Não mapeado' ? 2 : 0);
                const scoreB = b.accesses.length * 10 + b.toolsOwned.length * 5 + (b.jobTitle !== 'Não mapeado' ? 2 : 0);
                return scoreB - scoreA; // Maior score primeiro
            });

            const winner = group[0];
            const losers = group.slice(1);

            console.log(`   👑 Principal: ${winner.name} (${winner.id}) - Acessos: ${winner.accesses.length}`);

            for (const loser of losers) {
                console.log(`   🗑️ Mesclando e removendo: ${loser.name} (${loser.id}) - Acessos: ${loser.accesses.length}`);

                // Move relations
                try {
                    // Update Accesses
                    await prisma.access.updateMany({
                        where: { userId: loser.id },
                        data: { userId: winner.id }
                    });

                    // Update Requests
                    await prisma.request.updateMany({
                        where: { requesterId: loser.id },
                        data: { requesterId: winner.id }
                    });

                    // Update Tools Owned
                    await prisma.tool.updateMany({
                        where: { ownerId: loser.id },
                        data: { ownerId: winner.id }
                    });

                    // Update Tools SubOwned
                    await prisma.tool.updateMany({
                        where: { subOwnerId: loser.id },
                        data: { subOwnerId: winner.id }
                    });

                    // Update User Manager Relation (if any subordinate points to loser)
                    await prisma.user.updateMany({
                        where: { managerId: loser.id },
                        data: { managerId: winner.id }
                    });

                    // Finally delete loser
                    await prisma.user.delete({ where: { id: loser.id } });
                    mergedCount++;
                } catch (e) {
                    console.error(`   ❌ Falha ao mesclar ${loser.email}:`, e);
                }
            }
        }
    }

    console.log(`✅ Limpeza concluída. ${mergedCount} duplicatas fundidas/removidas.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
