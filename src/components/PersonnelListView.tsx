import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import { Building2, Briefcase, ChevronDown, ChevronRight, Trash2, Pencil, Plus, UserPlus } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
    department?: string;
    unit?: string;
    departmentId?: string | null;
    unitId?: string | null;
    departmentRef?: { id: string; name: string } | null;
    unitRef?: { id: string; name: string } | null;
    systemProfile: string;
    managerId?: string | null;
    manager?: { name: string };
}

const userDeptName = (u: User) => u.departmentRef?.name ?? u.department ?? '';
const userUnitName = (u: User) => u.unitRef?.name ?? u.unit ?? '';

interface Department {
    id: string;
    name: string;
    unitId?: string;
    unit?: { name: string };
    roles?: Role[];
}

interface Role {
    id: string;
    name: string;
    code?: string | null;
    departmentId: string;
    department?: { name: string };
    kitItems?: unknown[];
}

interface Unit {
    id: string;
    name: string;
    departments: Department[];
}

interface PersonnelListViewProps {
    units: Unit[];
    users: User[];
    departments: Department[];
    roles: Role[];
    onEditUser: (user: User) => void;
    /** Ao clicar no nome/avatar do colaborador, navega para detalhes. Se não informado, usa onEditUser. */
    onViewCollaborator?: (user: User) => void;
    onDeleteUser?: (user: User) => void;
    onEditDepartment: (dept: Department) => void;
    onDeleteDepartment: (dept: Department) => void;
    onEditRole?: (role: Role) => void;
    onDeleteRole?: (role: Role) => void;
    onAddCollaborator?: (role: Role, department: Department) => void;
    onAddRole?: (department: Department) => void;
    onAddDepartmentToUnit?: (unit: Unit) => void;
    onEditUnit?: (unit: Unit) => void;
    onDeleteUnit?: (unit: Unit) => void;
}

const UNIT_ORDER = ['3C+', 'Evolux', 'Dizify', 'Instituto 3C', 'FiqOn', 'Dizparos'];

export const PersonnelListView: React.FC<PersonnelListViewProps> = ({
    units: unitsFromApi, users, departments, roles, onEditUser, onDeleteUser, onViewCollaborator, onEditDepartment, onDeleteDepartment, onEditRole, onDeleteRole, onAddCollaborator, onAddRole,
    onAddDepartmentToUnit, onEditUnit, onDeleteUnit
}) => {
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
    const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
    const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

    const toggleUnit = (key: string) => setExpandedUnits(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDept = (key: string) => setExpandedDepts(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleRole = (key: string) => setExpandedRoles(prev => ({ ...prev, [key]: !prev[key] }));

    // Fonte única: estrutura vem só da API (seed_units). Não derivar unidades dos usuários.
    const unitList = React.useMemo(() => {
        const list = Array.isArray(unitsFromApi) ? unitsFromApi.filter((u: Unit) => u.name !== 'Geral') : [];
        if (list.length === 0) return [];
        return UNIT_ORDER.filter(name => list.some((u: Unit) => u.name === name))
            .concat(list.filter((u: Unit) => !UNIT_ORDER.includes(u.name)).map((u: Unit) => u.name))
            .map(unitName => {
                const apiUnit = list.find((u: Unit) => u.name === unitName);
                return apiUnit ? { id: apiUnit.id, name: unitName, departments: apiUnit.departments || [] } : { id: '', name: unitName, departments: [] };
            });
    }, [unitsFromApi]);

    const matchUserToUnit = (u: User, unitName: string) => userUnitName(u).trim() === unitName;
    const getUsersByUnitDeptJob = (unitName: string, dept: string, jobTitle: string) =>
        users.filter(u => matchUserToUnit(u, unitName) && userDeptName(u) === dept && (u.jobTitle || '').trim() === jobTitle);

    const findDepartment = (name: string) => departments.find(d => d.name === name);
    const findRole = (deptName: string, roleName: string) =>
        roles.find(r => r.name === roleName && (r.department?.name === deptName));

    return (
        <div className="personnel-list-view" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: 24 }}>
            {unitList.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', background: '#18181b', borderRadius: 12, color: '#a1a1aa', fontSize: 14, lineHeight: 1.6 }}>
                    Estrutura não carregada. Execute o seed mestre (<strong>npm run seed:master</strong>); após isso, aqui aparecerão as 6 unidades (3C+, Evolux, Dizify, Instituto 3C, FiqOn, Dizparos) com departamentos, cargos, colaboradores e ferramentas KBS por cargo.
                </div>
            ) : unitList.map(({ id: unitId, name: unitName, departments: unitDepts }) => {
                const usersInUnit = users.filter(u => matchUserToUnit(u, unitName));
                const deptList = unitDepts.length > 0
                    ? unitDepts
                    : [...new Set(usersInUnit.map(u => userDeptName(u)).filter(Boolean))].map((d: string) => ({ id: '', name: d, roles: roles.filter((r: Role) => r.department?.name === d) }));
                const unitKey = `unit-${unitName}`;
                const unitEntity: Unit = { id: unitId, name: unitName, departments: unitDepts };
                return (
                    <div key={unitKey} style={{ border: '1px solid #1f1f22', borderRadius: '12px', overflow: 'hidden', background: '#09090b' }}>
                        <div
                            onClick={() => toggleUnit(unitKey)}
                            style={{
                                padding: '16px 20px',
                                background: '#18181b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                borderBottom: expandedUnits[unitKey] ? '1px solid #1f1f22' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Building2 size={22} color="#0EA5E9" />
                                <span style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '16px' }}>UNIDADE: {unitName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {onAddDepartmentToUnit && unitId && (
                                    <button onClick={(e) => { e.stopPropagation(); onAddDepartmentToUnit(unitEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }} title="Adicionar departamento"><Plus size={18} color="#22c55e" /></button>
                                )}
                                {onEditUnit && unitId && (
                                    <button onClick={(e) => { e.stopPropagation(); onEditUnit(unitEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }} title="Editar unidade"><Pencil size={18} color="#0EA5E9" /></button>
                                )}
                                {onDeleteUnit && unitId && (
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteUnit(unitEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }} title="Excluir unidade"><Trash2 size={18} color="#ef4444" /></button>
                                )}
                                {expandedUnits[unitKey] ? <ChevronDown size={20} color="#71717a" /> : <ChevronRight size={20} color="#71717a" />}
                            </div>
                        </div>

                        {expandedUnits[unitKey] && (
                            <div style={{ padding: '12px 16px 16px', background: '#09090b' }}>
                                {deptList.map((dept: Department) => {
                                    const deptName = dept.name;
                                    const usersInDept = usersInUnit.filter(u => userDeptName(u) === deptName);
                                    const jobTitles = (dept.roles && dept.roles.length > 0)
                                        ? dept.roles.map((r: Role) => r.name)
                                        : [...new Set(usersInDept.map(u => (u.jobTitle || '').trim()).filter(Boolean))];
                                    const deptKey = `${unitKey}-${deptName}`;
                                    const deptEntity = findDepartment(deptName);
                                    return (
                                        <div key={deptKey} style={{ marginBottom: 12, border: '1px solid #27272a', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    padding: '12px 16px',
                                                    background: '#18181b',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    cursor: 'pointer',
                                                    borderBottom: expandedDepts[deptKey] ? '1px solid #27272a' : 'none'
                                                }}
                                                onClick={() => toggleDept(deptKey)}
                                            >
                                                <span style={{ fontWeight: 600, color: '#e4e4e7', fontSize: '14px' }}>📂 Departamento: {deptName}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {deptEntity && (
                                                        <>
                                                            {onAddRole && (
                                                                <button onClick={(e) => { e.stopPropagation(); onAddRole(deptEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Adicionar cargo"><Plus size={14} color="#0EA5E9" /></button>
                                                            )}
                                                            <button onClick={(e) => { e.stopPropagation(); onEditDepartment(deptEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Editar departamento"><Pencil size={14} color="#71717a" /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); onDeleteDepartment(deptEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Excluir departamento"><Trash2 size={14} color="#ef4444" /></button>
                                                        </>
                                                    )}
                                                    {expandedDepts[deptKey] ? <ChevronDown size={18} color="#52525b" /> : <ChevronRight size={18} color="#52525b" />}
                                                </div>
                                            </div>

                                            {expandedDepts[deptKey] && (
                                                <div style={{ padding: '8px 12px 12px 24px', background: '#09090b' }}>
                                                    {(dept.roles && dept.roles.length > 0 ? dept.roles : jobTitles.map((jt: string) => ({ name: jt, kitItems: [] as unknown[] }))).map((roleOrPlaceholder: { id?: string; name: string; code?: string | null; departmentId?: string; department?: { name: string }; kitItems?: unknown[] }) => {
                                                        const jobTitle = roleOrPlaceholder.name;
                                                        const roleUsers = getUsersByUnitDeptJob(unitName, deptName, jobTitle);
                                                        const roleEntity = findRole(deptName, jobTitle) ?? (roleOrPlaceholder.id ? (roleOrPlaceholder as Role) : null);
                                                        const roleKey = `${deptKey}-${jobTitle}`;
                                                        const kitItems = (roleOrPlaceholder.kitItems || []) as { toolCode?: string; toolName?: string; accessLevelDesc?: string }[];
                                                        return (
                                                            <div key={roleKey} style={{ marginBottom: 8, border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
                                                                <div
                                                                    style={{
                                                                        padding: '10px 14px',
                                                                        background: '#18181b',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        cursor: 'pointer',
                                                                        borderBottom: expandedRoles[roleKey] ? '1px solid #27272a' : 'none'
                                                                    }}
                                                                    onClick={() => toggleRole(roleKey)}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <Briefcase size={16} color="#71717a" />
                                                                        <span style={{ fontWeight: 500, color: '#e4e4e7', fontSize: '13px' }}>{jobTitle}</span>
                                                                        {roleOrPlaceholder.code && (
                                                                            <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 500 }}>{roleOrPlaceholder.code}</span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                                                                        {onAddCollaborator && roleEntity && dept.id && (
                                                                            <button onClick={(e) => { e.stopPropagation(); onAddCollaborator(roleEntity as Role, { id: dept.id, name: deptName, unitId: dept.unitId, unit: dept.unit }); }} title="Adicionar colaborador" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.8 }}><UserPlus size={14} color="#22c55e" /></button>
                                                                        )}
                                                                        {onEditRole && roleEntity && (
                                                                            <button onClick={(e) => { e.stopPropagation(); onEditRole(roleEntity); }} title="Editar cargo" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.8 }}><Pencil size={14} color="#0EA5E9" /></button>
                                                                        )}
                                                                        {onDeleteRole && roleEntity && (
                                                                            <button onClick={(e) => { e.stopPropagation(); onDeleteRole(roleEntity); }} title="Excluir cargo" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.8 }}><Trash2 size={14} color="#ef4444" /></button>
                                                                        )}
                                                                        {expandedRoles[roleKey] ? <ChevronDown size={16} color="#52525b" /> : <ChevronRight size={16} color="#52525b" />}
                                                                    </div>
                                                                </div>
                                                                {expandedRoles[roleKey] && (
                                                                    <div style={{ padding: '4px 0', background: '#09090b' }}>
                                                                        {roleUsers.length === 0 ? (
                                                                            <div style={{ padding: '10px 14px 10px 38px', color: '#52525b', fontSize: '12px', fontStyle: 'italic' }}>Nenhum colaborador.</div>
                                                                        ) : (
                                                                            roleUsers.map(user => (
                                                                                <div
                                                                                    key={user.id}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        console.log('clicou', user.id);
                                                                                        (onViewCollaborator ?? onEditUser)(user);
                                                                                    }}
                                                                                    style={{
                                                                                        padding: '10px 14px 10px 38px',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: 12,
                                                                                        cursor: 'pointer',
                                                                                        borderBottom: '1px solid #1f1f22',
                                                                                        transition: 'background 0.2s'
                                                                                    }}
                                                                                    onMouseOver={(e) => (e.currentTarget.style.background = '#18181b')}
                                                                                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                                                                                >
                                                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#e4e4e7' }}>
                                                                                        {user.name.charAt(0)}
                                                                                    </div>
                                                                                    <div style={{ flex: 1, fontSize: '13px', color: '#e4e4e7' }}>
                                                                                        {user.name} <span style={{ color: '#71717a' }}>|</span> {user.email}
                                                                                    </div>
                                                                                    {onDeleteUser && (
                                                                                        <button
                                                                                            onClick={(e: MouseEvent) => { e.stopPropagation(); onDeleteUser(user); }}
                                                                                            title="Excluir colaborador"
                                                                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.4 }}
                                                                                        >
                                                                                            <Trash2 size={14} color="#ef4444" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                        {kitItems.length > 0 && (
                                                                            <div style={{ padding: '10px 14px 10px 38px', borderTop: '1px solid #1f1f22' }}>
                                                                                <div style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, marginBottom: 6 }}>Ferramentas KBS</div>
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                                    {kitItems.map((item, idx) => (
                                                                                        <span key={idx} style={{ fontSize: '11px', color: '#a1a1aa', background: '#18181b', padding: '4px 8px', borderRadius: 6 }}>
                                                                                            {item.toolName || item.toolCode} {item.accessLevelDesc && <span style={{ color: '#52525b' }}>({item.accessLevelDesc})</span>}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default PersonnelListView;
