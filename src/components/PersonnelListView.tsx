import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import { Building2, Briefcase, ChevronDown, ChevronRight, Trash2, Pencil } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
    department?: string;
    unit?: string;
    systemProfile: string;
    managerId?: string | null;
    manager?: { name: string };
}

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
    onDeleteUser?: (user: User) => void;
    onEditDepartment: (dept: Department) => void;
    onDeleteDepartment: (dept: Department) => void;
    onEditRole?: (role: Role) => void;
}

const UNIT_ORDER = ['3C+', 'Evolux', 'Dizify', 'Instituto 3C', 'FiqOn', 'Dizparos'];

export const PersonnelListView: React.FC<PersonnelListViewProps> = ({
    units: unitsFromApi, users, departments, roles, onEditUser, onDeleteUser, onEditDepartment, onDeleteDepartment, onEditRole
}) => {
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
    const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
    const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

    const toggleUnit = (key: string) => setExpandedUnits(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDept = (key: string) => setExpandedDepts(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleRole = (key: string) => setExpandedRoles(prev => ({ ...prev, [key]: !prev[key] }));

    const units = React.useMemo(() => {
        if (Array.isArray(unitsFromApi) && unitsFromApi.length > 0) {
            return UNIT_ORDER.filter(name => unitsFromApi.some((u: Unit) => u.name === name))
                .concat(unitsFromApi.filter((u: Unit) => !UNIT_ORDER.includes(u.name)).map((u: Unit) => u.name));
        }
        const set = new Set(users.map(u => (u.unit || '').trim()).filter(Boolean));
        return UNIT_ORDER.filter(u => set.has(u)).concat([...set].filter(u => !UNIT_ORDER.includes(u)).sort());
    }, [unitsFromApi, users]);

    const getUsersByUnitDeptJob = (unit: string, dept: string, jobTitle: string) =>
        users.filter(u => (u.unit || '').trim() === unit && u.department === dept && (u.jobTitle || '').trim() === jobTitle);

    const findDepartment = (name: string) => departments.find(d => d.name === name);
    const findRole = (deptName: string, roleName: string) =>
        roles.find(r => r.name === roleName && (r.department?.name === deptName));

    const getUsersByDeptJob = (deptName: string, jobTitle: string) =>
        users.filter(u => u.department === deptName && (u.jobTitle || '').trim() === jobTitle);

    const showByUnit = units.length > 0;
    const fallbackDeptNames = React.useMemo(() => {
        if (showByUnit) return [];
        return [...new Set(users.map(u => u.department).filter(Boolean))] as string[];
    }, [showByUnit, users]);

    const unitList = React.useMemo(() => {
        if (Array.isArray(unitsFromApi) && unitsFromApi.length > 0) {
            return units.map(unitName => {
                const apiUnit = unitsFromApi.find((u: Unit) => u.name === unitName);
                return apiUnit ? { name: unitName, departments: apiUnit.departments || [] } : { name: unitName, departments: [] };
            });
        }
        return units.map(unitName => ({
            name: unitName,
            departments: (departments as Department[]).filter(d => {
                const usersInUnit = users.filter(u => (u.unit || '').trim() === unitName);
                const deptNames = new Set(usersInUnit.map(u => u.department).filter(Boolean));
                return deptNames.has(d.name);
            })
        }));
    }, [unitsFromApi, units, departments, users]);

    return (
        <div className="personnel-list-view" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: 24 }}>
            {showByUnit ? unitList.map(({ name: unitName, departments: unitDepts }) => {
                const usersInUnit = users.filter(u => (u.unit || '').trim() === unitName);
                const deptList = unitDepts.length > 0
                    ? unitDepts
                    : [...new Set(usersInUnit.map(u => u.department).filter(Boolean))].map((d: string) => ({ id: '', name: d, roles: roles.filter((r: Role) => r.department?.name === d) }));
                const unitKey = `unit-${unitName}`;
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
                                <Building2 size={22} color="#8b5cf6" />
                                <span style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '16px' }}>UNIDADE: {unitName}</span>
                            </div>
                            {expandedUnits[unitKey] ? <ChevronDown size={20} color="#71717a" /> : <ChevronRight size={20} color="#71717a" />}
                        </div>

                        {expandedUnits[unitKey] && (
                            <div style={{ padding: '12px 16px 16px', background: '#09090b' }}>
                                {deptList.map((dept: Department) => {
                                    const deptName = dept.name;
                                    const usersInDept = usersInUnit.filter(u => u.department === deptName);
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
                                                            <button onClick={(e) => { e.stopPropagation(); onEditDepartment(deptEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Editar departamento"><Pencil size={14} color="#71717a" /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); onDeleteDepartment(deptEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Excluir departamento"><Trash2 size={14} color="#ef4444" /></button>
                                                        </>
                                                    )}
                                                    {expandedDepts[deptKey] ? <ChevronDown size={18} color="#52525b" /> : <ChevronRight size={18} color="#52525b" />}
                                                </div>
                                            </div>

                                            {expandedDepts[deptKey] && (
                                                <div style={{ padding: '8px 12px 12px 24px', background: '#09090b' }}>
                                                    {jobTitles.map((jobTitle: string) => {
                                                        const roleUsers = getUsersByUnitDeptJob(unitName, deptName, jobTitle);
                                                        const roleEntity = findRole(deptName, jobTitle);
                                                        const roleKey = `${deptKey}-${jobTitle}`;
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
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        {onEditRole && roleEntity && (
                                                                            <button onClick={(e) => { e.stopPropagation(); onEditRole(roleEntity); }} title="Editar kit do cargo" style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}><Pencil size={14} color="#a78bfa" /></button>
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
                                                                                    onClick={() => onEditUser(user)}
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
            }) : (
                <>
                    <div style={{ padding: '12px 16px', marginBottom: 16, background: '#18181b', borderRadius: 8, color: '#a1a1aa', fontSize: 13 }}>
                        Nenhuma unidade definida nos colaboradores. Exibindo por departamento.
                    </div>
                    {fallbackDeptNames.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#71717a', fontSize: 14 }}>
                            Nenhum colaborador com departamento definido. Edite os colaboradores e informe unidade e departamento.
                        </div>
                    ) : fallbackDeptNames.map(deptName => {
                        const usersInDept = users.filter(u => u.department === deptName);
                        const jobTitles = [...new Set(usersInDept.map(u => (u.jobTitle || '').trim()).filter(Boolean))];
                        const deptKey = `fallback-${deptName}`;
                        const deptEntity = findDepartment(deptName);
                        return (
                            <div key={deptKey} style={{ marginBottom: 12, border: '1px solid #27272a', borderRadius: '10px', overflow: 'hidden', background: '#09090b' }}>
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
                                                <button onClick={(e) => { e.stopPropagation(); onEditDepartment(deptEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Editar departamento"><Pencil size={14} color="#71717a" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteDepartment(deptEntity); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Excluir departamento"><Trash2 size={14} color="#ef4444" /></button>
                                            </>
                                        )}
                                        {expandedDepts[deptKey] ? <ChevronDown size={18} color="#52525b" /> : <ChevronRight size={18} color="#52525b" />}
                                    </div>
                                </div>
                                {expandedDepts[deptKey] && (
                                    <div style={{ padding: '8px 12px 12px 24px', background: '#09090b' }}>
                                        {jobTitles.map(jobTitle => {
                                            const roleUsers = getUsersByDeptJob(deptName, jobTitle);
                                            const roleEntity = findRole(deptName, jobTitle);
                                            const roleKey = `${deptKey}-${jobTitle}`;
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
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {onEditRole && roleEntity && (
                                                                <button onClick={(e) => { e.stopPropagation(); onEditRole(roleEntity); }} title="Editar kit do cargo" style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}><Pencil size={14} color="#a78bfa" /></button>
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
                                                                        onClick={() => onEditUser(user)}
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
                </>
            )}
        </div>
    );
};

export default PersonnelListView;
