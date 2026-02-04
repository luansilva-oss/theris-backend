import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DEFINIÇÃO DOS DADOS
const toolsData = [
    // 1. JumpCloud (JC)
    {
        name: "JumpCloud",
        acronym: "JC",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: "luan.silva@grupo-3c.com", subOwnerName: "Luan Matheus",
        accesses: [
            { email: "vladimir.sesar@grupo-3c.com", level: "Administrador with Billing" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador with Billing" },
            { email: "luan.silva@grupo-3c.com", level: "Administrador with Billing" },
            { email: "allan.vonstein@grupo-3c.com", level: "Administrador with Billing" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Help Desk" }
        ]
    },
    // 2. ClickUp (CK)
    {
        name: "ClickUp",
        acronym: "CK",
        ownerEmail: "isabely.wendler@grupo-3c.com", ownerName: "Isabely Wendler",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Proprietário" },
            { email: "alexander.reis@grupo-3c.com", level: "Administrador" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "igor.ribeiro@grupo-3c.com", level: "Administrador" },
            { email: "isabely.wendler@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Administrador" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Administrador" },
            { email: "alan.armstrong@grupo-3c.com", level: "Membro" },
            { email: "bruno.levy@grupo-3c.com", level: "Membro" },
            { email: "camila.oliveira@grupo-3c.com", level: "Membro" },
            { email: "carlos.marques@grupo-3c.com", level: "Membro" },
            { email: "eduardo.bueno@grupo-3c.com", level: "Membro" },
            { email: "fernando.mosquer@grupo-3c.com", level: "Membro" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Membro" },
            { email: "gabriel.krysa@grupo-3c.com", level: "Membro" },
            { email: "gislene.machado@grupo-3c.com", level: "Membro" },
            { email: "guilherme.pinheiro@grupo-3c.com", level: "Membro" },
            { email: "jaqueline.souza@grupo-3c.com", level: "Membro" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Membro" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Membro" },
            { email: "kawanna.cordeiro@grupo-3c.com", level: "Membro" },
            { email: "luan.silva@grupo-3c.com", level: "Membro" },
            { email: "lucas.limberger@grupo-3c.com", level: "Membro" },
            { email: "pedro.nascimento@grupo-3c.com", level: "Membro" },
            { email: "rafael.schimanski@grupo-3c.com", level: "Membro" },
            { email: "wagnerwolffp@gmail.com", level: "Membro" }
            // Nota: wagner email pessoal no clickup? mantive conforme lista
        ]
    },
    // 3. HubSpot (HS)
    {
        name: "HubSpot",
        acronym: "HS",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "deborah.peres@grupo-3c.com", subOwnerName: "Deborah Peres",
        accesses: [
            // Admins
            { email: "wagner.wolff@grupo-3c.com", level: "Administrador" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Administrador" },
            { email: "deborah.peres@grupo-3c.com", level: "Administrador" },
            { email: "fernando.mosquer@grupo-3c.com", level: "Administrador" },
            { email: "allan.vonstein@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" },
            { email: "matheus.rocha@grupo-3c.com", level: "Administrador" },
            { email: "eduardo.wosiak@grupo-3c.com", level: "Administrador" },
            { email: "henrique.amorim@grupo-3c.com", level: "Administrador" },
            { email: "rafael.schimanski@grupo-3c.com", level: "Administrador" },
            { email: "leonardo.maciel@grupo-3c.com", level: "Administrador" },
            // Líder
            { email: "thomas.ferreira@grupo-3c.com", level: "Líder Comercial" },
            { email: "camila.oliveira@grupo-3c.com", level: "Líder Comercial" },
            { email: "taryk.ferreira@grupo-3c.com", level: "Líder Comercial" },
            { email: "jaqueline.souza@grupo-3c.com", level: "Líder Comercial" },
            { email: "caroline.gois@grupo-3c.com", level: "Líder Comercial" },
            { email: "michele.anjos@grupo-3c.com", level: "Líder Comercial" },
            { email: "emily.godoy@grupo-3c.com", level: "Líder Comercial" },
            { email: "camila.brunetti@grupo-3c.com", level: "Líder Comercial" },
            { email: "jehnnifer.padilha@grupo-3c.com", level: "Líder Comercial" },
            { email: "lucas.costa@grupo-3c.com", level: "Líder Comercial" },
            // Closer / Analista
            { email: "taissa.almeida@grupo-3c.com", level: "Closer / Analista" },
            { email: "sandra.siqueira@grupo-3c.com", level: "Closer / Analista" },
            { email: "bianca.cunha@grupo-3c.com", level: "Closer / Analista" },
            { email: "eduardo.nascimento@grupo-3c.com", level: "Closer / Analista" },
            { email: "iago.prado@grupo-3c.com", level: "Closer / Analista" },
            { email: "willian.samuel@grupo-3c.com", level: "Closer / Analista" },
            { email: "ketlin.oliveira@grupo-3c.com", level: "Closer / Analista" },
            { email: "monica.neves@grupo-3c.com", level: "Closer / Analista" },
            { email: "kauane.bastos@grupo-3c.com", level: "Closer / Analista" },
            { email: "daniel.souza@grupo-3c.com", level: "Closer / Analista" },
            { email: "gabrielle.prestes@grupo-3c.com", level: "Closer / Analista" },
            { email: "eduardo.goncalves@grupo-3c.com", level: "Closer / Analista" },
            { email: "maycon.barbosa@grupo-3c.com", level: "Closer / Analista" },
            { email: "lucio.ramos@grupo-3c.com", level: "Closer / Analista" },
            { email: "kesley.oliveira@grupo-3c.com", level: "Closer / Analista" },
            { email: "leonardo.ferraz@grupo-3c.com", level: "Closer / Analista" },
            { email: "pamela.rocha@grupo-3c.com", level: "Closer / Analista" },
            { email: "alexsandy.correa@grupo-3c.com", level: "Closer / Analista" },
            { email: "carlos.marques@grupo-3c.com", level: "Closer / Analista" },
            { email: "guilherme.pinheiro@grupo-3c.com", level: "Closer / Analista" },
            { email: "roberty.machado@grupo-3c.com", level: "Closer / Analista" },
            { email: "lucas.almeida@grupo-3c.com", level: "Closer / Analista" },
            { email: "jose.pablo@grupo-3c.com", level: "Closer / Analista" },
            { email: "maria.merhet@grupo-3c.com", level: "Closer / Analista" },
            { email: "gabriel.bernadini@grupo-3c.com", level: "Closer / Analista" },
            { email: "gabriel.krysa@grupo-3c.com", level: "Closer / Analista" },
            { email: "matheus.oliveira@grupo-3c.com", level: "Closer / Analista" },
            { email: "joyce.cordeiro@grupo-3c.com", level: "Closer / Analista" },
            { email: "bruno.garcia@grupo-3c.com", level: "Closer / Analista" },
            { email: "rosiane.correa@grupo-3c.com", level: "Closer / Analista" },
            { email: "mateus.gerigk@grupo-3c.com", level: "Closer / Analista" },
            { email: "cirene.lara@grupo-3c.com", level: "Closer / Analista" },
            { email: "rafaela.stephan@grupo-3c.com", level: "Closer / Analista" },
            { email: "roberta.gomes@grupo-3c.com", level: "Closer / Analista" },
            { email: "guilherme.minuzzi@grupo-3c.com", level: "Closer / Analista" },
            { email: "gustavo.dangui@grupo-3c.com", level: "Closer / Analista" },
            { email: "leandro.mulhstdtt@grupo-3c.com", level: "Closer / Analista" },
            // Atendimento
            { email: "felipe.nascimento@grupo-3c.com", level: "Atendimento" },
            { email: "filipe.rovea@grupo-3c.com", level: "Atendimento" },
            { email: "alexander.reis@grupo-3c.com", level: "Atendimento" },
            { email: "wesley.vale@grupo-3c.com", level: "Atendimento" },
            { email: "gabriel.machado@grupo-3c.com", level: "Atendimento" },
            { email: "rian.almeida@grupo-3c.com", level: "Atendimento" },
            { email: "alana.gaspar@grupo-3c.com", level: "Atendimento" },
            { email: "gabriel.lima@grupo-3c.com", level: "Atendimento" },
            { email: "ian.ronska@grupo-3c.com", level: "Atendimento" },
            { email: "alan.armstrong@grupo-3c.com", level: "Atendimento" },
            // Service
            { email: "diogo.hartmann@grupo-3c.com", level: "Service / Sales" },
            { email: "mathaus.alves@grupo-3c.com", level: "Service / Sales" }
        ]
    },
    // 4. 3C Plus (CP)
    {
        name: "3C Plus",
        acronym: "CP",
        ownerEmail: "allan.vonstein@grupo-3c.com", ownerName: "Allan Von Stein",
        subOwnerEmail: "fernando.mosquer@grupo-3c.com", subOwnerName: "Fernando Mosquer",
        accesses: [
            // Nível 3
            { email: "andrieli.javorski@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "bruno.garcia@3cplusnow.com", level: "Nível 3 (Produto)" },
            { email: "carlos.marques@3cplusnow.com", level: "Nível 3 (Produto)" },
            { email: "eduardo.goncalves@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "gabriel.krysa@3cplusnow.com", level: "Nível 3 (Produto)" },
            { email: "gabriel.ida@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "gustavo.delonzek@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "junior.andrade@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "matheus.oliveira@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "matheus.rocha@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "vladimir.sesar@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "deborah.peres@3cplusnow.com", level: "Nível 3 (Comercial)" },
            { email: "leonardo.maciel@grupo-3c.com", level: "Nível 3 (Marketing)" },
            { email: "pablo.emanuel1@3cplusnow.com", level: "Nível 3 (Marketing)" },
            { email: "thiago.marcondes1@grupo-3c.com", level: "Nível 3 (Marketing)" },
            { email: "vinicius.assmann@3cplusnow.com", level: "Nível 3 (Marketing)" },
            { email: "emily.godoy@grupo-3c.com", level: "Nível 3 (Parcerias)" },
            { email: "pamela.rocha@grupo-3c.com", level: "Nível 3 (Parcerias)" },
            { email: "ney.pereira.adm@3cplusnow.com", level: "Board" },
            { email: "diogo.hartmann@3cplusnow.com", level: "Admin / Elements" },
            { email: "jose@3cplusnow.com", level: "Admin / Elements" },
            { email: "sandra.siqueira@grupo-3c.com", level: "Admin / Elements" },
            // Nível 2
            { email: "alana.gaspar@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "alan.armstrong@3cplusnow.com", level: "Nível 2 (Atendimento)" },
            { email: "alexander.reis@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "allan.portela@3cplusnow.com", level: "Nível 2 (Atendimento)" },
            { email: "filipe.rovea@3cplusnow.com", level: "Nível 2 (Atendimento)" },
            { email: "felipe.nascimento@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "eduardo1.bueno@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "eduardo.wosiak@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "gabrielle.prestes@3cplusnow.com", level: "Nível 2 (Atendimento)" },
            { email: "gabriel.machado@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "gabriel.lima@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "ian@3cplusnow.com", level: "Nível 2 (Atendimento)" },
            { email: "monica.neves@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "ovidio.farias@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "wesley.vale@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "alexsandy.correa@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "camila.brunetti@3cplusnow.com", level: "Nível 2 (Comercial)" },
            { email: "camila.oliveira@3cplusnow.com", level: "Nível 2 (Comercial)" },
            { email: "daniel.souza@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "fernando.mosquer@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "guilherme.minuzzi@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "jaqueline.souza@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "jehnnifer.padilha@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "kauane.bastos@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "kesley.oliveira@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "ketlin.oliveira@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "cirene.lara@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "leandro.mulhstdtt@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "leonardo.ferraz@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "lucas.costa1@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "lucas.almeida@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "lucio.ramos@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "maria.merhet@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "meteus.gerigk@outlook.com.br", level: "Nível 2 (Comercial)" },
            { email: "maycon.barbosa@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "michelebodot93@gmail.com", level: "Nível 2 (Comercial)" },
            { email: "taissa.almeida@grupo-3c.com", level: "Nível 2 (Comercial)" },
            { email: "thomas.ferreira@grupo-3c.com", level: "Nível 2 (Comercial)" }
        ]
    },
    // 5. Evolux (EX)
    {
        name: "Evolux",
        acronym: "EX",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        subOwnerEmail: "bruno.levi@grupo-3c.com", subOwnerName: "Bruno Levi", // Levi
        accesses: []
    },
    // 6. Dizify (DZ)
    {
        name: "Dizify",
        acronym: "DZ",
        ownerEmail: "marieli.ferreira@grupo-3c.com", ownerName: "Marieli Ferreira",
        subOwnerEmail: "jeferson.cruz@grupo-3c.com", subOwnerName: "Jeferson Da Cruz", // Jefferson
        accesses: [
            { email: "marieli.ferreira@grupo-3c.com", level: "Administrador" },
            { email: "pietro.limberger@grupo-3c.com", level: "Administrador" },
            { email: "lucas.limberger@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "jeferson.cruz@grupo-3c.com", level: "Administrador" },
            { email: "maria.ribeiro@grupo-3c.com", level: "Administrador" },
            { email: "julia.araujo@grupo-3c.com", level: "Administrador" },
            { email: "taryk.ferreira@grupo-3c.com", level: "Administrador" },
            { email: "iago.prado@grupo-3c.com", level: "Administrador" },
            { email: "eduardo.nascimento@grupo-3c.com", level: "Administrador" }
        ]
    },
    // 7. Netsuit (NS)
    {
        name: "Next Suit", // Ou Netsuit
        acronym: "NS",
        ownerEmail: "aline.fonseca@grupo-3c.com", ownerName: "Aline Fonseca",
        subOwnerEmail: "fernando.takakusa@grupo-3c.com", subOwnerName: "Fernando Takakusa",
        accesses: [
            { email: "aline.fonseca@3cplusnow.com", level: "Administrador" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Administrador" },
            { email: "stephany.moraes@grupo-3c.com", level: "Analista Fiscal" },
            { email: "bruno.sahidak@grupo-3c.com", level: "Administrador" },
            { email: "ana.antunes@grupo-3c.com", level: "Administrador" },
            { email: "ney.pereira@grupo-3c.com", level: "Administrador" },
            { email: "suporte.3cplus@activecs.com.br", level: "Administrador" },
            { email: "beatriz.oliveira@activecs.com.br", level: "Administrador" }
        ]
    },
    // 8. Gitlab (GL)
    {
        name: "GitLab",
        acronym: "GL",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "bruno.levy@grupo-3c.com", level: "Administrator" },
            { email: "carlos.marques@grupo-3c.com", level: "Administrator" },
            { email: "diogo@3cplusnow.com", level: "Administrator" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrator" },
            { email: "eric.patrick@grupo-3c.com", level: "Administrator" },
            { email: "gabriel.krysa@3cplusnow.com", level: "Administrator" },
            { email: "italo.rossi@grupo-3c.com", level: "Administrator" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Administrator" },
            { email: "sergio.filipe@evolux.net.br", level: "Administrator" },
            // Regular
            { email: "allan.oliveira@grupo-3c.com", level: "Regular" },
            { email: "andrieli.javorski@grupo-3c.com", level: "Regular" },
            { email: "bruno.garcia@3cplusnow.com", level: "Regular" },
            { email: "charles.jose@grupo-3c.com", level: "Regular" },
            { email: "eduardo.goncalves@grupo-3c.com", level: "Regular" },
            { email: "eduardo.wosiak@grupo-3c.com", level: "Regular" },
            { email: "gabriel.machado@grupo-3c.com", level: "Regular" },
            { email: "guilherme.ferreira@grupo-3c.com", level: "Regular" },
            { email: "gustavo.delonzek@grupo-3c.com", level: "Regular" },
            { email: "henrique.amorim@grupo-3c.com", level: "Regular" },
            { email: "jeferson.cruz@grupo-3c.com", level: "Regular" },
            { email: "jose.pablo@grupo-3c.com", level: "Regular" },
            { email: "julia.araujo@grupo-3c.com", level: "Regular" },
            { email: "luis.paganini@grupo-3c.com", level: "Regular" },
            { email: "maria.ribeiro@grupo-3c.com", level: "Regular" },
            { email: "marieli.ferreira@grupo-3c.com", level: "Regular" },
            { email: "matheus.kocotem@3cplusnow.com", level: "Regular" },
            { email: "matheus.rocha@grupo-3c.com", level: "Regular" },
            { email: "nicolas.veiga@grupo-3c.com", level: "Regular" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Regular" },
            { email: "pedro.nascimento@grupo-3c.com", level: "Regular" },
            { email: "rodrigo.gomes@grupo-3c.com", level: "Regular" },
            { email: "sandra.siqueira@grupo-3c.com", level: "Regular" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Regular" },
            { email: "wesley.vale@grupo-3c.com", level: "Regular" }
        ]
    },
    // 9. AWS (AS)
    {
        name: "AWS",
        acronym: "AS",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "alexander.reis@grupo-3c.com", level: "User" },
            { email: "bruno.levi@grupo-3c.com", level: "User" },
            { email: "carlos.marques@grupo-3c.com", level: "User" },
            { email: "diogo.hartmann@grupo-3c.com", level: "User" },
            { email: "gabriel.lima@grupo-3c.com", level: "User" },
            { email: "gabrel.machado@grupo-3c.com", level: "User" },
            { email: "italo.rossi@grupo-3c.com", level: "User" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "User" },
            { email: "mathaus.alves@grupo-3c.com", level: "User" },
            { email: "sergio.filipe@grupo-3c.com", level: "User" },
            { email: "vladimir.sesar@grupo-3c.com", level: "User" },
            { email: "wesley.vale@grupo-3c.com", level: "User" }
        ]
    },
    // 10. GCP (GC)
    {
        name: "GCP",
        acronym: "GC",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "diogo.hartmann@grupo-3c.com", level: "Owner" },
            { email: "eduardo.bueno@grupo-3c.com", level: "Owner" },
            { email: "ian.ronska@grupo-3c.com", level: "Owner" },
            { email: "jose.pablo@grupo-3c.com", level: "Owner" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Owner" },
            { email: "julia.araujo@grupo-3c.com", level: "Owner" },
            { email: "matheus.oliveira@grupo-3c.com", level: "Owner" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Owner" },
            { email: "vladimir.sesar@grupo-3c.com", level: "Owner" },
            // Admins
            { email: "pablo.emanuel@grupo-3c.com", level: "Admin / BigQuery" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Admin / BigQuery" },
            // Editores
            { email: "eduardo.wosiak@grupo-3c.com", level: "Editor" },
            { email: "isabely.wendler@grupo-3c.com", level: "Editor" },
            { email: "wagner.wolff@grupo-3c.com", level: "Editor" },
            { email: "matheus.rocha@grupo-3c.com", level: "Editor" }
        ]
    },
    // 11. Convenia (CV)
    {
        name: "Convenia",
        acronym: "CV",
        ownerEmail: "raphael.pires@grupo-3c.com", ownerName: "Raphael Pires",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Owner" },
            { email: "lucas.limberger@grupo-3c.com", level: "Owner" },
            { email: "raphael.pires@grupo-3c.com", level: "Owner" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Pessoas e Cultura" },
            { email: "gislene.machado@grupo-3c.com", level: "Pessoas e Cultura" }
        ]
    },
    // 12. Clicsign (CS)
    {
        name: "Clicsign",
        acronym: "CS",
        ownerEmail: "fernando.takakusa@grupo-3c.com", ownerName: "Fernando Takakusa",
        subOwnerEmail: "aline.fonseca@grupo-3c.com", subOwnerName: "Aline Fonseca",
        accesses: [
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "aline.fonseca@grupo-3c.com", level: "Membro" },
            { email: "gabriely.garcia@grupo-3c.com", level: "Membro" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Membro" },
            { email: "maria.rosa@grupo-3c.com", level: "Membro" },
            { email: "raphael.pires@grupo-3c.com", level: "Membro" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Membro" }
        ]
    },
    // 13. Meta (MT)
    {
        name: "Meta",
        acronym: "MT",
        ownerEmail: "rafael.schimanski@grupo-3c.com", ownerName: "Rafael Blaka",
        subOwnerEmail: "junior.andrade@grupo-3c.com", subOwnerName: "Junior Andrade",
        accesses: [
            { email: "maria.schimanski@grupo-3c.com", level: "Business Manager" },
            { email: "rebeca.costa@grupo-3c.com", level: "Business Manager" },
            { email: "eduardo.bueno@grupo-3c.com", level: "Business Manager" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Business Manager" },
            { email: "leonardo.maciel@grupo-3c.com", level: "Business Manager" },
            { email: "gustavo.delonzek@grupo-3c.com", level: "Business Manager" },
            { email: "gabriel.krysa@3cplusnow.com", level: "Business Manager" },
            { email: "diogo@3cplusnow.com", level: "Business Manager" },
            { email: "junior.andrade@3cplusnow.com", level: "Business Manager" },
            { email: "rafael.schimanski@3cplusnow.com", level: "Business Manager" },
            { email: "alexander.reis@grupo-3c.com", level: "Business Manager" },
            { email: "wesley.vale@grupo-3c.com", level: "Business Manager" },
            // Acesso Parcial
            { email: "rafael.rickli@bettegacob.com.br", level: "Acesso Parcial" },
            { email: "ana.ida@grupo-3c.com", level: "Acesso Parcial" },
            { email: "vinicius.leal@grupo-3c.com", level: "Acesso Parcial" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Acesso Parcial" },
            { email: "lucas.schupchek@grupo-3c.com", level: "Acesso Parcial" },
            { email: "lucas.matheus@grupo-3c.com", level: "Acesso Parcial" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Acesso Parcial" },
            { email: "kauevargas.design@gmail.com", level: "Acesso Parcial" },
            { email: "mathaus_kozkodai@hotmail.com", level: "Convidado" }
        ]
    },
    // 14. Fiqon (FO)
    {
        name: "Fiqon",
        acronym: "FO",
        ownerEmail: "guilherme.pinheiro@grupo-3c.com", ownerName: "Guilherme Pinheiro",
        subOwnerEmail: "lucas.matheus@grupo-3c.com", subOwnerName: "Lucas Matheus",
        accesses: [
            { email: "lucas.matheus@grupo-3c.com", level: "Administrador" },
            { email: "lucas.schupchek@grupo-3c.com", level: "Administrador" },
            { email: "matheus.siqueira@grupo-3c.com", level: "Administrador" },
            { email: "yuri.lima@grupo-3c.com", level: "Administrador" },
            { email: "pedro.barreto@grupo-3c.com", level: "Administrador" },
            { email: "roberty.machado@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pinheiro@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" }
        ]
    },
    // 15. N8N (NA)
    {
        name: "N8N",
        acronym: "NA",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: null, subOwnerName: null,
        accesses: [
            { email: "pablo.emanuel@grupo-3c.com", level: "Owner" },
            { email: "eduardo.bueno@grupo-3c.com", level: "Membro" },
            { email: "ian.ronska@grupo-3c.com", level: "Membro" },
            { email: "isabely.wendler@grupo-3c.com", level: "Membro" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Membro" },
            { email: "julia.araujo@grupo-3c.com", level: "Membro" },
            { email: "matheus.oliveira@grupo-3c.com", level: "Membro" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Membro" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Membro" },
            { email: "suporte.evolux@grupo-3c.com", level: "Membro" }
        ]
    },
    // 16. Hik Connect (HC)
    {
        name: "Hik Connect",
        acronym: "HC",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: "allan.vonstein@grupo-3c.com", subOwnerName: "Allan Von Stein",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Administrador" },
            { email: "jaqueline.souza@grupo-3c.com", level: "Administrador" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Administrador" },
            { email: "wagner.wolff@grupo-3c.com", level: "Administrador" },
            { email: "alan.armstrong@grupo-3c.com", level: "Administrador" },
            { email: "portaria@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "allan.vonstein@grupo-3c.com", level: "Administrador" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "luan.silva@grupo-3c.com", level: "Administrador" },
            { email: "marcio.pagnoncelli@hotmail.com", level: "Administrador" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador" },
            { email: "vladimir.sesar@grupo-3c.com", level: "Administrador" }
        ]
    },
    // 17. ChatGPT (CG)
    {
        name: "Chat GPT",
        acronym: "CG",
        ownerEmail: "pablo.emanuel@3cplusnow.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "wagner@3cplusnow.com", subOwnerName: "Wagner Wolff",
        accesses: [
            { email: "pablo.emanuel@3cplusnow.com", level: "Proprietário" },
            { email: "wagner@3cplusnow.com", level: "Proprietário" },
            { email: "aline.fonseca@3cplusnow.com", level: "Membro" },
            { email: "emily@3cplusnow.com", level: "Membro" },
            { email: "jaqueline.souza@grupo-3c.com", level: "Membro" },
            { email: "gpt.polaris@3cplusnow.com", level: "Membro" },
            { email: "rafael.blaka@3cplusnow.com", level: "Membro" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Membro" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Membro" },
            { email: "wesley.vale@grupo-3c.com", level: "Membro" }
        ]
    },
    // 18. Focus (FU)
    {
        name: "Focus",
        acronym: "FU",
        ownerEmail: "aline.fonseca@3cplusnow.com", ownerName: "Aline Fonseca",
        subOwnerEmail: "thiago.marcondes@grupo-3c.com", subOwnerName: "Thiago Marcondes",
        accesses: [
            { email: "aline.fonseca@3cplusnow.com", level: "Administrador" },
            { email: "diogo@3cplusnow.com", level: "Administrador" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" }
        ]
    },
    // 19. Vindi (VI)
    {
        name: "Vindi",
        acronym: "VI",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "ian.ronska@grupo-3c.com", subOwnerName: "Ian Ronska",
        accesses: [
            // Admins
            { email: "alan.armstrong@grupo-3c.com", level: "Administrador" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador" },
            { email: "eduardo.bueno@grupo-3c.com", level: "Administrador" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "jose.zimmermann@grupo-3c.com", level: "Administrador" },
            { email: "fernando.mosquer@grupo-3c.com", level: "Administrador" },
            { email: "matheus.oliveira@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Administrador" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Administrador" },
            // Gestor
            { email: "alana.gaspar@grupo-3c.com", level: "Gestor" },
            { email: "deborah.peres@grupo-3c.com", level: "Gestor" },
            { email: "felipe.nascimento@grupo-3c.com", level: "Gestor" },
            { email: "filipe.rovea@grupo-3c.com", level: "Gestor" },
            { email: "gabriel.lima@grupo-3c.com", level: "Gestor" },
            { email: "ian.ronska@grupo-3c.com", level: "Gestor" },
            { email: "rian.almeida@grupo-3c.com", level: "Gestor" },
            // Observador
            { email: "allan.vonstein@grupo-3c.com", level: "Observador" },
            { email: "caroline.gois@grupo-3c.com", level: "Observador" },
            { email: "emily.godoy@grupo-3c.com", level: "Observador" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Observador" }
        ]
    },
    // 20. Nextrouter (NR)
    {
        name: "NextRouter",
        acronym: "NR",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "ian.ronska@grupo-3c.com", subOwnerName: "Ian Ronska",
        accesses: [
            { email: "diogo.hartmann@grupo-3c.com", level: "ADMINISTRADOR" },
            { email: "matheus.oliveira@grupo-3c.com", level: "ADMINISTRADOR" },
            { email: "ian.ronska@grupo-3c.com", level: "EQUIPE TELECOM" },
            { email: "fernando.mosquer@grupo-3c.com", level: "EQUIPE TELECOM" },
            { email: "pablo.emanuel@grupo-3c.com", level: "EQUIPE TELECOM" }
        ]
    },
    // 21. Figma (FA)
    {
        name: "Figma",
        acronym: "FA",
        ownerEmail: "gabriel.ida@grupo-3c.com", ownerName: "Gabriel Pires Ida",
        subOwnerEmail: null, subOwnerName: null,
        accesses: [
            { email: "gabriel.ida@grupo-3c.com", level: "Full (Total)" },
            { email: "front3c@grupo-3c.com", level: "Full (Total)" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Full (Total)" },
            { email: "junior.andrade@grupo-3c.com", level: "Full (Total)" },
            { email: "gustavo.schneider@grupo-3c.com", level: "Dev" },
            { email: "igor.ribeiro@grupo-3c.com", level: "Collab" },
            { email: "leonardo.maciel@grupo-3c.com", level: "Collab" },
            { email: "rebeca.costa@grupo-3c.com", level: "Collab" },
            { email: "guilherme.pinheiro@grupo-3c.com", level: "Collab" },
            { email: "diogo.hartmann@grupo-3c.com", level: "View" }
        ]
    },
    // 22. Slack
    {
        name: "Slack",
        acronym: null,
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: null, subOwnerName: null,
        accesses: []
    }
];


// --- FUNÇÕES AUXILIARES ---

async function ensureUser(email: string, name: string) {
    if (!email) return null;

    // 1. Tenta achar normal
    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: email, mode: 'insensitive' } }
            ]
        }
    });

    // 2. Tenta achar substituindo domínio (caso usem @3cplusnow e @grupo-3c de forma intercambiável)
    if (!user) {
        const altEmail = email.includes('3cplusnow')
            ? email.replace('3cplusnow.com', 'grupo-3c.com')
            : email.replace('grupo-3c.com', '3cplusnow.com');

        user = await prisma.user.findFirst({
            where: { email: { equals: altEmail, mode: 'insensitive' } }
        });
    }

    // 3. Cria placeholder se não existir
    if (!user) {
        // console.log(`Creating placeholder user: ${name} (${email})`);
        try {
            user = await prisma.user.create({
                data: {
                    name: name || email.split('@')[0],
                    email: email,
                    // Dados dummy
                    jobTitle: "Não mapeado",
                    department: "Geral"
                }
            });
        } catch (e) {
            // Se der erro de Unique constraint (raro com findFirst antes), tenta buscar de novo
            user = await prisma.user.findUnique({ where: { email } });
        }
    }
    return user;
}


async function main() {
    console.log('🚨 INICIANDO RESET COMPLETO DO CATÁLOGO DE FERRAMENTAS...');
    console.log('---------------------------------------------------------');

    // 1. LIMPEZA TOTAL DE FERRAMENTAS E ACESSOS
    // (Mantemos Usuários e Solicitações)
    const deletedAccess = await prisma.access.deleteMany({});
    console.log(`🗑️ Acessos removidos: ${deletedAccess.count}`);

    const deletedTools = await prisma.tool.deleteMany({});
    console.log(`🗑️ Ferramentas removidas: ${deletedTools.count}`);

    console.log('---------------------------------------------------------');
    console.log('🚀 Reinserindo ferramentas e acessos oficiais...');

    for (const t of toolsData) {
        // 1. Garante Owner
        const owner = await ensureUser(t.ownerEmail, t.ownerName);

        // 2. Garante SubOwner
        let subOwner = null;
        if (t.subOwnerEmail) {
            subOwner = await ensureUser(t.subOwnerEmail, t.subOwnerName || '');
        }

        // 3. Cria Ferramenta
        const newTool = await prisma.tool.create({
            data: {
                name: t.name,
                acronym: t.acronym || undefined,
                ownerId: owner?.id,
                subOwnerId: subOwner?.id
            }
        });

        // 4. Cria Acessos
        let accessCount = 0;
        if (t.accesses && t.accesses.length > 0) {
            for (const acc of t.accesses) {
                // Tenta achar usuario pelo email, sem nome especifico (pode ser qualquer um)
                const userAcc = await ensureUser(acc.email, acc.email.split('@')[0]);

                if (userAcc) {
                    await prisma.access.create({
                        data: {
                            toolId: newTool.id,
                            userId: userAcc.id,
                            status: acc.level
                        }
                    });
                    accessCount++;
                }
            }
        }

        console.log(`✅ [${t.acronym || '??'}] ${t.name} -> Owner: ${owner?.name} | Acessos: ${accessCount}`);
    }

    console.log('---------------------------------------------------------');
    console.log('🏁 SEED CONCLUÍDO COM SUCESSO!');
}

main()
    .catch((e) => {
        console.error("❌ ERRO FATAL NO SEED:", e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());