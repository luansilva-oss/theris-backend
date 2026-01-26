import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStructure = async (req: Request, res: Response) => {
  try {
    const structure = await prisma.department.findMany({
      include: {
        roles: {
          include: {
            users: true
          }
        }
      }
    });
    res.json(structure);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar estrutura" });
  }
};

export const getTools = async (req: Request, res: Response) => {
  try {
    // CORREÇÃO: Simplificado para bater com o schema atual
    const tools = await prisma.tool.findMany({
      include: {
        owner: true,
        subOwner: true
      }
    });
    
    // Mapeando para garantir que o frontend receba o formato esperado, mesmo que null
    const formattedTools = tools.map(t => ({
      ...t,
      accessLevels: null // Mockando para evitar erro no frontend se ele esperar isso
    }));

    res.json(formattedTools);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar ferramentas" });
  }
};