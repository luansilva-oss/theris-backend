import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import { Building2, Briefcase, User as UserIcon, ChevronDown, ChevronRight, Trash2, Pencil } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
    department?: string;
    systemProfile: string;
    managerId?: string | null;
    manager?: { name: string };
}

interface Department {
    id: string;
    name: string;
}

interface Role {
    id: string;
    name: string;
    departmentId: string;
}

interface PersonnelListViewProps {
    users: User[];
    departments: Department[];
    roles: Role[];
    onEditUser: (user: User) => void;
    onDeleteUser?: (user: User) => void;
    onEditDepartment: (dept: Department) => void;
    onDeleteDepartment: (dept: Department) => void;
}

export const PersonnelListView: React.FC<PersonnelListViewProps> = ({
    users, departments, roles, onEditUser, onDeleteUser, onEditDepartment, onDeleteDepartment
}) => {
    const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
    const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

    const toggleDept = (deptId: string) => {
        setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
    };

    const toggleRole = (roleId: string) => {
        setExpandedRoles(prev => ({ ...prev, [roleId]: !prev[roleId] }));
    };

    const getRolesForDept = (deptId: string) => roles.filter(r => r.departmentId === deptId);
    const getUsersForRole = (roleName: string, deptName: string) =>
        users.filter(u => u.jobTitle === roleName && u.department === deptName);

    return (
        <div className="personnel-list-view" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {departments.map(dept => (
                <div key={dept.id} className="dept-section" style={{ border: '1px solid #1f1f22', borderRadius: '12px', overflow: 'hidden', background: '#09090b' }}>
                    <div
                        style={{
                            padding: '16px 20px',
                            background: '#18181b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderBottom: expandedDepts[dept.id] ? '1px solid #1f1f22' : 'none'
                        }}
                    >
                        <div
                            onClick={() => toggleDept(dept.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}
                        >
                            <Building2 size={20} color="#a78bfa" />
                            <span style={{ fontWeight: 600, color: '#f4f4f5', fontSize: '16px' }}>{dept.name}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditDepartment(dept); }}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, transition: '0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                    onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
                                >
                                    <Pencil size={16} color="#71717a" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteDepartment(dept); }}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, transition: '0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                    onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
                                >
                                    <Trash2 size={16} color="#ef4444" />
                                </button>
                            </div>
                            <div onClick={() => toggleDept(dept.id)}>
                                {expandedDepts[dept.id] ? <ChevronDown size={20} color="#71717a" /> : <ChevronRight size={20} color="#71717a" />}
                            </div>
                        </div>
                    </div>

                    {expandedDepts[dept.id] && (
                        <div className="dept-content" style={{ padding: '8px 16px 16px 32px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#09090b' }}>
                            {getRolesForDept(dept.id).length === 0 ? (
                                <div style={{ padding: '10px', color: '#52525b', fontSize: '13px', fontStyle: 'italic' }}>Nenhum cargo cadastrado neste departamento.</div>
                            ) : (
                                getRolesForDept(dept.id).map(role => (
                                    <div key={role.id} className="role-section" style={{ border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
                                        <div
                                            onClick={() => toggleRole(role.id)}
                                            style={{
                                                padding: '12px 16px',
                                                background: '#18181b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                borderBottom: expandedRoles[role.id] ? '1px solid #27272a' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Briefcase size={18} color="#71717a" />
                                                <span style={{ fontWeight: 500, color: '#e4e4e7', fontSize: '14px' }}>{role.name}</span>
                                            </div>
                                            {expandedRoles[role.id] ? <ChevronDown size={16} color="#52525b" /> : <ChevronRight size={16} color="#52525b" />}
                                        </div>

                                        {expandedRoles[role.id] && (
                                            <div className="role-content" style={{ padding: '4px 0', background: '#09090b' }}>
                                                {getUsersForRole(role.name, dept.name).length === 0 ? (
                                                    <div style={{ padding: '10px 16px', color: '#52525b', fontSize: '12px', fontStyle: 'italic' }}>Nenhum colaborador alocado.</div>
                                                ) : (
                                                    getUsersForRole(role.name, dept.name).map(user => (
                                                        <div
                                                            key={user.id}
                                                            onClick={() => onEditUser(user)}
                                                            className="user-row"
                                                            style={{
                                                                padding: '10px 16px 10px 40px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.2s',
                                                                borderBottom: '1px solid #1f1f22'
                                                            }}
                                                            onMouseOver={(e) => (e.currentTarget.style.background = '#18181b')}
                                                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                                                        >
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>
                                                                {user.name.charAt(0)}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ color: '#e4e4e7', fontSize: '14px', fontWeight: 500 }}>{user.name}</div>
                                                                <div style={{ color: '#71717a', fontSize: '12px' }}>{user.email}</div>
                                                            </div>
                                                            {onDeleteUser && (
                                                                <button
                                                                    onClick={(e: MouseEvent) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`Deseja excluir ${user.name}?`)) onDeleteUser(user);
                                                                    }}
                                                                    title="Excluir colaborador"
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        padding: '4px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        borderRadius: '4px',
                                                                        opacity: 0.4,
                                                                        transition: 'opacity 0.2s'
                                                                    }}
                                                                    onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                                                                    onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.4'; }}
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
                                ))
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default PersonnelListView;
