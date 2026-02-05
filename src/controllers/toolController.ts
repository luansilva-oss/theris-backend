import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- TOOLS ---

export const getTools = async (req: Request, res: Response) => {
  try {
    const tools = await prisma.tool.findMany({
      include: {
        owner: {
          include: {
            myDeputy: true
          }
        },
        subOwner: true,
        toolGroup: true, // Inclui o grupo
        accesses: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    return res.json(tools);
  } catch (error) {
    console.error("❌ Erro no getTools:", error);
    return res.status(500).json({ error: 'Erro ao buscar ferramentas' });
  }
};

export const createTool = async (req: Request, res: Response) => {
  const { name, acronym, description, toolGroupId } = req.body;
  try {
    const tool = await prisma.tool.create({
      data: {
        name,
        acronym,
        description,
        toolGroupId: toolGroupId || null,
        availableAccessLevels: []
      }
    });
    return res.json(tool);
  } catch (error) {
    console.error("❌ Erro ao criar ferramenta:", error);
    return res.status(500).json({ error: 'Erro ao criar ferramenta' });
  }
};

export const updateTool = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, acronym, description, ownerId, subOwnerId, toolGroupId, availableAccessLevels } = req.body;

  try {
    const updatedTool = await prisma.tool.update({
      where: { id },
      data: {
        name,
        acronym,
        description,
        ownerId: ownerId || null,
        subOwnerId: subOwnerId || null,
        toolGroupId: toolGroupId || null,
        availableAccessLevels: availableAccessLevels // Array de strings
      }
    });
    return res.json(updatedTool);
  } catch (error) {
    console.error("❌ Erro ao atualizar ferramenta:", error);
    return res.status(500).json({ error: 'Erro ao atualizar ferramenta' });
  }
};

// --- TOOL GROUPS ---

export const getToolGroups = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.toolGroup.findMany({ orderBy: { name: 'asc' } });
    return res.json(groups);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar grupos' });
  }
};

export const createToolGroup = async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const group = await prisma.toolGroup.create({ data: { name } });
    return res.json(group);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar grupo' });
  }
};

export const deleteToolGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.toolGroup.delete({ where: { id } });
    return res.json({ message: 'Grupo removido' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover grupo' });
  }
};

// --- ACCESS MANAGEMENT ---

export const addToolAccess = async (req: Request, res: Response) => {
  const { id } = req.params; // Tool ID
  const { userId, level } = req.body;

  try {
    // Remove access if exists to avoid duplicates/conflicts, then create new
    await prisma.access.deleteMany({
      where: { toolId: id, userId }
    });

    const access = await prisma.access.create({
      data: {
        toolId: id,
        userId,
        status: level // Usamos o campo status como o nível de acesso (ex: "Admin", "User")
      }
    });
    return res.json(access);
  } catch (error) {
    console.error("Erro ao adicionar acesso:", error);
    return res.status(500).json({ error: 'Erro ao adicionar acesso' });
  }
};

export const removeToolAccess = async (req: Request, res: Response) => {
  const { id, userId } = req.params;
  try {
    await prisma.access.deleteMany({
      where: {
        toolId: id,
        userId: userId
      }
    });
    return res.json({ message: 'Acesso removido' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover acesso' });
  }
};

export const updateToolAccess = async (req: Request, res: Response) => {
  const { toolId, userId } = req.params;
  const { isExtraordinary, duration, unit } = req.body;
  try {
    await prisma.access.updateMany({
      where: { toolId, userId },
      data: {
        isExtraordinary: isExtraordinary ?? undefined,
        duration: duration !== undefined ? (duration ? parseInt(duration) : null) : undefined,
        unit: unit ?? undefined
      } as any
    });
    return res.json({ message: 'Acesso atualizado' });
  } catch (error) {
    console.error("Erro ao atualizar acesso:", error);
    return res.status(500).json({ error: 'Erro ao atualizar acesso' });
  }
};