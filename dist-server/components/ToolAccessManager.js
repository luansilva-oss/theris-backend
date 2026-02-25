"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolAccessManager = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const ToolAccessManager = ({ tool, tools, allUsers, onSelectTool, onUpdate, showToast, customConfirm }) => {
    const [accessLevels, setAccessLevels] = (0, react_1.useState)([]);
    const [newLevelInput, setNewLevelInput] = (0, react_1.useState)('');
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [isSavingLevels, setIsSavingLevels] = (0, react_1.useState)(false);
    react_1.default.useEffect(() => {
        if (tool) {
            setAccessLevels(tool.availableAccessLevels || ['Admin', 'User', 'Viewer']);
        }
    }, [tool?.id, tool?.availableAccessLevels]);
    if (!tool) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a', padding: 24 }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#f4f4f5', margin: '0 0 12px 0' }, children: "Acessos & Pessoas" }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#71717a', fontSize: 13, margin: 0 }, children: "Selecione uma ferramenta para gerenciar n\u00EDveis de acesso e usu\u00E1rios." }), (0, jsx_runtime_1.jsxs)("select", { value: "", onChange: e => onSelectTool(e.target.value), className: "form-input", style: { marginTop: 12, maxWidth: 320 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "\u2014 Selecione uma ferramenta \u2014" }), tools.map(t => ((0, jsx_runtime_1.jsx)("option", { value: t.id, children: t.name }, t.id)))] })] }));
    }
    const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())));
    const usersInTool = tool.accesses || [];
    const userIdsInTool = new Set(usersInTool.map(a => a.user.id));
    const saveLevels = async () => {
        setIsSavingLevels(true);
        try {
            const res = await fetch(`${config_1.API_URL}/api/tools/${tool.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ availableAccessLevels: accessLevels })
            });
            if (res.ok) {
                showToast('Níveis de acesso salvos!', 'success');
                onUpdate();
            }
            else {
                const err = await res.json();
                showToast(err.error || 'Erro ao salvar.', 'error');
            }
        }
        catch (e) {
            showToast('Erro de conexão.', 'error');
        }
        setIsSavingLevels(false);
    };
    const addUser = async (userId, level) => {
        try {
            const res = await fetch(`${config_1.API_URL}/api/tools/${tool.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, level })
            });
            if (res.ok) {
                showToast('Colaborador adicionado!', 'success');
                onUpdate();
                setSearchTerm('');
            }
            else {
                showToast('Erro ao adicionar.', 'error');
            }
        }
        catch (e) {
            showToast('Erro de conexão.', 'error');
        }
    };
    const updateUserLevel = (userId, level) => {
        addUser(userId, level);
    };
    const removeUser = (userId) => {
        customConfirm({
            title: 'Remover acesso?',
            message: 'Tem certeza que deseja remover este acesso à ferramenta?',
            isDestructive: true,
            confirmLabel: 'Remover',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${config_1.API_URL}/api/tools/${tool.id}/access/${userId}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('Acesso removido.', 'info');
                        onUpdate();
                    }
                    else {
                        showToast('Erro ao remover.', 'error');
                    }
                }
                catch (e) {
                    showToast('Erro de conexão.', 'error');
                }
            }
        });
    };
    const addLevel = () => {
        const v = newLevelInput.trim();
        if (v && !accessLevels.includes(v)) {
            setAccessLevels([...accessLevels, v]);
            setNewLevelInput('');
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a', padding: 20 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("h4", { style: { color: '#f4f4f5', margin: 0 }, children: ["Acessos & Pessoas \u2014 ", tool.name] }), (0, jsx_runtime_1.jsx)("select", { value: tool.id, onChange: e => onSelectTool(e.target.value), className: "form-input", style: { maxWidth: 280, fontSize: 13 }, children: tools.map(t => ((0, jsx_runtime_1.jsx)("option", { value: t.id, children: t.name }, t.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("h5", { style: { color: '#e4e4e7', margin: '0 0 8px 0', fontSize: 13 }, children: "N\u00EDveis de Acesso Dispon\u00EDveis" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }, children: accessLevels.map(lvl => ((0, jsx_runtime_1.jsxs)("span", { style: { background: '#3f3f46', padding: '4px 8px', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }, children: [lvl, (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setAccessLevels(accessLevels.filter(l => l !== lvl)), style: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 12 }) })] }, lvl))) }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { value: newLevelInput, onChange: e => setNewLevelInput(e.target.value), onKeyDown: e => e.key === 'Enter' && addLevel(), placeholder: "Novo n\u00EDvel (ex: Auditor)", className: "form-input", style: { flex: 1, fontSize: 13, height: 36 } }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: addLevel, className: "btn-mini", children: "Adicionar e Salvar" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: saveLevels, disabled: isSavingLevels, className: "btn-verify", style: { marginTop: 10, padding: '8px 16px', fontSize: 13 }, children: isSavingLevels ? 'Salvando...' : 'Salvar Níveis e Alterações' })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsx)("h5", { style: { color: '#e4e4e7', margin: '0 0 8px 0', fontSize: 13 }, children: "Adicionar Usu\u00E1rio ao Sistema" }), (0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 14, style: { position: 'absolute', left: 10, top: 12, color: '#71717a' } }), (0, jsx_runtime_1.jsx)("input", { value: searchTerm, onChange: e => setSearchTerm(e.target.value), placeholder: "Buscar pessoa...", className: "form-input", style: { width: '100%', paddingLeft: 30, fontSize: 14 } }), searchTerm && ((0, jsx_runtime_1.jsx)("div", { style: { position: 'absolute', top: 42, left: 0, right: 0, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto' }, children: filteredUsers
                                    .filter(u => !userIdsInTool.has(u.id))
                                    .slice(0, 8)
                                    .map(u => ((0, jsx_runtime_1.jsx)("div", { onClick: () => addUser(u.id, accessLevels[0] || 'User'), style: { padding: '8px 12px', borderBottom: '1px solid #27272a', cursor: 'pointer', fontSize: 13, color: '#d4d4d8' }, children: u.name }, u.id))) }))] })] }), (0, jsx_runtime_1.jsx)("div", { style: { overflow: 'hidden', border: '1px solid #27272a', borderRadius: 8 }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { style: { background: '#27272a', color: '#a1a1aa' }, children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: 10, textAlign: 'left' }, children: "Usu\u00E1rio" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: 10, textAlign: 'left' }, children: "N\u00EDvel Atual" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: 10, width: 44 } })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: usersInTool.map(acc => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #27272a', color: '#e4e4e7' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: 10 }, children: acc.user.name }), (0, jsx_runtime_1.jsx)("td", { style: { padding: 10 }, children: (0, jsx_runtime_1.jsx)("select", { value: acc.status, onChange: e => updateUserLevel(acc.user.id, e.target.value), style: { background: '#27272a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: 12 }, children: accessLevels.map(l => (0, jsx_runtime_1.jsx)("option", { value: l, children: l }, l)) }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: 10 }, children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeUser(acc.user.id), style: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14 }) }) })] }, acc.user.id))) })] }) })] }));
};
exports.ToolAccessManager = ToolAccessManager;
