import { prisma } from '../lib/prisma'

async function main() {
  const users = await prisma.user.findMany({
    where: { departmentId: null }
  })

  console.log(`\n=== USUÁRIOS SEM departmentId: ${users.length} ===\n`)

  // 1. Verificar emails duplicados no banco inteiro
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  })
  const emailCount: Record<string, number> = {}
  for (const u of allUsers) {
    emailCount[u.email] = (emailCount[u.email] || 0) + 1
  }
  const duplicateEmails = Object.entries(emailCount).filter(([_, c]) => c > 1)
  if (duplicateEmails.length > 0) {
    console.log(`⚠️  EMAILS DUPLICADOS NO BANCO:`)
    duplicateEmails.forEach(([email, count]) => console.log(`   ${email} → ${count}x`))
  } else {
    console.log(`✓ Nenhum email duplicado encontrado`)
  }

  // 2. Para cada user sem departmentId, mostrar quantas roles batem no jobTitle
  console.log(`\n=== SIMULAÇÃO DE MATCH POR jobTitle (SEM ALTERAR NADA) ===\n`)

  let wouldMigrate = 0
  let ambiguous = 0
  let noMatch = 0
  let noJobTitle = 0

  for (const user of users) {
    if (!user.jobTitle) {
      noJobTitle++
      console.log(`⬜ ${user.name} | sem jobTitle`)
      continue
    }

    const roles = await prisma.$queryRaw<Array<{
      id: string
      name: string
      departmentId: string
    }>>`
      SELECT r.id, r.name, r."departmentId"
      FROM "Role" r
      WHERE LOWER(r.name) LIKE LOWER(${'%' + user.jobTitle + '%'})
      LIMIT 5
    `

    if (roles.length === 1) {
      wouldMigrate++
      console.log(`✓ ${user.name} → "${roles[0].name}"`)
    } else if (roles.length > 1) {
      ambiguous++
      console.log(`⚠️  ${user.name} | jobTitle "${user.jobTitle}" → ${roles.length} matches:`)
      roles.forEach(r => console.log(`      - ${r.name} (${r.id})`))
    } else {
      noMatch++
      console.log(`✗ ${user.name} | jobTitle "${user.jobTitle}" → nenhuma role`)
    }
  }

  console.log(`\n=== RESUMO DA SIMULAÇÃO ===`)
  console.log(`✓ Seriam migrados:     ${wouldMigrate}`)
  console.log(`⚠️  Ambíguos (2+ roles): ${ambiguous}`)
  console.log(`✗ Sem match:           ${noMatch}`)
  console.log(`⬜ Sem jobTitle:        ${noJobTitle}`)
  console.log(`\nNenhum dado foi alterado. Revise antes de rodar a migração real.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
