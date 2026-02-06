import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dados MESTRES das Ferramentas (Baseado na sua lista "Ferramentas.csv")
const toolsMaster = [
  { sigla: 'JC', name: 'Jumpcloud (JC)', ownerEmail: 'vladimir.sesar@grupo-3c.com', subEmail: 'luan.silva@grupo-3c.com' },
  { sigla: 'CK', name: 'Clickup (CK)', ownerEmail: 'isabely.wendler@grupo-3c.com', subEmail: 'renata.czapiewski@grupo-3c.com' },
  { sigla: 'HS', name: 'Hubspot (HS)', ownerEmail: 'pablo.emanuel@grupo-3c.com', subEmail: 'deborah.peres@grupo-3c.com' },
  { sigla: 'CP', name: '3C Plus (CP)', ownerEmail: 'allan.portela@3cplusnow.com', subEmail: 'fernando.mosquer@grupo-3c.com' }, // Ajustado para Allan Portela conforme detalhe
  { sigla: 'EX', name: 'Evolux (EX)', ownerEmail: 'carlos.marques@grupo-3c.com', subEmail: 'levi.pereira@grupo-3c.com' }, // Levi assumido pelo primeiro nome
  { sigla: 'DZ', name: 'Dizify (DZ)', ownerEmail: 'marieli.ferreira@grupo-3c.com', subEmail: 'jeferson.cruz@grupo-3c.com' },
  { sigla: 'NS', name: 'Netsuit (NS)', ownerEmail: 'aline.fonseca@3cplusnow.com', subEmail: 'fernando.takakusa@grupo-3c.com' },
  { sigla: 'GL', name: 'Gitlab (GL)', ownerEmail: 'diogo@3cplusnow.com', subEmail: 'joao.vasconcelos@grupo-3c.com' },
  { sigla: 'AS', name: 'AWS (AS)', ownerEmail: 'carlos.marques@grupo-3c.com', subEmail: 'joao.vasconcelos@grupo-3c.com' },
  { sigla: 'GC', name: 'GCP (GC)', ownerEmail: 'diogo.hartmann@grupo-3c.com', subEmail: 'joao.vasconcelos@grupo-3c.com' },
  { sigla: 'CV', name: 'Convenia (CV)', ownerEmail: 'raphael.pires@grupo-3c.com', subEmail: 'renata.czapiewski@grupo-3c.com' },
  { sigla: 'CS', name: 'Clicsign (CS)', ownerEmail: 'fernando.takakusa@grupo-3c.com', subEmail: 'aline.fonseca@grupo-3c.com' },
  { sigla: 'MT', name: 'Meta (MT)', ownerEmail: 'rafael.schimanski@3cplusnow.com', subEmail: 'junior.andrade@grupo-3c.com' },
  { sigla: 'FO', name: 'Fiqon (FO)', ownerEmail: 'guilherme.pinheiro@grupo-3c.com', subEmail: 'lucas.matheus@grupo-3c.com' },
  { sigla: 'NA', name: 'N8N (NA)', ownerEmail: 'pablo.emanuel@grupo-3c.com', subEmail: 'eduardo.wosiak@grupo-3c.com' }, // Unificado conforme OBS
  { sigla: 'HC', name: 'Hik Connect (HC)', ownerEmail: 'vladimir.sesar@grupo-3c.com', subEmail: 'allan.vonstein@grupo-3c.com' },
  { sigla: 'CG', name: 'ChatGPT (CG)', ownerEmail: 'pablo.emanuel@3cplusnow.com', subEmail: 'wagner@3cplusnow.com' },
  { sigla: 'FU', name: 'Focus (FU)', ownerEmail: 'aline.fonseca@3cplusnow.com', subEmail: 'thiago.marcondes@grupo-3c.com' },
  { sigla: 'VI', name: 'Vindi (VI)', ownerEmail: 'pablo.emanuel@grupo-3c.com', subEmail: 'ian.ronska@grupo-3c.com' },
  { sigla: 'NR', name: 'Nextrouter (NR)', ownerEmail: 'diogo@3cplusnow.com', subEmail: 'ian.ronska@grupo-3c.com' },
  { sigla: 'FA', name: 'Figma (FA)', ownerEmail: 'gabriel.ida@grupo-3c.com', subEmail: null },
];

// LISTA COMPLETA E EXATA DE USUÁRIOS E NÍVEIS
const accessData = [
  // --- FIGMA (FA) ---
  { s: 'FA', l: 'Full (FA - 1)', n: 'Gabriel Pires Ida', e: 'gabriel.ida@grupo-3c.com' },
  { s: 'FA', l: 'Full (FA - 1)', n: 'front3c', e: 'front3c@grupo-3c.com' },
  { s: 'FA', l: 'Full (FA - 1)', n: 'Guilherme Pimpão', e: 'guilherme.pimpao@grupo-3c.com' },
  { s: 'FA', l: 'Full (FA - 1)', n: 'Junior Andrade', e: 'junior.andrade@grupo-3c.com' },
  { s: 'FA', l: 'Dev (FA - 2)', n: 'gustavo Schneider', e: 'gustavo.schneider@grupo-3c.com' },
  { s: 'FA', l: 'Collab (FA - 3)', n: 'Igor de Azevedo Ribeiro', e: 'igor.ribeiro@grupo-3c.com' },
  { s: 'FA', l: 'Collab (FA - 3)', n: 'Leonardo Maciel', e: 'leonardo.maciel@grupo-3c.com' },
  { s: 'FA', l: 'Collab (FA - 3)', n: 'rebeca', e: 'rebeca.costa@grupo-3c.com' },
  { s: 'FA', l: 'Collab (FA - 3)', n: 'Pinhas', e: 'guilherme.pinheiro@grupo-3c.com' },
  { s: 'FA', l: 'View (FA - 4)', n: 'Hégon Duarte Teixeira', e: 'hegon.teixeira@grupo-3c.com' }, // Email ajustado padrão
  { s: 'FA', l: 'View (FA - 4)', n: 'Rafael', e: 'rafael@grupo-3c.com' }, // Email ajustado padrão
  { s: 'FA', l: 'View (FA - 4)', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'FA', l: 'View (FA - 4)', n: 'Isaque Lira', e: 'isaque.lira@grupo-3c.com' },

  // --- 3C PLUS (CP) ---
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Andrieli Javorski', e: 'andrieli.javorski@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Bruno Garcia', e: 'bruno.garcia@3cplusnow.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Carlos Marques', e: 'carlos.marques@3cplusnow.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Eduardo Gonçalves', e: 'eduardo.goncalves@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Financeiro Assistente IA', e: 'financeiros@assistenteia.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Financeiro Disparos', e: 'financeiros@disparos.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Gabriel Krysa', e: 'krysa@3cplusnow.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Gabriel Pires Ida', e: 'gabriel.ida@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Gustavo Delonzek', e: 'gustavo.delonzek@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'João Paulo Vasconcelos', e: 'joao.vasconcelos@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Júnior Andrade', e: 'junior.andrade@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Matheus de Oliveira', e: 'matheus.oliveira@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Matheus Rocha', e: 'matheus.rocha@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Vladimir Sesar', e: 'vladimir.sesar@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Deborah Peres', e: 'deborah.peres@3cplusnow.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Leonardo Maciel', e: 'leonardo.maciel@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Pablo Emanuel', e: 'pablo.emanuel1@3cplusnow.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Thiago Marcondes', e: 'thiago.marcondes1@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Vinicius Biasi', e: 'vinicius.assmann@3cplusnow.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Emily Godoy', e: 'emily.godoy@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Pamela Rocha', e: 'pamela.rocha@grupo-3c.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Ney Pereira', e: 'ney.pereira.adm@3cplusnow.com' },
  { s: 'CP', l: 'Nível 3 (CP - 1)', n: 'Diogo Hartmann', e: 'diogo.hartmann@3cplusnow.com' },
  { s: 'CP', l: 'Admin / Elements', n: 'José Pablo', e: 'jose@3cplusnow.com' },
  { s: 'CP', l: 'Admin / Elements', n: 'Sandra Siqueira', e: 'sandra.siqueira@grupo-3c.com' },

  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Alana Maiumy', e: 'alana.gaspar@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Alan Armstrong', e: 'alan.armstrong@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Alexander Reis', e: 'alexander.reis@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Allan Portela', e: 'allan.portela@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Filipe Ferreira', e: 'filipe.rovea@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Felipe Moreira', e: 'felipe.nascimento@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Eduardo Bueno', e: 'eduardo1.bueno@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Eduardo Wosiak', e: 'eduardo.wosiak@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Gabrielle Prestes', e: 'gabrielle.prestes@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Gabriel Machado', e: 'gabriel.machado@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Gabriel Stefaniw', e: 'gabriel.lima@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Ian Ronska', e: 'ian@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Integração', e: 'vinicius.sovrani@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Integrações', e: 'atendimento.aloisio@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Mônica Neves', e: 'monica.neves@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Ovidio Farias', e: 'ovidio.farias@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Ricardo Borges', e: 'ricardo.camargo@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Wesley', e: 'wesley.vale@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Zé', e: 'jose.zimmermann@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Alexsandy Corrêa', e: 'alexsandy.correa@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Camila Brunetti', e: 'camila.brunetti@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Camila Oliveira', e: 'camila.oliveira@3cplusnow.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Daniel Felipe', e: 'daniel.souza@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Fernando Mosquer', e: 'fernando.mosquer@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Guilherme Minuzzi', e: 'guilherme.minuzzi@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Jaqueline Pereira', e: 'jaqueline.souza@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Jehnnifer Padilha', e: 'jehnnifer.padilha@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Kauane Lemos Bastos', e: 'kauane.bastos@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Kesley Oliveira', e: 'kesley.oliveira@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Ketlin Zaluski', e: 'ketlin.oliveira@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Laiza Cruz', e: 'cirene.lara@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Leandro Mülhstdtt', e: 'leandro.mulhstdtt@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Léo Kauan Ferraz', e: 'leonardo.ferraz@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Lucas Costa', e: 'lucas.costa1@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Lucas Fontoura', e: 'lucas.almeida@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Lucio Ramos', e: 'lucio.ramos@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Maria Eduarda Merhet', e: 'maria.merhet@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Mateus Gerigk', e: 'meteus.gerigk@outlook.com.br' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Maycon Padilha', e: 'maycon.barbosa@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Michele Bodot', e: 'michelebodot93@gmail.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Taissa Guillianne', e: 'taissa.almeida@grupo-3c.com' },
  { s: 'CP', l: 'Nível 2 (CP - 2)', n: 'Thomas Ferreira', e: 'thomas.ferreira@grupo-3c.com' },

  // --- GITLAB (GL) ---
  { s: 'GL', l: 'Administrator (Admin)', n: 'Bruno Levy', e: 'bruno.levy@grupo-3c.com' },
  { s: 'GL', l: 'Administrator (Admin)', n: 'Carlos Marques', e: 'carlos.marques@grupo-3c.com' },
  { s: 'GL', l: 'Administrator (Admin)', n: 'Diogo', e: 'diogo@3cplusnow.com' },
  { s: 'GL', l: 'Administrator (Admin)', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'GL', l: 'Administrator (Admin)', n: 'Eric Patrick', e: 'eric.patrick@grupo-3c.com' },
  { s: 'GL', l: 'Administrator (Admin)', n: 'Gabriel Krysa', e: 'gabriel.krysa@3cplusnow.com' },
  { s: 'GL', l: 'Administrator (Admin)', n: 'Ítalo Rossi', e: 'italo.rossi@grupo-3c.com' },
  { s: 'GL', l: 'Administrator (Admin)', n: 'Joao Paulo', e: 'joao.vasconcelos@grupo-3c.com' },
  { s: 'GL', l: 'Administrator (Admin)', n: 'Sergio Filipe', e: 'sergio.filipe@evolux.net.br' },

  { s: 'GL', l: 'Regular (Padrão)', n: 'Allan Oliveira', e: 'allan.oliveira@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Andrieli Javorski', e: 'andrieli.javorski@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Bruno Garcia', e: 'bruno.garcia@3cplusnow.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Charles Oliveira', e: 'charles.jose@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Eduardo Gonçalves', e: 'eduardo.goncalves@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Eduardo Wosiak', e: 'eduardo.wosiak@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Gabriel Machado', e: 'gabriel.machado@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Guilherme Ferreira', e: 'guilherme.ferreira@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Gustavo Delonzek', e: 'gustavo.delonzek@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Henrique Amorim', e: 'henrique.amorim@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Jeferson da Cruz', e: 'jeferson.cruz@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'José Pablo', e: 'jose.pablo@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Julia Araujo', e: 'julia.araujo@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Luis Paganini', e: 'luis.paganini@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Maria Fernanda', e: 'maria.ribeiro@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Marieli Thomen', e: 'marieli.ferreira@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Matheus Kocotem', e: 'matheus.kocotem@3cplusnow.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Matheus Rocha', e: 'matheus.rocha@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Nicolas Veiga', e: 'nicolas.veiga@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Pablo Emanuel', e: 'pablo.emanuel@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Pedro', e: 'pedro.nascimento@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Rodrigo Gomes', e: 'rodrigo.gomes@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Sandra Siqueira', e: 'sandra.siqueira@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Vinicius Assmann', e: 'vinicius.assmann@grupo-3c.com' },
  { s: 'GL', l: 'Regular (Padrão)', n: 'Wesley Vale', e: 'wesley.vale@grupo-3c.com' },

  // --- CLICKUP (CK) ---
  { s: 'CK', l: 'Proprietário', n: 'Ney Eurico Pereira', e: 'ney.pereira@grupo-3c.com' },
  { s: 'CK', l: 'Administrador', n: 'Alexander Reis', e: 'alexander.reis@grupo-3c.com' },
  { s: 'CK', l: 'Administrador', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'CK', l: 'Administrador', n: 'Guilherme Pimpão', e: 'guilherme.pimpao@grupo-3c.com' },
  { s: 'CK', l: 'Administrador', n: 'Igor de Azevedo', e: 'igor.ribeiro@grupo-3c.com' },
  { s: 'CK', l: 'Administrador', n: 'Isabely Wendler', e: 'isabely.wendler@grupo-3c.com' },
  { s: 'CK', l: 'Administrador', n: 'Pablo Emanuel', e: 'pablo.emanuel@grupo-3c.com' },
  { s: 'CK', l: 'Administrador', n: 'Renata Czapiewski', e: 'renata.czapiewski@grupo-3c.com' },
  { s: 'CK', l: 'Administrador', n: 'Ricardo Borges', e: 'ricardo.camargo@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Alan Armstrong', e: 'alan.armstrong@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Bruno Levy', e: 'bruno.levy@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Camila Souza', e: 'camila.oliveira@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Carlos Marques', e: 'carlos.marques@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Eduardo Bueno', e: 'eduardo.bueno@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Fernando Mosquer', e: 'fernando.mosquer@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Fernando Takakusa', e: 'fernando.takakusa@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Gabriel Krysa', e: 'gabriel.krysa@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Gislene Machado', e: 'gislene.machado@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Guilherme Pinheiro', e: 'guilherme.pinheiro@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Jaqueline de Souza', e: 'jaqueline.souza@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'José Zimmermann', e: 'jose.zimmermann@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'João Vasconcelos', e: 'joao.vasconcelos@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Kawanna Cordeiro', e: 'kawanna.cordeiro@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Luan Matheus', e: 'luan.silva@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Lucas Limberger', e: 'lucas.limberger@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Pedro Nascimento', e: 'pedro.nascimento@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Rafael Blaka', e: 'rafael.schimanski@grupo-3c.com' },
  { s: 'CK', l: 'Membro', n: 'Wagner Wolff', e: 'wagnerwolffp@gmail.com' },

  // --- JUMPCLOUD (JC) ---
  { s: 'JC', l: 'Administrador with Billing', n: 'Vladimir Sesar', e: 'vladimir.sesar@grupo-3c.com' },
  { s: 'JC', l: 'Administrador with Billing', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'JC', l: 'Administrador with Billing', n: 'Luan Matheus', e: 'luan.silva@grupo-3c.com' },
  { s: 'JC', l: 'Administrador with Billing', n: 'Allan Von Stein', e: 'allan.vonstein@grupo-3c.com' },
  { s: 'JC', l: 'Help Desk', n: 'Renata Czapiewski', e: 'renata.czapiewski@grupo-3c.com' },

  // --- NEXT ROUTER (NR) ---
  { s: 'NR', l: 'ADMINISTRADOR', n: 'Diogo Hartmann', e: 'diogo@3cplusnow.com' }, // User: diogo
  { s: 'NR', l: 'ADMINISTRADOR', n: 'Suporte Nextbilling', e: 'suportenext@fake.com' }, // Dummy email
  { s: 'NR', l: 'ADMINISTRADOR', n: 'Automacoes 3C', e: 'automacoes_3c@fake.com' }, // Dummy
  { s: 'NR', l: 'ADMINISTRADOR', n: 'Matheus de Oliveira', e: 'matheus.oliveira@grupo-3c.com' },
  { s: 'NR', l: 'EQUIPE TELECOM', n: 'Ian Ronska', e: 'ian.ronska@grupo-3c.com' },
  { s: 'NR', l: 'EQUIPE TELECOM', n: 'Fernando Mosquer', e: 'fernando.mosquer@grupo-3c.com' },
  { s: 'NR', l: 'EQUIPE TELECOM', n: 'Pablo Emanuel', e: 'pablo.emanuel@grupo-3c.com' },

  // --- CLICSIGN (CS) ---
  { s: 'CS', l: 'Administrador', n: 'Fernando Takakusa', e: 'fernando.takakusa@grupo-3c.com' },
  { s: 'CS', l: 'Membro', n: 'Aline Fonseca', e: 'aline.fonseca@grupo-3c.com' },
  { s: 'CS', l: 'Membro', n: 'Gabriely Garcia', e: 'gabriely.garcia@grupo-3c.com' },
  { s: 'CS', l: 'Membro', n: 'José Zimmermann', e: 'jose.zimmermann@grupo-3c.com' },
  { s: 'CS', l: 'Membro', n: 'Maria Eduarda Rosa', e: 'maria.rosa@grupo-3c.com' },
  { s: 'CS', l: 'Membro', n: 'Operação Holding', e: 'operacao@3cplusnow.com' },
  { s: 'CS', l: 'Membro (API)', n: 'Raphael Pires Ida', e: 'raphael.pires@grupo-3c.com' },
  { s: 'CS', l: 'Membro', n: 'Vinícius Biasi', e: 'vinicius.assmann@grupo-3c.com' },

  // --- NETSUIT (NS) ---
  { s: 'NS', l: 'Administrador', n: 'Aline Fonseca', e: 'aline.fonseca@3cplusnow.com' },
  { s: 'NS', l: 'Administrador', n: 'Fernando Takakusa', e: 'fernando.takakusa@grupo-3c.com' },
  { s: 'NS', l: 'Administrador', n: 'José Eduardo', e: 'jose.zimmermann@grupo-3c.com' },
  { s: 'NS', l: 'Analista Fiscal / Comprador', n: 'Stephany Moraes', e: 'stephany.moraes@grupo-3c.com' },
  { s: 'NS', l: 'Administrador', n: 'Bruno Sahidak', e: 'bruno.sahidak@grupo-3c.com' },
  { s: 'NS', l: 'Administrador', n: 'Ana Paula Antunes', e: 'ana.antunes@grupo-3c.com' },
  { s: 'NS', l: 'Administrador', n: 'Ney Pereira', e: 'ney.pereira@grupo-3c.com' },
  { s: 'NS', l: 'Administrador', n: 'Suporte Active', e: 'suporte.3cplus@activecs.com.br' },
  { s: 'NS', l: 'Administrador', n: 'Beatriz Oliveira', e: 'beatriz.oliveira@activecs.com.br' },

  // --- HIK CONNECT (HC) ---
  { s: 'HC', l: 'administrador', n: 'Ney Pereira', e: 'ney.pereira@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Jaqueline Souza', e: 'jaqueline.souza@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Renata Czapiewski', e: 'renata.czapiewski@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Wagner Wolff', e: 'wagner.wolff@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Alan Armstrong', e: 'alan.armstrong@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Portaria', e: 'portaria@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Guilherme Pimpão', e: 'guilherme.pimpao@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Allan Von Stein', e: 'allan.vonstein@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Fernando Takakusa', e: 'fernando.takakusa@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Luan Silva', e: 'luan.silva@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Marcio Pagnoncelli', e: 'marcio.pagnoncelli@hotmail.com' },
  { s: 'HC', l: 'administrador', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'Vladimir Sesar', e: 'vladimir.sesar@grupo-3c.com' },
  { s: 'HC', l: 'administrador', n: 'uwdrac', e: 'hikvision@grupo-3c.com' },

  // --- DIZIFY (DZ) ---
  { s: 'DZ', l: 'administrador', n: 'Marieli Thomen', e: 'marieli.ferreira@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Pietro Limberger', e: 'pietro.limberger@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Lucas Limberger', e: 'lucas.limberger@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Guilherme Pimpão', e: 'guilherme.pimpao@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Jeferson Da Cruz', e: 'jeferson.cruz@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Maria Fernanda', e: 'maria.ribeiro@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Julia Araujo', e: 'julia.araujo@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Taryk De Souza', e: 'taryk.ferreira@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Iago Moura', e: 'iago.prado@grupo-3c.com' },
  { s: 'DZ', l: 'administrador', n: 'Eduardo Elias', e: 'eduardo.nascimento@grupo-3c.com' },

  // --- VINDI (VI) ---
  { s: 'VI', l: 'administrador', n: 'Alan Armstrong', e: 'alan.armstrong@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'Eduardo Bueno', e: 'eduardo.bueno@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'Fernando Takakusa', e: 'fernando.takakusa@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'José Eduardo', e: 'jose.zimmermann@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'Fernando Mosquer', e: 'fernando.mosquer@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'Matheus de Oliveira', e: 'matheus.oliveira@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'Pablo Emanuel', e: 'pablo.emanuel@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'Thiago Marcondes', e: 'thiago.marcondes@grupo-3c.com' },
  { s: 'VI', l: 'administrador', n: 'Vinicius Biasi', e: 'vinicius.assmann@grupo-3c.com' },
  { s: 'VI', l: 'Gestor', n: 'Alana Gaspar', e: 'alana.gaspar@grupo-3c.com' },
  { s: 'VI', l: 'Gestor', n: 'Deborah Peres', e: 'deborah.peres@grupo-3c.com' },
  { s: 'VI', l: 'Gestor', n: 'Felipe Moreira', e: 'felipe.nascimento@grupo-3c.com' },
  { s: 'VI', l: 'Gestor', n: 'Filipe Ferreira', e: 'filipe.rovea@grupo-3c.com' },
  { s: 'VI', l: 'Gestor', n: 'Gabriel Stefaniw', e: 'gabriel.lima@grupo-3c.com' },
  { s: 'VI', l: 'Gestor', n: 'Ian Ronska', e: 'ian.ronska@grupo-3c.com' },
  { s: 'VI', l: 'Gestor', n: 'Rian Lucas', e: 'rian.almeida@grupo-3c.com' },
  { s: 'VI', l: 'Observador', n: 'Allan Von Stein', e: 'allan.vonstein@grupo-3c.com' },
  { s: 'VI', l: 'Observador', n: 'Caroline Góis', e: 'caroline.gois@grupo-3c.com' },
  { s: 'VI', l: 'Observador', n: 'Contas a pagar', e: 'contasapagar@grupo-3c.com' },
  { s: 'VI', l: 'Observador', n: 'Emily Godoy', e: 'emily.godoy@grupo-3c.com' },
  // Pablo ja inserido como admin

  // --- N8N (NA) ---
  { s: 'NA', l: 'Owner', n: 'Pablo Emanuel', e: 'pablo.emanuel@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Eduardo Bueno', e: 'eduardo.bueno@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Ian Ronska', e: 'ian.ronska@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Isabely Wendler', e: 'isabely.wendler@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'José Eduardo', e: 'jose.zimmermann@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Julia Araujo', e: 'julia.araujo@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Matheus Oliveira', e: 'matheus.oliveira@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Thiago Marcondes', e: 'thiago.marcondes@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Vinícius Biasi', e: 'vinicius.assmann@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Suporte Evolux', e: 'suporte.evolux@grupo-3c.com' },
  { s: 'NA', l: 'Membro', n: 'Projetos', e: 'projetos@grupo-3c.com' },

  // --- CHAT GPT (CG) ---
  { s: 'CG', l: 'Proprietário', n: 'Pablo Emanuel', e: 'pablo.emanuel@3cplusnow.com' },
  { s: 'CG', l: 'Proprietário', n: 'Wagner Wolff', e: 'wagner@3cplusnow.com' },
  { s: 'CG', l: 'Membro', n: 'Aline Fonseca', e: 'aline.fonseca@3cplusnow.com' },
  { s: 'CG', l: 'Membro', n: 'Atendimento Cliente', e: 'atendimento.aloisio@3cplusnow.com' },
  { s: 'CG', l: 'Membro', n: 'Emily Godoy', e: 'emily@3cplusnow.com' },
  { s: 'CG', l: 'Membro', n: 'Instituto', e: 'instituto@3cplusnow.com' },
  { s: 'CG', l: 'Membro', n: 'Jaqueline de Souza', e: 'jaqueline.souza@grupo-3c.com' },
  { s: 'CG', l: 'Membro', n: 'Polaris', e: 'gpt.polaris@3cplusnow.com' },
  { s: 'CG', l: 'Membro', n: 'Rafael Blaka', e: 'rafael.blaka@3cplusnow.com' },
  { s: 'CG', l: 'Membro', n: 'Ricardo Camargo', e: 'ricardo.camargo@grupo-3c.com' },
  { s: 'CG', l: 'Membro', n: 'Segurança da Informação', e: 'si@grupo-3c.com' },
  { s: 'CG', l: 'Membro', n: 'Thiago Marcondes', e: 'thiago.marcondes@grupo-3c.com' },
  { s: 'CG', l: 'Membro', n: 'Wesley Diogo', e: 'wesley.vale@grupo-3c.com' },

  // --- FIQON (FO) ---
  { s: 'FO', l: 'Administrador', n: 'Lucas Matheus', e: 'lucas.matheus@grupo-3c.com' },
  { s: 'FO', l: 'Administrador', n: 'Lucas Schupchek', e: 'lucas.schupchek@grupo-3c.com' },
  { s: 'FO', l: 'Administrador', n: 'Matheus Siqueira', e: 'matheus.siqueira@grupo-3c.com' },
  { s: 'FO', l: 'Administrador', n: 'Yuri Lima', e: 'yuri.lima@grupo-3c.com' },
  { s: 'FO', l: 'Administrador', n: 'Pedro Barreto', e: 'pedro.barreto@grupo-3c.com' },
  { s: 'FO', l: 'Administrador', n: 'Roberty Machado', e: 'roberty.machado@grupo-3c.com' },
  { s: 'FO', l: 'Administrador', n: 'Guilherme Pinheiro', e: 'guilherme.pinheiro@grupo-3c.com' },
  { s: 'FO', l: 'Administrador', n: 'Guilherme Pimpão', e: 'guilherme.pimpao@grupo-3c.com' },

  // --- FOCUS (FU) ---
  { s: 'FU', l: 'Administrador', n: 'Aline Fonseca', e: 'aline.fonseca@3cplusnow.com' },
  { s: 'FU', l: 'Administrador', n: 'Contas a Pagar', e: 'contasapagar@3cplusnow.com' },
  { s: 'FU', l: 'Administrador', n: 'Diogo Hartmann', e: 'diogo@3cplusnow.com' },
  { s: 'FU', l: 'Administrador', n: 'Fernando Taka', e: 'fernando.takakusa@grupo-3c.com' },
  { s: 'FU', l: 'Administrador', n: 'Pablo Emanuel', e: 'pablo.emanuel@grupo-3c.com' },

  // --- GCP (GC) ---
  { s: 'GC', l: 'Owner', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'Eduardo Bueno', e: 'eduardo.bueno@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'Financeiro 3C Plus', e: 'financeiro@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'Ian Ronska', e: 'ian.ronska@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'José Pablo', e: 'jose.pablo@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'José Zimmermann', e: 'jose.zimmermann@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'Julia Araujo', e: 'julia.araujo@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'Matheus de Oliveira', e: 'matheus.oliveira@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'Thiago Marcondes', e: 'thiago.marcondes@grupo-3c.com' },
  { s: 'GC', l: 'Owner', n: 'Vladimir Sesar', e: 'vladimir.sesar@grupo-3c.com' },
  { s: 'GC', l: 'Admin / BigQuery', n: 'Pablo Emanuel', e: 'pablo.emanuel@grupo-3c.com' },
  { s: 'GC', l: 'Admin / BigQuery', n: 'Vinicius Biasi', e: 'vinicius.assmann@grupo-3c.com' },
  { s: 'GC', l: 'Admin / BigQuery', n: 'Looker Automacao', e: 'looker-automacao@data-3cplus.iam.gserviceaccount.com' },
  { s: 'GC', l: 'Admin / BigQuery', n: 'bq-automacao', e: 'bq-automacao@data-3cplus.iam.gserviceaccount.com' },
  { s: 'GC', l: 'Admin / BigQuery', n: 'vindi-ingestor', e: 'vindi-ingestor@data-3cplus.iam.gserviceaccount.com' },
  { s: 'GC', l: 'Editor / Viewer', n: 'Eduardo Wosiak', e: 'eduardo.wosiak@grupo-3c.com' },
  { s: 'GC', l: 'Editor / Viewer', n: 'Isabely Wendler', e: 'isabely.wendler@grupo-3c.com' },
  { s: 'GC', l: 'Editor / Viewer', n: 'Wagner Wolff', e: 'wagner.wolff@grupo-3c.com' },
  { s: 'GC', l: 'Editor / Viewer', n: 'Matheus Rocha', e: 'matheus.rocha@grupo-3c.com' },

  // --- AWS (AS) ---
  { s: 'AS', l: 'Console habilitado / User', n: 'Alexander Reis', e: 'alexander.reis@grupo-3c.com' },
  { s: 'AS', l: 'Conta técnica (Wazuh)', n: 'alien-wazuh', e: 'alien-wazuh@fake.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Bruno Levy', e: 'bruno.levi@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Carlos Marques', e: 'carlos.marques@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Gabriel Stefaniw', e: 'gabriel.lima@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Gabriel Machado', e: 'gabrel.machado@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Italo Rossi', e: 'italo.rossi@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Joao Vasconcelos', e: 'joao.vasconcelos@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Mathaus Alves', e: 'mathaus.alves@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Sergio Filipe', e: 'sergio.filipe@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Vladimir Sesar', e: 'vladimir.sesar@grupo-3c.com' },
  { s: 'AS', l: 'Console habilitado / User', n: 'Wesley Vale', e: 'wesley.vale@grupo-3c.com' },

  // --- CONVENIA (CV) ---
  { s: 'CV', l: 'Owner', n: 'Ney Eurico Pereira', e: 'ney.pereira@grupo-3c.com' },
  { s: 'CV', l: 'Owner', n: 'Lucas Limberger', e: 'lucas.limberger@grupo-3c.com' },
  { s: 'CV', l: 'Owner', n: 'Raphael Pires Ida', e: 'raphael.pires@grupo-3c.com' },
  { s: 'CV', l: 'Pessoas e Cultura', n: 'Renata Czapiewski', e: 'renata.czapiewski@grupo-3c.com' },
  { s: 'CV', l: 'Pessoas e Cultura', n: 'Gislene Machado', e: 'gislene.machado@grupo-3c.com' },

  // --- HUBSPOT (HS) ---
  { s: 'HS', l: 'Administradores', n: 'Wagner Wolff', e: 'wagner.wolff@evolux.net.br' },
  { s: 'HS', l: 'Administradores', n: 'Wagner Wolff', e: 'wagner.wolff@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Thiago Marcondes', e: 'thiago.marcondes@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Guilherme Pimpão', e: 'guilherme.pimpao@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Ricardo Camargo', e: 'ricardo.camargo@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Deborah Peres', e: 'deborah.peres@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Fernando Mosquer', e: 'fernando.mosquer@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Allan Von Stein', e: 'allan.vonstein@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Pablo Emanuel', e: 'pablo.emanuel@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Matheus Rocha', e: 'matheus.rocha@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Eduardo Wosiak', e: 'eduardo.wosiak@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Henrique Amorim', e: 'henrique.amorim@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Rafael Blaka', e: 'rafael.schimanski@grupo-3c.com' },
  { s: 'HS', l: 'Administradores', n: 'Leonardo Maciel', e: 'leonardo.maciel@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Thomas Ferreira', e: 'thomas.ferreira@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Camila Oliveira', e: 'camila.oliveira@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Taryk Ferreira', e: 'taryk.ferreira@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Jaqueline De Souza', e: 'jaqueline.souza@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Caroline Gois', e: 'caroline.gois@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Michele Bodot', e: 'michele.anjos@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Emily Godoy', e: 'emily.godoy@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Camila Brunetti', e: 'camila.brunetti@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Jehnnifer Padilha', e: 'jehnnifer.padilha@grupo-3c.com' },
  { s: 'HS', l: 'Líder - comercial', n: 'Lucas Antonio Costa', e: 'lucas.costa@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Taissa Almeida', e: 'taissa.almeida@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Sandra Siqueira', e: 'sandra.siqueira@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Bianca da Cunha', e: 'bianca.cunha@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Eduardo Elias', e: 'eduardo.nascimento@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Iago Moura', e: 'iago.prado@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Willian Samuel', e: 'willian.samuel@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Ketlin Oliveira', e: 'ketlin.oliveira@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Mônica de Paula', e: 'monica.neves@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Kauane Lemos', e: 'kauane.bastos@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Daniel Souza', e: 'daniel.souza@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Gabrielle Prestes', e: 'gabrielle.prestes@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Eduardo Gonçalves', e: 'eduardo.goncalves@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Maycon Padilha', e: 'maycon.barbosa@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Lucio Ramos', e: 'lucio.ramos@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Kesley Oliveira', e: 'kesley.oliveira@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Leonardo Kauan', e: 'leonardo.ferraz@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Pamela Rocha', e: 'pamela.rocha@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Alexsandy Correa', e: 'alexsandy.correa@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Carlos Marques', e: 'carlos.marques@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Guilherme Pinheiro', e: 'guilherme.pinheiro@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Roberty Machado', e: 'roberty.machado@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Lucas Almeida', e: 'lucas.almeida@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'José Pablo', e: 'jose.pablo@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Maria Eduarda Merhet', e: 'maria.merhet@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Gabriel Bernadini', e: 'gabriel.bernadini@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Gabriel Krysa', e: 'gabriel.krysa@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Matheus de Oliveira', e: 'matheus.oliveira@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Joyce Cordeiro', e: 'joyce.cordeiro@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Bruno Garcia', e: 'bruno.garcia@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Rosiane Correa', e: 'rosiane.correa@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Mateus Gerigk', e: 'mateus.gerigk@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Laiza Cruz', e: 'cirene.lara@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Rafaela Stephan', e: 'rafaela.stephan@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Roberta Gomes', e: 'roberta.gomes@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Guilherme Minuzzi', e: 'guilherme.minuzzi@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Gustavo Dangui', e: 'gustavo.dangui@grupo-3c.com' },
  { s: 'HS', l: 'Closer / Analista', n: 'Leandro Mülhstdtt', e: 'leandro.mulhstdtt@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Felipe do Nascimento', e: 'felipe.nascimento@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Filipe Ferreira Rovea', e: 'filipe.rovea@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Alexander Reis', e: 'alexander.reis@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Wesley Diogo Vale', e: 'wesley.vale@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Gabriel Machado', e: 'gabriel.machado@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Rian Lucas', e: 'rian.almeida@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Alana Gaspar', e: 'alana.gaspar@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Gabriel Stefaniw', e: 'gabriel.lima@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Ian Ronska', e: 'ian.ronska@grupo-3c.com' },
  { s: 'HS', l: 'Atendimento ao cliente', n: 'Alan Armstrong', e: 'alan.armstrong@grupo-3c.com' },
  { s: 'HS', l: 'Service / Sales', n: 'Diogo Hartmann', e: 'diogo.hartmann@grupo-3c.com' },
  { s: 'HS', l: 'Service / Sales', n: 'Mathaus Alves', e: 'mathaus.alves@grupo-3c.com' },

  // --- META (MT) ---
  { s: 'MT', l: 'Business Manager', n: 'Maria Schimanski', e: 'maria.schimanski@grupo-3c.com' },
  { s: 'MT', l: 'Business Manager', n: 'Rebeca Costa', e: 'rebeca.costa@grupo-3c.com' },
  { s: 'MT', l: 'Business Manager', n: 'Eduardo Bueno', e: 'eduardo.bueno@grupo-3c.com' },
  { s: 'MT', l: 'Business Manager', n: 'José Zimmermann', e: 'jose.zimmermann@grupo-3c.com' },
  { s: 'MT', l: 'Business Manager', n: 'Leonardo Maciel', e: 'leonardo.maciel@grupo-3c.com' },
  { s: 'MT', l: 'Business Manager', n: 'Gustavo Delonzek', e: 'gustavo.delonzek@grupo-3c.com' },
  { s: 'MT', l: 'Business Manager', n: 'Gabriel Krysa', e: 'gabriel.krysa@3cplusnow.com' },
  { s: 'MT', l: 'Business Manager', n: 'Diogo Hartmann', e: 'diogo@3cplusnow.com' },
  { s: 'MT', l: 'Business Manager', n: 'Junior Andrade', e: 'junior.andrade@3cplusnow.com' },
  { s: 'MT', l: 'Business Manager', n: 'Anne 3C', e: 'annersouza03@gmail.com' },
  { s: 'MT', l: 'Business Manager', n: 'Rafael Blaka', e: 'rafael.schimanski@3cplusnow.com' },
  { s: 'MT', l: 'Business Manager', n: 'Alexander Reis', e: 'alexander.reis@grupo-3c.com' },
  { s: 'MT', l: 'Business Manager', n: 'Wesley Diogo', e: 'wesley.vale@grupo-3c.com' },
  { s: 'MT', l: 'Acesso Parcial - Básico', n: 'Rafael Rickli', e: 'rafael.rickli@bettegacob.com.br' },
  { s: 'MT', l: 'Acesso Parcial - Básico', n: 'Ana Luiza Ida', e: 'ana.ida@grupo-3c.com' },
  { s: 'MT', l: 'Acesso Parcial - Básico', n: 'Vinicius Vini', e: 'vinicius.leal@grupo-3c.com' },
  { s: 'MT', l: 'Acesso Parcial - Básico', n: 'Guilherme Pimpão', e: 'guilherme.pimpao@grupo-3c.com' },
  { s: 'MT', l: 'Acesso Parcial - Básico', n: 'Lucas Schupchek', e: 'lucas.schupchek@grupo-3c.com' },
  { s: 'MT', l: 'Acesso Parcial - Básico', n: 'Lucas Matheus', e: 'lucas.matheus@grupo-3c.com' },
  { s: 'MT', l: 'Acesso Parcial - Básico, Apps', n: 'Vinicius Biasi', e: 'vinicius.assmann@grupo-3c.com' },
  { s: 'MT', l: 'Acesso Parcial - Básico, Apps', n: 'Kauê Vargas', e: 'kauevargas.design@gmail.com' },
  { s: 'MT', l: 'Convidado (a)', n: 'Mathaus Kozkodai', e: 'mathaus_kozkodai@hotmail.com' },
];

async function upsertUser(email: string, name: string) {
  if (!email) return null;
  // Use findFirst with insensitive mode instead of findUnique to avoid duplicates
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
  if (existing) return existing;
  return await prisma.user.create({ data: { email, name } });
}

async function main() {
  console.log('🌱 Iniciando Seed SEGURO (Baseado nos CSVs reais)...');

  // MODO SEGURO: Não apaga nada
  // await prisma.access.deleteMany();
  // await prisma.tool.deleteMany();

  const toolMap = new Map<string, string>();

  // 1. Criar Ferramentas e Owners (Apenas se faltar)
  for (const t of toolsMaster) {
    const owner = await upsertUser(t.ownerEmail, 'Owner ' + t.sigla);
    let subOwner = null;
    if (t.subEmail) subOwner = await upsertUser(t.subEmail, 'Sub ' + t.sigla);

    // Check existing
    let tool = await prisma.tool.findFirst({
      where: { name: { equals: t.name, mode: 'insensitive' } }
    });

    if (!tool) {
      tool = await prisma.tool.create({
        data: {
          name: t.name,
          ownerId: owner?.id,
          subOwnerId: subOwner?.id
        }
      });
      console.log(`➕ Ferramenta criada: ${t.name}`);
    }

    toolMap.set(t.sigla, tool.id);
  }

  // 2. Inserir Acessos (Checando duplicidade)
  for (const item of accessData) {
    const user = await upsertUser(item.e, item.n);
    const toolId = toolMap.get(item.s);

    if (user && toolId) {
      const existing = await prisma.access.findFirst({
        where: { userId: user.id, toolId: toolId }
      });

      if (!existing) {
        await prisma.access.create({
          data: {
            userId: user.id,
            toolId: toolId,
            status: item.l
          }
        });
      }
    }
  }

  console.log('✅ Seed finalizado. Dados preservados e completados.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });