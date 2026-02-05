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
  const { name, acronym, description, toolGroupId, ownerId, subOwnerId, availableAccessLevels } = req.body;
  try {
    const tool = await prisma.tool.create({
      data: {
        name,
        acronym,
        description,
        toolGroupId: toolGroupId || null,
        ownerId: ownerId || null,
        subOwnerId: subOwnerId || null,
        availableAccessLevels: availableAccessLevels || []
      }
    });
    return res.json(tool);
  } catch (error) {
    console.error("❌ Erro ao criar ferramenta:", error);
    return res.status(500).json({ error: 'Erro ao criar ferramenta' });
  }
};

export const deleteTool = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Delete related accesses first
    await prisma.access.deleteMany({ where: { toolId: id } });
    await prisma.tool.delete({ where: { id } });
    return res.json({ message: 'Ferramenta removida com sucesso' });
  } catch (error) {
    console.error("❌ Erro ao remover ferramenta:", error);
    return res.status(500).json({ error: 'Erro ao remover ferramenta' });
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

// --- LEVEL MANAGEMENT ---

export const updateToolLevel = async (req: Request, res: Response) => {
  const { toolId, oldLevelName } = req.params;
  const { newLevelName, description } = req.body;

  try {
    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) return res.status(404).json({ error: 'Ferramenta não encontrada' });

    let updatedLevels = [...(tool.availableAccessLevels || [])];
    let updatedDescriptions = (tool.accessLevelDescriptions as Record<string, string>) || {};

    // 1. Rename Level (if name changed)
    if (newLevelName && newLevelName !== oldLevelName) {
      // Check if new name already exists
      if (updatedLevels.includes(newLevelName)) {
        return res.status(400).json({ error: 'Este nome de nível já existe.' });
      }

      // Update array
      updatedLevels = updatedLevels.map(l => l === oldLevelName ? newLevelName : l);

      // Update descriptions map key
      if (updatedDescriptions[oldLevelName]) {
        updatedDescriptions[newLevelName] = updatedDescriptions[oldLevelName];
        delete updatedDescriptions[oldLevelName];
      }

      // Update all Access records
      await prisma.access.updateMany({
        where: { toolId, status: oldLevelName },
        data: { status: newLevelName }
      });
    }

    // 2. Update Description
    if (description !== undefined) {
      const targetName = newLevelName || oldLevelName;
      updatedDescriptions[targetName] = description;
    }

    // Save Tool
    const updatedTool = await prisma.tool.update({
      where: { id: toolId },
      data: {
        availableAccessLevels: updatedLevels,
        accessLevelDescriptions: updatedDescriptions
      }
    });

    return res.json(updatedTool);
  } catch (error) {
    console.error("Erro ao atualizar nível:", error);
    return res.status(500).json({ error: 'Erro ao atualizar nível' });
  }
};