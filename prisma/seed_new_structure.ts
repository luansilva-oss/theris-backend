import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const collaborators = [
    { name: 'Alan Armstrong', email: 'alan.armstrong@grupo-3c.com', jobTitle: 'Porta voz da marca', unit: '3C+', department: 'Marketing', managerName: 'Wagner Wolff Pretto' },
    { name: 'Alana Maiumy Gaspar', email: 'alana.gaspar@grupo-3c.com', jobTitle: 'Customer Success', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Alessandro Dorneles Schneider', email: 'alessandro.schneider@grupo-3c.com', jobTitle: 'Líder de Vendas PME', unit: '3C+', department: 'Comercial Contact', managerName: 'Camila Souza de Oliveira' },
    { name: 'Alexsandy Correa dos Santos', email: 'alexsandy.correa@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Aline Alda da Fonseca Bocchi', email: 'aline.fonseca@grupo-3c.com', jobTitle: 'CFO', unit: '3C+', department: 'Board', managerName: 'Ney Eurico Pereira' },
    { name: 'Allan Von Stein Portela', email: 'allan.vonstein@grupo-3c.com', jobTitle: 'Analista de SI e Infraestrutura', unit: '3C+', department: 'Tecnologia e Segurança', managerName: 'Vladimir Antonio Sesar' },
    { name: 'Ana Luiza de Souza Ida', email: 'ana.ida@grupo-3c.com', jobTitle: 'Social Media', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'Ana Paula Antunes', email: 'ana.antunes@grupo-3c.com', jobTitle: 'Assistente Geral', unit: '3C+', department: 'Pessoas e Performance', managerName: 'Lucas Limberger' },
    { name: 'Andressa Aparecida Krysa', email: 'andressa.krysa@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Andrieli de Oliveira Javorski', email: 'andrieli.javorski@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: '3C+', department: 'Produto 3C+', managerName: 'Gabriel Krysa' },
    { name: 'Annelise Ribeiro de Souza', email: 'annelise.souza@grupo-3c.com', jobTitle: 'Gestor de Tráfego Pago', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'Beninciaril Pola Alvarez Mahecha', email: 'beninciaril.mahecha@grupo-3c.com', jobTitle: 'Zeladora', unit: '3C+', department: 'Pessoas e Performance', managerName: 'Lucas Limberger' },
    { name: 'Bianca da Cunha', email: 'bianca.cunha@grupo-3c.com', jobTitle: 'Closer ', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Bruno Garcia', email: 'bruno.garcia@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: '3C+', department: 'Produto 3C+', managerName: 'Gabriel Krysa' },
    { name: 'Bruno Levy de Arruda', email: 'bruno.levy@grupo-3c.com', jobTitle: 'DevOps', unit: 'Evolux', department: 'Produto 3C+', managerName: 'Carlos Henrique Marques' },
    { name: 'Bruno Sahaidak', email: 'bruno.sahaidak@grupo-3c.com', jobTitle: 'Analista Contábil', unit: '3C+', department: 'Administrativo', managerName: 'Aline Alda da Fonseca Bocchi' },
    { name: 'Camila Brunetti Thomé', email: 'camila.brunetti@grupo-3c.com', jobTitle: 'Líder de Expansão', unit: '3C+', department: 'Expansão', managerName: 'Ricardo Borges Camargo' },
    { name: 'Camila Souza de Oliveira', email: 'camila.oliveira@grupo-3c.com', jobTitle: 'Head Comercial', unit: '3C+', department: 'Comercial Contact', managerName: 'Jaqueline de Souza' },
    { name: 'Carlos Henrique Marques', email: 'carlos.marques@grupo-3c.com', jobTitle: 'Tech Lead ', unit: '3C+', department: 'Produto 3C+', managerName: 'Guilherme Pimpão' },
    { name: 'Caroline Fatima de Gois Fila', email: 'caroline.gois@grupo-3c.com', jobTitle: 'Líder de Vendas PME', unit: '3C+', department: 'Comercial Contact', managerName: 'Camila Souza de Oliveira' },
    { name: 'Cirene Laiza da Cruz Lara', email: 'cirene.lara@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Dafiny Mélory Cordeiro Melo França', email: 'dafiny.franca@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Daniel Felipe da Silva Souza', email: 'daniel.souza@grupo-3c.com', jobTitle: 'Analista de Expansão', unit: '3C+', department: 'Expansão', managerName: 'Camila Brunetti Thomé' },
    { name: 'Deborah Peres', email: 'deborah.peres@grupo-3c.com', jobTitle: 'SalesOps', unit: '3C+', department: 'Comercial Contact', managerName: 'Camila Souza de Oliveira' },
    { name: 'Diogo Henrique Hartmann', email: 'diogo.hartmann@grupo-3c.com', jobTitle: 'CTO', unit: '3C+', department: 'Board', managerName: 'Ney Eurico Pereira' },
    { name: 'Eduardo Elias do Nascimento', email: 'eduardo.nascimento@grupo-3c.com', jobTitle: 'Closer ', unit: 'Dizify', department: 'Dizify', managerName: 'Pietro Limberger' },
    { name: 'Eduardo Mateus dos Santos Gonçalves', email: 'eduardo.goncalves@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: '3C+', department: 'Produto 3C+', managerName: 'Gabriel Krysa' },
    { name: 'Eduardo Portes Bueno', email: 'eduardo.bueno@grupo-3c.com', jobTitle: 'Analista de Automações', unit: '3C+', department: 'RevOps', managerName: 'Pablo Emanuel da Silva' },
    { name: 'Eduardo Wosiak', email: 'eduardo.wosiak@grupo-3c.com', jobTitle: 'Analista de Projetos', unit: '3C+', department: 'Professional Service', managerName: 'Ricardo Borges Camargo' },
    { name: 'Emanuelly Petel', email: 'emanuelly.petel@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Emily Godoy Da Silva', email: 'emily.godoy@grupo-3c.com', jobTitle: 'Líder de Parcerias', unit: '3C+', department: 'Parcerias', managerName: 'Wagner Wolff Pretto' },
    { name: 'Felipe Moreira do Nascimento', email: 'felipe.nascimento@grupo-3c.com', jobTitle: 'Customer Success', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Fernando Vantroba Takakusa', email: 'fernando.takakusa@grupo-3c.com', jobTitle: 'Analista Financeiro', unit: '3C+', department: 'Administrativo', managerName: 'Aline Alda da Fonseca Bocchi' },
    { name: 'Filipe Ferreira Rovea', email: 'filipe.rovea@grupo-3c.com', jobTitle: 'Customer Success', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Gabriel de Lima Machado', email: 'gabriel.machado@grupo-3c.com', jobTitle: 'Analista de Automações', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Gabriel Krysa', email: 'gabriel.krysa@grupo-3c.com', jobTitle: 'Tech Lead', unit: '3C+', department: 'Produto 3C+', managerName: 'Guilherme Pimpão' },
    { name: 'Gabriel Pires Ida', email: 'gabriel.ida@grupo-3c.com', jobTitle: 'UX Designer', unit: '3C+', department: 'Produto 3C+', managerName: 'Guilherme Pimpão' },
    { name: 'Gabriel Schneider Bernadini', email: 'gabriel.bernadini@grupo-3c.com', jobTitle: 'Customer Success - Recuperação', unit: '3C+', department: 'Expansão', managerName: 'Camila Brunetti Thomé' },
    { name: 'Gabrieli Estefani dos Anjos Almeida', email: 'gabrieli.almeida@grupo-3c.com', jobTitle: 'Assistente de Recrutamento e Seleção', unit: 'Instituto 3C', department: 'Instituto 3C', managerName: 'Kawanna Barbosa Cordeiro' },
    { name: 'Gabrielle Andrade Prestes', email: 'gabrielle.prestes@grupo-3c.com', jobTitle: 'Analista de Implantação', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Gabriely Garcia', email: 'gabriely.garcia@grupo-3c.com', jobTitle: 'Analista Jurídico', unit: '3C+', department: 'Administrativo', managerName: 'Aline Alda da Fonseca Bocchi' },
    { name: 'Gislene Cristiane Santos Machado', email: 'gislene.machado@grupo-3c.com', jobTitle: 'Analista de Recrutamento e Seleção ', unit: '3C+', department: 'Pessoas e Performance', managerName: 'Lucas Limberger' },
    { name: 'Gladston Kordiak', email: 'gladston.kordiak@grupo-3c.com', jobTitle: 'Monitor Instituto 3C', unit: 'Instituto 3C', department: 'Instituto 3C', managerName: 'Kawanna Barbosa Cordeiro' },
    { name: 'Guilherme Ferreira Ribas', email: 'guilherme.ferreira@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: '3C+', department: 'Produto 3C+', managerName: 'Carlos Henrique Marques' },
    { name: 'Guilherme Medino Castro', email: 'guilherme.castro@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Guilherme Mello Minuzzi', email: 'guilherme.minuzzi@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Guilherme Pimpão Cavalcante', email: 'guilherme.pimpao@grupo-3c.com', jobTitle: 'CPOX', unit: '3C+', department: 'Board', managerName: 'Ney Eurico Pereira' },
    { name: 'Guilherme Pinheiro Lemos', email: 'guilherme.pinheiro@grupo-3c.com', jobTitle: 'Tech Lead ', unit: 'FiqOn', department: 'Produto 3C+', managerName: 'Guilherme Pimpão' },
    { name: 'Gustavo Delonzek Brizola', email: 'gustavo.delonzek@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: 'Dizparos', department: 'Produto 3C+', managerName: 'Carlos Henrique Marques' },
    { name: 'Gustavo dos Santos Dangui', email: 'gustavo.dangui@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Gustavo Santos Schneider', email: 'gustavo.schneider@grupo-3c.com', jobTitle: 'Web Developer', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'Iago Moura do Prado', email: 'iago.prado@grupo-3c.com', jobTitle: 'Closer ', unit: 'Dizify', department: 'Dizify', managerName: 'Pietro Limberger' },
    { name: 'Ian Ronska Nepomoceno', email: 'ian.ronska@grupo-3c.com', jobTitle: 'Analista de Telecom', unit: '3C+', department: 'Produto 3C+', managerName: 'Guilherme Pimpão' },
    { name: 'Igor de Azevedo Ribeiro', email: 'igor.ribeiro@grupo-3c.com', jobTitle: 'Gestor de Projetos', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'Isabely Wendler', email: 'isabely.wendler@grupo-3c.com', jobTitle: 'Gestor de Projetos', unit: '3C+', department: 'Operações', managerName: 'Ricardo Borges Camargo' },
    { name: 'Italo Rossi Batista Cocentino', email: 'italo.rossi@grupo-3c.com', jobTitle: 'Líder de Produto ', unit: '3C+', department: 'Produto Evolux', managerName: 'Alan Armstrong' },
    { name: 'Ivonete Soares', email: 'ivonete.soares@grupo-3c.com', jobTitle: 'Zeladora', unit: '3C+', department: 'Pessoas e Performance', managerName: 'Lucas Limberger' },
    { name: 'Jaqueline de Souza', email: 'jaqueline.souza@grupo-3c.com', jobTitle: 'CSO', unit: '3C+', department: 'Board', managerName: 'Ney Eurico Pereira' },
    { name: 'Jeferson da Cruz', email: 'jeferson.cruz@grupo-3c.com', jobTitle: 'Desenvolvedor Back-End', unit: 'Dizify', department: 'Dizify', managerName: 'Pietro Limberger' },
    { name: 'Jehnnifer Xavier Padilha', email: 'jehnnifer.padilha@grupo-3c.com', jobTitle: 'Líder de Enterprise ', unit: '3C+', department: 'Comercial Contact', managerName: 'Jaqueline de Souza' },
    { name: 'João Marcos Costa de Lima', email: 'joao.marcos@grupo-3c.com', jobTitle: 'Editor', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'João Paulo Vasconcelos do Vale', email: 'joao.vasconcelos@grupo-3c.com', jobTitle: 'DevOps', unit: '3C+', department: 'Produto 3C+', managerName: 'Guilherme Pimpão' },
    { name: 'José Eduardo Giannini Zimmermann', email: 'jose.zimmermann@grupo-3c.com', jobTitle: 'Analista de Automações', unit: '3C+', department: 'RevOps', managerName: 'Pablo Emanuel da Silva' },
    { name: 'José Fernando Mosquer', email: 'fernando.mosquer@grupo-3c.com', jobTitle: 'Líder de Atendimento ao Cliente', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'Ricardo Borges Camargo' },
    { name: 'José Pablo Streiski Neto', email: 'jose.pablo@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: '3C+', department: 'Produto 3C+', managerName: 'Gabriel Krysa' },
    { name: 'Joyce Cordeiro', email: 'joyce.cordeiro@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Julia Gabrielly Martins Araujo', email: 'julia.araujo@grupo-3c.com', jobTitle: 'Desenvolvedor Back-End', unit: 'Dizify', department: 'Dizify', managerName: 'Pietro Limberger' },
    { name: 'Vanderlei Assis de Andrade Junior', email: 'junior.andrade@grupo-3c.com', jobTitle: 'Analista de Negócios (PO)', unit: '3C+', department: 'Produto 3C+', managerName: 'Guilherme Pimpão' },
    { name: 'Kauane Lemos Bastos', email: 'kauane.bastos@grupo-3c.com', jobTitle: 'Analista de Expansão', unit: '3C+', department: 'Expansão', managerName: 'Camila Brunetti Thomé' },
    { name: 'Kauê Pszdzimirski de Vargas', email: 'kaue.vargas@grupo-3c.com', jobTitle: 'Designer', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'Kawanna Barbosa Cordeiro', email: 'kawanna.cordeiro@grupo-3c.com', jobTitle: 'Coordenadora do Instituto 3C', unit: 'Instituto 3C', department: 'Instituto 3C', managerName: 'Lucas Limberger' },
    { name: 'Kesley Luis de Oliveira', email: 'kesley.oliveira@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Ketlin Tainá Zaluski de Oliveira', email: 'ketlin.oliveira@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Leandro dos Santos Mülhstdtt da Silva', email: 'leandro.mulhstdtt@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Leonardo Kauan Ferraz', email: 'leonardo.ferraz@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Leonardo Luiz Maciel', email: 'leonardo.maciel@grupo-3c.com', jobTitle: 'Marketing Ops/ Analista de Growth', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'Luan Matheus dos Santos Silva', email: 'luan.silva@grupo-3c.com', jobTitle: 'Assistente de Segurança da Informação ', unit: '3C+', department: 'Tecnologia e Segurança', managerName: 'Vladimir Antonio Sesar' },
    { name: 'Lucas Antonio Costa', email: 'lucas.costa@grupo-3c.com', jobTitle: 'Closer ', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Lucas Fontoura de Almeida', email: 'lucas.almeida@grupo-3c.com', jobTitle: 'Closer ', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Lucas Limberger', email: 'lucas.limberger@grupo-3c.com', jobTitle: 'CPO', unit: '3C+', department: 'Board', managerName: '' },
    { name: 'Lucas Matheus da Cruz', email: 'lucas.matheus@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: 'FiqOn', department: 'Produto 3C+', managerName: 'Guilherme Pinheiro Lemos' },
    { name: 'Lucas Schupchek de Jesus', email: 'lucas.schupchek@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: 'FiqOn', department: 'Produto 3C+', managerName: 'Guilherme Pinheiro Lemos' },
    { name: 'Lucio Marcos Nascimento Ramos', email: 'lucio.ramos@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Luis Fernando Paganini', email: 'luis.paganini@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: '3C+', department: 'Produto 3C+', managerName: 'Carlos Henrique Marques' },
    { name: 'Luiz Emanoel Servo', email: 'luiz.servo@grupo-3c.com', jobTitle: 'Porteiro', unit: '3C+', department: 'Pessoas e Performance', managerName: 'Lucas Limberger' },
    { name: 'Marciel Boruch da Silva', email: 'marciel.silva@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Maria Eduarda Merhet Padilha', email: 'maria.merhet@grupo-3c.com', jobTitle: 'Analista de Expansão', unit: '3C+', department: 'Expansão', managerName: 'Camila Brunetti Thomé' },
    { name: 'Maria Eduarda Nezelo Rosa', email: 'maria.rosa@grupo-3c.com', jobTitle: 'Assistente Jurídico', unit: '3C+', department: 'Administrativo', managerName: 'Aline Alda da Fonseca Bocchi' },
    { name: 'Maria Fernanda Ribeiro', email: 'maria.ribeiro@grupo-3c.com', jobTitle: 'Desenvolvedor Front-end', unit: 'Dizify', department: 'Dizify', managerName: 'Pietro Limberger' },
    { name: 'Marieli Aparecida Ferreira Thomen', email: 'marieli.ferreira@grupo-3c.com', jobTitle: 'Tech Lead', unit: 'Dizify', department: 'Dizify', managerName: 'Guilherme Pimpão' },
    { name: 'Mateus Gerigk', email: 'mateus.gerigk@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Mathaus Kozkodai Alves', email: 'mathaus.alves@grupo-3c.com', jobTitle: 'Customer Success', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Matheus de Oliveira', email: 'matheus.oliveira@grupo-3c.com', jobTitle: 'Analista de Automações', unit: '3C+', department: 'RevOps', managerName: 'Pablo Emanuel da Silva' },
    { name: 'Matheus Lorenzo Siqueira', email: 'matheus.siqueira@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: 'FiqOn', department: 'Produto 3C+', managerName: 'Guilherme Pinheiro Lemos' },
    { name: 'Matheus Rocha Camargo', email: 'matheus.rocha@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: '3C+', department: 'Produto 3C+', managerName: 'Gabriel Krysa' },
    { name: 'Maycon José Barbosa Padilha', email: 'maycon.barbosa@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Michele', email: 'michele.anjos@grupo-3c.com', jobTitle: 'Backoffice ', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Mônica de Paula Neves', email: 'monica.neves@grupo-3c.com', jobTitle: 'Analista de Implantação', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Ney Eurico Pereira', email: 'ney.pereira@grupo-3c.com', jobTitle: 'CEO', unit: '3C+', department: 'Board', managerName: '' },
    { name: 'Nildson Polis Machado', email: 'nildson.machado@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Ovídio José Corrêa Farias', email: 'ovidio.farias@grupo-3c.com', jobTitle: 'Analista de Automações', unit: '3C+', department: 'Professional Service', managerName: 'Ricardo Borges Camargo' },
    { name: 'Pablo Emanuel da Silva', email: 'pablo.emanuel@grupo-3c.com', jobTitle: 'Líder de RevOps', unit: '3C+', department: 'RevOps', managerName: 'Ricardo Borges Camargo' },
    { name: 'Pamela Eduarda Rocha', email: 'pamela.rocha@grupo-3c.com', jobTitle: 'Assistente de Parcerias ', unit: '3C+', department: 'Parcerias', managerName: 'Emily Godoy Da Silva' },
    { name: 'Paulo Fernando Bertoli', email: 'paulo.bertoli@grupo-3c.com', jobTitle: 'Porteiro', unit: '3C+', department: 'Pessoas e Performance', managerName: 'Lucas Limberger' },
    { name: 'Pedro Arthur Lobregati Barreto', email: 'pedro.barreto@grupo-3c.com', jobTitle: 'Gestor de Projetos', unit: '3C+', department: 'Professional Service', managerName: 'Ricardo Borges Camargo' },
    { name: 'Pedro Henrique Ferreira do Nascimento', email: 'pedro.nascimento@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: '3C+', department: 'Produto 3C+', managerName: 'Carlos Henrique Marques' },
    { name: 'Pietro Giovani Franciosi Limberger', email: 'pietro.limberger@grupo-3c.com', jobTitle: 'CEO', unit: 'Dizify', department: 'Dizify', managerName: 'Lucas Limberger' },
    { name: 'Rafael Blaka Schimanski', email: 'rafael.schimanski@grupo-3c.com', jobTitle: 'Líder de Marketing', unit: '3C+', department: 'Marketing', managerName: 'Wagner Wolff Pretto' },
    { name: 'Rafaela Guedes Pinto Cavalcante Stephan', email: 'rafaela.stephan@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Raphael Pires Ida', email: 'raphael.pires@grupo-3c.com', jobTitle: 'Analista de Departamento Pessoal', unit: '3C+', department: 'Administrativo', managerName: 'Aline Alda da Fonseca Bocchi' },
    { name: 'Rebeca Costa de Lima', email: 'rebeca.costa@grupo-3c.com', jobTitle: 'Copywriter', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'Renata Czapiewski Silva', email: 'renata.czapiewski@grupo-3c.com', jobTitle: 'Analista de Pessoas e Performance', unit: '3C+', department: 'Pessoas e Performance', managerName: 'Lucas Limberger' },
    { name: 'Rian Lucas de Matos Almeida', email: 'rian.almeida@grupo-3c.com', jobTitle: 'Customer Success', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Ricardo Borges Camargo', email: 'ricardo.camargo@grupo-3c.com', jobTitle: 'COO', unit: '3C+', department: 'Board', managerName: 'Ney Eurico Pereira' },
    { name: 'Richard Matheus Mendes Cordeiro', email: 'richard.cordeiro@grupo-3c.com', jobTitle: 'Filmmaker', unit: '3C+', department: 'Marketing', managerName: 'Rafael Blaka Schimanski' },
    { name: 'Roberta Gomes Ribeiro', email: 'roberta.gomes@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Alessandro Dorneles Schneider' },
    { name: 'Roberty Augusto dos Santos Machado', email: 'roberty.machado@grupo-3c.com', jobTitle: 'Customer Success', unit: 'FiqOn', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Rosiane Correa', email: 'rosiane.correa@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Sergio Filipe Gadelha Roza', email: 'sergio.filipe@grupo-3c.com', jobTitle: 'Desenvolvedor Back-End', unit: '3C+', department: 'Produto Evolux', managerName: 'Carlos Henrique Marques' },
    { name: 'Sthephany Tomacheski de Moraes', email: 'sthephany.moraes@grupo-3c.com', jobTitle: 'Analista Financeiro', unit: '3C+', department: 'Administrativo', managerName: 'Aline Alda da Fonseca Bocchi' },
    { name: 'Taissa Guilliane Gomes Almeida', email: 'taissa.almeida@grupo-3c.com', jobTitle: 'Analista de Expansão', unit: '3C+', department: 'Expansão', managerName: 'Camila Brunetti Thomé' },
    { name: 'Taryk de Souza Ferreira', email: 'taryk.ferreira@grupo-3c.com', jobTitle: 'Closer ', unit: 'Dizify', department: 'Dizify', managerName: 'Pietro Limberger' },
    { name: 'Thomas Arnon Schmidt Ferreira', email: 'thomas.ferreira@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Victor Raphael Pedroso de Lima', email: 'victor.raphael@grupo-3c.com', jobTitle: 'Monitor Instituto 3C', unit: 'Instituto 3C', department: 'Instituto 3C', managerName: 'Kawanna Barbosa Cordeiro' },
    { name: 'Vinícius Biasi Assmann', email: 'vinicius.assmann@grupo-3c.com', jobTitle: 'Analista de Automações', unit: '3C+', department: 'RevOps', managerName: 'Pablo Emanuel da Silva' },
    { name: 'Vladimir Antonio Sesar', email: 'vladimir.sesar@grupo-3c.com', jobTitle: 'Líder de Segurança da Informação', unit: '3C+', department: 'Tecnologia e Segurança', managerName: 'Diogo Henrique Hartmann' },
    { name: 'Vladimir Antonio Sesar', email: 'si@grupo-3c.com', jobTitle: 'Líder de Segurança da Informação', unit: '3C+', department: 'Tecnologia e Segurança', managerName: 'Diogo Henrique Hartmann' },
    { name: 'Wagner Wolff Pretto', email: 'wagner.wolff@grupo-3c.com', jobTitle: 'CMO', unit: '3C+', department: 'Board', managerName: 'Ney Eurico Pereira' },
    { name: 'Wesley Diogo do Vale', email: 'wesley.vale@grupo-3c.com', jobTitle: 'Analista de Automações', unit: '3C+', department: 'Atendimento ao Cliente', managerName: 'José Fernando Mosquer' },
    { name: 'Willian Samuel de Oliveira', email: 'willian.samuel@grupo-3c.com', jobTitle: 'Closer', unit: '3C+', department: 'Comercial Contact', managerName: 'Jehnnifer Xavier Padilha' },
    { name: 'Yuri Karas Regis Pacheco de Miranda Lima', email: 'yuri.lima@grupo-3c.com', jobTitle: 'Desenvolvedor Full Stack', unit: 'FiqOn', department: 'Produto 3C+', managerName: 'Guilherme Pinheiro Lemos' }
];

async function main() {
    console.log('🌱 Iniciando reorganização da estrutura 3C+...');

    // 1. Criar ou atualizar todos os usuários (sem managerId ainda)
    for (const col of collaborators) {
        if (!col.email) continue;
        await prisma.user.upsert({
            where: { email: col.email.toLowerCase().trim() },
            update: {
                name: col.name,
                jobTitle: col.jobTitle,
                department: col.department,
            },
            create: {
                email: col.email.toLowerCase().trim(),
                name: col.name,
                jobTitle: col.jobTitle,
                department: col.department,
                systemProfile: 'VIEWER'
            }
        });
    }

    // 2. Segunda passada: Vincular Gestores
    for (const col of collaborators) {
        if (col.managerName && col.email) {
            let manager = await prisma.user.findFirst({
                where: { name: { equals: col.managerName, mode: 'insensitive' } }
            });

            // Se não achou exato, tenta contém (para nomes curtos vs longos)
            if (!manager) {
                manager = await prisma.user.findFirst({
                    where: { name: { contains: col.managerName, mode: 'insensitive' } }
                });
            }

            if (manager) {
                await prisma.user.update({
                    where: { email: col.email.toLowerCase().trim() },
                    data: { managerId: manager.id }
                });
            } else {
                console.warn(`⚠️ Gestor não encontrado: ${col.managerName} para ${col.name}`);
            }
        }
    }

    console.log('✅ Estrutura reorganizada com sucesso!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
