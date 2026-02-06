"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRole = exports.createRole = exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getStructure = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// GET all departments and roles
const getStructure = async (req, res) => {
    try {
        const [departments, roles] = await Promise.all([
            prisma.department.findMany({ orderBy: { name: 'asc' } }),
            prisma.role.findMany({
                orderBy: { name: 'asc' },
                include: { department: true }
            })
        ]);
        return res.json({ departments, roles });
    }
    catch (error) {
        console.error("Erro ao buscar estrutura:", error);
        return res.status(500).json({ error: "Erro interno ao buscar estrutura." });
    }
};
exports.getStructure = getStructure;
// --- DEPARTMENT CRUD ---
const createDepartment = async (req, res) => {
    const { name } = req.body;
    try {
        const dept = await prisma.department.create({ data: { name } });
        return res.json(dept);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao criar departamento." });
    }
};
exports.createDepartment = createDepartment;
const updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const dept = await prisma.department.update({ where: { id }, data: { name } });
        return res.json(dept);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar departamento." });
    }
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    const { id } = req.params;
    try {
        // Antes de deletar, podemos querer avisar se tem roles vinculadas
        const rolesCount = await prisma.role.count({ where: { departmentId: id } });
        if (rolesCount > 0)
            return res.status(400).json({ error: "Não é possível excluir um departamento que possui cargos vinculados." });
        await prisma.department.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao excluir departamento." });
    }
};
exports.deleteDepartment = deleteDepartment;
// --- ROLE (CARGO) CRUD ---
const createRole = async (req, res) => {
    const { name, departmentId } = req.body;
    try {
        const role = await prisma.role.create({ data: { name, departmentId } });
        return res.json(role);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao criar cargo." });
    }
};
exports.createRole = createRole;
const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, departmentId } = req.body;
    try {
        const role = await prisma.role.update({
            where: { id },
            data: { name, departmentId }
        });
        return res.json(role);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar cargo." });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.role.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao excluir cargo." });
    }
};
exports.deleteRole = deleteRole;
