import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllTools = async (req: Request, res: Response) => {
    try {
        const tools = await prisma.tool.findMany({
            orderBy: { name: 'asc' },
            include: {
                // Traz apenas nome e email dos donos
                owner: {
                    select: { id: true, name: true, email: true }
                },
                subOwner: {
                    select: { id: true, name: true, email: true }
                },
                // Traz os acessos (quem usa a ferramenta)
                accesses: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });

        res.json(tools);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar ferramentas.' });
    }
};