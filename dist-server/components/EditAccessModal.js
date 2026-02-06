"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditAccessModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const EditAccessModal = ({ isOpen, onClose, access, toolId, onUpdate }) => {
    const [duration, setDuration] = (0, react_1.useState)('');
    const [unit, setUnit] = (0, react_1.useState)('horas');
    const [isExtraordinary, setIsExtraordinary] = (0, react_1.useState)(true);
    const [loading, setLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (access) {
            setDuration(access.duration?.toString() || '');
            setUnit(access.unit || 'horas');
            setIsExtraordinary(access.isExtraordinary);
        }
    }, [access]);
    if (!isOpen)
        return null;
    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tools/${toolId}/access/${access.user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isExtraordinary,
                    duration: duration || null,
                    unit
                })
            });
            if (res.ok) {
                onUpdate();
                onClose();
            }
            else {
                alert("Erro ao atualizar acesso.");
            }
        }
        catch (e) {
            console.error(e);
            alert("Erro de conexão.");
        }
        setLoading(false);
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '400px' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h3", { children: ["Editar Acesso: ", access?.user?.name] }), (0, jsx_runtime_1.jsx)("button", { className: "btn-icon", onClick: onClose, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20, color: "#71717a" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "modal-body", style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", id: "isExtra", checked: isExtraordinary, onChange: (e) => setIsExtraordinary(e.target.checked), style: { width: '18px', height: '18px', accentColor: '#a78bfa' } }), (0, jsx_runtime_1.jsx)("label", { htmlFor: "isExtra", style: { color: 'white', cursor: 'pointer' }, children: "\u00C9 um acesso extraordin\u00E1rio (tempor\u00E1rio)?" })] }), isExtraordinary && ((0, jsx_runtime_1.jsxs)("div", { style: { background: 'rgba(124, 58, 237, 0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(124, 58, 237, 0.1)' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { color: '#a1a1aa', fontSize: 12, marginBottom: 8, display: 'block' }, children: "Dura\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("input", { type: "number", className: "form-input", style: { height: '40px' }, value: duration, onChange: (e) => setDuration(e.target.value), placeholder: "Ex: 48" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { color: '#a1a1aa', fontSize: 12, marginBottom: 8, display: 'block' }, children: "Unidade" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", style: { height: '40px' }, value: unit, onChange: (e) => setUnit(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "horas", style: { background: '#18181b' }, children: "Horas" }), (0, jsx_runtime_1.jsx)("option", { value: "dias", style: { background: '#18181b' }, children: "Dias" }), (0, jsx_runtime_1.jsx)("option", { value: "meses", style: { background: '#18181b' }, children: "Meses" })] })] })] }), (0, jsx_runtime_1.jsxs)("p", { style: { color: '#71717a', fontSize: 11, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { size: 12 }), " Isso ajudar\u00E1 S/I a gerenciar revoga\u00E7\u00F5es manuais ou autom\u00E1ticas."] })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "modal-footer", style: { borderTop: '1px solid #27272a', paddingTop: 16, marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }, children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-text", onClick: onClose, disabled: loading, children: "Cancelar" }), (0, jsx_runtime_1.jsxs)("button", { className: "btn-mini approve", style: { height: '40px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8 }, onClick: handleSave, disabled: loading, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { size: 16 }), " ", loading ? 'Salvando...' : 'Salvar Alterações'] })] })] }) }));
};
exports.EditAccessModal = EditAccessModal;
