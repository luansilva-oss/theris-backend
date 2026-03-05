"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaboratorDetails = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const EntityAuditHistory_1 = require("../components/EntityAuditHistory");
const EditUserModal_1 = require("../components/EditUserModal");
function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const CollaboratorDetails = ({ id, onBack, onOpenAuditHistory, onUpdate, currentUser, allUsers = [], showToast }) => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const handleBack = () => navigate('/people');
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [activeTab, setActiveTab] = (0, react_1.useState)('acessos');
    const [isEditModalOpen, setIsEditModalOpen] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        setLoading(true);
        setError(null);
        fetch(`${config_1.API_URL}/api/users/${id}/details`, { credentials: 'include' })
            .then(r => {
            if (!r.ok) {
                if (r.status === 404)
                    throw new Error('Colaborador não encontrado');
                throw new Error('Erro ao carregar dados');
            }
            return r.json();
        })
            .then(setData)
            .catch(e => setError(e instanceof Error ? e.message : 'Erro ao carregar colaborador'))
            .finally(() => setLoading(false));
    }, [id]);
    if (loading) {
        return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24 }, children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleBack, style: { background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { size: 18 }), " Voltar"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { background: '#18181b', borderRadius: 12, padding: 24, border: '1px solid #27272a', minHeight: 280 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { width: 64, height: 64, borderRadius: '50%', background: '#27272a', animation: 'pulse 1.5s ease-in-out infinite' } }), (0, jsx_runtime_1.jsx)("div", { style: { height: 20, background: '#27272a', borderRadius: 4, marginTop: 16, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' } }), (0, jsx_runtime_1.jsx)("div", { style: { height: 14, background: '#27272a', borderRadius: 4, marginTop: 12, width: '50%', animation: 'pulse 1.5s ease-in-out infinite' } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { background: '#18181b', borderRadius: 12, padding: 24, border: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { height: 24, background: '#27272a', borderRadius: 4, width: '30%', animation: 'pulse 1.5s ease-in-out infinite' } }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 16, marginTop: 24 }, children: [1, 2, 3].map(i => ((0, jsx_runtime_1.jsx)("div", { style: { height: 36, background: '#27272a', borderRadius: 8, flex: 1, animation: 'pulse 1.5s ease-in-out infinite' } }, i))) }), (0, jsx_runtime_1.jsx)("div", { style: { height: 200, background: '#27272a', borderRadius: 8, marginTop: 24, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' } })] })] })] }));
    }
    if (error || !data) {
        return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24, textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleBack, style: { background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { size: 18 }), " Voltar"] }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#ef4444', fontSize: 16 }, children: error || 'Colaborador não encontrado' })] }));
    }
    const { user, kbsFerramentas, acessosExtraordinarios = [], historicoCargos } = data;
    const canEdit = currentUser && (currentUser.systemProfile === 'SUPER_ADMIN' || currentUser.systemProfile === 'GESTOR' || currentUser.systemProfile === 'ADMIN');
    const loadDetails = () => {
        fetch(`${config_1.API_URL}/api/users/${id}/details`, { credentials: 'include' })
            .then(r => {
            if (!r.ok) {
                if (r.status === 404)
                    throw new Error('Colaborador não encontrado');
                throw new Error('Erro ao carregar dados');
            }
            return r.json();
        })
            .then(setData)
            .catch(e => setError(e instanceof Error ? e.message : 'Erro ao carregar colaborador'));
    };
    const handleEditSave = () => {
        loadDetails();
        onUpdate?.();
    };
    const initial = (user?.name?.charAt(0) || '?').toUpperCase();
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24 }, className: "fade-in", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleBack, style: {
                    background: 'transparent',
                    border: 'none',
                    color: '#a78bfa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 24,
                    fontSize: 14,
                }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { size: 18 }), " Voltar"] }), (0, jsx_runtime_1.jsxs)("div", { className: "collaborator-details-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 24, alignItems: 'start' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                            background: '#18181b',
                            borderRadius: 12,
                            padding: 24,
                            border: '1px solid #27272a',
                            position: 'sticky',
                            top: 24,
                        }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                    width: 72,
                                    height: 72,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 28,
                                    fontWeight: 700,
                                    color: 'white',
                                    marginBottom: 16,
                                }, children: initial }), (0, jsx_runtime_1.jsx)("h1", { style: { color: 'white', fontSize: 20, margin: 0, marginBottom: 8 }, children: user?.name || '—' }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }, children: (0, jsx_runtime_1.jsxs)("span", { style: {
                                        padding: '4px 10px',
                                        borderRadius: 20,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background: user?.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: user?.isActive ? '#22c55e' : '#ef4444',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }, children: [user?.isActive && (0, jsx_runtime_1.jsx)("span", { style: { width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s ease-in-out infinite' } }), user?.isActive ? 'Ativo' : 'Inativo'] }) }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: '#e4e4e7' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { size: 16, color: "#71717a", style: { flexShrink: 0 } }), (0, jsx_runtime_1.jsx)("span", { children: user?.role?.name || user?.jobTitle || '—' })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building2, { size: 16, color: "#71717a", style: { flexShrink: 0 } }), (0, jsx_runtime_1.jsxs)("span", { children: ["Depto: ", user?.departmentRef?.name || '—'] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building2, { size: 16, color: "#71717a", style: { flexShrink: 0 } }), (0, jsx_runtime_1.jsxs)("span", { children: ["Unidade: ", user?.unitRef?.name || '—'] })] }), user?.role?.code && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Hash, { size: 16, color: "#71717a", style: { flexShrink: 0 } }), (0, jsx_runtime_1.jsx)("span", { children: user.role.code })] })), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { size: 16, color: "#71717a", style: { flexShrink: 0 } }), (0, jsx_runtime_1.jsx)("a", { href: `mailto:${user?.email}`, style: { color: '#a78bfa', textDecoration: 'none' }, children: user?.email || '—' })] }), user?.manager && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { size: 16, color: "#71717a", style: { flexShrink: 0 } }), (0, jsx_runtime_1.jsxs)("span", { children: ["Gestor: ", user.manager?.name] })] }))] }), canEdit && isEditModalOpen && currentUser && showToast && ((0, jsx_runtime_1.jsx)(EditUserModal_1.EditUserModal, { isOpen: isEditModalOpen, onClose: () => setIsEditModalOpen(false), user: {
                                    id: user.id,
                                    name: user.name,
                                    email: user.email,
                                    jobTitle: user.jobTitle ?? undefined,
                                    departmentId: user.departmentRef?.id ?? null,
                                    unitId: user.unitRef?.id ?? null,
                                    departmentRef: user.departmentRef ?? null,
                                    unitRef: user.unitRef ?? null,
                                    systemProfile: user?.systemProfile || 'VIEWER',
                                    managerId: user.manager?.id ?? null,
                                    roleId: user.role?.id ?? null,
                                    isActive: user.isActive,
                                }, onUpdate: handleEditSave, currentUser: currentUser, allUsers: allUsers, showToast: showToast, onOpenAuditHistory: onOpenAuditHistory }))] }), (0, jsx_runtime_1.jsxs)("div", { style: { background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', borderBottom: '1px solid #27272a' }, children: ['acessos', 'historico', 'timeline'].map(tab => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setActiveTab(tab), style: {
                                        padding: '14px 20px',
                                        background: activeTab === tab ? '#27272a' : 'transparent',
                                        border: 'none',
                                        color: activeTab === tab ? '#fff' : '#71717a',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: 500,
                                    }, children: [tab === 'acessos' && 'Acessos', tab === 'historico' && 'Histórico', tab === 'timeline' && 'Linha do tempo'] }, tab))) }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: 24 }, children: [activeTab === 'acessos' && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 32 }, children: [(0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#e4e4e7', fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }, children: "Kit B\u00E1sico" }), kbsFerramentas.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { color: '#71717a', fontSize: 14 }, children: "Nenhum acesso desta categoria." })) : ((0, jsx_runtime_1.jsx)("div", { style: { overflowX: 'auto', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: '#27272a' }, children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }, children: "Ferramenta" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }, children: "ID" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }, children: "N\u00EDvel de Acesso" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }, children: "Criticidade" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: kbsFerramentas.map((f, idx) => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderTop: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#e4e4e7', fontWeight: 500 }, children: f.ferramenta }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#a1a1aa' }, children: f.sigla }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#a78bfa' }, children: f.nivel }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px' }, children: f.critico || f.criticidade ? ((0, jsx_runtime_1.jsx)("span", { style: { padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }, children: f.criticidade || 'Crítico' })) : '—' })] }, idx))) })] }) }))] }), (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#e4e4e7', fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }, children: "Acessos Extraordin\u00E1rios" }), acessosExtraordinarios.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { color: '#71717a', fontSize: 14 }, children: "Nenhum acesso desta categoria." })) : ((0, jsx_runtime_1.jsx)("div", { style: { overflowX: 'auto', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: '#27272a' }, children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }, children: "Ferramenta" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }, children: "ID" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }, children: "N\u00EDvel de Acesso" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '12px 16px', textAlign: 'left', color: '#a1a1aa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }, children: "Criticidade" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: acessosExtraordinarios.map((f, idx) => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderTop: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#e4e4e7', fontWeight: 500 }, children: f.ferramenta }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#a1a1aa' }, children: f.sigla }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px', color: '#a78bfa' }, children: f.nivel }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '12px 16px' }, children: f.critico || f.criticidade ? ((0, jsx_runtime_1.jsx)("span", { style: { padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }, children: f.criticidade || 'Crítico' })) : '—' })] }, idx))) })] }) }))] })] })), activeTab === 'historico' && ((0, jsx_runtime_1.jsx)(EntityAuditHistory_1.EntityAuditHistory, { entidadeId: user?.id || '', entidadeTipo: "User", limit: 10, onOpenFullHistory: onOpenAuditHistory ? (p) => onOpenAuditHistory(p.entidadeId, p.entidadeTipo) : undefined })), activeTab === 'timeline' && ((0, jsx_runtime_1.jsx)("div", { children: historicoCargos.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { color: '#71717a', fontSize: 14 }, children: "Nenhuma mudan\u00E7a de cargo registrada" })) : ((0, jsx_runtime_1.jsx)("ul", { style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }, children: historicoCargos.map(h => {
                                                const antes = h.dadosAntes;
                                                const depois = h.dadosDepois;
                                                const cargoAntes = antes?.jobTitle || antes?.departmentName || '—';
                                                const cargoDepois = depois?.jobTitle || depois?.departmentName || '—';
                                                const dept = depois?.departmentName || antes?.departmentName || '—';
                                                return ((0, jsx_runtime_1.jsxs)("li", { style: {
                                                        padding: 14,
                                                        background: '#09090b',
                                                        borderRadius: 8,
                                                        border: '1px solid #27272a',
                                                        fontSize: 13,
                                                    }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { color: '#71717a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { size: 14 }), formatDate(h.createdAt)] }), (0, jsx_runtime_1.jsxs)("div", { style: { color: '#e4e4e7' }, children: [cargoAntes, " \u2192 ", cargoDepois] }), (0, jsx_runtime_1.jsxs)("div", { style: { color: '#a1a1aa', marginTop: 4 }, children: ["Departamento: ", dept] }), h.autor && (0, jsx_runtime_1.jsxs)("div", { style: { color: '#71717a', marginTop: 4, fontSize: 12 }, children: ["Autor: ", h.autor.name] })] }, h.id));
                                            }) })) }))] })] })] })] }));
};
exports.CollaboratorDetails = CollaboratorDetails;
