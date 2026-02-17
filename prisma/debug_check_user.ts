
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalizeEmail = (email: string): string => {
    if (!email) { return ''; };
    const [localPart, domain] = email.toLowerCase().split('@');
    const parts = localPart.split('.');
    const normalizedLocal = parts.length > 2
        ? `${parts[0]}.${parts[parts.length - 1]}`
        : localPart;
    return `${normalizedLocal}@grupo-3c.com`;
};

async function main() {
    const input = 'luan.silva@grupo-3c.com';

    const user = await prisma.user.findFirst({
        where: { email: input }
    });

    if (user) {
        console.log('User FOUND by findFirst');
        console.log(`DB Email: '${user.email}'`);
    } else {
        console.log('User NOT FOUND by findFirst');

        // List all
        const all = await prisma.user.findMany();
        //console.log(`Total users: ${all.length}`);
        const found = all.find(u => u.email === input);
        if (found) {
            console.log('User FOUND in memory scan! Prisma query failed?');
            console.log(`DB Email: '${found.email}'`);
        } else {
            console.log('User NOT found ANYWHERE.');
        }
    }
}

main().finally(() => prisma.$disconnect());
