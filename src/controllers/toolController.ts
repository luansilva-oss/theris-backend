import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getTools = async (req: Request, res: Response) => {
  try {
    console.log("🔍 Buscando ferramentas com detalhes completos..."); // Log para debug

    const tools = await prisma.tool.findMany({
      // O SEGREDO ESTÁ AQUI: TEM DE TER ESTE BLOCO INCLUDE
      include: {
        owner: true,           // Traz os dados do Owner
        subOwner: true,        // Traz os dados do Sub-Owner
        accesses: {            // Traz a lista de acessos
          include: {
            user: true         // Traz o nome/email do usuário do acesso
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`✅ Encontradas ${tools.length} ferramentas.`);
    return res.json(tools);
  } catch (error) {
    console.error("❌ Erro no getTools:", error);
    return res.status(500).json({ error: 'Erro ao buscar ferramentas' });
  }
};