import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { registrarMudanca } from '../lib/auditLog';
import { hasProfile } from '../middleware/auth';
import { propagateLeaderToRole } from '../services/leadershipPropagationService';

const prisma = new PrismaClient();

function getAutorId(req: Request): string | undefined {
    return (req.headers['x-user-id'] as string)?.trim() || undefined;
}

/** Mapeamento departamento -> prefixo KBS (ex: KBS-BO-1) para atualizar code ao mudar departamento */
const DEPT_KBS_PREFIX: Record<string, string> = {
    'Board': 'BO', 'Tecnologia e Segurança (SI)': 'SI', 'Administrativo': 'AD',
    'Comercial Contact': 'CO', 'Expansão': 'CO', 'Comercial': 'CO',
    'Marketing': 'MK', 'Parcerias': 'MK',
    'Atendimento ao Cliente': 'AT', 'Professional Service': 'AT',
    'Operações': 'OP', 'Pessoas e Performance': 'PC', 'Produto 3C+': 'PD',
    'RevOps': 'RA', 'Instituto 3C': 'IN', 'Evolux': 'PD', 'Dizify': 'PD',
    'Produto FiqOn': 'PD', 'Produto Dizparos': 'PD',
};

function getKbsPrefixForDepartment(deptName: string): string | null {
    return DEPT_KBS_PREFIX[deptName] ?? null;
}

// --- UNIT CRUD ---

export const createUnit = async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Nome da unidade é obrigatório." });
    try {
        const unit = await prisma.unit.create({ data: { name: String(name).trim() } });
        await registrarMudanca({
            tipo: 'UNIT_CREATED',
            entidadeTipo: 'Unit',
            entidadeId: unit.id,
            descricao: `Unidade "${unit.name}" criada`,
            dadosDepois: { nome: unit.name },
            autorId: getAutorId(req),
        }).catch(() => {});
        return res.status(201).json(unit);
    } catch (error: any) {
        if (error?.code === 'P2002') return res.status(409).json({ error: "Já existe uma unidade com esse nome." });
        return res.status(500).json({ error: "Erro ao criar unidade." });
    }
};

export const updateUnit = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Nome da unidade é obrigatório." });
    try {
        const oldUnit = await prisma.unit.findUnique({ where: { id } });
        if (!oldUnit) return res.status(404).json({ error: "Unidade não encontrada." });
        const unit = await prisma.unit.update({ where: { id }, data: { name: String(name).trim() } });
        await registrarMudanca({
            tipo: 'UNIT_UPDATED',
            entidadeTipo: 'Unit',
            entidadeId: id,
            descricao: `Unidade "${unit.name}" atualizada`,
            dadosAntes: { nome: oldUnit.name },
            dadosDepois: { nome: unit.name },
            autorId: getAutorId(req),
        }).catch(() => {});
        return res.json(unit);
    } catch (error: any) {
        if (error?.code === 'P2025') return res.status(404).json({ error: "Unidade não encontrada." });
        if (error?.code === 'P2002') return res.status(409).json({ error: "Já existe uma unidade com esse nome." });
        return res.status(500).json({ error: "Erro ao atualizar unidade." });
    }
};

/** DELETE Unit: só permite se não tiver departamentos. Caso contrário retorna 409 com lista de departamentos para migração. */
export const deleteUnit = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const unit = await prisma.unit.findUnique({
            where: { id },
            include: {
                departments: {
                    include: {
                        _count: { select: { roles: true } }
                    }
                }
            }
        });
        if (!unit) return res.status(404).json({ error: "Unidade não encontrada." });
        if (unit.departments.length === 0) {
            await registrarMudanca({
                tipo: 'UNIT_DELETED',
                entidadeTipo: 'Unit',
                entidadeId: id,
                descricao: `Unidade "${unit.name}" excluída`,
                dadosAntes: { nome: unit.name },
                autorId: getAutorId(req),
            }).catch(() => {});
            await prisma.unit.delete({ where: { id } });
            return res.json({ success: true });
        }
        return res.status(409).json({
            code: "UNIT_HAS_DEPENDENCIES",
            message: "A unidade possui departamentos vinculados. Use o assistente de migração para movê-los ou excluí-los antes de excluir a unidade.",
            unit: { id: unit.id, name: unit.name },
            departments: unit.departments.map(d => ({
                id: d.id,
                name: d.name,
                rolesCount: d._count?.roles ?? 0
            }))
        });
    } catch (error) {
        console.error("Erro ao excluir unidade:", error);
        return res.status(500).json({ error: "Erro ao excluir unidade." });
    }
};

/** Payload: { decisions: [{ departmentId, action: "migrate_department"|"delete_department", targetUnitId?, targetDepartmentId? }] }
 *  - migrate_department: move o departamento para outra unidade (department.unitId = targetUnitId). Cargos e KBS permanecem.
 *  - delete_department: move todos os cargos do departamento para targetDepartmentId, depois exclui o departamento. RoleKitItems permanecem nos cargos.
 */
export const migrateAndDeleteUnit = async (req: Request, res: Response) => {
    const { id: unitId } = req.params;
    const { decisions } = req.body as { decisions: { departmentId: string; action: string; targetUnitId?: string; targetDepartmentId?: string }[] };
    if (!Array.isArray(decisions) || decisions.length === 0) return res.status(400).json({ error: "Payload deve conter 'decisions' (array) com as escolhas de migração." });

    try {
        const unit = await prisma.unit.findUnique({
            where: { id: unitId },
            include: { departments: { include: { roles: true } } }
        });
        if (!unit) return res.status(404).json({ error: "Unidade não encontrada." });

        const deptIds = new Set(unit.departments.map(d => d.id));
        const decisionDeptIds = new Set(decisions.map((d: any) => d.departmentId));
        if (deptIds.size !== decisionDeptIds.size || [...deptIds].some(id => !decisionDeptIds.has(id))) {
            return res.status(400).json({ error: "Cada departamento da unidade deve ter exatamente uma decisão (migrate_department ou delete_department)." });
        }

        for (const dec of decisions) {
            if (dec.action === "migrate_department") {
                if (!dec.targetUnitId) return res.status(400).json({ error: `Departamento ${dec.departmentId}: targetUnitId é obrigatório para migrate_department.` });
                const targetUnit = await prisma.unit.findUnique({ where: { id: dec.targetUnitId } });
                if (!targetUnit || targetUnit.id === unitId) return res.status(400).json({ error: "Unidade de destino inválida ou igual à unidade a ser excluída." });
            } else if (dec.action === "delete_department") {
                if (!dec.targetDepartmentId) return res.status(400).json({ error: `Departamento ${dec.departmentId}: targetDepartmentId é obrigatório para delete_department.` });
                if (dec.targetDepartmentId === dec.departmentId) return res.status(400).json({ error: "Departamento de destino não pode ser o mesmo que está sendo excluído." });
                const targetDept = await prisma.department.findUnique({ where: { id: dec.targetDepartmentId } });
                if (!targetDept) return res.status(400).json({ error: "Departamento de destino não encontrado." });
            } else {
                return res.status(400).json({ error: `Ação inválida: ${dec.action}. Use migrate_department ou delete_department.` });
            }
        }

        await prisma.$transaction(async (tx) => {
            for (const dec of decisions) {
                if (dec.action === "migrate_department" && dec.targetUnitId) {
                    await tx.department.update({
                        where: { id: dec.departmentId },
                        data: { unitId: dec.targetUnitId }
                    });
                    await tx.user.updateMany({
                        where: { departmentId: dec.departmentId },
                        data: { unitId: dec.targetUnitId }
                    });
                } else if (dec.action === "delete_department" && dec.targetDepartmentId) {
                    const srcDept = await tx.department.findUnique({ where: { id: dec.departmentId }, include: { unit: true } });
                    const tgtDept = await tx.department.findUnique({ where: { id: dec.targetDepartmentId }, include: { unit: true } });
                    if (srcDept && tgtDept) {
                        // Mover cargos
                        await tx.role.updateMany({
                            where: { departmentId: dec.departmentId },
                            data: { departmentId: dec.targetDepartmentId }
                        });
                        // Atualizar usuários (departmentId/unitId)
                        await tx.user.updateMany({
                            where: { departmentId: dec.departmentId },
                            data: { departmentId: dec.targetDepartmentId, unitId: tgtDept.unitId ?? null }
                        });
                    }
                    await tx.department.delete({ where: { id: dec.departmentId } });
                }
            }
            await tx.unit.delete({ where: { id: unitId } });
        });

        return res.json({ success: true });
    } catch (error) {
        console.error("Erro na migração/exclusão da unidade:", error);
        return res.status(500).json({ error: "Erro ao executar migração e excluir unidade." });
    }
};

// GET /api/structure — estrutura completa Unit -> Department -> Role -> kitItems (apenas ADMIN e SUPER_ADMIN)
export const getStructure = async (req: Request, res: Response) => {
    const authUser = (req as Request & { authUser?: { id: string; systemProfile: string } }).authUser;
    const allowed = authUser && ['ADMIN', 'SUPER_ADMIN'].includes(authUser.systemProfile);
    if (!allowed) {
        return res.status(403).json({ error: 'Acesso negado. Apenas ADMIN ou SUPER_ADMIN podem acessar a estrutura.' });
    }
    try {
        const data = await prisma.unit.findMany({
            orderBy: { name: 'asc' },
            include: {
                departments: {
                    orderBy: { name: 'asc' },
                    include: {
                        roles: {
                            orderBy: { name: 'asc' },
                            include: {
                                kitItems: true,
                                leader: { select: { id: true, name: true, email: true } },
                            },
                        }
                    }
                }
            }
        });
        return res.json({ units: data ?? [] });
    } catch (error) {
        console.error("Erro ao buscar estrutura:", error);
        return res.status(500).json({ error: "Erro interno ao buscar estrutura." });
    }
};

// --- DEPARTMENT CRUD ---

export const createDepartment = async (req: Request, res: Response) => {
    const { name, unitId } = req.body;
    if (!unitId) return res.status(400).json({ error: "unitId é obrigatório." });
    try {
        const dept = await prisma.department.create({ data: { name, unitId } });
        await registrarMudanca({
            tipo: 'DEPARTMENT_CREATED',
            entidadeTipo: 'Department',
            entidadeId: dept.id,
            descricao: `Departamento "${dept.name}" criado`,
            dadosDepois: { nome: dept.name, unitId: dept.unitId },
            autorId: getAutorId(req),
        }).catch(() => {});
        return res.json(dept);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao criar departamento." });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, unitId } = req.body;
    try {
        const oldDept = await prisma.department.findUnique({ where: { id } });
        if (!oldDept) return res.status(404).json({ error: "Departamento não encontrado." });

        const data: { name?: string; unitId?: string } = {};
        if (name !== undefined) data.name = name;
        if (unitId !== undefined) data.unitId = unitId;
        const dept = await prisma.department.update({ where: { id }, data });
        await registrarMudanca({
            tipo: 'DEPARTMENT_UPDATED',
            entidadeTipo: 'Department',
            entidadeId: id,
            descricao: `Departamento "${dept.name}" atualizado`,
            dadosAntes: { nome: oldDept.name, unitId: oldDept.unitId },
            dadosDepois: { nome: dept.name, unitId: dept.unitId },
            autorId: getAutorId(req),
        }).catch(() => {});

        // Com FK, users.departmentId já aponta para este departamento; renomear dept não exige update em User
        return res.json(dept);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar departamento." });
    }
};

/** GET /api/structure/departments/:id/user-count — contagem em tempo real (evita cache stale) */
export const getDepartmentUserCount = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const dept = await prisma.department.findUnique({ where: { id } });
        if (!dept) return res.status(404).json({ error: "Departamento não encontrado." });
        const count = await prisma.user.count({ where: { departmentId: id } });
        return res.json({ count });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao contar usuários." });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { redirectToDepartmentId } = req.body; // Alvo para mover usuários

    try {
        const deptToDelete = await prisma.department.findUnique({ where: { id } });
        if (!deptToDelete) return res.status(404).json({ error: "Departamento não encontrado." });

        // 1. Redirecionar usuários se houver alvo
        if (redirectToDepartmentId) {
            const targetDept = await prisma.department.findUnique({ where: { id: redirectToDepartmentId } });
            if (!targetDept) return res.status(400).json({ error: "Departamento de destino não encontrado." });

            await prisma.user.updateMany({
                where: { departmentId: id },
                data: { departmentId: redirectToDepartmentId, unitId: targetDept.unitId ?? null }
            });
        } else {
            // Se não houver redirecionamento, verificar se o departamento está vazio
            const userCount = await prisma.user.count({ where: { departmentId: id } });
            if (userCount > 0) {
                return res.status(400).json({
                    error: `O departamento possui ${userCount} usuários. Selecione um destino para movê-los.`
                });
            }
        }

        // 2. Limpar cargos (roles) vinculados
        await prisma.role.deleteMany({ where: { departmentId: id } });

        await registrarMudanca({
            tipo: 'DEPARTMENT_DELETED',
            entidadeTipo: 'Department',
            entidadeId: id,
            descricao: `Departamento "${deptToDelete.name}" excluído`,
            dadosAntes: { nome: deptToDelete.name },
            autorId: getAutorId(req),
        }).catch(() => {});

        // 3. Excluir o departamento
        await prisma.department.delete({ where: { id } });

        return res.json({ success: true });
    } catch (error) {
        console.error("Erro ao excluir departamento:", error);
        return res.status(500).json({ error: "Erro ao excluir departamento." });
    }
};

// --- ROLE (CARGO) CRUD ---

export const createRole = async (req: Request, res: Response) => {
    const { name, departmentId, code, kitItems } = req.body as {
        name: string;
        departmentId: string;
        code?: string | null;
        kitItems?: { toolCode: string; toolName: string; accessLevelDesc?: string | null; criticality?: string | null; isCritical?: boolean }[];
    };
    if (!name || !departmentId) {
        return res.status(400).json({ error: "Nome e departmentId são obrigatórios." });
    }
    try {
        const role = await prisma.role.create({
            data: { name, departmentId, code: code || null }
        });
        if (Array.isArray(kitItems) && kitItems.length > 0) {
            await prisma.roleKitItem.createMany({
                data: kitItems.map((it: any) => ({
                    roleId: role.id,
                    toolCode: it.toolCode || '',
                    toolName: it.toolName || '',
                    accessLevelDesc: it.accessLevelDesc ?? null,
                    criticality: it.criticality ?? null,
                    isCritical: it.isCritical !== false
                }))
            });
        }
        const created = await prisma.role.findUnique({
            where: { id: role.id },
            include: {
                kitItems: true,
                department: { include: { unit: true } },
                leader: { select: { id: true, name: true, email: true } },
            },
        });
        if (created) {
            await registrarMudanca({
                tipo: 'ROLE_CREATED',
                entidadeTipo: 'Role',
                entidadeId: created.id,
                descricao: `Cargo "${created.name}" criado no departamento "${created.department?.name ?? '—'}"${created.code ? ` (${created.code})` : ''}.`,
                dadosDepois: {
                    name: created.name,
                    code: created.code,
                    departmentId: created.departmentId,
                    departmentName: created.department?.name,
                    unit: created.department?.unit?.name,
                },
                autorId: getAutorId(req),
            });
        }
        return res.json(created);
    } catch (error) {
        console.error("Erro ao criar cargo:", error);
        return res.status(500).json({ error: "Erro ao criar cargo." });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, departmentId, code, kitItems } = req.body;
    try {
        const oldRole = await prisma.role.findUnique({
            where: { id },
            include: { department: { include: { unit: true } } }
        });
        if (!oldRole) return res.status(404).json({ error: "Cargo não encontrado." });

        const effectiveDeptIdForLeader =
            departmentId !== undefined && departmentId !== null && String(departmentId).trim()
                ? String(departmentId).trim()
                : oldRole.departmentId;

        let newLeaderIdFromBody: string | null | undefined = undefined;
        if (hasProfile(req, ['SUPER_ADMIN']) && Object.prototype.hasOwnProperty.call(req.body, 'leaderId')) {
            const raw = (req.body as { leaderId?: string | null }).leaderId;
            if (raw === null || raw === '') {
                newLeaderIdFromBody = null;
            } else if (typeof raw === 'string' && raw.trim()) {
                const lid = raw.trim();
                const candidate = await prisma.user.findUnique({
                    where: { id: lid },
                    select: { isActive: true, departmentId: true, name: true },
                });
                if (!candidate?.isActive) {
                    return res.status(400).json({ error: 'Líder inválido ou usuário inativo.' });
                }
                if (candidate.departmentId !== effectiveDeptIdForLeader) {
                    return res.status(400).json({ error: 'O líder deve pertencer ao mesmo departamento do cargo.' });
                }
                newLeaderIdFromBody = lid;
            }
        }

        const oldDeptId = oldRole.departmentId;
        const oldDeptName = oldRole.department?.name ?? '';
        const departmentChanged = departmentId && departmentId !== oldRole.departmentId;

        let newDeptId = oldDeptId;
        let newDeptName = oldDeptName;
        let newUnitId: string | null = null;

        if (departmentChanged) {
            const newDept = await prisma.department.findUnique({
                where: { id: departmentId },
                include: { unit: true }
            });
            if (!newDept) return res.status(400).json({ error: "Departamento de destino não encontrado." });
            newDeptId = newDept.id;
            newDeptName = newDept.name;
            newUnitId = newDept.unitId ?? null;
        }

        const data: { name?: string; departmentId?: string; code?: string | null; leaderId?: string | null } = {};
        if (name !== undefined) data.name = name;
        if (departmentId !== undefined) data.departmentId = departmentId;
        if (code !== undefined) data.code = code || null;
        if (newLeaderIdFromBody !== undefined) data.leaderId = newLeaderIdFromBody;

        // Ao mudar departamento: atualizar KBS code conforme prefixo do novo departamento
        if (departmentChanged && newDeptName) {
            const prefix = getKbsPrefixForDepartment(newDeptName);
            if (prefix && oldRole.code) {
                const match = oldRole.code.match(/^KBS-[A-Z]{2}-(\d+)$/);
                const num = match ? match[1] : '1';
                data.code = `KBS-${prefix}-${num}`;
            }
        }

        const role = await prisma.role.update({
            where: { id },
            data: Object.keys(data).length ? data : undefined
        });
        if (Object.keys(data).length > 0) {
            await registrarMudanca({
                tipo: 'ROLE_UPDATED',
                entidadeTipo: 'Role',
                entidadeId: id,
                descricao: `Cargo "${role.name}" atualizado`,
                dadosAntes: { name: oldRole.name, code: oldRole.code, departmentId: oldRole.departmentId },
                dadosDepois: { name: role.name, code: role.code, departmentId: role.departmentId },
                autorId: getAutorId(req),
            }).catch(() => {});
        }

        if (newLeaderIdFromBody !== undefined && newLeaderIdFromBody !== oldRole.leaderId) {
            const newLeaderUser =
                newLeaderIdFromBody === null
                    ? null
                    : await prisma.user.findUnique({
                          where: { id: newLeaderIdFromBody },
                          select: { name: true },
                      });
            const desc =
                newLeaderIdFromBody === null
                    ? `Liderança do cargo ${role.name} removida`
                    : `Liderança do cargo ${role.name} definida como ${newLeaderUser?.name ?? '—'}`;
            await registrarMudanca({
                tipo: 'ROLE_LEADER_CHANGE',
                entidadeTipo: 'Role',
                entidadeId: id,
                descricao: desc,
                dadosAntes: { leaderId: oldRole.leaderId },
                dadosDepois: { leaderId: newLeaderIdFromBody },
                autorId: getAutorId(req),
            }).catch(() => {});
            void propagateLeaderToRole(id, newLeaderIdFromBody, getAutorId(req)).catch((err) =>
                console.error('[updateRole] propagateLeaderToRole:', err)
            );
        }

        // Sync jobTitle for users linked by roleId or by jobTitle+departmentId
        if (oldRole.name !== name && name) {
            await prisma.user.updateMany({
                where: { OR: [{ roleId: id }, { jobTitle: oldRole.name, departmentId: oldDeptId }] },
                data: { jobTitle: name }
            });
        }

        // Ao mudar departamento: mover todos os colaboradores vinculados ao cargo (departmentId/unitId)
        if (departmentChanged) {
            const result = await prisma.user.updateMany({
                where: { roleId: id },
                data: { departmentId: newDeptId, unitId: newUnitId }
            });
            // Também atualizar usuários "soft-linked" (jobTitle + departmentId) sem roleId
            const softLinked = await prisma.user.updateMany({
                where: {
                    roleId: null,
                    jobTitle: oldRole.name,
                    departmentId: oldDeptId
                },
                data: { departmentId: newDeptId, unitId: newUnitId }
            });
            const total = result.count + softLinked.count;
            if (total > 0) {
                await registrarMudanca({
                    tipo: 'ROLE_DEPARTMENT_CHANGE',
                    entidadeTipo: 'Role',
                    entidadeId: id,
                    descricao: `Cargo "${role.name}" movido do departamento "${oldDeptName}" para "${newDeptName}". ${total} colaborador(es) atualizado(s).`,
                    dadosAntes: {
                        departmentId: oldRole.departmentId,
                        departmentName: oldDeptName,
                        kbsCode: oldRole.code,
                        unit: oldRole.department?.unit?.name,
                    },
                    dadosDepois: {
                        departmentId: departmentId,
                        departmentName: newDeptName,
                        kbsCode: role.code,
                        unit: (await prisma.department.findUnique({ where: { id: departmentId }, include: { unit: true } }))?.unit?.name,
                    },
                    autorId: getAutorId(req),
                });
            }
        }

        // Sincronizar RoleKitItem se enviado
        if (Array.isArray(kitItems)) {
            await prisma.roleKitItem.deleteMany({ where: { roleId: id } });
            if (kitItems.length > 0) {
                await prisma.roleKitItem.createMany({
                    data: kitItems.map((it: { toolCode?: string; toolName?: string; accessLevelDesc?: string; criticality?: string | null; isCritical?: boolean }) => ({
                        roleId: id,
                        toolCode: it.toolCode || '',
                        toolName: it.toolName || '',
                        accessLevelDesc: it.accessLevelDesc ?? null,
                        criticality: it.criticality ?? null,
                        isCritical: it.isCritical !== false
                    }))
                });
            }
        }

        const updated = await prisma.role.findUnique({
            where: { id },
            include: {
                kitItems: true,
                department: true,
                leader: { select: { id: true, name: true, email: true } },
            },
        });
        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar cargo." });
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { fallbackRoleId } = req.body as { fallbackRoleId?: string };
    try {
        const role = await prisma.role.findUnique({
            where: { id },
            include: { department: { include: { unit: true } } }
        });
        if (!role) return res.status(404).json({ error: "Cargo não encontrado." });

        // Usuários vinculados: por roleId ou por jobTitle + departmentId
        const userCount = await prisma.user.count({
            where: {
                OR: [
                    { roleId: id },
                    { jobTitle: role.name, departmentId: role.departmentId }
                ]
            }
        });

        if (userCount > 0) {
            if (!fallbackRoleId) {
                return res.status(400).json({
                    error: `Existem ${userCount} colaborador(es) neste cargo. Selecione o novo cargo de destino antes de excluir.`,
                    requireFallback: true,
                    userCount
                });
            }
            const targetRole = await prisma.role.findUnique({
                where: { id: fallbackRoleId },
                include: { department: { include: { unit: true } } }
            });
            if (!targetRole) return res.status(400).json({ error: "Cargo de destino não encontrado." });
            if (targetRole.id === id) return res.status(400).json({ error: "O cargo de destino não pode ser o mesmo que está sendo excluído." });

            await prisma.user.updateMany({
                where: {
                    OR: [
                        { roleId: id },
                        { jobTitle: role.name, departmentId: role.departmentId }
                    ]
                },
                data: {
                    roleId: fallbackRoleId,
                    jobTitle: targetRole.name,
                    departmentId: targetRole.departmentId,
                    unitId: targetRole.department?.unitId ?? null
                }
            });
        }

        await registrarMudanca({
            tipo: 'ROLE_DELETED',
            entidadeTipo: 'Role',
            entidadeId: id,
            descricao: `Cargo "${role.name}" excluído do departamento "${role.department?.name ?? '—'}". ${userCount > 0 ? `Colaboradores redirecionados para cargo de destino.` : ''}`,
            dadosAntes: {
                name: role.name,
                code: role.code,
                departmentId: role.departmentId,
                departmentName: role.department?.name,
                unit: role.department?.unit?.name,
            },
            autorId: getAutorId(req),
        });
        await prisma.role.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error("Erro ao excluir cargo:", error);
        return res.status(500).json({ error: "Erro ao excluir cargo." });
    }
};

// --- ROLE KIT (Kit Básico do Cargo) ---
export const getRoleKit = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                kitItems: true,
                department: true,
                leader: { select: { id: true, name: true, email: true } },
            },
        });
        if (!role) return res.status(404).json({ error: "Cargo não encontrado." });
        return res.json(role);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao buscar kit do cargo." });
    }
};

export const updateRoleKit = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { items } = req.body as { items: { toolCode: string; toolName: string; accessLevelDesc?: string; criticality?: string; isCritical?: boolean }[] };
    try {
        const role = await prisma.role.findUnique({ where: { id }, include: { kitItems: true } });
        if (!role) return res.status(404).json({ error: "Cargo não encontrado." });
        const kitAnterior = role.kitItems?.map((k: any) => ({ toolName: k.toolName, toolCode: k.toolCode })) ?? [];

        await prisma.roleKitItem.deleteMany({ where: { roleId: id } });
        if (Array.isArray(items) && items.length > 0) {
            await prisma.roleKitItem.createMany({
                data: items.map((it: any) => ({
                    roleId: id,
                    toolCode: it.toolCode || '',
                    toolName: it.toolName || '',
                    accessLevelDesc: it.accessLevelDesc || null,
                    criticality: it.criticality || null,
                    isCritical: it.isCritical !== false
                }))
            });
        }
        const updated = await prisma.role.findUnique({
            where: { id },
            include: { kitItems: true }
        });
        const kitNovo = updated?.kitItems?.map((k: any) => ({ toolName: k.toolName, toolCode: k.toolCode })) ?? [];
        await registrarMudanca({
            tipo: 'KBS_UPDATED',
            entidadeTipo: 'Role',
            entidadeId: id,
            descricao: `Kit Básico do cargo "${role.name}" atualizado`,
            dadosAntes: { ferramentas: kitAnterior },
            dadosDepois: { ferramentas: kitNovo },
            autorId: getAutorId(req),
        }).catch(() => {});
        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar kit do cargo." });
    }
};

/** Lista departamentos (autocomplete / inbox Infra). Qualquer usuário autenticado. */
export const listDepartments = async (_req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: [{ name: 'asc' }],
            select: { id: true, name: true, unitId: true },
        });
        return res.json(departments);
    } catch (error) {
        console.error('listDepartments:', error);
        return res.status(500).json({ error: 'Erro ao listar departamentos.' });
    }
};

/** Lista cargos de um departamento. Query: departmentId (obrigatório). */
export const listRolesByDepartment = async (req: Request, res: Response) => {
    const departmentId = String(req.query.departmentId || '').trim();
    if (!departmentId) return res.status(400).json({ error: 'departmentId é obrigatório.' });
    try {
        const roles = await prisma.role.findMany({
            where: { departmentId },
            orderBy: [{ name: 'asc' }],
            select: {
                id: true,
                name: true,
                code: true,
                departmentId: true,
                leader: { select: { id: true, name: true, email: true } },
            },
        });
        return res.json(roles);
    } catch (error) {
        console.error('listRolesByDepartment:', error);
        return res.status(500).json({ error: 'Erro ao listar cargos.' });
    }
};
