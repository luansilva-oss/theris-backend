"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageStructureModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
const ManageStructureModal = ({ isOpen, onClose, onUpdate }) => {
    const [departments, setDepartments] = (0, react_1.useState)([]);
    const [roles, setRoles] = (0, react_1.useState)([]);
    const [editingDeptId, setEditingDeptId] = (0, react_1.useState)(null);
    const [editingDeptName, setEditingDeptName] = (0, react_1.useState)('');
    const [editingRoleId, setEditingRoleId] = (0, react_1.useState)(null);
    const [editingRoleName, setEditingRoleName] = (0, react_1.useState)('');
    const [newDeptName, setNewDeptName] = (0, react_1.useState)('');
    const [newRoleName, setNewRoleName] = (0, react_1.useState)('');
    const [selectedDeptForRole, setSelectedDeptForRole] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (isOpen)
            loadData();
    }, [isOpen]);
    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/structure`);
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments);
                setRoles(data.roles);
            }
        }
        catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };
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
    const handleUpdateDept = async (id) => {
        try {
            await fetch(`${API_URL}/api/structure/departments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingDeptName })
            });
            setEditingDeptId(null);
            loadData();
            onUpdate();
        }
        catch (e) {
            alert("Erro ao atualizar.");
        }
    };
    const handleDeleteDept = async (id) => {
        if (!confirm("Excluir este departamento? (Só possível se não houver cargos vinculados)"))
            return;
        try {
            const res = await fetch(`${API_URL}/api/structure/departments/${id}`, { method: 'DELETE' });
            if (res.ok) {
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
    const handleCreateRole = async () => {
        if (!newRoleName || !selectedDeptForRole)
            return;
        try {
            await fetch(`${API_URL}/api/structure/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoleName, departmentId: selectedDeptForRole })
            });
            setNewRoleName('');
            loadData();
            onUpdate();
        }
        catch (e) {
            alert("Erro ao criar cargo.");
        }
    };
    const handleUpdateRole = async (id, deptId) => {
        try {
            await fetch(`${API_URL}/api/structure/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingRoleName, departmentId: deptId })
            });
            setEditingRoleId(null);
            loadData();
            onUpdate();
        }
        catch (e) {
            alert("Erro ao atualizar.");
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
    if (!isOpen)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '900px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building2, { size: 20, color: "#a78bfa" }), (0, jsx_runtime_1.jsx)("h2", { style: { margin: 0 }, children: "Gerenciar Estrutura Organizacional" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, padding: '10px 0' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { borderRight: '1px solid #27272a', paddingRight: 20 }, children: [(0, jsx_runtime_1.jsxs)("h3", { style: { color: 'white', fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building2, { size: 16 }), " Departamentos"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("input", { className: "form-input", placeholder: "Novo Departamento...", style: { flex: 1, fontSize: 13 }, value: newDeptName, onChange: e => setNewDeptName(e.target.value) }), (0, jsx_runtime_1.jsx)("button", { className: "btn-mini", onClick: handleCreateDept, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14 }) })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: departments.map(d => ((0, jsx_runtime_1.jsx)("div", { style: { background: '#18181b', border: '1px solid #27272a', padding: '10px 15px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: editingDeptId === d.id ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, flex: 1 }, children: [(0, jsx_runtime_1.jsx)("input", { className: "form-input", style: { flex: 1, fontSize: 13, height: 30 }, value: editingDeptName, onChange: e => setEditingDeptName(e.target.value), autoFocus: true }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => handleUpdateDept(d.id), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 16, color: "#4ade80" }) })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { style: { color: '#e4e4e7', fontSize: 14 }, children: d.name }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 4 }, children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => { setEditingDeptId(d.id); setEditingDeptName(d.name); }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit2, { size: 14, color: "#71717a" }) }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => handleDeleteDept(d.id), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#f87171" }) })] })] })) }, d.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h3", { style: { color: 'white', fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { size: 16 }), " Cargos (Roles)"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, background: '#18181b', padding: 15, borderRadius: 8, border: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsxs)("select", { className: "form-input", style: { width: '100%', fontSize: 13 }, value: selectedDeptForRole, onChange: e => setSelectedDeptForRole(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Vincular a Departamento..." }), departments.map(d => (0, jsx_runtime_1.jsx)("option", { value: d.id, children: d.name }, d.id))] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { className: "form-input", placeholder: "Nome do Cargo...", style: { flex: 1, fontSize: 13 }, value: newRoleName, onChange: e => setNewRoleName(e.target.value) }), (0, jsx_runtime_1.jsx)("button", { className: "btn-mini", onClick: handleCreateRole, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14 }) })] })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: roles.map(r => ((0, jsx_runtime_1.jsx)("div", { style: { background: '#18181b', border: '1px solid #27272a', padding: '10px 15px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: editingRoleId === r.id ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, flex: 1 }, children: [(0, jsx_runtime_1.jsx)("input", { className: "form-input", style: { flex: 1, fontSize: 13, height: 30 }, value: editingRoleName, onChange: e => setEditingRoleName(e.target.value), autoFocus: true }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => handleUpdateRole(r.id, r.departmentId), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 16, color: "#4ade80" }) })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { color: '#e4e4e7', fontSize: 14 }, children: r.name }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#71717a', fontSize: 10, textTransform: 'uppercase' }, children: departments.find(d => d.id === r.departmentId)?.name })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 4 }, children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => { setEditingRoleId(r.id); setEditingRoleName(r.name); }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit2, { size: 14, color: "#71717a" }) }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: () => handleDeleteRole(r.id), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#f87171" }) })] })] })) }, r.id))) })] })] }), (0, jsx_runtime_1.jsx)("div", { style: { marginTop: 20, borderTop: '1px solid #27272a', paddingTop: 20 }, children: (0, jsx_runtime_1.jsx)("button", { className: "btn-verify", style: { width: '100%', margin: 0 }, onClick: onClose, children: "Fechar" }) })] }) }));
};
exports.ManageStructureModal = ManageStructureModal;
