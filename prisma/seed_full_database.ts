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
        subOwnerEmail: "luan.silva@grupo-3c.com", subOwnerName: "Luan Matheus",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "vladimir.sesar@grupo-3c.com", level: "ACTIVE" },
            { email: "luan.silva@grupo-3c.com", level: "ACTIVE" },
            { email: "allan.vonstein@grupo-3c.com", level: "ACTIVE" },
            { email: "fernando.mosquer@grupo-3c.com", level: "ACTIVE" },
            { email: "ney.pereira@grupo-3c.com", level: "ACTIVE" },
            { email: "raphael.pires@grupo-3c.com", level: "ACTIVE" },
            { email: "renata.czapiewski@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" },
            { email: "alana.gaspar@grupo-3c.com", level: "ACTIVE" },
            { email: "wagner.wolff@grupo-3c.com", level: "ACTIVE" },
            { email: "thiago.marcondes@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 2. ClickUp (CK)
    {
        name: "ClickUp",
        acronym: "CK",
        description: "Hub de produtividade e gerenciamento de projetos.",
        ownerEmail: "ney.pereira@grupo-3c.com", ownerName: "Ney Eurico Pereira",
        subOwnerEmail: "alexander.reis@grupo-3c.com", subOwnerName: "Alexander Reis",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" },
            { email: "raphael.pires@grupo-3c.com", level: "ACTIVE" },
            { email: "alana.gaspar@grupo-3c.com", level: "ACTIVE" },
            { email: "wagner.wolff@grupo-3c.com", level: "ACTIVE" },
            { email: "lucas.matheus@grupo-3c.com", level: "ACTIVE" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 3. HubSpot (HS)
    {
        name: "Hubspot",
        acronym: "HS",
        description: "CRM e automação de marketing.",
        ownerEmail: "wagner.wolff@grupo-3c.com", ownerName: "Wagner Wolff",
        subOwnerEmail: "thiago.marcondes@grupo-3c.com", subOwnerName: "Thiago Marcondes",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "wagner.wolff@grupo-3c.com", level: "ACTIVE" },
            { email: "thiago.marcondes@grupo-3c.com", level: "ACTIVE" },
            { email: "ney.pereira@grupo-3c.com", level: "ACTIVE" },
            { email: "raphael.pires@grupo-3c.com", level: "ACTIVE" },
            { email: "allan.vonstein@grupo-3c.com", level: "ACTIVE" },
            { email: "fernando.mosquer@grupo-3c.com", level: "ACTIVE" },
            { email: "luan.silva@grupo-3c.com", level: "ACTIVE" },
            { email: "pablo.emanuel@grupo-3c.com", level: "ACTIVE" },
            { email: "deborah.peres@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 4. 3C Plus (CP)
    {
        name: "3C Plus",
        acronym: "CP",
        description: "Solução de discador e contact center.",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: null, subOwnerName: null,
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "allan.vonstein@grupo-3c.com", level: "ACTIVE" },
            { email: "fernando.mosquer@grupo-3c.com", level: "ACTIVE" },
            { email: "ney.pereira@grupo-3c.com", level: "ACTIVE" },
            { email: "raphael.pires@grupo-3c.com", level: "ACTIVE" },
            { email: "renata.czapiewski@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 5. Dizify (DZ)
    {
        name: "Dizify",
        acronym: "DZ",
        description: "Automação e integração de processos.",
        ownerEmail: "marieli.ferreira@grupo-3c.com", ownerName: "Marieli Ferreira",
        subOwnerEmail: "jeferson.cruz@grupo-3c.com", subOwnerName: "Jefferson Da Cruz",
        criticality: "Média", isCritical: false,
        accesses: [
            { email: "marieli.ferreira@grupo-3c.com", level: "ACTIVE" },
            { email: "jeferson.cruz@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 6. NetSuite (NS)
    {
        name: "Netsuit",
        acronym: "NS",
        description: "Sistema ERP.",
        ownerEmail: "aline.fonseca@grupo-3c.com", ownerName: "Aline Fonseca",
        subOwnerEmail: "fernando.takakusa@grupo-3c.com", subOwnerName: "Fernando Takakusa",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "aline.fonseca@grupo-3c.com", level: "ACTIVE" },
            { email: "fernando.takakusa@grupo-3c.com", level: "ACTIVE" },
            { email: "pinhas.spinelli@grupo-3c.com", level: "ACTIVE" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "ACTIVE" },
            { email: "alana.gaspar@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 7. GitLab (GL)
    {
        name: "GitLab",
        acronym: "GL",
        description: "Repositório de código e CI/CD.",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        subOwnerEmail: "bruno.levi@grupo-3c.com", subOwnerName: "Bruno Levy",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "carlos.marques@grupo-3c.com", level: "ACTIVE" },
            { email: "bruno.levi@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" },
            { email: "diogo.hartmann@grupo-3c.com", level: "ACTIVE" },
            { email: "pablo.emanuel@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 8. ClicSign (CS)
    {
        name: "ClicSign",
        acronym: "CS",
        description: "Assinatura eletrônica de documentos.",
        ownerEmail: "fernando.takakusa@grupo-3c.com", ownerName: "Fernando Takakusa",
        subOwnerEmail: "aline.fonseca@grupo-3c.com", subOwnerName: "Aline Fonseca",
        criticality: "Média", isCritical: false,
        accesses: [
            { email: "fernando.takakusa@grupo-3c.com", level: "ACTIVE" },
            { email: "aline.fonseca@grupo-3c.com", level: "ACTIVE" },
            { email: "ney.pereira@grupo-3c.com", level: "ACTIVE" },
            { email: "raphael.pires@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 9. NextRouter (NR)
    {
        name: "Nextrouter",
        acronym: "NR",
        description: "Roteamento inteligente de chamadas.",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: null, subOwnerName: null,
        criticality: "Média", isCritical: false,
        accesses: [
            { email: "diogo.hartmann@grupo-3c.com", level: "ACTIVE" },
            { email: "alana.gaspar@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 10. AWS (AS)
    {
        name: "AWS",
        acronym: "AS",
        description: "Serviços de computação em nuvem.",
        ownerEmail: "bruno.levi@grupo-3c.com", ownerName: "Bruno Levy",
        subOwnerEmail: "alexander.reis@grupo-3c.com", subOwnerName: "Alexander Reis",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "bruno.levi@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" },
            { email: "diogo.hartmann@grupo-3c.com", level: "ACTIVE" },
            { email: "pablo.emanuel@grupo-3c.com", level: "ACTIVE" },
            { email: "carlos.marques@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 11. Google Cloud Platform (GC)
    {
        name: "Google Cloud Platform",
        acronym: "GC",
        description: "Plataforma de nuvem do Google.",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "pablo.emanuel@grupo-3c.com", subOwnerName: "Pablo Emanuel",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "diogo.hartmann@grupo-3c.com", level: "ACTIVE" },
            { email: "pablo.emanuel@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" },
            { email: "bruno.levi@grupo-3c.com", level: "ACTIVE" },
            { email: "carlos.marques@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 12. Convenia (CV)
    {
        name: "Convenia",
        acronym: "CV",
        description: "Gestão de RH e Departamento Pessoal.",
        ownerEmail: "ney.pereira@grupo-3c.com", ownerName: "Ney Eurico Pereira",
        subOwnerEmail: "lucas.limberger@grupo-3c.com", subOwnerName: "Lucas Limberger",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "ACTIVE" },
            { email: "lucas.limberger@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" },
            { email: "raphael.pires@grupo-3c.com", level: "ACTIVE" },
            { email: "alana.gaspar@grupo-3c.com", level: "ACTIVE" },
            { email: "renata.czapiewski@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 13. FiqOn (FO)
    {
        name: "Fiqon",
        acronym: "FO",
        description: "Plataforma financeira.",
        ownerEmail: "guilherme.pimpao@grupo-3c.com", ownerName: "Guilherme Pimpão",
        subOwnerEmail: "lucas.matheus@grupo-3c.com", subOwnerName: "Lucas Matheus",
        criticality: "Média", isCritical: false,
        accesses: [
            { email: "guilherme.pimpao@grupo-3c.com", level: "ACTIVE" },
            { email: "lucas.matheus@grupo-3c.com", level: "ACTIVE" },
            { email: "pinhas.spinelli@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 14. N8N (NA)
    {
        name: "N8N",
        acronym: "NA",
        description: "Automação de fluxos de trabalho.",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: null, subOwnerName: null,
        criticality: "Média", isCritical: false,
        accesses: [
            { email: "pablo.emanuel@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" },
            { email: "jeferson.cruz@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 15. Hik Connect (HC)
    {
        name: "Hik Connect",
        acronym: "HC",
        description: "Sistema de segurança e monitoramento.",
        ownerEmail: "ney.pereira@grupo-3c.com", ownerName: "Ney Pereira",
        subOwnerEmail: "jaqueline.souza@grupo-3c.com", subOwnerName: "Jaqueline Souza",
        criticality: "Média", isCritical: false,
        accesses: [
            { email: "vladimir.sesar@grupo-3c.com", level: "ACTIVE" },
            { email: "allan.vonstein@grupo-3c.com", level: "ACTIVE" },
            { email: "ney.pereira@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 16. ChatGPT (CG)
    {
        name: "GPT",
        acronym: "CG",
        description: "Assistente de IA generativa.",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: null, subOwnerName: null,
        criticality: "Baixa", isCritical: false,
        accesses: [
            { email: "pablo.emanuel@grupo-3c.com", level: "ACTIVE" },
            { email: "wagner.wolff@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 17. Focus (FU)
    {
        name: "Focus",
        acronym: "FU",
        description: "Gestão de tarefas e tempo.",
        ownerEmail: "aline.fonseca@3cplusnow.com", ownerName: "Aline Fonseca",
        subOwnerEmail: "diogo.hartmann@grupo-3c.com", subOwnerName: "Diogo Hartmann",
        criticality: "Baixa", isCritical: false,
        accesses: [
            { email: "aline.fonseca@3cplusnow.com", level: "ACTIVE" },
            { email: "diogo.hartmann@grupo-3c.com", level: "ACTIVE" },
            { email: "thiago.marcondes@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 18. Vindi (VI)
    {
        name: "Vindi",
        acronym: "VI",
        description: "Plataforma de pagamentos recorrentes.",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "alana.gaspar@grupo-3c.com", subOwnerName: "Alana Gaspar",
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "pablo.emanuel@grupo-3c.com", level: "ACTIVE" },
            { email: "alana.gaspar@grupo-3c.com", level: "ACTIVE" },
            { email: "ian.ronska@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 19. Figma (FA)
    {
        name: "Figma",
        acronym: "FA",
        description: "Design de interface colaborativo.",
        ownerEmail: "gabriel.ida@grupo-3c.com", ownerName: "Gabriel Pires Ida",
        subOwnerEmail: null, subOwnerName: null,
        criticality: "Média", isCritical: false,
        accesses: [
            { email: "gabriel.ida@grupo-3c.com", level: "ACTIVE" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 20. Meta (MT)
    {
        name: "Meta",
        acronym: "MT",
        description: "Gerenciador de Negócios (Business Manager).",
        ownerEmail: "maria.schimanski@grupo-3c.com", ownerName: "Maria Schimanski",
        subOwnerEmail: "rebeca.costa@grupo-3c.com", subOwnerName: "Rebeca Costa",
        criticality: "Média", isCritical: false,
        accesses: [
            { email: "maria.schimanski@grupo-3c.com", level: "ACTIVE" },
            { email: "rebeca.costa@grupo-3c.com", level: "ACTIVE" },
            { email: "rafael.schimanski@grupo-3c.com", level: "ACTIVE" },
            { email: "junior.andrade@grupo-3c.com", level: "ACTIVE" }
        ]
    },
    // 21. Acessos Engenharia (AE)
    {
        name: "Acessos Engenharia",
        acronym: "AE",
        description: "Grupos de acesso globais para Engenharia e Suporte.",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: null, subOwnerName: null,
        criticality: "Alta", isCritical: true,
        accesses: [
            { email: "carlos.marques@grupo-3c.com", level: "ACTIVE" },
            { email: "bruno.levi@grupo-3c.com", level: "ACTIVE" },
            { email: "thiago.marcondes@grupo-3c.com", level: "ACTIVE" },
            { email: "alexander.reis@grupo-3c.com", level: "ACTIVE" }
        ]
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
            tool = await prisma.tool.update({
                where: { id: tool.id },
                data: {
                    // Atualiza dados para garantir conformidade com a lista
                    acronym: t.acronym || undefined,
                    description: t.description || null,
                    ownerId: owner?.id,
                    subOwnerId: subOwner?.id,
                    criticality: t.criticality || null,
                    isCritical: t.isCritical || false
                }
            });
            console.log(`🔄 Ferramenta Atualizada: ${t.name}`);
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