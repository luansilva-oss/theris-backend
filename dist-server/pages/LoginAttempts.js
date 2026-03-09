"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginAttempts = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const FAIL_REASON_LABELS = {
    GOOGLE_AUTH_FAILED: 'Falha no Google',
    DOMAIN_DENIED: 'Domínio negado',
    USER_NOT_FOUND: 'Usuário não encontrado',
    MFA_SEND_FAILED: 'Falha ao enviar MFA',
    MFA_INVALID: 'Código MFA inválido',
    MFA_EXPIRED: 'Código MFA expirado',
    RATE_LIMITED: 'Rate limit',
};
function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}
const LoginAttempts = ({ currentUserId }) => {
    const [items, setItems] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [onlyFailed, setOnlyFailed] = (0, react_1.useState)(false);
    const [filterEmail, setFilterEmail] = (0, react_1.useState)('');
    const [filterIp, setFilterIp] = (0, react_1.useState)('');
    const [filterSince, setFilterSince] = (0, react_1.useState)('');
    const fetchAttempts = () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('limit', '100');
        params.set('page', '1');
        if (onlyFailed)
            params.set('onlyFailed', 'true');
        if (filterEmail.trim())
            params.set('email', filterEmail.trim());
        if (filterIp.trim())
            params.set('ip', filterIp.trim());
        if (filterSince.trim())
            params.set('since', filterSince.trim());
        fetch(`${config_1.API_URL}/api/admin/login-attempts?${params}`, {
            credentials: 'include',
            headers: { 'x-user-id': currentUserId }
        })
            .then((r) => {
            if (r.status === 403)
                throw new Error('Acesso negado');
            return r.json();
        })
            .then((data) => setItems(data.items || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    };
    (0, react_1.useEffect)(() => {
        fetchAttempts();
    }, [onlyFailed, currentUserId]);
    const failedByIpLast24h = (0, react_1.useMemo)(() => {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const count = {};
        items.forEach((i) => {
            if (!i.success && new Date(i.createdAt).getTime() >= since) {
                count[i.ipAddress] = (count[i.ipAddress] || 0) + 1;
            }
        });
        return count;
    }, [items]);
    const suspiciousIps = (0, react_1.useMemo)(() => {
        const set = new Set();
        Object.entries(failedByIpLast24h).forEach(([ip, n]) => {
            if (n > 5)
                set.add(ip);
        });
        return set;
    }, [failedByIpLast24h]);
    const filteredItems = (0, react_1.useMemo)(() => {
        let list = items;
        if (filterEmail.trim()) {
            const q = filterEmail.trim().toLowerCase();
            list = list.filter((i) => (i.email || '').toLowerCase().includes(q));
        }
        if (filterIp.trim()) {
            const q = filterIp.trim();
            list = list.filter((i) => i.ipAddress.includes(q));
        }
        if (filterSince.trim()) {
            const since = new Date(filterSince).getTime();
            list = list.filter((i) => new Date(i.createdAt).getTime() >= since);
        }
        return list;
    }, [items, filterEmail, filterIp, filterSince]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { padding: 24 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }, children: [(0, jsx_runtime_1.jsxs)("h2", { style: { margin: 0, fontSize: 18, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { size: 20, color: "#0EA5E9" }), " Tentativas de Login"] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: fetchAttempts, disabled: loading, className: "btn-mini", style: { background: '#1E293B', border: '1px solid #334155', color: '#e2e8f0' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 14, style: { marginRight: 6 } }), " Atualizar"] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: onlyFailed, onChange: (e) => setOnlyFailed(e.target.checked) }), "Apenas falhas"] }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#64748b', fontSize: 12 }, children: "|" }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Filtrar e-mail", value: filterEmail, onChange: (e) => setFilterEmail(e.target.value), className: "form-input", style: { width: 180, padding: '8px 12px', fontSize: 12 } }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Filtrar IP", value: filterIp, onChange: (e) => setFilterIp(e.target.value), className: "form-input", style: { width: 140, padding: '8px 12px', fontSize: 12 } }), (0, jsx_runtime_1.jsx)("input", { type: "datetime-local", placeholder: "Desde", value: filterSince, onChange: (e) => setFilterSince(e.target.value), className: "form-input", style: { width: 200, padding: '8px 12px', fontSize: 12 } })] }), loading ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 40, textAlign: 'center', color: '#64748b' }, children: "Carregando..." })) : ((0, jsx_runtime_1.jsx)("div", { style: { overflowX: 'auto' }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #334155' }, children: [(0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "Data/Hora" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "E-mail" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "IP" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "Resultado" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "Motivo" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "User Agent" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: filteredItems.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: 6, style: { padding: 24, color: '#64748b', textAlign: 'center' }, children: "Nenhum registro encontrado." }) })) : (filteredItems.map((row) => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #334155' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', color: '#e2e8f0' }, children: formatDate(row.createdAt) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', color: '#e2e8f0' }, children: row.email || '—' }), (0, jsx_runtime_1.jsxs)("td", { style: { padding: '10px 12px' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { color: '#e2e8f0' }, children: row.ipAddress }), suspiciousIps.has(row.ipAddress) && ((0, jsx_runtime_1.jsx)("span", { style: { marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 600 }, children: "IP suspeito" }))] }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px' }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                                                padding: '4px 8px',
                                                borderRadius: 4,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                background: row.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: row.success ? '#22c55e' : '#ef4444'
                                            }, children: row.success ? 'Sucesso' : 'Falha' }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', color: '#94a3b8' }, children: row.failReason ? FAIL_REASON_LABELS[row.failReason] || row.failReason : '—' }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', color: '#94a3b8', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: row.userAgent || '', children: row.userAgent || '—' })] }, row.id)))) })] }) }))] }));
};
exports.LoginAttempts = LoginAttempts;
