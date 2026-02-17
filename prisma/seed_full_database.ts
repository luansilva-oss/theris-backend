import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==============================================================================
// 1. DADOS COMPLETOS (Baseados na lista oficial fornecida)
// ==============================================================================

interface ToolAccess {
    email: string;
    level: string;
}

interface ToolData {
    name: string;
    acronym: string | null; // Allow null
    description: string;
    ownerEmail: string;
    ownerName: string;
    subOwnerEmail: string | null;
    subOwnerName: string | null;
    criticality: string;
    isCritical: boolean;
    accesses: ToolAccess[];
}

const toolsData: ToolData[] = [
    // 1. JumpCloud (JC)
    {
        name: "Jumpcloud Grupo 3C",
        acronym: "JC",
        description: "Plataforma de diretório em nuvem para gerenciamento de identidades.",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: "luan.silva@grupo-3c.com", subOwnerName: "Luan Matheus", // Primary Sub-owner
        // Note: Allan is also mentioned as sub-owner in list, but schema supports one. Luan is first in "Luan e Allan".
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 2. ClickUp (CK)
    {
        name: "ClickUp",
        acronym: "CK",
        description: "Hub de produtividade e gerenciamento de projetos.",
        ownerEmail: "isabely.wendler@grupo-3c.com", ownerName: "Isabely Wendler",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 3. HubSpot (HS)
    {
        name: "Hubspot",
        acronym: "HS",
        description: "CRM e automação de marketing.",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "deborah.peres@grupo-3c.com", subOwnerName: "Deborah Peres",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 4. 3C Plus (CP)
    {
        name: "3C",
        acronym: "CP",
        description: "Solução de discador e contact center.",
        ownerEmail: "allan.vonstein@grupo-3c.com", ownerName: "Allan Von Stein",
        subOwnerEmail: "fernando.mosquer@grupo-3c.com", subOwnerName: "Fernando Mosquer",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 5. Evolux (EX)
    {
        name: "Evolux",
        acronym: "EX",
        description: "Telefonia IP e gestão de chamadas.",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        subOwnerEmail: "bruno.levi@grupo-3c.com", subOwnerName: "Bruno Levi", // "Levi"
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 6. Dizify (DZ)
    {
        name: "Dizify",
        acronym: "DZ",
        description: "Automação e integração de processos.",
        ownerEmail: "marieli.ferreira@grupo-3c.com", ownerName: "Marieli Ferreira",
        subOwnerEmail: "jeferson.cruz@grupo-3c.com", subOwnerName: "Jefferson Da Cruz",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 7. NetSuite (NS)
    {
        name: "Netsuit",
        acronym: "NS",
        description: "Sistema ERP.",
        ownerEmail: "aline.fonseca@grupo-3c.com", ownerName: "Aline Fonseca",
        subOwnerEmail: "fernando.takakusa@grupo-3c.com", subOwnerName: "Fernando Takakusa",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 8. GitLab (GL)
    {
        name: "Gitlab",
        acronym: "GL",
        description: "DevOps e controle de versão.",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 9. AWS (AS)
    {
        name: "AWS",
        acronym: "AS",
        description: "Infraestrutura em nuvem.",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 10. GCP (GC)
    {
        name: "GCP",
        acronym: "GC",
        description: "Google Cloud Platform.",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 11. Convenia (CV)
    {
        name: "Convenia",
        acronym: "CV",
        description: "Gestão de RH e DP.",
        ownerEmail: "raphael.pires@grupo-3c.com", ownerName: "Raphael Pires",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 12. Clicsign (CS)
    {
        name: "Clicsign",
        acronym: "CS",
        description: "Assinaturas eletrônicas.",
        ownerEmail: "fernando.takakusa@grupo-3c.com", ownerName: "Fernando Takakusa",
        subOwnerEmail: "aline.fonseca@grupo-3c.com", subOwnerName: "Aline Fonseca",
        criticality: "Média", isCritical: true, // Based on sheet, CS-1 is Alta, CS-2 is Média. Tool itself seems Alta/Sim in User List.
        accesses: []
    },
    // 13. Meta (MT)
    {
        name: "Meta",
        acronym: "MT",
        description: "Business Manager FB/IG.",
        ownerEmail: "rafael.schimanski@grupo-3c.com", ownerName: "Rafael Blaka",
        subOwnerEmail: "junior.andrade@grupo-3c.com", subOwnerName: "Junior Andrade",
        criticality: "Alta", isCritical: true, // Média/Alta mixed
        accesses: []
    },
    // 14. Fiqon (FO)
    {
        name: "Fiqon",
        acronym: "FO",
        description: "Middleware financeiro.",
        ownerEmail: "pinhas.spinelli@grupo-3c.com", ownerName: "Pinhas Spinelli", // New owner from list
        subOwnerEmail: "lucas.matheus@grupo-3c.com", subOwnerName: "Lucas Matheus",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 15. N8N (NA) - Pablo & Alex (Using Pablo as primary owner or create two tools?)
    // List says: N8N -> Pablo (Automacao) AND N8N -> Alex (PS) w/ Wosiak.
    // I will keep Pablo as Owner and maybe add Alex as Sub or create separate entry if they are distinct instances.
    // Assuming single tool for now, defaulting to Pablo as Owner (Automacao).
    {
        name: "N8N",
        acronym: "NA",
        description: "Automação de workflows.",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "alexander.reis@grupo-3c.com", subOwnerName: "Alexander Reis", // Alex from PS
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 16. Hik Connect (HC)
    {
        name: "Hik Connect",
        acronym: "HC",
        description: "Videomonitoramento.",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: "allan.vonstein@grupo-3c.com", subOwnerName: "Allan Von Stein",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 17. GPT (CG)
    {
        name: "GPT",
        acronym: "CG",
        description: "OpenAI ChatGPT.",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "wagner.wolff@grupo-3c.com", subOwnerName: "Wagner Wolff",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 18. Focus (FU)
    {
        name: "Focus",
        acronym: "FU",
        description: "Gestão de indicadores.",
        ownerEmail: "aline.fonseca@grupo-3c.com", ownerName: "Aline Fonseca",
        subOwnerEmail: "thiago.marcondes@grupo-3c.com", subOwnerName: "Thiago Marcondes",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 19. Vindi (VI)
    {
        name: "Vindi",
        acronym: "VI",
        description: "Pagamentos recorrentes.",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "ian.ronska@grupo-3c.com", subOwnerName: "Ian Ronska",
        criticality: "Alta", isCritical: true,
        accesses: []
    },
    // 20. Nextrouter (NR)
    {
        name: "Nextrouter",
        acronym: "NR",
        description: "Roteamento inteligente.",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "ian.ronska@grupo-3c.com", subOwnerName: "Ian Ronska",
        criticality: "Média", isCritical: true,
        accesses: []
    },
    // 21. Figma (FA)
    {
        name: "Figma",
        acronym: "FA",
        description: "Design colaborativo.",
        ownerEmail: "gabriel.ida@grupo-3c.com", ownerName: "Gabriel Pires Ida", // "Pires"
        subOwnerEmail: null, subOwnerName: null,
        criticality: "Média", isCritical: false, // "Não" critico
        accesses: []
    }
];


// --- FUNÇÕES AUXILIARES ---

async function ensureUser(email: string, name: string) {
    if (!email) return null;

    const emailPrefix = email.split('@')[0].toLowerCase();
    const domain = email.split('@')[1];

    // 1. Tenta achar pelo email exato (case insensitive)
    let user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
    });

    // 2. Tenta achar trocando o domínio (@3cplusnow.com <-> @grupo-3c.com)
    if (!user) {
        const altEmail = domain.includes('3cplusnow')
            ? email.replace('3cplusnow.com', 'grupo-3c.com')
            : email.replace('grupo-3c.com', '3cplusnow.com');

        user = await prisma.user.findFirst({
            where: { email: { equals: altEmail, mode: 'insensitive' } }
        });
    }

    // 3. Tenta achar pelo prefixo do email (ex: alana.gaspar vs alana.maiumy.gaspar)
    if (!user) {
        const allUsers = await prisma.user.findMany();
        user = allUsers.find(u => {
            const uPrefix = u.email.split('@')[0].toLowerCase();
            const pParts = emailPrefix.split('.');
            const uParts = uPrefix.split('.');

            // Match se primeiro e último nome batem no prefixo
            return pParts[0] === uParts[0] && pParts[pParts.length - 1] === uParts[uParts.length - 1];
        }) || null;
    }

    // 4. Tenta achar pelo Nome se fornecido
    if (!user && name) {
        user = await prisma.user.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } }
        });
    }

    // 5. Cria placeholder apenas se realmente não existir nada similar
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
        } catch (e) {
            user = await prisma.user.findUnique({ where: { email } });
        }
    }
    return user;
}


async function main() {
    console.log('🚨 INICIANDO SEED SEGURO DO CATÁLOGO DE FERRAMENTAS...');
    console.log('---------------------------------------------------------');

    // 1. NÃO APAGAR DADOS (Modo Seguro)
    // const deletedAccess = await prisma.access.deleteMany({});
    // console.log(`🗑️ Acessos removidos: ${deletedAccess.count}`);
    // const deletedTools = await prisma.tool.deleteMany({});
    // console.log(`🗑️ Ferramentas removidas: ${deletedTools.count}`);

    console.log('---------------------------------------------------------');
    console.log('🚀 Verificando e completando ferramentas e acessos oficiais...');

    for (const t of toolsData) {
        // 1. Garante Owner
        const owner = await ensureUser(t.ownerEmail, t.ownerName);

        // 2. Garante SubOwner
        let subOwner = null;
        if (t.subOwnerEmail) {
            subOwner = await ensureUser(t.subOwnerEmail, t.subOwnerName || '');
        }

        // 3. Garante Ferramenta (Cria se não existir)
        let tool = await prisma.tool.findFirst({
            where: { name: { equals: t.name, mode: 'insensitive' } }
        });

        if (!tool) {
            tool = await prisma.tool.create({
                data: {
                    name: t.name,
                    acronym: t.acronym || undefined,
                    description: t.description || null,
                    ownerId: owner?.id,
                    subOwnerId: subOwner?.id,
                    criticality: t.criticality || null,
                    isCritical: t.isCritical || false
                }
            });
            console.log(`➕ Ferramenta Criada: ${t.name}`);
        } else {
            console.log(`ℹ️ Ferramenta Existente: ${t.name} (Pulando criação)`);
        }

        // 4. Cria Acessos (Se não existirem)
        let accessCount = 0;
        if (t.accesses && t.accesses.length > 0) {
            for (const acc of t.accesses) {
                // Tenta achar usuario pelo email, sem nome especifico (pode ser qualquer um)
                const userAcc = await ensureUser(acc.email, acc.email.split('@')[0]);

                if (userAcc) {
                    // Verifica se já tem acesso PARA ESSA FERRAMENTA
                    const existingAccess = await prisma.access.findFirst({
                        where: {
                            toolId: tool.id,
                            userId: userAcc.id
                        }
                    });

                    if (!existingAccess) {
                        await prisma.access.create({
                            data: {
                                toolId: tool.id,
                                userId: userAcc.id,
                                status: acc.level
                            }
                        });
                        accessCount++;
                    }
                }
            }
        }

        console.log(`✅ [${t.acronym || '??'}] ${t.name} -> Owner: ${owner?.name} | Novos Acessos: ${accessCount}`);
    }

    console.log('---------------------------------------------------------');
    console.log('🏁 SEED SEGURO CONCLUÍDO!');
}

main()
    .catch((e) => {
        console.error("❌ ERRO FATAL NO SEED:", e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());