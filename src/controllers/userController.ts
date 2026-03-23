import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { registrarMudanca } from '../lib/auditLog';
import { hasProfile } from '../middleware/auth';

const prisma = new PrismaClient();

/** Campos de User permitidos em respostas da API (nunca retornar mfaCode, mfaExpiresAt, etc.) */
const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  jobTitle: true,
  departmentId: true,
  unitId: true,
  roleId: true,
  managerId: true,
  systemProfile: true,
  isActive: true,
  lastPasswordChangeAt: true,
  myDeputyId: true,
} as const;

// FUNÇÃO DE NORMALIZAÇÃO DE E-MAIL (nome.sobrenome@grupo-3c.com)
const normalizeEmail = (email: string): string => {
  const parts = email.toLowerCase().split('@')[0].split('.');
  const normalizedLocal = parts.length > 2
    ? `${parts[0]}.${parts[parts.length - 1]}`
    : parts.join('.');
  return `${normalizedLocal}@grupo-3c.com`;
};

/** Busca por nome (contains, case insensitive), apenas ativos, máx. 8 — autocomplete (ex.: atribuir executor em chamado Infra). */
export const searchUsersForAutocomplete = async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json([]);
  const departmentId = String(req.query.departmentId ?? '').trim();
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
        ...(departmentId ? { departmentId } : {}),
      },
      take: 8,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, jobTitle: true, email: true },
    });
    return res.json(users);
  } catch (error) {
    console.error('searchUsersForAutocomplete:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  if (!hasProfile(req, ['ADMIN', 'SUPER_ADMIN'])) {
    return res.status(403).json({ error: 'Apenas ADMIN ou SUPER_ADMIN podem listar usuários.' });
  }
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        ...USER_SAFE_SELECT,
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
        manager: { select: { name: true } },
      },
    });

    return res.json(users);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({ error: "Erro interno ao buscar colaboradores." });
  }
};

/** Perfil do usuário logado (Dashboard 'Meu perfil'): retorna usuário com manager, role (KBS code), etc. */
export const getMe = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado. Envie o header x-user-id.' });
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_SAFE_SELECT,
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    let role: { id: string; name: string; code: string | null } | null = null;
    if (user.roleId) {
      const r = await prisma.role.findUnique({ where: { id: user.roleId }, select: { id: true, name: true, code: true } });
      if (r) role = r;
    }
    return res.json({ ...user, role });
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

    const existing = await prisma.user.findUnique({
      where: { email: emailStr },
      select: { ...USER_SAFE_SELECT, departmentRef: { select: { id: true, name: true } }, unitRef: { select: { id: true, name: true } } },
    });
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

    const adminId = (req.headers['x-user-id'] as string)?.trim();
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
      select: {
        ...USER_SAFE_SELECT,
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
      },
    });
    await registrarMudanca({
      tipo: 'USER_CREATED',
      entidadeTipo: 'User',
      entidadeId: created.id,
      descricao: `Colaborador ${created.name} cadastrado`,
      dadosDepois: {
        nome: created.name,
        email: created.email,
        cargo: created.jobTitle,
        departamento: created.departmentId,
        perfil: (created as any).systemProfile ?? 'VIEWER',
      },
      autorId: adminId ?? undefined,
    }).catch(() => {});
    return res.status(201).json(created);
  } catch (error) {
    console.error('Erro ao adicionar/vinculando colaborador (manual-add):', error);
    return res.status(500).json({ error: 'Erro ao adicionar colaborador.' });
  }
};

/** GET /api/users/:id — usuário por ID (próprio usuário, ADMIN ou SUPER_ADMIN); nunca retorna mfaCode, mfaExpiresAt */
export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUser = (req as Request & { authUser?: { id: string; systemProfile: string } }).authUser;
  const isSelf = authUser && authUser.id === id;
  const isAdminOrSuper = hasProfile(req, ['ADMIN', 'SUPER_ADMIN']);
  if (!isSelf && !isAdminOrSuper) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o próprio usuário, ADMIN ou SUPER_ADMIN.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SAFE_SELECT,
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
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

/** GET /api/users/:id/details — detalhes completos (próprio usuário, ADMIN ou SUPER_ADMIN); nunca retorna mfaCode, mfaExpiresAt */
export const getUserDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUser = (req as Request & { authUser?: { id: string; systemProfile: string } }).authUser;
  const isSelf = authUser && authUser.id === id;
  const isAdminOrSuper = hasProfile(req, ['ADMIN', 'SUPER_ADMIN']);
  if (!isSelf && !isAdminOrSuper) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o próprio usuário, ADMIN ou SUPER_ADMIN.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SAFE_SELECT,
        departmentRef: { select: { id: true, name: true } },
        unitRef: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Colaborador não encontrado.' });

    let role: { id: string; name: string; code: string | null; kitItems: { toolName: string; toolCode: string; accessLevelDesc: string | null; isCritical: boolean }[] } | null = null;
    if (user.roleId) {
      const r = await prisma.role.findUnique({
        where: { id: user.roleId },
        include: { kitItems: true }
      });
      if (r) {
        const code = r.code || null;
        const singleCode = code && code.includes(' e ') ? code.split(/\s+e\s+/)[0]?.trim() || code : code;
        role = { ...r, code: singleCode };
      }
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

    let kitTools: { id: string; toolName: string; toolCode: string; accessLevelDesc: string; levelLabel: string; criticality?: string }[] = [];
    if (user?.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: user.roleId },
        include: { kitItems: true }
      });
      const items = role?.kitItems ?? [];
      kitTools = items.map((k: { id: string; toolName: string; toolCode: string; accessLevelDesc: string | null; criticality?: string | null; isCritical?: boolean }) => {
        const code = k.accessLevelDesc ?? k.toolCode ?? '';
        const toolKey = (k.toolName || '').trim();
        const levelsForTool = toolKey ? (toolsAndLevels[toolKey] ?? Object.entries(toolsAndLevels).find(([key]) => key.trim().toLowerCase() === toolKey.toLowerCase())?.[1]) : undefined;
        const levelLabel = (levelsForTool?.find((l: { value: string }) => l.value === code)?.label ?? code) || '—';
        const criticality = k.criticality?.trim() || (k.isCritical ? 'Crítico' : undefined);
        return {
          id: k.id,
          toolName: k.toolName,
          toolCode: k.toolCode,
          accessLevelDesc: code || '—',
          levelLabel,
          criticality
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

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { systemProfile: true }
    });
    if (!requester) return res.status(403).json({ error: "Solicitante não encontrado." });

    const isSuperAdmin = requester.systemProfile === 'SUPER_ADMIN';
    const isGestor = ['GESTOR', 'ADMIN'].includes(requester.systemProfile);

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
        name: true, jobTitle: true, departmentId: true, unitId: true, roleId: true, isActive: true, managerId: true, systemProfile: true,
        departmentRef: { select: { name: true } },
        unitRef: { select: { name: true } },
        manager: { select: { name: true } },
      }
    });

    const newDeptId = departmentId !== undefined ? toNullIfEmpty(departmentId) : oldUser?.departmentId;
    const deptChanged = newDeptId && newDeptId !== oldUser?.departmentId;
    let resolvedManagerId: string | null | undefined = managerId !== undefined ? toNullIfEmpty(managerId) : undefined;
    if (managerId === undefined && deptChanged && newDeptId) {
      let lider = await prisma.user.findFirst({
        where: { departmentId: newDeptId, isActive: true, jobTitle: { contains: 'Líder', mode: 'insensitive' } },
        select: { id: true }
      });
      if (!lider) {
        const rolesInDept = await prisma.role.findMany({
          where: { departmentId: newDeptId, code: { not: null } },
          select: { id: true, code: true }
        });
        const roleKbs1 = rolesInDept.find(r => r.code && /^KBS-[A-Z]{2}-1$/i.test(r.code));
        if (roleKbs1) {
          lider = await prisma.user.findFirst({
            where: { roleId: roleKbs1.id, departmentId: newDeptId, isActive: true },
            select: { id: true }
          });
        }
      }
      if (lider) resolvedManagerId = lider.id;
    }

    const data: Record<string, unknown> = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(departmentId !== undefined && { departmentId: toNullIfEmpty(departmentId) }),
      ...(bodyUnitId !== undefined && { unitId: toNullIfEmpty(bodyUnitId) }),
      ...(resolvedManagerId !== undefined && { managerId: resolvedManagerId }),
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
      if (isActive === true && oldUser.isActive === false) {
        await registrarMudanca({
          tipo: 'USER_ACTIVATED',
          entidadeTipo: 'User',
          entidadeId: id,
          descricao: `Colaborador ${updatedUser.name} reativado`,
          dadosAntes: { isActive: false },
          dadosDepois: { isActive: true },
          autorId: requesterId,
        }).catch(() => {});
      }
    }

    // Auditoria: perfil de sistema alterado
    if (systemProfile !== undefined && oldUser && oldUser.systemProfile !== undefined && systemProfile !== oldUser.systemProfile) {
      await registrarMudanca({
        tipo: 'USER_ROLE_CHANGED',
        entidadeTipo: 'User',
        entidadeId: id,
        descricao: 'Perfil de sistema alterado',
        dadosAntes: { systemProfile: oldUser.systemProfile },
        dadosDepois: { systemProfile: updatedUser.systemProfile },
        autorId: requesterId,
      }).catch(() => {});
    }

    // Auditoria: gestor direto alterado
    if (resolvedManagerId !== undefined && oldUser && resolvedManagerId !== oldUser.managerId) {
      const newManager = updatedUser.managerId ? await prisma.user.findUnique({ where: { id: updatedUser.managerId }, select: { name: true } }) : null;
      await registrarMudanca({
        tipo: 'USER_MANAGER_CHANGED',
        entidadeTipo: 'User',
        entidadeId: id,
        descricao: 'Gestor direto alterado',
        dadosAntes: { managerId: oldUser.managerId, gestorNome: oldUser.manager?.name ?? null },
        dadosDepois: { managerId: updatedUser.managerId, gestorNome: newManager?.name ?? null },
        autorId: requesterId,
      }).catch(() => {});
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