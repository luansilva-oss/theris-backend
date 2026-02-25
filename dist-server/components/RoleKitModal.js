"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleKitModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const RoleKitModal = ({ isOpen, onClose, roleId, roleName, departmentName, onUpdate, showToast }) => {
    const [items, setItems] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [saving, setSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (isOpen && roleId) {
            setLoading(true);
            fetch(`${config_1.API_URL}/api/structure/roles/${roleId}/kit`)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then((data) => {
                setItems((data.kitItems || []).map(k => ({
                    toolCode: k.toolCode,
                    toolName: k.toolName,
                    accessLevelDesc: k.accessLevelDesc ?? '',
                    criticality: k.criticality ?? '',
                    isCritical: k.isCritical !== false
                })));
            })
                .catch(() => {
                setItems([]);
                showToast('Erro ao carregar kit do cargo.', 'error');
            })
                .finally(() => setLoading(false));
        }
    }, [isOpen, roleId, showToast]);
    const addRow = () => {
        setItems(prev => [...prev, { toolCode: '', toolName: '', accessLevelDesc: '', criticality: '', isCritical: true }]);
    };
    const removeRow = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };
    const updateRow = (index, field, value) => {
        setItems(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    };
    const handleSave = async () => {
        if (!roleId)
            return;
        setSaving(true);
        try {
            const payload = items
                .filter(it => (it.toolCode || '').trim() || (it.toolName || '').trim())
                .map(it => ({
                toolCode: (it.toolCode || '').trim() || '-',
                toolName: (it.toolName || '').trim() || '-',
                accessLevelDesc: (it.accessLevelDesc || '').trim() || undefined,
                criticality: (it.criticality || '').trim() || undefined,
                isCritical: it.isCritical !== false
            }));
            const res = await fetch(`${config_1.API_URL}/api/structure/roles/${roleId}/kit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: payload })
            });
            if (res.ok) {
                showToast('Kit do cargo atualizado!', 'success');
                onUpdate();
                onClose();
            }
            else {
                const err = await res.json();
                showToast(err.error || 'Erro ao salvar.', 'error');
            }
        }
        catch (e) {
            showToast('Erro de rede.', 'error');
        }
        setSaving(false);
    };
    if (!isOpen)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", onClick: onClose, children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '720px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }, onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", style: { flexShrink: 0 }, children: [(0, jsx_runtime_1.jsxs)("h2", { style: { color: '#f4f4f5' }, children: ["Kit B\u00E1sico do Cargo \u2014 ", roleName] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsx)("div", { style: { padding: '0 24px', fontSize: 12, color: '#71717a', marginBottom: 12 }, children: departmentName }), loading ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 40, textAlign: 'center', color: '#71717a' }, children: "Carregando..." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflow: 'auto', padding: '0 24px 24px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }, children: (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: addRow, className: "btn-mini", style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14 }), " Adicionar ferramenta"] }) }), (0, jsx_runtime_1.jsx)("div", { style: { border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: '#18181b', color: '#a1a1aa' }, children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: 10, textAlign: 'left' }, children: "C\u00F3digo" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: 10, textAlign: 'left' }, children: "Ferramenta" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: 10, textAlign: 'left' }, children: "N\u00EDvel de Acesso" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: 10, textAlign: 'left' }, children: "Criticidade" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: 10, width: 40 } })] }) }), (0, jsx_runtime_1.jsxs)("tbody", { children: [items.length === 0 && ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: 5, style: { padding: 24, textAlign: 'center', color: '#52525b' }, children: "Nenhuma ferramenta no kit. Clique em \"Adicionar ferramenta\"." }) })), items.map((row, index) => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderTop: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: 8 }, children: (0, jsx_runtime_1.jsx)("input", { className: "form-input", value: row.toolCode, onChange: e => updateRow(index, 'toolCode', e.target.value), placeholder: "Ex: ap_CK-1", style: { width: '100%', fontSize: 12 } }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: 8 }, children: (0, jsx_runtime_1.jsx)("input", { className: "form-input", value: row.toolName, onChange: e => updateRow(index, 'toolName', e.target.value), placeholder: "Ex: ClickUp", style: { width: '100%', fontSize: 12 } }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: 8 }, children: (0, jsx_runtime_1.jsx)("input", { className: "form-input", value: row.accessLevelDesc || '', onChange: e => updateRow(index, 'accessLevelDesc', e.target.value), placeholder: "Descritivo oficial", style: { width: '100%', fontSize: 12 } }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: 8 }, children: (0, jsx_runtime_1.jsx)("input", { className: "form-input", value: row.criticality || '', onChange: e => updateRow(index, 'criticality', e.target.value), placeholder: "Alta / M\u00E9dia / Baixa", style: { width: '100%', fontSize: 12 } }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: 8 }, children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeRow(index), style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#ef4444" }) }) })] }, index)))] })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: 16, borderTop: '1px solid #27272a', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "btn-verify", style: { background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa' }, children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSave, disabled: saving, className: "btn-verify", children: saving ? 'Salvando...' : 'Salvar Kit' })] })] }))] }) }));
};
exports.RoleKitModal = RoleKitModal;
