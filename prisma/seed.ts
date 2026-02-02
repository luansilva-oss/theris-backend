import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Função auxiliar para criar ou buscar usuário
async function upsertUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return await prisma.user.create({
    data: { email, name }
  });
}

async function main() {
  console.log('🌱 Iniciando Seed Completo (Dados Reais)...');

  // Limpar tudo
  await prisma.access.deleteMany();
  await prisma.request.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.department.deleteMany();

  // --- 1. LISTA MESTRA DE FERRAMENTAS ---
  const masterTools = [
    { name: 'Jumpcloud (JC)', owner: 'vladimir.sesar@grupo-3c.com', subOwner: 'luan.silva@grupo-3c.com', ownerName: 'Vladimir Sesar', subName: 'Luan Matheus' },
    { name: 'Clickup (CK)', owner: 'isabely.wendler@grupo-3c.com', subOwner: 'renata.czapiewski@grupo-3c.com', ownerName: 'Isabely Wendler', subName: 'Renata Czapiewski' },
    { name: 'Hubspot (HS)', owner: 'pablo.emanuel@grupo-3c.com', subOwner: 'deborah.peres@grupo-3c.com', ownerName: 'Pablo Emanuel', subName: 'Debora Peres' },
    { name: '3C Plus (CP)', owner: 'allan.portela@3cplusnow.com', subOwner: 'fernando.mosquer@grupo-3c.com', ownerName: 'Allan Portela', subName: 'Fernando Mosquer' },
    { name: 'Evolux (EX)', owner: 'carlos.marques@grupo-3c.com', subOwner: null, ownerName: 'Carlos Marques', subName: null },
    { name: 'Dizify (DZ)', owner: 'marieli.ferreira@grupo-3c.com', subOwner: 'jeferson.cruz@grupo-3c.com', ownerName: 'Marieli Thomen', subName: 'Jeferson Cruz' },
    { name: 'Netsuit (NS)', owner: 'aline.fonseca@3cplusnow.com', subOwner: 'fernando.takakusa@grupo-3c.com', ownerName: 'Aline Fonseca', subName: 'Fernando Takakusa' },
    { name: 'Gitlab (GL)', owner: 'diogo@3cplusnow.com', subOwner: 'joao.vasconcelos@grupo-3c.com', ownerName: 'Diogo Hartmann', subName: 'Joao Paulo' },
    { name: 'AWS (AS)', owner: 'carlos.marques@grupo-3c.com', subOwner: 'joao.vasconcelos@grupo-3c.com', ownerName: 'Carlos Marques', subName: 'Joao Paulo' },
    { name: 'GCP (GC)', owner: 'diogo@3cplusnow.com', subOwner: 'joao.vasconcelos@grupo-3c.com', ownerName: 'Diogo Hartmann', subName: 'Joao Paulo' },
    { name: 'Convenia (CV)', owner: 'raphael.pires@grupo-3c.com', subOwner: 'renata.czapiewski@grupo-3c.com', ownerName: 'Rapha Pires', subName: 'Renata Czapiewski' },
    { name: 'Clicsign (CS)', owner: 'fernando.takakusa@grupo-3c.com', subOwner: 'aline.fonseca@3cplusnow.com', ownerName: 'Fernando Takakusa', subName: 'Aline Fonseca' },
    { name: 'Meta (MT)', owner: 'rafael.schimanski@3cplusnow.com', subOwner: 'junior.andrade@grupo-3c.com', ownerName: 'Rafael Blaka', subName: 'Junior Andrade' },
    { name: 'Fiqon (FO)', owner: 'guilherme.pinheiro@grupo-3c.com', subOwner: 'lucas.matheus@grupo-3c.com', ownerName: 'Pinhas', subName: 'Lucas Matheus' },
    { name: 'N8N (NA)', owner: 'pablo.emanuel@grupo-3c.com', subOwner: 'eduardo.wosiak@grupo-3c.com', ownerName: 'Pablo Emanuel', subName: 'Eduardo Wosiak' },
    { name: 'Hik Connect (HC)', owner: 'vladimir.sesar@grupo-3c.com', subOwner: 'allan.vonstein@grupo-3c.com', ownerName: 'Vladimir Sesar', subName: 'Allan Von Stein' },
    { name: 'ChatGPT (CG)', owner: 'pablo.emanuel@3cplusnow.com', subOwner: 'wagner@3cplusnow.com', ownerName: 'Pablo Emanuel', subName: 'Wagner Wolff' },
    { name: 'Focus (FU)', owner: 'aline.fonseca@3cplusnow.com', subOwner: 'thiago.marcondes@grupo-3c.com', ownerName: 'Aline Fonseca', subName: 'Thiago Marcondes' },
    { name: 'Vindi (VI)', owner: 'pablo.emanuel@grupo-3c.com', subOwner: 'ian.ronska@grupo-3c.com', ownerName: 'Pablo Emanuel', subName: 'Ian Ronska' },
    { name: 'Nextrouter (NR)', owner: 'diogo@3cplusnow.com', subOwner: 'ian.ronska@grupo-3c.com', ownerName: 'Diogo Hartmann', subName: 'Ian Ronska' },
    { name: 'Figma (FA)', owner: 'gabriel.ida@grupo-3c.com', subOwner: null, ownerName: 'Gabriel Pires Ida', subName: null },
  ];

  // Map para guardar os IDs das ferramentas criadas
  const toolMap = new Map<string, string>();

  // 1. Criar Ferramentas e Owners/SubOwners
  for (const t of masterTools) {
    // Garante que owner existe
    const owner = await upsertUser(t.owner, t.ownerName);
    let subOwner = null;
    if (t.subOwner) {
      subOwner = await upsertUser(t.subOwner, t.subName || 'SubOwner');
    }

    const tool = await prisma.tool.create({
      data: {
        name: t.name,
        ownerId: owner.id,
        subOwnerId: subOwner?.id
      }
    });
    toolMap.set(t.name.split(' ')[0].toUpperCase(), tool.id); // Mapa por sigla/primeiro nome
    toolMap.set(t.name, tool.id);
  }

  // --- 2. LISTAS DETALHADAS DE USUÁRIOS (ACESSOS) ---
  // Estrutura: [Email, Nome, Role/Status, NomeDaFerramenta]
  const detailedAccess = [
    // FIGMA
    { t: 'Figma (FA)', e: 'gabriel.ida@grupo-3c.com', n: 'Gabriel Pires Ida', r: 'Full (Total)' },
    { t: 'Figma (FA)', e: 'front3c@grupo-3c.com', n: 'front3c', r: 'Full (Total)' },
    { t: 'Figma (FA)', e: 'guilherme.pimpao@grupo-3c.com', n: 'Guilherme Pimpão', r: 'Full (Total)' },
    { t: 'Figma (FA)', e: 'junior.andrade@grupo-3c.com', n: 'Junior Andrade', r: 'Full (Total)' },
    { t: 'Figma (FA)', e: 'gustavo.schneider@grupo-3c.com', n: 'Gustavo Schneider', r: 'Dev' },
    { t: 'Figma (FA)', e: 'igor.ribeiro@grupo-3c.com', n: 'Igor Ribeiro', r: 'Collab' },
    { t: 'Figma (FA)', e: 'leonardo.maciel@grupo-3c.com', n: 'Leonardo Maciel', r: 'Collab' },
    { t: 'Figma (FA)', e: 'rebeca.costa@grupo-3c.com', n: 'Rebeca Costa', r: 'Collab' },
    { t: 'Figma (FA)', e: 'guilherme.pinheiro@grupo-3c.com', n: 'Pinhas', r: 'Collab' },
    { t: 'Figma (FA)', e: 'diogo.hartmann@grupo-3c.com', n: 'Diogo Hartmann', r: 'View' },

    // 3C PLUS
    { t: '3C Plus (CP)', e: 'vladimir.sesar@grupo-3c.com', n: 'Vladimir Sesar', r: 'Nível 3 (CP - 1)' },
    { t: '3C Plus (CP)', e: 'carlos.marques@3cplusnow.com', n: 'Carlos Marques', r: 'Nível 3 (CP - 1)' },
    { t: '3C Plus (CP)', e: 'gabriel.ida@3cplusnow.com', n: 'Gabriel Ida', r: 'Nível 3 (CP - 1)' },
    { t: '3C Plus (CP)', e: 'joao.vasconcelos@grupo-3c.com', n: 'João Vasconcelos', r: 'Nível 3 (CP - 1)' },
    { t: '3C Plus (CP)', e: 'deborah.peres@3cplusnow.com', n: 'Deborah Peres', r: 'Nível 3 (CP - 1)' },
    { t: '3C Plus (CP)', e: 'pablo.emanuel1@3cplusnow.com', n: 'Pablo Emanuel', r: 'Nível 3 (CP - 1)' },
    { t: '3C Plus (CP)', e: 'diogo.hartmann@3cplusnow.com', n: 'Diogo Hartmann', r: 'Board (CP - 1)' },
    { t: '3C Plus (CP)', e: 'jose@3cplusnow.com', n: 'José Pablo', r: 'Admin / Elements' },
    { t: '3C Plus (CP)', e: 'allan.portela@3cplusnow.com', n: 'Allan Portela', r: 'Nível 2 (CP - 2)' },
    { t: '3C Plus (CP)', e: 'ian@3cplusnow.com', n: 'Ian Ronska', r: 'Nível 2 (CP - 2)' },
    { t: '3C Plus (CP)', e: 'fernando.mosquer@grupo-3c.com', n: 'Fernando Mosquer', r: 'Nível 2 (CP - 2)' },
    { t: '3C Plus (CP)', e: 'luan.silva@grupo-3c.com', n: 'Luan Matheus', r: 'Membro' },

    // GITLAB
    { t: 'Gitlab (GL)', e: 'bruno.levy@grupo-3c.com', n: 'Bruno Levy', r: 'Admin (GL-1)' },
    { t: 'Gitlab (GL)', e: 'carlos.marques@grupo-3c.com', n: 'Carlos Marques', r: 'Admin (GL-1)' },
    { t: 'Gitlab (GL)', e: 'diogo@3cplusnow.com', n: 'Diogo Hartmann', r: 'Admin (GL-1)' },
    { t: 'Gitlab (GL)', e: 'eric.patrick@grupo-3c.com', n: 'Eric Patrick', r: 'Admin (GL-1)' },
    { t: 'Gitlab (GL)', e: 'joao.vasconcelos@grupo-3c.com', n: 'João Vasconcelos', r: 'Admin (GL-1)' },
    { t: 'Gitlab (GL)', e: 'allan.oliveira@grupo-3c.com', n: 'Allan Oliveira', r: 'Regular (GL-2)' },
    { t: 'Gitlab (GL)', e: 'eduardo.wosiak@grupo-3c.com', n: 'Eduardo Wosiak', r: 'Regular (GL-2)' },
    { t: 'Gitlab (GL)', e: 'luan.silva@grupo-3c.com', n: 'Luan Matheus', r: 'Regular (GL-2)' },

    // CLICKUP
    { t: 'Clickup (CK)', e: 'ney.pereira@grupo-3c.com', n: 'Ney Pereira', r: 'Proprietário' },
    { t: 'Clickup (CK)', e: 'isabely.wendler@grupo-3c.com', n: 'Isabely Wendler', r: 'Admin' },
    { t: 'Clickup (CK)', e: 'pablo.emanuel@grupo-3c.com', n: 'Pablo Emanuel', r: 'Admin' },
    { t: 'Clickup (CK)', e: 'luan.silva@grupo-3c.com', n: 'Luan Matheus', r: 'Membro' },
    { t: 'Clickup (CK)', e: 'guilherme.pimpao@grupo-3c.com', n: 'Guilherme Pimpão', r: 'Admin' },

    // JUMPCLOUD
    { t: 'Jumpcloud (JC)', e: 'vladimir.sesar@grupo-3c.com', n: 'Vladimir Sesar', r: 'Admin Billing' },
    { t: 'Jumpcloud (JC)', e: 'diogo.hartmann@grupo-3c.com', n: 'Diogo Hartmann', r: 'Admin Billing' },
    { t: 'Jumpcloud (JC)', e: 'luan.silva@grupo-3c.com', n: 'Luan Matheus', r: 'Admin Billing' },
    { t: 'Jumpcloud (JC)', e: 'allan.vonstein@grupo-3c.com', n: 'Allan Von Stein', r: 'Admin Billing' },
    { t: 'Jumpcloud (JC)', e: 'renata.czapiewski@grupo-3c.com', n: 'Renata Czapiewski', r: 'Help Desk' },

    // NEXT ROUTER
    { t: 'Nextrouter (NR)', e: 'diogo@3cplusnow.com', n: 'Diogo Hartmann', r: 'Admin' },
    { t: 'Nextrouter (NR)', e: 'matheus.oliveira@grupo-3c.com', n: 'Matheus Oliveira', r: 'Admin' },
    { t: 'Nextrouter (NR)', e: 'ian.ronska@grupo-3c.com', n: 'Ian Ronska', r: 'Equipe Telecom' },
    { t: 'Nextrouter (NR)', e: 'pablo.emanuel@grupo-3c.com', n: 'Pablo Emanuel', r: 'Equipe Telecom' },

    // CLICSIGN
    { t: 'Clicsign (CS)', e: 'fernando.takakusa@grupo-3c.com', n: 'Fernando Takakusa', r: 'Admin' },
    { t: 'Clicsign (CS)', e: 'aline.fonseca@grupo-3c.com', n: 'Aline Fonseca', r: 'Membro' },

    // NETSUIT
    { t: 'Netsuit (NS)', e: 'aline.fonseca@3cplusnow.com', n: 'Aline Fonseca', r: 'Admin' },
    { t: 'Netsuit (NS)', e: 'stephany.moraes@grupo-3c.com', n: 'Stephany Moraes', r: 'Analista Fiscal' },

    // HIK CONNECT
    { t: 'Hik Connect (HC)', e: 'vladimir.sesar@grupo-3c.com', n: 'Vladimir Sesar', r: 'Admin' },
    { t: 'Hik Connect (HC)', e: 'luan.silva@grupo-3c.com', n: 'Luan Silva', r: 'Admin' },

    // N8N
    { t: 'N8N (NA)', e: 'pablo.emanuel@grupo-3c.com', n: 'Pablo Emanuel', r: 'Owner' },
    { t: 'N8N (NA)', e: 'eduardo.bueno@grupo-3c.com', n: 'Eduardo Bueno', r: 'Membro' },
    { t: 'N8N (NA)', e: 'ian.ronska@grupo-3c.com', n: 'Ian Ronska', r: 'Membro' },

    // META
    { t: 'Meta (MT)', e: 'rafael.schimanski@3cplusnow.com', n: 'Rafael Blaka', r: 'Business Manager' },
    { t: 'Meta (MT)', e: 'rebeca.costa@grupo-3c.com', n: 'Rebeca Costa', r: 'Business Manager' },

    // AWS
    { t: 'AWS (AS)', e: 'carlos.marques@grupo-3c.com', n: 'Carlos Marques', r: 'Console User' },
    { t: 'AWS (AS)', e: 'diogo.hartmann@grupo-3c.com', n: 'Diogo Hartmann', r: 'Console User' },
    { t: 'AWS (AS)', e: 'vladimir.sesar@grupo-3c.com', n: 'Vladimir Sesar', r: 'Console User' },

    // GCP
    { t: 'GCP (GC)', e: 'diogo.hartmann@grupo-3c.com', n: 'Diogo Hartmann', r: 'Owner' },
    { t: 'GCP (GC)', e: 'ian.ronska@grupo-3c.com', n: 'Ian Ronska', r: 'Owner' },
    { t: 'GCP (GC)', e: 'pablo.emanuel@grupo-3c.com', n: 'Pablo Emanuel', r: 'Admin / BigQuery' },

    // HUBSPOT
    { t: 'Hubspot (HS)', e: 'wagner.wolff@grupo-3c.com', n: 'Wagner Wolff', r: 'Admin' },
    { t: 'Hubspot (HS)', e: 'pablo.emanuel@grupo-3c.com', n: 'Pablo Emanuel', r: 'Admin' },
    { t: 'Hubspot (HS)', e: 'thomas.ferreira@grupo-3c.com', n: 'Thomas Ferreira', r: 'Líder Comercial' }
  ];

  // Processar inserções de Acesso
  for (const item of detailedAccess) {
    // 1. Garante User
    const user = await upsertUser(item.e, item.n);

    // 2. Acha a Ferramenta
    const toolId = toolMap.get(item.t);

    if (toolId) {
      // 3. Cria Acesso com a Role Específica
      await prisma.access.create({
        data: {
          userId: user.id,
          toolId: toolId,
          status: item.r // Usamos o campo status para guardar o Nome do Nível (Ex: "Full (FA-1)")
        }
      });
    }
  }

  console.log('🏁 Seed Concluído com Sucesso! Banco populado com lista oficial.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });