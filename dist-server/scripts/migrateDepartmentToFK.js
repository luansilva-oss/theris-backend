"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
async function main() {
    const users = await prisma_1.prisma.user.findMany({
        where: { departmentId: null }
    });
    console.log(`Total sem departmentId: ${users.length}`);
    let migrated = 0;
    const unmatched = [];
    for (const user of users) {
        if (!user.roleId) {
            unmatched.push(`${user.name} | sem roleId`);
            continue;
        }
        const role = await prisma_1.prisma.$queryRaw `
      SELECT r."departmentId", d."unitId"
      FROM "Role" r
      LEFT JOIN "Department" d ON d.id = r."departmentId"
      WHERE r.id = ${user.roleId}
      LIMIT 1
    `;
        if (role.length > 0 && role[0].departmentId) {
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    departmentId: role[0].departmentId,
                    unitId: role[0].unitId ?? null
                }
            });
            migrated++;
            console.log(`✓ ${user.name}`);
        }
        else {
            unmatched.push(`${user.name} | roleId: ${user.roleId}`);
        }
    }
    console.log(`\nMigrados: ${migrated}`);
    console.log(`Sem match:`);
    unmatched.forEach(u => console.log(' -', u));
}
main().catch(console.error).finally(() => prisma_1.prisma.$disconnect());
