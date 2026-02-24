/**
 * Seed: Estrutura KBS — Departamentos e Cargos
 * Substitui a estrutura de Gestão de Pessoas pelos departamentos e cargos do KBS.
 * Não altera usuários; remove apenas departamentos, cargos e kits.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEPARTMENTS_AND_ROLES: { dept: string; roles: { code: string; name: string }[] }[] = [
  { dept: 'Board', roles: [
    { code: 'KBS-BO-1', name: 'CEO' },
    { code: 'KBS-BO-2', name: 'CMO' },
    { code: 'KBS-BO-3', name: 'CPOX' },
    { code: 'KBS-BO-4', name: 'CPO' },
    { code: 'KBS-BO-5', name: 'COO' },
    { code: 'KBS-BO-6', name: 'CTO' },
    { code: 'KBS-BO-7', name: 'CFO' },
    { code: 'KBS-BO-8', name: 'CSO' },
  ]},
  { dept: 'Tecnologia e Segurança', roles: [
    { code: 'KBS-SI-1', name: 'Gestor de Segurança da Informação' },
    { code: 'KBS-SI-2', name: 'Analista de Segurança da Informação e Infraestrutura' },
    { code: 'KBS-SI-3', name: 'Analista de Custos' },
    { code: 'KBS-SI-4', name: 'DevOps' },
  ]},
  { dept: 'Administrativo', roles: [
    { code: 'KBS-AD-1', name: 'Analista Contábil' },
    { code: 'KBS-AD-2', name: 'Assistente Jurídico' },
    { code: 'KBS-AD-3', name: 'Analista de Departamento Pessoal' },
    { code: 'KBS-AD-4', name: 'Assistente Financeiro' },
  ]},
  { dept: 'Comercial', roles: [
    { code: 'KBS-CO-1', name: 'Líder de Vendas PME' },
    { code: 'KBS-CO-2', name: 'Head Comercial' },
    { code: 'KBS-CO-3', name: 'Líder de Enterprise' },
    { code: 'KBS-CO-4', name: 'Líder de Expansão' },
    { code: 'KBS-CO-5', name: 'Backoffice' },
    { code: 'KBS-CO-6', name: 'Closer PME' },
    { code: 'KBS-CO-7', name: 'Closer de Comercial Contact' },
    { code: 'KBS-CO-8', name: 'Analista de Expansão' },
    { code: 'KBS-CO-9', name: 'SalesOps' },
    { code: 'KBS-CO-10', name: 'Closer Dizify' },
    { code: 'KBS-CO-11', name: 'Customer Success - Recuperação' },
  ]},
  { dept: 'Instituto 3C', roles: [
    { code: 'KBS-IN-1', name: 'Coordenadora do Instituto 3C' },
    { code: 'KBS-IN-2', name: 'Assistente de recrutamento e seleção' },
    { code: 'KBS-IN-3', name: 'Monitor Instituto 3C' },
  ]},
  { dept: 'Atendimento', roles: [
    { code: 'KBS-AT-1', name: 'Líder de Atendimento ao Cliente' },
    { code: 'KBS-AT-2', name: 'Analista de Implantação' },
    { code: 'KBS-AT-3', name: 'Customer Success' },
    { code: 'KBS-AT-4', name: 'Analista de Automações' },
    { code: 'KBS-AT-5', name: 'Analista de Projetos' },
    { code: 'KBS-AT-6', name: 'Analista de suporte técnico - FiqOn' },
    { code: 'KBS-AT-7', name: 'Gestor de Projetos' },
  ]},
  { dept: 'Marketing', roles: [
    { code: 'KBS-MK-1', name: 'Líder de Marketing' },
    { code: 'KBS-MK-2', name: 'Líder de Parcerias' },
    { code: 'KBS-MK-3', name: 'Gestor de Projetos - Marketing' },
    { code: 'KBS-MK-4', name: 'Gestor de Tráfego Pago' },
    { code: 'KBS-MK-5', name: 'Copywriter' },
    { code: 'KBS-MK-6', name: 'Marketing Ops / Analista de Growth' },
    { code: 'KBS-MK-7', name: 'Designer' },
    { code: 'KBS-MK-8', name: 'Social Media' },
    { code: 'KBS-MK-9', name: 'Filmmaker' },
    { code: 'KBS-MK-10', name: 'Web Developer' },
    { code: 'KBS-MK-11', name: 'Assistente de Parcerias' },
    { code: 'KBS-MK-12', name: 'Editor' },
    { code: 'KBS-MK-13', name: 'Porta voz da marca' },
  ]},
  { dept: 'Operações', roles: [
    { code: 'KBS-OP-1', name: 'Gestor de Projetos - Operações' },
  ]},
  { dept: 'Pessoas e Performance', roles: [
    { code: 'KBS-PC-1', name: 'Analista de Pessoas e Performance' },
    { code: 'KBS-PC-2', name: 'Analista de Recrutamento e Seleção' },
    { code: 'KBS-PC-3', name: 'Assistente Geral' },
    { code: 'KBS-PC-4', name: 'Porteiro' },
  ]},
  { dept: 'Produto & Desenvolvimento', roles: [
    { code: 'KBS-PD-1', name: 'Tech Lead 3C' },
    { code: 'KBS-PD-2', name: 'Tech Lead Evolux' },
    { code: 'KBS-PD-3', name: 'Tech Lead FiqOn' },
    { code: 'KBS-PD-4', name: 'Tech Lead Dizify' },
    { code: 'KBS-PD-5', name: 'Desenvolvedor Full-stack - 3C+' },
    { code: 'KBS-PD-6', name: 'PO - Analista de Negócios 3C e Evolux' },
    { code: 'KBS-PD-7', name: 'UX 3C e Evolux' },
    { code: 'KBS-PD-8', name: 'Desenvolvedor Full-stack Dizparos e Niah' },
    { code: 'KBS-PD-9', name: 'Desenvolvedor Front-End Evolux' },
    { code: 'KBS-PD-10', name: 'Desenvolvedor Back-End Evolux' },
    { code: 'KBS-PD-11', name: 'DevOps Evolux' },
    { code: 'KBS-PD-12', name: 'Desenvolvedor Back-End Dizify' },
    { code: 'KBS-PD-13', name: 'Desenvolvedor Front-End Dizify' },
    { code: 'KBS-PD-14', name: 'Desenvolvedor Back-End - FiqOn' },
    { code: 'KBS-PD-15', name: 'Desenvolvedor Front-End FiqOn' },
  ]},
  { dept: 'RevOps', roles: [
    { code: 'KBS-RA-1', name: 'Líder de RevOps' },
    { code: 'KBS-RA-2', name: 'Analista de RevOps' },
  ]},
  { dept: 'Professional Service', roles: [
    { code: 'KBS-PS-1', name: 'Analista de Projetos' },
    { code: 'KBS-PS-2', name: 'Gestor de Projetos' },
  ]},
  { dept: 'Expansão', roles: [
    { code: 'KBS-EX-1', name: 'Líder de Expansão' },
    { code: 'KBS-EX-2', name: 'Analista de Expansão' },
  ]},
  { dept: 'Comercial Contact', roles: [
    { code: 'KBS-CC-1', name: 'Closer' },
    { code: 'KBS-CC-2', name: 'Líder de Vendas PME' },
  ]},
  { dept: 'Parcerias', roles: [
    { code: 'KBS-PA-1', name: 'Líder de Parcerias' },
    { code: 'KBS-PA-2', name: 'Assistente de Parcerias' },
  ]},
  { dept: 'Dizify', roles: [
    { code: 'KBS-DZ-1', name: 'CEO Dizify' },
    { code: 'KBS-DZ-2', name: 'Closer Dizify' },
  ]},
];

async function main() {
  console.log('🌱 Seed estrutura KBS — removendo estrutura antiga e criando departamentos e cargos...');

  await prisma.roleKitItem.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.department.deleteMany({});

  console.log('   Estrutura antiga removida.');

  for (const { dept: deptName, roles } of DEPARTMENTS_AND_ROLES) {
    const dept = await prisma.department.create({ data: { name: deptName } });
    for (const r of roles) {
      await prisma.role.create({
        data: { name: r.name, code: r.code, departmentId: dept.id },
      });
    }
    console.log(`   ${deptName}: ${roles.length} cargos`);
  }

  console.log('✅ Estrutura KBS criada.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
