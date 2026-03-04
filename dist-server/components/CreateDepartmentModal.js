"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDepartmentModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const CreateDepartmentModal = ({ isOpen, onClose, unit, onCreated, showToast }) => {
    const [name, setName] = (0, react_1.useState)('');
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (unit)
            setName('');
    }, [unit]);
    if (!isOpen || !unit)
        return null;
    const handleCreate = async () => {
        if (!name.trim())
            return showToast('Nome do departamento é obrigatório.', 'warning');
        setIsSaving(true);
        try {
            const res = await fetch(`${config_1.API_URL}/api/structure/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), unitId: unit.id })
            });
            if (res.ok) {
                showToast('Departamento criado!', 'success');
                onCreated();
                onClose();
            }
            else {
                const data = await res.json();
                showToast(data.error || 'Erro ao criar departamento.', 'error');
            }
        }
        catch {
            showToast('Erro de conexão.', 'error');
        }
        setIsSaving(false);
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '400px' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Adicionar Departamento" }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 15 }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { color: '#a1a1aa', fontSize: 13 }, children: ["Unidade: ", (0, jsx_runtime_1.jsx)("strong", { style: { color: '#e4e4e7' }, children: unit.name })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "Nome do Departamento" }), (0, jsx_runtime_1.jsx)("input", { value: name, onChange: e => setName(e.target.value), className: "form-input", style: { width: '100%' }, placeholder: "Ex: Comercial, TI...", autoFocus: true })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCreate, disabled: isSaving, className: "btn-verify", style: { marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }, children: isSaving ? 'Criando...' : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { size: 18 }), " Criar"] }) })] })] }) }));
};
exports.CreateDepartmentModal = CreateDepartmentModal;
