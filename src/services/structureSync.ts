import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const syncStructureFromUsers = async () => {
    console.log("🔄 Starting Structure Sync from Users...");

    try {
        const unitCount = await prisma.unit.count();
        if (unitCount > 0) {
            console.log("⚠️ Estrutura Unit já existe (seed_units). Sync from users ignorado.");
            return;
        }

        const users = await prisma.user.findMany({
            where: {
                department: { not: null },
                jobTitle: { not: null }
            },
            select: { department: true, jobTitle: true, unit: true }
        });

        if (users.length === 0) {
            console.log("⚠️ No users found to sync.");
            return;
        }

        console.log(`📊 Found ${users.length} users. Analyzing structure...`);

        const unitNames = [...new Set(users.map(u => u.unit).filter(Boolean))] as string[];
        const defaultUnitName = unitNames.length > 0 ? unitNames[0] : "Geral";
        let defaultUnit = await prisma.unit.findFirst({ where: { name: defaultUnitName } });
        if (!defaultUnit) {
            defaultUnit = await prisma.unit.create({ data: { name: defaultUnitName } });
            console.log(`   + Created Unit: ${defaultUnitName}`);
        }

        const uniqueDepartments = [...new Set(users.map(u => u.department).filter(Boolean))];

        for (const deptName of uniqueDepartments) {
            if (!deptName) continue;

            let dept = await prisma.department.findFirst({
                where: { unitId: defaultUnit.id, name: deptName }
            });

            if (!dept) {
                dept = await prisma.department.create({
                    data: { name: deptName, unitId: defaultUnit.id }
                });
                console.log(`   + Created Department: ${deptName}`);
            }

            const rolesInDept = [...new Set(
                users.filter(u => u.department === deptName).map(u => u.jobTitle).filter(Boolean)
            )];

            for (const roleName of rolesInDept) {
                if (!roleName) continue;

                const existingRole = await prisma.role.findFirst({
                    where: { name: roleName, departmentId: dept!.id }
                });

                if (!existingRole) {
                    await prisma.role.create({
                        data: { name: roleName, departmentId: dept!.id }
                    });
                    console.log(`   + Created Role: ${roleName} in ${deptName}`);
                }
            }
        }

        console.log("✅ Structure Sync Complete.");
    } catch (error) {
        console.error("❌ Error syncing structure:", error);
    }
};
