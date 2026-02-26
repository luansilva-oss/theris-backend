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
        toolGroup: true,
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

    const toolNames = tools.map(t => t.name);
    if (toolNames.length === 0) return res.json(tools);

    // KBS: RoleKitItem por nome da ferramenta (case-insensitive) → usuários do cargo agrupados por nível
    const kbsItems = await prisma.roleKitItem.findMany({
      where: toolNames.length > 0 ? {
        OR: toolNames.map(name => ({ toolName: { equals: name, mode: 'insensitive' } }))
      } : undefined,
      include: { role: true }
    });
    const roleIds = [...new Set(kbsItems.map(k => k.roleId))];
    const usersWithRole = roleIds.length > 0
      ? await prisma.user.findMany({
          where: { roleId: { in: roleIds } },
          select: { id: true, name: true, email: true, roleId: true }
        })
      : [];
    // Aprovações extraordinárias: Request ACCESS_TOOL_EXTRA, APROVADO, details.tool = nome da ferramenta
    const extraRequests = await prisma.request.findMany({
      where: {
        type: 'ACCESS_TOOL_EXTRA',
        status: 'APROVADO'
      },
      include: { requester: true },
      orderBy: { updatedAt: 'desc' }
    });

    const toolsWithSync = tools.map(tool => {
      const nameLower = tool.name.trim().toLowerCase();
      const kbsForTool = kbsItems.filter(k => k.toolName.trim().toLowerCase() === nameLower);
      const levelToUsers: Record<string, { id: string; name: string; email: string }[]> = {};
      for (const k of kbsForTool) {
        const users = usersWithRole.filter(u => u.roleId === k.roleId).map(u => ({ id: u.id, name: u.name, email: u.email }));
        const level = k.accessLevelDesc || 'N/A';
        if (!levelToUsers[level]) levelToUsers[level] = [];
        levelToUsers[level].push(...users);
      }
      const kbsMembersByLevel = Object.entries(levelToUsers).map(([level, users]) => ({
        level,
        users: users.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)
      }));

      let detailsParsed: { tool?: string } = {};
      const extraordinaryApprovals = extraRequests
        .filter(r => {
          try {
            detailsParsed = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details as object) || {};
          } catch {
            detailsParsed = {};
          }
          const reqTool = (detailsParsed.tool ?? '').trim().toLowerCase();
          return reqTool === nameLower;
        })
        .map(r => {
          let d: { tool?: string; target?: string; targetValue?: string } = {};
          try {
            d = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details as object) || {};
          } catch {}
          return {
            id: r.id,
            requesterName: r.requester?.name ?? '—',
            requesterEmail: r.requester?.email,
            level: d.target ?? d.targetValue ?? '—',
            approvedAt: r.updatedAt,
            justification: r.justification ?? r.adminNote ?? null
          };
        });

      return {
        ...tool,
        kbsMembersByLevel,
        extraordinaryApprovals
      };
    });

    return res.json(toolsWithSync);
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
  const body = req.body as Record<string, any>;

  try {
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.acronym !== undefined) data.acronym = body.acronym;
    if (body.description !== undefined) data.description = body.description;
    if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
    if (body.subOwnerId !== undefined) data.subOwnerId = body.subOwnerId || null;
    if (body.toolGroupId !== undefined) data.toolGroupId = body.toolGroupId || null;
    if (body.availableAccessLevels !== undefined) data.availableAccessLevels = body.availableAccessLevels;

    const updatedTool = await prisma.tool.update({
      where: { id },
      data
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
  const { newLevelName, description, icon } = req.body;

  try {
    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) return res.status(404).json({ error: 'Ferramenta não encontrada' });

    let updatedLevels = [...(tool.availableAccessLevels || [])];
    let updatedDescriptions = (tool.accessLevelDescriptions as Record<string, any>) || {};

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

    // 2. Update Description & Icon
    const targetName = newLevelName || oldLevelName;
    if (description !== undefined || icon !== undefined) {
      const currentData = updatedDescriptions[targetName];

      // Handle backward compatibility (string vs object)
      const baseData = typeof currentData === 'string'
        ? { description: currentData }
        : (currentData || {});

      updatedDescriptions[targetName] = {
        ...baseData,
        ...(description !== undefined ? { description } : {}),
        ...(icon !== undefined ? { icon } : {})
      };
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

export const deleteToolLevel = async (req: Request, res: Response) => {
  const { toolId, levelName } = req.params;

  try {
    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) return res.status(404).json({ error: 'Ferramenta não encontrada' });

    // 1. Remove from availableAccessLevels
    const updatedLevels = (tool.availableAccessLevels || []).filter(l => l !== levelName);

    // 2. Remove from accessLevelDescriptions
    const updatedDescriptions = (tool.accessLevelDescriptions as Record<string, any>) || {};
    delete updatedDescriptions[levelName];

    // 3. Remove/Update associated Access records (Optional: could block if users exist)
    // For now, we will just remove the access records for this level
    await prisma.access.deleteMany({
      where: { toolId, status: levelName }
    });

    const updatedTool = await prisma.tool.update({
      where: { id: toolId },
      data: {
        availableAccessLevels: updatedLevels,
        accessLevelDescriptions: updatedDescriptions
      }
    });

    return res.json(updatedTool);
  } catch (error) {
    console.error("Erro ao excluir nível:", error);
    return res.status(500).json({ error: 'Erro ao excluir nível' });
  }
};