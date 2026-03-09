"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const TIPO_OPTIONS_GROUPS = [
    { label: 'Todos os eventos', options: ['Todos'] },
    { label: 'Autenticação', options: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'SESSION_EXPIRED', 'MFA_SENT', 'MFA_FAILED'] },
    { label: 'Gestão de Pessoas', options: ['USER_CREATED', 'USER_UPDATED', 'USER_ACTIVATED', 'USER_ROLE_CHANGED', 'USER_MANAGER_CHANGED', 'USER_OFFBOARDED', 'USER_KBS_CHANGE', 'USER_STATUS_CHANGE'] },
    { label: 'Estrutura', options: ['DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED', 'UNIT_CREATED', 'UNIT_UPDATED', 'UNIT_DELETED', 'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED', 'ROLE_DEPARTMENT_CHANGE', 'KBS_UPDATED'] },
    { label: 'Acessos (AEX)', options: ['AEX_CREATED', 'AEX_OWNER_APPROVED', 'AEX_OWNER_REJECTED', 'AEX_SI_APPROVED', 'AEX_SI_REJECTED', 'AEX_APPROVED', 'AEX_AUTO_REJECTED'] },
    { label: 'Chamados', options: ['TICKET_CREATED', 'TICKET_ASSIGNED', 'TICKET_COMMENTED', 'TICKET_RESOLVED', 'TICKET_REOPENED'] },
    { label: 'Sessões', options: ['SESSION_REVOKED', 'BULK_SESSION_REVOKED', 'SESSION_EXPIRED'] },
    { label: 'Sistema', options: ['REPORT_EXPORTED', 'CHANGE_ROLE'] },
];
const ENTIDADE_OPTIONS = ['Role', 'User', 'Department', 'Unit', 'Request', 'System'];
function getBadgeColor(tipo) {
    const verde = ['LOGIN_SUCCESS', 'USER_CREATED', 'USER_ACTIVATED', 'AEX_APPROVED', 'TICKET_RESOLVED', 'DEPARTMENT_CREATED', 'UNIT_CREATED', 'ROLE_CREATED', 'KBS_UPDATED'];
    const vermelho = ['LOGIN_FAILED', 'MFA_FAILED', 'SESSION_EXPIRED', 'USER_OFFBOARDED', 'AEX_OWNER_REJECTED', 'AEX_SI_REJECTED', 'AEX_AUTO_REJECTED', 'DEPARTMENT_DELETED', 'UNIT_DELETED', 'ROLE_DELETED', 'SESSION_REVOKED', 'BULK_SESSION_REVOKED', 'TICKET_REOPENED'];
    const azul = ['AEX_CREATED', 'TICKET_CREATED', 'MFA_SENT', 'CHANGE_ROLE'];
    const amarelo = ['USER_UPDATED', 'USER_ROLE_CHANGED', 'USER_MANAGER_CHANGED', 'TICKET_ASSIGNED', 'TICKET_COMMENTED', 'DEPARTMENT_UPDATED', 'UNIT_UPDATED', 'ROLE_UPDATED', 'AEX_OWNER_APPROVED', 'AEX_SI_APPROVED', 'REPORT_EXPORTED'];
    if (verde.includes(tipo))
        return '#22c55e';
    if (vermelho.includes(tipo))
        return '#ef4444';
    if (azul.includes(tipo))
        return '#0EA5E9';
    if (amarelo.includes(tipo))
        return '#eab308';
    if (tipo.startsWith('ROLE_'))
        return '#3b82f6';
    if (tipo.startsWith('USER_'))
        return '#0EA5E9';
    if (tipo.startsWith('DEPARTMENT_'))
        return '#eab308';
    if (tipo.startsWith('UNIT_'))
        return '#22c55e';
    return '#71717a';
}
function getEntityLabel(item) {
    const d = item.dadosDepois;
    const a = item.dadosAntes;
    const name = d?.name ?? a?.name ?? d?.ferramenta ?? d?.toolName ?? item.entidadeId.slice(0, 8);
    return `${item.entidadeTipo} • ${name}`;
}
const SENSITIVE_KEYS = new Set([
    'mfaCode', 'mfaExpiresAt', 'lastPasswordChangeAt',
    'senha', 'password', 'hash', 'passwordHash', 'token', 'secret'
]);
function filterSensitive(obj) {
    if (obj == null || typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj))
        return obj.map(filterSensitive);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const lower = k.toLowerCase();
        if (SENSITIVE_KEYS.has(k) || lower.includes('senha') || lower.includes('password') || lower.includes('hash') || lower.includes('token') || lower.includes('secret'))
            continue;
        out[k] = filterSensitive(v);
    }
    return out;
}
function formatJson(obj) {
    if (obj == null)
        return '—';
    try {
        const filtered = filterSensitive(obj);
        return JSON.stringify(filtered, null, 2);
    }
    catch {
        return String(obj);
    }
}
function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
const AuditLog = ({ initialEntidadeId, initialEntidadeTipo }) => {
    const [items, setItems] = (0, react_1.useState)([]);
    const [total, setTotal] = (0, react_1.useState)(0);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [selected, setSelected] = (0, react_1.useState)(null);
    const [limit] = (0, react_1.useState)(20);
    const [offset, setOffset] = (0, react_1.useState)(0);
    const refDataInicio = (0, react_1.useRef)(null);
    const refDataFim = (0, react_1.useRef)(null);
    const [filtros, setFiltros] = (0, react_1.useState)({
        search: '',
        tipo: 'Todos',
        entidadeTipo: initialEntidadeTipo || '',
        dataInicio: '',
        dataFim: '',
        autorNome: '',
        entidadeId: initialEntidadeId || '',
    });
    const fetchData = (0, react_1.useCallback)(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        params.set('offset', String(offset));
        if (filtros.entidadeId)
            params.set('entidadeId', filtros.entidadeId);
        if (filtros.entidadeTipo)
            params.set('entidadeTipo', filtros.entidadeTipo);
        if (filtros.tipo && filtros.tipo !== 'Todos')
            params.set('tipo', filtros.tipo);
        if (filtros.search.trim())
            params.set('search', filtros.search.trim());
        if (filtros.dataInicio)
            params.set('dataInicio', new Date(filtros.dataInicio).toISOString());
        if (filtros.dataFim)
            params.set('dataFim', new Date(filtros.dataFim + 'T23:59:59').toISOString());
        if (filtros.autorNome.trim())
            params.set('autorNome', filtros.autorNome.trim());
        try {
            const res = await fetch(`${config_1.API_URL}/api/audit-log?${params}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
                setTotal(data.total ?? 0);
            }
            else {
                setItems([]);
                setTotal(0);
            }
        }
        catch {
            setItems([]);
            setTotal(0);
        }
        finally {
            setLoading(false);
        }
    }, [limit, offset, filtros]);
    (0, react_1.useEffect)(() => { fetchData(); }, [fetchData]);
    (0, react_1.useEffect)(() => {
        if (initialEntidadeId)
            setFiltros(prev => ({ ...prev, entidadeId: initialEntidadeId }));
        if (initialEntidadeTipo)
            setFiltros(prev => ({ ...prev, entidadeTipo: initialEntidadeTipo }));
    }, [initialEntidadeId, initialEntidadeTipo]);
    const from = offset + 1;
    const to = Math.min(offset + limit, total);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fade-in", style: { padding: '0 24px 24px' }, children: [(0, jsx_runtime_1.jsxs)("h2", { style: { color: 'white', fontSize: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { size: 24 }), " Hist\u00F3rico de Mudan\u00E7as"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, background: '#18181b', padding: 16, borderRadius: 12, border: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', flex: '1 1 200px' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 16, style: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a' } }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Buscar na descri\u00E7\u00E3o...", className: "form-input", style: { paddingLeft: 36, width: '100%' }, value: filtros.search, onChange: e => setFiltros(prev => ({ ...prev, search: e.target.value })) })] }), (0, jsx_runtime_1.jsx)("select", { className: "form-input", style: { width: 'auto', minWidth: 200 }, value: filtros.tipo, onChange: e => setFiltros(prev => ({ ...prev, tipo: e.target.value })), children: TIPO_OPTIONS_GROUPS.map(gr => ((0, jsx_runtime_1.jsx)("optgroup", { label: gr.label, children: gr.options.map(o => ((0, jsx_runtime_1.jsx)("option", { value: o, children: o === 'Todos' ? 'Todos os eventos' : o }, o))) }, gr.label))) }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", style: { width: 'auto', minWidth: 140 }, value: filtros.entidadeTipo, onChange: e => setFiltros(prev => ({ ...prev, entidadeTipo: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Entidade: Todas" }), ENTIDADE_OPTIONS.map(o => (0, jsx_runtime_1.jsx)("option", { value: o, children: o }, o))] }), (0, jsx_runtime_1.jsx)("div", { className: "date-wrapper", onClick: () => refDataInicio.current?.showPicker?.(), style: { cursor: 'pointer', width: 150 }, children: (0, jsx_runtime_1.jsx)("input", { ref: refDataInicio, type: "date", className: "form-input", style: { pointerEvents: 'none', width: '100%' }, value: filtros.dataInicio, onChange: e => setFiltros(prev => ({ ...prev, dataInicio: e.target.value })) }) }), (0, jsx_runtime_1.jsx)("div", { className: "date-wrapper", onClick: () => refDataFim.current?.showPicker?.(), style: { cursor: 'pointer', width: 150 }, children: (0, jsx_runtime_1.jsx)("input", { ref: refDataFim, type: "date", className: "form-input", style: { pointerEvents: 'none', width: '100%' }, value: filtros.dataFim, onChange: e => setFiltros(prev => ({ ...prev, dataFim: e.target.value })) }) }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Nome do autor", className: "form-input", style: { width: 160 }, value: filtros.autorNome, onChange: e => setFiltros(prev => ({ ...prev, autorNome: e.target.value })) }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: fetchData, className: "btn-verify", style: { padding: '8px 16px' }, children: "Filtrar" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }, children: [loading ? ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 40, textAlign: 'center', color: '#71717a' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { height: 4, background: '#27272a', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }, children: (0, jsx_runtime_1.jsx)("div", { style: { width: '30%', height: '100%', background: '#52525b', animation: 'pulse 1.5s ease-in-out infinite' } }) }), "Carregando..."] })) : items.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 48, textAlign: 'center', color: '#71717a' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 48, style: { opacity: 0.5, marginBottom: 16 } }), (0, jsx_runtime_1.jsx)("div", { children: "Nenhum registro encontrado." })] })) : ((0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #27272a', color: '#a1a1aa' }, children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', fontWeight: 600 }, children: "Data/Hora" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', fontWeight: 600 }, children: "Tipo de Evento" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', fontWeight: 600 }, children: "Entidade" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', fontWeight: 600 }, children: "Descri\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', fontWeight: 600 }, children: "Autor" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: items.map(row => ((0, jsx_runtime_1.jsxs)("tr", { onClick: () => setSelected(row), style: {
                                        borderBottom: '1px solid #27272a',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                    }, onMouseEnter: e => { e.currentTarget.style.background = '#27272a'; }, onMouseLeave: e => { e.currentTarget.style.background = 'transparent'; }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#e4e4e7' }, children: formatDate(row.createdAt) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px' }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                                                    display: 'inline-block',
                                                    padding: '4px 10px',
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background: `${getBadgeColor(row.tipo)}22`,
                                                    color: getBadgeColor(row.tipo),
                                                }, children: row.tipo }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#e4e4e7' }, children: getEntityLabel(row) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#a1a1aa', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: row.descricao }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#e4e4e7' }, children: row.autor?.name || 'Sistema' })] }, row.id))) })] })), total > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '12px 16px', borderTop: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: '#71717a', fontSize: 12 }, children: ["Exibindo ", from, "\u2013", to, " de ", total, " registros"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setOffset(Math.max(0, offset - limit)), disabled: offset === 0, className: "form-input", style: { minWidth: 100, padding: '8px 12px', textAlign: 'center', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.5 : 1 }, children: "Anterior" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setOffset(offset + limit), disabled: offset + limit >= total, className: "form-input", style: { minWidth: 100, padding: '8px 12px', textAlign: 'center', cursor: offset + limit >= total ? 'not-allowed' : 'pointer', opacity: offset + limit >= total ? 0.5 : 1 }, children: "Pr\u00F3ximo" })] })] }))] }), selected && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { onClick: () => setSelected(null), style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, animation: 'fadeIn 0.2s' } }), (0, jsx_runtime_1.jsx)("div", { style: {
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: 'min(480px, 100%)',
                            background: '#18181b',
                            borderLeft: '1px solid #27272a',
                            zIndex: 1000,
                            overflowY: 'auto',
                            animation: 'slideInRight 0.25s ease-out',
                        }, children: (0, jsx_runtime_1.jsxs)("div", { style: { padding: 24 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { color: 'white', margin: 0, fontSize: 18 }, children: "Detalhe do registro" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setSelected(null), className: "btn-icon", type: "button", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "Data/Hora" }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#f4f4f5' }, children: formatDate(selected.createdAt) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "Tipo" }), (0, jsx_runtime_1.jsx)("span", { style: {
                                                        padding: '4px 10px',
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        background: `${getBadgeColor(selected.tipo)}22`,
                                                        color: getBadgeColor(selected.tipo),
                                                    }, children: selected.tipo })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "Entidade" }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#f4f4f5' }, children: getEntityLabel(selected) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "Descri\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#f4f4f5' }, children: selected.descricao })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "Autor" }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#f4f4f5' }, children: selected.autor?.name || 'Sistema' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "Antes" }), (0, jsx_runtime_1.jsx)("pre", { style: {
                                                        background: '#09090b',
                                                        padding: 12,
                                                        borderRadius: 8,
                                                        fontSize: 11,
                                                        color: '#a1a1aa',
                                                        overflow: 'auto',
                                                        margin: 0,
                                                        border: '1px solid #27272a',
                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                                                    }, children: formatJson(selected.dadosAntes) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "Depois" }), (0, jsx_runtime_1.jsx)("pre", { style: {
                                                        background: '#09090b',
                                                        padding: 12,
                                                        borderRadius: 8,
                                                        fontSize: 11,
                                                        color: '#a1a1aa',
                                                        overflow: 'auto',
                                                        margin: 0,
                                                        border: '1px solid #27272a',
                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                                                    }, children: formatJson(selected.dadosDepois) })] })] })] }) })] })), (0, jsx_runtime_1.jsx)("style", { children: `
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      ` })] }));
};
exports.AuditLog = AuditLog;
