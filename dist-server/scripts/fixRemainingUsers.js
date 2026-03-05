"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
async function main() {
    console.log('=== INICIANDO CORREÇÃO COM IDs HARDCODED ===\n');
    // Criar role SalesOps se não existir
    const deptComercialContact = await prisma_1.prisma.department.findFirst({
        where: { name: { contains: 'Comercial Contact', mode: 'insensitive' } }
    });
    let roleSalesOps = await prisma_1.prisma.role.findFirst({
        where: { name: 'SalesOps' }
    });
    if (!roleSalesOps && deptComercialContact) {
        roleSalesOps = await prisma_1.prisma.role.create({
            data: {
                name: 'SalesOps',
                departmentId: deptComercialContact.id
            }
        });
        console.log(`✅ Role criada: SalesOps | Comercial Contact (${roleSalesOps.id})`);
    }
    // Criar role Líder de Vendas Dizify se não existir
    const deptDizify = await prisma_1.prisma.department.findFirst({
        where: { name: { contains: 'Dizify', mode: 'insensitive' } }
    });
    let roleLiderDizify = await prisma_1.prisma.role.findFirst({
        where: { name: 'Líder de Vendas Dizify' }
    });
    if (!roleLiderDizify && deptDizify) {
        roleLiderDizify = await prisma_1.prisma.role.create({
            data: {
                name: 'Líder de Vendas Dizify',
                departmentId: deptDizify.id
            }
        });
        console.log(`✅ Role criada: Líder de Vendas Dizify (${roleLiderDizify.id})`);
    }
    // ─── DELETAR usuários de serviço e inválidos ───────────────────────
    const emailsParaDeletar = [
        'allan.portela', 'pablo.emanuel1', 'ney.pereira.adm', 'jose', 'ian',
        'lucas.costa1', 'michelle.bodot', 'Bruno Levi', 'stephany.moraes',
        'bruno.sahidak', 'diogo', 'kauevargas.design', 'mathaus_kozkodai',
        'portaria', 'marcio.pagnoncelli', 'emily', 'gpt.polaris',
        'rafael.blaka', 'thiago.marcondes'
    ];
    const nomesParaDeletar = [
        'Andrieli de Oliveira Javorski',
        'Alexander Eduardo dos Reis'
    ];
    for (const email of emailsParaDeletar) {
        const u = await prisma_1.prisma.user.findFirst({ where: { email: { contains: email } } });
        if (u) {
            await prisma_1.prisma.user.delete({ where: { id: u.id } });
            console.log(`🗑️  Deletado: ${u.name} (${u.email})`);
        }
    }
    for (const nome of nomesParaDeletar) {
        const u = await prisma_1.prisma.user.findFirst({ where: { name: nome } });
        if (u) {
            await prisma_1.prisma.user.delete({ where: { id: u.id } });
            console.log(`🗑️  Deletado: ${u.name}`);
        }
    }
    // ─── MAPEAMENTO HARDCODED por nome → roleId ────────────────────────
    const ROLES = {
        CLOSER_CONTACT: 'b326cb12-fa81-4767-af0a-318fde6b8e0d', // Closer | Comercial Contact
        CLOSER_DIZIFY: 'd72278dd-9919-46b4-b775-32dceae860ef', // Closer | Dizify
        TECH_LEAD_3C: '91ade3a8-79e2-4e85-95b6-e869f443caac', // Tech Lead 3C | Produto 3C+
        TECH_LEAD_EVOLUX: 'ba6d166f-d4e5-462e-ab22-e941ed243141', // Tech Lead Evolux
        TECH_LEAD_DIZIFY: '3071a709-0189-4d03-a31b-8119385bcad2', // Tech Lead Dizify
        DEV_FULL_3C: '35301c87-5560-4d36-bac5-f43a99176083', // Dev Full Stack | Produto 3C+
        DEV_FULL_FIQON: 'f53f15c2-bb09-4a1d-bec3-e02c66620f75', // Dev Full Stack | Produto FiqOn
        ANALISTA_AUTO: '008619f6-d03c-4f32-bbdf-df4fbf469172', // Analista de Automações
        CS_RECUPERACAO: 'a6719a80-cc28-4aa0-a4c4-323f8f3413a9', // Customer Success - Recuperação
        ANALISTA_PEC: 'c705a621-9800-4fc8-ba33-4345e1a67d23', // Analista de Pessoas e Performance
        GESTOR_MKT: '18f7a255-cda5-4559-be21-d440d601df35', // Gestor de Projetos | Marketing
        DESIGNER: 'ba836968-3bca-4718-8a13-90ea7d18da3a', // Designer | Marketing
        FARMER: '31049be6-18da-41f2-b751-086d7de0b673', // Analista de Expansão
    };
    const atribuicoes = [
        // Closers Comercial Contact (Enterprise + PME)
        { nome: 'Lucio Marcos Nascimento Ramos', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Ketlin Tainá Zaluski de Oliveira', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Leandro dos Santos Mülhstdtt da Silva', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Gustavo dos Santos Dangui', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Willian Samuel de Oliveira', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Guilherme Mello Minuzzi', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Kesley Luis de Oliveira', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Leonardo Kauan Ferraz', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Rafaela Guedes Pinto Cavalcante Stephan', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Cirene Laiza da Cruz Lara', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Maycon José Barbosa Padilha', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Lucas Fontoura de Almeida', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Lucas Antonio Costa', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Roberta Gomes Ribeiro', roleId: ROLES.CLOSER_CONTACT },
        { nome: 'Mateus Gerik', roleId: ROLES.CLOSER_CONTACT },
        // Closers Dizify
        { nome: 'Iago Moura do Prado', roleId: ROLES.CLOSER_DIZIFY },
        { nome: 'Eduardo Elias do Nascimento', roleId: ROLES.CLOSER_DIZIFY },
        // Tech Leads
        { nome: 'Carlos Henrique Marques', roleId: ROLES.TECH_LEAD_3C },
        { nome: 'Marieli Aparecida Ferreira Thomen', roleId: ROLES.TECH_LEAD_DIZIFY },
        // Devs
        { nome: 'Matheus Rocha Camargo', roleId: ROLES.DEV_FULL_3C },
        { nome: 'Yuri Karas Regis Pacheco de Miranda Lima', roleId: ROLES.DEV_FULL_FIQON },
        // Outros
        { nome: 'Wesley Diogo do Vale', roleId: ROLES.ANALISTA_AUTO },
        { nome: 'Gabriel Schneider Bernadini', roleId: ROLES.CS_RECUPERACAO },
        { nome: 'Renata Czapiewski Silva', roleId: ROLES.ANALISTA_PEC },
        { nome: 'Igor de Azevedo Ribeiro', roleId: ROLES.GESTOR_MKT },
        { nome: 'Kauê Pszdzimirski de Vargas', roleId: ROLES.DESIGNER },
        // SalesOps e Líder de Vendas Dizify (roles dinâmicas)
        { nome: 'Deborah Peres', roleId: roleSalesOps?.id ?? '' },
        { nome: 'Taryk', roleId: roleLiderDizify?.id ?? '' },
        { nome: 'Taryk de Souza Ferreira', roleId: roleLiderDizify?.id ?? '' },
        // Farmers → Analista de Expansão
        { nome: 'Maria Eduarda Merhet Padilha', roleId: ROLES.FARMER },
        { nome: 'Daniel Felipe da Silva Souza', roleId: ROLES.FARMER },
        { nome: 'Kauane Lemos Bastos', roleId: ROLES.FARMER },
        { nome: 'Taissa Guilliane Gomes Almeida', roleId: ROLES.FARMER },
    ];
    console.log('\n=== ATRIBUINDO ROLES ===\n');
    for (const { nome, roleId } of atribuicoes) {
        const user = await prisma_1.prisma.user.findFirst({ where: { name: nome } });
        if (!user) {
            console.log(`⚠️  Não encontrado: ${nome}`);
            continue;
        }
        const role = await prisma_1.prisma.role.findUnique({
            where: { id: roleId },
            include: { department: true }
        });
        if (!role) {
            console.log(`⚠️  Role não encontrada: ${roleId}`);
            continue;
        }
        // Verificar se já tem departmentId (não sobrescrever sem motivo)
        if (user.departmentId && user.departmentId === role.departmentId) {
            console.log(`✓ Já correto: ${nome}`);
            continue;
        }
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                roleId: role.id,
                departmentId: role.departmentId,
                unitId: role.department?.unitId ?? null
            }
        });
        console.log(`✓ ${nome} → ${role.name} | ${role.department?.name}`);
    }
    // ─── PENDENTES AINDA SEM ROLE ──────────────────────────────────────
    console.log('\n=== VERIFICANDO RESTANTES SEM departmentId ===\n');
    const restantes = await prisma_1.prisma.user.findMany({
        where: { departmentId: null },
        select: { name: true, email: true, jobTitle: true }
    });
    if (restantes.length === 0) {
        console.log('✅ Todos os usuários têm departmentId!');
    }
    else {
        console.log(`⚠️  ${restantes.length} usuários ainda sem departmentId:`);
        restantes.forEach(u => console.log(` - ${u.name} | ${u.email} | ${u.jobTitle}`));
    }
}
main().catch(console.error).finally(() => prisma_1.prisma.$disconnect());
