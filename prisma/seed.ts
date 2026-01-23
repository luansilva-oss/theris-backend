import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dados fornecidos (Estrutura Real Theris/Grupo 3C)
const EMPLOYEES = [
  // BOARD
  { name: 'Ney Eurico Pereira', role: 'CEO', dept: 'Board', manager: '' },
  { name: 'Wagner Wolff Pretto', role: 'CMO', dept: 'Board', manager: 'Ney Eurico Pereira' },
  { name: 'Lucas Limberger', role: 'CPO', dept: 'Board', manager: 'Ney Eurico Pereira' },
  { name: 'Ricardo Borges Camargo', role: 'COO', dept: 'Board', manager: 'Ney Eurico Pereira' },
  { name: 'Guilherme Pimpão Cavalcante', role: 'CPOX', dept: 'Board', manager: 'Ney Eurico Pereira' },
  { name: 'Diogo Henrique Hartmann', role: 'CTO', dept: 'Board', manager: 'Ney Eurico Pereira' },
  { name: 'Aline Alda da Fonseca Bocchi', role: 'CFO', dept: 'Board', manager: 'Ney Eurico Pereira' },
  { name: 'Jaqueline de Souza', role: 'CSO', dept: 'Board', manager: 'Ney Eurico Pereira' },

  // LIDERANÇAS GERAIS
  { name: 'Alexander Eduardo dos Reis', role: 'Líder de Professional Service', dept: 'Professional Service', manager: 'Ricardo Borges Camargo' },
  { name: 'Camila Brunetti Thomé', role: 'Líder de Farmer', dept: 'Comercial', manager: 'Camila Souza de Oliveira' },
  { name: 'Camila Souza de Oliveira', role: 'Head Comercial', dept: 'Comercial', manager: 'Jaqueline de Souza' },
  { name: 'Carlos Henrique Marques', role: 'Tech Lead', dept: 'Produto', manager: 'Guilherme Pimpão Cavalcante' },
  { name: 'Caroline Fatima de Gois Fila', role: 'Líder de Vendas PME', dept: 'Comercial', manager: 'Camila Souza de Oliveira' },
  { name: 'Emily Godoy Da Silva', role: 'Líder de Parcerias', dept: 'Parcerias', manager: 'Wagner Wolff Pretto' },
  { name: 'Gabriel Krysa', role: 'Tech Lead', dept: 'Produto', manager: 'Guilherme Pimpão Cavalcante' },
  { name: 'Jehnnifer Xavier Padilha', role: 'Líder de Enterprise', dept: 'Comercial', manager: 'Camila Souza de Oliveira' },
  { name: 'José Fernando Mosquer', role: 'Líder de Atendimento ao Cliente', dept: 'Atendimento ao Cliente', manager: 'Ricardo Borges Camargo' },
  { name: 'Kawanna Barbosa Cordeiro', role: 'Coordenadora do Instituto 3C', dept: 'Instituto 3C', manager: 'Lucas Limberger' },
  { name: 'Michele Bodot dos Anjos', role: 'Líder PME', dept: 'Comercial', manager: 'Ricardo Borges Camargo' },
  { name: 'Pablo Emanuel da Silva', role: 'Líder de automações', dept: 'Automações', manager: 'Ricardo Borges Camargo' },
  { name: 'Rafael Blaka Schimanski', role: 'Líder de marketing', dept: 'Marketing', manager: 'Wagner Wolff Pretto' },
  { name: 'Vladimir Antonio Sesar', role: 'Líder de Segurança da Informação', dept: 'Tecnologia e Segurança', manager: 'Diogo Henrique Hartmann' },
  { name: 'Guilherme Pinheiro', role: 'Head de Produto', dept: 'FiqOn', manager: 'Guilherme Pimpão Cavalcante' },
  { name: 'Pietro Limberger', role: 'CEO Dizify', dept: 'Dizify', manager: 'Lucas Limberger' },
  { name: 'Marieli Aparecida Ferreira Thomen', role: 'Tech Lead', dept: 'Produto', manager: 'Pietro Limberger' },

  // ADMINISTRATIVO
  { name: 'Bruno Sahaidak', role: 'Analista Contábil', dept: 'Administrativo', manager: 'Aline Alda da Fonseca Bocchi' },
  { name: 'Fernando Vantroba Takakusa', role: 'Assistente Financeiro', dept: 'Administrativo', manager: 'Aline Alda da Fonseca Bocchi' },
  { name: 'Gabriely Garcia', role: 'Assistente Jurídico', dept: 'Administrativo', manager: 'Aline Alda da Fonseca Bocchi' },
  { name: 'Maria Eduarda Nezelo Rosa', role: 'Assistente Jurídico', dept: 'Administrativo', manager: 'Aline Alda da Fonseca Bocchi' },
  { name: 'Raphael Pires Ida', role: 'Analista de Departamento Pessoal', dept: 'Administrativo', manager: 'Aline Alda da Fonseca Bocchi' },
  { name: 'Sthephany Tomacheski de Moraes', role: 'Assistente Financeiro', dept: 'Administrativo', manager: 'Aline Alda da Fonseca Bocchi' },

  // PRODUTO & TECH
  { name: 'Andrieli de Oliveira Javorski', role: 'Desenvolvedor Front-end', dept: 'Produto 3C+', manager: 'Gabriel Krysa' },
  { name: 'Matheus Rocha Camargo', role: 'Desenvolvedor Front-end', dept: 'Produto 3C+', manager: 'Gabriel Krysa' },
  { name: 'Bruno Garcia', role: 'Desenvolvedor Back-End', dept: 'Produto 3C+', manager: 'Gabriel Krysa' },
  { name: 'José Pablo Streiski Neto', role: 'Desenvolvedor Back-End', dept: 'Produto 3C+', manager: 'Gabriel Krysa' },
  { name: 'Eduardo Mateus dos Santos Gonçalves', role: 'Desenvolvedor Back-End', dept: 'Produto 3C+', manager: 'Gabriel Krysa' },
  { name: 'Sandra Mara Siqueira da Silva', role: 'QA', dept: 'Produto 3C+', manager: 'Gabriel Krysa' },
  { name: 'Gabriel Pires Ida', role: 'UX Designer', dept: 'Produto 3C+', manager: 'Carlos Henrique Marques' },
  { name: 'Vanderlei Assis de Andrade Junior', role: 'P.O', dept: 'Produto 3C+', manager: 'Carlos Henrique Marques' },
  { name: 'Matheus Oliveira', role: 'Analista de Automações', dept: 'Produto', manager: 'Guilherme Pimpão Cavalcante' },
  { name: 'Gustavo Delonzek Brizola', role: 'Desenvolvedor Full-stack', dept: 'Produto 3C+', manager: 'Gabriel Krysa' },

  // EVOLUX & FIQON & DIZIFY (TECH)
  { name: 'Luis Fernando Paganini', role: 'Desenvolvedor Front-end', dept: 'Produto Evolux', manager: 'Carlos Henrique Marques' },
  { name: 'Guilherme Ferreira Ribas', role: 'Desenvolvedor Front-end', dept: 'Produto Evolux', manager: 'Carlos Henrique Marques' },
  { name: 'Pedro Henrique Ferreira do Nascimento', role: 'Desenvolvedor Back-End', dept: 'Produto Evolux', manager: 'Carlos Henrique Marques' },
  { name: 'Bruno Levy de Arruda', role: 'DevOps', dept: 'Produto Evolux', manager: 'Carlos Henrique Marques' },
  { name: 'Lucas Schupchek de Jesus', role: 'Desenvolvedor Back-End', dept: 'Produto FiqOn', manager: 'Guilherme Pinheiro' },
  { name: 'Lucas Matheus da Cruz', role: 'Desenvolvedor Back-End', dept: 'Produto FiqOn', manager: 'Guilherme Pinheiro' },
  { name: 'Yuri Karas Regis Pacheco de Miranda Lima', role: 'Desenvolvedor Front-End', dept: 'Produto FiqOn', manager: 'Guilherme Pinheiro' },
  { name: 'Julia Gabrielly Martins Araujo', role: 'Desenvolvedor Back-End', dept: 'Produto Dizify', manager: 'Marieli Aparecida Ferreira Thomen' },
  { name: 'Maria Fernanda Ribeiro', role: 'Desenvolvedor Front-End', dept: 'Produto Dizify', manager: 'Marieli Aparecida Ferreira Thomen' },
  { name: 'Jeferson da Cruz', role: 'Desenvolvedor Back-End', dept: 'Produto Dizify', manager: 'Marieli Aparecida Ferreira Thomen' },

  // COMERCIAL & EXPANSÃO
  { name: 'Thomas Arnon Schmidt Ferreira', role: 'Líder Enterprise', dept: 'Comercial Contact', manager: 'Jaqueline de Souza' },
  { name: 'Leonardo Kauan Ferraz', role: 'Closer', dept: 'Comercial Contact', manager: 'Jehnnifer Xavier Padilha' },
  { name: 'André Luiz Paluski', role: 'Closer', dept: 'Comercial Contact', manager: 'Jehnnifer Xavier Padilha' },
  { name: 'Joyce Cordeiro', role: 'Closer', dept: 'Comercial Contact', manager: 'Jehnnifer Xavier Padilha' },
  { name: 'Kesley Luis de Oliveira', role: 'Closer', dept: 'Comercial Contact', manager: 'Jehnnifer Xavier Padilha' },
  { name: 'Rosiane Correa', role: 'Closer', dept: 'Comercial Contact', manager: 'Jehnnifer Xavier Padilha' },
  { name: 'Mateus Gerik', role: 'Closer', dept: 'Comercial Contact', manager: 'Jehnnifer Xavier Padilha' },
  { name: 'Lucio Marcos Nascimento Ramos', role: 'Closer', dept: 'Comercial Contact', manager: 'Thomas Arnon Schmidt Ferreira' },
  { name: 'Guilherme Mello Minuzzi', role: 'Closer', dept: 'Comercial Contact', manager: 'Thomas Arnon Schmidt Ferreira' },
  { name: 'Ketlin Tainá Zaluski de Oliveira', role: 'Closer', dept: 'Comercial Contact', manager: 'Thomas Arnon Schmidt Ferreira' },
  { name: 'Leandro dos Santos Mülhstdtt da Silva', role: 'Closer', dept: 'Comercial Contact', manager: 'Thomas Arnon Schmidt Ferreira' },
  { name: 'Gustavo dos Santos Dangui', role: 'Closer', dept: 'Comercial Contact', manager: 'Thomas Arnon Schmidt Ferreira' },
  { name: 'Willian Samuel de Oliveira', role: 'Closer', dept: 'Comercial Contact', manager: 'Thomas Arnon Schmidt Ferreira' },
  { name: 'Alexsandy Correa dos Santos', role: 'Closer', dept: 'Comercial Contact', manager: 'Thomas Arnon Schmidt Ferreira' },
  { name: 'Deborah Peres', role: 'SalesOps', dept: 'Comercial Contact', manager: 'Thomas Arnon Schmidt Ferreira' },
  { name: 'Maria Eduarda Merhet Padilha', role: 'Farmer', dept: 'Expansão', manager: 'Camila Brunetti Thomé' },
  { name: 'Daniel Felipe da Silva Souza', role: 'Farmer', dept: 'Expansão', manager: 'Camila Brunetti Thomé' },
  { name: 'Kauane Lemos Bastos', role: 'Farmer', dept: 'Expansão', manager: 'Camila Brunetti Thomé' },
  { name: 'Taissa Guilliane Gomes Almeida', role: 'Farmer', dept: 'Expansão', manager: 'Camila Brunetti Thomé' },

  // COMERCIAL PME
  { name: 'Rafaela Guedes Pinto Cavalcante Stephan', role: 'Closer', dept: 'Comercial Contact', manager: 'Michele Bodot dos Anjos' },
  { name: 'Cirene Laiza da Cruz Lara', role: 'Closer', dept: 'Comercial Contact', manager: 'Michele Bodot dos Anjos' },
  { name: 'Maycon José Barbosa Padilha', role: 'Closer', dept: 'Comercial Contact', manager: 'Michele Bodot dos Anjos' },
  { name: 'Lucas Fontoura de Almeida', role: 'Closer', dept: 'Comercial Contact', manager: 'Michele Bodot dos Anjos' },
  { name: 'Roberta Gomes Ribeiro', role: 'Closer', dept: 'Comercial Contact', manager: 'Michele Bodot dos Anjos' },
  { name: 'Lucas Antonio Costa', role: 'Closer', dept: 'Comercial Contact', manager: 'Michele Bodot dos Anjos' },
  { name: 'Gabriel Schneider Bernadini', role: 'Recuperador', dept: 'Comercial Contact', manager: 'Michele Bodot dos Anjos' },
  { name: 'Bianca da Cunha', role: 'Closer', dept: 'Comercial Contact', manager: 'Michele Bodot dos Anjos' },
  { name: 'Eduardo Elias', role: 'Closer', dept: 'Comercial Dizify', manager: 'Lucas Limberger' },
  { name: 'Taryk', role: 'Closer', dept: 'Comercial Dizify', manager: 'Lucas Limberger' },
  { name: 'Iago Moura do Prado', role: 'Closer', dept: 'Comercial Dizify', manager: 'Lucas Limberger' },

  // TECNOLOGIA E SEGURANÇA (INFRA)
  { name: 'Allan Von Stein Portela', role: 'Analista de Segurança e Infraestrutura', dept: 'Tecnologia e Segurança', manager: 'Vladimir Antonio Sesar' },
  { name: 'Luan Matheus da Silva', role: 'Analista de Segurança da Informação', dept: 'Tecnologia e Segurança', manager: 'Vladimir Antonio Sesar' },
  { name: 'Ian Ronska Nepomoceno', role: 'Analista de Custos', dept: 'Tecnologia e Segurança', manager: 'Diogo Henrique Hartmann' },
  { name: 'João Paulo Vasconcelos', role: 'DevOps', dept: 'Tecnologia e Segurança', manager: 'Diogo Henrique Hartmann' },

  // SERVICES & ATENDIMENTO
  { name: 'Gabriel de Lima Machado', role: 'Analista de PS', dept: 'Professional Service', manager: 'Alexander Eduardo dos Reis' },
  { name: 'Wesley Diogo do Vale', role: 'Analista de PS', dept: 'Professional Service', manager: 'Alexander Eduardo dos Reis' },
  { name: 'Eduardo Wosiak', role: 'Professional Service', dept: 'Professional Service', manager: 'Alexander Eduardo dos Reis' },
  { name: 'Felipe Moreira do Nascimento', role: 'Analista PME', dept: 'Atendimento ao Cliente', manager: 'José Fernando Mosquer' },
  { name: 'Filipe Ferreira Rovea', role: 'Analista PME', dept: 'Atendimento ao Cliente', manager: 'José Fernando Mosquer' },
  { name: 'Rian Lucas de Matos Almeida', role: 'Key Account', dept: 'Atendimento ao Cliente', manager: 'José Fernando Mosquer' },
  { name: 'Alana Maiumy Gaspar', role: 'Key Account', dept: 'Atendimento ao Cliente', manager: 'José Fernando Mosquer' },
  { name: 'Mônica de Paula Neves', role: 'Implantadora', dept: 'Atendimento ao Cliente', manager: 'José Fernando Mosquer' },
  { name: 'Gabrielle Andrade Prestes', role: 'Implantadora', dept: 'Atendimento ao Cliente', manager: 'José Fernando Mosquer' },
  { name: 'Gabriel Stefaniw de Lima', role: 'Suporte Evolux', dept: 'Atendimento ao Cliente', manager: 'José Fernando Mosquer' },
  { name: 'Mathaus Kozkodai Alves', role: 'Suporte Evolux', dept: 'Atendimento ao Cliente', manager: 'José Fernando Mosquer' },
  { name: 'Pedro Arthur Lobregati Barreto', role: 'Analista de Suporte Técnico', dept: 'Atendimento ao Cliente FiqOn', manager: 'Guilherme Pinheiro' },
  { name: 'Roberty Augusto dos Santos Machado', role: 'Analista de Suporte Técnico', dept: 'Atendimento ao Cliente FiqOn', manager: 'Guilherme Pinheiro' },
  { name: 'Matheus Lorenzo Siqueira', role: 'Analista de Suporte Técnico', dept: 'Atendimento ao Cliente FiqOn', manager: 'Guilherme Pinheiro' },

  // MARKETING & STARTUPS
  { name: 'Igor de Azevedo Ribeiro', role: 'Gestor de Projetos', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'Annelise Ribeiro de Souza', role: 'Gestor de Tráfego Pago', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'Rebeca Costa de Lima', role: 'Copywriter', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'Leonardo Luiz Maciel', role: 'Marketing Ops / Analista de Growth', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'Kauê Pszdzimirski de Vargas', role: 'Designer', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'Ana Luiza de Souza Ida', role: 'Social Media', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'Richard Matheus Mendes Cordeiro', role: 'Filmmaker', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'João Marcos Costa de Lima', role: 'Editor de vídeos', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'Gustavo Santos Schneider', role: 'Web Developer', dept: 'Marketing', manager: 'Rafael Blaka Schimanski' },
  { name: 'Alan Armstrong', role: 'Gestor de Projetos', dept: 'Marketing', manager: 'Wagner Wolff Pretto' },
  { name: 'Maria Cecilia Blaka Schimanski', role: 'Copywriter', dept: 'Marketing', manager: 'Richard Matheus Mendes Cordeiro' },
  { name: 'Vinícius Costa Leal', role: 'Social Media', dept: 'Marketing', manager: 'Richard Matheus Mendes Cordeiro' },

  // PARCERIAS & AUTOMAÇÕES & P&P
  { name: 'Maria Eduarda Araújo Gora', role: 'Assistente de Parceria', dept: 'Parcerias', manager: 'Emily Godoy Da Silva' },
  { name: 'Pamela Eduarda Rocha', role: 'Assistente de Parcerias', dept: 'Parcerias', manager: 'Emily Godoy Da Silva' },
  { name: 'Vinícius Biasi Assmann', role: 'Analista de Automações', dept: 'Automações', manager: 'Pablo Emanuel da Silva' },
  { name: 'Thiago Henrique Meneguim Marcondes', role: 'Analista de Automações', dept: 'Automações', manager: 'Pablo Emanuel da Silva' },
  { name: 'José Eduardo Giannini Zimmermann', role: 'Analista de Automações', dept: 'Automações', manager: 'Pablo Emanuel da Silva' },
  { name: 'Eduardo Portes Bueno', role: 'Analista de Automações', dept: 'Automações', manager: 'Pablo Emanuel da Silva' },
  { name: 'Gislene Cristiane Santos Machado', role: 'Analista de Recrutamento e Seleção', dept: 'Pessoas e Cultura', manager: 'Lucas Limberger' },
  { name: 'Renata Czapiewski Silva', role: 'Analista de Pessoas e Cultura', dept: 'Pessoas e Cultura', manager: 'Lucas Limberger' },
  { name: 'Ana Paula Antunes', role: 'Assistente Geral', dept: 'Pessoas e Cultura', manager: 'Lucas Limberger' },
  { name: 'Andreia Vieira Cunha', role: 'Zeladora', dept: 'Pessoas e Cultura', manager: 'Lucas Limberger' },
  { name: 'Elen Daiane De Souza', role: 'Zeladora', dept: 'Pessoas e Cultura', manager: 'Lucas Limberger' },
  { name: 'Ivonete Soares', role: 'Zeladora', dept: 'Pessoas e Cultura', manager: 'Lucas Limberger' },
  { name: 'Matheus Araujo Ribeiro de Britto', role: 'Porteiro', dept: 'Pessoas e Cultura', manager: 'Lucas Limberger' },
  { name: 'Paulo Fernando Bertoli', role: 'Porteiro', dept: 'Pessoas e Cultura', manager: 'Lucas Limberger' },

  // INSTITUTO & OPERAÇÕES
  { name: 'Gladston Kordiak', role: 'Monitor Instituto 3C', dept: 'Instituto 3C', manager: 'Kawanna Barbosa Cordeiro' },
  { name: 'Victor Raphael Pedroso de Lima', role: 'Monitor Instituto 3C', dept: 'Instituto 3C', manager: 'Kawanna Barbosa Cordeiro' },
  { name: 'Gabrieli Estefani dos Anjos Almeida', role: 'Assistente de Recrutamento e Seleção', dept: 'Instituto 3C', manager: 'Kawanna Barbosa Cordeiro' },
  { name: 'Isabely Wendler', role: 'Gestor de Projetos', dept: 'Operações', manager: 'Ricardo Borges Camargo' }
];

async function main() {
  console.log('🌱 Iniciando Seed SSO Enterprise...');

  // 1. Limpeza
  await prisma.request.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.department.deleteMany();

  // 2. Criar Departamentos Únicos
  const deptNames = [...new Set(EMPLOYEES.map(e => e.dept))];
  const deptsMap = new Map();

  for (const name of deptNames) {
    const dept = await prisma.department.create({ data: { name } });
    deptsMap.set(name, dept.id);
  }
  console.log(`✅ ${deptNames.length} Departamentos criados.`);

  // 3. Criar Cargos Únicos e Usuários
  const usersMap = new Map(); // Mapa de Nome -> ID do Usuário

  for (const emp of EMPLOYEES) {
    // Busca ou cria o cargo
    let role = await prisma.role.findFirst({ 
      where: { name: emp.role, departmentId: deptsMap.get(emp.dept) } 
    });

    if (!role) {
      role = await prisma.role.create({
        data: { name: emp.role, departmentId: deptsMap.get(emp.dept) }
      });
    }

    // 🔥 GERA EMAIL REAL: nome.sobrenome@grupo-3c.com
    const emailName = emp.name.toLowerCase().split(' ');
    // Pega primeiro e último nome
    const email = `${emailName[0]}.${emailName[emailName.length - 1]}@grupo-3c.com`;

    // Cria usuário
    try {
      const user = await prisma.user.create({
        data: {
          name: emp.name,
          email: email, // Email Compatível com Google
          roleId: role.id,
          departmentId: deptsMap.get(emp.dept)
        }
      });
      usersMap.set(emp.name, user.id);
    } catch (e) {
      console.log(`⚠️ Erro/Duplicidade ao criar: ${emp.name} (${email})`);
    }
  }
  console.log('✅ Usuários criados com emails @grupo-3c.com');

  // 4. Conectar Gestores
  for (const emp of EMPLOYEES) {
    if (emp.manager && emp.manager !== '-' && usersMap.has(emp.name)) {
      const managerId = usersMap.get(emp.manager);
      if (managerId) {
        await prisma.user.update({
          where: { id: usersMap.get(emp.name) },
          data: { managerId: managerId }
        });
      }
    }
  }
  console.log('✅ Hierarquia vinculada.');

  // 5. Criar Ferramentas Padrão (Owner: Diogo CTO ou Infra)
  const ownerId = usersMap.get('Diogo Henrique Hartmann') || usersMap.get('Allan Von Stein Portela');
  
  if (ownerId) {
    await prisma.tool.create({
      data: {
        name: 'Slack',
        description: 'Comunicação Oficial',
        ownerId: ownerId,
        accessLevels: JSON.stringify({ create: [{ name: 'Admin' }, { name: 'Member' }, { name: 'Guest' }] })
      }
    });
    await prisma.tool.create({
      data: {
        name: 'Jira Software',
        description: 'Projetos',
        ownerId: ownerId,
        accessLevels: JSON.stringify({ create: [{ name: 'Project Admin' }, { name: 'Developer' }, { name: 'Viewer' }] })
      }
    });
  }

  console.log('🏁 Seed SSO Concluído!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });