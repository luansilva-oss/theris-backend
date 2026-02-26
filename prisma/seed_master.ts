/**
 * Seed MESTRE: limpa a estrutura e popula com a lista oficial definitiva.
 * Ordem: Unit -> Department -> Role (com código KBS) -> User (upsert por email) -> RoleKitItem (ferramentas por cargo).
 * Dados em seed_master_data.ts (PEOPLE + KIT_ENTRIES).
 */
import { PrismaClient } from '@prisma/client';
import { PEOPLE, UNIT_NAMES, KIT_ENTRIES } from './seed_master_data';

const prisma = new PrismaClient();

function deptKey(unit: string, dept: string) {
  return `${unit}::${dept}`;
}

function roleKey(unit: string, dept: string, job: string) {
  return `${unit}::${dept}::${job}`;
}

async function main() {
  if (!(prisma as any).unit) {
    throw new Error('Prisma client sem model Unit. Rode: npx prisma generate');
  }

  // PROTEÇÃO: não sobrescrever dados existentes (evita reset em produção a cada deploy).
  // Se já existir estrutura (units ou roles), o seed é ignorado para preservar edições do usuário.
  const existingUnits = await prisma.unit.count();
  const existingRoles = await prisma.role.count();
  if (existingUnits > 0 || existingRoles > 0) {
    console.log('🌱 Seed Master — estrutura já existente no banco. Seed ignorado para preservar dados.');
    return;
  }

  console.log('🌱 Seed Master — banco vazio, populando com lista oficial');

  // 1. Criar Unidades
  const unitMap = new Map<string, string>();
  for (const name of UNIT_NAMES) {
    const u = await prisma.unit.create({ data: { name } });
    unitMap.set(name, u.id);
  }
  console.log(`   ${UNIT_NAMES.length} unidades criadas.`);

  // 3. Estrutura única (unit, department, jobTitle) a partir de PEOPLE
  const roleKeys = [...new Set(PEOPLE.map(p => roleKey(p.unit, p.department, p.jobTitle)))].sort();
  const deptKeys = [...new Set(PEOPLE.map(p => deptKey(p.unit, p.department)))].sort();

  const deptMap = new Map<string, string>();
  for (const key of deptKeys) {
    const [unitName, deptName] = key.split('::');
    const unitId = unitMap.get(unitName);
    if (!unitId) continue;
    const d = await prisma.department.create({ data: { name: deptName, unitId } });
    deptMap.set(key, d.id);
  }
  console.log(`   ${deptMap.size} departamentos criados.`);

  // Código KBS por (dept, roleName): pegar da primeira KIT_ENTRY com esse par
  const codeByDeptRole = new Map<string, string>();
  for (const k of KIT_ENTRIES) {
    const key = `${k.dept}::${k.roleName}`;
    if (!codeByDeptRole.has(key)) codeByDeptRole.set(key, k.code);
  }

  // 4. Criar Roles (com code quando existir no KBS)
  const roleByDeptNameAndRoleName = new Map<string, string>();
  for (const key of roleKeys) {
    const parts = key.split('::');
    const unitName = parts[0];
    const deptName = parts[1];
    const jobTitle = parts.slice(2).join('::');
    const dKey = deptKey(unitName, deptName);
    const departmentId = deptMap.get(dKey);
    if (!departmentId) continue;
    const code = codeByDeptRole.get(`${deptName}::${jobTitle}`) ?? null;
    const role = await prisma.role.create({
      data: { name: jobTitle, departmentId, code: code ?? undefined },
    });
    roleByDeptNameAndRoleName.set(`${deptName}::${jobTitle}`, role.id);
  }
  console.log(`   ${roleKeys.length} cargos (roles) criados.`);

  // 5. Upsert Users por email (unit, department, jobTitle)
  let created = 0;
  let updated = 0;
  for (const p of PEOPLE) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } });
    const roleId = roleByDeptNameAndRoleName.get(`${p.department}::${p.jobTitle}`) ?? null;
    if (existing) {
      await prisma.user.update({
        where: { email: p.email },
        data: {
          name: p.name,
          unit: p.unit,
          department: p.department,
          jobTitle: p.jobTitle,
          roleId: roleId ?? undefined,
        },
      });
      updated++;
    } else {
      await prisma.user.create({
        data: {
          name: p.name,
          email: p.email,
          unit: p.unit,
          department: p.department,
          jobTitle: p.jobTitle,
          roleId: roleId ?? undefined,
          systemProfile: 'VIEWER',
        },
      });
      created++;
    }
  }
  console.log(`   Usuários: ${created} criados, ${updated} atualizados.`);

  // 6. RoleKitItem: para cada KIT_ENTRY, encontrar role por (dept, roleName) e criar item
  let kitCount = 0;
  for (const k of KIT_ENTRIES) {
    const roleId = roleByDeptNameAndRoleName.get(`${k.dept}::${k.roleName}`);
    if (!roleId) continue;
    await prisma.roleKitItem.create({
      data: {
        roleId,
        toolCode: k.toolCode,
        toolName: k.toolName,
        accessLevelDesc: k.accessLevelDesc,
      },
    });
    kitCount++;
  }
  console.log(`   ${kitCount} itens de ferramentas (RoleKitItem) vinculados aos cargos.`);

  console.log('✅ Seed Master concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
