import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==============================================================================
// 1. DADOS DAS FERRAMENTAS E ACESSOS (Mapeado dos teus CSVs)
// ==============================================================================
const toolsData = [
    // --- FIGMA ---
    {
        name: "Figma",
        ownerEmail: "gabriel.ida@grupo-3c.com", ownerName: "Gabriel Pires Ida",
        accesses: [
            { email: "gabriel.ida@grupo-3c.com", level: "Full (Total)" },
            { email: "front3c@grupo-3c.com", level: "Full (Total)" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Full (Total)" },
            { email: "junior.andrade@grupo-3c.com", level: "Full (Total)" },
            { email: "gustavo.schneider@grupo-3c.com", level: "Dev" },
            { email: "igor.ribeiro@grupo-3c.com", level: "Collab" },
            { email: "leonardo.maciel@grupo-3c.com", level: "Collab" },
            { email: "rebeca.costa@grupo-3c.com", level: "Collab" },
            { email: "guilherme.pinheiro@grupo-3c.com", level: "Collab" },
            { email: "diogo.hartmann@grupo-3c.com", level: "View" }
        ]
    },
    // --- AWS ---
    {
        name: "AWS",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Henrique Marques",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "João Paulo Vasconcelos",
        accesses: [
            { email: "alexander.reis@grupo-3c.com", level: "Console habilitado / User" },
            { email: "bruno.levi@grupo-3c.com", level: "Console habilitado / User" },
            { email: "carlos.marques@grupo-3c.com", level: "Console habilitado / User" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Console habilitado / User" },
            { email: "gabriel.lima@grupo-3c.com", level: "Console habilitado / User" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Console habilitado / User" },
            { email: "vladimir.sesar@grupo-3c.com", level: "Console habilitado / User" },
            { email: "wesley.vale@grupo-3c.com", level: "Console habilitado / User" }
        ]
    },
    // --- CLICKUP ---
    {
        name: "ClickUp",
        ownerEmail: "isabely.wendler@grupo-3c.com", ownerName: "Isabely Wendler",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Proprietário" },
            { email: "alexander.reis@grupo-3c.com", level: "Administrador" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Administrador" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Administrador" },
            { email: "alan.armstrong@grupo-3c.com", level: "Membro" },
            { email: "bruno.levy@grupo-3c.com", level: "Membro" },
            { email: "camila.oliveira@grupo-3c.com", level: "Membro" },
            { email: "fernando.mosquer@grupo-3c.com", level: "Membro" }
        ]
    },
    // --- HUBSPOT ---
    {
        name: "HubSpot",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "deborah.peres@grupo-3c.com", subOwnerName: "Deborah Peres",
        accesses: [
            { email: "wagner.wolff@grupo-3c.com", level: "Super Admin" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Super Admin" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Super Admin" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Super Admin" },
            { email: "deborah.peres@grupo-3c.com", level: "Super Admin" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Super Admin" },
            { email: "rafael.schimanski@grupo-3c.com", level: "Super Admin" },
            { email: "thomas.ferreira@grupo-3c.com", level: "Líder Comercial" },
            { email: "camila.oliveira@grupo-3c.com", level: "Líder Comercial" }
        ]
    },
    // --- GITLAB ---
    {
        name: "GitLab",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "João Paulo Vasconcelos",
        accesses: [
            { email: "bruno.levy@grupo-3c.com", level: "Administrator" },
            { email: "carlos.marques@grupo-3c.com", level: "Administrator" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrator" },
            { email: "gabriel.krysa@3cplusnow.com", level: "Administrator" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Administrator" },
            { email: "andrieli.javorski@grupo-3c.com", level: "Regular" },
            { email: "bruno.garcia@3cplusnow.com", level: "Regular" },
            { email: "eduardo.goncalves@grupo-3c.com", level: "Regular" },
            { email: "jeferson.cruz@grupo-3c.com", level: "Regular" }
        ]
    },
    // --- GOOGLE WORKSPACE ---
    {
        name: "Google Workspace",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Antonio Sesar",
        accesses: [] // Todos têm acesso, podemos deixar vazio ou popular via script
    },
    // --- JUMPCLOUD ---
    {
        name: "JumpCloud",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Antonio Sesar",
        subOwnerEmail: "luan.silva@grupo-3c.com", subOwnerName: "Luan Matheus",
        accesses: [
            { email: "vladimir.sesar@grupo-3c.com", level: "Admin with Billing" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Admin with Billing" },
            { email: "luan.silva@grupo-3c.com", level: "Admin with Billing" },
            { email: "allan.vonstein@grupo-3c.com", level: "Admin with Billing" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Help Desk" }
        ]
    },
    // --- CLICK SIGN ---
    {
        name: "ClickSign",
        ownerEmail: "fernando.takakusa@grupo-3c.com", ownerName: "Fernando Takakusa",
        subOwnerEmail: "aline.fonseca@grupo-3c.com", subOwnerName: "Aline Fonseca",
        accesses: [
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "aline.fonseca@grupo-3c.com", level: "Membro" },
            { email: "gabriely.garcia@grupo-3c.com", level: "Membro" },
            { email: "raphael.pires@grupo-3c.com", level: "Membro (API)" }
        ]
    },
    // --- NEXT SUIT ---
    {
        name: "Next Suit",
        ownerEmail: "aline.fonseca@3cplusnow.com", ownerName: "Aline Fonseca",
        subOwnerEmail: "fernando.takakusa@grupo-3c.com", subOwnerName: "Fernando Takakusa",
        accesses: [
            { email: "aline.fonseca@3cplusnow.com", level: "Administrador" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Administrador" },
            { email: "stephany.moraes@grupo-3c.com", level: "Analista Fiscal" },
            { email: "ana.antunes@grupo-3c.com", level: "Administrador" }
        ]
    },
    // --- HIK CONNECT ---
    {
        name: "Hik Connect",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Administrador" },
            { email: "jaqueline.souza@grupo-3c.com", level: "Administrador" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Administrador" },
            { email: "portaria@grupo-3c.com", level: "Administrador" },
            { email: "allan.vonstein@grupo-3c.com", level: "Administrador" }
        ]
    },
    // --- N8N ---
    {
        name: "N8N",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [
            { email: "pablo.emanuel@grupo-3c.com", level: "Owner" },
            { email: "eduardo.bueno@grupo-3c.com", level: "Membro" },
            { email: "ian.ronska@grupo-3c.com", level: "Membro" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Membro" }
        ]
    },
    // --- DIZIFY ---
    {
        name: "Dizify",
        ownerEmail: "marieli.ferreira@grupo-3c.com", ownerName: "Marieli Ferreira",
        accesses: [
            { email: "marieli.ferreira@grupo-3c.com", level: "Administrador" },
            { email: "pietro.limberger@grupo-3c.com", level: "Administrador" },
            { email: "lucas.limberger@grupo-3c.com", level: "Administrador" },
            { email: "jeferson.cruz@grupo-3c.com", level: "Administrador" }
        ]
    },
    // --- VINDI ---
    {
        name: "Vindi",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [
            { email: "alan.armstrong@grupo-3c.com", level: "Administrador" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "alana.gaspar@grupo-3c.com", level: "Gestor" },
            { email: "ian.ronska@grupo-3c.com", level: "Gestor" }
        ]
    },
    // --- CHAT GPT ---
    {
        name: "Chat GPT",
        ownerEmail: "pablo.emanuel@3cplusnow.com", ownerName: "Pablo Emanuel",
        accesses: [
            { email: "pablo.emanuel@3cplusnow.com", level: "Proprietário" },
            { email: "wagner@3cplusnow.com", level: "Proprietário" },
            { email: "aline.fonseca@3cplusnow.com", level: "Membro" },
            { email: "emily@3cplusnow.com", level: "Membro" },
            { email: "rafael.blaka@3cplusnow.com", level: "Membro" }
        ]
    },
    // --- CONVENIA ---
    {
        name: "Convenia",
        ownerEmail: "raphael.pires@grupo-3c.com", ownerName: "Raphael Pires Ida",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Owner" },
            { email: "lucas.limberger@grupo-3c.com", level: "Owner" },
            { email: "raphael.pires@grupo-3c.com", level: "Owner" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Pessoas e Cultura" }
        ]
    },
    // --- 3C PLUS (PLATAFORMA) ---
    {
        name: "3C Plus",
        ownerEmail: "allan.vonstein@grupo-3c.com", ownerName: "Allan Von Stein",
        subOwnerEmail: "fernando.mosquer@grupo-3c.com", subOwnerName: "Fernando Mosquer",
        accesses: [
            { email: "andrieli.javorski@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "gabriel.krysa@3cplusnow.com", level: "Nível 3 (Produto)" },
            { email: "vladimir.sesar@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Atendimento" },
            { email: "camila.brunetti@3cplusnow.com", level: "Comercial" }
        ]
    }
];

// Função para buscar usuário de forma "fuzzy" (se o email não bater exato, tenta nome)
async function findUser(email: string, name: string) {
    // 1. Tenta Email exato
    let user = await prisma.user.findUnique({ where: { email } });

    // 2. Se falhar, tenta encontrar parte do nome (ajuda quando o CSV tem email diferente do banco)
    if (!user) {
        const namePart = name.split(' ')[0]; // Primeiro nome
        user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { contains: namePart.toLowerCase(), mode: 'insensitive' } },
                    { name: { contains: name, mode: 'insensitive' } }
                ]
            }
        });
    }

    // 3. Se não existir, CRIA UM PLACEHOLDER para não quebrar o vínculo
    if (!user) {
        console.log(`⚠️ Usuário não encontrado no banco: ${name} (${email}). Criando placeholder...`);
        try {
            user = await prisma.user.create({
                data: {
                    name: name || email.split('@')[0],
                    email: email,
                    jobTitle: "Não Identificado",
                    department: "Geral"
                }
            });
        } catch (e) {
            // Se der erro de Unique Constraint (raro aqui), busca de novo
            user = await prisma.user.findUnique({ where: { email } });
        }
    }
    return user;
}

async function main() {
    console.log('🧹 Limpando dados antigos (Acessos e Ferramentas)...');
    await prisma.access.deleteMany({});
    await prisma.tool.deleteMany({});
    console.log('✅ Base limpa.');

    console.log('🛠️ Iniciando Carga Completa de Ferramentas...');

    for (const t of toolsData) {
        console.log(`🔹 Processando: ${t.name}`);

        // 1. Preparar Owner
        const owner = await findUser(t.ownerEmail, t.ownerName);
        let subOwner = null;
        if (t.subOwnerEmail) {
            subOwner = await findUser(t.subOwnerEmail, t.subOwnerName || '');
        }

        // 2. Criar Ferramenta
        const tool = await prisma.tool.create({
            data: {
                name: t.name,
                ownerId: owner?.id,
                subOwnerId: subOwner?.id
            }
        });

        // 3. Criar Acessos (Níveis)
        if (t.accesses && t.accesses.length > 0) {
            for (const access of t.accesses) {
                const accessUser = await findUser(access.email, ""); // Nome vazio, tenta só email

                if (accessUser) {
                    await prisma.access.create({
                        data: {
                            toolId: tool.id,
                            userId: accessUser.id,
                            status: access.level // AQUI SALVAMOS O NÍVEL (Ex: "Administrador")
                        }
                    });
                }
            }
            console.log(`   ↳ ${t.accesses.length} acessos vinculados.`);
        }
    }

    console.log('🏁 Carga Completa Finalizada!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());