import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const depts = await prisma.department.findMany();
    const roles = await prisma.role.findMany();
    console.log('--- DEPARTMENTS ---');
    console.log(JSON.stringify(depts, null, 2));
    console.log('--- ROLES ---');
    console.log(JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
