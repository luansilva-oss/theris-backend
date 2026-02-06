"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditUserModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
const EditUserModal = ({ isOpen, onClose, user, onUpdate, currentUser }) => {
    if (!isOpen)
        return null;
    const [name, setName] = (0, react_1.useState)(user.name);
    const [email, setEmail] = (0, react_1.useState)(user.email);
    const [jobTitle, setJobTitle] = (0, react_1.useState)(user.jobTitle);
    const [department, setDepartment] = (0, react_1.useState)(user.department);
    const [systemProfile, setSystemProfile] = (0, react_1.useState)(user.systemProfile || 'VIEWER');
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [availableDepts, setAvailableDepts] = (0, react_1.useState)([]);
    const [availableRoles, setAvailableRoles] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        setName(user.name);
        setEmail(user.email);
        setJobTitle(user.jobTitle);
        setDepartment(user.department);
        setSystemProfile(user.systemProfile || 'VIEWER');
        loadStructure();
    }, [user]);
    const loadStructure = async () => {
        try {
            const res = await fetch(`${API_URL}/api/structure`);
            if (res.ok) {
                const data = await res.json();
                setAvailableDepts(data.departments);
                setAvailableRoles(data.roles);
            }
        }
        catch (e) {
            console.error(e);
        }
    };
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-requester-id': currentUser.id
                },
                body: JSON.stringify({ name, email, jobTitle, department, systemProfile })
            });
            if (res.ok) {
                onUpdate();
                onClose();
            }
            else {
                const err = await res.json();
                alert(err.error || "Erro ao salvar alterações.");
            }
        }
        catch (error) {
            console.error(error);
            alert("Erro de rede ao salvar.");
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
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '500px' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Editar Colaborador" }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Nome Completo" }), (0, jsx_runtime_1.jsx)("input", { className: "form-input", value: name, onChange: (e) => setName(e.target.value) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "E-mail" }), (0, jsx_runtime_1.jsx)("input", { className: "form-input", value: email, onChange: (e) => setEmail(e.target.value) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Departamento" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", value: department, onChange: (e) => setDepartment(e.target.value), style: { width: '100%', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), availableDepts.map(d => (0, jsx_runtime_1.jsx)("option", { value: d.name, children: d.name }, d.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Cargo" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", value: jobTitle, onChange: (e) => setJobTitle(e.target.value), style: { width: '100%', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), availableRoles
                                            .filter(r => !department || r.departmentId === availableDepts.find(d => d.name === department)?.id)
                                            .map(r => (0, jsx_runtime_1.jsx)("option", { value: r.name, children: r.name }, r.id))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Perfil de Sistema (Acesso)" }), (0, jsx_runtime_1.jsx)("select", { className: "form-input", value: systemProfile, onChange: (e) => setSystemProfile(e.target.value), children: profileOptions.map(opt => ((0, jsx_runtime_1.jsx)("option", { value: opt.value, style: { background: '#18181b' }, children: opt.label }, opt.value))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '20px', display: 'flex', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-verify", style: { margin: 0, flex: 1 }, disabled: isSaving, onClick: handleSave, children: isSaving ? 'Salvando...' : 'Salvar Alterações' }), (0, jsx_runtime_1.jsx)("button", { className: "btn-verify", style: { margin: 0, background: 'transparent', border: '1px solid #374151', color: '#9CA3AF' }, onClick: onClose, children: "Cancelar" })] })] }) }));
};
exports.EditUserModal = EditUserModal;
