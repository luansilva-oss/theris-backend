import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando população de Departamentos e Roles baseada nos usuários existentes...');

    const users = await prisma.user.findMany({
        where: {
            department: { not: null },
            jobTitle: { not: null }
        }
    });

    console.log(`📋 Encontrados ${users.length} usuários para processar.`);

    // 1. Extrair Departamentos Únicos
    const uniqueDepartments = Array.from(new Set(users.map(u => u.department).filter(Boolean) as string[]));
    console.log(`🏢 Departamentos únicos encontrados: ${uniqueDepartments.length}`);

    for (const deptName of uniqueDepartments) {
        // Find existing department manually since 'name' is not unique in schema
        let dept = await prisma.department.findFirst({
            where: { name: deptName }
        });

        if (!dept) {
            dept = await prisma.department.create({
                data: { name: deptName }
            });
            console.log(`   + Dept criado: ${deptName}`);
        } else {
            console.log(`   . Dept existe: ${deptName}`);
        }

        // 2. Extrair Roles para este Departamento
        const rolesInDept = Array.from(new Set(
            users
                .filter(u => u.department === deptName && u.jobTitle)
                .map(u => u.jobTitle as string)
        ));

        for (const roleName of rolesInDept) {
            // Check existing role manually
            const existingRole = await prisma.role.findFirst({
                where: {
                    name: roleName,
                    departmentId: dept.id
                }
            });

            if (!existingRole) {
                await prisma.role.create({
                    data: {
                        name: roleName,
                        departmentId: dept.id
                    }
                });
                console.log(`     + Role criada: ${roleName}`);
            }
        }
    }

    console.log('✅ População de estrutura concluída!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
