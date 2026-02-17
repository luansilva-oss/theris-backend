import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Zerando usuários para novo seeding...');
    await prisma.access.deleteMany();
    await prisma.request.deleteMany();
    await prisma.user.deleteMany({
        where: { NOT: { systemProfile: 'SUPER_ADMIN' } }
    });

    // 1. CEO / Nível 1
    const ney = await prisma.user.upsert({
        where: { email: 'ney.pereira@grupo-3c.com' },
        update: {},
        create: {
            name: 'Ney Eurico Pereira',
            email: 'ney.pereira@grupo-3c.com',
            jobTitle: 'CEO - Chief Executive Officer',
            department: 'Diretoria',
            systemProfile: 'GESTOR'
        }
    });

    // 2. Nível 2 (Reportam ao Ney)
    const ricardo = await prisma.user.create({
        data: {
            name: 'Ricardo Borges',
            email: 'ricardo.borges@grupo-3c.com',
            jobTitle: 'COO - Chief Operating Officer',
            department: 'Operações',
            managerId: ney.id,
            systemProfile: 'GESTOR'
        }
    });

    const guilhermeP = await prisma.user.create({
        data: {
            name: 'Guilherme Pimpão',
            email: 'guilherme.pimpao@grupo-3c.com',
            jobTitle: 'CPOX - Chief Product & Operations',
            department: 'Produto',
            managerId: ney.id,
            systemProfile: 'GESTOR'
        }
    });

    const diogo = await prisma.user.create({
        data: {
            name: 'Diogo H. Hartmann',
            email: 'diogo.hartmann@grupo-3c.com',
            jobTitle: 'CTO - Chief Technology Officer',
            department: 'Tecnologia',
            managerId: ney.id,
            systemProfile: 'GESTOR'
        }
    });

    const jaqueline = await prisma.user.create({
        data: {
            name: 'Jaqueline S. Pereira',
            email: 'jaqueline.pereira@grupo-3c.com',
            jobTitle: 'CSO - Chief Sales Officer',
            department: 'Vendas',
            managerId: ney.id,
            systemProfile: 'GESTOR'
        }
    });

    const aline = await prisma.user.create({
        data: {
            name: 'Aline A. F. Bocchi',
            email: 'aline.bocchi@grupo-3c.com',
            jobTitle: 'CFO - Chief Financial Officer',
            department: 'Financeiro',
            managerId: ney.id,
            systemProfile: 'GESTOR'
        }
    });

    const wagner = await prisma.user.create({
        data: {
            name: 'Wagner W. Pretto',
            email: 'wagner.pretto@grupo-3c.com',
            jobTitle: 'CMO - Chief Marketing Officer',
            department: 'Marketing',
            managerId: ney.id,
            systemProfile: 'GESTOR'
        }
    });

    const lucasL = await prisma.user.create({
        data: {
            name: 'Lucas Limberger',
            email: 'lucas.limberger@grupo-3c.com',
            jobTitle: 'CPO - Chief People Officer',
            department: 'Pessoas e Performance',
            managerId: ney.id,
            systemProfile: 'GESTOR'
        }
    });

    // 3. Nível 3 (Reportam aos Diretores)

    // Reportam à Aline (Financeiro)
    const financeiroTeam = [
        { name: 'Raphael P. Ida', title: 'Analista de DP' },
        { name: 'Sthephany T. de Moraes', title: 'Analista Financeiro' },
        { name: 'Fernando Takakusa', title: 'Analista Financeiro' },
        { name: 'Maria Ed. N. Rosa', title: 'Assistente Jurídica' },
        { name: 'Gabriely Garcia', title: 'Analista Jurídica' },
        { name: 'Bruno Sahaidak', title: 'Analista Contábil' }
    ];

    for (const p of financeiroTeam) {
        await prisma.user.create({
            data: {
                name: p.name,
                email: `${p.name.split(' ')[0].toLowerCase()}.${p.name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`,
                jobTitle: p.title,
                department: 'Financeiro',
                managerId: aline.id
            }
        });
    }

    // Reportam ao Wagner (Marketing)
    const rafaelB = await prisma.user.create({
        data: {
            name: 'Rafael Blaka',
            email: 'rafael.blaka@grupo-3c.com',
            jobTitle: 'Líder de Marketing',
            department: 'Marketing',
            managerId: wagner.id,
            systemProfile: 'GESTOR'
        }
    });

    const emily = await prisma.user.create({
        data: {
            name: 'Emily G. da Silva',
            email: 'emily.silva@grupo-3c.com',
            jobTitle: 'Líder de Parcerias',
            department: 'Marketing',
            managerId: wagner.id,
            systemProfile: 'GESTOR'
        }
    });

    await prisma.user.create({
        data: {
            name: 'Alan Armstrong',
            email: 'alan.armstrong@grupo-3c.com',
            jobTitle: 'Porta voz da marca',
            department: 'Marketing',
            managerId: wagner.id
        }
    });

    // Reportam ao Rafael Blaka (Sub-Marketing)
    const mktSubTeam = [
        { name: 'Igor de A. Ribeiro', title: 'Gestor de Projetos' },
        { name: 'Annelise R. de Souza', title: 'Gestor de Tráfego' },
        { name: 'Rebeca C. de Lima', title: 'Copywriter' },
        { name: 'Leonardo L. Maciel', title: 'Marketing Ops / Analista' },
        { name: 'Kauê P. de Vargas', title: 'Designer' },
        { name: 'Ana Luiza de Souza Ida', title: 'Social Media' },
        { name: 'Richard M. M. Cordeiro', title: 'Filmmaker' },
        { name: 'João Marcos C. de Lima', title: 'Editor de Vídeos' },
        { name: 'Gustavo S. Schneider', title: 'Web Developer' }
    ];
    for (const p of mktSubTeam) {
        await prisma.user.create({
            data: {
                name: p.name,
                email: `${p.name.split(' ')[0].toLowerCase()}.${p.name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`,
                jobTitle: p.title,
                department: 'Marketing',
                managerId: rafaelB.id
            }
        });
    }

    // Reportam ao Lucas Limberger (P&P)
    const anaP = await prisma.user.create({
        data: { name: 'Ana Paula Antunes', email: 'anapaula.antunes@grupo-3c.com', jobTitle: 'Assistente Geral', department: 'Pessoas e Performance', managerId: lucasL.id }
    });
    const renata = await prisma.user.create({
        data: { name: 'Renata Czapiewski', email: 'renata.czapiewski@grupo-3c.com', jobTitle: 'Analista Pessoas e Performance', department: 'Pessoas e Performance', managerId: lucasL.id }
    });
    const kawanna = await prisma.user.create({
        data: { name: 'Kawanna B. Cordeiro', email: 'kawanna.cordeiro@grupo-3c.com', jobTitle: 'Coordenadora Instituto 3C', department: 'Pessoas e Performance', managerId: lucasL.id }
    });

    const pTeamRenata = [
        { name: 'Gislene Machado', title: 'Analista de Recrutamento' }
    ];
    for (const p of pTeamRenata) {
        await prisma.user.create({ data: { name: p.name, email: `${p.name.split(' ')[0].toLowerCase()}.${p.name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: p.title, department: 'Pessoas e Performance', managerId: renata.id } });
    }

    const pTeamAna = [
        { name: 'Ivonete Soares', title: 'Zeladora' },
        { name: 'Andreia Vieira Cunha', title: 'Zeladora' },
        { name: 'Beninciaril Pola Alvarez', title: 'Zeladora' },
        { name: 'Paulo F. Bertoli', title: 'Porteiro' },
        { name: 'Luiz Emanoel', title: 'Porteiro' }
    ];
    for (const p of pTeamAna) {
        await prisma.user.create({ data: { name: p.name, email: `${p.name.split(' ')[0].toLowerCase()}.${p.name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: p.title, department: 'Pessoas e Performance', managerId: anaP.id } });
    }

    const pTeamKawanna = [
        { name: 'Gabrieli E. dos A. Almeida', title: 'Assistente de Recrutamento' },
        { name: 'Gladston Kordiak', title: 'Monitor Instituto 3C' },
        { name: 'Victor Raphael', title: 'Monitor Instituto 3C' }
    ];
    for (const p of pTeamKawanna) {
        await prisma.user.create({ data: { name: p.name, email: `${p.name.split(' ')[0].toLowerCase()}.${p.name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: p.title, department: 'Pessoas e Performance', managerId: kawanna.id } });
    }

    // Reportam ao Ricardo Borges (Operações / CS)
    const joseM = await prisma.user.create({ data: { name: 'José Fernando Mosquer', email: 'jose.mosquer@grupo-3c.com', jobTitle: 'Líder de Atendimento', department: 'Operações', managerId: ricardo.id } });
    const camilaB = await prisma.user.create({ data: { name: 'Camila Brunetti', email: 'camila.brunetti@grupo-3c.com', jobTitle: 'Líder de Expansão', department: 'Operações', managerId: ricardo.id } });
    const pabloS = await prisma.user.create({ data: { name: 'Pablo E. da Silva', email: 'pablo.silva@grupo-3c.com', jobTitle: 'Líder de RevOps', department: 'Operações', managerId: ricardo.id } });
    const alexsander = await prisma.user.create({ data: { name: 'Alexsander Reis', email: 'alexsander.reis@grupo-3c.com', jobTitle: 'Líder de PS', department: 'Operações', managerId: ricardo.id } });

    const csTeam = ['Felipe Moreira', 'Filipe Pereira Rovea', 'Rian Lucas', 'Alana Maiumy Gaspar', 'Monica Neves', 'Gabrielle Andrade', 'Mathaus Kozkodai Alves', 'Roberty Augusto dos', 'Gabriel Machado', 'Wesley D. Do Vale'];
    for (const name of csTeam) {
        await prisma.user.create({ data: { name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: 'CS / Implantação', department: 'Operações', managerId: joseM.id } });
    }

    // Reportam à Camila Brunetti (Expansão)
    const expansaoTeam = ['Daniel Felipe', 'Eduarda Mehret', 'Kauane Lemos Bastos', 'Taissa Almeida', 'Gabriel Bernardini'];
    for (const name of expansaoTeam) {
        await prisma.user.create({ data: { name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: 'Analista de Expansão', department: 'Operações', managerId: camilaB.id } });
    }

    // Reportam ao Pablo (RevOps)
    const revOpsTeam = ['Vinicius B. Assmann', 'Matheus de Oliveira', 'José Eduardo', 'Eduardo P. Bueno', 'Isabelly Wendler'];
    for (const name of revOpsTeam) {
        await prisma.user.create({ data: { name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: 'Automações / Projetos', department: 'Operações', managerId: pabloS.id } });
    }

    // Reportam ao Guilherme Pimpão (Produto / Devs)
    const gabrielK = await prisma.user.create({ data: { name: 'Gabriel Krysa', email: 'gabriel.krysa@grupo-3c.com', jobTitle: 'Tech Lead', department: 'Produto', managerId: guilhermeP.id } });
    const carlosM = await prisma.user.create({ data: { name: 'Carlos H. Marques', email: 'carlos.marques@grupo-3c.com', jobTitle: 'Tech Lead', department: 'Produto', managerId: guilhermeP.id } });
    const guilhermePin = await prisma.user.create({ data: { name: 'Guilherme Pinheiros', email: 'guilherme.pinheiros@grupo-3c.com', jobTitle: 'Tech Lead', department: 'Produto', managerId: guilhermeP.id } });
    const vladimir = await prisma.user.create({ data: { name: 'Vladimir A. Sesar', email: 'vladimir.sesar@grupo-3c.com', jobTitle: 'Líder de Segurança da Informação', department: 'Segurança da Informação', managerId: guilhermeP.id } });

    const devTeamGK = ['Eduardo', 'Pablo', 'Bruno', 'Matheus', 'Andrieli'];
    for (const name of devTeamGK) {
        await prisma.user.create({ data: { name, email: `${name.toLowerCase()}@grupo-3c.com`, jobTitle: 'Dev Fullstack', department: 'Produto', managerId: gabrielK.id } });
    }

    const devTeamCM = [
        { name: 'Luis Fernando', email: 'luis.fernando@grupo-3c.com' },
        { name: 'Guilherme P.', email: 'guilherme.p@grupo-3c.com' }, // Unique email
        { name: 'Pedro', email: 'pedro@grupo-3c.com' },
        { name: 'Gustavo', email: 'gustavo@grupo-3c.com' },
        { name: 'Bruno Levy', email: 'bruno.levy@grupo-3c.com' } // Unique email
    ];
    for (const p of devTeamCM) {
        await prisma.user.create({ data: { name: p.name, email: p.email, jobTitle: 'Dev Fullstack', department: 'Produto', managerId: carlosM.id } });
    }

    const siTeam = ['Allan Von Stein Portela', 'Luan M. Silva'];
    for (const name of siTeam) {
        await prisma.user.create({ data: { name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: 'SIs', department: 'Segurança da Informação', managerId: vladimir.id } });
    }

    // Reportam ao Diogo (CTO)
    const juniorA = await prisma.user.create({ data: { name: 'Junior Andrade', email: 'junior.andrade@grupo-3c.com', jobTitle: 'PO - Analista de Negócios', department: 'Tecnologia', managerId: diogo.id } });
    const gIda = await prisma.user.create({ data: { name: 'Gabriel P. Ida', email: 'gabriel.ida@grupo-3c.com', jobTitle: 'Design UX', department: 'Tecnologia', managerId: juniorA.id } });
    const ianN = await prisma.user.create({ data: { name: 'Ian R. Nepomoceno', email: 'ian.nepomoceno@grupo-3c.com', jobTitle: 'Analista de Telecom', department: 'Tecnologia', managerId: gIda.id } });
    await prisma.user.create({ data: { name: 'João Paulo Vasconcelos', email: 'joaopaulo.vasconcelos@grupo-3c.com', jobTitle: 'Devops - 3C', department: 'Tecnologia', managerId: ianN.id } });

    // Reportam à Jaqueline (CSO)
    const camilaO = await prisma.user.create({ data: { name: 'Camila S. de Oliveira', email: 'camila.oliveira@grupo-3c.com', jobTitle: 'Head Comercial', department: 'Vendas', managerId: jaqueline.id } });
    const jehnnifer = await prisma.user.create({ data: { name: 'Jehnnifer X. Padilha', email: 'jehnnifer.padilha@grupo-3c.com', jobTitle: 'Líder de Vendas Enterprise', department: 'Vendas', managerId: camilaO.id } });
    const alessandro = await prisma.user.create({ data: { name: 'Alessandro Dorneles', email: 'alessandro.dorneles@grupo-3c.com', jobTitle: 'Líder de Vendas PME', department: 'Vendas', managerId: camilaO.id } });
    await prisma.user.create({ data: { name: 'Deborah Peres', email: 'deborah.peres@grupo-3c.com', jobTitle: 'SaleOps', department: 'Vendas', managerId: camilaO.id } });

    const salesTeamJ = ['Joyce Cordeiro', 'Kesley Oliveira', 'Rosiane Corrêa', 'Mateus Gerik', 'Thomas Ferreira', 'Willian S. de Oliveira', 'Alexsandy Correa', 'Gustavo Dangui', 'Guilherme Minuzzi', 'Lucio Marcos Ramos'];
    for (const name of salesTeamJ) {
        await prisma.user.create({ data: { name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: 'Closer', department: 'Vendas', managerId: jehnnifer.id } });
    }

    const salesTeamA = ['Michele Bodot', 'Rafaela G. P. C. S', 'Cirene Laiza C. Lara', 'Maycon J. B. Padilha', 'Lucas F. de Almeida', 'Bianca Cunha', 'Roberta Gomes', 'Lucas A Costa', 'Ketlin Zaluski', 'Leonardo Kauan Ferraz', 'Leandro Mühlstdtt', 'Andressa Aparecida', 'Dafiny Mélory', 'Emanuelly Petel', 'Guilherme de Lima', 'Marciel Boruch'];
    for (const name of salesTeamA) {
        await prisma.user.create({ data: { name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ').slice(-1)[0].toLowerCase()}@grupo-3c.com`, jobTitle: 'Closer', department: 'Vendas', managerId: alessandro.id } });
    }

    console.log('✅ Seeding finalizado com sucesso!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
