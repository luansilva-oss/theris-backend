import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// A lista blindada dos 135 e-mails reais
const emailsOficiais = [
    "alan.armstrong@grupo-3c.com", "alana.gaspar@grupo-3c.com", "alessandro.schneider@grupo-3c.com",
    "alexander.reis@grupo-3c.com", "alexsandy.correa@grupo-3c.com", "aline.fonseca@grupo-3c.com",
    "allan.vonstein@grupo-3c.com", "ana.ida@grupo-3c.com", "ana.antunes@grupo-3c.com",
    "andreia.cunha@bettega.online", "andressa.krysa@grupo-3c.com", "andrieli.javorski@grupo-3c.com",
    "annelise.souza@grupo-3c.com", "bianca.cunha@grupo-3c.com", "bruno.garcia@grupo-3c.com",
    "bruno.levy@grupo-3c.com", "bruno.sahaidak@grupo-3c.com", "camila.brunetti@grupo-3c.com",
    "camila.oliveira@grupo-3c.com", "carlos.marques@grupo-3c.com", "caroline.gois@grupo-3c.com",
    "cirene.lara@grupo-3c.com", "daniel.souza@grupo-3c.com", "deborah.peres@grupo-3c.com",
    "diogo.hartmann@grupo-3c.com", "eduardo.wosiak@grupo-3c.com", "eduardo.nascimento@grupo-3c.com",
    "eduardo.goncalves@grupo-3c.com", "eduardo.bueno@grupo-3c.com", "emanuelly.petel@grupo-3c.com",
    "emily.godoy@grupo-3c.com", "felipe.nascimento@grupo-3c.com", "fernando.takakusa@grupo-3c.com",
    "filipe.rovea@grupo-3c.com", "gabriel.machado@grupo-3c.com", "gabriel.krysa@grupo-3c.com",
    "gabriel.ida@grupo-3c.com", "gabriel.bernadini@grupo-3c.com", "gabrieli.almeida@grupo-3c.com",
    "gabrielle.prestes@grupo-3c.com", "gabriely.garcia@grupo-3c.com", "gislene.machado@grupo-3c.com",
    "gladston.kordiak@grupo-3c.com", "guilherme.castro@grupo-3c.com", "guilherme.ferreira@grupo-3c.com",
    "guilherme.minuzzi@grupo-3c.com", "guilherme.pimpao@grupo-3c.com", "guilherme.pinheiro@grupo-3c.com",
    "gustavo.delonzek@grupo-3c.com", "gustavo.dangui@grupo-3c.com", "gustavo.schneider@grupo-3c.com",
    "iago.prado@grupo-3c.com", "ian.ronska@grupo-3c.com", "igor.ribeiro@grupo-3c.com",
    "isabely.wendler@grupo-3c.com", "ivonete.soares@grupo-3c.com", "jaqueline.souza@grupo-3c.com",
    "jeferson.cruz@grupo-3c.com", "jehnnifer.padilha@grupo-3c.com", "joao.marcos@grupo-3c.com",
    "joao.vasconcelos@grupo-3c.com", "jose.zimmermann@grupo-3c.com", "fernando.mosquer@grupo-3c.com",
    "jose.pablo@grupo-3c.com", "joyce.cordeiro@grupo-3c.com", "julia.araujo@grupo-3c.com",
    "kauane.bastos@grupo-3c.com", "kaue.vargas@grupo-3c.com", "kawanna.cordeiro@grupo-3c.com",
    "kesley.oliveira@grupo-3c.com", "ketlin.oliveira@grupo-3c.com", "leandro.mulhstdtt@grupo-3c.com",
    "leonardo.ferraz@grupo-3c.com", "leonardo.maciel@grupo-3c.com", "luan.silva@grupo-3c.com",
    "lucas.costa@grupo-3c.com", "lucas.almeida@grupo-3c.com", "lucas.limberger@grupo-3c.com",
    "lucas.matheus@grupo-3c.com", "lucas.schupchek@grupo-3c.com", "lucio.ramos@grupo-3c.com",
    "luis.paganini@grupo-3c.com", "marciel.silva@grupo-3c.com", "maria.merhet@grupo-3c.com",
    "maria.rosa@grupo-3c.com", "maria.ribeiro@grupo-3c.com", "marieli.ferreira@grupo-3c.com",
    "mateus.gerigk@grupo-3c.com", "mathaus.alves@grupo-3c.com", "matheus.oliveira@grupo-3c.com",
    "matheus.siqueira@grupo-3c.com", "matheus.rocha@grupo-3c.com", "maycon.barbosa@grupo-3c.com",
    "michele.anjos@grupo-3c.com", "monica.neves@grupo-3c.com", "ney.pereira@grupo-3c.com",
    "nildson.machado@grupo-3c.com", "ovidio.farias@grupo-3c.com", "gabriel.lima@grupo-3c.com",
    "matheus.britto@grupo-3c.com", "pablo.emanuel@grupo-3c.com", "pamela.rocha@grupo-3c.com",
    "paulo.bertoli@grupo-3c.com", "pedro.barreto@grupo-3c.com", "pedro.nascimento@grupo-3c.com",
    "pietro.limberger@grupo-3c.com", "rafael.schimanski@grupo-3c.com", "rafaela.stephan@grupo-3c.com",
    "raphael.pires@grupo-3c.com", "rebeca.costa@grupo-3c.com", "renata.czapiewski@grupo-3c.com",
    "rian.almeida@grupo-3c.com", "ricardo.camargo@grupo-3c.com", "richard.cordeiro@grupo-3c.com",
    "roberta.gomes@grupo-3c.com", "roberty.machado@grupo-3c.com", "rosiane.correa@grupo-3c.com",
    "sthephany.moraes@grupo-3c.com", "taissa.almeida@grupo-3c.com", "taryk.ferreira@grupo-3c.com",
    "thomas.ferreira@grupo-3c.com", "junior.andrade@grupo-3c.com", "victor.raphael@grupo-3c.com",
    "vinicius.assmann@grupo-3c.com", "vladimir.sesar@grupo-3c.com", "wagner.wolff@grupo-3c.com",
    "wesley.vale@grupo-3c.com", "willian.samuel@grupo-3c.com", "yuri.lima@grupo-3c.com"
];

async function main() {
    console.log("🧹 Iniciando a Faxina de Fantasmas...");

    const todosUsuarios = await prisma.user.findMany();
    const emailsOficiaisLower = emailsOficiais.map(e => e.toLowerCase());

    // Quem não está na lista oficial é fantasma
    const fantasmas = todosUsuarios.filter(u => !emailsOficiaisLower.includes(u.email.toLowerCase()));

    console.log(`👻 Encontrados ${fantasmas.length} usuários fantasmas.`);

    if (fantasmas.length === 0) {
        console.log("✅ Tudo limpo! Nenhum fantasma encontrado.");
        return;
    }

    let apagados = 0;

    for (const fantasma of fantasmas) {
        try {
            // 1. Desvincula o fantasma de ser gestor de alguém
            await prisma.user.updateMany({
                where: { managerId: fantasma.id },
                data: { managerId: null }
            });

            // 2. Apaga as "bagagens" (Acessos) para o banco não bloquear
            await prisma.access.deleteMany({
                where: { userId: fantasma.id }
            });

            // 3. Opcional: Se a tabela Request existir, descomente a linha abaixo
            // await prisma.request.deleteMany({ where: { userId: fantasma.id } });

            // 4. Apaga o fantasma
            await prisma.user.delete({
                where: { id: fantasma.id }
            });

            console.log(`🗑️ Apagado: ${fantasma.email}`);
            apagados++;
        } catch (error: any) {
            console.error(`❌ Erro ao apagar ${fantasma.email}:`, error.message);
        }
    }

    console.log(`🎉 Faxina concluída! ${apagados} fantasmas removidos do sistema.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());