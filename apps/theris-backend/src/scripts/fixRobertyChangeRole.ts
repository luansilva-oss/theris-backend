/**
 * Script para corrigir manualmente a movimentação do Roberty Augusto dos Santos Machado.
 * Chamado #8FB37FC2: Closer / Comercial — aplica a alteração que não foi feita automaticamente.
 *
 * Executar: npx ts-node src/scripts/fixRobertyChangeRole.ts
 * Ou: npx tsx src/scripts/fixRobertyChangeRole.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userName = 'Roberty Augusto dos Santos Machado';
  const newRoleName = 'Closer';
  const newDeptName = 'Comercial';

  const user = await prisma.user.findFirst({
    where: { name: { contains: userName, mode: 'insensitive' } },
    select: { id: true, name: true, jobTitle: true, roleId: true, departmentId: true, unitId: true }
  });
  if (!user) {
    console.error(`❌ Usuário não encontrado: ${userName}`);
    process.exit(1);
  }

  const dept = await prisma.department.findFirst({
    where: { name: { contains: newDeptName, mode: 'insensitive' } },
    select: { id: true, name: true, unitId: true }
  });
  if (!dept) {
    console.error(`❌ Departamento não encontrado: ${newDeptName}`);
    process.exit(1);
  }

  const role = await prisma.role.findFirst({
    where: {
      departmentId: dept.id,
      name: { contains: newRoleName, mode: 'insensitive' }
    }
  });
  if (!role) {
    console.error(`❌ Cargo não encontrado: ${newRoleName} no departamento ${dept.name}`);
    process.exit(1);
  }

  const dadosAntes = { jobTitle: user.jobTitle, roleId: user.roleId, departmentId: user.departmentId, unitId: user.unitId };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      jobTitle: role.name,
      roleId: role.id,
      departmentId: dept.id,
      unitId: dept.unitId
    }
  });

  console.log('✅ Roberty atualizado com sucesso!');
  console.log('  Antes:', dadosAntes);
  console.log('  Depois:', { jobTitle: role.name, roleId: role.id, departmentId: dept.id, unitId: dept.unitId });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
