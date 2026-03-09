"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditUserModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const EntityAuditHistory_1 = require("./EntityAuditHistory");
const EditUserModal = ({ isOpen, onClose, user, onUpdate, currentUser, allUsers, showToast, onOpenAuditHistory }) => {
    if (!isOpen)
        return null;
    const [name, setName] = (0, react_1.useState)(user.name);
    const [email, setEmail] = (0, react_1.useState)(user.email);
    const [jobTitle, setJobTitle] = (0, react_1.useState)(user.jobTitle);
    const [departmentId, setDepartmentId] = (0, react_1.useState)(user.departmentId ?? user.departmentRef?.id ?? null);
    const [unitId, setUnitId] = (0, react_1.useState)(user.unitId ?? user.unitRef?.id ?? null);
    const [systemProfile, setSystemProfile] = (0, react_1.useState)(user.systemProfile || 'VIEWER');
    const [managerId, setManagerId] = (0, react_1.useState)(user.managerId || null);
    const [roleId, setRoleId] = (0, react_1.useState)(user.roleId || null);
    const [isActive, setIsActive] = (0, react_1.useState)(user.isActive !== false);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [availableUnits, setAvailableUnits] = (0, react_1.useState)([]);
    const [availableDepts, setAvailableDepts] = (0, react_1.useState)([]);
    const [availableRoles, setAvailableRoles] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        setName(user.name);
        setEmail(user.email);
        setJobTitle(user.jobTitle);
        setDepartmentId(user.departmentId ?? user.departmentRef?.id ?? null);
        setUnitId(user.unitId ?? user.unitRef?.id ?? null);
        setSystemProfile(user.systemProfile || 'VIEWER');
        setManagerId(user.managerId || null);
        setRoleId(user.roleId || null);
        setIsActive(user.isActive !== false);
        loadStructure();
    }, [user]);
    const loadStructure = async () => {
        try {
            const res = await fetch(`${config_1.API_URL}/api/structure`);
            if (res.ok) {
                const data = await res.json();
                const unitList = data.units || [];
                const depts = unitList.flatMap((u) => (u.departments || []).map((d) => ({ ...d, unitId: d.unitId ?? u.id })));
                const roles = depts.flatMap((d) => d.roles || []);
                setAvailableUnits(unitList.map((u) => ({ id: u.id, name: u.name })));
                setAvailableDepts(depts);
                setAvailableRoles(roles);
            }
        }
        catch (e) {
            console.error(e);
        }
    };
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                name,
                email,
                jobTitle: jobTitle || null,
                departmentId: departmentId || null,
                unitId: unitId || null,
                roleId: roleId || null,
                managerId: managerId || null,
                systemProfile,
                isActive
            };
            const res = await fetch(`${config_1.API_URL}/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-requester-id': currentUser.id
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast("Dados do colaborador atualizados!", "success");
                await (onUpdate?.() ?? Promise.resolve());
                onClose();
            }
            else {
                const err = await res.json();
                showToast(err.error || "Erro ao salvar alterações.", "error");
            }
        }
        catch (error) {
            console.error(error);
            showToast("Erro de rede ao salvar.", "error");
        }
        setIsSaving(false);
    };
    const isSuperAdmin = currentUser.systemProfile === 'SUPER_ADMIN';
    const isGestor = currentUser.systemProfile === 'GESTOR' || currentUser.systemProfile === 'ADMIN';
    // Opções de Perfil baseadas em quem está editando
    const profileOptions = [
        { value: 'VIEWER', label: 'Viewer (Apenas Visualização)' },
        { value: 'APPROVER', label: 'Aprovador (Aprova Tarefas/Ferramentas)' },
    ];
    if (isSuperAdmin) {
        profileOptions.push({ value: 'GESTOR', label: 'Gestor (Gerencia Pessoas)' });
        profileOptions.push({ value: 'SUPER_ADMIN', label: 'Super Admin (Acesso Total)' });
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '500px' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Editar Colaborador" }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Nome Completo" }), (0, jsx_runtime_1.jsx)("input", { className: "form-input", value: name, onChange: (e) => setName(e.target.value) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "E-mail" }), (0, jsx_runtime_1.jsx)("input", { className: "form-input", value: email, onChange: (e) => setEmail(e.target.value) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Unidade" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", value: unitId || '', onChange: (e) => {
                                        const id = e.target.value || null;
                                        setUnitId(id);
                                        setDepartmentId(null);
                                        setRoleId(null);
                                        setJobTitle('');
                                    }, style: { width: '100%', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), availableUnits.map(u => (0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Departamento" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", value: departmentId || '', onChange: (e) => {
                                        const id = e.target.value || null;
                                        setDepartmentId(id);
                                        const newDeptId = id || '';
                                        const currentRoleStillValid = roleId && availableRoles.some(r => r.id === roleId && r.departmentId === newDeptId);
                                        if (!currentRoleStillValid) {
                                            setRoleId(null);
                                            setJobTitle('');
                                        }
                                    }, style: { width: '100%', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), availableDepts
                                            .filter(d => !unitId || d.unitId === unitId)
                                            .map(d => (0, jsx_runtime_1.jsx)("option", { value: d.id, children: d.name }, d.id))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Cargo" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", value: roleId || '', onChange: (e) => {
                                const id = e.target.value || null;
                                setRoleId(id);
                                const role = availableRoles.find(r => r.id === id);
                                setJobTitle(role?.name ?? '');
                            }, style: { width: '100%', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), availableRoles
                                    .filter(r => !departmentId || r.departmentId === departmentId)
                                    .map(r => (0, jsx_runtime_1.jsx)("option", { value: r.id, children: r.name }, r.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Perfil de Sistema (Acesso)" }), (0, jsx_runtime_1.jsx)("select", { className: "form-input", value: systemProfile, onChange: (e) => setSystemProfile(e.target.value), children: profileOptions.map(opt => ((0, jsx_runtime_1.jsx)("option", { value: opt.value, style: { background: '#18181b' }, children: opt.label }, opt.value))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", id: "isActive", checked: isActive, onChange: (e) => setIsActive(e.target.checked), style: { width: 18, height: 18, accentColor: '#0EA5E9' } }), (0, jsx_runtime_1.jsx)("label", { htmlFor: "isActive", style: { margin: 0 }, children: "Colaborador ativo" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Gestor Imediato" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", value: managerId || '', onChange: (e) => setManagerId(e.target.value || null), style: { width: '100%', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Sem Gestor (Root)" }), allUsers
                                    .filter(u => u.id !== user.id) // Não pode ser gestor de si mesmo
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(u => ((0, jsx_runtime_1.jsxs)("option", { value: u.id, children: [u.name, " (", u.jobTitle || 'Sem Cargo', ")"] }, u.id)))] })] }), user && ((0, jsx_runtime_1.jsx)(EntityAuditHistory_1.EntityAuditHistory, { entidadeId: user.id, entidadeTipo: "User", limit: 5, onOpenFullHistory: onOpenAuditHistory ? (p) => onOpenAuditHistory(p.entidadeId, p.entidadeTipo) : undefined })), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '20px', display: 'flex', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-verify", style: { margin: 0, flex: 1 }, disabled: isSaving, onClick: handleSave, children: isSaving ? 'Salvando...' : 'Salvar Alterações' }), (0, jsx_runtime_1.jsx)("button", { className: "btn-verify", style: { margin: 0, background: 'transparent', border: '1px solid #374151', color: '#9CA3AF' }, onClick: onClose, children: "Cancelar" })] })] }) }));
};
exports.EditUserModal = EditUserModal;
