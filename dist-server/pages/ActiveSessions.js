"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveSessions = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const CustomConfirmModal_1 = require("../components/CustomConfirmModal");
const PROFILE_COLORS = {
    VIEWER: '#64748b',
    ADMIN: '#0EA5E9',
    SUPER_ADMIN: '#f59e0b',
    APPROVER: '#10b981',
    GESTOR: '#0EA5E9',
};
function formatRelativeTime(minutesAgo) {
    if (minutesAgo < 1)
        return 'agora';
    if (minutesAgo < 60)
        return `há ${minutesAgo} min`;
    const h = Math.floor(minutesAgo / 60);
    const m = minutesAgo % 60;
    if (h === 1 && m === 0)
        return 'há 1h';
    if (m === 0)
        return `há ${h}h`;
    return `há ${h}h ${m}min`;
}
function formatSessionDuration(minutes) {
    if (minutes < 1)
        return '< 1 min';
    if (minutes < 60)
        return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0)
        return `${h}h`;
    return `${h}h ${m}min`;
}
function formatFullDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}
const ActiveSessions = ({ currentUserId, showToast }) => {
    const [sessions, setSessions] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [revokeTarget, setRevokeTarget] = (0, react_1.useState)(null);
    const [revokeAllConfirm, setRevokeAllConfirm] = (0, react_1.useState)(false);
    const [revoking, setRevoking] = (0, react_1.useState)(false);
    const [removingId, setRemovingId] = (0, react_1.useState)(null);
    const fetchSessions = (0, react_1.useCallback)(() => {
        fetch(`${config_1.API_URL}/api/admin/sessions`, {
            credentials: 'include',
            headers: { 'x-user-id': currentUserId },
        })
            .then((r) => {
            if (r.status === 403)
                throw new Error('Acesso negado');
            return r.json();
        })
            .then((data) => setSessions(Array.isArray(data) ? data : []))
            .catch(() => setSessions([]))
            .finally(() => setLoading(false));
    }, [currentUserId]);
    (0, react_1.useEffect)(() => {
        fetchSessions();
    }, [fetchSessions]);
    (0, react_1.useEffect)(() => {
        const t = setInterval(fetchSessions, 60 * 1000);
        return () => clearInterval(t);
    }, [fetchSessions]);
    const handleRevokeOne = (session) => {
        if (session.userId === currentUserId)
            return;
        setRevokeTarget(session);
    };
    const confirmRevokeOne = () => {
        if (!revokeTarget)
            return;
        const target = revokeTarget;
        setRevoking(true);
        fetch(`${config_1.API_URL}/api/admin/sessions/${target.userId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': currentUserId },
        })
            .then((r) => {
            if (!r.ok)
                throw new Error('Falha ao revogar');
            setRemovingId(target.userId);
            setTimeout(() => {
                setSessions((prev) => prev.filter((s) => s.userId !== target.userId));
                setRemovingId(null);
            }, 300);
            showToast?.('Sessão revogada com sucesso.', 'success');
        })
            .catch(() => showToast?.('Erro ao revogar sessão.', 'error'))
            .finally(() => {
            setRevoking(false);
            setRevokeTarget(null);
        });
    };
    const confirmRevokeAll = () => {
        setRevoking(true);
        fetch(`${config_1.API_URL}/api/admin/sessions`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': currentUserId },
        })
            .then((r) => {
            if (!r.ok)
                throw new Error('Falha ao revogar');
            return r.json();
        })
            .then((data) => {
            const count = data.count ?? 0;
            setSessions((prev) => prev.filter((s) => s.userId === currentUserId));
            showToast?.(`${count} sessão(ões) revogada(s).`, 'success');
        })
            .catch(() => showToast?.('Erro ao revogar sessões.', 'error'))
            .finally(() => {
            setRevoking(false);
            setRevokeAllConfirm(false);
        });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { padding: 24 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }, children: [(0, jsx_runtime_1.jsxs)("h2", { style: { margin: 0, fontSize: 18, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Monitor, { size: 20, color: "#0EA5E9" }), " Sess\u00F5es Ativas", (0, jsx_runtime_1.jsx)("span", { style: {
                                    padding: '4px 10px',
                                    borderRadius: 20,
                                    background: 'rgba(14, 165, 233, 0.2)',
                                    color: '#38BDF8',
                                    fontSize: 13,
                                    fontWeight: 600,
                                }, children: sessions.length })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setRevokeAllConfirm(true), disabled: sessions.length <= 1, style: {
                            background: 'transparent',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            padding: '8px 14px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: sessions.length <= 1 ? 'not-allowed' : 'pointer',
                            opacity: sessions.length <= 1 ? 0.6 : 1,
                        }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.LogOut, { size: 14, style: { marginRight: 6, verticalAlign: 'middle' } }), "Revogar Todas"] })] }), loading ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 40, textAlign: 'center', color: '#64748b' }, children: "Carregando..." })) : sessions.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 48, textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Monitor, { size: 40, style: { opacity: 0.5 } }), (0, jsx_runtime_1.jsx)("span", { children: "Nenhuma sess\u00E3o ativa no momento." })] })) : ((0, jsx_runtime_1.jsx)("div", { style: { overflowX: 'auto' }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #334155' }, children: [(0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "Usu\u00E1rio" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "Perfil" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "Departamento" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "\u00DAltimo acesso" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "Tempo de sess\u00E3o" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'right', padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }, children: "A\u00E7\u00E3o" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: sessions.map((row) => {
                                const isSelf = row.userId === currentUserId;
                                const isRemoving = removingId === row.userId;
                                const profileColor = PROFILE_COLORS[row.userRole] ?? '#64748b';
                                return ((0, jsx_runtime_1.jsxs)("tr", { style: {
                                        borderBottom: '1px solid #334155',
                                        opacity: isRemoving ? 0 : 1,
                                        transform: isRemoving ? 'translateY(-4px)' : undefined,
                                        transition: 'opacity 0.3s ease, transform 0.3s ease',
                                    }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
                                                            color: '#e2e8f0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 600,
                                                            fontSize: 14,
                                                        }, children: (row.userName || '?').charAt(0).toUpperCase() }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { color: '#e2e8f0', fontWeight: 500 }, children: row.userName }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#94a3b8', fontSize: 12 }, children: row.userEmail })] })] }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px' }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                                                    padding: '4px 8px',
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    background: `${profileColor}22`,
                                                    color: profileColor,
                                                }, children: row.userRole }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', color: '#94a3b8' }, children: row.userDepartment || '—' }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', color: '#e2e8f0' }, title: formatFullDate(row.lastActivity), children: formatRelativeTime(row.minutesSinceActivity) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', color: '#94a3b8' }, children: formatSessionDuration(row.minutesActive) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', textAlign: 'right' }, children: isSelf ? ((0, jsx_runtime_1.jsx)("span", { title: "N\u00E3o \u00E9 poss\u00EDvel revogar sua pr\u00F3pria sess\u00E3o", style: { color: '#64748b', fontSize: 12, cursor: 'not-allowed' }, children: "\u2014" })) : ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleRevokeOne(row), style: {
                                                    background: 'transparent',
                                                    border: '1px solid #ef4444',
                                                    color: '#ef4444',
                                                    padding: '6px 12px',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                }, children: "Revogar" })) })] }, row.sessionId));
                            }) })] }) })), (0, jsx_runtime_1.jsx)(CustomConfirmModal_1.CustomConfirmModal, { isOpen: !!revokeTarget, title: "Revogar sess\u00E3o", message: revokeTarget
                    ? `Tem certeza que deseja encerrar a sessão de ${revokeTarget.userName}? Ele será desconectado na próxima ação realizada.`
                    : '', confirmLabel: "Sim, revogar", cancelLabel: "Cancelar", onConfirm: confirmRevokeOne, onClose: () => setRevokeTarget(null), isDestructive: true }), (0, jsx_runtime_1.jsx)(CustomConfirmModal_1.CustomConfirmModal, { isOpen: revokeAllConfirm, title: "Revogar todas as sess\u00F5es", message: "Tem certeza que deseja encerrar todas as outras sess\u00F5es ativas? Todos os usu\u00E1rios (exceto voc\u00EA) ser\u00E3o desconectados na pr\u00F3xima a\u00E7\u00E3o.", confirmLabel: "Sim, revogar todas", cancelLabel: "Cancelar", onConfirm: confirmRevokeAll, onClose: () => setRevokeAllConfirm(false), isDestructive: true })] }));
};
exports.ActiveSessions = ActiveSessions;
