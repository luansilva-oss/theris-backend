import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getTools = async (req: Request, res: Response) => {
  try {
    const tools = await prisma.tool.findMany({
      // AQUI ESTÁ O SEGREDO QUE FALTAVA:
      include: {
        owner: true,           // Traz o objeto completo do Dono
        subOwner: true,        // Traz o objeto completo do Sub-Dono
        accesses: {            // Traz a lista de acessos
          include: {
            user: true         // E para cada acesso, traz o nome/email do Usuário
          }
        }
      },
      orderBy: {
        name: 'asc'            // Ordena alfabeticamente para ficar organizado
      }
    });

    return res.json(tools);
  } catch (error) {
    console.error("Erro ao buscar ferramentas:", error);
    return res.status(500).json({ error: 'Erro ao buscar ferramentas' });
  }
};