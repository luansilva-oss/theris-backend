import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// FUNÇÃO DE NORMALIZAÇÃO DE E-MAIL (nome.sobrenome@grupo-3c.com)
const normalizeEmail = (email: string): string => {
  const parts = email.toLowerCase().split('@')[0].split('.');
  const normalizedLocal = parts.length > 2
    ? `${parts[0]}.${parts[parts.length - 1]}`
    : parts.join('.');
  return `${normalizedLocal}@grupo-3c.com`;
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        department: true,
        unit: true,
        systemProfile: true,
        managerId: true,
        roleId: true,
        manager: {
          select: {
            name: true
          }
        }
      } as any
    });

    return res.json(users);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({ error: "Erro interno ao buscar colaboradores." });
  }
};

/** Painel do Colaborador (Viewer): lista de RoleKitItem do cargo do usuário autenticado (Meu Kit Básico). */
export const getMyTools = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado. Envie o header x-user-id.' });

  try {
    const { getToolsAndLevelsMap } = await import('../services/slackService');
    const toolsAndLevels = getToolsAndLevelsMap();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true }
    });
    if (!user?.roleId) return res.json([]);

    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
      include: { kitItems: true }
    });
    const items = role?.kitItems ?? [];
    return res.json(items.map((k: { id: string; toolName: string; toolCode: string; accessLevelDesc: string | null }) => {
      const code = k.accessLevelDesc ?? k.toolCode ?? '';
      const toolKey = (k.toolName || '').trim();
      const levelsForTool = toolKey ? (toolsAndLevels[toolKey] ?? Object.entries(toolsAndLevels).find(([key]) => key.trim().toLowerCase() === toolKey.toLowerCase())?.[1]) : undefined;
      const levelLabel = levelsForTool?.find((l: { value: string }) => l.value === code)?.label ?? code || '—';
      return {
        id: k.id,
        toolName: k.toolName,
        toolCode: k.toolCode,
        accessLevelDesc: code || '—',
        levelLabel
      };
    }));
  } catch (error) {
    console.error('Erro ao buscar Meu Kit (getMyTools):', error);
    return res.status(500).json({ error: 'Erro ao buscar suas ferramentas.' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, jobTitle, department, unit, systemProfile, managerId, roleId } = req.body;
  const rawEmail = req.body.email;
  const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
  const requesterId = req.headers['x-requester-id'] as string;

  try {
    if (!requesterId) return res.status(401).json({ error: "Identificação do solicitante ausente." });

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) return res.status(403).json({ error: "Solicitante não encontrado." });

    const isSuperAdmin = (requester as any).systemProfile === 'SUPER_ADMIN';
    const isGestor = ['GESTOR', 'ADMIN'].includes((requester as any).systemProfile);

    if (!isSuperAdmin && !isGestor) {
      return res.status(403).json({ error: "Sem permissão para editar usuários." });
    }

    if (systemProfile && !isSuperAdmin) {
      if (['SUPER_ADMIN', 'GESTOR', 'ADMIN'].includes(systemProfile)) {
        return res.status(403).json({ error: "Gestores não podem conceder perfis administrativos superiores." });
      }
    }

    const data: any = {
      name,
      email,
      jobTitle,
      department,
      unit: unit !== undefined ? unit : undefined,
      managerId,
      systemProfile: (isSuperAdmin || isGestor) ? systemProfile : undefined
    };
    if (roleId !== undefined) data.roleId = roleId || null;

    const updatedUser = await prisma.user.update({
      where: { id },
      data
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return res.status(500).json({ error: "Erro interno ao atualizar colaborador." });
  }
};

/** Marca que o usuário alterou as senhas (ciclo 90 dias). */
export const markPasswordChanged = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { lastPasswordChangeAt: new Date() },
    });
    return res.json(user);
  } catch (error) {
    console.error("Erro ao marcar troca de senha:", error);
    return res.status(500).json({ error: "Erro ao atualizar data de troca de senha." });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // 1. Desvincular de gestor
    await prisma.user.updateMany({
      where: { managerId: id },
      data: { managerId: null }
    });

    // 2. Remover acessos
    await prisma.access.deleteMany({
      where: { userId: id }
    });

    // 4. Remover de ferramentas (owner/subowner)
    await prisma.tool.updateMany({
      where: { ownerId: id },
      data: { ownerId: null }
    });
    await prisma.tool.updateMany({
      where: { subOwnerId: id },
      data: { subOwnerId: null }
    });

    // 5. Excluir usuário
    await prisma.user.delete({
      where: { id }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return res.status(500).json({ error: "Erro interno ao excluir colaborador." });
  }
};

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(departments);
  } catch (error) {
    console.error("Erro ao listar departamentos:", error);
    return res.status(500).json({ error: "Erro interno ao buscar departamentos." });
  }
};