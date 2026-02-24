/**
 * Seed: Gestão de Pessoas por Unidade
 * Estrutura 100% conforme a lista: Unidade > Departamento > Cargo > Colaboradores.
 * Recria departamentos e cargos e atualiza usuários com unit, department, jobTitle.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lista exata: unit, department, jobTitle, email (nome resolvido por email no upsert)
const ROWS: { unit: string; department: string; jobTitle: string; name: string; email: string }[] = [
  { unit: '3C+', department: 'Board', jobTitle: 'CEO', name: 'Ney Eurico Pereira', email: 'ney.pereira@grupo-3c.com' },
  { unit: '3C+', department: 'Board', jobTitle: 'CFO', name: 'Aline Alda da Fonseca Bocchi', email: 'aline.fonseca@grupo-3c.com' },
  { unit: '3C+', department: 'Board', jobTitle: 'CMO', name: 'Wagner Wolff Pretto', email: 'wagner.wolff@grupo-3c.com' },
  { unit: '3C+', department: 'Board', jobTitle: 'COO', name: 'Ricardo Borges Camargo', email: 'ricardo.camargo@grupo-3c.com' },
  { unit: '3C+', department: 'Board', jobTitle: 'CPO', name: 'Lucas Limberger', email: 'lucas.limberger@grupo-3c.com' },
  { unit: '3C+', department: 'Board', jobTitle: 'CPOX', name: 'Guilherme Pimpão Cavalcante', email: 'guilherme.pimpao@grupo-3c.com' },
  { unit: '3C+', department: 'Board', jobTitle: 'CSO', name: 'Jaqueline de Souza', email: 'jaqueline.souza@grupo-3c.com' },
  { unit: '3C+', department: 'Board', jobTitle: 'CTO', name: 'Diogo Henrique Hartmann', email: 'diogo.hartmann@grupo-3c.com' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'Analista de Custos / Telecom', name: 'Ian Ronska Nepomoceno', email: 'ian.ronska@grupo-3c.com' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'Analista de SI e Infraestrutura', name: 'Allan Von Stein Portela', email: 'allan.vonstein@grupo-3c.com' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'Assistente de Segurança da Informação', name: 'Luan Matheus dos Santos Silva', email: 'luan.silva@grupo-3c.com' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'DevOps', name: 'João Paulo Vasconcelos do Vale', email: 'joao.vasconcelos@grupo-3c.com' },
  { unit: '3C+', department: 'Tecnologia e Segurança (SI)', jobTitle: 'Líder de Segurança da Informação', name: 'Vladimir Antonio Sesar', email: 'vladimir.sesar@grupo-3c.com' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista Contábil', name: 'Bruno Sahaidak', email: 'bruno.sahaidak@grupo-3c.com' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista de Departamento Pessoal', name: 'Raphael Pires Ida', email: 'raphael.pires@grupo-3c.com' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista Financeiro', name: 'Fernando Vantroba Takakusa', email: 'fernando.takakusa@grupo-3c.com' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista Financeiro', name: 'Sthephany Tomacheski de Moraes', email: 'sthephany.moraes@grupo-3c.com' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Analista Jurídico', name: 'Gabriely Garcia', email: 'gabriely.garcia@grupo-3c.com' },
  { unit: '3C+', department: 'Administrativo', jobTitle: 'Assistente Jurídico', name: 'Maria Eduarda Nezelo Rosa', email: 'maria.rosa@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Copywriter', name: 'Rebeca Costa de Lima', email: 'rebeca.costa@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Designer', name: 'Kauê Pszdzimirski de Vargas', email: 'kaue.vargas@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Editor de Vídeos', name: 'João Marcos Costa de Lima', email: 'joao.marcos@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Filmmaker', name: 'Richard Matheus Mendes Cordeiro', email: 'richard.cordeiro@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Gestor de Projetos', name: 'Igor de Azevedo Ribeiro', email: 'igor.ribeiro@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Gestor de Tráfego Pago', name: 'Annelise Ribeiro de Souza', email: 'annelise.souza@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Líder de Marketing', name: 'Rafael Blaka Schimanski', email: 'rafael.schimanski@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Marketing Ops / Analista de Growth', name: 'Leonardo Luiz Maciel', email: 'leonardo.maciel@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Porta voz da marca', name: 'Alan Armstrong', email: 'alan.armstrong@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Social Media', name: 'Ana Luiza de Souza Ida', email: 'ana.ida@grupo-3c.com' },
  { unit: '3C+', department: 'Marketing', jobTitle: 'Web Developer', name: 'Gustavo Santos Schneider', email: 'gustavo.schneider@grupo-3c.com' },
  { unit: '3C+', department: 'Parcerias', jobTitle: 'Líder de Parcerias', name: 'Emily Godoy Da Silva', email: 'emily.godoy@grupo-3c.com' },
  { unit: '3C+', department: 'Parcerias', jobTitle: 'Assistente de Parcerias', name: 'Pamela Eduarda Rocha', email: 'pamela.rocha@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Backoffice', name: 'Michele', email: 'michele.anjos@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Alexsandy Correa dos Santos', email: 'alexsandy.correa@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Andressa Aparecida Krysa', email: 'andressa.krysa@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Bianca da Cunha', email: 'bianca.cunha@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Cirene Laiza da Cruz Lara', email: 'cirene.lara@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Dafiny Mélory Cordeiro Melo França', email: 'dafiny.franca@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Emanuelly Petel', email: 'emanuelly.petel@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Guilherme Medino Castro', email: 'guilherme.castro@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Guilherme Mello Minuzzi', email: 'guilherme.minuzzi@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Gustavo dos Santos Dangui', email: 'gustavo.dangui@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Joyce Cordeiro', email: 'joyce.cordeiro@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Kesley Luis de Oliveira', email: 'kesley.oliveira@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Ketlin Tainá Zaluski de Oliveira', email: 'ketlin.oliveira@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Leandro dos Santos Mülhstdtt da Silva', email: 'leandro.mulhstdtt@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Leonardo Kauan Ferraz', email: 'leonardo.ferraz@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Lucas Antonio Costa', email: 'lucas.costa@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Lucas Fontoura de Almeida', email: 'lucas.almeida@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Lucio Marcos Nascimento Ramos', email: 'lucio.ramos@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Marciel Boruch da Silva', email: 'marciel.silva@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Mateus Gerigk', email: 'mateus.gerigk@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Maycon José Barbosa Padilha', email: 'maycon.barbosa@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Nildson Polis Machado', email: 'nildson.machado@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Rafaela Guedes Pinto Cavalcante Stephan', email: 'rafaela.stephan@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Roberta Gomes Ribeiro', email: 'roberta.gomes@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Rosiane Correa', email: 'rosiane.correa@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Thomas Arnon Schmidt Ferreira', email: 'thomas.ferreira@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Closer', name: 'Willian Samuel de Oliveira', email: 'willian.samuel@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Head Comercial', name: 'Camila Souza de Oliveira', email: 'camila.oliveira@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Líder de Enterprise', name: 'Jehnnifer Xavier Padilha', email: 'jehnnifer.padilha@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Líder de Vendas PME', name: 'Alessandro Dorneles Schneider', email: 'alessandro.schneider@grupo-3c.com' },
  { unit: '3C+', department: 'Comercial Contact', jobTitle: 'Líder de Vendas PME', name: 'Caroline Fatima de Gois Fila', email: 'caroline.gois@grupo-3c.com' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Analista de Expansão', name: 'Daniel Felipe da Silva Souza', email: 'daniel.souza@grupo-3c.com' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Analista de Expansão', name: 'Kauane Lemos Bastos', email: 'kauane.bastos@grupo-3c.com' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Analista de Expansão', name: 'Maria Eduarda Merhet Padilha', email: 'maria.merhet@grupo-3c.com' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Analista de Expansão', name: 'Taissa Guilliane Gomes Almeida', email: 'taissa.almeida@grupo-3c.com' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Customer Success - Recuperação', name: 'Gabriel Schneider Bernadini', email: 'gabriel.bernadini@grupo-3c.com' },
  { unit: '3C+', department: 'Expansão', jobTitle: 'Líder de Expansão', name: 'Camila Brunetti Thomé', email: 'camila.brunetti@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Analista de Automações', name: 'Gabriel de Lima Machado', email: 'gabriel.machado@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Analista de Automações', name: 'Wesley Diogo do Vale', email: 'wesley.vale@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Analista de Implantação', name: 'Gabrielle Andrade Prestes', email: 'gabrielle.prestes@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Analista de Implantação', name: 'Mônica de Paula Neves', email: 'monica.neves@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Customer Success', name: 'Alana Maiumy Gaspar', email: 'alana.gaspar@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Customer Success', name: 'Felipe Moreira do Nascimento', email: 'felipe.nascimento@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Customer Success', name: 'Filipe Ferreira Rovea', email: 'filipe.rovea@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Customer Success', name: 'Mathaus Kozkodai Alves', email: 'mathaus.alves@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Customer Success', name: 'Rian Lucas de Matos Almeida', email: 'rian.almeida@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Customer Success', name: 'Roberty Augusto dos Santos Machado', email: 'roberty.machado@grupo-3c.com' },
  { unit: '3C+', department: 'Atendimento ao Cliente', jobTitle: 'Líder de Atendimento ao Cliente', name: 'José Fernando Mosquer', email: 'fernando.mosquer@grupo-3c.com' },
  { unit: '3C+', department: 'Professional Service', jobTitle: 'Analista de Automações', name: 'Ovídio José Corrêa Farias', email: 'ovidio.farias@grupo-3c.com' },
  { unit: '3C+', department: 'Professional Service', jobTitle: 'Analista de Projetos', name: 'Eduardo Wosiak', email: 'eduardo.wosiak@grupo-3c.com' },
  { unit: '3C+', department: 'Professional Service', jobTitle: 'Gestor de Projetos', name: 'Pedro Arthur Lobregati Barreto', email: 'pedro.barreto@grupo-3c.com' },
  { unit: '3C+', department: 'Operações', jobTitle: 'Gestor de Projetos', name: 'Isabely Wendler', email: 'isabely.wendler@grupo-3c.com' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Analista de Pessoas e Performance', name: 'Renata Czapiewski Silva', email: 'renata.czapiewski@grupo-3c.com' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Analista de Recrutamento e Seleção', name: 'Gislene Cristiane Santos Machado', email: 'gislene.machado@grupo-3c.com' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Assistente Geral', name: 'Ana Paula Antunes', email: 'ana.antunes@grupo-3c.com' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Porteiro', name: 'Luiz Emanoel Servo', email: 'luiz.servo@grupo-3c.com' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Porteiro', name: 'Paulo Fernando Bertoli', email: 'paulo.bertoli@grupo-3c.com' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Zeladora', name: 'Beninciaril Pola Alvarez Mahecha', email: 'beninciaril.mahecha@grupo-3c.com' },
  { unit: '3C+', department: 'Pessoas e Performance', jobTitle: 'Zeladora', name: 'Ivonete Soares', email: 'ivonete.soares@grupo-3c.com' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Analista de Negócios (PO)', name: 'Vanderlei Assis de Andrade Junior', email: 'junior.andrade@grupo-3c.com' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Desenvolvedor Full Stack', name: 'Andrieli de Oliveira Javorski', email: 'andrieli.javorski@grupo-3c.com' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Desenvolvedor Full Stack', name: 'Bruno Garcia', email: 'bruno.garcia@grupo-3c.com' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Desenvolvedor Full Stack', name: 'Eduardo Mateus dos Santos Gonçalves', email: 'eduardo.goncalves@grupo-3c.com' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Desenvolvedor Full Stack', name: 'José Pablo Streiski Neto', email: 'jose.pablo@grupo-3c.com' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Desenvolvedor Full Stack', name: 'Matheus Rocha Camargo', email: 'matheus.rocha@grupo-3c.com' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'Tech Lead', name: 'Gabriel Krysa', email: 'gabriel.krysa@grupo-3c.com' },
  { unit: '3C+', department: 'Produto 3C+', jobTitle: 'UX Designer', name: 'Gabriel Pires Ida', email: 'gabriel.ida@grupo-3c.com' },
  { unit: '3C+', department: 'RevOps', jobTitle: 'Analista de Automações', name: 'Eduardo Portes Bueno', email: 'eduardo.bueno@grupo-3c.com' },
  { unit: '3C+', department: 'RevOps', jobTitle: 'Analista de Automações', name: 'José Eduardo Giannini Zimmermann', email: 'jose.zimmermann@grupo-3c.com' },
  { unit: '3C+', department: 'RevOps', jobTitle: 'Analista de Automações', name: 'Matheus de Oliveira', email: 'matheus.oliveira@grupo-3c.com' },
  { unit: '3C+', department: 'RevOps', jobTitle: 'Analista de Automações', name: 'Vinícius Biasi Assmann', email: 'vinicius.assmann@grupo-3c.com' },
  { unit: '3C+', department: 'RevOps', jobTitle: 'Líder de RevOps', name: 'Pablo Emanuel da Silva', email: 'pablo.emanuel@grupo-3c.com' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'Desenvolvedor Back-End', name: 'Sergio Filipe Gadelha Roza', email: 'sergio.filipe@grupo-3c.com' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'Desenvolvedor Full Stack', name: 'Guilherme Ferreira Ribas', email: 'guilherme.ferreira@grupo-3c.com' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'Desenvolvedor Full Stack', name: 'Luis Fernando Paganini', email: 'luis.paganini@grupo-3c.com' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'Desenvolvedor Full Stack', name: 'Pedro Henrique Ferreira do Nascimento', email: 'pedro.nascimento@grupo-3c.com' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'DevOps', name: 'Bruno Levy de Arruda', email: 'bruno.levy@grupo-3c.com' },
  { unit: 'Evolux', department: 'Evolux', jobTitle: 'Tech Lead', name: 'Carlos Henrique Marques', email: 'carlos.marques@grupo-3c.com' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'CEO', name: 'Pietro Giovani Franciosi Limberger', email: 'pietro.limberger@grupo-3c.com' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Capitão Comercial', name: 'Taryk de Souza Ferreira', email: 'taryk.ferreira@grupo-3c.com' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Closer', name: 'Eduardo Elias do Nascimento', email: 'eduardo.nascimento@grupo-3c.com' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Closer', name: 'Iago Moura do Prado', email: 'iago.prado@grupo-3c.com' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Desenvolvedor Back-End', name: 'Marieli Aparecida Ferreira Thomen', email: 'marieli.ferreira@grupo-3c.com' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Desenvolvedor Back-End', name: 'Jeferson da Cruz', email: 'jeferson.cruz@grupo-3c.com' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Desenvolvedor Back-End', name: 'Julia Gabrielly Martins Araujo', email: 'julia.araujo@grupo-3c.com' },
  { unit: 'Dizify', department: 'Dizify', jobTitle: 'Tech Lead', name: 'Maria Fernanda Ribeiro', email: 'maria.ribeiro@grupo-3c.com' },
  { unit: 'Instituto 3C', department: 'Instituto 3C', jobTitle: 'Assistente de Recrutamento e Seleção', name: 'Gabrieli Estefani dos Anjos Almeida', email: 'gabrieli.almeida@grupo-3c.com' },
  { unit: 'Instituto 3C', department: 'Instituto 3C', jobTitle: 'Coordenadora do Instituto 3C', name: 'Kawanna Barbosa Cordeiro', email: 'kawanna.cordeiro@grupo-3c.com' },
  { unit: 'Instituto 3C', department: 'Instituto 3C', jobTitle: 'Monitor Instituto 3C', name: 'Gladston Kordiak', email: 'gladston.kordiak@grupo-3c.com' },
  { unit: 'Instituto 3C', department: 'Instituto 3C', jobTitle: 'Monitor Instituto 3C', name: 'Victor Raphael Pedroso de Lima', email: 'victor.raphael@grupo-3c.com' },
  { unit: 'FiqOn', department: 'Produto FiqOn', jobTitle: 'Desenvolvedor Full Stack', name: 'Lucas Matheus da Cruz', email: 'lucas.matheus@grupo-3c.com' },
  { unit: 'FiqOn', department: 'Produto FiqOn', jobTitle: 'Desenvolvedor Full Stack', name: 'Lucas Schupchek de Jesus', email: 'lucas.schupchek@grupo-3c.com' },
  { unit: 'FiqOn', department: 'Produto FiqOn', jobTitle: 'Desenvolvedor Full Stack', name: 'Matheus Lorenzo Siqueira', email: 'matheus.siqueira@grupo-3c.com' },
  { unit: 'FiqOn', department: 'Produto FiqOn', jobTitle: 'Desenvolvedor Full Stack', name: 'Yuri Karas Regis Pacheco de Miranda Lima', email: 'yuri.lima@grupo-3c.com' },
  { unit: 'FiqOn', department: 'Produto FiqOn', jobTitle: 'Tech Lead', name: 'Guilherme Pinheiro Lemos', email: 'guilherme.pinheiro@grupo-3c.com' },
  { unit: 'Dizparos', department: 'Produto Dizparos', jobTitle: 'Desenvolvedor Full Stack', name: 'Gustavo Delonzek Brizola', email: 'gustavo.delonzek@grupo-3c.com' },
];

async function main() {
  console.log('🌱 Seed Gestão por Unidade — departamentos, cargos e colaboradores');

  const deptSet = new Set(ROWS.map(r => r.department));
  const deptList = [...deptSet].sort();

  await prisma.roleKitItem.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.department.deleteMany({});

  const deptMap = new Map<string, string>();
  for (const name of deptList) {
    const d = await prisma.department.create({ data: { name } });
    deptMap.set(name, d.id);
  }
  console.log(`   ${deptList.length} departamentos criados.`);

  const roleKey = (dept: string, job: string) => `${dept}::${job}`;
  const roleKeys = new Set(ROWS.map(r => roleKey(r.department, r.jobTitle)));
  const roleMap = new Map<string, string>();
  for (const key of roleKeys) {
    const [deptName, jobTitle] = key.split('::');
    const deptId = deptMap.get(deptName);
    if (!deptId) continue;
    const role = await prisma.role.create({
      data: { name: jobTitle, departmentId: deptId },
    });
    roleMap.set(key, role.id);
  }
  console.log(`   ${roleMap.size} cargos criados.`);

  for (const row of ROWS) {
    const email = row.email.toLowerCase().trim();
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    const systemProfile = (existing as any)?.systemProfile === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'VIEWER';
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: row.name,
          unit: row.unit,
          department: row.department,
          jobTitle: row.jobTitle,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name: row.name,
          email,
          unit: row.unit,
          department: row.department,
          jobTitle: row.jobTitle,
          systemProfile,
        },
      });
    }
  }
  console.log(`   ${ROWS.length} colaboradores processados.`);
  console.log('✅ Seed Gestão por Unidade concluído.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
