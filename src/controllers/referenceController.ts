import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Retorna a árvore completa: Depto -> Cargo -> Usuários (com Gestor)
export const getOrganizationStructure = async (req: Request, res: Response) => {
  try {
    const structure = await prisma.department.findMany({
      include: {
        roles: {
          include: {
            users: {
              include: {
                // AQUI ESTÁ O SEGREDO: Trazemos quem é o chefe desse usuário
                manager: {
                  select: { name: true, id: true } 
                }
              }
            }
          }
        }
      }
    });
    return res.json(structure);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar organograma" });
  }
};

// 2. Retorna todas as ferramentas e trata o JSON de níveis de acesso
export const getTools = async (req: Request, res: Response) => {
  try {
    const tools = await prisma.tool.findMany({
      include: { owner: true } // Traz o dono da ferramenta (Ex: Luan SI)
    });
    
    // O banco salva como String, mas o Front quer JSON. Vamos converter:
    const formattedTools = tools.map(t => ({
      ...t,
      accessLevels: t.accessLevels ? JSON.parse(t.accessLevels) : null
    }));

    return res.json(formattedTools);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar ferramentas" });
  }
};

// 3. Retorna usuários simples para o Simulador (Dropdown lá no topo)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { name: 'asc' } // Ordem alfabética para ficar bonito
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};