import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const csvContent = `
Nome Completo;Cargo;Departamento;Gestor Direto
Alexander Eduardo dos Reis;Líder de Professional Service;Professional Service;Ricardo Borges Camargo
Camila Brunetti Thomé;Líder de Farmer;Comercial;Camila Souza de Oliveira
Camila Souza de Oliveira;Head Comercial;Comercial;Jaqueline de Souza
Carlos Henrique Marques;Tech Lead;Produto;Guilherme Pimpão Cavalcante
Caroline Fatima de Gois Fila;Líder de Vendas PME;Comercial;Camila Souza de Oliveira
Emily Godoy Da Silva;Líder de Parcerias;Parcerias;Wagner Wolff Pretto
Gabriel Krysa;Tech Lead;Produto;Guilherme Pimpão Cavalcante
Jehnnifer Xavier Padilha;Líder de Enterprise;Comercial;Camila Souza de Oliveira
José Fernando Mosquer;Líder de Atendimento ao Cliente;Atendimento ao Cliente;Ricardo Borges Camargo
Kawanna Barbosa Cordeiro;Coordenadora do Instituto 3C;Instituto 3C;Lucas Limberger
Michele Bodot dos Anjos;Líder PME;Comercial;Ricardo Borges Camargo
Pablo Emanuel da Silva;Líder de automações;Automações;Ricardo Borges Camargo
Rafael Blaka Schimanski;Líder de marketing;Marketing;Wagner Wolff Pretto
Vladimir Antonio Sesar;Líder de Segurança da Informação;Tecnologia e Segurança;Diogo Henrique Hartmann
Guilherme Pinheiro;Head de Produto;FiqOn;Guilherme Pimpão Cavalcante
Pietro Limberger;CEO Dizify;Dizify;Lucas Limberger
Marieli Aparecida Ferreira Thomen;Tech Lead;Produto;Pietro Limberger
Taryk;Líder de Vendas Dizify;Comercial Dizify;Pietro Limberger
Thomas Arnon Schmidt Ferreira;Líder Enterprise;Comercial;Camila Souza de Oliveira
Ney Eurico Pereira;CEO;Board;-
Wagner Wolff Pretto;CMO;Board;Ney Eurico Pereira
Lucas Limberger;CPO;Board;Ney Eurico Pereira
Ricardo Borges Camargo;COO;Board;Ney Eurico Pereira
Guilherme Pimpão Cavalcante;CPOX;Board;Ney Eurico Pereira
Diogo Henrique Hartmann;CTO;Board;Ney Eurico Pereira
Aline Alda da Fonseca Bocchi;CFO;Board;Ney Eurico Pereira
Jaqueline de Souza;CSO;Board;Ney Eurico Pereira
Bruno Sahaidak;Analista Contábil;Administrativo;Aline Alda da Fonseca Bocchi
Fernando Vantroba Takakusa;Assistente Financeiro;Administrativo;Aline Alda da Fonseca Bocchi
Gabriely Garcia;Assistente Jurídico;Administrativo;Aline Alda da Fonseca Bocchi
Maria Eduarda Nezelo Rosa;Assistente Jurídico;Administrativo;Aline Alda da Fonseca Bocchi
Raphael Pires Ida;Analista de Departamento Pessoal;Administrativo;Aline Alda da Fonseca Bocchi
Sthephany Tomacheski de Moraes;Assistente Financeiro;Administrativo;Aline Alda da Fonseca Bocchi
Andrieli de Oliveira Javorski;Desenvolvedor Front-end;Produto 3C+;Gabriel Krysa
Matheus Rocha Camargo;Desenvolvedor Front-end;Produto 3C+;Gabriel Krysa
Bruno Garcia;Desenvolvedor Back-End;Produto 3C+;Gabriel Krysa
José Pablo Streiski Neto;Desenvolvedor Back-End;Produto 3C+;Gabriel Krysa
Eduardo Mateus dos Santos Gonçalves;Desenvolvedor Back-End;Produto 3C+;Gabriel Krysa
Gabriel Pires Ida;UX Designer;Produto 3C+;Carlos Henrique Marques
Vanderlei Assis de Andrade Junior;P.O;Produto 3C+;Carlos Henrique Marques
Matheus Oliveira;Analista de Automações;Produto;Guilherme Pimpão
Gustavo Delonzek Brizola;Desenvolvedor Full-stack;Produto 3C+;Gabriel Krysa
Luis Fernando Paganini;Desenvolvedor Front-end;Produto Evolux;Carlos Henrique Marques
Guilherme Ferreira Ribas;Desenvolvedor Front-end;Produto Evolux;Carlos Henrique Marques
Pedro Henrique Ferreira do Nascimento;Desenvolvedor Back-End;Produto Evolux;Carlos Henrique Marques
Bruno Levy de Arruda;DevOps;Produto Evolux;Carlos Henrique Marques
Lucas Schupchek de Jesus;Desenvolvedor Back-End;Produto FiqOn;Guilherme Pinheiro
Lucas Matheus da Cruz;Desenvolvedor Back-End;Produto FiqOn;Guilherme Pinheiro
Yuri Karas Regis Pacheco de Miranda Lima;Desenvolvedor Front-End;Produto FiqOn;Guilherme Pinheiro
Julia Gabrielly Martins Araujo;Desenvolvedor Back-End;Produto Dizify;Marieli Aparecida Ferreira Thomen
Maria Fernanda Ribeiro;Desenvolvedor Front-End;Produto Dizify;Marieli Aparecida Ferreira Thomen
Jeferson da Cruz;Desenvolvedor Back-End;Produto Dizify;Marieli Aparecida Ferreira Thomen
Thomas Arnon Schmidt Ferreira;Líder Enterprise;Comercial Contact;Jaqueline de Souza
Leonardo Kauan Ferraz;Closer;Comercial Contact;Jehnnifer Xavier Padilha
André Luiz Paluski;Closer;Comercial Contact;Jehnnifer Xavier Padilha
Joyce Cordeiro;Closer;Comercial Contact;Jehnnifer Xavier Padilha
Kesley Luis de Oliveira;Closer;Comercial Contact;Jehnnifer Xavier Padilha
Rosiane Correa;Closer;Comercial Contact;Jehnnifer Xavier Padilha
Mateus Gerik;Closer;Comercial Contact;Jehnnifer Xavier Padilha
Lucio Marcos Nascimento Ramos;Closer;Comercial Contact;Thomas Arnon Schmidt Ferreira
Guilherme Mello Minuzzi;Closer;Comercial Contact;Thomas Arnon Schmidt Ferreira
Ketlin Tainá Zaluski de Oliveira;Closer;Comercial Contact;Thomas Arnon Schmidt Ferreira
Leandro dos Santos Mülhstdtt da Silva;Closer;Comercial Contact;Thomas Arnon Schmidt Ferreira
Gustavo dos Santos Dangui;Closer;Comercial Contact;Thomas Arnon Schmidt Ferreira
Willian Samuel de Oliveira;Closer;Comercial Contact;Thomas Arnon Schmidt Ferreira
Alexsandy Correa dos Santos;Closer;Comercial Contact;Thomas Arnon Schmidt Ferreira
Deborah Peres;SalesOps;Comercial Contact;Thomas Arnon Schmidt Ferreira
Maria Eduarda Merhet Padilha;Farmer;Expansão;Camila Brunetti Thomé
Daniel Felipe da Silva Souza;Farmer;Expansão;Camila Brunetti Thomé
Kauane Lemos Bastos;Farmer;Expansão;Camila Brunetti Thomé
Taissa Guilliane Gomes Almeida;Farmer;Expansão;Camila Brunetti Thomé
Rafaela Guedes Pinto Cavalcante Stephan;Closer;Comercial Contact;Michele Bodot dos Anjos
Cirene Laiza da Cruz Lara;Closer;Comercial Contact;Michele Bodot dos Anjos
Maycon José Barbosa Padilha;Closer;Comercial Contact;Michele Bodot dos Anjos
Lucas Fontoura de Almeida;Closer;Comercial Contact;Michele Bodot dos Anjos
Roberta Gomes Ribeiro;Closer;Comercial Contact;Michele Bodot dos Anjos
Lucas Antonio Costa;Closer;Comercial Contact;Michele Bodot dos Anjos
Gabriel Schneider Bernadini;Recuperador;Comercial Contact;Michele Bodot dos Anjos
Bianca da Cunha;Closer;Comercial Contact;Michele Bodot dos Anjos
Eduardo Elias;Closer;Comercial Dizify;Pietro Limberger
Iago Moura do Prado;Closer;Comercial Dizify;Pietro Limberger
Allan Von Stein Portela;Analista de Segurança e Infraestrutura;Tecnologia e Segurança;Vladimir Antonio Sesar
Luan Matheus da Silva;Analista de Segurança da Informação;Tecnologia e Segurança;Vladimir Antonio Sesar
Ian Ronska Nepomoceno;Analista de Custos;Tecnologia e Segurança;Diogo Henrique Hartmann
João Paulo Vasconcelos;DevOps;Tecnologia e Segurança;Diogo Henrique Hartmann
Gabriel de Lima Machado;Analista de PS;Professional Service;Alexander Eduardo dos Reis
Wesley Diogo do Vale;Analista de PS;Professional Service;Alexander Eduardo dos Reis
Eduardo Wosiak;Professional Service;Professional Service;Alexander Eduardo dos Reis
Felipe Moreira do Nascimento;Analista PME;Atendimento ao Cliente;José Fernando Mosquer
Filipe Ferreira Rovea;Analista PME;Atendimento ao Cliente;José Fernando Mosquer
Rian Lucas de Matos Almeida;Key Account;Atendimento ao Cliente;José Fernando Mosquer
Alana Maiumy Gaspar;Key Account;Atendimento ao Cliente;José Fernando Mosquer
Mônica de Paula Neves;Implantadora;Atendimento ao Cliente;José Fernando Mosquer
Gabrielle Andrade Prestes;Implantadora;Atendimento ao Cliente;José Fernando Mosquer
Mathaus Kozkodai Alves;Suporte Evolux;Atendimento ao Cliente;José Fernando Mosquer
Pedro Arthur Lobregati Barreto;Analista de Suporte Técnico;Atendimento ao Cliente FiqOn;Guilherme Pinheiro
Roberty Augusto dos Santos Machado;Analista de Suporte Técnico;Atendimento ao Cliente FiqOn;Guilherme Pinheiro
Matheus Lorenzo Siqueira;Analista de Suporte Técnico;Atendimento ao Cliente FiqOn;Guilherme Pinheiro
Igor de Azevedo Ribeiro;Gestor de Projetos;Marketing;Rafael Blaka Schimanski
Annelise Ribeiro de Souza;Gestor de Tráfego Pago;Marketing;Rafael Blaka Schimanski
Rebeca Costa de Lima;Copywriter;Marketing;Rafael Blaka Schimanski
Leonardo Luiz Maciel;Marketing Ops / Analista de Growth;Marketing;Rafael Blaka Schimanski
Kauê Pszdzimirski de Vargas;Designer;Marketing;Rafael Blaka Schimanski
Ana Luiza de Souza Ida;Social Media;Marketing;Rafael Blaka Schimanski
Richard Matheus Mendes Cordeiro;Filmmaker;Marketing;Rafael Blaka Schimanski
João Marcos Costa de Lima;Editor de vídeos;Marketing;Rafael Blaka Schimanski
Gustavo Santos Schneider;Web Developer;Marketing;Rafael Blaka Schimanski
Alan Armstrong;Gestor de Projetos;Marketing;Wagner Wolff Pretto
Maria Cecilia Blaka Schimanski;Copywriter;Marketing;Richard Matheus Mendes Cordeiro
Vinícius Costa Leal;Social Media;Marketing;Richard Matheus Mendes Cordeiro
Maria Eduarda Araújo Gora;Assistente de Parceria;Parcerias;Emily Godoy Da Silva
Pamela Eduarda Rocha;Assistente de Parcerias;Parcerias;Emily Godoy Da Silva
Vinícius Biasi Assmann;Analista de Automações;Automações;Pablo Emanuel da Silva
Thiago Henrique Meneguim Marcondes;Analista de Automações;Automações;Pablo Emanuel da Silva
José Eduardo Giannini Zimmermann;Analista de Automações;Automações;Pablo Emanuel da Silva
Eduardo Portes Bueno;Analista de Automações;Automações;Pablo Emanuel da Silva
Gislene Cristiane Santos Machado;Analista de Recrutamento e Seleção;Pessoas e Cultura;Lucas Limberger
Renata Czapiewski Silva;Analista de Pessoas e Cultura;Pessoas e Cultura;Lucas Limberger
Ana Paula Antunes;Assistente Geral;Pessoas e Cultura;Lucas Limberger
Andreia Vieira Cunha;Zeladora;Pessoas e Cultura;Lucas Limberger
Elen Daiane De Souza;Zeladora;Pessoas e Cultura;Lucas Limberger
Ivonete Soares;Zeladora;Pessoas e Cultura;Lucas Limberger
Matheus Araujo Ribeiro de Britto;Porteiro;Pessoas e Cultura;Lucas Limberger
Paulo Fernando Bertoli;Porteiro;Pessoas e Cultura;Lucas Limberger
Gladston Kordiak;Monitor Instituto 3C;Instituto 3C;Kawanna Barbosa Cordeiro
Victor Raphael Pedroso de Lima;Monitor Instituto 3C;Instituto 3C;Kawanna Barbosa Cordeiro
Gabrieli Estefani dos Anjos Almeida;Assistente de Recrutamento e Seleção;Instituto 3C;Kawanna Barbosa Cordeiro
Isabely Wendler;Gestor de Projetos;Operações;Ricardo Borges Camargo
`;

function generateEmail(name: string): string {
    if (!name) return `usuario.${Math.random()}@grupo-3c.com`;
    return name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .trim()
        .replace(/\s+/g, '.') // Troca espaços por pontos
        + '@grupo-3c.com';
}

async function main() {
    console.log('🚀 Iniciando importação...');

    const lines = csvContent.trim().split('\n');
    const dataRows = lines.filter(line => line.trim().length > 0 && !line.toLowerCase().startsWith('nome completo'));

    const usersData = dataRows.map(row => {
        const cols = row.split(';').map(c => c.trim());
        return {
            name: cols[0],
            email: generateEmail(cols[0]),
            jobTitle: cols[1] || null,
            department: cols[2] || null,
            managerName: cols[3] && cols[3] !== '-' ? cols[3] : null
        };
    });

    // 1. Criar Usuários
    console.log('🔄 Gravando usuários...');
    for (const u of usersData) {
        try {
            await prisma.user.upsert({
                where: { email: u.email },
                update: {
                    name: u.name,
                    jobTitle: u.jobTitle,
                    department: u.department
                },
                create: {
                    email: u.email,
                    name: u.name,
                    jobTitle: u.jobTitle,
                    department: u.department
                    // REMOVIDA A SENHA QUE CAUSAVA O ERRO
                }
            });
            // console.log(`✅ Salvo: ${u.name}`);
        } catch (e: any) {
            console.error(`❌ Erro ao salvar ${u.name}: ${e.message}`);
        }
    }

    // 2. Conectar Gestores
    console.log('🔗 Conectando hierarquia...');
    for (const u of usersData) {
        if (u.managerName) {
            try {
                const manager = await prisma.user.findFirst({
                    where: {
                        name: { contains: u.managerName, mode: 'insensitive' }
                    }
                });

                if (manager) {
                    await prisma.user.update({
                        where: { email: u.email },
                        data: { managerId: manager.id }
                    });
                } else {
                    // Este log é normal se o gestor ainda não foi criado ou nome está diferente
                    // console.warn(`⚠️ Gestor "${u.managerName}" não encontrado para ${u.name}`);
                }
            } catch (e) {
                // Ignora erros de atualização se o usuário não existir
            }
        }
    }

    console.log('🏁 Importação finalizada!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());