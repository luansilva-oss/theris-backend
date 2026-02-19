"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageStructureModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
const ManageStructureModal = ({ isOpen, onClose, onUpdate, initialDepartment, allUsers }) => {
    const [departments, setDepartments] = (0, react_1.useState)([]);
    const [roles, setRoles] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    // Editing States
    const [viewMode, setViewMode] = (0, react_1.useState)('GLOBAL');
    const [currentDept, setCurrentDept] = (0, react_1.useState)(null);
    // Global: Create Dept
    const [newDeptName, setNewDeptName] = (0, react_1.useState)('');
    // Department View: Edit Name
    const [isEditingDeptName, setIsEditingDeptName] = (0, react_1.useState)(false);
    const [editedDeptName, setEditedDeptName] = (0, react_1.useState)('');
    // Department View: Roles
    const [newRoleName, setNewRoleName] = (0, react_1.useState)('');
    const [editingRoleId, setEditingRoleId] = (0, react_1.useState)(null);
    const [editingRoleName, setEditingRoleName] = (0, react_1.useState)('');
    // User Management Modal (inside)
    const [isUserPickerOpen, setIsUserPickerOpen] = (0, react_1.useState)(false);
    const [targetRole, setTargetRole] = (0, react_1.useState)(null);
    const [userSearchTerm, setUserSearchTerm] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            loadData();
            if (initialDepartment) {
                // We'll set the mode after data loads
            }
            else {
                setViewMode('GLOBAL');
                setCurrentDept(null);
            }
        }
    }, [isOpen, initialDepartment]);
    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/structure`);
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments);
                setRoles(data.roles);
                if (initialDepartment) {
                    const dept = data.departments.find((d) => d.name === initialDepartment);
                    if (dept) {
                        setCurrentDept(dept);
                        setViewMode('DEPARTMENT');
                        setEditedDeptName(dept.name);
                    }
                }
                else if (currentDept) {
                    const refreshed = data.departments.find((d) => d.id === currentDept.id);
                    if (refreshed)
                        setCurrentDept(refreshed);
                }
            }
        }
        catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };
    // --- ACTIONS ---
    const handleCreateDept = async () => {
        if (!newDeptName)
            return;
        try {
            await fetch(`${API_URL}/api/structure/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDeptName })
            });
            setNewDeptName('');
            loadData();
            onUpdate();
        }
        catch (e) {
            alert("Erro ao criar departamento.");
        }
    };
    const handleUpdateDeptName = async () => {
        if (!currentDept || !editedDeptName)
            return;
        try {
            await fetch(`${API_URL}/api/structure/departments/${currentDept.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editedDeptName })
            });
            setIsEditingDeptName(false);
            loadData();
            onUpdate();
        }
        catch (e) {
            alert("Erro ao atualizar nome.");
        }
    };
    const handleDeleteDept = async (id) => {
        if (!confirm("Excluir este departamento?"))
            return;
        try {
            const res = await fetch(`${API_URL}/api/structure/departments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (viewMode === 'DEPARTMENT') {
                    setViewMode('GLOBAL');
                    setCurrentDept(null);
                }
                loadData();
                onUpdate();
            }
            else {
                const err = await res.json();
                alert(err.error || "Erro ao excluir.");
            }
        }
        catch (e) {
            alert("Erro ao excluir.");
        }
    };
    // --- ROLES ---
    const handleCreateRole = async () => {
        if (!newRoleName || !currentDept)
            return;
        try {
            await fetch(`${API_URL}/api/structure/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoleName, departmentId: currentDept.id })
            });
            setNewRoleName('');
            loadData();
            onUpdate();
        }
        catch (e) {
            alert("Erro ao criar cargo.");
        }
    };
    const handleUpdateRole = async (id) => {
        if (!currentDept)
            return;
        try {
            await fetch(`${API_URL}/api/structure/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingRoleName, departmentId: currentDept.id })
            });
            setEditingRoleId(null);
            loadData();
            onUpdate();
        }
        catch (e) {
            alert("Erro ao atualizar cargo.");
        }
    };
    const handleDeleteRole = async (id) => {
        if (!confirm("Excluir este cargo?"))
            return;
        try {
            await fetch(`${API_URL}/api/structure/roles/${id}`, { method: 'DELETE' });
            loadData();
            onUpdate();
        }
        catch (e) {
            alert("Erro ao excluir.");
        }
    };
    // --- USER ASSIGNMENT ---
    const handleAddUserToRole = async (userId) => {
        if (!targetRole || !currentDept)
            return;
        try {
            const user = allUsers.find(u => u.id === userId);
            if (!user)
                return;
            await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    systemProfile: user.systemProfile || 'VIEWER',
                    jobTitle: targetRole.name,
                    department: currentDept.name
                })
            });
            setIsUserPickerOpen(false);
            onUpdate();
        }
        catch (e) {
            alert("Erro ao adicionar usuário.");
        }
    };
    const handleRemoveUserFromRole = async (user) => {
        if (!confirm(`Remover ${user.name} deste cargo?`))
            return;
        try {
            await fetch(`${API_URL}/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    systemProfile: user.systemProfile || 'VIEWER',
                    jobTitle: '',
                    department: user.department
                })
            });
            onUpdate();
        }
        catch (e) {
            alert("Erro ao remover usuário.");
        }
    };
    const pickerUsers = allUsers.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) &&
        u.jobTitle !== targetRole?.name);
    if (!isOpen)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '800px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building2, { size: 24, color: "#a78bfa" }), (0, jsx_runtime_1.jsx)("h2", { style: { margin: 0 }, children: viewMode === 'DEPARTMENT' && currentDept ? 'Gerenciar Departamento' : 'Estrutura Organizacional' })] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "modal-body", style: { flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }, children: viewMode === 'GLOBAL' ? ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#d4d4d8', marginTop: 0, marginBottom: 16 }, children: "Departamentos" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, marginBottom: 20, flexShrink: 0 }, children: [(0, jsx_runtime_1.jsx)("input", { className: "form-input", placeholder: "Novo Departamento...", value: newDeptName, onChange: e => setNewDeptName(e.target.value), style: { flex: 1 } }), (0, jsx_runtime_1.jsxs)("button", { className: "btn-verify", style: { margin: 0, width: 'auto' }, onClick: handleCreateDept, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 16 }), " Criar"] })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', paddingRight: 8, flex: 1 }, children: departments.map(d => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => {
                                        setCurrentDept(d);
                                        setViewMode('DEPARTMENT');
                                        setEditedDeptName(d.name);
                                    }, className: "card-base hover-card", style: {
                                        padding: '16px 20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        border: '1px solid #27272a',
                                        position: 'relative',
                                        minHeight: '56px'
                                    }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 16, fontWeight: 500, color: 'white', textAlign: 'center' }, children: d.name }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 20, color: "#52525b", style: { position: 'absolute', right: 16 } })] }, d.id))) })] })) : (
                    // DEPARTMENT VIEW
                    currentDept && ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }, children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => { setViewMode('GLOBAL'); setCurrentDept(null); }, style: { background: 'transparent', border: 'none', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer', width: 'fit-content' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 14, style: { transform: 'rotate(90deg)' } }), " Voltar para Lista"] }), (0, jsx_runtime_1.jsxs)("div", { style: { background: '#18181b', padding: 20, borderRadius: 8, border: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: '#71717a', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }, children: "Nome do Departamento" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10, alignItems: 'center' }, children: [isEditingDeptName ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { className: "form-input", value: editedDeptName, onChange: e => setEditedDeptName(e.target.value), style: { flex: 1, fontSize: 18, fontWeight: 600 }, autoFocus: true }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: handleUpdateDeptName, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 20, color: "#4ade80" }) })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h1", { style: { margin: 0, fontSize: 24, color: 'white' }, children: currentDept.name }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => setIsEditingDeptName(true), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit2, { size: 16, color: "#71717a" }) })] })), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1 } }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => handleDeleteDept(currentDept.id), title: "Excluir Departamento", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 18, color: "#b91c1c" }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { style: { color: '#e4e4e7', marginBottom: 15 }, children: "Cargos e Colaboradores" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("input", { className: "form-input", placeholder: "Novo Cargo...", value: newRoleName, onChange: e => setNewRoleName(e.target.value), style: { flex: 1 } }), (0, jsx_runtime_1.jsxs)("button", { className: "btn-mini", onClick: handleCreateRole, style: { background: '#27272a', border: '1px solid #3f3f46' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14 }), " Adicionar Cargo"] })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '400px', overflowY: 'auto', paddingRight: 8 }, children: roles.filter(r => r.departmentId === currentDept.id).map(role => {
                                            const roleUsers = allUsers.filter(u => u.jobTitle === role.name && u.department === currentDept.name);
                                            return ((0, jsx_runtime_1.jsxs)("div", { style: { border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { background: '#27272a', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [editingRoleId === role.id ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, flex: 1 }, children: [(0, jsx_runtime_1.jsx)("input", { className: "form-input", value: editingRoleName, onChange: e => setEditingRoleName(e.target.value), style: { height: 30, fontSize: 13 } }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => handleUpdateRole(role.id), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 14, color: "#4ade80" }) })] })) : ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { size: 14, color: "#a1a1aa" }), (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 600, color: '#e4e4e7', fontSize: 14 }, children: role.name }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => { setEditingRoleId(role.id); setEditingRoleName(role.name); }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit2, { size: 12, color: "#52525b" }) })] })), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8 }, children: [(0, jsx_runtime_1.jsxs)("button", { className: "btn-mini", onClick: () => {
                                                                            setTargetRole(role);
                                                                            setUserSearchTerm('');
                                                                            setIsUserPickerOpen(true);
                                                                        }, style: { fontSize: 11, padding: '4px 8px', background: '#a78bfa', color: '#fff', border: 'none' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 12 }), " Add Pessoa"] }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => handleDeleteRole(role.id), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#71717a" }) })] })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                            background: '#18181b',
                                                            padding: '12px 16px',
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: 8,
                                                            minHeight: '48px',
                                                            maxHeight: '200px',
                                                            overflowY: 'auto',
                                                            alignItems: 'flex-start', // Garante que itens não estiquem
                                                            alignContent: 'flex-start' // Garante que linhas fiquem no topo
                                                        }, children: roleUsers.length === 0 ? ((0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, color: '#52525b', fontStyle: 'italic' }, children: "Ningu\u00E9m neste cargo ainda." })) : (roleUsers.map(u => ((0, jsx_runtime_1.jsxs)("div", { style: {
                                                                display: 'inline-flex', alignItems: 'center', gap: 6, // Trocado para inline-flex
                                                                background: '#09090b', padding: '6px 12px', borderRadius: 20,
                                                                border: '1px solid #27272a', fontSize: 12, color: '#d4d4d8',
                                                                flexShrink: 0
                                                            }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { size: 10, color: "#a1a1aa" }), (0, jsx_runtime_1.jsx)("span", { style: { whiteSpace: 'nowrap' }, children: u.name }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleRemoveUserFromRole(u), style: {
                                                                        background: 'transparent', border: 'none',
                                                                        cursor: 'pointer', display: 'flex', padding: 0, marginLeft: 4
                                                                    }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 12, color: "#ef4444" }) })] }, u.id)))) })] }, role.id));
                                        }) })] })] }))) }), isUserPickerOpen && targetRole && ((0, jsx_runtime_1.jsx)("div", { style: {
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', zIndex: 50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }, children: (0, jsx_runtime_1.jsxs)("div", { style: { background: '#18181b', border: '1px solid #3f3f46', width: 400, borderRadius: 12, padding: 20, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 15 }, children: [(0, jsx_runtime_1.jsxs)("h3", { style: { margin: 0, color: 'white', fontSize: 16 }, children: ["Adicionar a ", targetRole.name] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setIsUserPickerOpen(false), className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 18 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', marginBottom: 15 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 14, style: { position: 'absolute', left: 10, top: 10, color: '#71717a' } }), (0, jsx_runtime_1.jsx)("input", { className: "form-input", placeholder: "Buscar colaborador...", value: userSearchTerm, onChange: e => setUserSearchTerm(e.target.value), style: { width: '100%', paddingLeft: 30 }, autoFocus: true })] }), (0, jsx_runtime_1.jsxs)("div", { style: { maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }, children: [pickerUsers.slice(0, 10).map(u => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => handleAddUserToRole(u.id), style: {
                                            background: 'transparent', border: 'none', textAlign: 'left',
                                            padding: '8px 12px', color: '#e4e4e7', fontSize: 13, cursor: 'pointer',
                                            borderRadius: 6, display: 'flex', justifyContent: 'space-between'
                                        }, className: "hover:bg-zinc-800", children: [(0, jsx_runtime_1.jsx)("span", { children: u.name }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 11, color: '#71717a' }, children: u.department || 'Sem Depto' })] }, u.id))), pickerUsers.length === 0 && (0, jsx_runtime_1.jsx)("div", { style: { textAlign: 'center', color: '#52525b', fontSize: 12, padding: 10 }, children: "Nenhum usu\u00E1rio encontrado." })] })] }) }))] }) }));
};
exports.ManageStructureModal = ManageStructureModal;
