import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Realizando seeding com precisão absoluta baseada nos prints...');

    // Limpar dados existentes (exceto Super Admins se houver)
    await prisma.access.deleteMany();
    await prisma.request.deleteMany();
    await prisma.user.deleteMany({
        where: { NOT: { systemProfile: 'SUPER_ADMIN' } }
    });

    const getEmail = (name: string) => {
        // Normalizar nome para email: nome.sobrenome@grupo-3c.com
        // Remove iniciais soltas e acentos se necessário, mas aqui vamos manter simples conforme pedido
        const parts = name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().split(' ');
        const first = parts[0];
        const last = parts[parts.length - 1];
        return `${first}.${last}@grupo-3c.com`;
    };

    // --- CEO ---
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

    // --- DIRETORES (Reportam ao Ney) ---
    const aline = await prisma.user.create({
        data: { name: 'Aline A. F. Bocchi', email: 'aline.bocchi@grupo-3c.com', jobTitle: 'CFO - Chief Financial Officer', department: 'Financeiro', managerId: ney.id, systemProfile: 'GESTOR' }
    });

    const wagner = await prisma.user.create({
        data: { name: 'Wagner W. Pretto', email: 'wagner.pretto@grupo-3c.com', jobTitle: 'CMO - Chief Marketing Officer', department: 'Marketing', managerId: ney.id, systemProfile: 'GESTOR' }
    });

    const lucasL = await prisma.user.create({
        data: { name: 'Lucas Limberger', email: 'lucas.limberger@grupo-3c.com', jobTitle: 'CPO - Chief People Officer', department: 'Pessoas e Performance', managerId: ney.id, systemProfile: 'GESTOR' }
    });

    const ricardo = await prisma.user.create({
        data: { name: 'Ricardo Borges', email: 'ricardo.borges@grupo-3c.com', jobTitle: 'COO - Chief Operating Officer', department: 'Operações', managerId: ney.id, systemProfile: 'GESTOR' }
    });

    const guilhermeP = await prisma.user.create({
        data: { name: 'Guilherme Pimpão', email: 'guilherme.pimpao@grupo-3c.com', jobTitle: 'CPOX - Chief Product & Operations', department: 'Produto', managerId: ney.id, systemProfile: 'GESTOR' }
    });

    const diogo = await prisma.user.create({
        data: { name: 'Diogo H. Hartmann', email: 'diogo.hartmann@grupo-3c.com', jobTitle: 'CTO - Chief Technology Officer', department: 'Tecnologia', managerId: ney.id, systemProfile: 'GESTOR' }
    });

    const jaqueline = await prisma.user.create({
        data: { name: 'Jaqueline S. Pereira', email: 'jaqueline.pereira@grupo-3c.com', jobTitle: 'CSO - Chief Sales Officer', department: 'Vendas', managerId: ney.id, systemProfile: 'GESTOR' }
    });

    // --- FINANCEIRO (Aline) ---
    const financeiroTeam = [
        { name: 'Raphael P. Ida', title: 'Analista de DP' },
        { name: 'Sthephany T. de Moraes', title: 'Analista Financeiro' },
        { name: 'Fernando Takakusa', title: 'Analista Financeiro' },
        { name: 'Maria Ed. N. Rosa', title: 'Assistente Jurídica' },
        { name: 'Gabriely Garcia', title: 'Analista Jurídica' },
        { name: 'Bruno Sahaidak', title: 'Analista Contábil' }
    ];
    for (const p of financeiroTeam) {
        await prisma.user.create({ data: { name: p.name, email: getEmail(p.name), jobTitle: p.title, department: 'Financeiro', managerId: aline.id } });
    }

    // --- MARKETING (Wagner) ---
    const rafaelB = await prisma.user.create({
        data: { name: 'Rafael Blaka', email: 'rafael.blaka@grupo-3c.com', jobTitle: 'Líder de Marketing', department: 'Marketing', managerId: wagner.id, systemProfile: 'GESTOR' }
    });
    const emily = await prisma.user.create({
        data: { name: 'Emily G. da Silva', email: 'emily.silva@grupo-3c.com', jobTitle: 'Líder de Parcerias', department: 'Marketing', managerId: wagner.id, systemProfile: 'GESTOR' }
    });
    await prisma.user.create({
        data: { name: 'Alan Armstrong', email: 'alan.armstrong@grupo-3c.com', jobTitle: 'Porta voz da marca', department: 'Marketing', managerId: wagner.id }
    });

    // Marketing Sub (Rafael Blaka)
    const mktRafael = [
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
    for (const p of mktRafael) {
        await prisma.user.create({ data: { name: p.name, email: getEmail(p.name), jobTitle: p.title, department: 'Marketing', managerId: rafaelB.id } });
    }
    // Parcerias (Emily)
    await prisma.user.create({
        data: { name: 'Pamela Ed. Rocha', email: 'pamela.rocha@grupo-3c.com', jobTitle: 'Assistente de Parcerias', department: 'Marketing', managerId: emily.id }
    });

    // --- PESSOAS E PERFORMANCE (Lucas Limberger) ---
    const anaP = await prisma.user.create({
        data: { name: 'Ana Paula Antunes', email: 'anapaula.antunes@grupo-3c.com', jobTitle: 'Assistente Geral', department: 'Pessoas e Performance', managerId: lucasL.id, systemProfile: 'GESTOR' }
    });
    const renata = await prisma.user.create({
        data: { name: 'Renata Czapiewski', email: 'renata.czapiewski@grupo-3c.com', jobTitle: 'Analista Pessoas e Performance', department: 'Pessoas e Performance', managerId: lucasL.id, systemProfile: 'GESTOR' }
    });
    const kawanna = await prisma.user.create({
        data: { name: 'Kawanna B. Cordeiro', email: 'kawanna.cordeiro@grupo-3c.com', jobTitle: 'Coordenadora Instituto 3C', department: 'Pessoas e Performance', managerId: lucasL.id, systemProfile: 'GESTOR' }
    });

    // Sub Ana Paula
    const teamAna = ['Ivonete Soares', 'Andreia Vieira Cunha', 'Beninciaril Pola Alvarez', 'Paulo F. Bertoli', 'Luiz Emanoel'];
    for (const n of teamAna) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: n.includes('Zeladora') ? 'Zeladora' : 'Porteiro', department: 'Pessoas e Performance', managerId: anaP.id } });
    }
    // Sub Renata
    await prisma.user.create({ data: { name: 'Gislene Machado', email: 'gislene.machado@grupo-3c.com', jobTitle: 'Analista de Recrutamento e Seleção', department: 'Pessoas e Performance', managerId: renata.id } });
    // Sub Kawanna
    const teamKawanna = [
        { name: 'Gabrieli E. dos A. Almeida', title: 'Assistente de Recrutamento e Seleção' },
        { name: 'Gladston Kordiak', title: 'Monitor Instituto 3C' },
        { name: 'Victor Raphael', title: 'Monitor Instituto 3C' }
    ];
    for (const p of teamKawanna) {
        await prisma.user.create({ data: { name: p.name, email: getEmail(p.name), jobTitle: p.title, department: 'Pessoas e Performance', managerId: kawanna.id } });
    }

    // --- OPERAÇÕES (Ricardo Borges) ---
    const joseM = await prisma.user.create({ data: { name: 'José Fernando Mosquer', email: 'jose.mosquer@grupo-3c.com', jobTitle: 'Líder de Atendimento', department: 'Operações', managerId: ricardo.id, systemProfile: 'GESTOR' } });
    const camilaB = await prisma.user.create({ data: { name: 'Camila Brunetti', email: 'camila.brunetti@grupo-3c.com', jobTitle: 'Líder de Expansão', department: 'Operações', managerId: ricardo.id, systemProfile: 'GESTOR' } });
    const pabloS = await prisma.user.create({ data: { name: 'Pablo E. da Silva', email: 'pablo.silva@grupo-3c.com', jobTitle: 'Líder de RevOps', department: 'Operações', managerId: ricardo.id, systemProfile: 'GESTOR' } });
    const alexsander = await prisma.user.create({ data: { name: 'Alexsander Reis', email: 'alexsander.reis@grupo-3c.com', jobTitle: 'Líder de PS', department: 'Operações', managerId: ricardo.id, systemProfile: 'GESTOR' } });

    // Sub José Fernando (CS)
    const csTeam = ['Felipe Moreira', 'Filipe Pereira Rovea', 'Rian Lucas', 'Alana Maiumy Gaspar', 'Monica Neves', 'Gabrielle Andrade', 'Mathaus Kozkodai Alves', 'Roberty Augusto dos', 'Gabriel Machado', 'Wesley D. Do Vale'];
    for (const n of csTeam) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: n.includes('Implantacao') ? 'Analista de Implantação' : 'CS', department: 'Operações', managerId: joseM.id } });
    }
    // Sub Camila (Expansão)
    const expTeam = ['Daniel Felipe', 'Eduarda Mehret', 'Kauane Lemos Bastos', 'Taissa Almeida', 'Gabriel Bernardini'];
    for (const n of expTeam) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: 'Analista de Expansão', department: 'Operações', managerId: camilaB.id } });
    }
    // Sub Pablo (RevOps)
    const revTeam = ['Vinicius B. Assmann', 'Matheus de Oliveira', 'José Eduardo', 'Eduardo P. Bueno', 'Isabelly Wendler'];
    for (const n of revTeam) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: n.includes('Projetos') ? 'Gestora de Projetos' : 'Analista de Automações', department: 'Operações', managerId: pabloS.id } });
    }
    // Sub Alexsander (PS)
    const psTeam = ['Eduardo Wosiak', 'Ovidio', 'Pedro Arthur Lobregati'];
    for (const n of psTeam) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: n.includes('Projetos') ? 'Gestor de Projetos' : 'Analista de Projetos', department: 'Operações', managerId: alexsander.id } });
    }

    // --- PRODUTO (Guilherme Pimpão) ---
    const gKrysa = await prisma.user.create({ data: { name: 'Gabriel Krysa', email: 'gabriel.krysa@grupo-3c.com', jobTitle: 'Tech Lead', department: 'Produto', managerId: guilhermeP.id, systemProfile: 'GESTOR' } });
    const cHMarques = await prisma.user.create({ data: { name: 'Carlos H. Marques', email: 'carlos.marques@grupo-3c.com', jobTitle: 'Tech Lead', department: 'Produto', managerId: guilhermeP.id, systemProfile: 'GESTOR' } });
    const gPinheiros = await prisma.user.create({ data: { name: 'Guilherme Pinheiros', email: 'guilherme.pinheiros@grupo-3c.com', jobTitle: 'Tech Lead', department: 'Produto', managerId: guilhermeP.id, systemProfile: 'GESTOR' } });
    const vladimir = await prisma.user.create({ data: { name: 'Vladimir A. Sesar', email: 'vladimir.sesar@grupo-3c.com', jobTitle: 'Líder de Segurança da Informação', department: 'Segurança da Informação', managerId: guilhermeP.id, systemProfile: 'GESTOR' } });

    // Sub Gabriel Krysa
    const teamGK = ['Eduardo', 'Pablo', 'Bruno', 'Matheus', 'Andrieli'];
    for (const n of teamGK) {
        await prisma.user.create({ data: { name: n, email: `${n.toLowerCase()}@grupo-3c.com`, jobTitle: 'Dev Fullstack', department: 'Produto', managerId: gKrysa.id } });
    }
    // Sub Carlos Marques
    const teamCM = [
        { name: 'Luis Fernando', email: 'luis.fernando@grupo-3c.com' },
        { name: 'Guilherme P.', email: 'guilherme.p@grupo-3c.com' },
        { name: 'Pedro', email: 'pedro@grupo-3c.com' },
        { name: 'Gustavo', email: 'gustavo@grupo-3c.com' },
        { name: 'Bruno Levy', email: 'bruno.levy@grupo-3c.com' }
    ];
    for (const p of teamCM) {
        await prisma.user.create({ data: { name: p.name, email: p.email, jobTitle: p.name.includes('DevOps') ? 'DevOps - Evolux' : 'Dev Fullstack', department: 'Produto', managerId: cHMarques.id } });
    }
    // Sub Guilherme Pinheiros
    const teamGP = ['Lucas Matheus da Cruz', 'Lucas Schupchek de Jesus', 'Matheus Lorenzo Siqueira', 'Yuri Karas Regis Pacheco'];
    for (const n of teamGP) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: 'Dev Fullstack', department: 'Produto', managerId: gPinheiros.id } });
    }
    // Sub Vladimir
    const teamVlad = ['Allan Von Stein Portela', 'Luan M. Silva'];
    for (const n of teamVlad) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: n.includes('Assistente') ? 'Assistente de SI' : 'Analista de SI e Infraestrutura', department: 'Segurança da Informação', managerId: vladimir.id } });
    }

    // --- TECNOLOGIA (Diogo) ---
    const juniorA = await prisma.user.create({ data: { name: 'Junior Andrade', email: 'junior.andrade@grupo-3c.com', jobTitle: 'PO - Analista de Negócios', department: 'Tecnologia', managerId: diogo.id, systemProfile: 'GESTOR' } });
    const gPIda = await prisma.user.create({ data: { name: 'Gabriel P. Ida', email: 'gabriel.ida@grupo-3c.com', jobTitle: 'Design UX', department: 'Tecnologia', managerId: juniorA.id, systemProfile: 'GESTOR' } });
    const ianN = await prisma.user.create({ data: { name: 'Ian R. Nepomoceno', email: 'ian.nepomoceno@grupo-3c.com', jobTitle: 'Analista de Telecom', department: 'Tecnologia', managerId: gPIda.id, systemProfile: 'GESTOR' } });
    await prisma.user.create({ data: { name: 'João Paulo Vasconcelos', email: 'joaopaulo.vasconcelos@grupo-3c.com', jobTitle: 'Devops - 3C', department: 'Tecnologia', managerId: ianN.id } });

    // --- VENDAS (Jaqueline) ---
    const camilaO = await prisma.user.create({ data: { name: 'Camila S. de Oliveira', email: 'camila.oliveira@grupo-3c.com', jobTitle: 'Head Comercial', department: 'Vendas', managerId: jaqueline.id, systemProfile: 'GESTOR' } });
    const jehnnifer = await prisma.user.create({ data: { name: 'Jehnnifer X. Padilha', email: 'jehnnifer.padilha@grupo-3c.com', jobTitle: 'Líder de Vendas Enterprise', department: 'Vendas', managerId: camilaO.id, systemProfile: 'GESTOR' } });
    const alessandro = await prisma.user.create({ data: { name: 'Alessandro Dorneles', email: 'alessandro.dorneles@grupo-3c.com', jobTitle: 'Líder de Vendas PME', department: 'Vendas', managerId: camilaO.id, systemProfile: 'GESTOR' } });
    await prisma.user.create({ data: { name: 'Deborah Peres', email: 'deborah.peres@grupo-3c.com', jobTitle: 'SaleOps', department: 'Vendas', managerId: camilaO.id } });

    // Sub Jehnnifer
    const teamJeh = [
        'Joyce Cordeiro', 'Kesley Oliveira', 'Rosiane Corrêa', 'Mateus Gerik',
        'Thomas Ferreira', 'Willian S. de Oliveira', 'Alexsandy Correa',
        'Gustavo Dangui', 'Guilherme Minuzzi', 'Lucio Marcos Ramos'
    ];
    for (const n of teamJeh) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: 'Closer', department: 'Vendas', managerId: jehnnifer.id } });
    }

    // Sub Alessandro
    const teamAle = [
        'Michele Bodot', 'Rafaela G. P. C. S', 'Cirene Laiza C. Lara', 'Maycon J. B. Padilha',
        'Lucas F. de Almeida', 'Bianca Cunha', 'Roberta Gomes', 'Lucas A Costa',
        'Ketlin Zaluski', 'Leonardo Kauan Ferraz', 'Leandro Mühlstdtt', 'Andressa Aparecida',
        'Dafiny Mélory', 'Emanuelly Petel', 'Guilherme de Lima', 'Marciel Boruch', 'Nilton Pais'
    ];
    for (const n of teamAle) {
        await prisma.user.create({ data: { name: n, email: getEmail(n), jobTitle: n === 'Michele Bodot' ? 'Backoffice' : 'Closer', department: 'Vendas', managerId: alessandro.id } });
    }

    console.log('✅ Seeding concluído com precisão absoluta!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
