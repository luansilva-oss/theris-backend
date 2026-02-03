import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' }, // Ordena alfabeticamente
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        department: true,
        // Traz apenas o nome do gestor para não carregar dados desnecessários
        manager: {
          select: {
            name: true
          }
        }
      }
    });

    return res.json(users);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({ error: "Erro interno ao buscar colaboradores." });
  }
};