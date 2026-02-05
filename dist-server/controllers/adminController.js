"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCatalog = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// --- DADOS OFICIAIS (A tua lista completa) ---
const toolsData = [
    {
        name: "JumpCloud", acronym: "JC",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: "luan.silva@grupo-3c.com", subOwnerName: "Luan Matheus",
        accesses: [
            { email: "vladimir.sesar@grupo-3c.com", level: "Administrador with Billing" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador with Billing" },
            { email: "luan.silva@grupo-3c.com", level: "Administrador with Billing" },
            { email: "allan.vonstein@grupo-3c.com", level: "Administrador with Billing" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Help Desk" }
        ]
    },
    {
        name: "ClickUp", acronym: "CK",
        ownerEmail: "isabely.wendler@grupo-3c.com", ownerName: "Isabely Wendler",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Proprietário" },
            { email: "alexander.reis@grupo-3c.com", level: "Administrador" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "isabely.wendler@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Administrador" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Administrador" },
            { email: "alan.armstrong@grupo-3c.com", level: "Membro" },
            { email: "bruno.levy@grupo-3c.com", level: "Membro" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Membro" },
            { email: "gabriel.krysa@grupo-3c.com", level: "Membro" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Membro" },
            { email: "luan.silva@grupo-3c.com", level: "Membro" }
        ]
    },
    {
        name: "HubSpot", acronym: "HS",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "deborah.peres@grupo-3c.com", subOwnerName: "Deborah Peres",
        accesses: [
            { email: "wagner.wolff@grupo-3c.com", level: "Administrador" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" },
            { email: "thomas.ferreira@grupo-3c.com", level: "Líder Comercial" },
            { email: "camila.oliveira@grupo-3c.com", level: "Líder Comercial" },
            { email: "taissa.almeida@grupo-3c.com", level: "Closer / Analista" },
            { email: "felipe.nascimento@grupo-3c.com", level: "Atendimento" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Service / Sales" }
        ]
    },
    {
        name: "3C Plus", acronym: "CP",
        ownerEmail: "allan.vonstein@grupo-3c.com", ownerName: "Allan Von Stein",
        subOwnerEmail: "fernando.mosquer@grupo-3c.com", subOwnerName: "Fernando Mosquer",
        accesses: [
            { email: "andrieli.javorski@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "vladimir.sesar@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "diogo.hartmann@3cplusnow.com", level: "Admin / Elements" },
            { email: "alana.gaspar@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "alexsandy.correa@grupo-3c.com", level: "Nível 2 (Comercial)" }
        ]
    },
    {
        name: "GitLab", acronym: "GL",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "bruno.levy@grupo-3c.com", level: "Administrator" },
            { email: "carlos.marques@grupo-3c.com", level: "Administrator" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrator" },
            { email: "gabriel.krysa@3cplusnow.com", level: "Administrator" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Administrator" },
            { email: "andrieli.javorski@grupo-3c.com", level: "Regular" },
            { email: "eduardo.goncalves@grupo-3c.com", level: "Regular" }
        ]
    },
    {
        name: "AWS", acronym: "AS",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "alexander.reis@grupo-3c.com", level: "User" },
            { email: "carlos.marques@grupo-3c.com", level: "User" },
            { email: "diogo.hartmann@grupo-3c.com", level: "User" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "User" },
            { email: "vladimir.sesar@grupo-3c.com", level: "User" }
        ]
    },
    {
        name: "GCP", acronym: "GC",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "diogo.hartmann@grupo-3c.com", level: "Owner" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Admin" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Admin" }
        ]
    },
    {
        name: "Convenia", acronym: "CV",
        ownerEmail: "raphael.pires@grupo-3c.com", ownerName: "Raphael Pires",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Owner" },
            { email: "raphael.pires@grupo-3c.com", level: "Owner" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Pessoas e Cultura" }
        ]
    },
    {
        name: "Clicsign", acronym: "CS",
        ownerEmail: "fernando.takakusa@grupo-3c.com", ownerName: "Fernando Takakusa",
        subOwnerEmail: "aline.fonseca@grupo-3c.com", subOwnerName: "Aline Fonseca",
        accesses: [
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "aline.fonseca@grupo-3c.com", level: "Membro" },
            { email: "raphael.pires@grupo-3c.com", level: "Membro" }
        ]
    },
    {
        name: "Figma", acronym: "FA",
        ownerEmail: "gabriel.ida@grupo-3c.com", ownerName: "Gabriel Pires Ida",
        subOwnerEmail: null, subOwnerName: null,
        accesses: [
            { email: "gabriel.ida@grupo-3c.com", level: "Full (Total)" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Full (Total)" },
            { email: "diogo.hartmann@grupo-3c.com", level: "View" }
        ]
    },
    {
        name: "Slack", acronym: null,
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: null, subOwnerName: null,
        accesses: []
    },
    {
        name: "Evolux", acronym: "EX",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        accesses: []
    },
    {
        name: "Dizify", acronym: "DZ",
        ownerEmail: "marieli.ferreira@grupo-3c.com", ownerName: "Marieli Ferreira",
        accesses: [{ email: "marieli.ferreira@grupo-3c.com", level: "Administrador" }]
    },
    {
        name: "Next Suit", acronym: "NS",
        ownerEmail: "aline.fonseca@grupo-3c.com", ownerName: "Aline Fonseca",
        accesses: [{ email: "fernando.takakusa@grupo-3c.com", level: "Administrador" }]
    },
    {
        name: "Fiqon", acronym: "FO",
        ownerEmail: "guilherme.pinheiro@grupo-3c.com", ownerName: "Guilherme Pinheiro",
        accesses: [{ email: "lucas.matheus@grupo-3c.com", level: "Administrador" }]
    },
    {
        name: "N8N", acronym: "NA",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [{ email: "pablo.emanuel@grupo-3c.com", level: "Owner" }]
    },
    {
        name: "Hik Connect", acronym: "HC",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        accesses: [{ email: "portaria@grupo-3c.com", level: "Administrador" }]
    },
    {
        name: "Chat GPT", acronym: "CG",
        ownerEmail: "pablo.emanuel@3cplusnow.com", ownerName: "Pablo Emanuel",
        accesses: [{ email: "wagner@3cplusnow.com", level: "Proprietário" }]
    },
    {
        name: "Focus", acronym: "FU",
        ownerEmail: "aline.fonseca@3cplusnow.com", ownerName: "Aline Fonseca",
        accesses: [{ email: "aline.fonseca@3cplusnow.com", level: "Administrador" }]
    },
    {
        name: "Vindi", acronym: "VI",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [{ email: "pablo.emanuel@grupo-3c.com", level: "Administrador" }]
    },
    {
        name: "NextRouter", acronym: "NR",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        accesses: [{ email: "diogo.hartmann@grupo-3c.com", level: "Administrador" }]
    },
    {
        name: "Meta", acronym: "MT",
        ownerEmail: "rafael.schimanski@grupo-3c.com", ownerName: "Rafael Blaka",
        accesses: [{ email: "rafael.schimanski@3cplusnow.com", level: "Business Manager" }]
    }
];
// --- FUNÇÃO AUXILIAR (BUSCA USER INTELIGENTE) ---
async function ensureUser(email, name) {
    if (!email)
        return null;
    let user = await prisma.user.findFirst({
        where: { OR: [{ email: { equals: email, mode: 'insensitive' } }] }
    });
    // Fallback: Tenta trocar domínio (3cplusnow <-> grupo-3c)
    if (!user) {
        const altEmail = email.includes('3cplusnow')
            ? email.replace('3cplusnow.com', 'grupo-3c.com')
            : email.replace('grupo-3c.com', '3cplusnow.com');
        user = await prisma.user.findFirst({ where: { email: { equals: altEmail, mode: 'insensitive' } } });
    }
    // Cria placeholder se não achar
    if (!user) {
        try {
            user = await prisma.user.create({
                data: {
                    name: name || email.split('@')[0],
                    email: email,
                    jobTitle: "Não mapeado",
                    department: "Geral"
                }
            });
        }
        catch (e) {
            user = await prisma.user.findUnique({ where: { email } });
        }
    }
    return user;
}
// --- FUNÇÃO PRINCIPAL (ROTA) ---
const resetCatalog = async (req, res) => {
    try {
        console.log('🚨 API: INICIANDO RESET DE CATÁLOGO...');
        // 1. Limpeza
        await prisma.access.deleteMany({});
        await prisma.tool.deleteMany({});
        console.log('🗑️ Catálogo zerado.');
        // 2. Recriação
        let count = 0;
        for (const t of toolsData) {
            const owner = await ensureUser(t.ownerEmail, t.ownerName);
            let subOwner = null;
            if (t.subOwnerEmail)
                subOwner = await ensureUser(t.subOwnerEmail, t.subOwnerName || '');
            const tool = await prisma.tool.create({
                data: {
                    name: t.name,
                    acronym: t.acronym || undefined,
                    ownerId: owner?.id,
                    subOwnerId: subOwner?.id
                }
            });
            if (t.accesses) {
                for (const acc of t.accesses) {
                    const u = await ensureUser(acc.email, acc.email.split('@')[0]);
                    if (u) {
                        await prisma.access.create({
                            data: { toolId: tool.id, userId: u.id, status: acc.level }
                        });
                    }
                }
            }
            count++;
        }
        return res.status(200).json({
            message: `Sucesso! ${count} ferramentas restauradas.`,
            timestamp: new Date()
        });
    }
    catch (error) {
        console.error("❌ Erro ao resetar catálogo:", error);
        return res.status(500).json({ error: "Erro interno ao processar catálogo." });
    }
};
exports.resetCatalog = resetCatalog;
