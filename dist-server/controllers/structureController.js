"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleKit = exports.getRoleKit = exports.deleteRole = exports.updateRole = exports.createRole = exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getStructure = exports.migrateAndDeleteUnit = exports.deleteUnit = exports.updateUnit = exports.createUnit = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/** Mapeamento departamento -> prefixo KBS (ex: KBS-BO-1) para atualizar code ao mudar departamento */
const DEPT_KBS_PREFIX = {
    'Board': 'BO', 'Tecnologia e Segurança (SI)': 'SI', 'Administrativo': 'AD',
    'Comercial Contact': 'CO', 'Expansão': 'CO', 'Comercial': 'CO',
    'Marketing': 'MK', 'Parcerias': 'MK',
    'Atendimento ao Cliente': 'AT', 'Professional Service': 'AT',
    'Operações': 'OP', 'Pessoas e Performance': 'PC', 'Produto 3C+': 'PD',
    'RevOps': 'RA', 'Instituto 3C': 'IN', 'Evolux': 'PD', 'Dizify': 'PD',
    'Produto FiqOn': 'PD', 'Produto Dizparos': 'PD',
};
function getKbsPrefixForDepartment(deptName) {
    return DEPT_KBS_PREFIX[deptName] ?? null;
}
// --- UNIT CRUD ---
const createUnit = async (req, res) => {
    const { name } = req.body;
    if (!name || !String(name).trim())
        return res.status(400).json({ error: "Nome da unidade é obrigatório." });
    try {
        const unit = await prisma.unit.create({ data: { name: String(name).trim() } });
        return res.status(201).json(unit);
    }
    catch (error) {
        if (error?.code === 'P2002')
            return res.status(409).json({ error: "Já existe uma unidade com esse nome." });
        return res.status(500).json({ error: "Erro ao criar unidade." });
    }
};
exports.createUnit = createUnit;
const updateUnit = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim())
        return res.status(400).json({ error: "Nome da unidade é obrigatório." });
    try {
        const unit = await prisma.unit.update({ where: { id }, data: { name: String(name).trim() } });
        return res.json(unit);
    }
    catch (error) {
        if (error?.code === 'P2025')
            return res.status(404).json({ error: "Unidade não encontrada." });
        if (error?.code === 'P2002')
            return res.status(409).json({ error: "Já existe uma unidade com esse nome." });
        return res.status(500).json({ error: "Erro ao atualizar unidade." });
    }
};
exports.updateUnit = updateUnit;
/** DELETE Unit: só permite se não tiver departamentos. Caso contrário retorna 409 com lista de departamentos para migração. */
const deleteUnit = async (req, res) => {
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
        if (!unit)
            return res.status(404).json({ error: "Unidade não encontrada." });
        if (unit.departments.length === 0) {
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
    }
    catch (error) {
        console.error("Erro ao excluir unidade:", error);
        return res.status(500).json({ error: "Erro ao excluir unidade." });
    }
};
exports.deleteUnit = deleteUnit;
/** Payload: { decisions: [{ departmentId, action: "migrate_department"|"delete_department", targetUnitId?, targetDepartmentId? }] }
 *  - migrate_department: move o departamento para outra unidade (department.unitId = targetUnitId). Cargos e KBS permanecem.
 *  - delete_department: move todos os cargos do departamento para targetDepartmentId, depois exclui o departamento. RoleKitItems permanecem nos cargos.
 */
const migrateAndDeleteUnit = async (req, res) => {
    const { id: unitId } = req.params;
    const { decisions } = req.body;
    if (!Array.isArray(decisions) || decisions.length === 0)
        return res.status(400).json({ error: "Payload deve conter 'decisions' (array) com as escolhas de migração." });
    try {
        const unit = await prisma.unit.findUnique({
            where: { id: unitId },
            include: { departments: { include: { roles: true } } }
        });
        if (!unit)
            return res.status(404).json({ error: "Unidade não encontrada." });
        const deptIds = new Set(unit.departments.map(d => d.id));
        const decisionDeptIds = new Set(decisions.map((d) => d.departmentId));
        if (deptIds.size !== decisionDeptIds.size || [...deptIds].some(id => !decisionDeptIds.has(id))) {
            return res.status(400).json({ error: "Cada departamento da unidade deve ter exatamente uma decisão (migrate_department ou delete_department)." });
        }
        for (const dec of decisions) {
            if (dec.action === "migrate_department") {
                if (!dec.targetUnitId)
                    return res.status(400).json({ error: `Departamento ${dec.departmentId}: targetUnitId é obrigatório para migrate_department.` });
                const targetUnit = await prisma.unit.findUnique({ where: { id: dec.targetUnitId } });
                if (!targetUnit || targetUnit.id === unitId)
                    return res.status(400).json({ error: "Unidade de destino inválida ou igual à unidade a ser excluída." });
            }
            else if (dec.action === "delete_department") {
                if (!dec.targetDepartmentId)
                    return res.status(400).json({ error: `Departamento ${dec.departmentId}: targetDepartmentId é obrigatório para delete_department.` });
                if (dec.targetDepartmentId === dec.departmentId)
                    return res.status(400).json({ error: "Departamento de destino não pode ser o mesmo que está sendo excluído." });
                const targetDept = await prisma.department.findUnique({ where: { id: dec.targetDepartmentId } });
                if (!targetDept)
                    return res.status(400).json({ error: "Departamento de destino não encontrado." });
            }
            else {
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
                }
                else if (dec.action === "delete_department" && dec.targetDepartmentId) {
                    await tx.role.updateMany({
                        where: { departmentId: dec.departmentId },
                        data: { departmentId: dec.targetDepartmentId }
                    });
                    await tx.department.delete({ where: { id: dec.departmentId } });
                }
            }
            await tx.unit.delete({ where: { id: unitId } });
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Erro na migração/exclusão da unidade:", error);
        return res.status(500).json({ error: "Erro ao executar migração e excluir unidade." });
    }
};
exports.migrateAndDeleteUnit = migrateAndDeleteUnit;
// GET /api/structure — estrutura completa Unit -> Department -> Role -> kitItems
// O frontend espera obrigatoriamente: { units: Unit[] }
const getStructure = async (req, res) => {
    try {
        const data = await prisma.unit.findMany({
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
        return res.json({ units: data ?? [] });
    }
    catch (error) {
        console.error("Erro ao buscar estrutura:", error);
        return res.status(500).json({ error: "Erro interno ao buscar estrutura." });
    }
};
exports.getStructure = getStructure;
// --- DEPARTMENT CRUD ---
const createDepartment = async (req, res) => {
    const { name, unitId } = req.body;
    if (!unitId)
        return res.status(400).json({ error: "unitId é obrigatório." });
    try {
        const dept = await prisma.department.create({ data: { name, unitId } });
        return res.json(dept);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao criar departamento." });
    }
};
exports.createDepartment = createDepartment;
const updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name, unitId } = req.body;
    try {
        const oldDept = await prisma.department.findUnique({ where: { id } });
        if (!oldDept)
            return res.status(404).json({ error: "Departamento não encontrado." });
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (unitId !== undefined)
            data.unitId = unitId;
        const dept = await prisma.department.update({ where: { id }, data });
        if (oldDept.name !== name) {
            await prisma.user.updateMany({
                where: { department: oldDept.name },
                data: { department: name ?? oldDept.name }
            });
        }
        return res.json(dept);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar departamento." });
    }
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    const { id } = req.params;
    const { redirectToDepartmentId } = req.body; // Alvo para mover usuários
    try {
        const deptToDelete = await prisma.department.findUnique({ where: { id } });
        if (!deptToDelete)
            return res.status(404).json({ error: "Departamento não encontrado." });
        // 1. Redirecionar usuários se houver alvo
        if (redirectToDepartmentId) {
            const targetDept = await prisma.department.findUnique({ where: { id: redirectToDepartmentId } });
            if (!targetDept)
                return res.status(400).json({ error: "Departamento de destino não encontrado." });
            await prisma.user.updateMany({
                where: { department: deptToDelete.name },
                data: { department: targetDept.name }
            });
        }
        else {
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
    }
    catch (error) {
        console.error("Erro ao excluir departamento:", error);
        return res.status(500).json({ error: "Erro ao excluir departamento." });
    }
};
exports.deleteDepartment = deleteDepartment;
// --- ROLE (CARGO) CRUD ---
const createRole = async (req, res) => {
    const { name, departmentId, code, kitItems } = req.body;
    if (!name || !departmentId) {
        return res.status(400).json({ error: "Nome e departmentId são obrigatórios." });
    }
    try {
        const role = await prisma.role.create({
            data: { name, departmentId, code: code || null }
        });
        if (Array.isArray(kitItems) && kitItems.length > 0) {
            await prisma.roleKitItem.createMany({
                data: kitItems.map((it) => ({
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
            include: { kitItems: true, department: true }
        });
        return res.json(created);
    }
    catch (error) {
        console.error("Erro ao criar cargo:", error);
        return res.status(500).json({ error: "Erro ao criar cargo." });
    }
};
exports.createRole = createRole;
const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, departmentId, code, kitItems } = req.body;
    try {
        const oldRole = await prisma.role.findUnique({
            where: { id },
            include: { department: { include: { unit: true } } }
        });
        if (!oldRole)
            return res.status(404).json({ error: "Cargo não encontrado." });
        const oldDeptName = oldRole.department?.name ?? '';
        const oldUnitName = oldRole.department?.unit?.name ?? '';
        const departmentChanged = departmentId && departmentId !== oldRole.departmentId;
        let newDeptName = oldDeptName;
        let newUnitName = oldUnitName;
        if (departmentChanged) {
            const newDept = await prisma.department.findUnique({
                where: { id: departmentId },
                include: { unit: true }
            });
            if (!newDept)
                return res.status(400).json({ error: "Departamento de destino não encontrado." });
            newDeptName = newDept.name;
            newUnitName = newDept.unit?.name ?? '';
        }
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (departmentId !== undefined)
            data.departmentId = departmentId;
        if (code !== undefined)
            data.code = code || null;
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
        // Sync jobTitle for users linked by roleId or by jobTitle+department
        if (oldRole.name !== name && name) {
            await prisma.user.updateMany({
                where: { OR: [{ roleId: id }, { jobTitle: oldRole.name, department: oldDeptName }] },
                data: { jobTitle: name }
            });
        }
        // Ao mudar departamento: mover todos os colaboradores para o novo dept/unidade
        if (departmentChanged) {
            const userCount = await prisma.user.updateMany({
                where: {
                    OR: [
                        { roleId: id },
                        { jobTitle: oldRole.name, department: oldDeptName }
                    ]
                },
                data: { department: newDeptName, unit: newUnitName }
            });
            console.log(`[Auditoria] Cargo "${role.name}" (${id}) movido de "${oldDeptName}" para "${newDeptName}". ${userCount.count} colaborador(es) atualizado(s).`);
        }
        // Sincronizar RoleKitItem se enviado
        if (Array.isArray(kitItems)) {
            await prisma.roleKitItem.deleteMany({ where: { roleId: id } });
            if (kitItems.length > 0) {
                await prisma.roleKitItem.createMany({
                    data: kitItems.map((it) => ({
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
            include: { kitItems: true, department: true }
        });
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar cargo." });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    const { id } = req.params;
    const { fallbackRoleId } = req.body;
    try {
        const role = await prisma.role.findUnique({
            where: { id },
            include: { department: { include: { unit: true } } }
        });
        if (!role)
            return res.status(404).json({ error: "Cargo não encontrado." });
        // Usuários vinculados: por roleId ou por jobTitle + department (dados em texto no User)
        const deptName = role.department?.name ?? '';
        const userCount = await prisma.user.count({
            where: {
                OR: [
                    { roleId: id },
                    { jobTitle: role.name, department: deptName }
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
            if (!targetRole)
                return res.status(400).json({ error: "Cargo de destino não encontrado." });
            if (targetRole.id === id)
                return res.status(400).json({ error: "O cargo de destino não pode ser o mesmo que está sendo excluído." });
            const targetDeptName = targetRole.department?.name ?? '';
            const targetUnitName = targetRole.department?.unit?.name ?? '';
            await prisma.user.updateMany({
                where: {
                    OR: [
                        { roleId: id },
                        { jobTitle: role.name, department: deptName }
                    ]
                },
                data: {
                    roleId: fallbackRoleId,
                    jobTitle: targetRole.name,
                    department: targetDeptName,
                    unit: targetUnitName
                }
            });
        }
        await prisma.role.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Erro ao excluir cargo:", error);
        return res.status(500).json({ error: "Erro ao excluir cargo." });
    }
};
exports.deleteRole = deleteRole;
// --- ROLE KIT (Kit Básico do Cargo) ---
const getRoleKit = async (req, res) => {
    const { id } = req.params;
    try {
        const role = await prisma.role.findUnique({
            where: { id },
            include: { kitItems: true, department: true }
        });
        if (!role)
            return res.status(404).json({ error: "Cargo não encontrado." });
        return res.json(role);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao buscar kit do cargo." });
    }
};
exports.getRoleKit = getRoleKit;
const updateRoleKit = async (req, res) => {
    const { id } = req.params;
    const { items } = req.body;
    try {
        const role = await prisma.role.findUnique({ where: { id } });
        if (!role)
            return res.status(404).json({ error: "Cargo não encontrado." });
        await prisma.roleKitItem.deleteMany({ where: { roleId: id } });
        if (Array.isArray(items) && items.length > 0) {
            await prisma.roleKitItem.createMany({
                data: items.map((it) => ({
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
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar kit do cargo." });
    }
};
exports.updateRoleKit = updateRoleKit;
