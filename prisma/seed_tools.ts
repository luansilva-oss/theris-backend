import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Dados dos Usuários (Baseado no PDF e na estrutura)
const usersData = [
    { name: "Vladimir Antonio Sesar", email: "vladimir@grupo-3c.com", dept: "Tecnologia e Segurança", role: "CTO" }, // Owner de SI
    { name: "Allan Von Stein", email: "allan@grupo-3c.com", dept: "Tecnologia e Segurança", role: "Analista de SI" }, // Sub de SI
    { name: "Isabely Wendler", email: "isabely.wendler@grupo-3c.com", dept: "Operações", role: "Head de Operações" },
    { name: "Renata Czapiewski", email: "renata.silva@grupo-3c.com", dept: "Pessoas e Cultura", role: "Analista de Pessoas" },
    { name: "Pablo", email: "pablo@grupo-3c.com", dept: "Operações", role: "Líder" },
    { name: "Debora", email: "debora@grupo-3c.com", dept: "Operações", role: "Analista" },
    { name: "Carlos Marques", email: "carlos.marques@grupo-3c.com", dept: "Produto", role: "Tech Lead" },
    { name: "Levi", email: "levi@grupo-3c.com", dept: "Produto", role: "Dev" },
    { name: "Marieli Thomen", email: "marieli@dizify.com", dept: "Dizify", role: "Head" },
    { name: "Jefferson", email: "jefferson@dizify.com", dept: "Dizify", role: "Dev" },
    { name: "Aline", email: "aline@grupo-3c.com", dept: "Administrativo", role: "Analista Financeiro" },
    { name: "Fernando", email: "fernando@grupo-3c.com", dept: "Administrativo", role: "Analista Financeiro" },
    { name: "Diogo Hartmann", email: "diogo@3cplusnow.com", dept: "Produto", role: "Tech Lead" },
    { name: "Joao", email: "joao@grupo-3c.com", dept: "Produto", role: "DevOps" },
    { name: "Raphael Pires", email: "raphael.pires@grupo-3c.com", dept: "Administrativo", role: "Head ADM" },
    { name: "Rafael Blaka", email: "rafael.blaka@3cplusnow.com", dept: "Produto", role: "Product Manager" },
    { name: "Junior", email: "junior@3cplusnow.com", dept: "Produto", role: "Dev" },
    { name: "Guilherme Pinheiro", email: "guilherme.pinheiro@fiqon.com", dept: "Produto", role: "Head FiqOn" },
    { name: "Lucas Matheus", email: "lucas.matheus@fiqon.com", dept: "Produto", role: "Dev" },
    { name: "Alex Wosiak", email: "alex.wosiak@grupo-3c.com", dept: "Professional Services", role: "Analista" }
];

// 2. Dados das Ferramentas
const toolsData = [
    { name: "Jumpcloud Grupo 3C", owner: "Vladimir", sub: "Allan" },
    { name: "ClickUp", owner: "Isabely", sub: "Renata" },
    { name: "Hubspot", owner: "Pablo", sub: "Debora" },
    { name: "3C Plus (Sistema)", owner: "Allan", sub: "Fernando" },
    { name: "Evolux", owner: "Carlos", sub: "Levi" },
    { name: "Dizify", owner: "Marieli", sub: "Jefferson" },
    { name: "Netsuit", owner: "Aline", sub: "Fernando" },
    { name: "Gitlab", owner: "Diogo", sub: "Joao" },
    { name: "AWS", owner: "Carlos", sub: "Joao" },
    { name: "GCP", owner: "Diogo", sub: "Joao" },
    { name: "Convenia", owner: "Raphael Pires", sub: "Renata" },
    { name: "Clicsign", owner: "Fernando", sub: "Aline" },
    { name: "Meta Ads", owner: "Rafael Blaka", sub: "Junior" },
    { name: "FiqOn", owner: "Guilherme Pinheiro", sub: "Lucas Matheus" },
    { name: "N8N", owner: "Pablo", sub: "Alex" },
    { name: "Hik Connect", owner: "Vladimir", sub: "Allan" }
];

async function main() {
    console.log('🌱 --- INICIANDO SEED COMPLETO ---');

    // A. CRIAR USUÁRIOS
    console.log('👤 Criando/Atualizando Usuários...');
    for (const u of usersData) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { name: u.name }, // Garante que o nome esteja certo para o match
            create: {
                name: u.name,
                email: u.email,
                systemProfile: u.name.includes('Vladimir') || u.name.includes('Allan') ? 'ADMIN' : 'VIEWER'
            }
        });
    }
    console.log('✅ Usuários sincronizados.');

    // B. CRIAR FERRAMENTAS E VINCULAR OWNERS
    console.log('🛠️ Criando Ferramentas...');
    for (const t of toolsData) {
        const ownerUser = await prisma.user.findFirst({
            where: { name: { contains: t.owner, mode: 'insensitive' } }
        });

        const subUser = await prisma.user.findFirst({
            where: { name: { contains: t.sub, mode: 'insensitive' } }
        });

        if (!ownerUser) {
            console.warn(`⚠️ ALERTA: Owner "${t.owner}" não encontrado para ferramenta ${t.name}`);
            continue;
        }

        await prisma.tool.upsert({
            where: { name: t.name },
            update: {
                ownerId: ownerUser.id,
                subOwnerId: subUser?.id || null
            },
            create: {
                name: t.name,
                ownerId: ownerUser.id,
                subOwnerId: subUser?.id || null
            }
        });
        console.log(`✅ Tool: ${t.name} -> Owner: ${ownerUser.name}`);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });