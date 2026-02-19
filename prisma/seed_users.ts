import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ====================================================================
// LISTA DE DADOS OFICIAIS (AGORA COM OS E-MAILS REAIS MAPEADOS)
// ====================================================================
const usersList = [
    { email: "alexander.reis@grupo-3c.com", name: "Alexander Eduardo dos Reis", jobTitle: "Líder de Professional Service", department: "Professional Service", managerEmail: "ricardo.camargo@grupo-3c.com" },
    { email: "camila.brunetti@grupo-3c.com", name: "Camila Brunetti Thomé", jobTitle: "Líder de Farmer", department: "Comercial", managerEmail: "camila.oliveira@grupo-3c.com" },
    { email: "camila.oliveira@grupo-3c.com", name: "Camila Souza de Oliveira", jobTitle: "Head Comercial", department: "Comercial", managerEmail: "jaqueline.souza@grupo-3c.com" },
    { email: "carlos.marques@grupo-3c.com", name: "Carlos Henrique Marques", jobTitle: "Tech Lead", department: "Produto", managerEmail: "guilherme.pimpao@grupo-3c.com" },
    { email: "caroline.gois@grupo-3c.com", name: "Caroline Fatima de Gois Fila", jobTitle: "Líder de Vendas PME", department: "Comercial", managerEmail: "camila.oliveira@grupo-3c.com" },
    { email: "emily.godoy@grupo-3c.com", name: "Emily Godoy Da Silva", jobTitle: "Líder de Parcerias", department: "Parcerias", managerEmail: "wagner.wolff@grupo-3c.com" },
    { email: "gabriel.krysa@grupo-3c.com", name: "Gabriel Krysa", jobTitle: "Tech Lead", department: "Produto", managerEmail: "guilherme.pimpao@grupo-3c.com" },
    { email: "jehnnifer.padilha@grupo-3c.com", name: "Jehnnifer Xavier Padilha", jobTitle: "Líder de Enterprise", department: "Comercial", managerEmail: "camila.oliveira@grupo-3c.com" },
    { email: "fernando.mosquer@grupo-3c.com", name: "José Fernando Mosquer", jobTitle: "Líder de Atendimento ao Cliente", department: "Atendimento ao Cliente", managerEmail: "ricardo.camargo@grupo-3c.com" },
    { email: "kawanna.cordeiro@grupo-3c.com", name: "Kawanna Barbosa Cordeiro", jobTitle: "Coordenadora do Instituto 3C", department: "Instituto 3C", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "michele.anjos@grupo-3c.com", name: "Michele Bodot dos Anjos", jobTitle: "Líder PME", department: "Comercial", managerEmail: "ricardo.camargo@grupo-3c.com" },
    { email: "pablo.emanuel@grupo-3c.com", name: "Pablo Emanuel da Silva", jobTitle: "Líder de automações", department: "Automações", managerEmail: "ricardo.camargo@grupo-3c.com" },
    { email: "rafael.schimanski@grupo-3c.com", name: "Rafael Blaka Schimanski", jobTitle: "Líder de marketing", department: "Marketing", managerEmail: "wagner.wolff@grupo-3c.com" },
    { email: "vladimir.sesar@grupo-3c.com", name: "Vladimir Antonio Sesar", jobTitle: "Líder de Segurança da Informação", department: "Tecnologia e Segurança", managerEmail: "diogo.hartmann@grupo-3c.com" },
    { email: "guilherme.pinheiro@grupo-3c.com", name: "Guilherme Pinheiro", jobTitle: "Head de Produto", department: "FiqOn", managerEmail: "guilherme.pimpao@grupo-3c.com" },
    { email: "pietro.limberger@grupo-3c.com", name: "Pietro Limberger", jobTitle: "CEO Dizify", department: "Dizify", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "marieli.ferreira@grupo-3c.com", name: "Marieli Aparecida Ferreira Thomen", jobTitle: "Tech Lead", department: "Produto", managerEmail: "pietro.limberger@grupo-3c.com" },
    { email: "taryk.ferreira@grupo-3c.com", name: "Taryk", jobTitle: "Líder de Vendas Dizify", department: "Comercial Dizify", managerEmail: "pietro.limberger@grupo-3c.com" },
    { email: "thomas.ferreira@grupo-3c.com", name: "Thomas Arnon Schmidt Ferreira", jobTitle: "Líder Enterprise", department: "Comercial", managerEmail: "camila.oliveira@grupo-3c.com" },
    { email: "ney.pereira@grupo-3c.com", name: "Ney Eurico Pereira", jobTitle: "CEO", department: "Board", managerEmail: null },
    { email: "wagner.wolff@grupo-3c.com", name: "Wagner Wolff Pretto", jobTitle: "CMO", department: "Board", managerEmail: "ney.pereira@grupo-3c.com" },
    { email: "lucas.limberger@grupo-3c.com", name: "Lucas Limberger", jobTitle: "CPO", department: "Board", managerEmail: "ney.pereira@grupo-3c.com" },
    { email: "ricardo.camargo@grupo-3c.com", name: "Ricardo Borges Camargo", jobTitle: "COO", department: "Board", managerEmail: "ney.pereira@grupo-3c.com" },
    { email: "guilherme.pimpao@grupo-3c.com", name: "Guilherme Pimpão Cavalcante", jobTitle: "CPOX", department: "Board", managerEmail: "ney.pereira@grupo-3c.com" },
    { email: "diogo.hartmann@grupo-3c.com", name: "Diogo Henrique Hartmann", jobTitle: "CTO", department: "Board", managerEmail: "ney.pereira@grupo-3c.com" },
    { email: "aline.fonseca@grupo-3c.com", name: "Aline Alda da Fonseca Bocchi", jobTitle: "CFO", department: "Board", managerEmail: "ney.pereira@grupo-3c.com" },
    { email: "jaqueline.souza@grupo-3c.com", name: "Jaqueline de Souza", jobTitle: "CSO", department: "Board", managerEmail: "ney.pereira@grupo-3c.com" },
    { email: "bruno.sahaidak@grupo-3c.com", name: "Bruno Sahaidak", jobTitle: "Analista Contábil", department: "Administrativo", managerEmail: "aline.fonseca@grupo-3c.com" },
    { email: "fernando.takakusa@grupo-3c.com", name: "Fernando Vantroba Takakusa", jobTitle: "Assistente Financeiro", department: "Administrativo", managerEmail: "aline.fonseca@grupo-3c.com" },
    { email: "gabriely.garcia@grupo-3c.com", name: "Gabriely Garcia", jobTitle: "Assistente Jurídico", department: "Administrativo", managerEmail: "aline.fonseca@grupo-3c.com" },
    { email: "maria.rosa@grupo-3c.com", name: "Maria Eduarda Nezelo Rosa", jobTitle: "Assistente Jurídico", department: "Administrativo", managerEmail: "aline.fonseca@grupo-3c.com" },
    { email: "raphael.pires@grupo-3c.com", name: "Raphael Pires Ida", jobTitle: "Analista de Departamento Pessoal", department: "Administrativo", managerEmail: "aline.fonseca@grupo-3c.com" },
    { email: "sthephany.moraes@grupo-3c.com", name: "Sthephany Tomacheski de Moraes", jobTitle: "Assistente Financeiro", department: "Administrativo", managerEmail: "aline.fonseca@grupo-3c.com" },
    { email: "andrieli.javorski@grupo-3c.com", name: "Andrieli de Oliveira Javorski", jobTitle: "Desenvolvedor Front-end", department: "Produto 3C+", managerEmail: "gabriel.krysa@grupo-3c.com" },
    { email: "matheus.rocha@grupo-3c.com", name: "Matheus Rocha Camargo", jobTitle: "Desenvolvedor Front-end", department: "Produto 3C+", managerEmail: "gabriel.krysa@grupo-3c.com" },
    { email: "bruno.garcia@grupo-3c.com", name: "Bruno Garcia", jobTitle: "Desenvolvedor Back-End", department: "Produto 3C+", managerEmail: "gabriel.krysa@grupo-3c.com" },
    { email: "jose.pablo@grupo-3c.com", name: "José Pablo Streiski Neto", jobTitle: "Desenvolvedor Back-End", department: "Produto 3C+", managerEmail: "gabriel.krysa@grupo-3c.com" },
    { email: "eduardo.goncalves@grupo-3c.com", name: "Eduardo Mateus dos Santos Gonçalves", jobTitle: "Desenvolvedor Back-End", department: "Produto 3C+", managerEmail: "gabriel.krysa@grupo-3c.com" },
    { email: "gabriel.ida@grupo-3c.com", name: "Gabriel Pires Ida", jobTitle: "UX Designer", department: "Produto 3C+", managerEmail: "carlos.marques@grupo-3c.com" },
    { email: "junior.andrade@grupo-3c.com", name: "Vanderlei Assis de Andrade Junior", jobTitle: "P.O", department: "Produto 3C+", managerEmail: "carlos.marques@grupo-3c.com" },
    { email: "matheus.oliveira@grupo-3c.com", name: "Matheus Oliveira", jobTitle: "Analista de Automações", department: "Produto", managerEmail: "guilherme.pimpao@grupo-3c.com" },
    { email: "gustavo.delonzek@grupo-3c.com", name: "Gustavo Delonzek Brizola", jobTitle: "Desenvolvedor Full-stack", department: "Produto 3C+", managerEmail: "gabriel.krysa@grupo-3c.com" },
    { email: "luis.paganini@grupo-3c.com", name: "Luis Fernando Paganini", jobTitle: "Desenvolvedor Front-end", department: "Produto Evolux", managerEmail: "carlos.marques@grupo-3c.com" },
    { email: "guilherme.ferreira@grupo-3c.com", name: "Guilherme Ferreira Ribas", jobTitle: "Desenvolvedor Front-end", department: "Produto Evolux", managerEmail: "carlos.marques@grupo-3c.com" },
    { email: "pedro.nascimento@grupo-3c.com", name: "Pedro Henrique Ferreira do Nascimento", jobTitle: "Desenvolvedor Back-End", department: "Produto Evolux", managerEmail: "carlos.marques@grupo-3c.com" },
    { email: "bruno.levy@grupo-3c.com", name: "Bruno Levy de Arruda", jobTitle: "DevOps", department: "Produto Evolux", managerEmail: "carlos.marques@grupo-3c.com" },
    { email: "lucas.schupchek@grupo-3c.com", name: "Lucas Schupchek de Jesus", jobTitle: "Desenvolvedor Back-End", department: "Produto FiqOn", managerEmail: "guilherme.pinheiro@grupo-3c.com" },
    { email: "lucas.matheus@grupo-3c.com", name: "Lucas Matheus da Cruz", jobTitle: "Desenvolvedor Back-End", department: "Produto FiqOn", managerEmail: "guilherme.pinheiro@grupo-3c.com" },
    { email: "yuri.lima@grupo-3c.com", name: "Yuri Karas Regis Pacheco de Miranda Lima", jobTitle: "Desenvolvedor Front-End", department: "Produto FiqOn", managerEmail: "guilherme.pinheiro@grupo-3c.com" },
    { email: "julia.araujo@grupo-3c.com", name: "Julia Gabrielly Martins Araujo", jobTitle: "Desenvolvedor Back-End", department: "Produto Dizify", managerEmail: "marieli.ferreira@grupo-3c.com" },
    { email: "maria.ribeiro@grupo-3c.com", name: "Maria Fernanda Ribeiro", jobTitle: "Desenvolvedor Front-End", department: "Produto Dizify", managerEmail: "marieli.ferreira@grupo-3c.com" },
    { email: "jeferson.cruz@grupo-3c.com", name: "Jeferson da Cruz", jobTitle: "Desenvolvedor Back-End", department: "Produto Dizify", managerEmail: "marieli.ferreira@grupo-3c.com" },
    { email: "leonardo.ferraz@grupo-3c.com", name: "Leonardo Kauan Ferraz", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "jehnnifer.padilha@grupo-3c.com" },
    { email: "joyce.cordeiro@grupo-3c.com", name: "Joyce Cordeiro", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "jehnnifer.padilha@grupo-3c.com" },
    { email: "kesley.oliveira@grupo-3c.com", name: "Kesley Luis de Oliveira", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "jehnnifer.padilha@grupo-3c.com" },
    { email: "rosiane.correa@grupo-3c.com", name: "Rosiane Correa", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "jehnnifer.padilha@grupo-3c.com" },
    { email: "mateus.gerigk@grupo-3c.com", name: "Mateus Gerik", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "jehnnifer.padilha@grupo-3c.com" },
    { email: "lucio.ramos@grupo-3c.com", name: "Lucio Marcos Nascimento Ramos", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "thomas.ferreira@grupo-3c.com" },
    { email: "guilherme.minuzzi@grupo-3c.com", name: "Guilherme Mello Minuzzi", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "thomas.ferreira@grupo-3c.com" },
    { email: "ketlin.oliveira@grupo-3c.com", name: "Ketlin Tainá Zaluski de Oliveira", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "thomas.ferreira@grupo-3c.com" },
    { email: "leandro.mulhstdtt@grupo-3c.com", name: "Leandro dos Santos Mülhstdtt da Silva", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "thomas.ferreira@grupo-3c.com" },
    { email: "gustavo.dangui@grupo-3c.com", name: "Gustavo dos Santos Dangui", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "thomas.ferreira@grupo-3c.com" },
    { email: "willian.samuel@grupo-3c.com", name: "Willian Samuel de Oliveira", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "thomas.ferreira@grupo-3c.com" },
    { email: "alexsandy.correa@grupo-3c.com", name: "Alexsandy Correa dos Santos", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "thomas.ferreira@grupo-3c.com" },
    { email: "deborah.peres@grupo-3c.com", name: "Deborah Peres", jobTitle: "SalesOps", department: "Comercial Contact", managerEmail: "thomas.ferreira@grupo-3c.com" },
    { email: "maria.merhet@grupo-3c.com", name: "Maria Eduarda Merhet Padilha", jobTitle: "Farmer", department: "Expansão", managerEmail: "camila.brunetti@grupo-3c.com" },
    { email: "daniel.souza@grupo-3c.com", name: "Daniel Felipe da Silva Souza", jobTitle: "Farmer", department: "Expansão", managerEmail: "camila.brunetti@grupo-3c.com" },
    { email: "kauane.bastos@grupo-3c.com", name: "Kauane Lemos Bastos", jobTitle: "Farmer", department: "Expansão", managerEmail: "camila.brunetti@grupo-3c.com" },
    { email: "taissa.almeida@grupo-3c.com", name: "Taissa Guilliane Gomes Almeida", jobTitle: "Farmer", department: "Expansão", managerEmail: "camila.brunetti@grupo-3c.com" },
    { email: "rafaela.stephan@grupo-3c.com", name: "Rafaela Guedes Pinto Cavalcante Stephan", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "michele.anjos@grupo-3c.com" },
    { email: "cirene.lara@grupo-3c.com", name: "Cirene Laiza da Cruz Lara", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "michele.anjos@grupo-3c.com" },
    { email: "maycon.barbosa@grupo-3c.com", name: "Maycon José Barbosa Padilha", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "michele.anjos@grupo-3c.com" },
    { email: "lucas.almeida@grupo-3c.com", name: "Lucas Fontoura de Almeida", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "michele.anjos@grupo-3c.com" },
    { email: "roberta.gomes@grupo-3c.com", name: "Roberta Gomes Ribeiro", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "michele.anjos@grupo-3c.com" },
    { email: "lucas.costa@grupo-3c.com", name: "Lucas Antonio Costa", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "michele.anjos@grupo-3c.com" },
    { email: "gabriel.bernadini@grupo-3c.com", name: "Gabriel Schneider Bernadini", jobTitle: "Recuperador", department: "Comercial Contact", managerEmail: "michele.anjos@grupo-3c.com" },
    { email: "bianca.cunha@grupo-3c.com", name: "Bianca da Cunha", jobTitle: "Closer", department: "Comercial Contact", managerEmail: "michele.anjos@grupo-3c.com" },
    { email: "eduardo.nascimento@grupo-3c.com", name: "Eduardo Elias", jobTitle: "Closer", department: "Comercial Dizify", managerEmail: "pietro.limberger@grupo-3c.com" },
    { email: "iago.prado@grupo-3c.com", name: "Iago Moura do Prado", jobTitle: "Closer", department: "Comercial Dizify", managerEmail: "pietro.limberger@grupo-3c.com" },
    { email: "allan.vonstein@grupo-3c.com", name: "Allan Von Stein Portela", jobTitle: "Analista de Segurança e Infraestrutura", department: "Tecnologia e Segurança", managerEmail: "vladimir.sesar@grupo-3c.com" },
    { email: "luan.silva@grupo-3c.com", name: "Luan Matheus da Silva", jobTitle: "Analista de Segurança da Informação", department: "Tecnologia e Segurança", managerEmail: "vladimir.sesar@grupo-3c.com" },
    { email: "ian.ronska@grupo-3c.com", name: "Ian Ronska Nepomoceno", jobTitle: "Analista de Custos", department: "Tecnologia e Segurança", managerEmail: "diogo.hartmann@grupo-3c.com" },
    { email: "joao.vasconcelos@grupo-3c.com", name: "João Paulo Vasconcelos", jobTitle: "DevOps", department: "Tecnologia e Segurança", managerEmail: "diogo.hartmann@grupo-3c.com" },
    { email: "gabriel.machado@grupo-3c.com", name: "Gabriel de Lima Machado", jobTitle: "Analista de PS", department: "Professional Service", managerEmail: "alexander.reis@grupo-3c.com" },
    { email: "wesley.vale@grupo-3c.com", name: "Wesley Diogo do Vale", jobTitle: "Analista de PS", department: "Professional Service", managerEmail: "alexander.reis@grupo-3c.com" },
    { email: "eduardo.wosiak@grupo-3c.com", name: "Eduardo Wosiak", jobTitle: "Professional Service", department: "Professional Service", managerEmail: "alexander.reis@grupo-3c.com" },
    { email: "felipe.nascimento@grupo-3c.com", name: "Felipe Moreira do Nascimento", jobTitle: "Analista PME", department: "Atendimento ao Cliente", managerEmail: "fernando.mosquer@grupo-3c.com" },
    { email: "filipe.rovea@grupo-3c.com", name: "Filipe Ferreira Rovea", jobTitle: "Analista PME", department: "Atendimento ao Cliente", managerEmail: "fernando.mosquer@grupo-3c.com" },
    { email: "rian.almeida@grupo-3c.com", name: "Rian Lucas de Matos Almeida", jobTitle: "Key Account", department: "Atendimento ao Cliente", managerEmail: "fernando.mosquer@grupo-3c.com" },
    { email: "alana.gaspar@grupo-3c.com", name: "Alana Maiumy Gaspar", jobTitle: "Key Account", department: "Atendimento ao Cliente", managerEmail: "fernando.mosquer@grupo-3c.com" },
    { email: "monica.neves@grupo-3c.com", name: "Mônica de Paula Neves", jobTitle: "Implantadora", department: "Atendimento ao Cliente", managerEmail: "fernando.mosquer@grupo-3c.com" },
    { email: "gabrielle.prestes@grupo-3c.com", name: "Gabrielle Andrade Prestes", jobTitle: "Implantadora", department: "Atendimento ao Cliente", managerEmail: "fernando.mosquer@grupo-3c.com" },
    { email: "mathaus.alves@grupo-3c.com", name: "Mathaus Kozkodai Alves", jobTitle: "Suporte Evolux", department: "Atendimento ao Cliente", managerEmail: "fernando.mosquer@grupo-3c.com" },
    { email: "pedro.barreto@grupo-3c.com", name: "Pedro Arthur Lobregati Barreto", jobTitle: "Analista de Suporte Técnico", department: "Atendimento ao Cliente FiqOn", managerEmail: "guilherme.pinheiro@grupo-3c.com" },
    { email: "roberty.machado@grupo-3c.com", name: "Roberty Augusto dos Santos Machado", jobTitle: "Analista de Suporte Técnico", department: "Atendimento ao Cliente FiqOn", managerEmail: "guilherme.pinheiro@grupo-3c.com" },
    { email: "matheus.siqueira@grupo-3c.com", name: "Matheus Lorenzo Siqueira", jobTitle: "Analista de Suporte Técnico", department: "Atendimento ao Cliente FiqOn", managerEmail: "guilherme.pinheiro@grupo-3c.com" },
    { email: "igor.ribeiro@grupo-3c.com", name: "Igor de Azevedo Ribeiro", jobTitle: "Gestor de Projetos", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "annelise.souza@grupo-3c.com", name: "Annelise Ribeiro de Souza", jobTitle: "Gestor de Tráfego Pago", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "rebeca.costa@grupo-3c.com", name: "Rebeca Costa de Lima", jobTitle: "Copywriter", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "leonardo.maciel@grupo-3c.com", name: "Leonardo Luiz Maciel", jobTitle: "Marketing Ops / Analista de Growth", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "kaue.vargas@grupo-3c.com", name: "Kauê Pszdzimirski de Vargas", jobTitle: "Designer", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "ana.ida@grupo-3c.com", name: "Ana Luiza de Souza Ida", jobTitle: "Social Media", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "richard.cordeiro@grupo-3c.com", name: "Richard Matheus Mendes Cordeiro", jobTitle: "Filmmaker", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "joao.marcos@grupo-3c.com", name: "João Marcos Costa de Lima", jobTitle: "Editor de vídeos", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "gustavo.schneider@grupo-3c.com", name: "Gustavo Santos Schneider", jobTitle: "Web Developer", department: "Marketing", managerEmail: "rafael.schimanski@grupo-3c.com" },
    { email: "alan.armstrong@grupo-3c.com", name: "Alan Armstrong", jobTitle: "Gestor de Projetos", department: "Marketing", managerEmail: "wagner.wolff@grupo-3c.com" },
    { email: "vinicius.leal@grupo-3c.com", name: "Vinícius Costa Leal", jobTitle: "Social Media", department: "Marketing", managerEmail: "richard.cordeiro@grupo-3c.com" },
    { email: "pamela.rocha@grupo-3c.com", name: "Pamela Eduarda Rocha", jobTitle: "Assistente de Parcerias", department: "Parcerias", managerEmail: "emily.godoy@grupo-3c.com" },
    { email: "vinicius.assmann@grupo-3c.com", name: "Vinícius Biasi Assmann", jobTitle: "Analista de Automações", department: "Automações", managerEmail: "pablo.emanuel@grupo-3c.com" },
    { email: "jose.zimmermann@grupo-3c.com", name: "José Eduardo Giannini Zimmermann", jobTitle: "Analista de Automações", department: "Automações", managerEmail: "pablo.emanuel@grupo-3c.com" },
    { email: "eduardo.bueno@grupo-3c.com", name: "Eduardo Portes Bueno", jobTitle: "Analista de Automações", department: "Automações", managerEmail: "pablo.emanuel@grupo-3c.com" },
    { email: "gislene.machado@grupo-3c.com", name: "Gislene Cristiane Santos Machado", jobTitle: "Analista de Recrutamento e Seleção", department: "Pessoas e Cultura", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "renata.czapiewski@grupo-3c.com", name: "Renata Czapiewski Silva", jobTitle: "Analista de Pessoas e Cultura", department: "Pessoas e Cultura", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "ana.antunes@grupo-3c.com", name: "Ana Paula Antunes", jobTitle: "Assistente Geral", department: "Pessoas e Cultura", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "andreia.cunha@bettega.online", name: "Andreia Vieira Cunha", jobTitle: "Zeladora", department: "Pessoas e Cultura", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "ivonete.soares@grupo-3c.com", name: "Ivonete Soares", jobTitle: "Zeladora", department: "Pessoas e Cultura", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "matheus.britto@grupo-3c.com", name: "Matheus Araujo Ribeiro de Britto", jobTitle: "Porteiro", department: "Pessoas e Cultura", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "paulo.bertoli@grupo-3c.com", name: "Paulo Fernando Bertoli", jobTitle: "Porteiro", department: "Pessoas e Cultura", managerEmail: "lucas.limberger@grupo-3c.com" },
    { email: "Gladston.kordiak@grupo-3C.com", name: "Gladston Kordiak", jobTitle: "Monitor Instituto 3C", department: "Instituto 3C", managerEmail: "kawanna.cordeiro@grupo-3c.com" },
    { email: "victor.raphael@grupo-3c.com", name: "Victor Raphael Pedroso de Lima", jobTitle: "Monitor Instituto 3C", department: "Instituto 3C", managerEmail: "kawanna.cordeiro@grupo-3c.com" },
    { email: "gabrieli.almeida@grupo-3c.com", name: "Gabrieli Estefani dos Anjos Almeida", jobTitle: "Assistente de Recrutamento e Seleção", department: "Instituto 3C", managerEmail: "kawanna.cordeiro@grupo-3c.com" },
    { email: "isabely.wendler@grupo-3c.com", name: "Isabely Wendler", jobTitle: "Gestor de Projetos", department: "Operações", managerEmail: "ricardo.camargo@grupo-3c.com" },

    // Os que estavam na sua lista de e-mails, mas não tinham cargo na lista anterior
    { email: "alessandro.schneider@grupo-3c.com", name: "Alessandro Schneider", jobTitle: "Colaborador", department: "Geral", managerEmail: null },
    { email: "andressa.krysa@grupo-3c.com", name: "Andressa Krysa", jobTitle: "Colaborador", department: "Geral", managerEmail: null },
    { email: "emanuelly.petel@grupo-3c.com", name: "Emanuelly Petel", jobTitle: "Colaborador", department: "Geral", managerEmail: null },
    { email: "guilherme.castro@grupo-3c.com", name: "Guilherme Castro", jobTitle: "Colaborador", department: "Geral", managerEmail: null },
    { email: "marciel.silva@grupo-3c.com", name: "Marciel Silva", jobTitle: "Colaborador", department: "Geral", managerEmail: null },
    { email: "nildson.machado@grupo-3c.com", name: "Nildson Machado", jobTitle: "Colaborador", department: "Geral", managerEmail: null },
    { email: "ovidio.farias@grupo-3c.com", name: "Ovidio Farias", jobTitle: "Colaborador", department: "Geral", managerEmail: null },
    { email: "gabriel.lima@grupo-3c.com", name: "Gabriel de Lima", jobTitle: "Colaborador", department: "Geral", managerEmail: null }
];


async function main() {
    console.log(`🚀 Iniciando VALIDAÇÃO INTELIGENTE COM E-MAILS REAIS...`);

    // ======================================================
    // 1. CADASTRAR/ATUALIZAR LISTA OFICIAL (UPSERT)
    // ======================================================
    console.log('🔄 Sincronizando usuários pelas credenciais exatas...');

    const adminEmails = [
        "vladimir.sesar@grupo-3c.com",
        "allan.vonstein@grupo-3c.com",
        "luan.silva@grupo-3c.com",
        "diogo.hartmann@grupo-3c.com",
        "carlos.marques@grupo-3c.com"
    ];

    let upsertCount = 0;

    for (const u of usersList) {
        // Garantir que o email do banco fica todo em minúsculo
        const cleanEmail = u.email.toLowerCase();
        const isAdmin = adminEmails.includes(cleanEmail);

        try {
            await prisma.user.upsert({
                where: { email: cleanEmail },
                update: {
                    name: u.name,
                    jobTitle: u.jobTitle,
                    department: u.department,
                    ...(isAdmin && { systemProfile: 'SUPER_ADMIN' })
                },
                create: {
                    email: cleanEmail,
                    name: u.name,
                    jobTitle: u.jobTitle,
                    department: u.department,
                    systemProfile: isAdmin ? 'SUPER_ADMIN' : 'VIEWER'
                }
            });
            upsertCount++;
        } catch (e: any) {
            console.error(`❌ Erro ao sincronizar ${u.name}:`, e.message);
        }
    }

    // ======================================================
    // 2. CONECTAR GESTORES (Validação Inteligente)
    // ======================================================
    console.log('🔗 Sincronizando hierarquia de gestores por e-mail...');
    let hierarchyCount = 0;

    for (const u of usersList) {
        if (u.managerEmail) {
            try {
                const employee = await prisma.user.findUnique({
                    where: { email: u.email.toLowerCase() }
                });

                const manager = await prisma.user.findUnique({
                    where: { email: u.managerEmail.toLowerCase() }
                });

                if (employee && manager && employee.managerId !== manager.id) {
                    await prisma.user.update({
                        where: { id: employee.id },
                        data: { managerId: manager.id }
                    });
                    hierarchyCount++;
                }
            } catch (e) { }
        }
    }

    console.log('======================================================');
    console.log(`🏁 SINCRONIZAÇÃO INTELIGENTE FINALIZADA!`);
    console.log(`✔️  ${upsertCount} usuários verificados/atualizados.`);
    console.log(`✔️  ${hierarchyCount} conexões de gestores corrigidas.`);
    console.log('======================================================');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());