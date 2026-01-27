import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed (Corrigido)...');

  // 1. Limpeza (Apaga tudo para recomeçar do zero e evitar duplicações)
  try {
    await prisma.request.deleteMany();
    await prisma.tool.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.department.deleteMany();
    console.log('🧹 Banco limpo com sucesso.');
  } catch (e) {
    console.log('⚠️ Banco já estava limpo (ignorando)...');
  }

  // --------------------------------------------------------
  // 2. CRIAR DEPARTAMENTOS
  // --------------------------------------------------------
  const deptBoard = await prisma.department.create({ data: { name: 'Board / Diretoria' } });
  const deptTech = await prisma.department.create({ data: { name: 'Tecnologia (TI)' } });
  const deptRH = await prisma.department.create({ data: { name: 'Recursos Humanos' } });
  const deptVendas = await prisma.department.create({ data: { name: 'Comercial / Vendas' } });

  console.log('✅ Departamentos criados.');

  // --------------------------------------------------------
  // 3. CRIAR ROLES (CARGOS)
  // --------------------------------------------------------
  
  // ADMIN
  const roleAdmin = await prisma.role.create({
    data: { name: 'Admin de Sistemas', departmentId: deptTech.id }
  });

  // CEO / DIRETOR
  const roleCEO = await prisma.role.create({
    data: { name: 'CEO', departmentId: deptBoard.id }
  });

  // GESTOR
  const roleGerente = await prisma.role.create({
    data: { name: 'Gerente de RH', departmentId: deptRH.id }
  });

  // COLABORADOR
  const roleVendedor = await prisma.role.create({
    data: { name: 'Executivo de Vendas', departmentId: deptVendas.id }
  });

  console.log('✅ Roles criadas.');

  // --------------------------------------------------------
  // 4. CRIAR USUÁRIOS (AGORA COM O EMAIL CERTO)
  // --------------------------------------------------------

  // --- SEU USUÁRIO (ADMIN) ---
  const adminUser = await prisma.user.create({
    data: {
      name: 'Luan Silva',
      email: 'luan.silva@grupo-3c.com', // <--- CORRIGIDO AQUI!
      departmentId: deptTech.id,
      roleId: roleAdmin.id,
    }
  });

  // --- DIRETOR (VLADIMIR) ---
  const directorUser = await prisma.user.create({
    data: {
      name: 'Vladimir Sesar',
      email: 'vladimir.sesar@grupo-3c.com', // Corrigi o domínio aqui também por garantia
      departmentId: deptBoard.id,
      roleId: roleCEO.id,
    }
  });

  // --- GESTOR DE EXEMPLO ---
  const managerUser = await prisma.user.create({
    data: {
      name: 'Gestor de Teste',
      email: 'gestor@grupo-3c.com',
      departmentId: deptRH.id,
      roleId: roleGerente.id,
      managerId: directorUser.id
    }
  });

  // --- COLABORADOR COMUM ---
  const commonUser = await prisma.user.create({
    data: {
      name: 'Colaborador Vendas',
      email: 'vendedor@grupo-3c.com',
      departmentId: deptVendas.id,
      roleId: roleVendedor.id,
      managerId: managerUser.id
    }
  });

  console.log('✅ Usuários criados com sucesso.');

  // --------------------------------------------------------
  // 5. CRIAR FERRAMENTAS INICIAIS
  // --------------------------------------------------------
  await prisma.tool.create({
    data: {
      name: 'Jira Software',
      description: 'Gestão de Projetos e Chamados',
      ownerId: adminUser.id
    }
  });

  await prisma.tool.create({
    data: {
      name: 'HubSpot',
      description: 'CRM e Marketing',
      ownerId: directorUser.id
    }
  });

  console.log('🏁 Seed Concluído! Pode testar o login.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });