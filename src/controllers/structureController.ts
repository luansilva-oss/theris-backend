import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all departments and roles
export const getStructure = async (req: Request, res: Response) => {
    try {
        const [departments, roles] = await Promise.all([
            prisma.department.findMany({ orderBy: { name: 'asc' } }),
            prisma.role.findMany({
                orderBy: { name: 'asc' },
                include: { department: true }
            })
        ]);
        return res.json({ departments, roles });
    } catch (error) {
        console.error("Erro ao buscar estrutura:", error);
        return res.status(500).json({ error: "Erro interno ao buscar estrutura." });
    }
};

// --- DEPARTMENT CRUD ---

export const createDepartment = async (req: Request, res: Response) => {
    const { name } = req.body;
    try {
        const dept = await prisma.department.create({ data: { name } });
        return res.json(dept);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao criar departamento." });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        // 1. Get old name
        const oldDept = await prisma.department.findUnique({ where: { id } });
        if (!oldDept) return res.status(404).json({ error: "Departamento não encontrado." });

        const dept = await prisma.department.update({ where: { id }, data: { name } });

        // 2. Sync with Users (if name changed)
        if (oldDept.name !== name) {
            await prisma.user.updateMany({
                where: { department: oldDept.name },
                data: { department: name }
            });
        }

        return res.json(dept);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar departamento." });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // 1. Check existing Roles
        const rolesCount = await prisma.role.count({ where: { departmentId: id } });
        if (rolesCount > 0) return res.status(400).json({ error: "Não é possível excluir: existem cargos vinculados." });

        // 2. Check existing Users (by string matching)
        const dept = await prisma.department.findUnique({ where: { id } });
        if (dept) {
            const userCount = await prisma.user.count({ where: { department: dept.name } });
            if (userCount > 0) return res.status(400).json({ error: `Não é possível excluir: existem ${userCount} usuários neste departamento.` });
        }

        await prisma.department.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao excluir departamento." });
    }
};

// --- ROLE (CARGO) CRUD ---

export const createRole = async (req: Request, res: Response) => {
    const { name, departmentId } = req.body;
    try {
        const role = await prisma.role.create({ data: { name, departmentId } });
        return res.json(role);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao criar cargo." });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, departmentId } = req.body;
    try {
        // 1. Get old role
        const oldRole = await prisma.role.findUnique({ where: { id } });
        if (!oldRole) return res.status(404).json({ error: "Cargo não encontrado." });

        const role = await prisma.role.update({
            where: { id },
            data: { name, departmentId }
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
