import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const officialEmails = [
    "alan.armstrong@grupo-3c.com",
    "alana.gaspar@grupo-3c.com",
    "alessandro.schneider@grupo-3c.com",
    "alexander.reis@grupo-3c.com",
    "alexsandy.correa@grupo-3c.com",
    "aline.fonseca@grupo-3c.com",
    "allan.vonstein@grupo-3c.com",
    "ana.ida@grupo-3c.com",
    "ana.antunes@grupo-3c.com",
    "andreia.cunha@bettega.online",
    "andressa.krysa@grupo-3c.com",
    "andrieli.javorski@grupo-3c.com",
    "annelise.souza@grupo-3c.com",
    "bianca.cunha@grupo-3c.com",
    "bruno.garcia@grupo-3c.com",
    "bruno.levy@grupo-3c.com",
    "bruno.sahaidak@grupo-3c.com",
    "camila.brunetti@grupo-3c.com",
    "camila.oliveira@grupo-3c.com",
    "carlos.marques@grupo-3c.com",
    "caroline.gois@grupo-3c.com",
    "cirene.lara@grupo-3c.com",
    "daniel.souza@grupo-3c.com",
    "deborah.peres@grupo-3c.com",
    "diogo.hartmann@grupo-3c.com",
    "eduardo.wosiak@grupo-3c.com",
    "eduardo.nascimento@grupo-3c.com",
    "eduardo.goncalves@grupo-3c.com",
    "eduardo.bueno@grupo-3c.com",
    "elen.souza@grupo-3c.com",
    "emanuelly.petel@grupo-3c.com",
    "emily.godoy@grupo-3c.com",
    "felipe.nascimento@grupo-3c.com",
    "fernando.takakusa@grupo-3c.com",
    "filipe.rovea@grupo-3c.com",
    "gabriel.machado@grupo-3c.com",
    "gabriel.krysa@grupo-3c.com",
    "gabriel.ida@grupo-3c.com",
    "gabriel.bernadini@grupo-3c.com",
    "gabrieli.almeida@grupo-3c.com",
    "gabrielle.prestes@grupo-3c.com",
    "gabriely.garcia@grupo-3c.com",
    "gislene.machado@grupo-3c.com",
    "Gladston.kordiak@grupo-3C.com",
    "guilherme.castro@grupo-3c.com",
    "guilherme.ferreira@grupo-3c.com",
    "guilherme.minuzzi@grupo-3c.com",
    "guilherme.pimpao@grupo-3c.com",
    "guilherme.pinheiro@grupo-3c.com",
    "gustavo.delonzek@grupo-3c.com",
    "gustavo.dangui@grupo-3c.com",
    "gustavo.schneider@grupo-3c.com",
    "iago.prado@grupo-3c.com",
    "ian.ronska@grupo-3c.com",
    "igor.ribeiro@grupo-3c.com",
    "isabely.wendler@grupo-3c.com",
    "ivonete.soares@grupo-3c.com",
    "jaqueline.souza@grupo-3c.com",
    "jeferson.cruz@grupo-3c.com",
    "jehnnifer.padilha@grupo-3c.com",
    "joao.marcos@grupo-3c.com",
    "joao.vasconcelos@grupo-3c.com",
    "jose.zimmermann@grupo-3c.com",
    "fernando.mosquer@grupo-3c.com",
    "jose.pablo@grupo-3c.com",
    "joyce.cordeiro@grupo-3c.com",
    "julia.araujo@grupo-3c.com",
    "kauane.bastos@grupo-3c.com",
    "kaue.vargas@grupo-3c.com",
    "kawanna.cordeiro@grupo-3c.com",
    "kesley.oliveira@grupo-3c.com",
    "ketlin.oliveira@grupo-3c.com",
    "leandro.mulhstdtt@grupo-3c.com",
    "leonardo.ferraz@grupo-3c.com",
    "leonardo.maciel@grupo-3c.com",
    "luan.silva@grupo-3c.com",
    "lucas.costa@grupo-3c.com",
    "lucas.almeida@grupo-3c.com",
    "lucas.limberger@grupo-3c.com",
    "lucas.matheus@grupo-3c.com",
    "lucas.schupchek@grupo-3c.com",
    "lucio.ramos@grupo-3c.com",
    "luis.paganini@grupo-3c.com",
    "marciel.silva@grupo-3c.com",
    "maria.schimanski@grupo-3c.com",
    "maria.merhet@grupo-3c.com",
    "maria.rosa@grupo-3c.com",
    "maria.ribeiro@grupo-3c.com",
    "marieli.ferreira@grupo-3c.com",
    "mateus.gerigk@grupo-3c.com",
    "mathaus.alves@grupo-3c.com",
    "matheus.oliveira@grupo-3c.com",
    "matheus.siqueira@grupo-3c.com",
    "matheus.rocha@grupo-3c.com",
    "maycon.barbosa@grupo-3c.com",
    "michele.anjos@grupo-3c.com",
    "monica.neves@grupo-3c.com",
    "ney.pereira@grupo-3c.com",
    "nildson.machado@grupo-3c.com",
    "ovidio.farias@grupo-3c.com",
    "gabriel.lima@grupo-3c.com",
    "matheus.britto@grupo-3c.com",
    "pablo.emanuel@grupo-3c.com",
    "pamela.rocha@grupo-3c.com",
    "paulo.bertoli@grupo-3c.com",
    "pedro.barreto@grupo-3c.com",
    "pedro.nascimento@grupo-3c.com",
    "pietro.limberger@grupo-3c.com",
    "rafael.schimanski@grupo-3c.com",
    "rafaela.stephan@grupo-3c.com",
    "raphael.pires@grupo-3c.com",
    "rebeca.costa@grupo-3c.com",
    "renata.czapiewski@grupo-3c.com",
    "rian.almeida@grupo-3c.com",
    "ricardo.camargo@grupo-3c.com",
    "richard.cordeiro@grupo-3c.com",
    "roberta.gomes@grupo-3c.com",
    "roberty.machado@grupo-3c.com",
    "rosiane.correa@grupo-3c.com",
    "sandra.siqueira@grupo-3c.com",
    "sthephany.moraes@grupo-3c.com",
    "taissa.almeida@grupo-3c.com",
    "taryk.ferreira@grupo-3c.com",
    "thiago.marcondes@grupo-3c.com",
    "thomas.ferreira@grupo-3c.com",
    "junior.andrade@grupo-3c.com",
    "victor.raphael@grupo-3c.com",
    "vinicius.assmann@grupo-3c.com",
    "vinicius.leal@grupo-3c.com",
    "vladimir.sesar@grupo-3c.com",
    "wagner.wolff@grupo-3c.com",
    "wesley.vale@grupo-3c.com",
    "willian.samuel@grupo-3c.com",
    "yuri.lima@grupo-3c.com"
];

async function main() {
    console.log('🚀 Iniciando sincronização e merge de e-mails...');

    // 1. Garante que todos da lista oficial existam
    for (const officialEmail of officialEmails) {
        const emailLower = officialEmail.toLowerCase();
        await prisma.user.upsert({
            where: { email: emailLower },
            update: {},
            create: {
                email: emailLower,
                name: officialEmail.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
                department: "Geral",
                jobTitle: "Não mapeado",
                systemProfile: "Viewer"
            }
        });
    }

    const manualMappings: any = {
        "pablo.emanuel1@3cplusnow.com": "pablo.emanuel@grupo-3c.com",
        "ney.pereira.adm@3cplusnow.com": "ney.pereira@grupo-3c.com",
        "ian@3cplusnow.com": "ian.ronska@grupo-3c.com",
        "diogo@3cplusnow.com": "diogo.hartmann@grupo-3c.com",
        "emily@3cplusnow.com": "emily.godoy@grupo-3c.com",
        "rafael.blaka@3cplusnow.com": "rafael.schimanski@grupo-3c.com",
        "wagner@3cplusnow.com": "wagner.wolff@grupo-3c.com",
        "gladston.kordiak@grupo-3c.com": "Gladston.kordiak@grupo-3C.com"
    };

    const allUsers = await prisma.user.findMany();

    for (const user of allUsers) {
        let targetEmail = manualMappings[user.email.toLowerCase()];

        if (!targetEmail && user.email.includes('@3cplusnow.com')) {
            const prefix = user.email.split('@')[0];
            targetEmail = officialEmails.find(off => off.toLowerCase().startsWith(prefix.toLowerCase() + '.'));
        }

        if (targetEmail && user.email.toLowerCase() !== targetEmail.toLowerCase()) {
            const targetUser = await prisma.user.findUnique({ where: { email: targetEmail.toLowerCase() } });
            if (targetUser && targetUser.id !== user.id) {
                console.log(`🔀 Merging Usuário: ${user.email} -> ${targetUser.email}`);
                await prisma.access.updateMany({ where: { userId: user.id }, data: { userId: targetUser.id } });
                await prisma.tool.updateMany({ where: { ownerId: user.id }, data: { ownerId: targetUser.id } });
                await prisma.tool.updateMany({ where: { subOwnerId: user.id }, data: { subOwnerId: targetUser.id } });
                await prisma.request.updateMany({ where: { requesterId: user.id }, data: { requesterId: targetUser.id } });
                await prisma.request.updateMany({ where: { approverId: user.id }, data: { approverId: targetUser.id } });

                // Mover Deputy
                await prisma.user.updateMany({ where: { myDeputyId: user.id }, data: { myDeputyId: targetUser.id } });

                try {
                    await prisma.user.delete({ where: { id: user.id } });
                } catch (e) {
                    console.log("Erro ao deletar user, possivelmente relações pendentes:", (e as any).message);
                }
            }
        }
    }

    console.log(`\n✨ Sincronização e população concluídas!`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
