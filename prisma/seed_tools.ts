import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lista de Ferramentas e seus Donos (Emails devem bater com o Google ou seed_users)
const toolsList = [
    {
        name: "Google Workspace",
        ownerEmail: "vladimir.antonio.sesar@grupo-3c.com",
        ownerName: "Vladimir Antonio Sesar",
        subOwnerEmail: "luan.matheus.da.silva@grupo-3c.com",
        subOwnerName: "Luan Matheus da Silva"
    },
    {
        name: "Slack",
        ownerEmail: "vladimir.antonio.sesar@grupo-3c.com",
        ownerName: "Vladimir Antonio Sesar",
        subOwnerEmail: null,
        subOwnerName: null
    },
    {
        name: "Jira",
        ownerEmail: "guilherme.pimpao.cavalcante@grupo-3c.com",
        ownerName: "Guilherme Pimpão",
        subOwnerEmail: "gabriel.krysa@grupo-3c.com",
        subOwnerName: "Gabriel Krysa"
    },
    {
        name: "HubSpot",
        ownerEmail: "wagner.wolff.pretto@grupo-3c.com",
        ownerName: "Wagner Wolff Pretto",
        subOwnerEmail: "rafael.blaka.schimanski@grupo-3c.com",
        subOwnerName: "Rafael Blaka"
    },
    {
        name: "GitHub",
        ownerEmail: "diogo.henrique.hartmann@grupo-3c.com",
        ownerName: "Diogo Hartmann",
        subOwnerEmail: "carlos.henrique.marques@grupo-3c.com",
        subOwnerName: "Carlos Marques"
    },
    {
        name: "AWS",
        ownerEmail: "diogo.henrique.hartmann@grupo-3c.com",
        ownerName: "Diogo Hartmann",
        subOwnerEmail: "allan.von.stein.portela@grupo-3c.com",
        subOwnerName: "Allan Portela"
    },
    {
        name: "Notion",
        ownerEmail: "lucas.limberger@grupo-3c.com",
        ownerName: "Lucas Limberger",
        subOwnerEmail: null,
        subOwnerName: null
    },
    {
        name: "Figma",
        ownerEmail: "kaue.pszdsimirski.de.vargas@grupo-3c.com",
        ownerName: "Kauê Vargas",
        subOwnerEmail: null,
        subOwnerName: null
    }
];

// Função auxiliar para garantir que o usuário existe antes de vincular a ferramenta
async function ensureUser(email: string, name: string) {
    // Tenta achar pelo email
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        // Se não achar pelo email, tenta achar pelo nome (pode ter vindo do seed_users com email diferente)
        user = await prisma.user.findFirst({
            where: { name: { contains: name, mode: 'insensitive' } }
        });
    }

    // Se mesmo assim não achar, cria um "placeholder" para não quebrar a ferramenta
    if (!user) {
        console.log(`⚠️ Criando usuário placeholder para ferramenta: ${name} (${email})`);

        // Verificação final de duplicidade por email antes de criar
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            user = existingEmail;
        } else {
            user = await prisma.user.create({
                data: {
                    email: email,
                    name: name,
                    jobTitle: "Owner de Ferramenta",
                    department: "Tecnologia"
                    // REMOVIDO: systemProfile (Isso causava o erro!)
                }
            });
        }
    }

    return user;
}

async function main() {
    console.log('🛠️  Iniciando Seed de Ferramentas...');

    for (const t of toolsList) {
        try {
            // 1. Garante Owner
            let ownerId = null;
            if (t.ownerEmail && t.ownerName) {
                const owner = await ensureUser(t.ownerEmail, t.ownerName);
                ownerId = owner.id;
            }

            // 2. Garante Sub-Owner
            let subOwnerId = null;
            if (t.subOwnerEmail && t.subOwnerName) {
                const sub = await ensureUser(t.subOwnerEmail, t.subOwnerName);
                subOwnerId = sub.id;
            }

            // 3. Cria ou Atualiza a Ferramenta
            // CORREÇÃO: Busca pelo NOME antes de criar (Case Insensitive)
            const existingTool = await prisma.tool.findFirst({
                where: {
                    name: {
                        equals: t.name,
                        mode: 'insensitive' // Identifica "hubspot" e "HubSpot" como iguais
                    }
                }
            });

            if (existingTool) {
                // Se existe, atualiza os owners
                await prisma.tool.update({
                    where: { id: existingTool.id },
                    data: {
                        ownerId: ownerId,
                        subOwnerId: subOwnerId
                    }
                });
                // console.log(`🔄 Ferramenta atualizada: ${t.name}`);
            } else {
                // Se não existe, cria nova
                await prisma.tool.create({
                    data: {
                        name: t.name,
                        ownerId: ownerId,
                        subOwnerId: subOwnerId
                    }
                });
                console.log(`➕ Ferramenta criada: ${t.name}`);
            }

            //   console.log(`✅ Ferramenta verificada: ${t.name}`);

        } catch (e: any) {
            console.error(`❌ Erro ao processar ferramenta ${t.name}:`, e.message);
        }
    }

    console.log('🏁 Seed de Ferramentas concluído!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());