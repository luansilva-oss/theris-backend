/**
 * Seed: Kit Básico por Cargo (KBS)
 * Cria/atualiza departamentos, cargos (com code) e os itens do kit de cada cargo.
 * Executar: npx ts-node prisma/seed_role_kits.ts
 * ou: npx tsx prisma/seed_role_kits.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type KitItem = {
  toolCode: string;
  toolName: string;
  accessLevelDesc: string;
  criticality: string;
  isCritical: boolean;
};

type RoleKitInput = {
  departmentName: string;
  roleCode: string;
  roleName: string;
  tools: KitItem[];
};

const ROLE_KITS: RoleKitInput[] = [
  // Board
  {
    departmentName: 'Board',
    roleCode: 'KBS-BO-1',
    roleName: 'CEO',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-1', toolName: 'ClickUp', accessLevelDesc: 'Administrador (Admin) do ClickUp', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CV-1', toolName: 'Convenia', accessLevelDesc: 'Owner do Convenia', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_OR-4', toolName: 'Oracle – Next Suit', accessLevelDesc: 'Executivo da Oracle', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Board',
    roleCode: 'KBS-BO-2',
    roleName: 'CMO',
    tools: [
      { toolCode: 'ap_CG-1', toolName: 'ChatGPT', accessLevelDesc: 'Proprietário do Chat GPT', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_GC-3', toolName: 'GCP', accessLevelDesc: 'Editor / Viewer / Usuário Padrão do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Board',
    roleCode: 'KBS-BO-3',
    roleName: 'CPOX',
    tools: [
      { toolCode: 'ap_CK-1', toolName: 'ClickUp', accessLevelDesc: 'Administrador (Admin) do ClickUp', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_FG-1', toolName: 'Figma', accessLevelDesc: 'Nível Full do Figma', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_MT-2', toolName: 'META', accessLevelDesc: 'Acesso Parcial - Básico da META', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Board',
    roleCode: 'KBS-BO-4',
    roleName: 'CPO',
    tools: [
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CV-1', toolName: 'Convenia', accessLevelDesc: 'Owner do Convenia', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Board',
    roleCode: 'KBS-BO-5',
    roleName: 'COO',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CG-2', toolName: 'ChatGPT', accessLevelDesc: 'Membro do Chat GPT', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CK-1', toolName: 'ClickUp', accessLevelDesc: 'Administrador (Admin) do ClickUp', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Board',
    roleCode: 'KBS-BO-6',
    roleName: 'CTO',
    tools: [
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AS-1', toolName: 'AWS', accessLevelDesc: 'Admin da AWS', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-1', toolName: 'ClickUp', accessLevelDesc: 'Administrador (Admin) do ClickUp', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_FU-1', toolName: 'Focus', accessLevelDesc: 'Administrador do Focus', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-1', toolName: 'GCP', accessLevelDesc: 'Owner do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-1', toolName: 'GitLab', accessLevelDesc: 'Administrador do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-5', toolName: 'HubSpot', accessLevelDesc: 'Nível personalizado do HubSpot', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_JC-1', toolName: 'JumpCloud', accessLevelDesc: 'Administrador With Billing do JumpCloud', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_RR-1', toolName: 'Router', accessLevelDesc: 'Administrador da ferramenta Router', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_VI-1', toolName: 'Vindi', accessLevelDesc: 'Administrador da Vindi', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Board',
    roleCode: 'KBS-BO-7',
    roleName: 'CFO',
    tools: [
      { toolCode: 'ap_CG-2', toolName: 'ChatGPT', accessLevelDesc: 'Membro do Chat GPT', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CS-2', toolName: 'ClickSign', accessLevelDesc: 'Membro da ferramenta ClickSign', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_FU-1', toolName: 'Focus', accessLevelDesc: 'Administrador do Focus', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_OR-1', toolName: 'Oracle – Next Suit', accessLevelDesc: 'Administrador da Oracle', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Board',
    roleCode: 'KBS-BO-8',
    roleName: 'CSO',
    tools: [
      { toolCode: 'ap_AE-2', toolName: 'Aplicação Evolux', accessLevelDesc: 'Tenant support da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CG-2', toolName: 'ChatGPT', accessLevelDesc: 'Membro do Chat GPT', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
    ],
  },
  // Tecnologia e Segurança (SI)
  {
    departmentName: 'Tecnologia e Segurança (SI)',
    roleCode: 'KBS-SI-1',
    roleName: 'Gestor de Segurança da Informação',
    tools: [
      { toolCode: 'ap_AS-1', toolName: 'AWS', accessLevelDesc: 'Admin da AWS', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-1', toolName: 'GCP', accessLevelDesc: 'Owner do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Grupo de Nível de Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_JC-1', toolName: 'JumpCloud', accessLevelDesc: 'Administrador With Billing do JumpCloud', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Tecnologia e Segurança (SI)',
    roleCode: 'KBS-SI-2',
    roleName: 'Analista de Segurança da Informação e Infraestrutura',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Grupo de Nível de Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_JC-1', toolName: 'JumpCloud', accessLevelDesc: 'Administrador With Billing do JumpCloud', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_NA-2', toolName: 'n8n', accessLevelDesc: 'Membro do n8n', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Tecnologia e Segurança (SI)',
    roleCode: 'KBS-SI-3',
    roleName: 'Analista de Custos',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-1', toolName: 'GCP', accessLevelDesc: 'Owner do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-4', toolName: 'HubSpot', accessLevelDesc: 'Atendimento ao Cliente do HubSpot', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_RR-2', toolName: 'Router', accessLevelDesc: 'Equipe Telecom da ferramenta Router', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_VI-2', toolName: 'Vindi', accessLevelDesc: 'Gestor da Vindi', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Tecnologia e Segurança (SI)',
    roleCode: 'KBS-SI-4',
    roleName: 'DevOps',
    tools: [
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AS-1', toolName: 'AWS', accessLevelDesc: 'Admin da AWS', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_GL-1', toolName: 'GitLab', accessLevelDesc: 'Administrador do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
    ],
  },
  // Administrativo (AD)
  {
    departmentName: 'Administrativo (AD)',
    roleCode: 'KBS-AD-1',
    roleName: 'Analista Contábil',
    tools: [
      { toolCode: 'ap_OR-2', toolName: 'Oracle – Next Suit', accessLevelDesc: 'Analista Fiscal / Comprador / Controller da Oracle', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Administrativo (AD)',
    roleCode: 'KBS-AD-2',
    roleName: 'Assistente Jurídico',
    tools: [
      { toolCode: 'ap_CS-2', toolName: 'ClickSign', accessLevelDesc: 'Membro da ferramenta ClickSign', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Administrativo (AD)',
    roleCode: 'KBS-AD-3',
    roleName: 'Analista de Departamento Pessoal',
    tools: [
      { toolCode: 'ap_CS-2', toolName: 'ClickSign', accessLevelDesc: 'Membro da ferramenta ClickSign', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CV-1', toolName: 'Convenia', accessLevelDesc: 'Owner do Convenia', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Administrativo (AD)',
    roleCode: 'KBS-AD-4',
    roleName: 'Assistente Financeiro',
    tools: [
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CS-1', toolName: 'ClickSign', accessLevelDesc: 'Administrador da ferramenta ClickSign', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_FU-1', toolName: 'Focus', accessLevelDesc: 'Administrador do Focus', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_OR-1', toolName: 'Oracle – Next Suit', accessLevelDesc: 'Administrador da Oracle', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_OR-2', toolName: 'Oracle – Next Suit', accessLevelDesc: 'Analista Fiscal / Comprador / Controller da Oracle', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_VI-1', toolName: 'Vindi', accessLevelDesc: 'Administrador da Vindi', criticality: 'Alta', isCritical: true },
    ],
  },
  // Comercial (CO) - KBS-CO-1 a KBS-CO-11
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-1',
    roleName: 'Líder de Vendas PME',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-2', toolName: 'HubSpot', accessLevelDesc: 'Líder Comercial do HubSpot', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-2',
    roleName: 'Head Comercial',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-2', toolName: 'HubSpot', accessLevelDesc: 'Líder Comercial do HubSpot', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-3',
    roleName: 'Líder de Enterprise',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-2', toolName: 'HubSpot', accessLevelDesc: 'Líder Comercial do HubSpot', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-4',
    roleName: 'Líder de Expansão',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-2', toolName: 'HubSpot', accessLevelDesc: 'Líder Comercial do HubSpot', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-5',
    roleName: 'Backoffice',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-6',
    roleName: 'Closer PME',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-7',
    roleName: 'Closer de Comercial Contact',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-8',
    roleName: 'Analista de Expansão',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-9',
    roleName: 'SalesOps',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-2', toolName: 'Aplicação Evolux', accessLevelDesc: 'Tenant support da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_VI-2', toolName: 'Vindi', accessLevelDesc: 'Gestor da Vindi', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-10',
    roleName: 'Closer Dizify',
    tools: [
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Comercial (CO)',
    roleCode: 'KBS-CO-11',
    roleName: 'Customer Success - Recuperação',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  // Instituto 3C (IN)
  {
    departmentName: 'Instituto 3C (IN)',
    roleCode: 'KBS-IN-1',
    roleName: 'Coordenadora do Instituto 3C',
    tools: [
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Instituto 3C (IN)',
    roleCode: 'KBS-IN-2',
    roleName: 'Assistente de recrutamente e seleção',
    tools: [],
  },
  {
    departmentName: 'Instituto 3C (IN)',
    roleCode: 'KBS-IN-3',
    roleName: 'Monitor Instituto 3C',
    tools: [],
  },
  // Atendimento (AT)
  {
    departmentName: 'Atendimento (AT)',
    roleCode: 'KBS-AT-1',
    roleName: 'Líder de Atendimento ao Cliente',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_RR-2', toolName: 'Router', accessLevelDesc: 'Equipe Telecom da ferramenta Router', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_VI-1', toolName: 'Vindi', accessLevelDesc: 'Administrador da Vindi', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Atendimento (AT)',
    roleCode: 'KBS-AT-2',
    roleName: 'Analista de Implantação',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Atendimento (AT)',
    roleCode: 'KBS-AT-3',
    roleName: 'Customer Success',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-4', toolName: 'HubSpot', accessLevelDesc: 'Atendimento ao Cliente do HubSpot', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_VI-2', toolName: 'Vindi', accessLevelDesc: 'Gestor da Vindi', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Atendimento (AT)',
    roleCode: 'KBS-AT-4',
    roleName: 'Analista de Automações',
    tools: [
      { toolCode: 'ap_A3-2', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 2 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AS-2', toolName: 'AWS', accessLevelDesc: 'SysAdmin da AWS', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CG-2', toolName: 'ChatGPT', accessLevelDesc: 'Membro do Chat GPT', criticality: 'Média', isCritical: false },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_MT-1', toolName: 'META', accessLevelDesc: 'Business manager do META', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_NA-2', toolName: 'n8n', accessLevelDesc: 'Membro do n8n', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_RR-2', toolName: 'Router', accessLevelDesc: 'Equipe Telecom da ferramenta Router', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Atendimento (AT)',
    roleCode: 'KBS-AT-5',
    roleName: 'Analista de Projetos',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-3', toolName: 'GCP', accessLevelDesc: 'Editor / Viewer / Usuário Padrão do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Atendimento (AT)',
    roleCode: 'KBS-AT-6',
    roleName: 'Analista de suporte técnico - FiqOn',
    tools: [
      { toolCode: 'ap_FQ-1', toolName: 'FiqOn', accessLevelDesc: 'Administador da FiqOn', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Atendimento (AT)',
    roleCode: 'KBS-AT-7',
    roleName: 'Gestor de Projetos',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-3', toolName: 'GCP', accessLevelDesc: 'Editor / Viewer / Usuário Padrão do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
    ],
  },
  // Marketing (MK) - resumido; alguns cargos com kit vazio
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-1',
    roleName: 'Líder de Marketing',
    tools: [
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_MT-1', toolName: 'META', accessLevelDesc: 'Business manager do META', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-2',
    roleName: 'Líder de Parcerias',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-2', toolName: 'Aplicação Evolux', accessLevelDesc: 'Tenant support da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CG-2', toolName: 'ChatGPT', accessLevelDesc: 'Membro do Chat GPT', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_HS-2', toolName: 'HubSpot', accessLevelDesc: 'Líder Comercial do HubSpot', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_VI-3', toolName: 'Vindi', accessLevelDesc: 'Observador da Vindi', criticality: 'Baixa', isCritical: false },
    ],
  },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-3',
    roleName: 'Gestor de Projetos - Marketing',
    tools: [
      { toolCode: 'ap_CK-1', toolName: 'ClickUp', accessLevelDesc: 'Administrador (Admin) do ClickUp', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_FG-3', toolName: 'Figma', accessLevelDesc: 'Collab do Figma', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_HS-4', toolName: 'HubSpot', accessLevelDesc: 'Atendimento ao Cliente do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-4',
    roleName: 'Gestor de Tráfego Pago',
    tools: [
      { toolCode: 'ap_MT-1', toolName: 'META', accessLevelDesc: 'Business manager do META', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-5',
    roleName: 'Copywriter',
    tools: [
      { toolCode: 'ap_FG-3', toolName: 'Figma', accessLevelDesc: 'Collab do Figma', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_MT-1', toolName: 'META', accessLevelDesc: 'Business manager do META', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-6',
    roleName: 'Marketing Ops / Analista de Growth',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_FG-3', toolName: 'Figma', accessLevelDesc: 'Collab do Figma', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_MT-1', toolName: 'META', accessLevelDesc: 'Business manager do META', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-7',
    roleName: 'Designer',
    tools: [
      { toolCode: 'ap_MT-3', toolName: 'META', accessLevelDesc: 'Acesso Parcial - Básico, Apps e Integrações da META', criticality: 'Média', isCritical: false },
    ],
  },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-8',
    roleName: 'Social Media',
    tools: [
      { toolCode: 'ap_MT-2', toolName: 'META', accessLevelDesc: 'Acesso Parcial - Básico da META', criticality: 'Média', isCritical: false },
    ],
  },
  { departmentName: 'Marketing (MK)', roleCode: 'KBS-MK-9', roleName: 'Filmmaker', tools: [] },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-10',
    roleName: 'Web Developer',
    tools: [
      { toolCode: 'ap_FG-2', toolName: 'Figma', accessLevelDesc: 'Dev do Figma', criticality: 'Média', isCritical: false },
    ],
  },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-11',
    roleName: 'Assistente de Parcerias',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  { departmentName: 'Marketing (MK)', roleCode: 'KBS-MK-12', roleName: 'Editor', tools: [] },
  {
    departmentName: 'Marketing (MK)',
    roleCode: 'KBS-MK-13',
    roleName: 'Porta voz da marca',
    tools: [
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
    ],
  },
  // Operações (OP)
  {
    departmentName: 'Operações (OP)',
    roleCode: 'KBS-OP-1',
    roleName: 'Gestor de Projetos - Operações',
    tools: [
      { toolCode: 'ap_CK-1', toolName: 'ClickUp', accessLevelDesc: 'Administrador (Admin) do ClickUp', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-3', toolName: 'GCP', accessLevelDesc: 'Editor / Viewer / Usuário Padrão do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_NA-2', toolName: 'n8n', accessLevelDesc: 'Membro do n8n', criticality: 'Alta', isCritical: true },
    ],
  },
  // Pessoas & perfomance (PC)
  {
    departmentName: 'Pessoas & perfomance (PC)',
    roleCode: 'KBS-PC-1',
    roleName: 'Analista de Pessoas e Performance',
    tools: [
      { toolCode: 'ap_CK-1', toolName: 'ClickUp', accessLevelDesc: 'Administrador (Admin) do ClickUp', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CV-2', toolName: 'Convenia', accessLevelDesc: 'Pessoas e Cultura do Convenia', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Grupo de Nível de Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_JC-2', toolName: 'JumpCloud', accessLevelDesc: 'Manager do JumpCloud', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Pessoas & perfomance (PC)',
    roleCode: 'KBS-PC-2',
    roleName: 'Analista de Recrutamento e Seleção',
    tools: [
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CV-2', toolName: 'Convenia', accessLevelDesc: 'Pessoas e Cultura do Convenia', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Pessoas & perfomance (PC)',
    roleCode: 'KBS-PC-3',
    roleName: 'Assistente Geral',
    tools: [
      { toolCode: 'ap_OR-3', toolName: 'Oracle – Next Suit', accessLevelDesc: 'Comprador da Oracle', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Pessoas & perfomance (PC)',
    roleCode: 'KBS-PC-4',
    roleName: 'Porteiro',
    tools: [
      { toolCode: 'ap_HC-1', toolName: 'Hik-Connect', accessLevelDesc: 'Grupo de Nível de Administrador da ferramenta Hik-Connect', criticality: 'Alta', isCritical: true },
    ],
  },
  // Produto & Desenvolvimento (PD) - primeiros cargos
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-1',
    roleName: 'Tech Lead 3C',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer / Analista', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_GL-1', toolName: 'GitLab', accessLevelDesc: 'Administrador do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_MT-1', toolName: 'META', accessLevelDesc: 'Business manager do META', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-2',
    roleName: 'Tech Lead Evolux',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-1', toolName: 'Aplicação Evolux', accessLevelDesc: 'Developer Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_AS-1', toolName: 'AWS', accessLevelDesc: 'Nível Admin', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer / Analista', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_GL-1', toolName: 'GitLab', accessLevelDesc: 'Administrador do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-3',
    roleName: 'Tech Lead FiqOn',
    tools: [
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer / Analista', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_FG-3', toolName: 'Figma', accessLevelDesc: 'Nível Collab do Figma', criticality: 'Média', isCritical: false },
      { toolCode: 'ap_FQ-1', toolName: 'FiqOn', accessLevelDesc: 'Administrador da FiqOn', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-1', toolName: 'GitLab', accessLevelDesc: 'Administrador do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-4',
    roleName: 'Tech Lead Dizify',
    tools: [
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
    ],
  },
  // PD-5 a PD-15 (resumido para caber)
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-5',
    roleName: 'Desenvolvedor Full-stack - 3C+',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-3', toolName: 'GCP', accessLevelDesc: 'Editor / Viewer / Usuário Padrão do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-3', toolName: 'HubSpot', accessLevelDesc: 'Closer/Analista do HubSpot', criticality: 'Média', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-6',
    roleName: 'PO - Analista de Negócios 3C e Evolux',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-3', toolName: 'Aplicação Evolux', accessLevelDesc: 'Support Group da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_FG-1', toolName: 'Figma', accessLevelDesc: 'Nível Full do Figma', criticality: 'Média', isCritical: false },
      { toolCode: 'ap_MT-1', toolName: 'META', accessLevelDesc: 'Business manager do META', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-7',
    roleName: 'UX 3C e Evolux',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_AE-2', toolName: 'Aplicação Evolux', accessLevelDesc: 'Tenant support da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_FG-1', toolName: 'Figma', accessLevelDesc: 'Nível Full do Figma', criticality: 'Média', isCritical: false },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-8',
    roleName: 'Desenvolvedor Full-stack Dizparos e Niah',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_MT-1', toolName: 'META', accessLevelDesc: 'Business manager do META', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-9',
    roleName: 'Desenvolvedor Front-End Evolux',
    tools: [
      { toolCode: 'ap_AE-2', toolName: 'Aplicação Evolux', accessLevelDesc: 'Tenant support da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-10',
    roleName: 'Desenvolvedor Back-End Evolux',
    tools: [
      { toolCode: 'ap_AE-2', toolName: 'Aplicação Evolux', accessLevelDesc: 'Tenant support da Aplicação da Evolux', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-11',
    roleName: 'DevOps Evolux',
    tools: [
      { toolCode: 'ap_AS-1', toolName: 'AWS', accessLevelDesc: 'Admin da AWS', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-1', toolName: 'GitLab', accessLevelDesc: 'Administrador do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-12',
    roleName: 'Desenvolvedor Back-End Dizify',
    tools: [
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-13',
    roleName: 'Desenvolvedor Front-End Dizify',
    tools: [
      { toolCode: 'ap_DZ-1', toolName: 'Dizify', accessLevelDesc: 'Administrador da ferramenta Dizify', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-14',
    roleName: 'Desenvolvedor Back-End - FiqOn',
    tools: [
      { toolCode: 'ap_FQ-1', toolName: 'FiqOn', accessLevelDesc: 'Administrador da FiqOn', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_MT-2', toolName: 'META', accessLevelDesc: 'Acesso Parcial - Básico da META', criticality: 'Média', isCritical: false },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'Produto & Desenvolvimento (PD)',
    roleCode: 'KBS-PD-15',
    roleName: 'Desenvolvedor Front-End FiqOn',
    tools: [
      { toolCode: 'ap_FQ-1', toolName: 'FiqOn', accessLevelDesc: 'Administrador da FiqOn', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
    ],
  },
  // RevOps (RA)
  {
    departmentName: 'RevOps (RA)',
    roleCode: 'KBS-RA-1',
    roleName: 'Líder de RevOps',
    tools: [
      { toolCode: 'ap_A3-3', toolName: 'Aplicação da 3C', accessLevelDesc: 'Administrador nível 3 da Aplicação da 3C', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_CG-1', toolName: 'ChatGPT', accessLevelDesc: 'Proprietário do Chat GPT', criticality: 'Alta', isCritical: false },
      { toolCode: 'ap_CK-1', toolName: 'ClickUp', accessLevelDesc: 'Administrador (Admin) do ClickUp', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-2', toolName: 'GCP', accessLevelDesc: 'Admin / BigQuery Admin / Data Owner do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_NA-1', toolName: 'n8n', accessLevelDesc: 'Owner do n8n', criticality: 'Alta', isCritical: true },
    ],
  },
  {
    departmentName: 'RevOps (RA)',
    roleCode: 'KBS-RA-2',
    roleName: 'Analista de RevOps',
    tools: [
      { toolCode: 'ap_MT-3', toolName: 'META', accessLevelDesc: 'Acesso Parcial - Básico, Apps e Integrações da META', criticality: 'Média', isCritical: false },
      { toolCode: 'ap_CG-2', toolName: 'ChatGPT', accessLevelDesc: 'Membro do Chat GPT', criticality: 'Média', isCritical: false },
      { toolCode: 'ap_CK-2', toolName: 'ClickUp', accessLevelDesc: 'Membro (Member)', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_CS-2', toolName: 'ClickSign', accessLevelDesc: 'Membro da ferramenta ClickSign', criticality: 'Média', isCritical: true },
      { toolCode: 'ap_GC-1', toolName: 'GCP', accessLevelDesc: 'Owner do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GC-2', toolName: 'GCP', accessLevelDesc: 'Admin / BigQuery Admin / Data Owner do GCP', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_GL-2', toolName: 'GitLab', accessLevelDesc: 'Regular do GitLab', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_HS-1', toolName: 'HubSpot', accessLevelDesc: 'Administrador do HubSpot', criticality: 'Alta', isCritical: true },
      { toolCode: 'ap_NA-2', toolName: 'n8n', accessLevelDesc: 'Membro do n8n', criticality: 'Alta', isCritical: true },
    ],
  },
];

async function main() {
  console.log('🌱 Seed: Kit Básico por Cargo (KBS)...\n');

  const deptNames = [...new Set(ROLE_KITS.map((r) => r.departmentName))];
  for (const name of deptNames) {
    await prisma.department.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  console.log(`✓ Departamentos: ${deptNames.length}`);

  let rolesCreated = 0;
  let kitsUpdated = 0;

  for (const input of ROLE_KITS) {
    const dept = await prisma.department.findUnique({ where: { name: input.departmentName } });
    if (!dept) {
      console.warn(`Departamento não encontrado: ${input.departmentName}`);
      continue;
    }

    let role = await prisma.role.findFirst({
      where: {
        OR: [
          { code: input.roleCode },
          { name: input.roleName, departmentId: dept.id },
        ],
      },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: input.roleName,
          code: input.roleCode,
          departmentId: dept.id,
        },
      });
      rolesCreated++;
    } else if (!role.code) {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { code: input.roleCode },
      });
    }

    await prisma.roleKitItem.deleteMany({ where: { roleId: role.id } });
    if (input.tools.length > 0) {
      await prisma.roleKitItem.createMany({
        data: input.tools.map((t) => ({
          roleId: role!.id,
          toolCode: t.toolCode,
          toolName: t.toolName,
          accessLevelDesc: t.accessLevelDesc,
          criticality: t.criticality,
          isCritical: t.isCritical,
        })),
      });
      kitsUpdated += input.tools.length;
    }
  }

  console.log(`✓ Cargos criados/atualizados: ${rolesCreated} novos`);
  console.log(`✓ Itens de kit inseridos: ${kitsUpdated} ferramentas`);
  console.log('\n✅ Seed role kits concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
