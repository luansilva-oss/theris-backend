"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteToolLevel = exports.updateToolLevel = exports.updateToolAccess = exports.removeToolAccess = exports.addToolAccess = exports.deleteToolGroup = exports.createToolGroup = exports.getToolGroups = exports.updateTool = exports.deleteTool = exports.createTool = exports.getTools = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// --- TOOLS ---
const getTools = async (req, res) => {
    try {
        const tools = await prisma.tool.findMany({
            include: {
                owner: {
                    include: {
                        myDeputy: true
                    }
                },
                subOwner: true,
                toolGroup: true, // Inclui o grupo
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
        return res.json(tools);
    }
    catch (error) {
        console.error("❌ Erro no getTools:", error);
        return res.status(500).json({ error: 'Erro ao buscar ferramentas' });
    }
};
exports.getTools = getTools;
const createTool = async (req, res) => {
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
    }
    catch (error) {
        console.error("❌ Erro ao criar ferramenta:", error);
        return res.status(500).json({ error: 'Erro ao criar ferramenta' });
    }
};
exports.createTool = createTool;
const deleteTool = async (req, res) => {
    const { id } = req.params;
    try {
        // Delete related accesses first
        await prisma.access.deleteMany({ where: { toolId: id } });
        await prisma.tool.delete({ where: { id } });
        return res.json({ message: 'Ferramenta removida com sucesso' });
    }
    catch (error) {
        console.error("❌ Erro ao remover ferramenta:", error);
        return res.status(500).json({ error: 'Erro ao remover ferramenta' });
    }
};
exports.deleteTool = deleteTool;
const updateTool = async (req, res) => {
    const { id } = req.params;
    const { name, acronym, description, ownerId, subOwnerId, toolGroupId, availableAccessLevels } = req.body;
    try {
        const updatedTool = await prisma.tool.update({
            where: { id },
            data: {
                name,
                acronym,
                description,
                ownerId: ownerId || null,
                subOwnerId: subOwnerId || null,
                toolGroupId: toolGroupId || null,
                availableAccessLevels: availableAccessLevels // Array de strings
            }
        });
        return res.json(updatedTool);
    }
    catch (error) {
        console.error("❌ Erro ao atualizar ferramenta:", error);
        return res.status(500).json({ error: 'Erro ao atualizar ferramenta' });
    }
};
exports.updateTool = updateTool;
// --- TOOL GROUPS ---
const getToolGroups = async (req, res) => {
    try {
        const groups = await prisma.toolGroup.findMany({ orderBy: { name: 'asc' } });
        return res.json(groups);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar grupos' });
    }
};
exports.getToolGroups = getToolGroups;
const createToolGroup = async (req, res) => {
    const { name } = req.body;
    try {
        const group = await prisma.toolGroup.create({ data: { name } });
        return res.json(group);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao criar grupo' });
    }
};
exports.createToolGroup = createToolGroup;
const deleteToolGroup = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.toolGroup.delete({ where: { id } });
        return res.json({ message: 'Grupo removido' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao remover grupo' });
    }
};
exports.deleteToolGroup = deleteToolGroup;
// --- ACCESS MANAGEMENT ---
const addToolAccess = async (req, res) => {
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
                status: level // Usamos o campo status como o nível de acesso (ex: "Admin", "User")
            }
        });
        return res.json(access);
    }
    catch (error) {
        console.error("Erro ao adicionar acesso:", error);
        return res.status(500).json({ error: 'Erro ao adicionar acesso' });
    }
};
exports.addToolAccess = addToolAccess;
const removeToolAccess = async (req, res) => {
    const { id, userId } = req.params;
    try {
        await prisma.access.deleteMany({
            where: {
                toolId: id,
                userId: userId
            }
        });
        return res.json({ message: 'Acesso removido' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao remover acesso' });
    }
};
exports.removeToolAccess = removeToolAccess;
const updateToolAccess = async (req, res) => {
    const { toolId, userId } = req.params;
    const { isExtraordinary, duration, unit } = req.body;
    try {
        await prisma.access.updateMany({
            where: { toolId, userId },
            data: {
                isExtraordinary: isExtraordinary ?? undefined,
                duration: duration !== undefined ? (duration ? parseInt(duration) : null) : undefined,
                unit: unit ?? undefined
            }
        });
        return res.json({ message: 'Acesso atualizado' });
    }
    catch (error) {
        console.error("Erro ao atualizar acesso:", error);
        return res.status(500).json({ error: 'Erro ao atualizar acesso' });
    }
};
exports.updateToolAccess = updateToolAccess;
// --- LEVEL MANAGEMENT ---
const updateToolLevel = async (req, res) => {
    const { toolId, oldLevelName } = req.params;
    const { newLevelName, description, icon } = req.body;
    try {
        const tool = await prisma.tool.findUnique({ where: { id: toolId } });
        if (!tool)
            return res.status(404).json({ error: 'Ferramenta não encontrada' });
        let updatedLevels = [...(tool.availableAccessLevels || [])];
        let updatedDescriptions = tool.accessLevelDescriptions || {};
        // 1. Rename Level (if name changed)
        if (newLevelName && newLevelName !== oldLevelName) {
            // Check if new name already exists
            if (updatedLevels.includes(newLevelName)) {
                return res.status(400).json({ error: 'Este nome de nível já existe.' });
            }
            // Update array
            updatedLevels = updatedLevels.map(l => l === oldLevelName ? newLevelName : l);
            // Update descriptions map key
            if (updatedDescriptions[oldLevelName]) {
                updatedDescriptions[newLevelName] = updatedDescriptions[oldLevelName];
                delete updatedDescriptions[oldLevelName];
            }
            // Update all Access records
            await prisma.access.updateMany({
                where: { toolId, status: oldLevelName },
                data: { status: newLevelName }
            });
        }
        // 2. Update Description & Icon
        const targetName = newLevelName || oldLevelName;
        if (description !== undefined || icon !== undefined) {
            const currentData = updatedDescriptions[targetName];
            // Handle backward compatibility (string vs object)
            const baseData = typeof currentData === 'string'
                ? { description: currentData }
                : (currentData || {});
            updatedDescriptions[targetName] = {
                ...baseData,
                ...(description !== undefined ? { description } : {}),
                ...(icon !== undefined ? { icon } : {})
            };
        }
        // Save Tool
        const updatedTool = await prisma.tool.update({
            where: { id: toolId },
            data: {
                availableAccessLevels: updatedLevels,
                accessLevelDescriptions: updatedDescriptions
            }
        });
        return res.json(updatedTool);
    }
    catch (error) {
        console.error("Erro ao atualizar nível:", error);
        return res.status(500).json({ error: 'Erro ao atualizar nível' });
    }
};
exports.updateToolLevel = updateToolLevel;
const deleteToolLevel = async (req, res) => {
    const { toolId, levelName } = req.params;
    try {
        const tool = await prisma.tool.findUnique({ where: { id: toolId } });
        if (!tool)
            return res.status(404).json({ error: 'Ferramenta não encontrada' });
        // 1. Remove from availableAccessLevels
        const updatedLevels = (tool.availableAccessLevels || []).filter(l => l !== levelName);
        // 2. Remove from accessLevelDescriptions
        const updatedDescriptions = tool.accessLevelDescriptions || {};
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
    }
    catch (error) {
        console.error("Erro ao excluir nível:", error);
        return res.status(500).json({ error: 'Erro ao excluir nível' });
    }
};
exports.deleteToolLevel = deleteToolLevel;
