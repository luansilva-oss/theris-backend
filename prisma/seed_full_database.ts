import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DADOS COMPLETOS DAS FERRAMENTAS E ACESSOS
const toolsData = [
    {
        name: "Figma",
        ownerEmail: "gabriel.ida@grupo-3c.com", ownerName: "Gabriel Pires Ida",
        accesses: [
            { email: "gabriel.ida@grupo-3c.com", level: "Full (Total)" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Full (Total)" },
            { email: "gustavo.schneider@grupo-3c.com", level: "Dev" },
            { email: "igor.ribeiro@grupo-3c.com", level: "Collab" },
            { email: "diogo.hartmann@grupo-3c.com", level: "View" }
        ]
    },
    {
        name: "AWS",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "João Paulo",
        accesses: [
            { email: "alexander.reis@grupo-3c.com", level: "Console habilitado" },
            { email: "bruno.levi@grupo-3c.com", level: "Console habilitado" },
            { email: "vladimir.sesar@grupo-3c.com", level: "Console habilitado" }
        ]
    },
    {
        name: "ClickUp",
        ownerEmail: "isabely.wendler@grupo-3c.com", ownerName: "Isabely Wendler",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Proprietário" },
            { email: "alexander.reis@grupo-3c.com", level: "Administrador" },
            { email: "alan.armstrong@grupo-3c.com", level: "Membro" }
        ]
    },
    {
        name: "HubSpot",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "deborah.peres@grupo-3c.com", subOwnerName: "Deborah Peres",
        accesses: [
            { email: "wagner.wolff@grupo-3c.com", level: "Super Admin" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Super Admin" },
            { email: "thomas.ferreira@grupo-3c.com", level: "Líder Comercial" }
        ]
    },
    {
        name: "GitLab",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "João Paulo",
        accesses: [
            { email: "bruno.levy@grupo-3c.com", level: "Administrator" },
            { email: "carlos.marques@grupo-3c.com", level: "Administrator" },
            { email: "eduardo.goncalves@grupo-3c.com", level: "Regular" }
        ]
    },
    {
        name: "JumpCloud",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: "luan.silva@grupo-3c.com", subOwnerName: "Luan Matheus",
        accesses: [
            { email: "vladimir.sesar@grupo-3c.com", level: "Admin with Billing" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Help Desk" }
        ]
    },
    {
        name: "ClickSign",
        ownerEmail: "fernando.takakusa@grupo-3c.com", ownerName: "Fernando Takakusa",
        subOwnerEmail: "aline.fonseca@grupo-3c.com", subOwnerName: "Aline Fonseca",
        accesses: [
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "gabriely.garcia@grupo-3c.com", level: "Membro" }
        ]
    },
    {
        name: "Next Suit",
        ownerEmail: "aline.fonseca@grupo-3c.com", ownerName: "Aline Fonseca",
        subOwnerEmail: "fernando.takakusa@grupo-3c.com", subOwnerName: "Fernando Takakusa",
        accesses: [
            { email: "aline.fonseca@grupo-3c.com", level: "Administrador" },
            { email: "stephany.moraes@grupo-3c.com", level: "Analista Fiscal" }
        ]
    },
    {
        name: "Hik Connect",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Administrador" },
            { email: "portaria@grupo-3c.com", level: "Administrador" }
        ]
    },
    {
        name: "N8N",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [
            { email: "pablo.emanuel@grupo-3c.com", level: "Owner" },
            { email: "eduardo.bueno@grupo-3c.com", level: "Membro" }
        ]
    },
    {
        name: "Dizify",
        ownerEmail: "marieli.ferreira@grupo-3c.com", ownerName: "Marieli Ferreira",
        accesses: [
            { email: "marieli.ferreira@grupo-3c.com", level: "Administrador" },
            { email: "pietro.limberger@grupo-3c.com", level: "Administrador" }
        ]
    },
    {
        name: "Vindi",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [
            { email: "alan.armstrong@grupo-3c.com", level: "Administrador" },
            { email: "alana.gaspar@grupo-3c.com", level: "Gestor" }
        ]
    },
    {
        name: "Chat GPT",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [
            { email: "wagner.wolff@grupo-3c.com", level: "Proprietário" },
            { email: "aline.fonseca@grupo-3c.com", level: "Membro" }
        ]
    },
    {
        name: "Convenia",
        ownerEmail: "raphael.pires@grupo-3c.com", ownerName: "Raphael Pires",
        accesses: [
            { email: "raphael.pires@grupo-3c.com", level: "Owner" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Pessoas e Cultura" }
        ]
    },
    {
        name: "3C Plus",
        ownerEmail: "allan.vonstein@grupo-3c.com", ownerName: "Allan Von Stein",
        subOwnerEmail: "fernando.mosquer@grupo-3c.com", subOwnerName: "Fernando Mosquer",
        accesses: [
            { email: "vladimir.sesar@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Atendimento" }
        ]
    },
    { name: "Google Workspace", ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar", accesses: [] },
    { name: "Slack", ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar", accesses: [] },
    { name: "Focus", ownerEmail: "aline.fonseca@grupo-3c.com", ownerName: "Aline Fonseca", accesses: [] },
    { name: "Next Router", ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann", accesses: [] },
    { name: "FiqOn", ownerEmail: "guilherme.pinheiro@grupo-3c.com", ownerName: "Guilherme Pinheiro", accesses: [] },
    { name: "META", ownerEmail: "rafael.schimanski@grupo-3c.com", ownerName: "Rafael Blaka", accesses: [] }
];

async function findUser(email: string, name: string) {
    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: email, mode: 'insensitive' } },
                { name: { contains: name.split(' ')[0], mode: 'insensitive' } }
            ]
        }
    });
    return user;
}

async function main() {
    console.log('🔥 INICIANDO RESET DE FERRAMENTAS...');

    // 1. LIMPEZA TOTAL (Remove duplicatas)
    // Não apagamos usuários, apenas ferramentas e acessos
    await prisma.access.deleteMany({});
    await prisma.tool.deleteMany({});
    console.log('✅ Todas as ferramentas antigas foram apagadas.');

    console.log('🛠️ Recriando catálogo oficial...');

    for (const t of toolsData) {
        // Busca ou cria Owner placeholder se não achar
        let owner = await findUser(t.ownerEmail, t.ownerName);
        let subOwner = null;
        if (t.subOwnerEmail) subOwner = await findUser(t.subOwnerEmail, t.subOwnerName || '');

        // Cria a Ferramenta
        const tool = await prisma.tool.create({
            data: {
                name: t.name,
                ownerId: owner?.id, // Pode ser null se não achar o user
                subOwnerId: subOwner?.id
            }
        });

        // Cria os Acessos com Nível
        if (t.accesses && t.accesses.length > 0) {
            for (const acc of t.accesses) {
                const user = await findUser(acc.email, "");
                if (user) {
                    await prisma.access.create({
                        data: {
                            toolId: tool.id,
                            userId: user.id,
                            status: acc.level // Salvando o nível no campo status
                        }
                    });
                }
            }
        }
    }

    console.log('🏁 Catálogo reconstruído com sucesso (Sem duplicatas)!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());