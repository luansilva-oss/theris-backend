"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartments = exports.deleteUser = exports.markPasswordChanged = exports.updateUser = exports.getMyTools = exports.manualAddUser = exports.getMe = exports.getAllUsers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// FUNÇÃO DE NORMALIZAÇÃO DE E-MAIL (nome.sobrenome@grupo-3c.com)
const normalizeEmail = (email) => {
    const parts = email.toLowerCase().split('@')[0].split('.');
    const normalizedLocal = parts.length > 2
        ? `${parts[0]}.${parts[parts.length - 1]}`
        : parts.join('.');
    return `${normalizedLocal}@grupo-3c.com`;
};
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
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
            }
        });
        return res.json(users);
    }
    catch (error) {
        console.error("Erro ao listar usuários:", error);
        return res.status(500).json({ error: "Erro interno ao buscar colaboradores." });
    }
};
exports.getAllUsers = getAllUsers;
/** Perfil do usuário logado (Dashboard 'Meu perfil'): retorna usuário com manager para exibir Gestor Direto. */
const getMe = async (req, res) => {
    const userId = req.headers['x-user-id']?.trim();
    if (!userId)
        return res.status(401).json({ error: 'Usuário não identificado. Envie o header x-user-id.' });
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                manager: { select: { id: true, name: true } }
            }
        });
        if (!user)
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        return res.json(user);
    }
    catch (error) {
        console.error('Erro ao buscar perfil (getMe):', error);
        return res.status(500).json({ error: 'Erro ao buscar perfil.' });
    }
};
exports.getMe = getMe;
/**
 * Inserção manual de colaborador na Gestão de Pessoas (Super Admin).
 * Body: { name, email, roleId, departmentId }.
 * Upsert por e-mail: se existir, atualiza roleId/department/jobTitle/isActive; senão, cria usuário.
 */
const manualAddUser = async (req, res) => {
    const { name, email, roleId, departmentId } = req.body;
    const nameStr = typeof name === 'string' ? name.trim() : '';
    const emailStr = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!emailStr)
        return res.status(400).json({ error: 'E-mail é obrigatório.' });
    if (!roleId)
        return res.status(400).json({ error: 'roleId é obrigatório.' });
    if (!departmentId)
        return res.status(400).json({ error: 'departmentId é obrigatório.' });
    try {
        const [role, department] = await Promise.all([
            prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true, departmentId: true } }),
            prisma.department.findUnique({
                where: { id: departmentId },
                select: { id: true, name: true, unitId: true, unit: { select: { name: true } } }
            })
        ]);
        if (!role)
            return res.status(404).json({ error: 'Cargo não encontrado.' });
        if (!department)
            return res.status(404).json({ error: 'Departamento não encontrado.' });
        if (role.departmentId !== department.id)
            return res.status(400).json({ error: 'O cargo não pertence ao departamento informado.' });
        const unitName = department.unit?.name ?? null;
        const existing = await prisma.user.findUnique({ where: { email: emailStr } });
        if (existing) {
            await prisma.user.update({
                where: { id: existing.id },
                data: {
                    ...(nameStr && { name: nameStr }),
                    roleId: role.id,
                    department: department.name,
                    jobTitle: role.name,
                    ...(unitName && { unit: unitName }),
                    isActive: true
                }
            });
            return res.status(200).json({ ...existing, roleId: role.id, department: department.name, jobTitle: role.name, unit: unitName, isActive: true });
        }
        const created = await prisma.user.create({
            data: {
                name: nameStr || emailStr.split('@')[0],
                email: emailStr,
                roleId: role.id,
                department: department.name,
                jobTitle: role.name,
                ...(unitName && { unit: unitName }),
                isActive: true
            }
        });
        return res.status(201).json(created);
    }
    catch (error) {
        console.error('Erro ao adicionar/vinculando colaborador (manual-add):', error);
        return res.status(500).json({ error: 'Erro ao adicionar colaborador.' });
    }
};
exports.manualAddUser = manualAddUser;
/** Painel do Colaborador (Viewer): Meu Kit Básico (role) + Acessos Extraordinários (tabela Access com isExtraordinary). */
const getMyTools = async (req, res) => {
    const userId = req.headers['x-user-id']?.trim();
    if (!userId)
        return res.status(401).json({ error: 'Usuário não identificado. Envie o header x-user-id.' });
    try {
        const { getToolsAndLevelsMap } = await Promise.resolve().then(() => __importStar(require('../services/slackService')));
        const toolsAndLevels = getToolsAndLevelsMap();
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { roleId: true }
        });
        let kitTools = [];
        if (user?.roleId) {
            const role = await prisma.role.findUnique({
                where: { id: user.roleId },
                include: { kitItems: true }
            });
            const items = role?.kitItems ?? [];
            kitTools = items.map((k) => {
                const code = k.accessLevelDesc ?? k.toolCode ?? '';
                const toolKey = (k.toolName || '').trim();
                const levelsForTool = toolKey ? (toolsAndLevels[toolKey] ?? Object.entries(toolsAndLevels).find(([key]) => key.trim().toLowerCase() === toolKey.toLowerCase())?.[1]) : undefined;
                const levelLabel = (levelsForTool?.find((l) => l.value === code)?.label ?? code) || '—';
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
            const levelLabel = (levelsForTool?.find((l) => l.value === code)?.label ?? code) || '—';
            return {
                id: a.id,
                toolName,
                levelLabel
            };
        });
        return res.json({ kitTools, extraordinaryTools });
    }
    catch (error) {
        console.error('Erro ao buscar Meu Kit (getMyTools):', error);
        return res.status(500).json({ error: 'Erro ao buscar suas ferramentas.' });
    }
};
exports.getMyTools = getMyTools;
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, jobTitle, department, unit, systemProfile, managerId, roleId } = req.body;
    const rawEmail = req.body.email;
    const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
    const requesterId = req.headers['x-requester-id'];
    try {
        if (!requesterId)
            return res.status(401).json({ error: "Identificação do solicitante ausente." });
        const requester = await prisma.user.findUnique({ where: { id: requesterId } });
        if (!requester)
            return res.status(403).json({ error: "Solicitante não encontrado." });
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
        const data = {
            name,
            email,
            jobTitle,
            department,
            unit: unit !== undefined ? unit : undefined,
            managerId,
            systemProfile: (isSuperAdmin || isGestor) ? systemProfile : undefined
        };
        if (roleId !== undefined)
            data.roleId = roleId || null;
        const updatedUser = await prisma.user.update({
            where: { id },
            data
        });
        return res.json(updatedUser);
    }
    catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        return res.status(500).json({ error: "Erro interno ao atualizar colaborador." });
    }
};
exports.updateUser = updateUser;
/** Marca que o usuário alterou as senhas (ciclo 90 dias). */
const markPasswordChanged = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.update({
            where: { id },
            data: { lastPasswordChangeAt: new Date() },
        });
        return res.json(user);
    }
    catch (error) {
        console.error("Erro ao marcar troca de senha:", error);
        return res.status(500).json({ error: "Erro ao atualizar data de troca de senha." });
    }
};
exports.markPasswordChanged = markPasswordChanged;
const deleteUser = async (req, res) => {
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
    }
    catch (error) {
        console.error("Erro ao excluir usuário:", error);
        return res.status(500).json({ error: "Erro interno ao excluir colaborador." });
    }
};
exports.deleteUser = deleteUser;
const getDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' }
        });
        return res.json(departments);
    }
    catch (error) {
        console.error("Erro ao listar departamentos:", error);
        return res.status(500).json({ error: "Erro interno ao buscar departamentos." });
    }
};
exports.getDepartments = getDepartments;
