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
        const dept = await prisma.department.update({ where: { id }, data: { name } });
        return res.json(dept);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar departamento." });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Antes de deletar, podemos querer avisar se tem roles vinculadas
        const rolesCount = await prisma.role.count({ where: { departmentId: id } });
        if (rolesCount > 0) return res.status(400).json({ error: "Não é possível excluir um departamento que possui cargos vinculados." });

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
        const role = await prisma.role.update({
            where: { id },
            data: { name, departmentId }
        });
        return res.json(role);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar cargo." });
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.role.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao excluir cargo." });
    }
};
