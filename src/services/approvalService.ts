import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ApprovalRoute = {
    approverId: string;
    role: string; // 'OWNER', 'DEPUTY', 'SUB_OWNER', 'SI_FALLBACK'
    approverName: string;
};

export const findToolApprover = async (toolNameOrId: string): Promise<ApprovalRoute> => {
    // Tenta achar pelo ID ou pelo Nome (Ex: "ClickUp")
    const tool = await prisma.tool.findFirst({
        where: {
            OR: [
                { id: toolNameOrId },
                { name: { equals: toolNameOrId, mode: 'insensitive' } }
            ]
        },
        include: {
            owner: { include: { myDeputy: true } },
            subOwner: { include: { myDeputy: true } }
        }
    });

    if (!tool) {
        throw new Error(`Ferramenta '${toolNameOrId}' não encontrada no catálogo.`);
    }

    // 1. TENTATIVA: OWNER
    if (tool.owner) {
        // Regra do Deputy (Se Owner está ausente E tem substituto)
        if (tool.owner.isDeputyActive && tool.owner.myDeputy) {
            return {
                approverId: tool.owner.myDeputy.id,
                role: 'DEPUTY_OWNER',
                approverName: tool.owner.myDeputy.name
            };
        }
        // Owner Normal
        return {
            approverId: tool.owner.id,
            role: 'OWNER',
            approverName: tool.owner.name
        };
    }

    // 2. TENTATIVA: SUB-OWNER
    if (tool.subOwner) {
        if (tool.subOwner.isDeputyActive && tool.subOwner.myDeputy) {
            return {
                approverId: tool.subOwner.myDeputy.id,
                role: 'DEPUTY_SUB_OWNER',
                approverName: tool.subOwner.myDeputy.name
            };
        }
        return {
            approverId: tool.subOwner.id,
            role: 'SUB_OWNER',
            approverName: tool.subOwner.name
        };
    }

    // 3. FALLBACK: SEGURANÇA DA INFORMAÇÃO (Allan ou Vladimir)
    // Se a ferramenta ficar órfã, cai para o time de SI
    const securityFallback = await prisma.user.findFirst({
        where: {
            OR: [
                { name: { contains: 'Allan Von Stein', mode: 'insensitive' } },
                { name: { contains: 'Vladimir', mode: 'insensitive' } }
            ]
        }
    });

    if (securityFallback) {
        return {
            approverId: securityFallback.id,
            role: 'SI_FALLBACK',
            approverName: securityFallback.name
        };
    }

    throw new Error("Erro Crítico: Nenhum aprovador (Owner, Sub ou SI) encontrado.");
};