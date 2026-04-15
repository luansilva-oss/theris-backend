import { prisma } from '../lib/prisma'

async function main() {
  console.log('=== CORREÇÃO FINAL POR EMAIL EXATO ===\n')

  // ─── DELETAR por email exato ───────────────────────────────────────
  const emailsParaDeletar = [
    'jose@3cplusnow.com',
    'ian@3cplusnow.com',
    'bruno.levi@grupo-3c.com',
    'diogo@3cplusnow.com',
    // Duplicatas — manter apenas o email @grupo-3c.com
    'vinicius.leal@grupo-3c.com',           // duplicata de vinicius.costa.leal
    'matheus.britto@grupo-3c.com',          // duplicata de matheus.araujo.ribeiro
    'andreia.cunha@bettega.online',         // duplicata de andreia.vieira.cunha
    // Gabriel de Lima — jobTitle "Colaborador" sem role válida
    'gabriel.lima@grupo-3c.com',
  ]

  for (const email of emailsParaDeletar) {
    const u = await prisma.user.findFirst({ where: { email } })
    if (u) {
      await prisma.user.delete({ where: { id: u.id } })
      console.log(`🗑️  Deletado: ${u.name} (${email})`)
    } else {
      console.log(`⬜ Não encontrado: ${email}`)
    }
  }

  // ─── MAPEAMENTO por email exato → roleId ──────────────────────────
  const atribuicoes: Array<{ email: string; roleId: string }> = [
    // Closers Comercial Contact
    { email: 'lucio.marcos.nascimento.ramos@grupo-3c.com',          roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'leandro.dos.santos.mulhstdtt.da.silva@grupo-3c.com',  roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'gustavo.dos.santos.dangui@grupo-3c.com',              roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'rafaela.guedes.pinto.cavalcante.stephan@grupo-3c.com',roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'cirene.laiza.da.cruz.lara@grupo-3c.com',              roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'lucas.fontoura.de.almeida@grupo-3c.com',              roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'lucas.antonio.costa@grupo-3c.com',                    roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'leonardo.kauan.ferraz@grupo-3c.com',                  roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'roberta.gomes.ribeiro@grupo-3c.com',                  roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'guilherme.mello.minuzzi@grupo-3c.com',                roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'kesley.luis.de.oliveira@grupo-3c.com',                roleId: 'b326cb12-fa81-4767-af0a-318fde6b8e0d' },
    { email: 'iago.moura.do.prado@grupo-3c.com',                    roleId: 'd72278dd-9919-46b4-b775-32dceae860ef' }, // Dizify
    { email: 'eduardo.elias@grupo-3c.com',                          roleId: 'd72278dd-9919-46b4-b775-32dceae860ef' }, // Dizify
    // Farmers → Analista de Expansão
    { email: 'daniel.felipe.da.silva.souza@grupo-3c.com',           roleId: '31049be6-18da-41f2-b751-086d7de0b673' },
    { email: 'kauane.lemos.bastos@grupo-3c.com',                    roleId: '31049be6-18da-41f2-b751-086d7de0b673' },
    // Marketing
    { email: 'annelise.ribeiro.de.souza@grupo-3c.com',              roleId: 'c722cda5-fde8-49e7-b344-56cdcee881f7' }, // Gestor Tráfego
    { email: 'leonardo.luiz.maciel@grupo-3c.com',                   roleId: '3b3b27fb-aaca-4292-89ae-587fc18fc44e' }, // Mkt Ops
    { email: 'ana.luiza.de.souza.ida@grupo-3c.com',                 roleId: '9f74539a-46f6-4b97-abbe-345062b60aa0' }, // Social Media
    { email: 'vinicius.costa.leal@grupo-3c.com',                    roleId: '9f74539a-46f6-4b97-abbe-345062b60aa0' }, // Social Media
    { email: 'maria.cecilia.blaka.schimanski@grupo-3c.com',         roleId: '0fa7fa20-7370-4dfc-a57a-761b1d498916' }, // Copywriter
    { email: 'rebeca.costa.de.lima@grupo-3c.com',                   roleId: '0fa7fa20-7370-4dfc-a57a-761b1d498916' }, // Copywriter
    { email: 'joao.marcos.costa.de.lima@grupo-3c.com',              roleId: '8d2d6633-c741-48e0-9919-5c7f5a672ca9' }, // Editor Vídeos
    { email: 'gustavo.santos.schneider@grupo-3c.com',               roleId: '5b8322b4-4d9d-4a13-b670-5e5043237693' }, // Web Developer
    { email: 'richard.matheus.mendes.cordeiro@grupo-3c.com',        roleId: '90ac9438-94d1-4100-9d00-c0c4f8e58c23' }, // Filmmaker
    { email: 'igor.de.azevedo.ribeiro@grupo-3c.com',                roleId: '18f7a255-cda5-4559-be21-d440d601df35' }, // Gestor Projetos Mkt
    // P&C
    { email: 'gislene.cristiane.santos.machado@grupo-3c.com',       roleId: '6a9009e1-4254-4eab-9e01-4bea4ca2176c' }, // Analista R&S
    { email: 'renata.czapiewski.silva@grupo-3c.com',                roleId: 'c705a621-9800-4fc8-ba33-4345e1a67d23' }, // Analista PeC
    { email: 'ana.paula.antunes@grupo-3c.com',                      roleId: '9f3ac0cd-26ee-44f0-81e8-394f91fa2c40' }, // Assistente Geral
    { email: 'andreia.vieira.cunha@grupo-3c.com',                   roleId: '30553bf3-2e08-448b-816b-cd06c7d2d596' }, // Zeladora
    { email: 'elen.daiane.de.souza@grupo-3c.com',                   roleId: '30553bf3-2e08-448b-816b-cd06c7d2d596' }, // Zeladora
    { email: 'matheus.araujo.ribeiro.de.britto@grupo-3c.com',       roleId: '29698a1d-5a96-46ce-84c1-07a98e53d0c6' }, // Porteiro
    { email: 'paulo.fernando.bertoli@grupo-3c.com',                 roleId: '29698a1d-5a96-46ce-84c1-07a98e53d0c6' }, // Porteiro
    // Instituto
    { email: 'gabrieli.estefani.dos.anjos.almeida@grupo-3c.com',    roleId: '2952ccd4-c0c7-46b3-acb5-31efc0dd8013' }, // Assistente R&S
    { email: 'victor.raphael.pedroso.de.lima@grupo-3c.com',         roleId: 'ab9e026a-a47b-4558-b95b-53f70cbc70ee' }, // Monitor
    { email: 'kawanna.barbosa.cordeiro@grupo-3c.com',               roleId: '3c2c643d-a2ab-4239-9dea-6581341201a4' }, // Coordenadora Instituto
    // Produto
    { email: 'carlos.henrique.marques@grupo-3c.com',                roleId: '91ade3a8-79e2-4e85-95b6-e869f443caac' }, // Tech Lead 3C
    { email: 'eduardo.mateus.dos.santos.goncalves@grupo-3c.com',    roleId: '35301c87-5560-4d36-bac5-f43a99176083' }, // Dev Full 3C
    { email: 'jose.pablo.streiski.neto@grupo-3c.com',               roleId: 'b6c58a7b-5dac-4ba9-85c1-70dfec3f1270' }, // Dev Back Evolux
    { email: 'yuri.karas.regis.pacheco.de.miranda.lima@grupo-3c.com', roleId: 'f53f15c2-bb09-4a1d-bec3-e02c66620f75' }, // Dev Full FiqOn
    // Parcerias
    { email: 'maria.eduarda.araujo.gora@grupo-3c.com',              roleId: 'd09a3ce9-5fe3-4632-9d8d-2a40ac12a50a' }, // Assistente Parcerias
  ]

  console.log('\n=== ATRIBUINDO ROLES POR EMAIL ===\n')
  for (const { email, roleId } of atribuicoes) {
    const user = await prisma.user.findFirst({ where: { email } })
    if (!user) { console.log(`⬜ Não encontrado: ${email}`); continue }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { department: true }
    })
    if (!role) { console.log(`⚠️  Role não encontrada: ${roleId}`); continue }

    if (user.departmentId === role.departmentId) {
      console.log(`✓ Já correto: ${user.name}`)
      continue
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        roleId: role.id,
        departmentId: role.departmentId,
        unitId: role.department?.unitId ?? null
      }
    })
    console.log(`✓ ${user.name} → ${role.name} | ${role.department?.name}`)
  }

  // ─── RESULTADO FINAL ───────────────────────────────────────────────
  console.log('\n=== RESULTADO FINAL ===\n')
  const restantes = await prisma.user.findMany({
    where: { departmentId: null },
    select: { name: true, email: true, jobTitle: true }
  })
  if (restantes.length === 0) {
    console.log('✅ Todos os usuários têm departmentId!')
  } else {
    console.log(`⚠️  ${restantes.length} usuários ainda sem departmentId:`)
    restantes.forEach(u => console.log(` - ${u.name} | ${u.email} | ${u.jobTitle}`))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
