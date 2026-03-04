"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditUnitModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const EditUnitModal = ({ isOpen, onClose, unit, onUpdated, showToast }) => {
    const [name, setName] = (0, react_1.useState)('');
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (unit)
            setName(unit.name);
    }, [unit]);
    if (!isOpen || !unit)
        return null;
    const handleSave = async () => {
        if (!name.trim())
            return showToast('Nome é obrigatório.', 'warning');
        setIsSaving(true);
        try {
            const res = await fetch(`${config_1.API_URL}/api/structure/units/${unit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() })
            });
            if (res.ok) {
                showToast('Unidade atualizada!', 'success');
                onUpdated();
                onClose();
            }
            else {
                const data = await res.json();
                showToast(data.error || 'Erro ao atualizar unidade.', 'error');
            }
        }
        catch {
            showToast('Erro de conexão.', 'error');
        }
        setIsSaving(false);
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '400px' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Editar Unidade" }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 15 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "Nome da Unidade" }), (0, jsx_runtime_1.jsx)("input", { value: name, onChange: e => setName(e.target.value), className: "form-input", style: { width: '100%' }, autoFocus: true })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSave, disabled: isSaving, className: "btn-verify", style: { marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }, children: isSaving ? 'Salvando...' : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { size: 18 }), " Salvar"] }) })] })] }) }));
};
exports.EditUnitModal = EditUnitModal;
