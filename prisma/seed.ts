import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed Complexo...');

  // 1. Limpar banco (ordem importa por causa das chaves estrangeiras)
  await prisma.access.deleteMany();
  await prisma.request.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.department.deleteMany();

  // 2. Criar Departamentos
  const deptTech = await prisma.department.create({ data: { name: 'Tecnologia' } });
  const deptRh = await prisma.department.create({ data: { name: 'Recursos Humanos' } });

  // 3. Criar Roles
  const roleHead = await prisma.role.create({ data: { name: 'Head', departmentId: deptTech.id } });
  const roleDev = await prisma.role.create({ data: { name: 'Developer', departmentId: deptTech.id } });

  // 4. Criar Usuários
  const vladimir = await prisma.user.create({
    data: { name: 'Vladimir (Super)', email: 'vladimir@grupo-3c.com', roleId: roleHead.id, departmentId: deptTech.id }
  });

  const luan = await prisma.user.create({
    data: { name: 'Luan Matheus', email: 'luan.silva@grupo-3c.com', roleId: roleDev.id, departmentId: deptTech.id }
  });

  const allan = await prisma.user.create({
    data: { name: 'Allan', email: 'allan@grupo-3c.com', roleId: roleDev.id, departmentId: deptTech.id }
  });

  const maria = await prisma.user.create({
    data: { name: 'Maria RH', email: 'maria@grupo-3c.com', roleId: roleHead.id, departmentId: deptRh.id }
  });

  // 5. Criar Ferramentas (Blocks Nível 1)
  const toolsData = [
    { name: 'Jira Software', ownerId: luan.id },
    { name: 'Slack Workspace', ownerId: vladimir.id, subOwnerId: luan.id },
    { name: 'Figma Design', ownerId: allan.id },
    { name: 'AWS Cloud', ownerId: vladimir.id },
    { name: 'Notion Team', ownerId: luan.id }
  ];

  for (const t of toolsData) {
    const tool = await prisma.tool.create({
      data: {
        name: t.name,
        ownerId: t.ownerId,
        subOwnerId: t.subOwnerId
      }
    });

    // 6. Criar Acessos (Blocks Nível 2 - Usuários dentro da ferramenta)
    // Vamos dar acesso a todos os usuários nessas ferramentas para popular a tela
    await prisma.access.create({ data: { userId: luan.id, toolId: tool.id, status: 'ACTIVE' } });
    await prisma.access.create({ data: { userId: vladimir.id, toolId: tool.id, status: 'ACTIVE' } });
    
    if (t.name === 'Slack Workspace') {
       await prisma.access.create({ data: { userId: maria.id, toolId: tool.id, status: 'ACTIVE' } });
       await prisma.access.create({ data: { userId: allan.id, toolId: tool.id, status: 'ACTIVE' } });
    }
  }

  console.log('🏁 Seed Concluído! Ferramentas e Acessos criados.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });