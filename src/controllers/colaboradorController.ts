import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getColaboradores = async (req: Request, res: Response) => {
  try {
    // CORREÇÃO: Mudado de prisma.colaborador para prisma.user
    const users = await prisma.user.findMany({
      include: {
        role: true,
        department: true,
        manager: true,
        myDeputy: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar colaboradores" });
  }
};