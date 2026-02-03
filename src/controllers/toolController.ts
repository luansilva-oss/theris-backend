import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllTools = async (req: Request, res: Response) => {
    try {
        const tools = await prisma.tool.findMany({
            orderBy: { name: 'asc' },
            include: {
                // Traz os dados do Owner
                owner: {
                    select: { id: true, name: true, email: true }
                },
                // Traz os dados do Sub-Owner
                subOwner: {
                    select: { id: true, name: true, email: true }
                },
                // --- O SEGREDO ESTÁ AQUI 👇 ---
                // Antes isso não existia, por isso a lista vinha vazia.
                accesses: {
                    select: {
                        status: true, // O "Nível" (Ex: Full FA-1)
                        user: {
                            select: { id: true, name: true, email: true, department: { select: { name: true } } }
                        }
                    }
                }
            }
        });

        return res.json(tools);
    } catch (error) {
        console.error('Erro ao buscar ferramentas:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar ferramentas' });
    }
};