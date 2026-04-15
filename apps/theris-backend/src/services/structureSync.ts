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

        // Não criar unidade "Geral". A estrutura correta (6 unidades) vem do seed_units + seed_gestao_por_unidade.
        console.log("⚠️ Nenhuma Unit no banco. Execute seed_units e seed_gestao_por_unidade no deploy para carregar Unidade → Departamento → Cargo.");
    } catch (error) {
        console.error("❌ Error syncing structure:", error);
    }
};
