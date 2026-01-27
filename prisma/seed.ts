import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed...');

  // --------------------------------------------------------
  // 1. LIMPEZA (Ordem importa para evitar erro de chave estrangeira)
  // --------------------------------------------------------
  console.log('🧹 Limpando banco de dados...');
  // Apagamos tudo para recriar do zero e garantir as permissões
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.department.deleteMany();
  await prisma.tool.deleteMany();

  // --------------------------------------------------------
  // 2. CRIAR DEPARTAMENTOS
  // --------------------------------------------------------
  console.log('🏢 Criando Departamentos...');
  
  const boardDept = await prisma.department.create({ data: { name: 'Board' } });
  const techDept = await prisma.department.create({ data: { name: 'Tecnologia e Segurança' } });
  const comercialDept = await prisma.department.create({ data: { name: 'Comercial' } });
  const peopleDept = await prisma.department.create({ data: { name: 'Pessoas e Cultura' } });
  const productDept = await prisma.department.create({ data: { name: 'Produto' } });

  // --------------------------------------------------------
  // 3. CRIAR ROLES (CARGOS)
  // --------------------------------------------------------
  console.log('🏷️  Criando Roles...');

  const roleCEO = await prisma.role.create({ data: { name: 'CEO', departmentId: boardDept.id } });
  const roleHeadTech = await prisma.role.create({ data: { name: 'Head de Tecnologia', departmentId: techDept.id } });
  const roleSecAnalyst = await prisma.role.create({ data: { name: 'Analista de Segurança da Informação', departmentId: techDept.id } });
  const roleManager = await prisma.role.create({ data: { name: 'Gerente Comercial', departmentId: comercialDept.id } });

  // --------------------------------------------------------
  // 4. CRIAR USUÁRIOS CRÍTICOS (COM E-MAILS REAIS)
  // --------------------------------------------------------
  console.log('👥 Criando Usuários...');

  // 4.1 Vladimir Sesar (CEO & Super Admin)
  const vladimir = await prisma.user.create({
    data: {
      name: 'Vladimir Sesar',
      email: 'vladimir.sesar@grupo-3c.com', // Confirme se o e-mail é este
      departmentId: boardDept.id,
      roleId: roleCEO.id,
      systemProfile: 'SUPER_ADMIN', // <--- JÁ NASCE COMO SUPER ADMIN
    },
  });

  // 4.2 Luan Matheus (Segurança & Admin)
  const luan = await prisma.user.create({
    data: {
      name: 'Luan Matheus', // Nome no sistema
      email: 'luan.silva@grupo-3c.com', // SEU EMAIL EXATO DO LOGIN GOOGLE
      departmentId: techDept.id,
      roleId: roleSecAnalyst.id,
      managerId: vladimir.id,
      systemProfile: 'ADMIN', // <--- JÁ NASCE COMO ADMIN
    },
  });

  // 4.3 Allan Von Stain (Segurança & Admin)
  const allan = await prisma.user.create({
    data: {
      name: 'Allan Von Stain',
      email: 'allan.stain@grupo-3c.com', // Ajuste se o e-mail for diferente
      departmentId: techDept.id,
      roleId: roleSecAnalyst.id,
      managerId: vladimir.id,
      systemProfile: 'ADMIN', // <--- JÁ NASCE COMO ADMIN
    },
  });

  console.log('✅ Usuários criados:');
  console.log(`   - Vladimir: SUPER_ADMIN`);
  console.log(`   - Luan: ADMIN`);
  console.log(`   - Allan: ADMIN`);

  // --------------------------------------------------------
  // 5. FERRAMENTAS (OPCIONAL)
  // --------------------------------------------------------
  await prisma.tool.create({
    data: { name: 'Jira', ownerId: luan.id }
  });

  console.log('🏁 Seed Concluído com Sucesso!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });