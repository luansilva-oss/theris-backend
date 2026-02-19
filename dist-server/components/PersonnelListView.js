"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonnelListView = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const PersonnelListView = ({ users, departments, roles, onEditUser }) => {
    const [expandedDepts, setExpandedDepts] = (0, react_1.useState)({});
    const [expandedRoles, setExpandedRoles] = (0, react_1.useState)({});
    const toggleDept = (deptId) => {
        setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
    };
    const toggleRole = (roleId) => {
        setExpandedRoles(prev => ({ ...prev, [roleId]: !prev[roleId] }));
    };
    const getRolesForDept = (deptId) => roles.filter(r => r.departmentId === deptId);
    const getUsersForRole = (roleName, deptName) => users.filter(u => u.jobTitle === roleName && u.department === deptName);
    return ((0, jsx_runtime_1.jsx)("div", { className: "personnel-list-view", style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: departments.map(dept => ((0, jsx_runtime_1.jsxs)("div", { className: "dept-section", style: { border: '1px solid #1f1f22', borderRadius: '12px', overflow: 'hidden', background: '#09090b' }, children: [(0, jsx_runtime_1.jsxs)("div", { onClick: () => toggleDept(dept.id), style: {
                        padding: '16px 20px',
                        background: '#18181b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: expandedDepts[dept.id] ? '1px solid #1f1f22' : 'none'
                    }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building2, { size: 20, color: "#a78bfa" }), (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 600, color: '#f4f4f5', fontSize: '16px' }, children: dept.name })] }), expandedDepts[dept.id] ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 20, color: "#71717a" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 20, color: "#71717a" })] }), expandedDepts[dept.id] && ((0, jsx_runtime_1.jsx)("div", { className: "dept-content", style: { padding: '8px 16px 16px 32px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#09090b' }, children: getRolesForDept(dept.id).length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '10px', color: '#52525b', fontSize: '13px', fontStyle: 'italic' }, children: "Nenhum cargo cadastrado neste departamento." })) : (getRolesForDept(dept.id).map(role => ((0, jsx_runtime_1.jsxs)("div", { className: "role-section", style: { border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { onClick: () => toggleRole(role.id), style: {
                                    padding: '12px 16px',
                                    background: '#18181b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    borderBottom: expandedRoles[role.id] ? '1px solid #27272a' : 'none'
                                }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { size: 18, color: "#71717a" }), (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 500, color: '#e4e4e7', fontSize: '14px' }, children: role.name })] }), expandedRoles[role.id] ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 16, color: "#52525b" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 16, color: "#52525b" })] }), expandedRoles[role.id] && ((0, jsx_runtime_1.jsx)("div", { className: "role-content", style: { padding: '4px 0', background: '#09090b' }, children: getUsersForRole(role.name, dept.name).length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '10px 16px', color: '#52525b', fontSize: '12px', fontStyle: 'italic' }, children: "Nenhum colaborador alocado." })) : (getUsersForRole(role.name, dept.name).map(user => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => onEditUser(user), className: "user-row", style: {
                                        padding: '10px 16px 10px 40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        borderBottom: '1px solid #1f1f22'
                                    }, onMouseOver: (e) => (e.currentTarget.style.background = '#18181b'), onMouseOut: (e) => (e.currentTarget.style.background = 'transparent'), children: [(0, jsx_runtime_1.jsx)("div", { style: { width: '32px', height: '32px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }, children: user.name.charAt(0) }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { color: '#e4e4e7', fontSize: '14px', fontWeight: 500 }, children: user.name }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#71717a', fontSize: '12px' }, children: user.email })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.User, { size: 14, color: "#52525b" })] }, user.id)))) }))] }, role.id)))) }))] }, dept.id))) }));
};
exports.PersonnelListView = PersonnelListView;
exports.default = exports.PersonnelListView;
