import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Edit2, Mail, Briefcase, Building } from 'lucide-react';

export interface PersonNodeData {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
    department?: string;
    isRoot?: boolean;
    level?: number;
    onEdit?: (user: any) => void;
}

const PersonNode = ({ data }: NodeProps<any>) => {
    const { name, email, jobTitle, department, isRoot, level, onEdit } = data as PersonNodeData;

    // Esquema de cores baseado na hierarquia (inspirado no print)
    const getColors = () => {
        if (isRoot) return { bg: '#fef3c7', border: '#fbbf24', accent: '#d97706', text: '#92400e' };
        if (level === 1) return { bg: '#fef3c7', border: '#fbbf24', accent: '#fbbf24', text: '#92400e' };

        // Departamentos específicos podem ter cores diferentes se desejado (como no print)
        if (department?.toLowerCase().includes('comercial')) return { bg: '#ecfdf5', border: '#10b981', accent: '#10b981', text: '#065f46' };
        if (department?.toLowerCase().includes('produto')) return { bg: '#eff6ff', border: '#3b82f6', accent: '#3b82f6', text: '#1e40af' };

        // Padrão (Roxo claro como a maioria no print)
        return { bg: '#f5f3ff', border: '#8b5cf6', accent: '#8b5cf6', text: '#5b21b6' };
    };

    const colors = getColors();

    return (
        <div
            className="person-node shadow-lg"
            style={{
                background: 'white',
                border: `1px solid ${colors.border}`,
                borderTop: `4px solid ${colors.accent}`,
                borderRadius: '8px',
                padding: '12px',
                minWidth: '220px',
                transition: 'all 0.2s ease'
            }}
        >
            <Handle type="target" position={Position.Top} style={{ background: colors.accent }} />

            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start mb-1">
                    <div
                        className="flex items-center justify-center rounded-full text-xs font-bold"
                        style={{
                            width: '24px',
                            height: '24px',
                            background: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`
                        }}
                    >
                        {name.charAt(0)}
                    </div>
                    <button
                        onClick={() => onEdit?.({ id: data.id, name, email, jobTitle, department })}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <Edit2 size={12} />
                    </button>
                </div>

                <div style={{ color: '#18181b', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                </div>

                <div className="flex items-center gap-1.5 opacity-70" style={{ fontSize: '11px', color: colors.text }}>
                    <Briefcase size={10} />
                    {jobTitle || 'Sem Cargo'}
                </div>

                <div className="flex items-center gap-1.5 opacity-60" style={{ fontSize: '10px', color: '#52525b' }}>
                    <Building size={10} />
                    {department || 'Geral'}
                </div>

                <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-gray-100" style={{ fontSize: '10px', color: '#71717a' }}>
                    <Mail size={10} />
                    {email}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} style={{ background: colors.accent }} />
        </div>
    );
};

export default memo(PersonNode);
