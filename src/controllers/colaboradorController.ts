import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listarColaboradores = async (req: Request, res: Response) => {
  try {
    // Busca todos os registros no banco
    const colaboradores = await prisma.colaborador.findMany({
      orderBy: { nome: 'asc' } // Ordena alfabeticamente
    });
    
    // Devolve como JSON
    res.json(colaboradores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar colaboradores' });
  }
};