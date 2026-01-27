import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed...');

  // --------------------------------------------------------
  // 1. LIMPEZA (Ordem importa por causa das chaves estrangeiras)
  // --------------------------------------------------------
  console.log('🧹 Limpando banco de dados...');
  await prisma.request.deleteMany(); // Apaga solicitações
  await prisma.user.deleteMany();    // Apaga usuários
  await prisma.role.deleteMany();    // Apaga cargos
  await prisma.department.deleteMany(); // Apaga departamentos
  await prisma.tool.deleteMany();    // Apaga ferramentas

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

  // Roles do Board
  const roleCEO = await prisma.role.create({ data: { name: 'CEO', departmentId: boardDept.id } });
  
  // Roles de Tecnologia/Segurança
  const roleHeadTech = await prisma.role.create({ data: { name: 'Head de Tecnologia', departmentId: techDept.id } });
  const roleSecAnalyst = await prisma.role.create({ data: { name: 'Analista de Segurança da Informação', departmentId: techDept.id } });
  const roleDev = await prisma.role.create({ data: { name: 'Desenvolvedor Fullstack', departmentId: techDept.id } });

  // Roles Genéricas
  const roleManager = await prisma.role.create({ data: { name: 'Gerente Comercial', departmentId: comercialDept.id } });
  const roleHR = await prisma.role.create({ data: { name: 'Analista de RH', departmentId: peopleDept.id } });

  // --------------------------------------------------------
  // 4. CRIAR USUÁRIOS (CRÍTICOS)
  // --------------------------------------------------------
  console.log('👥 Criando Usuários...');

  // 4.1 Vladimir Sesar (CEO)
  const vladimir = await prisma.user.create({
    data: {
      name: 'Vladimir Sesar',
      email: 'vladimir.sesar@grupo-3c.com', // Ajuste o domínio se necessário
      departmentId: boardDept.id,
      roleId: roleCEO.id,
      systemProfile: 'VIEWER', // Será atualizado no final
    },
  });

  // 4.2 Luan Matheus (Segurança)
  const luan = await prisma.user.create({
    data: {
      name: 'Luan Matheus',
      email: 'luan.silva@grupo-3c.com', // Seu email correto
      departmentId: techDept.id,
      roleId: roleSecAnalyst.id,
      managerId: vladimir.id, // Vladimir é gestor do Luan
      systemProfile: 'VIEWER', // Será atualizado no final
    },
  });

  // 4.3 Allan Von Stain (Segurança)
  const allan = await prisma.user.create({
    data: {
      name: 'Allan Von Stain',
      email: 'allan.stain@grupo-3c.com', // Ajuste o email se necessário
      departmentId: techDept.id,
      roleId: roleSecAnalyst.id,
      managerId: vladimir.id,
      systemProfile: 'VIEWER', // Será atualizado no final
    },
  });

  // 4.4 Outros Usuários (Exemplo)
  await prisma.user.create({
    data: {
      name: 'Gestor Comercial',
      email: 'gestor@grupo-3c.com',
      departmentId: comercialDept.id,
      roleId: roleManager.id,
      systemProfile: 'APPROVER',
      managerId: vladimir.id
    }
  });

  // --------------------------------------------------------
  // 5. ATRIBUIÇÃO DE PERMISSÕES ESPECIAIS (ADMIN / SUPER ADMIN)
  // --------------------------------------------------------
  console.log('👑 Aplicando permissões administrativas...');

  // Define Vladimir como SUPER_ADMIN
  await prisma.user.update({
    where: { id: vladimir.id },
    data: { systemProfile: 'SUPER_ADMIN' }
  });
  console.log('   ✅ Vladimir Sesar agora é SUPER_ADMIN.');

  // Define Time de Segurança como ADMIN
  const securityTeam = [luan.id, allan.id];
  
  await prisma.user.updateMany({
    where: { id: { in: securityTeam } },
    data: { systemProfile: 'ADMIN' }
  });
  console.log('   🛡️  Luan e Allan agora são ADMINs (Segurança).');

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