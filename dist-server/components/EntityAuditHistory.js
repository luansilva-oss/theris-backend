"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityAuditHistory = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
function getBadgeColor(tipo) {
    if (tipo.startsWith('ROLE_'))
        return '#3b82f6';
    if (tipo.startsWith('USER_'))
        return '#8b5cf6';
    if (tipo.startsWith('DEPARTMENT_'))
        return '#eab308';
    if (tipo.startsWith('UNIT_'))
        return '#22c55e';
    return '#71717a';
}
function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
const EntityAuditHistory = ({ entidadeId, entidadeTipo, limit = 5, onOpenFullHistory, }) => {
    const [items, setItems] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        if (!entidadeId || !entidadeTipo)
            return;
        setLoading(true);
        fetch(`${config_1.API_URL}/api/audit-log?entidadeId=${encodeURIComponent(entidadeId)}&entidadeTipo=${encodeURIComponent(entidadeTipo)}&limit=${limit}`)
            .then(r => r.ok ? r.json() : { items: [] })
            .then(data => setItems(data.items || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [entidadeId, entidadeTipo, limit]);
    if (loading) {
        return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 12, color: '#71717a', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { size: 14, style: { marginRight: 8, verticalAlign: 'middle' } }), "Carregando hist\u00F3rico..."] }));
    }
    if (items.length === 0) {
        return ((0, jsx_runtime_1.jsx)("div", { style: { padding: 12, color: '#71717a', fontSize: 13 }, children: "Nenhum registro de auditoria para esta entidade." }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { style: { borderTop: '1px solid #27272a', paddingTop: 12, marginTop: 12 }, children: [(0, jsx_runtime_1.jsxs)("h5", { style: { color: '#a1a1aa', fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { size: 14 }), " Hist\u00F3rico recente"] }), (0, jsx_runtime_1.jsx)("ul", { style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }, children: items.map((row) => ((0, jsx_runtime_1.jsxs)("li", { style: { fontSize: 12, color: '#e4e4e7' }, children: [(0, jsx_runtime_1.jsx)("span", { style: {
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                background: `${getBadgeColor(row.tipo)}22`,
                                color: getBadgeColor(row.tipo),
                                marginRight: 8,
                            }, children: row.tipo }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#a1a1aa' }, children: formatDate(row.createdAt) }), (0, jsx_runtime_1.jsxs)("span", { style: { marginLeft: 8 }, children: ["\u2014 ", row.descricao] })] }, row.id))) }), onOpenFullHistory && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onOpenFullHistory({ entidadeId, entidadeTipo }), style: {
                    marginTop: 10,
                    background: 'transparent',
                    border: 'none',
                    color: '#a78bfa',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: 0,
                }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 12 }), " Ver hist\u00F3rico completo"] }))] }));
};
exports.EntityAuditHistory = EntityAuditHistory;
