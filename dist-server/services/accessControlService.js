"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAllAccess = exports.syncToolsForUser = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ==============================================================================
// 1. FERRAMENTAS PADRÃO (Todo mundo tem, independente do cargo)
// ==============================================================================
const DEFAULT_TOOLS = ["Google Workspace", "Slack"];
// ==============================================================================
// 2. MATRIZ DE ACESSO (Baseada na planilha KBS)
// ==============================================================================
const ROLE_ACCESS_MATRIX = {
    // --- BOARD (BO) ---
    "CEO": ["JumpCloud", "ClickUp", "Convenia", "Next Suit"],
    "CFO": ["Next Suit", "ClickSign"], // (Adicionado aqui pois CFO costuma ser Board/Admin)
    // --- TECNOLOGIA E SEGURANÇA (SI) ---
    "Gestor de SI": ["JumpCloud", "AWS", "Hik Connect"],
    "Analista de SI/Infra": ["JumpCloud", "AWS"],
    "Analista de Segurança da Informação": ["JumpCloud", "AWS"], // Variação de nome comum
    "Analista de Custos": ["Next Router", "Vindi"],
    // --- PRODUTO (PD) ---
    "Tech Lead / CTO": ["GitLab", "GCP"],
    "Tech Lead": ["GitLab", "GCP"], // Variação
    "CTO": ["GitLab", "GCP"], // Variação
    "Dev Full-Stack": ["GitLab", "3C Plus"],
    "Desenvolvedor Full-stack": ["GitLab", "3C Plus"], // Variação do Seed
    "DevOps": ["GitLab"],
    "PO": ["Figma"],
    "P.O": ["Figma"], // Variação
    "UX Designer": ["Figma"],
    "Dev Dizify": ["Dizify"],
    "Desenvolvedor Back-End": ["GitLab"], // Genérico baseado no padrão PD
    "Desenvolvedor Front-End": ["GitLab"], // Genérico baseado no padrão PD
    "Dev FiqOn": ["FiqOn"],
    // --- ADMINISTRATIVO (AD) ---
    "Ass. Financeiro": ["Vindi", "Focus", "Next Suit"],
    "Assistente Financeiro": ["Vindi", "Focus", "Next Suit"], // Variação
    "Analista de DP": ["Convenia"],
    "Analista de Departamento Pessoal": ["Convenia"], // Variação
    // --- OPERAÇÕES (OP) ---
    "COO": ["ClickUp"],
    "Gestor de Projetos": ["ClickUp", "N8N", "Chat GPT"],
    // --- COMERCIAL (CO) ---
    "CSO / Head": ["HubSpot"],
    "CSO": ["HubSpot"],
    "Head Comercial": ["HubSpot"],
    "Closer PME": ["HubSpot"],
    "Closer": ["HubSpot"], // Genérico
    "Closer Contact": ["3C Plus"],
    "SalesOps": ["HubSpot"],
    "Closer Dizify": ["Dizify"],
    // --- ATENDIMENTO (AT) ---
    "Líder": ["3C Plus"], // Cuidado: "Líder" é muito genérico, ideal ser "Líder de Atendimento"
    "Líder de Atendimento ao Cliente": ["3C Plus"],
    "Suporte Evolux": ["GitLab"],
    "Analista de PS": ["HubSpot", "Vindi"],
    "Suporte Técnico": ["FiqOn"],
    "Analista de Suporte Técnico": ["FiqOn"], // Variação
    // --- PESSOAS E CULTURA (PC) ---
    "CPO": ["Convenia"],
    "Analista P&C": ["JumpCloud", "Convenia"],
    "Analista de Pessoas e Cultura": ["JumpCloud", "Convenia"], // Variação
    "Portaria": ["Hik Connect"],
    "Porteiro": ["Hik Connect"],
    "Zeladora": ["Hik Connect"], // Assumindo necessidade de acesso predial
    // --- REVOPS + AUTOMAÇÕES (RA) ---
    "Líder de automações": ["N8N"],
    "Analista": ["N8N", "Vindi", "GCP"], // "Analista" sozinho é perigoso, tente "Analista de Automação"
    "Analista de Automações": ["N8N", "Vindi", "GCP"],
    // --- MARKETING (MK) ---
    "Líder de marketing": ["HubSpot", "META"],
    "MKT Ops / Growth": ["Figma"],
    "Marketing Ops / Analista de Growth": ["Figma"], // Variação
    "Designer": ["Figma"],
    "Web Developer": ["WordPress"]
};
const syncToolsForUser = async (userId, jobTitle) => {
    console.log(`⚙️ Sincronizando ferramentas para o cargo: ${jobTitle}`);
    // 1. Definir lista de ferramentas necessárias
    // Começa com as DEFAULT (Google/Slack) e adiciona as específicas do cargo
    let toolsToAssign = [...DEFAULT_TOOLS];
    if (jobTitle && ROLE_ACCESS_MATRIX[jobTitle]) {
        toolsToAssign = [...toolsToAssign, ...ROLE_ACCESS_MATRIX[jobTitle]];
    }
    else {
        // Tenta encontrar por aproximação se não achar exato (Ex: "Líder" contido em "Líder de Vendas")
        // Ou apenas mantém o default
        console.log(`⚠️ Cargo "${jobTitle}" não mapeado na matriz exata. Aplicando apenas Default.`);
    }
    // Remove duplicatas (Ex: Se o cargo tiver Slack, não precisa adicionar 2x)
    const uniqueToolsNames = [...new Set(toolsToAssign)];
    // 2. Busca os IDs dessas ferramentas no banco
    const requiredTools = await prisma.tool.findMany({
        where: { name: { in: uniqueToolsNames } }
    });
    // Verifica se faltou alguma ferramenta (pode não estar cadastrada no seed_tools)
    if (requiredTools.length < uniqueToolsNames.length) {
        const foundNames = requiredTools.map(t => t.name);
        const missing = uniqueToolsNames.filter(n => !foundNames.includes(n));
        console.warn(`⚠️ Ferramentas faltantes no Banco de Dados: ${missing.join(', ')}`);
    }
    // 3. Descobrir quais acessos ele JÁ tem
    const currentAccesses = await prisma.access.findMany({
        where: { userId, status: 'ACTIVE' },
        include: { tool: true }
    });
    const currentToolIds = currentAccesses.map(a => a.toolId);
    // 4. O que precisa ADICIONAR?
    const toAdd = requiredTools.filter(t => !currentToolIds.includes(t.id));
    // 5. O que precisa REMOVER? 
    // Regra: Remove se o usuário tem o acesso, MAS a ferramenta não está na lista `uniqueToolsNames`
    const toRemove = currentAccesses.filter(a => !uniqueToolsNames.includes(a.tool.name));
    // --- EXECUTANDO AÇÕES ---
    // A. Adicionar Novos Acessos
    for (const tool of toAdd) {
        await prisma.access.create({
            data: {
                userId,
                toolId: tool.id,
                status: 'ACTIVE'
            }
        });
        console.log(`➕ Acesso concedido: ${tool.name}`);
    }
    // B. Remover Acessos Antigos
    for (const access of toRemove) {
        await prisma.access.update({
            where: { id: access.id },
            data: { status: 'REVOKED' }
        });
        console.log(`➖ Acesso revogado: ${access.tool.name}`);
    }
};
exports.syncToolsForUser = syncToolsForUser;
const revokeAllAccess = async (userId) => {
    console.log(`🚫 Revogando TODOS os acessos do usuário ID: ${userId}`);
    await prisma.access.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'REVOKED' }
    });
};
exports.revokeAllAccess = revokeAllAccess;
