/**
 * Seed: Estrutura Unit -> Department -> Role
 * Apaga dados antigos de estrutura e recria com a hierarquia:
 * Unidades: 3C+, Evolux, Dizify, Instituto 3C, FiqOn, Dizparos
 * Departamentos e cargos conforme a lista do Luan (extraída de seed_gestao_por_unidade).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UNIT_NAMES = ['3C+', 'Evolux', 'Dizify', 'Instituto 3C', 'FiqOn', 'Dizparos'] as const;

// (unit, department, jobTitle) — mesma hierarquia da lista oficial (sem nome/email)
const ROWS: { unit: string; department: string; jobTitle: string }[] = [
  { unit: '3C+', department: 'Board', jobTitle: 'CEO' },
  { unit: '3C+', department: 'Board', jobTitle: 'CFO' },
  { unit: '3C+', department: 'Board', jobTitle: 'CMO' },
  { unit: '3C+', department: 'Board', jobTitle: 'COO' },
  { unit: '3C+', department: 'Board', jobTitle: 'CPO' },
  { unit: '3C+', department: 'Board', jobTitle: 'CPOX' },
  { unit: '3C+', department: 'Board', jobTitle: 'CSO' },
  { unit: '3C+', department: 'Board', jobTitle: 'CTO' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'Analista de Custos / Telecom' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'Analista de SI e Infraestrutura' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'Assistente de Segurança da Informação' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'DevOps' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'Líder de Segurança da Informação' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista Contábil' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista de Departamento Pessoal' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista Financeiro' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista Jurídico' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Assistente Jurídico' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Copywriter' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Designer' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Editor de Vídeos' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Filmmaker' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Gestor de Projetos' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Gestor de Tráfego Pago' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Líder de Marketing' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Marketing Ops / Analista de Growth' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Porta voz da marca' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Social Media' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Web Developer' },
  { unit: '3C+', department: 'Parcerias', jobTitle: 'Líder de Parcerias' },
  { unit: '3C+', department: 'Parcerias', jobTitle: 'Assistente de Parcerias' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Backoffice' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Head Comercial' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Líder de Enterprise' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Líder de Vendas PME' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Analista de Expansão' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Customer Success - Recuperação' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Líder de Expansão' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Analista de Automações' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Analista de Implantação' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Customer Success' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Líder de Atendimento ao Cliente' },
  { unit: '3C+', department: 'Professional Service', jobTitle: 'Analista de Automações' },
  { unit: '3C+', department: 'Professional Service', jobTitle: 'Analista de Projetos' },
  { unit: '3C+', department: 'Professional Service', jobTitle: 'Gestor de Projetos' },
  { unit: '3C+', department: 'Operações', jobTitle: 'Gestor de Projetos' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Analista de Pessoas e Performance' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Analista de Recrutamento e Seleção' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Assistente Geral' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Porteiro' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Zeladora' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Analista de Negócios (PO)' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Desenvolvedor Full Stack' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Tech Lead' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'UX Designer' },
  { unit: '3C+', department: 'RevOps', jobTitle: 'Analista de Automações' },
  { unit: '3C+', department: 'RevOps', jobTitle: 'Líder de RevOps' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'Desenvolvedor Back-End' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'Desenvolvedor Full Stack' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'DevOps' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'Tech Lead' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'CEO' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Capitão Comercial' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Closer' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Desenvolvedor Back-End' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Tech Lead' },
  { unit: 'Instituto 3C', department: 'Instituto 3C', jobTitle: 'Assistente de Recrutamento e Seleção' },
  { unit: 'Instituto 3C', department: 'Instituto 3C', jobTitle: 'Coordenadora do Instituto 3C' },
  { unit: 'Instituto 3C', department: 'Instituto 3C', jobTitle: 'Monitor Instituto 3C' },
  { unit: 'FiqOn', department: 'Produto FiqOn', jobTitle: 'Desenvolvedor Full Stack' },
  { unit: 'FiqOn', department: 'Produto FiqOn', jobTitle: 'Tech Lead' },
  { unit: 'Dizparos', department: 'Produto Dizparos', jobTitle: 'Desenvolvedor Full Stack' },
];

async function main() {
  console.log('🌱 Seed Units — apagando estrutura antiga e recriando Unit -> Department -> Role');

  if (!(prisma as any).unit) {
    throw new Error('Prisma client sem model Unit. Rode: npx prisma generate');
  }

  // 1. Apagar na ordem das FKs (RoleKitItem -> Role -> Department -> Unit)
  await prisma.roleKitItem.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.unit.deleteMany({});

  // 2. Criar Unidades
  const unitOrder = [...UNIT_NAMES];
  const unitMap = new Map<string, string>();
  for (const name of unitOrder) {
    const u = await prisma.unit.create({ data: { name } });
    unitMap.set(name, u.id);
  }
  console.log(`   ${unitOrder.length} unidades criadas: ${unitOrder.join(', ')}.`);

  // 3. Por unidade, departamentos únicos
  const deptKey = (unit: string, name: string) => `${unit}::${name}`;
  const deptKeys = [...new Set(ROWS.map(r => deptKey(r.unit, r.department)))];
  const deptMap = new Map<string, string>();
  for (const key of deptKeys.sort()) {
    const [unitName, deptName] = key.split('::');
    const unitId = unitMap.get(unitName);
    if (!unitId) continue;
    const d = await prisma.department.create({ data: { name: deptName, unitId } });
    deptMap.set(key, d.id);
  }
  console.log(`   ${deptMap.size} departamentos criados.`);

  // 4. Por (unit, department, jobTitle) criar Role — em lote para evitar timeout
  const roleKey = (unit: string, dept: string, job: string) => `${unit}::${dept}::${job}`;
  const roleKeys = [...new Set(ROWS.map(r => roleKey(r.unit, r.department, r.jobTitle)))].sort();
  const roleData: { name: string; departmentId: string }[] = [];
  for (const key of roleKeys) {
    const parts = key.split('::');
    const unitName = parts[0];
    const deptName = parts[1];
    const jobTitle = parts.slice(2).join('::');
    const dKey = deptKey(unitName, deptName);
    const departmentId = deptMap.get(dKey);
    if (!departmentId) continue;
    roleData.push({ name: jobTitle, departmentId });
  }
  if (roleData.length > 0) {
    await prisma.role.createMany({ data: roleData });
  }
  console.log(`   ${roleData.length} cargos (roles) criados.`);

  console.log('✅ Seed Units concluído.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
