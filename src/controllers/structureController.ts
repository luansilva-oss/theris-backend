import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET estrutura completa: Unit -> Department -> Role -> kitItems
export const getStructure = async (req: Request, res: Response) => {
    try {
        const units = await prisma.unit.findMany({
            orderBy: { name: 'asc' },
            include: {
                departments: {
                    orderBy: { name: 'asc' },
                    include: {
                        roles: {
                            orderBy: { name: 'asc' },
                            include: { kitItems: true }
                        }
                    }
                }
            }
        });
        return res.json({ units });
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

        if (oldDept.name !== name) {
            await prisma.user.updateMany({
                where: { department: oldDept.name },
                data: { department: name ?? oldDept.name }
            });
        }
        return res.json(dept);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar departamento." });
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
                where: { department: deptToDelete.name },
                data: { department: targetDept.name }
            });
        } else {
            // Se não houver redirecionamento, verificar se o departamento está vazio
            const userCount = await prisma.user.count({ where: { department: deptToDelete.name } });
            if (userCount > 0) {
                return res.status(400).json({
                    error: `O departamento possui ${userCount} usuários. Selecione um destino para movê-los.`
                });
            }
        }

        // 2. Limpar cargos (roles) vinculados
        await prisma.role.deleteMany({ where: { departmentId: id } });

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
    const { name, departmentId, code } = req.body;
    try {
        const role = await prisma.role.create({ data: { name, departmentId, code: code || null } });
        return res.json(role);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao criar cargo." });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, departmentId, code } = req.body;
    try {
        // 1. Get old role
        const oldRole = await prisma.role.findUnique({ where: { id } });
        if (!oldRole) return res.status(404).json({ error: "Cargo não encontrado." });

        const role = await prisma.role.update({
            where: { id },
            data: { name, departmentId, code: code !== undefined ? code : undefined }
        });

        // 2. Sync with Users (if name changed)
        if (oldRole.name !== name) {
            await prisma.user.updateMany({
                where: { jobTitle: oldRole.name },
                data: { jobTitle: name }
            });
        }

        return res.json(role);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar cargo." });
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const role = await prisma.role.findUnique({ where: { id } });
        if (role) {
            const userCount = await prisma.user.count({ where: { jobTitle: role.name } });
            if (userCount > 0) return res.status(400).json({ error: `Não é possível excluir: existem ${userCount} usuários neste cargo.` });
        }

        await prisma.role.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao excluir cargo." });
    }
};

// --- ROLE KIT (Kit Básico do Cargo) ---
export const getRoleKit = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const role = await prisma.role.findUnique({
            where: { id },
            include: { kitItems: true, department: true }
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
        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) return res.status(404).json({ error: "Cargo não encontrado." });

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
        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar kit do cargo." });
    }
};
