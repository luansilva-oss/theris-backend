import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed...');

  // 1. Limpeza de tabelas (na ordem correta para não quebrar chaves estrangeiras)
  try {
    await prisma.request.deleteMany();
    await prisma.tool.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.department.deleteMany();
    console.log('🧹 Banco limpo.');
  } catch (e) {
    console.log('⚠️ Banco já estava limpo ou erro ao limpar (ignorando)...');
  }

  // 2. Criar Departamentos Essenciais
  const deptBoard = await prisma.department.create({
    data: { name: 'Board' }
  });

  const deptTech = await prisma.department.create({
    data: { name: 'Tecnologia e Segurança' }
  });

  const deptRH = await prisma.department.create({
    data: { name: 'Recursos Humanos' }
  });

  console.log('✅ Departamentos criados.');

  // 3. Criar Roles (Cargos) - AGORA LIGADOS AOS DEPARTAMENTOS
  // O erro acontecia aqui: agora passamos o departmentId
  const roleCEO = await prisma.role.create({
    data: {
      name: 'CEO',
      departmentId: deptBoard.id
    }
  });

  const roleAnalista = await prisma.role.create({
    data: {
      name: 'Analista de Segurança',
      departmentId: deptTech.id
    }
  });
  
  const roleGestor = await prisma.role.create({
    data: {
      name: 'Gerente de RH',
      departmentId: deptRH.id
    }
  });

  console.log('✅ Roles criadas e vinculadas.');

  // 4. Criar Usuário SUPER ADMIN (Vladimir)
  const vladimir = await prisma.user.create({
    data: {
      name: 'Vladimir Antonio Sesar',
      email: 'vladimir.sesar@grupo3c.com.br', // Ajuste se necessário
      departmentId: deptBoard.id,
      roleId: roleCEO.id,
    }
  });

  // 5. Criar Usuário ADMIN de TI (Luan)
  const luan = await prisma.user.create({
    data: {
      name: 'Luan Silva',
      email: 'luan.silva@grupo3c.com.br', // Ajuste se necessário
      departmentId: deptTech.id,
      roleId: roleAnalista.id,
      managerId: vladimir.id // Vladimir é gestor do Luan
    }
  });

  // 6. Criar Ferramentas
  await prisma.tool.create({
    data: {
      name: 'Jira',
      description: 'Gestão de Projetos e Chamados',
      ownerId: luan.id
    }
  });

  await prisma.tool.create({
    data: {
      name: 'HubSpot',
      description: 'CRM de Vendas e Marketing',
      ownerId: vladimir.id
    }
  });

  console.log('✅ Ferramentas criadas.');
  console.log('🏁 Seed Concluído com Sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });