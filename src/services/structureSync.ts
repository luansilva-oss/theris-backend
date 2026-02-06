import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const syncStructureFromUsers = async () => {
    console.log("🔄 Starting Structure Sync from Users...");

    try {
        const users = await prisma.user.findMany({
            where: {
                department: { not: null },
                jobTitle: { not: null }
            },
            select: { department: true, jobTitle: true }
        });

        if (users.length === 0) {
            console.log("⚠️ No users found to sync.");
            return;
        }

        console.log(`📊 Found ${users.length} users. Analyzing structure...`);

        // 1. Sync Departments
        const uniqueDepartments = [...new Set(users.map(u => u.department).filter(Boolean))];

        for (const deptName of uniqueDepartments) {
            if (!deptName) continue;

            // Find or create Department
            let dept = await prisma.department.findUnique({
                where: { name: deptName }
            });

            if (!dept) {
                dept = await prisma.department.create({
                    data: { name: deptName }
                });
                console.log(`   + Created Department: ${deptName}`);
            }

            // 2. Sync Roles for this Department
            const rolesInDept = [...new Set(
                users.filter(u => u.department === deptName).map(u => u.jobTitle).filter(Boolean)
            )];

            for (const roleName of rolesInDept) {
                if (!roleName) continue;

                // Check if role exists in this department
                const existingRole = await prisma.role.findFirst({
                    where: { name: roleName, departmentId: dept.id }
                });

                if (!existingRole) {
                    await prisma.role.create({
                        data: {
                            name: roleName,
                            departmentId: dept.id
                        }
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
