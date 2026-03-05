import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { registrarMudanca } from '../lib/auditLog';

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
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        departmentId: true,
        unitId: true,
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
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

/** Perfil do usuário logado (Dashboard 'Meu perfil'): retorna usuário com manager para exibir Gestor Direto. */
export const getMe = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado. Envie o header x-user-id.' });
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        departmentId: true,
        unitId: true,
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
        systemProfile: true,
        managerId: true,
        roleId: true,
        manager: { select: { id: true, name: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil (getMe):', error);
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
};

/**
 * Inserção manual de colaborador na Gestão de Pessoas (Super Admin).
 * Body: { name, email, roleId, departmentId }.
 * Upsert por e-mail: se existir, atualiza roleId/department/jobTitle/isActive; senão, cria usuário.
 */
export const manualAddUser = async (req: Request, res: Response) => {
  const { name, email, roleId, departmentId } = req.body as { name?: string; email?: string; roleId?: string; departmentId?: string };
  const nameStr = typeof name === 'string' ? name.trim() : '';
  const emailStr = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!emailStr) return res.status(400).json({ error: 'E-mail é obrigatório.' });
  if (!roleId) return res.status(400).json({ error: 'roleId é obrigatório.' });
  if (!departmentId) return res.status(400).json({ error: 'departmentId é obrigatório.' });

  try {
    const [role, department] = await Promise.all([
      prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true, departmentId: true } }),
      prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true, name: true, unitId: true, unit: { select: { name: true } } }
      })
    ]);
    if (!role) return res.status(404).json({ error: 'Cargo não encontrado.' });
    if (!department) return res.status(404).json({ error: 'Departamento não encontrado.' });
    if (role.departmentId !== department.id) return res.status(400).json({ error: 'O cargo não pertence ao departamento informado.' });

    const unitId = department.unitId ?? null;

    const existing = await prisma.user.findUnique({ where: { email: emailStr } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(nameStr && { name: nameStr }),
          roleId: role.id,
          departmentId: department.id,
          unitId,
          jobTitle: role.name,
          isActive: true
        }
      });
      return res.status(200).json({ ...existing, roleId: role.id, department: department.name, departmentId: department.id, jobTitle: role.name, unit: department.unit?.name ?? null, unitId, isActive: true });
    }

    const created = await prisma.user.create({
      data: {
        name: nameStr || emailStr.split('@')[0],
        email: emailStr,
        roleId: role.id,
        departmentId: department.id,
        unitId,
        jobTitle: role.name,
        isActive: true
      },
      include: {
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Erro ao adicionar/vinculando colaborador (manual-add):', error);
    return res.status(500).json({ error: 'Erro ao adicionar colaborador.' });
  }
};

/** GET /api/users/:id — usuário por ID com relations (departmentRef, unitRef, role) */
export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'Colaborador não encontrado.' });
    let role: { id: string; name: string; code: string | null } | null = null;
    if (user.roleId) {
      const r = await prisma.role.findUnique({ where: { id: user.roleId }, select: { id: true, name: true, code: true } });
      if (r) role = r;
    }
    return res.json({ ...user, role });
  } catch (error) {
    console.error('Erro ao buscar colaborador:', error);
    return res.status(500).json({ error: 'Erro ao buscar colaborador.' });
  }
};

/** GET /api/users/:id/details — detalhes completos (user, kbsFerramentas, historicoCargos) */
export const getUserDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'Colaborador não encontrado.' });

    let role: { id: string; name: string; code: string | null; kitItems: { toolName: string; toolCode: string; accessLevelDesc: string | null; isCritical: boolean }[] } | null = null;
    if (user.roleId) {
      const r = await prisma.role.findUnique({
        where: { id: user.roleId },
        include: { kitItems: true }
      });
      if (r) role = r;
    }

    const { getToolsAndLevelsMap } = await import('../services/slackService');
    const toolsAndLevels = getToolsAndLevelsMap();

    const kitItemsWithCriticality = role?.kitItems ?? [];
    let kbsFerramentas: { ferramenta: string; sigla: string; nivel: string; critico: boolean; criticidade: string }[] = [];
    for (const k of kitItemsWithCriticality) {
      const code = k.accessLevelDesc ?? k.toolCode ?? '';
      const toolKey = (k.toolName || '').trim();
      const levelsForTool = toolKey ? (toolsAndLevels[toolKey] ?? Object.entries(toolsAndLevels).find(([key]) => key.trim().toLowerCase() === toolKey.toLowerCase())?.[1]) : undefined;
      const levelLabel = (levelsForTool?.find((l: { value: string }) => l.value === code)?.label ?? code) || '—';
      const criticidade = (k as { criticality?: string }).criticality?.trim() || (k.isCritical ? 'Crítico' : '—');
      kbsFerramentas.push({
        ferramenta: k.toolName || '—',
        sigla: k.toolCode || '—',
        nivel: levelLabel,
        critico: k.isCritical ?? true,
        criticidade
      });
    }

    const extraordinaryAccesses = await prisma.access.findMany({
      where: { userId: id, isExtraordinary: true },
      include: { tool: true }
    });
    const acessosExtraordinarios: { ferramenta: string; sigla: string; nivel: string; critico: boolean; criticidade: string }[] = extraordinaryAccesses.map((a) => {
      const toolName = a.tool?.name ?? '—';
      const toolKey = toolName.trim();
      const levelsForTool = toolKey ? (toolsAndLevels[toolKey] ?? Object.entries(toolsAndLevels).find(([key]) => key.trim().toLowerCase() === toolKey.toLowerCase())?.[1]) : undefined;
      const code = (a as { level?: string }).level ?? (a as { status?: string }).status ?? '';
      const levelLabel = (levelsForTool?.find((l: { value: string }) => l.value === code)?.label ?? code) || '—';
      const criticidade = (a.tool as { criticality?: string })?.criticality?.trim() ?? ((a.tool as { isCritical?: boolean })?.isCritical ? 'Crítico' : '—');
      return {
        ferramenta: toolName,
        sigla: (a.tool as { acronym?: string })?.acronym ?? a.tool?.id ?? '—',
        nivel: levelLabel,
        critico: (a.tool as { isCritical?: boolean })?.isCritical ?? false,
        criticidade: criticidade || '—'
      };
    });

    const historicoCargos = await prisma.historicoMudanca.findMany({
      where: { entidadeId: id, tipo: 'USER_KBS_CHANGE' },
      orderBy: { createdAt: 'desc' },
      include: { autor: { select: { id: true, name: true } } }
    });

    return res.json({
      user: { ...user, role },
      kbsFerramentas,
      acessosExtraordinarios,
      historicoCargos
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do colaborador:', error);
    return res.status(500).json({ error: 'Erro ao buscar detalhes.' });
  }
};

/** Painel do Colaborador (Viewer): Meu Kit Básico (role) + Acessos Extraordinários (tabela Access com isExtraordinary). */
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

    let kitTools: { id: string; toolName: string; toolCode: string; accessLevelDesc: string; levelLabel: string }[] = [];
    if (user?.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: user.roleId },
        include: { kitItems: true }
      });
      const items = role?.kitItems ?? [];
      kitTools = items.map((k: { id: string; toolName: string; toolCode: string; accessLevelDesc: string | null }) => {
        const code = k.accessLevelDesc ?? k.toolCode ?? '';
        const toolKey = (k.toolName || '').trim();
        const levelsForTool = toolKey ? (toolsAndLevels[toolKey] ?? Object.entries(toolsAndLevels).find(([key]) => key.trim().toLowerCase() === toolKey.toLowerCase())?.[1]) : undefined;
        const levelLabel = (levelsForTool?.find((l: { value: string }) => l.value === code)?.label ?? code) || '—';
        return {
          id: k.id,
          toolName: k.toolName,
          toolCode: k.toolCode,
          accessLevelDesc: code || '—',
          levelLabel
        };
      });
    }

    const extraordinaryAccesses = await prisma.access.findMany({
      where: { userId, isExtraordinary: true },
      include: { tool: true }
    });
    const extraordinaryTools = extraordinaryAccesses.map((a) => {
      const toolName = a.tool?.name ?? '—';
      const toolKey = toolName.trim();
      const levelsForTool = toolKey ? (toolsAndLevels[toolKey] ?? Object.entries(toolsAndLevels).find(([key]) => key.trim().toLowerCase() === toolKey.toLowerCase())?.[1]) : undefined;
      const code = a.status?.trim() || '—';
      const levelLabel = (levelsForTool?.find((l: { value: string }) => l.value === code)?.label ?? code) || '—';
      return {
        id: a.id,
        toolName,
        levelLabel
      };
    });

    return res.json({ kitTools, extraordinaryTools });
  } catch (error) {
    console.error('Erro ao buscar Meu Kit (getMyTools):', error);
    return res.status(500).json({ error: 'Erro ao buscar suas ferramentas.' });
  }
};

function toNullIfEmpty(v: unknown): string | null {
  if (v === '' || v === undefined || v === null) return null;
  return String(v);
}

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, jobTitle, departmentId, unitId: bodyUnitId, systemProfile, managerId, roleId, isActive } = req.body;
  const rawEmail = req.body.email;
  const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
  const requesterId = (req.headers['x-requester-id'] as string) || (req.headers['x-user-id'] as string);

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

    const oldUser = await prisma.user.findUnique({
      where: { id },
      select: {
        name: true, jobTitle: true, departmentId: true, unitId: true, roleId: true, isActive: true,
        departmentRef: { select: { name: true } },
        unitRef: { select: { name: true } }
      }
    });

    const data: Record<string, unknown> = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(departmentId !== undefined && { departmentId: toNullIfEmpty(departmentId) }),
      ...(bodyUnitId !== undefined && { unitId: toNullIfEmpty(bodyUnitId) }),
      ...(managerId !== undefined && { managerId: toNullIfEmpty(managerId) }),
      ...(roleId !== undefined && { roleId: toNullIfEmpty(roleId) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...((isSuperAdmin || isGestor) && systemProfile !== undefined && { systemProfile })
    };

    console.log('[updateUser] Updating user:', id, 'data:', JSON.stringify(data));

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      include: {
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } }
      }
    });

    // Auditoria: alteração de cargo/kit (roleId, jobTitle, departmentId, unitId)
    const kbsChanged = oldUser && (
      (roleId !== undefined && roleId !== oldUser.roleId) ||
      (jobTitle !== undefined && jobTitle !== oldUser.jobTitle) ||
      (departmentId !== undefined && departmentId !== oldUser.departmentId) ||
      (bodyUnitId !== undefined && bodyUnitId !== oldUser.unitId)
    );
    if (kbsChanged) {
      const updatedWithRelations = await prisma.user.findUnique({
        where: { id },
        select: { departmentRef: { select: { name: true } }, unitRef: { select: { name: true } } }
      });
      await registrarMudanca({
        tipo: 'USER_KBS_CHANGE',
        entidadeTipo: 'User',
        entidadeId: id,
        descricao: `Colaborador "${updatedUser.name}" teve cargo/departamento/unidade alterado.`,
        dadosAntes: { roleId: oldUser?.roleId, jobTitle: oldUser?.jobTitle, departmentId: oldUser?.departmentId, unitId: oldUser?.unitId },
        dadosDepois: { roleId: updatedUser.roleId, jobTitle: updatedUser.jobTitle, departmentId: updatedUser.departmentId, unitId: updatedUser.unitId, departmentName: updatedWithRelations?.departmentRef?.name, unitName: updatedWithRelations?.unitRef?.name },
        autorId: requesterId,
      });
      // USER_UPDATED: registro legível para auditoria (departamento, unidade, cargo)
      await registrarMudanca({
        tipo: 'USER_UPDATED',
        entidadeTipo: 'User',
        entidadeId: id,
        descricao: `Colaborador "${updatedUser.name}" atualizado.`,
        dadosAntes: {
          departamento: (oldUser as { departmentRef?: { name: string } })?.departmentRef?.name ?? null,
          unidade: (oldUser as { unitRef?: { name: string } })?.unitRef?.name ?? null,
          cargo: oldUser?.jobTitle ?? null,
        },
        dadosDepois: {
          departamento: updatedWithRelations?.departmentRef?.name ?? null,
          unidade: updatedWithRelations?.unitRef?.name ?? null,
          cargo: updatedUser.jobTitle ?? null,
        },
        autorId: requesterId,
      });
    }

    // Auditoria: ativação/desativação
    if (isActive !== undefined && oldUser && isActive !== oldUser.isActive) {
      await registrarMudanca({
        tipo: 'USER_STATUS_CHANGE',
        entidadeTipo: 'User',
        entidadeId: id,
        descricao: `Colaborador "${updatedUser.name}" ${isActive ? 'reativado' : 'desativado'}.`,
        dadosAntes: { isActive: oldUser.isActive },
        dadosDepois: { isActive: updatedUser.isActive },
        autorId: requesterId,
      });
    }

    console.log('[updateUser] Updated result:', JSON.stringify({ id: updatedUser.id, departmentId: updatedUser.departmentId, unitId: updatedUser.unitId, roleId: updatedUser.roleId }));
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