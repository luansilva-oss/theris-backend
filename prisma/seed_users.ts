import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ====================================================================
// LISTA DE DADOS (Oficial)
// ====================================================================
const usersList = [
    { name: "Alexander Eduardo dos Reis", jobTitle: "Líder de Professional Service", department: "Professional Service", managerName: "Ricardo Borges Camargo" },
    { name: "Camila Brunetti Thomé", jobTitle: "Líder de Farmer", department: "Comercial", managerName: "Camila Souza de Oliveira" },
    { name: "Camila Souza de Oliveira", jobTitle: "Head Comercial", department: "Comercial", managerName: "Jaqueline de Souza" },
    { name: "Carlos Henrique Marques", jobTitle: "Tech Lead", department: "Produto", managerName: "Guilherme Pimpão Cavalcante" },
    { name: "Caroline Fatima de Gois Fila", jobTitle: "Líder de Vendas PME", department: "Comercial", managerName: "Camila Souza de Oliveira" },
    { name: "Emily Godoy Da Silva", jobTitle: "Líder de Parcerias", department: "Parcerias", managerName: "Wagner Wolff Pretto" },
    { name: "Gabriel Krysa", jobTitle: "Tech Lead", department: "Produto", managerName: "Guilherme Pimpão Cavalcante" },
    { name: "Jehnnifer Xavier Padilha", jobTitle: "Líder de Enterprise", department: "Comercial", managerName: "Camila Souza de Oliveira" },
    { name: "José Fernando Mosquer", jobTitle: "Líder de Atendimento ao Cliente", department: "Atendimento ao Cliente", managerName: "Ricardo Borges Camargo" },
    { name: "Kawanna Barbosa Cordeiro", jobTitle: "Coordenadora do Instituto 3C", department: "Instituto 3C", managerName: "Lucas Limberger" },
    { name: "Michele Bodot dos Anjos", jobTitle: "Líder PME", department: "Comercial", managerName: "Ricardo Borges Camargo" },
    { name: "Pablo Emanuel da Silva", jobTitle: "Líder de automações", department: "Automações", managerName: "Ricardo Borges Camargo" },
    { name: "Rafael Blaka Schimanski", jobTitle: "Líder de marketing", department: "Marketing", managerName: "Wagner Wolff Pretto" },
    { name: "Vladimir Antonio Sesar", jobTitle: "Líder de Segurança da Informação", department: "Tecnologia e Segurança", managerName: "Diogo Henrique Hartmann" },
    { name: "Guilherme Pinheiro", jobTitle: "Head de Produto", department: "FiqOn", managerName: "Guilherme Pimpão Cavalcante" },
    { name: "Pietro Limberger", jobTitle: "CEO Dizify", department: "Dizify", managerName: "Lucas Limberger" },
    { name: "Marieli Aparecida Ferreira Thomen", jobTitle: "Tech Lead", department: "Produto", managerName: "Pietro Limberger" },
    { name: "Taryk", jobTitle: "Líder de Vendas Dizify", department: "Comercial Dizify", managerName: "Pietro Limberger" },
    { name: "Thomas Arnon Schmidt Ferreira", jobTitle: "Líder Enterprise", department: "Comercial", managerName: "Camila Souza de Oliveira" },
    { name: "Ney Eurico Pereira", jobTitle: "CEO", department: "Board", managerName: null },
    { name: "Wagner Wolff Pretto", jobTitle: "CMO", department: "Board", managerName: "Ney Eurico Pereira" },
    { name: "Lucas Limberger", jobTitle: "CPO", department: "Board", managerName: "Ney Eurico Pereira" },
    { name: "Ricardo Borges Camargo", jobTitle: "COO", department: "Board", managerName: "Ney Eurico Pereira" },
    { name: "Guilherme Pimpão Cavalcante", jobTitle: "CPOX", department: "Board", managerName: "Ney Eurico Pereira" },
    { name: "Diogo Henrique Hartmann", jobTitle: "CTO", department: "Board", managerName: "Ney Eurico Pereira" },
    { name: "Aline Alda da Fonseca Bocchi", jobTitle: "CFO", department: "Board", managerName: "Ney Eurico Pereira" },
    { name: "Jaqueline de Souza", jobTitle: "CSO", department: "Board", managerName: "Ney Eurico Pereira" },
    { name: "Bruno Sahaidak", jobTitle: "Analista Contábil", department: "Administrativo", managerName: "Aline Alda da Fonseca Bocchi" },
    { name: "Fernando Vantroba Takakusa", jobTitle: "Assistente Financeiro", department: "Administrativo", managerName: "Aline Alda da Fonseca Bocchi" },
    { name: "Gabriely Garcia", jobTitle: "Assistente Jurídico", department: "Administrativo", managerName: "Aline Alda da Fonseca Bocchi" },
    { name: "Maria Eduarda Nezelo Rosa", jobTitle: "Assistente Jurídico", department: "Administrativo", managerName: "Aline Alda da Fonseca Bocchi" },
    { name: "Raphael Pires Ida", jobTitle: "Analista de Departamento Pessoal", department: "Administrativo", managerName: "Aline Alda da Fonseca Bocchi" },
    { name: "Sthephany Tomacheski de Moraes", jobTitle: "Assistente Financeiro", department: "Administrativo", managerName: "Aline Alda da Fonseca Bocchi" },
    { name: "Andrieli de Oliveira Javorski", jobTitle: "Desenvolvedor Front-end", department: "Produto 3C+", managerName: "Gabriel Krysa" },
    { name: "Matheus Rocha Camargo", jobTitle: "Desenvolvedor Front-end", department: "Produto 3C+", managerName: "Gabriel Krysa" },
    { name: "Bruno Garcia", jobTitle: "Desenvolvedor Back-End", department: "Produto 3C+", managerName: "Gabriel Krysa" },
    { name: "José Pablo Streiski Neto", jobTitle: "Desenvolvedor Back-End", department: "Produto 3C+", managerName: "Gabriel Krysa" },
    { name: "Eduardo Mateus dos Santos Gonçalves", jobTitle: "Desenvolvedor Back-End", department: "Produto 3C+", managerName: "Gabriel Krysa" },
    { name: "Gabriel Pires Ida", jobTitle: "UX Designer", department: "Produto 3C+", managerName: "Carlos Henrique Marques" },
    { name: "Vanderlei Assis de Andrade Junior", jobTitle: "P.O", department: "Produto 3C+", managerName: "Carlos Henrique Marques" },
    { name: "Matheus Oliveira", jobTitle: "Analista de Automações", department: "Produto", managerName: "Guilherme Pimpão" },
    { name: "Gustavo Delonzek Brizola", jobTitle: "Desenvolvedor Full-stack", department: "Produto 3C+", managerName: "Gabriel Krysa" },
    { name: "Luis Fernando Paganini", jobTitle: "Desenvolvedor Front-end", department: "Produto Evolux", managerName: "Carlos Henrique Marques" },
    { name: "Guilherme Ferreira Ribas", jobTitle: "Desenvolvedor Front-end", department: "Produto Evolux", managerName: "Carlos Henrique Marques" },
    { name: "Pedro Henrique Ferreira do Nascimento", jobTitle: "Desenvolvedor Back-End", department: "Produto Evolux", managerName: "Carlos Henrique Marques" },
    { name: "Bruno Levy de Arruda", jobTitle: "DevOps", department: "Produto Evolux", managerName: "Carlos Henrique Marques" },
    { name: "Lucas Schupchek de Jesus", jobTitle: "Desenvolvedor Back-End", department: "Produto FiqOn", managerName: "Guilherme Pinheiro" },
    { name: "Lucas Matheus da Cruz", jobTitle: "Desenvolvedor Back-End", department: "Produto FiqOn", managerName: "Guilherme Pinheiro" },
    { name: "Yuri Karas Regis Pacheco de Miranda Lima", jobTitle: "Desenvolvedor Front-End", department: "Produto FiqOn", managerName: "Guilherme Pinheiro" },
    { name: "Julia Gabrielly Martins Araujo", jobTitle: "Desenvolvedor Back-End", department: "Produto Dizify", managerName: "Marieli Aparecida Ferreira Thomen" },
    { name: "Maria Fernanda Ribeiro", jobTitle: "Desenvolvedor Front-End", department: "Produto Dizify", managerName: "Marieli Aparecida Ferreira Thomen" },
    { name: "Jeferson da Cruz", jobTitle: "Desenvolvedor Back-End", department: "Produto Dizify", managerName: "Marieli Aparecida Ferreira Thomen" },
    { name: "Leonardo Kauan Ferraz", jobTitle: "Closer", department: "Comercial Contact", managerName: "Jehnnifer Xavier Padilha" },
    { name: "André Luiz Paluski", jobTitle: "Closer", department: "Comercial Contact", managerName: "Jehnnifer Xavier Padilha" },
    { name: "Joyce Cordeiro", jobTitle: "Closer", department: "Comercial Contact", managerName: "Jehnnifer Xavier Padilha" },
    { name: "Kesley Luis de Oliveira", jobTitle: "Closer", department: "Comercial Contact", managerName: "Jehnnifer Xavier Padilha" },
    { name: "Rosiane Correa", jobTitle: "Closer", department: "Comercial Contact", managerName: "Jehnnifer Xavier Padilha" },
    { name: "Mateus Gerik", jobTitle: "Closer", department: "Comercial Contact", managerName: "Jehnnifer Xavier Padilha" },
    { name: "Lucio Marcos Nascimento Ramos", jobTitle: "Closer", department: "Comercial Contact", managerName: "Thomas Arnon Schmidt Ferreira" },
    { name: "Guilherme Mello Minuzzi", jobTitle: "Closer", department: "Comercial Contact", managerName: "Thomas Arnon Schmidt Ferreira" },
    { name: "Ketlin Tainá Zaluski de Oliveira", jobTitle: "Closer", department: "Comercial Contact", managerName: "Thomas Arnon Schmidt Ferreira" },
    { name: "Leandro dos Santos Mülhstdtt da Silva", jobTitle: "Closer", department: "Comercial Contact", managerName: "Thomas Arnon Schmidt Ferreira" },
    { name: "Gustavo dos Santos Dangui", jobTitle: "Closer", department: "Comercial Contact", managerName: "Thomas Arnon Schmidt Ferreira" },
    { name: "Willian Samuel de Oliveira", jobTitle: "Closer", department: "Comercial Contact", managerName: "Thomas Arnon Schmidt Ferreira" },
    { name: "Alexsandy Correa dos Santos", jobTitle: "Closer", department: "Comercial Contact", managerName: "Thomas Arnon Schmidt Ferreira" },
    { name: "Deborah Peres", jobTitle: "SalesOps", department: "Comercial Contact", managerName: "Thomas Arnon Schmidt Ferreira" },
    { name: "Maria Eduarda Merhet Padilha", jobTitle: "Farmer", department: "Expansão", managerName: "Camila Brunetti Thomé" },
    { name: "Daniel Felipe da Silva Souza", jobTitle: "Farmer", department: "Expansão", managerName: "Camila Brunetti Thomé" },
    { name: "Kauane Lemos Bastos", jobTitle: "Farmer", department: "Expansão", managerName: "Camila Brunetti Thomé" },
    { name: "Taissa Guilliane Gomes Almeida", jobTitle: "Farmer", department: "Expansão", managerName: "Camila Brunetti Thomé" },
    { name: "Rafaela Guedes Pinto Cavalcante Stephan", jobTitle: "Closer", department: "Comercial Contact", managerName: "Michele Bodot dos Anjos" },
    { name: "Cirene Laiza da Cruz Lara", jobTitle: "Closer", department: "Comercial Contact", managerName: "Michele Bodot dos Anjos" },
    { name: "Maycon José Barbosa Padilha", jobTitle: "Closer", department: "Comercial Contact", managerName: "Michele Bodot dos Anjos" },
    { name: "Lucas Fontoura de Almeida", jobTitle: "Closer", department: "Comercial Contact", managerName: "Michele Bodot dos Anjos" },
    { name: "Roberta Gomes Ribeiro", jobTitle: "Closer", department: "Comercial Contact", managerName: "Michele Bodot dos Anjos" },
    { name: "Lucas Antonio Costa", jobTitle: "Closer", department: "Comercial Contact", managerName: "Michele Bodot dos Anjos" },
    { name: "Gabriel Schneider Bernadini", jobTitle: "Recuperador", department: "Comercial Contact", managerName: "Michele Bodot dos Anjos" },
    { name: "Bianca da Cunha", jobTitle: "Closer", department: "Comercial Contact", managerName: "Michele Bodot dos Anjos" },
    { name: "Eduardo Elias", jobTitle: "Closer", department: "Comercial Dizify", managerName: "Pietro Limberger" },
    { name: "Iago Moura do Prado", jobTitle: "Closer", department: "Comercial Dizify", managerName: "Pietro Limberger" },
    { name: "Allan Von Stein Portela", jobTitle: "Analista de Segurança e Infraestrutura", department: "Tecnologia e Segurança", managerName: "Vladimir Antonio Sesar" },
    { name: "Luan Matheus da Silva", jobTitle: "Analista de Segurança da Informação", department: "Tecnologia e Segurança", managerName: "Vladimir Antonio Sesar" },
    { name: "Ian Ronska Nepomoceno", jobTitle: "Analista de Custos", department: "Tecnologia e Segurança", managerName: "Diogo Henrique Hartmann" },
    { name: "João Paulo Vasconcelos", jobTitle: "DevOps", department: "Tecnologia e Segurança", managerName: "Diogo Henrique Hartmann" },
    { name: "Gabriel de Lima Machado", jobTitle: "Analista de PS", department: "Professional Service", managerName: "Alexander Eduardo dos Reis" },
    { name: "Wesley Diogo do Vale", jobTitle: "Analista de PS", department: "Professional Service", managerName: "Alexander Eduardo dos Reis" },
    { name: "Eduardo Wosiak", jobTitle: "Professional Service", department: "Professional Service", managerName: "Alexander Eduardo dos Reis" },
    { name: "Felipe Moreira do Nascimento", jobTitle: "Analista PME", department: "Atendimento ao Cliente", managerName: "José Fernando Mosquer" },
    { name: "Filipe Ferreira Rovea", jobTitle: "Analista PME", department: "Atendimento ao Cliente", managerName: "José Fernando Mosquer" },
    { name: "Rian Lucas de Matos Almeida", jobTitle: "Key Account", department: "Atendimento ao Cliente", managerName: "José Fernando Mosquer" },
    { name: "Alana Maiumy Gaspar", jobTitle: "Key Account", department: "Atendimento ao Cliente", managerName: "José Fernando Mosquer" },
    { name: "Mônica de Paula Neves", jobTitle: "Implantadora", department: "Atendimento ao Cliente", managerName: "José Fernando Mosquer" },
    { name: "Gabrielle Andrade Prestes", jobTitle: "Implantadora", department: "Atendimento ao Cliente", managerName: "José Fernando Mosquer" },
    { name: "Mathaus Kozkodai Alves", jobTitle: "Suporte Evolux", department: "Atendimento ao Cliente", managerName: "José Fernando Mosquer" },
    { name: "Pedro Arthur Lobregati Barreto", jobTitle: "Analista de Suporte Técnico", department: "Atendimento ao Cliente FiqOn", managerName: "Guilherme Pinheiro" },
    { name: "Roberty Augusto dos Santos Machado", jobTitle: "Analista de Suporte Técnico", department: "Atendimento ao Cliente FiqOn", managerName: "Guilherme Pinheiro" },
    { name: "Matheus Lorenzo Siqueira", jobTitle: "Analista de Suporte Técnico", department: "Atendimento ao Cliente FiqOn", managerName: "Guilherme Pinheiro" },
    { name: "Igor de Azevedo Ribeiro", jobTitle: "Gestor de Projetos", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "Annelise Ribeiro de Souza", jobTitle: "Gestor de Tráfego Pago", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "Rebeca Costa de Lima", jobTitle: "Copywriter", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "Leonardo Luiz Maciel", jobTitle: "Marketing Ops / Analista de Growth", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "Kauê Pszdzimirski de Vargas", jobTitle: "Designer", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "Ana Luiza de Souza Ida", jobTitle: "Social Media", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "Richard Matheus Mendes Cordeiro", jobTitle: "Filmmaker", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "João Marcos Costa de Lima", jobTitle: "Editor de vídeos", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "Gustavo Santos Schneider", jobTitle: "Web Developer", department: "Marketing", managerName: "Rafael Blaka Schimanski" },
    { name: "Alan Armstrong", jobTitle: "Gestor de Projetos", department: "Marketing", managerName: "Wagner Wolff Pretto" },
    { name: "Maria Cecilia Blaka Schimanski", jobTitle: "Copywriter", department: "Marketing", managerName: "Richard Matheus Mendes Cordeiro" },
    { name: "Vinícius Costa Leal", jobTitle: "Social Media", department: "Marketing", managerName: "Richard Matheus Mendes Cordeiro" },
    { name: "Maria Eduarda Araújo Gora", jobTitle: "Assistente de Parceria", department: "Parcerias", managerName: "Emily Godoy Da Silva" },
    { name: "Pamela Eduarda Rocha", jobTitle: "Assistente de Parcerias", department: "Parcerias", managerName: "Emily Godoy Da Silva" },
    { name: "Vinícius Biasi Assmann", jobTitle: "Analista de Automações", department: "Automações", managerName: "Pablo Emanuel da Silva" },
    { name: "Thiago Henrique Meneguim Marcondes", jobTitle: "Analista de Automações", department: "Automações", managerName: "Pablo Emanuel da Silva" },
    { name: "José Eduardo Giannini Zimmermann", jobTitle: "Analista de Automações", department: "Automações", managerName: "Pablo Emanuel da Silva" },
    { name: "Eduardo Portes Bueno", jobTitle: "Analista de Automações", department: "Automações", managerName: "Pablo Emanuel da Silva" },
    { name: "Gislene Cristiane Santos Machado", jobTitle: "Analista de Recrutamento e Seleção", department: "Pessoas e Cultura", managerName: "Lucas Limberger" },
    { name: "Renata Czapiewski Silva", jobTitle: "Analista de Pessoas e Cultura", department: "Pessoas e Cultura", managerName: "Lucas Limberger" },
    { name: "Ana Paula Antunes", jobTitle: "Assistente Geral", department: "Pessoas e Cultura", managerName: "Lucas Limberger" },
    { name: "Andreia Vieira Cunha", jobTitle: "Zeladora", department: "Pessoas e Cultura", managerName: "Lucas Limberger" },
    { name: "Elen Daiane De Souza", jobTitle: "Zeladora", department: "Pessoas e Cultura", managerName: "Lucas Limberger" },
    { name: "Ivonete Soares", jobTitle: "Zeladora", department: "Pessoas e Cultura", managerName: "Lucas Limberger" },
    { name: "Matheus Araujo Ribeiro de Britto", jobTitle: "Porteiro", department: "Pessoas e Cultura", managerName: "Lucas Limberger" },
    { name: "Paulo Fernando Bertoli", jobTitle: "Porteiro", department: "Pessoas e Cultura", managerName: "Lucas Limberger" },
    { name: "Gladston Kordiak", jobTitle: "Monitor Instituto 3C", department: "Instituto 3C", managerName: "Kawanna Barbosa Cordeiro" },
    { name: "Victor Raphael Pedroso de Lima", jobTitle: "Monitor Instituto 3C", department: "Instituto 3C", managerName: "Kawanna Barbosa Cordeiro" },
    { name: "Gabrieli Estefani dos Anjos Almeida", jobTitle: "Assistente de Recrutamento e Seleção", department: "Instituto 3C", managerName: "Kawanna Barbosa Cordeiro" },
    { name: "Isabely Wendler", jobTitle: "Gestor de Projetos", department: "Operações", managerName: "Ricardo Borges Camargo" }
];

const normalize = (str: string) => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

function generateEmail(name: string): string {
    if (!name) return `usuario.${Math.random()}@grupo-3c.com`;
    return normalize(name).replace(/\s+/g, '.') + '@grupo-3c.com';
}

async function main() {
    console.log(`🚀 Iniciando REINICIALIZAÇÃO COMPLETA de ${usersList.length} colaboradores...`);

    // ======================================================
    // 1. LIMPEZA TOTAL (Isso resolve a duplicação/triplicação)
    // ======================================================
    console.log('🗑️  Apagando registros antigos para evitar duplicatas...');

    // Apaga tabelas dependentes primeiro (se houver) para evitar erro de Foreign Key
    try { await prisma.access.deleteMany(); } catch { }
    try { await prisma.request.deleteMany(); } catch { }

    // Apaga todos os usuários
    try {
        await prisma.user.deleteMany();
        console.log('✅ Banco de dados limpo com sucesso.');
    } catch (e) {
        console.error('⚠️ Aviso ao limpar banco:', e);
    }

    // ======================================================
    // 2. CADASTRAR A LISTA OFICIAL DO ZERO
    // ======================================================
    console.log('🔄 Cadastrando lista oficial...');

    for (const u of usersList) {
        const email = generateEmail(u.name);

        try {
            await prisma.user.create({
                data: {
                    email: email,
                    name: u.name,
                    jobTitle: u.jobTitle,
                    department: u.department
                }
            });
        } catch (e: any) {
            console.error(`❌ Erro em ${u.name}:`, e.message);
        }
    }

    // ======================================================
    // 3. CONECTAR GESTORES
    // ======================================================
    console.log('🔗 Conectando hierarquia...');
    for (const u of usersList) {
        if (u.managerName) {
            try {
                const employee = await prisma.user.findFirst({
                    where: { name: { equals: u.name, mode: 'insensitive' } }
                });

                const manager = await prisma.user.findFirst({
                    where: { name: { contains: u.managerName, mode: 'insensitive' } }
                });

                if (employee && manager) {
                    await prisma.user.update({
                        where: { id: employee.id },
                        data: { managerId: manager.id }
                    });
                }
            } catch (e) { }
        }
    }

    console.log('🏁 Sincronização finalizada! (Sem duplicatas)');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());