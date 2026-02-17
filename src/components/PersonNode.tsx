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

    // Esquema de cores dark premium baseado no departamento
    const getColors = () => {
        const dept = department?.toLowerCase() || '';

        if (isRoot) return {
            bg: 'rgba(251, 191, 36, 0.15)',
            border: '#fbbf24',
            accent: '#fbbf24',
            text: '#fbbf24',
            gradient: 'linear-gradient(135deg, #18181b 0%, #422006 100%)'
        };

        if (dept.includes('comercial') || dept.includes('vendas')) return {
            bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', accent: '#10b981', text: '#34d399',
            gradient: 'linear-gradient(135deg, #18181b 0%, #064e3b 100%)'
        };

        if (dept.includes('produto') || dept.includes('tecnologia') || dept.includes('it')) return {
            bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', accent: '#3b82f6', text: '#60a5fa',
            gradient: 'linear-gradient(135deg, #18181b 0%, #172554 100%)'
        };

        if (dept.includes('pessoas') || dept.includes('rh') || dept.includes('performance')) return {
            bg: 'rgba(244, 114, 182, 0.15)', border: '#f472b6', accent: '#f472b6', text: '#fb923c',
            gradient: 'linear-gradient(135deg, #18181b 0%, #831843 100%)'
        };

        if (dept.includes('financeiro') || dept.includes('contabil')) return {
            bg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6', accent: '#8b5cf6', text: '#a78bfa',
            gradient: 'linear-gradient(135deg, #18181b 0%, #2e1065 100%)'
        };

        if (dept.includes('marketing') || dept.includes('growth')) return {
            bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', accent: '#ef4444', text: '#fca5a5',
            gradient: 'linear-gradient(135deg, #18181b 0%, #7f1d1d 100%)'
        };

        // Padrão: Lilás Escuro/Dark Lilac
        return {
            bg: 'rgba(167, 139, 250, 0.1)', border: '#4c1d95', accent: '#7c3aed', text: '#a78bfa',
            gradient: 'linear-gradient(135deg, #0f172a 0%, #2e1065 100%)'
        };
    };

    const colors = getColors();

    return (
        <div
            className="person-node"
            style={{
                background: colors.gradient,
                border: `1px solid ${colors.border}44`,
                borderLeft: `3px solid ${colors.accent}`,
                borderRadius: '12px',
                padding: '16px',
                minWidth: '240px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Handle Target (Top) */}
            <Handle
                type="target"
                position={Position.Top}
                style={{
                    background: colors.accent,
                    width: '8px',
                    height: '8px',
                    border: '2px solid #09090b',
                    top: '-4px'
                }}
            />

            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div
                        className="flex items-center justify-center rounded-lg text-sm font-bold shadow-inner"
                        style={{
                            width: '32px',
                            height: '32px',
                            background: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}66`
                        }}
                    >
                        {name.charAt(0)}
                    </div>
                    <button
                        onClick={() => onEdit?.({ id: data.id, name, email, jobTitle, department })}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all shadow-sm"
                    >
                        <Edit2 size={14} />
                    </button>
                </div>

                <div style={{ marginTop: 4 }}>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '15px', marginBottom: 2 }}>
                        {name}
                    </div>
                    <div className="flex items-center gap-2" style={{ color: '#a1a1aa', fontSize: '12px' }}>
                        <Briefcase size={12} className="shrink-0" />
                        <span className="truncate">{jobTitle || 'Sem Cargo'}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2" style={{ fontSize: '11px', color: '#71717a' }}>
                        <Building size={11} className="shrink-0" />
                        <span className="truncate">{department || 'Geral'}</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ fontSize: '11px', color: '#71717a' }}>
                        <Mail size={11} className="shrink-0" />
                        <span className="truncate">{email}</span>
                    </div>
                </div>
            </div>

            {/* Handle Source (Bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{
                    background: colors.accent,
                    width: '10px',
                    height: '10px',
                    border: '2px solid #09090b',
                    bottom: '-5px'
                }}
            />
        </div>
    );
};

export default memo(PersonNode);
