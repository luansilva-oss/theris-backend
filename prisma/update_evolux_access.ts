
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const evoluxData = {
    name: "Evolux",
    accesses: [
        // Tenant_support Group
        { email: "pedro.nascimento@grupo-3c.com", level: "Tenant_support Group" },
        { email: "gabriel.ida@grupo-3c.com", level: "Tenant_support Group" },
        { email: "guilherme.ferreira@grupo-3c.com", level: "Tenant_support Group" },
        { email: "emily.godoy@grupo-3c.com", level: "Tenant_support Group" },
        { email: "luis.paganini@grupo-3c.com", level: "Tenant_support Group" },
        { email: "deborah.peres@grupo-3c.com", level: "Tenant_support Group" },
        { email: "jaqueline.souza@grupo-3c.com", level: "Tenant_support Group" },

        // Developers Group
        { email: "gabriel.machado@grupo-3c.com", level: "Developers Group" },
        { email: "taissa.almeida@grupo-3c.com", level: "Developers Group" },
        { email: "eduardo.wosiak@grupo-3c.com", level: "Developers Group" },
        { email: "daniel.souza@grupo-3c.com", level: "Developers Group" },
        { email: "joao.vasconcelos@grupo-3c.com", level: "Developers Group" },
        { email: "fernando.mosquer@grupo-3c.com", level: "Developers Group" },
        { email: "carlos.marques@grupo-3c.com", level: "Developers Group" },
        { email: "italo.rossi@grupo-3c.com", level: "Developers Group" },
        { email: "mathaus.alves@grupo-3c.com", level: "Developers Group" },
        { email: "bruno.levy@grupo-3c.com", level: "Developers Group" },
        { email: "jehnnifer.padilha@grupo-3c.com", level: "Developers Group" },
        { email: "wesley.vale@grupo-3c.com", level: "Developers Group" },
        { email: "diogo@grupo-3c.com", level: "Developers Group" }, // diogo hartmann
        { email: "alexander.reis@grupo-3c.com", level: "Developers Group" },
        { email: "alan.armstrong@grupo-3c.com", level: "Developers Group" },
        { email: "sergio.filipe@grupo-3c.com", level: "Developers Group" },
        // { email: "sergio.filipe@evolux.net.br", level: "Developers Group" }, // Keeping just group email if user exists, usually user has 1 email in system.
        { email: "ovidio.farias@grupo-3c.com", level: "Developers Group" },

        // Support Group
        { email: "junior.andrade@grupo-3c.com", level: "Support Group" },
        { email: "allan.vonstein@grupo-3c.com", level: "Support Group" }
    ]
};

async function main() {
    console.log('🚀 Atualizando ferramenta Evolux...');

    // 1. Encontrar a ferramenta
    const tool = await prisma.tool.findFirst({
        where: { name: { contains: "Evolux", mode: "insensitive" } }
    });

    if (!tool) {
        console.error('❌ Ferramenta Evolux não encontrada!');
        return;
    }

    console.log(`✅ Ferramenta encontrada: ${tool.name} (ID: ${tool.id})`);

    // 2. Limpar acessos existentes
    await prisma.access.deleteMany({
        where: { toolId: tool.id }
    });
    console.log('🗑️ Acessos antigos removidos.');

    // 3. Cadastrar novos níveis se não existirem (como string no availableAccessLevels)
    const currentLevels = tool.availableAccessLevels || [];
    const newLevels = ["Tenant_support Group", "Developers Group", "Support Group"];
    const updatedLevels = Array.from(new Set([...currentLevels, ...newLevels]));

    await prisma.tool.update({
        where: { id: tool.id },
        data: {
            availableAccessLevels: updatedLevels
        }
    });

    // 4. Inserir acessos
    for (const item of evoluxData.accesses) {
        // Achar usuário pelo email
        const user = await prisma.user.findFirst({
            where: { email: { equals: item.email, mode: "insensitive" } }
        });

        if (user) {
            await prisma.access.create({
                data: {
                    toolId: tool.id,
                    userId: user.id,
                    status: item.level,
                    isExtraordinary: false
                }
            });
            console.log(`   + Acesso adicionado: ${user.name} -> ${item.level}`);
        } else {
            console.warn(`   ⚠️ Usuário não encontrado: ${item.email}`);
        }
    }

    console.log('🏁 Atualização da Evolux concluída!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
