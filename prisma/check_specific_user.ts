
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'luan.silva@grupo-3c.com';
    console.log(`Checking for user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (user) {
        console.log('User FOUND:', user);
    } else {
        console.log('User NOT FOUND in database.');

        // Check for similar emails
        const similar = await prisma.user.findMany({
            where: {
                email: {
                    contains: 'luan'
                }
            }
        });
        console.log('Similar users found:', similar);

        // List all users to fail-safe
        const count = await prisma.user.count();
        console.log(`Total users in DB: ${count}`);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
