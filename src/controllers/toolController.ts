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

    // KBS: RoleKitItem por nome da ferramenta (case-insensitive) → cargos (Roles) e colaboradores (Users)
    const kbsItems = await prisma.roleKitItem.findMany({
      where: toolNames.length > 0 ? {
        OR: toolNames.map(name => ({ toolName: { equals: name, mode: 'insensitive' } }))
      } : undefined,
      include: { role: { include: { department: true } } }
    });
    const roleIds = [...new Set(kbsItems.map(k => k.roleId))];
    const usersWithRole = roleIds.length > 0
      ? await prisma.user.findMany({
          where: { roleId: { in: roleIds }, isActive: true },
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
      const kbsForTool = kbsItems.filter(k => (k.toolName || '').trim().toLowerCase() === nameLower);
      const levelToUsers: Record<string, { id: string; name: string; email: string }[]> = {};
      const kbsByRole: { roleId: string; roleName: string; departmentName: string; accessLevelDesc: string; userCount: number; users: { id: string; name: string; email: string }[] }[] = [];
      for (const k of kbsForTool) {
        const users = usersWithRole.filter(u => u.roleId === k.roleId).map(u => ({ id: u.id, name: u.name, email: u.email }));
        const level = k.accessLevelDesc || 'N/A';
        if (!levelToUsers[level]) levelToUsers[level] = [];
        levelToUsers[level].push(...users);
        const role = k.role as { id: string; name: string; department?: { name: string } | null };
        kbsByRole.push({
          roleId: role.id,
          roleName: role.name,
          departmentName: role.department?.name ?? '—',
          accessLevelDesc: level,
          userCount: users.length,
          users: users.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)
        });
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
        kbsByRole,
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
        status: level, // Usamos o campo status como o nível de acesso (ex: "Admin", "User")
        ...(level && { level })
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
  const { isExtraordinary, duration, unit, level } = req.body;
  try {
    await prisma.access.updateMany({
      where: { toolId, userId },
      data: {
        isExtraordinary: isExtraordinary ?? undefined,
        duration: duration !== undefined ? (duration ? parseInt(duration) : null) : undefined,
        unit: unit ?? undefined,
        ...(level !== undefined && { level: level || null })
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

    // Deep clone so Prisma detects change (avoid same reference)
    let updatedLevels = [...(tool.availableAccessLevels || [])];
    const rawDescriptions = (tool.accessLevelDescriptions as Record<string, any>) || {};
    let updatedDescriptions: Record<string, any> = {};
    for (const k of Object.keys(rawDescriptions)) {
      const v = rawDescriptions[k];
      updatedDescriptions[k] = typeof v === 'object' && v !== null ? { ...v } : v;
    }

    // 1. Rename Level (if name changed)
    if (newLevelName && String(newLevelName).trim() !== String(oldLevelName).trim()) {
      const newName = String(newLevelName).trim();
      const oldName = String(oldLevelName).trim();
      if (updatedLevels.includes(newName)) {
        return res.status(400).json({ error: 'Este nome de nível já existe.' });
      }
      updatedLevels = updatedLevels.map(l => (l === oldName ? newName : l));
      if (updatedDescriptions[oldName] !== undefined) {
        updatedDescriptions[newName] = updatedDescriptions[oldName];
        delete updatedDescriptions[oldName];
      }
      await prisma.access.updateMany({
        where: { toolId, status: oldName },
        data: { status: newName }
      });
    }

    // 2. Update Description & Icon
    const targetName = (newLevelName && String(newLevelName).trim()) || String(oldLevelName).trim();
    if (description !== undefined || icon !== undefined) {
      const currentData = updatedDescriptions[targetName];
      const baseData = typeof currentData === 'string'
        ? { description: currentData }
        : (typeof currentData === 'object' && currentData !== null ? { ...currentData } : {});
      updatedDescriptions[targetName] = {
        ...baseData,
        ...(description !== undefined ? { description: description } : {}),
        ...(icon !== undefined ? { icon: icon } : {})
      };
    }

    // Persist: pass new object so Prisma serializes and saves
    const updatedTool = await prisma.tool.update({
      where: { id: toolId },
      data: {
        availableAccessLevels: updatedLevels,
        accessLevelDescriptions: { ...updatedDescriptions }
      },
      select: {
        id: true,
        name: true,
        acronym: true,
        availableAccessLevels: true,
        accessLevelDescriptions: true,
        description: true,
        ownerId: true,
        subOwnerId: true,
        toolGroupId: true,
        criticality: true,
        isCritical: true,
        lastReviewAt: true,
        nextReviewAt: true,
        createdAt: true
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