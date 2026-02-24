/**
 * Seed: Gestão de Pessoas — 130 colaboradores
 * Fonte: lista com Nome completo, Email, Cargo visível, Unidade, Departamento, Gestor Direto
 * Cria/atualiza departamentos, cargos (roles) e usuários com unit e gestor.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dados no formato: nome \t email \t cargo \t unidade \t departamento \t gestor
const RAW = `Alan Armstrong	alan.armstrong@grupo-3c.com	Porta voz da marca	3C+	Marketing	Wagner Wolff Pretto
Alana Maiumy Gaspar	alana.gaspar@grupo-3c.com	Customer Success	3C+	Atendimento ao Cliente	José Fernando Mosquer
Alessandro Dorneles Schneider	alessandro.schneider@grupo-3c.com	Líder de Vendas PME	3C+	Comercial Contact	Camila Souza de Oliveira
Alexsandy Correa dos Santos	alexsandy.correa@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Aline Alda da Fonseca Bocchi	aline.fonseca@grupo-3c.com	CFO	3C+	Board	Ney Eurico Pereira
Allan Von Stein Portela	allan.vonstein@grupo-3c.com	Analista de SI e Infraestrutura	3C+	Tecnologia e Segurança	Vladimir Antonio Sesar
Ana Luiza de Souza Ida	ana.ida@grupo-3c.com	Social Media	3C+	Marketing	Rafael Blaka Schimanski
Ana Paula Antunes	ana.antunes@grupo-3c.com	Assistente Geral	3C+	Pessoas e Performance	Lucas Limberger
Andressa Aparecida Krysa	andressa.krysa@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Andrieli de Oliveira Javorski	andrieli.javorski@grupo-3c.com	Desenvolvedor Full Stack	3C+	Produto 3C+	Gabriel Krysa
Annelise Ribeiro de Souza	annelise.souza@grupo-3c.com	Gestor de Tráfego Pago	3C+	Marketing	Rafael Blaka Schimanski
Beninciaril Pola Alvarez Mahecha	beninciaril.mahecha@grupo-3c.com	Zeladora	3C+	Pessoas e Performance	Lucas Limberger
Bianca da Cunha	bianca.cunha@grupo-3c.com	Closer 	3C+	Comercial Contact	Alessandro Dorneles Schneider
Bruno Garcia	bruno.garcia@grupo-3c.com	Desenvolvedor Full Stack	3C+	Produto 3C+	Gabriel Krysa
Bruno Levy de Arruda	bruno.levy@grupo-3c.com	DevOps	Evolux	Produto 3C+	Carlos Henrique Marques
Bruno Sahaidak	bruno.sahaidak@grupo-3c.com	Analista Contábil	3C+	Administrativo	Aline Alda da Fonseca Bocchi
Camila Brunetti Thomé	camila.brunetti@grupo-3c.com	Líder de Expansão	3C+	Expansão	Ricardo Borges Camargo
Camila Souza de Oliveira	camila.oliveira@grupo-3c.com	Head Comercial	3C+	Comercial Contact	Jaqueline de Souza
Carlos Henrique Marques	carlos.marques@grupo-3c.com	Tech Lead 	3C+	Produto 3C+	Guilherme Pimpão
Caroline Fatima de Gois Fila	caroline.gois@grupo-3c.com	Líder de Vendas PME	3C+	Comercial Contact	Camila Souza de Oliveira
Cirene Laiza da Cruz Lara	cirene.lara@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Dafiny Mélory Cordeiro Melo França	dafiny.franca@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Daniel Felipe da Silva Souza	daniel.souza@grupo-3c.com	Analista de Expansão	3C+	Expansão	Camila Brunetti Thomé
Deborah Peres	deborah.peres@grupo-3c.com	SalesOps	3C+	Comercial Contact	Camila Souza de Oliveira
Diogo Henrique Hartmann	diogo.hartmann@grupo-3c.com	CTO	3C+	Board	Ney Eurico Pereira
Eduardo Elias do Nascimento	eduardo.nascimento@grupo-3c.com	Closer 	Dizify	Dizify	Pietro Limberger
Eduardo Mateus dos Santos Gonçalves	eduardo.goncalves@grupo-3c.com	Desenvolvedor Full Stack	3C+	Produto 3C+	Gabriel Krysa
Eduardo Portes Bueno	eduardo.bueno@grupo-3c.com	Analista de Automações	3C+	RevOps	Pablo Emanuel da Silva
Eduardo Wosiak	eduardo.wosiak@grupo-3c.com	Analista de Projetos	3C+	Professional Service	Ricardo Borges Camargo
Emanuelly Petel	emanuelly.petel@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Emily Godoy Da Silva	emily.godoy@grupo-3c.com	Líder de Parcerias	3C+	Parcerias	Wagner Wolff Pretto
Felipe Moreira do Nascimento	felipe.nascimento@grupo-3c.com	Customer Success	3C+	Atendimento ao Cliente	José Fernando Mosquer
Fernando Vantroba Takakusa	fernando.takakusa@grupo-3c.com	Analista Financeiro	3C+	Administrativo	Aline Alda da Fonseca Bocchi
Filipe Ferreira Rovea	filipe.rovea@grupo-3c.com	Customer Success	3C+	Atendimento ao Cliente	José Fernando Mosquer
Gabriel de Lima Machado	gabriel.machado@grupo-3c.com	Analista de Automações	3C+	Atendimento ao Cliente	José Fernando Mosquer
Gabriel Krysa	gabriel.krysa@grupo-3c.com	Tech Lead	3C+	Produto 3C+	Guilherme Pimpão
Gabriel Pires Ida	gabriel.ida@grupo-3c.com	UX Designer	3C+	Produto 3C+	Guilherme Pimpão
Gabriel Schneider Bernadini	gabriel.bernadini@grupo-3c.com	Customer Success - Recuperação	3C+	Expansão	Camila Brunetti Thomé
Gabrieli Estefani dos Anjos Almeida	gabrieli.almeida@grupo-3c.com	Assistente de Recrutamento e Seleção	Instituto 3C	Instituto 3C	Kawanna Barbosa Cordeiro
Gabrielle Andrade Prestes	gabrielle.prestes@grupo-3c.com	Analista de Implantação	3C+	Atendimento ao Cliente	José Fernando Mosquer
Gabriely Garcia	gabriely.garcia@grupo-3c.com	Analista Jurídico	3C+	Administrativo	Aline Alda da Fonseca Bocchi
Gislene Cristiane Santos Machado	gislene.machado@grupo-3c.com	Analista de Recrutamento e Seleção 	3C+	Pessoas e Performance	Lucas Limberger
Gladston Kordiak	gladston.kordiak@grupo-3c.com	Monitor Instituto 3C	Instituto 3C	Instituto 3C	Kawanna Barbosa Cordeiro
Guilherme Ferreira Ribas	guilherme.ferreira@grupo-3c.com	Desenvolvedor Full Stack	3C+	Produto 3C+	Carlos Henrique Marques
Guilherme Medino Castro	guilherme.castro@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Guilherme Mello Minuzzi	guilherme.minuzzi@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Guilherme Pimpão Cavalcante	guilherme.pimpao@grupo-3c.com	CPOX	3C+	Board	Ney Eurico Pereira
Guilherme Pinheiro Lemos	guilherme.pinheiro@grupo-3c.com	Tech Lead 	FiqOn	Produto 3C+	Guilherme Pimpão
Gustavo Delonzek Brizola	gustavo.delonzek@grupo-3c.com	Desenvolvedor Full Stack	Dizparos	Produto 3C+	Carlos Henrique Marques
Gustavo dos Santos Dangui	gustavo.dangui@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Gustavo Santos Schneider	gustavo.schneider@grupo-3c.com	Web Developer	3C+	Marketing	Rafael Blaka Schimanski
Iago Moura do Prado	iago.prado@grupo-3c.com	Closer 	Dizify	Dizify	Pietro Limberger
Ian Ronska Nepomoceno	ian.ronska@grupo-3c.com	Analista de Telecom	3C+	Produto 3C+	Guilherme Pimpão
Igor de Azevedo Ribeiro	igor.ribeiro@grupo-3c.com	Gestor de Projetos	3C+	Marketing	Rafael Blaka Schimanski
Isabely Wendler	isabely.wendler@grupo-3c.com	Gestor de Projetos	3C+	Operações	Ricardo Borges Camargo
Italo Rossi Batista Cocentino	italo.rossi@grupo-3c.com	Líder de Produto 	3C+	Produto Evolux	Alan Armstrong
Ivonete Soares	ivonete.soares@grupo-3c.com	Zeladora	3C+	Pessoas e Performance	Lucas Limberger
Jaqueline de Souza	jaqueline.souza@grupo-3c.com	CSO	3C+	Board	Ney Eurico Pereira
Jeferson da Cruz	jeferson.cruz@grupo-3c.com	Desenvolvedor Back-End	Dizify	Dizify	Pietro Limberger
Jehnnifer Xavier Padilha	jehnnifer.padilha@grupo-3c.com	Líder de Enterprise 	3C+	Comercial Contact	Camila Souza de Oliveira
João Marcos Costa de Lima	joao.marcos@grupo-3c.com	Editor de Vídeos	3C+	Marketing	Rafael Blaka Schimanski
João Paulo Vasconcelos do Vale	joao.vasconcelos@grupo-3c.com	DevOps	3C+	Produto 3C+	Guilherme Pimpão
José Eduardo Giannini Zimmermann	jose.zimmermann@grupo-3c.com	Analista de Automações	3C+	RevOps	Pablo Emanuel da Silva
José Fernando Mosquer	fernando.mosquer@grupo-3c.com	Líder de Atendimento ao Cliente	3C+	Atendimento ao Cliente	Ricardo Borges Camargo
José Pablo Streiski Neto	jose.pablo@grupo-3c.com	Desenvolvedor Full Stack	3C+	Produto 3C+	Gabriel Krysa
Joyce Cordeiro	joyce.cordeiro@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Julia Gabrielly Martins Araujo	julia.araujo@grupo-3c.com	Desenvolvedor Back-End	Dizify	Dizify	Pietro Limberger
Vanderlei Assis de Andrade Junior	junior.andrade@grupo-3c.com	Analista de Negócios (PO)	3C+	Produto 3C+	Guilherme Pimpão
Kauane Lemos Bastos	kauane.bastos@grupo-3c.com	Analista de Expansão	3C+	Expansão	Camila Brunetti Thomé
Kauê Pszdzimirski de Vargas	kaue.vargas@grupo-3c.com	Designer	3C+	Marketing	Rafael Blaka Schimanski
Kawanna Barbosa Cordeiro	kawanna.cordeiro@grupo-3c.com	Coordenadora do Instituto 3C	Instituto 3C	Instituto 3C	Lucas Limberger
Kesley Luis de Oliveira	kesley.oliveira@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Ketlin Tainá Zaluski de Oliveira	ketlin.oliveira@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Leandro dos Santos Mülhstdtt da Silva	leandro.mulhstdtt@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Leonardo Kauan Ferraz	leonardo.ferraz@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Leonardo Luiz Maciel	leonardo.maciel@grupo-3c.com	Marketing Ops/ Analista de Growth	3C+	Marketing	Rafael Blaka Schimanski
Luan Matheus dos Santos Silva	luan.silva@grupo-3c.com	Assistente de Segurança da Informação 	3C+	Tecnologia e Segurança	Vladimir Antonio Sesar
Lucas Antonio Costa	lucas.costa@grupo-3c.com	Closer 	3C+	Comercial Contact	Alessandro Dorneles Schneider
Lucas Fontoura de Almeida	lucas.almeida@grupo-3c.com	Closer 	3C+	Comercial Contact	Alessandro Dorneles Schneider
Lucas Limberger	lucas.limberger@grupo-3c.com	CPO	3C+	Board	
Lucas Matheus da Cruz	lucas.matheus@grupo-3c.com	Desenvolvedor Full Stack	FiqOn	Produto 3C+	Guilherme Pinheiro
Lucas Schupchek de Jesus	lucas.schupchek@grupo-3c.com	Desenvolvedor Full Stack	FiqOn	Produto 3C+	Guilherme Pinheiro
Lucio Marcos Nascimento Ramos	lucio.ramos@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Luis Fernando Paganini	luis.paganini@grupo-3c.com	Desenvolvedor Full Stack	3C+	Produto 3C+	Carlos Henrique Marques
Luiz Emanoel Servo	luiz.servo@grupo-3c.com	Porteiro	3C+	Pessoas e Performance	Lucas Limberger
Marciel Boruch da Silva	marciel.silva@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Maria Eduarda Merhet Padilha	maria.merhet@grupo-3c.com	Analista de Expansão	3C+	Expansão	Camila Brunetti Thomé
Maria Eduarda Nezelo Rosa	maria.rosa@grupo-3c.com	Assistente Jurídico	3C+	Administrativo	Aline Alda da Fonseca Bocchi
Maria Fernanda Ribeiro	maria.ribeiro@grupo-3c.com	Desenvolvedor Front-end	Dizify	Dizify	Pietro Limberger
Marieli Aparecida Ferreira Thomen	marieli.ferreira@grupo-3c.com	Tech Lead	Dizify	Dizify	Pietro Limberger
Mateus Gerigk	mateus.gerigk@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Mathaus Kozkodai Alves	mathaus.alves@grupo-3c.com	Customer Success	3C+	Atendimento ao Cliente	José Fernando Mosquer
Matheus de Oliveira	matheus.oliveira@grupo-3c.com	Analista de Automações	3C+	RevOps	Pablo Emanuel da Silva
Matheus Lorenzo Siqueira	matheus.siqueira@grupo-3c.com	Desenvolvedor Full Stack	FiqOn	Produto 3C+	Guilherme Pinheiro
Matheus Rocha Camargo	matheus.rocha@grupo-3c.com	Desenvolvedor Full Stack	3C+	Produto 3C+	Gabriel Krysa
Maycon José Barbosa Padilha	maycon.barbosa@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Michele	michele.anjos@grupo-3c.com	Backoffice 	3C+	Comercial Contact	Alessandro Dorneles Schneider
Mônica de Paula Neves	monica.neves@grupo-3c.com	Analista de Implantação	3C+	Atendimento ao Cliente	José Fernando Mosquer
Ney Eurico Pereira	ney.pereira@grupo-3c.com	CEO	3C+	Board	
Nildson Polis Machado	nildson.machado@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Ovídio José Corrêa Farias	ovidio.farias@grupo-3c.com	Analista de Automações	3C+	Professional Service	Ricardo Borges Camargo
Pablo Emanuel da Silva	pablo.emanuel@grupo-3c.com	Líder de RevOps	3C+	RevOps	Ricardo Borges Camargo
Pamela Eduarda Rocha	pamela.rocha@grupo-3c.com	Assistente de Parcerias 	3C+	Parcerias	Emily Godoy Da Silva
Paulo Fernando Bertoli	paulo.bertoli@grupo-3c.com	Porteiro	3C+	Pessoas e Performance	Lucas Limberger
Pedro Arthur Lobregati Barreto	pedro.barreto@grupo-3c.com	Gestor de Projetos	3C+	Professional Service	Ricardo Borges Camargo
Pedro Henrique Ferreira do Nascimento	pedro.nascimento@grupo-3c.com	Desenvolvedor Full Stack	3C+	Produto 3C+	Carlos Henrique Marques
Pietro Giovani Franciosi Limberger	pietro.limberger@grupo-3c.com	CEO	Dizify	Dizify	Ney Eurico Pereira
Rafael Blaka Schimanski	rafael.schimanski@grupo-3c.com	Líder de Marketing	3C+	Marketing	Wagner Wolff Pretto
Rafaela Guedes Pinto Cavalcante Stephan	rafaela.stephan@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Raphael Pires Ida	raphael.pires@grupo-3c.com	Analista de Departamento Pessoal	3C+	Administrativo	Aline Alda da Fonseca Bocchi
Rebeca Costa de Lima	rebeca.costa@grupo-3c.com	Copywriter	3C+	Marketing	Rafael Blaka Schimanski
Renata Czapiewski Silva	renata.czapiewski@grupo-3c.com	Analista de Pessoas e Performance	3C+	Pessoas e Performance	Lucas Limberger
Rian Lucas de Matos Almeida	rian.almeida@grupo-3c.com	Customer Success	3C+	Atendimento ao Cliente	José Fernando Mosquer
Ricardo Borges Camargo	ricardo.camargo@grupo-3c.com	COO	3C+	Board	Ney Eurico Pereira
Richard Matheus Mendes Cordeiro	richard.cordeiro@grupo-3c.com	Filmmaker	3C+	Marketing	Rafael Blaka Schimanski
Roberta Gomes Ribeiro	roberta.gomes@grupo-3c.com	Closer	3C+	Comercial Contact	Alessandro Dorneles Schneider
Roberty Augusto dos Santos Machado	roberty.machado@grupo-3c.com	Customer Success	FiqOn	Atendimento ao Cliente	José Fernando Mosquer
Rosiane Correa	rosiane.correa@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Sergio Filipe Gadelha Roza	sergio.filipe@grupo-3c.com	Desenvolvedor Back-End	3C+	Produto Evolux	Carlos Henrique Marques
Sthephany Tomacheski de Moraes	sthephany.moraes@grupo-3c.com	Analista Financeiro	3C+	Administrativo	Aline Alda da Fonseca Bocchi
Taissa Guilliane Gomes Almeida	taissa.almeida@grupo-3c.com	Analista de Expansão	3C+	Expansão	Camila Brunetti Thomé
Taryk de Souza Ferreira	taryk.ferreira@grupo-3c.com	Closer 	Dizify	Dizify	Pietro Limberger
Thomas Arnon Schmidt Ferreira	thomas.ferreira@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Victor Raphael Pedroso de Lima	victor.raphael@grupo-3c.com	Monitor Instituto 3C	Instituto 3C	Instituto 3C	Kawanna Barbosa Cordeiro
Vinícius Biasi Assmann	vinicius.assmann@grupo-3c.com	Analista de Automações	3C+	RevOps	Pablo Emanuel da Silva
Vladimir Antonio Sesar	vladimir.sesar@grupo-3c.com	Líder de Segurança da Informação	3C+	Tecnologia e Segurança	Diogo Henrique Hartmann
Wagner Wolff Pretto	wagner.wolff@grupo-3c.com	CMO	3C+	Board	Ney Eurico Pereira
Wesley Diogo do Vale	wesley.vale@grupo-3c.com	Analista de Automações	3C+	Atendimento ao Cliente	José Fernando Mosquer
Willian Samuel de Oliveira	willian.samuel@grupo-3c.com	Closer	3C+	Comercial Contact	Jehnnifer Xavier Padilha
Yuri Karas Regis Pacheco de Miranda Lima	yuri.lima@grupo-3c.com	Desenvolvedor Full Stack	FiqOn	Produto 3C+	Guilherme Pinheiro`;

interface Row {
  name: string;
  email: string;
  jobTitle: string;
  unit: string;
  department: string;
  managerName: string;
}

function parse(): Row[] {
  return RAW.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('\t');
      return {
        name: (parts[0] || '').trim(),
        email: (parts[1] || '').trim().toLowerCase(),
        jobTitle: (parts[2] || '').trim(),
        unit: (parts[3] || '').trim(),
        department: (parts[4] || '').trim(),
        managerName: (parts[5] || '').trim(),
      };
    })
    .filter(r => r.email);
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('🌱 Seed Gestão de Pessoas — departamentos, cargos e 130 colaboradores');

  const rows = parse();
  console.log(`   ${rows.length} linhas parseadas.`);

  const deptNames = [...new Set(rows.map(r => r.department).filter(Boolean))];
  const deptMap = new Map<string, string>();

  for (const name of deptNames) {
    const d = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    deptMap.set(name, d.id);
  }
  console.log(`   ${deptMap.size} departamentos.`);

  const roleKey = (dept: string, cargo: string) => `${dept}::${cargo}`;
  const roleKeys = new Set<string>();
  for (const r of rows) {
    if (r.department && r.jobTitle) roleKeys.add(roleKey(r.department, r.jobTitle));
  }

  const roleMap = new Map<string, string>();
  for (const key of roleKeys) {
    const [deptName, roleName] = key.split('::');
    const deptId = deptMap.get(deptName);
    if (!deptId) continue;
    let role = await prisma.role.findFirst({
      where: { name: roleName, departmentId: deptId },
    });
    if (!role) {
      role = await prisma.role.create({
        data: { name: roleName, departmentId: deptId },
      });
    }
    roleMap.set(key, role.id);
  }
  console.log(`   ${roleMap.size} cargos.`);

  const nameToId = new Map<string, string>();
  for (const row of rows) {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: row.email, mode: 'insensitive' } },
    });
    const systemProfile = (existing as any)?.systemProfile === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'VIEWER';
    let user: { id: string };
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: row.name,
          jobTitle: row.jobTitle || null,
          department: row.department || null,
          unit: row.unit || null,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: row.name,
          email: row.email,
          jobTitle: row.jobTitle || null,
          department: row.department || null,
          unit: row.unit || null,
          systemProfile,
        },
      });
    }
    nameToId.set(normalizeName(row.name), user.id);
  }
  console.log(`   ${rows.length} usuários processados.`);

  let managerUpdates = 0;
  for (const row of rows) {
    if (!row.managerName) continue;
    const userId = nameToId.get(normalizeName(row.name));
    const managerId = nameToId.get(normalizeName(row.managerName));
    if (userId && managerId && userId !== managerId) {
      await prisma.user.update({
        where: { id: userId },
        data: { managerId },
      });
      managerUpdates++;
    }
  }
  console.log(`   ${managerUpdates} gestores vinculados.`);

  console.log('✅ Seed Gestão de Pessoas concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
