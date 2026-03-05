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
exports.PersonnelListView = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const userDeptName = (u) => u.departmentRef?.name ?? u.department ?? '';
const userUnitName = (u) => u.unitRef?.name ?? u.unit ?? '';
const UNIT_ORDER = ['3C+', 'Evolux', 'Dizify', 'Instituto 3C', 'FiqOn', 'Dizparos'];
const PersonnelListView = ({ units: unitsFromApi, users, departments, roles, onEditUser, onDeleteUser, onViewCollaborator, onEditDepartment, onDeleteDepartment, onEditRole, onDeleteRole, onAddCollaborator, onAddRole, onAddDepartmentToUnit, onEditUnit, onDeleteUnit }) => {
    const [expandedUnits, setExpandedUnits] = (0, react_1.useState)({});
    const [expandedDepts, setExpandedDepts] = (0, react_1.useState)({});
    const [expandedRoles, setExpandedRoles] = (0, react_1.useState)({});
    const toggleUnit = (key) => setExpandedUnits(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDept = (key) => setExpandedDepts(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleRole = (key) => setExpandedRoles(prev => ({ ...prev, [key]: !prev[key] }));
    // Fonte única: estrutura vem só da API (seed_units). Não derivar unidades dos usuários.
    const unitList = react_1.default.useMemo(() => {
        const list = Array.isArray(unitsFromApi) ? unitsFromApi.filter((u) => u.name !== 'Geral') : [];
        if (list.length === 0)
            return [];
        return UNIT_ORDER.filter(name => list.some((u) => u.name === name))
            .concat(list.filter((u) => !UNIT_ORDER.includes(u.name)).map((u) => u.name))
            .map(unitName => {
            const apiUnit = list.find((u) => u.name === unitName);
            return apiUnit ? { id: apiUnit.id, name: unitName, departments: apiUnit.departments || [] } : { id: '', name: unitName, departments: [] };
        });
    }, [unitsFromApi]);
    const matchUserToUnit = (u, unitName) => userUnitName(u).trim() === unitName;
    const getUsersByUnitDeptJob = (unitName, dept, jobTitle) => users.filter(u => matchUserToUnit(u, unitName) && userDeptName(u) === dept && (u.jobTitle || '').trim() === jobTitle);
    const findDepartment = (name) => departments.find(d => d.name === name);
    const findRole = (deptName, roleName) => roles.find(r => r.name === roleName && (r.department?.name === deptName));
    return ((0, jsx_runtime_1.jsx)("div", { className: "personnel-list-view", style: { display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: 24 }, children: unitList.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24, textAlign: 'center', background: '#18181b', borderRadius: 12, color: '#a1a1aa', fontSize: 14, lineHeight: 1.6 }, children: ["Estrutura n\u00E3o carregada. Execute o seed mestre (", (0, jsx_runtime_1.jsx)("strong", { children: "npm run seed:master" }), "); ap\u00F3s isso, aqui aparecer\u00E3o as 6 unidades (3C+, Evolux, Dizify, Instituto 3C, FiqOn, Dizparos) com departamentos, cargos, colaboradores e ferramentas KBS por cargo."] })) : unitList.map(({ id: unitId, name: unitName, departments: unitDepts }) => {
            const usersInUnit = users.filter(u => matchUserToUnit(u, unitName));
            const deptList = unitDepts.length > 0
                ? unitDepts
                : [...new Set(usersInUnit.map(u => userDeptName(u)).filter(Boolean))].map((d) => ({ id: '', name: d, roles: roles.filter((r) => r.department?.name === d) }));
            const unitKey = `unit-${unitName}`;
            const unitEntity = { id: unitId, name: unitName, departments: unitDepts };
            return ((0, jsx_runtime_1.jsxs)("div", { style: { border: '1px solid #1f1f22', borderRadius: '12px', overflow: 'hidden', background: '#09090b' }, children: [(0, jsx_runtime_1.jsxs)("div", { onClick: () => toggleUnit(unitKey), style: {
                            padding: '16px 20px',
                            background: '#18181b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderBottom: expandedUnits[unitKey] ? '1px solid #1f1f22' : 'none'
                        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building2, { size: 22, color: "#8b5cf6" }), (0, jsx_runtime_1.jsxs)("span", { style: { fontWeight: 700, color: '#f4f4f5', fontSize: '16px' }, children: ["UNIDADE: ", unitName] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [onAddDepartmentToUnit && unitId && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onAddDepartmentToUnit(unitEntity); }, style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }, title: "Adicionar departamento", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 18, color: "#22c55e" }) })), onEditUnit && unitId && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onEditUnit(unitEntity); }, style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }, title: "Editar unidade", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { size: 18, color: "#a78bfa" }) })), onDeleteUnit && unitId && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onDeleteUnit(unitEntity); }, style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }, title: "Excluir unidade", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 18, color: "#ef4444" }) })), expandedUnits[unitKey] ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 20, color: "#71717a" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 20, color: "#71717a" })] })] }), expandedUnits[unitKey] && ((0, jsx_runtime_1.jsx)("div", { style: { padding: '12px 16px 16px', background: '#09090b' }, children: deptList.map((dept) => {
                            const deptName = dept.name;
                            const usersInDept = usersInUnit.filter(u => userDeptName(u) === deptName);
                            const jobTitles = (dept.roles && dept.roles.length > 0)
                                ? dept.roles.map((r) => r.name)
                                : [...new Set(usersInDept.map(u => (u.jobTitle || '').trim()).filter(Boolean))];
                            const deptKey = `${unitKey}-${deptName}`;
                            const deptEntity = findDepartment(deptName);
                            return ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12, border: '1px solid #27272a', borderRadius: '10px', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                            padding: '12px 16px',
                                            background: '#18181b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            borderBottom: expandedDepts[deptKey] ? '1px solid #27272a' : 'none'
                                        }, onClick: () => toggleDept(deptKey), children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontWeight: 600, color: '#e4e4e7', fontSize: '14px' }, children: ["\uD83D\uDCC2 Departamento: ", deptName] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [deptEntity && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [onAddRole && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onAddRole(deptEntity); }, style: { background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.8 }, title: "Adicionar cargo", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14, color: "#a78bfa" }) })), (0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onEditDepartment(deptEntity); }, style: { background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }, title: "Editar departamento", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { size: 14, color: "#71717a" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onDeleteDepartment(deptEntity); }, style: { background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }, title: "Excluir departamento", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#ef4444" }) })] })), expandedDepts[deptKey] ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 18, color: "#52525b" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 18, color: "#52525b" })] })] }), expandedDepts[deptKey] && ((0, jsx_runtime_1.jsx)("div", { style: { padding: '8px 12px 12px 24px', background: '#09090b' }, children: (dept.roles && dept.roles.length > 0 ? dept.roles : jobTitles.map((jt) => ({ name: jt, kitItems: [] }))).map((roleOrPlaceholder) => {
                                            const jobTitle = roleOrPlaceholder.name;
                                            const roleUsers = getUsersByUnitDeptJob(unitName, deptName, jobTitle);
                                            const roleEntity = findRole(deptName, jobTitle) ?? (roleOrPlaceholder.id ? roleOrPlaceholder : null);
                                            const roleKey = `${deptKey}-${jobTitle}`;
                                            const kitItems = (roleOrPlaceholder.kitItems || []);
                                            return ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 8, border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                                            padding: '10px 14px',
                                                            background: '#18181b',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            cursor: 'pointer',
                                                            borderBottom: expandedRoles[roleKey] ? '1px solid #27272a' : 'none'
                                                        }, onClick: () => toggleRole(roleKey), children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { size: 16, color: "#71717a" }), (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 500, color: '#e4e4e7', fontSize: '13px' }, children: jobTitle }), roleOrPlaceholder.code && ((0, jsx_runtime_1.jsx)("span", { style: { fontSize: '11px', color: '#71717a', fontWeight: 500 }, children: roleOrPlaceholder.code }))] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }, children: [onAddCollaborator && roleEntity && dept.id && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onAddCollaborator(roleEntity, { id: dept.id, name: deptName, unitId: dept.unitId, unit: dept.unit }); }, title: "Adicionar colaborador", style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.8 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.UserPlus, { size: 14, color: "#22c55e" }) })), onEditRole && roleEntity && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onEditRole(roleEntity); }, title: "Editar cargo", style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.8 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { size: 14, color: "#a78bfa" }) })), onDeleteRole && roleEntity && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onDeleteRole(roleEntity); }, title: "Excluir cargo", style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.8 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#ef4444" }) })), expandedRoles[roleKey] ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 16, color: "#52525b" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 16, color: "#52525b" })] })] }), expandedRoles[roleKey] && ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '4px 0', background: '#09090b' }, children: [roleUsers.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '10px 14px 10px 38px', color: '#52525b', fontSize: '12px', fontStyle: 'italic' }, children: "Nenhum colaborador." })) : (roleUsers.map(user => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => (onViewCollaborator ?? onEditUser)(user), style: {
                                                                    padding: '10px 14px 10px 38px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 12,
                                                                    cursor: 'pointer',
                                                                    borderBottom: '1px solid #1f1f22',
                                                                    transition: 'background 0.2s'
                                                                }, onMouseOver: (e) => (e.currentTarget.style.background = '#18181b'), onMouseOut: (e) => (e.currentTarget.style.background = 'transparent'), children: [(0, jsx_runtime_1.jsx)("div", { style: { width: '28px', height: '28px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#e4e4e7' }, children: user.name.charAt(0) }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, fontSize: '13px', color: '#e4e4e7' }, children: [user.name, " ", (0, jsx_runtime_1.jsx)("span", { style: { color: '#71717a' }, children: "|" }), " ", user.email] }), onDeleteUser && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onDeleteUser(user); }, title: "Excluir colaborador", style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.4 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#ef4444" }) }))] }, user.id)))), kitItems.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '10px 14px 10px 38px', borderTop: '1px solid #1f1f22' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', color: '#71717a', fontWeight: 600, marginBottom: 6 }, children: "Ferramentas KBS" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: kitItems.map((item, idx) => ((0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '11px', color: '#a1a1aa', background: '#18181b', padding: '4px 8px', borderRadius: 6 }, children: [item.toolName || item.toolCode, " ", item.accessLevelDesc && (0, jsx_runtime_1.jsxs)("span", { style: { color: '#52525b' }, children: ["(", item.accessLevelDesc, ")"] })] }, idx))) })] }))] }))] }, roleKey));
                                        }) }))] }, deptKey));
                        }) }))] }, unitKey));
        }) }));
};
exports.PersonnelListView = PersonnelListView;
exports.default = exports.PersonnelListView;
