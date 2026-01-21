import { PrismaClient } from '@prisma/client'

// O Prisma 5 lê o .env automaticamente
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Começando a semear o banco...')

  // Luan
  const colaborador1 = await prisma.colaborador.upsert({
    where: { email: 'luan.silva@3c.com' },
    update: {},
    create: {
      nome: 'Luan Silva',
      email: 'luan.silva@3c.com',
      cargo: 'Desenvolvedor Full Stack',
      departamento: 'Tecnologia',
      kbs: 'KBS-DEV-1',
      ativo: true,
    },
  })

  // Vladimir
  const colaborador2 = await prisma.colaborador.upsert({
    where: { email: 'vladimir@3c.com' },
    update: {},
    create: {
      nome: 'Vladimir (Gestor)',
      email: 'vladimir@3c.com',
      cargo: 'Head de SI',
      departamento: 'Segurança da Informação',
      kbs: 'KBS-SI-LEAD',
      ativo: true,
    },
  })

  console.log(`✅ Criado: ${colaborador1.nome}`)
  console.log(`✅ Criado: ${colaborador2.nome}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })