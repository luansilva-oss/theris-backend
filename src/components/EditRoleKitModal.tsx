import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

import { API_URL } from '../config';

interface RoleKitItem {
    id?: string;
    toolCode: string;
    toolName: string;
    accessLevelDesc?: string | null;
    criticality?: string | null;
    isCritical?: boolean;
}

interface Tool {
    id: string;
    name: string;
    acronym?: string;
    availableAccessLevels?: string[];
}

interface Role {
    id: string;
    name: string;
    code?: string | null;
    departmentId: string;
    department?: { name: string };
    kitItems?: RoleKitItem[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    role: Role | null;
    onUpdate: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const EditRoleKitModal: React.FC<Props> = ({ isOpen, onClose, role, onUpdate, showToast }) => {
    if (!isOpen) return null;

    const [roleName, setRoleName] = useState('');
    const [roleCode, setRoleCode] = useState('');
    const [kitItems, setKitItems] = useState<RoleKitItem[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [toolsAndLevelsMap, setToolsAndLevelsMap] = useState<Record<string, { label: string; value: string }[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (role) {
            setRoleName(role.name);
            setRoleCode(role.code || '');
            setLoading(true);
            Promise.all([
                fetch(`${API_URL}/api/structure/roles/${role.id}/kit`).then(r => r.ok ? r.json() : null),
                fetch(`${API_URL}/api/tools`).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}/api/tools-and-levels`).then(r => r.ok ? r.json() : {})
            ]).then(([roleData, toolsList, levelsMap]) => {
                setKitItems(roleData?.kitItems?.map((it: RoleKitItem) => ({
                    toolCode: it.toolCode,
                    toolName: it.toolName,
                    accessLevelDesc: it.accessLevelDesc,
                    criticality: it.criticality,
                    isCritical: it.isCritical !== false
                })) || []);
                setTools(toolsList || []);
                setToolsAndLevelsMap(levelsMap || {});
            }).catch(e => console.error(e)).finally(() => setLoading(false));
        }
    }, [role?.id, role?.name, role?.code, isOpen]);

    useEffect(() => {
        if (role) {
            setRoleName(role.name);
            setRoleCode(role.code || '');
        }
    }, [role?.name, role?.code]);

    /** Normaliza nome para match: remove sigla entre parênteses e espaços extras (ex: "Clicsign (CS)" → "Clicsign") */
    const normalizeToolNameForMatch = (name: string): string =>
        (name || '').replace(/\s*\([^)]*\)\s*/g, '').trim();

    const getLevelsForTool = (toolId: string): { label: string; value: string }[] => {
        const t = tools.find(x => x.id === toolId);
        const toolName = (t?.name || '').trim();
        if (!toolName) return [];

        const map = toolsAndLevelsMap;
        const exact = map[toolName];
        if (exact && exact.length > 0) return exact;

        const normalized = normalizeToolNameForMatch(toolName).toLowerCase();
        if (!normalized) return [];

        const matchedKey = Object.keys(map).find(
            (key) => normalizeToolNameForMatch(key).toLowerCase() === normalized
        );
        const levels = matchedKey ? map[matchedKey] : [];
        return Array.isArray(levels) && levels.length > 0 ? levels : [];
    };

    const addRow = () => {
        setKitItems([...kitItems, {
            toolCode: '',
            toolName: '',
            accessLevelDesc: null,
            criticality: null,
            isCritical: true
        }]);
    };

    const updateRow = (index: number, field: keyof RoleKitItem, value: any) => {
        const next = [...kitItems];
        if (field === 'toolCode' && value) {
            const t = tools.find(x => x.id === value);
            const levels = getLevelsForTool(value);
            const firstLevel = levels[0];
            next[index] = {
                ...next[index],
                toolCode: value,
                toolName: t ? t.name : next[index].toolName,
                accessLevelDesc: firstLevel ? (typeof firstLevel === 'string' ? firstLevel : firstLevel.value) : null
            };
        } else {
            (next[index] as any)[field] = value;
        }
        setKitItems(next);
    };

    const removeRow = (index: number) => {
        setKitItems(kitItems.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!role) return;
        setSaving(true);
        try {
            const validItems = kitItems
                .filter(it => it.toolCode && it.toolName)
                .map(it => ({
                    toolCode: it.toolCode,
                    toolName: it.toolName,
                    accessLevelDesc: it.accessLevelDesc || null,
                    criticality: it.criticality || null,
                    isCritical: it.isCritical !== false
                }));

            const res = await fetch(`${API_URL}/api/structure/roles/${role.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: roleName.trim() || role.name,
                    code: roleCode.trim() || null,
                    kitItems: validItems
                })
            });
            if (res.ok) {
                showToast('Cargo e kit atualizados!', 'success');
                onUpdate();
                onClose();
            } else {
                const err = await res.json();
                showToast(err.error || 'Erro ao salvar cargo.', 'error');
            }
        } catch (e) {
            showToast('Erro de conexão.', 'error');
        }
        setSaving(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '720px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h2>Editar cargo e kit básico</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                    {loading ? (
                        <div style={{ padding: 24, color: '#71717a', textAlign: 'center' }}>Carregando...</div>
                    ) : (
                        <>
                            <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a', marginBottom: 16 }}>
                                <h4 style={{ color: '#f4f4f5', margin: '0 0 12px 0', fontSize: 14 }}>Nome do cargo</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#a1a1aa' }}>Código (ex: KBS-BO-1)</label>
                                        <input
                                            value={roleCode}
                                            onChange={e => setRoleCode(e.target.value)}
                                            placeholder="KBS-BO-1"
                                            className="form-input"
                                            style={{ width: '100%', marginTop: 4 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#a1a1aa' }}>Nome</label>
                                        <input
                                            value={roleName}
                                            onChange={e => setRoleName(e.target.value)}
                                            placeholder="Ex: CEO"
                                            className="form-input"
                                            style={{ width: '100%', marginTop: 4 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a', marginBottom: 16 }}>
                                <h4 style={{ color: '#f4f4f5', margin: '0 0 12px 0', fontSize: 14 }}>Kit básico de ferramentas</h4>
                                <p style={{ color: '#71717a', fontSize: 12, margin: '0 0 12px 0' }}>Selecione apenas ferramentas já cadastradas no Catálogo. Novas ferramentas criadas no Catálogo aparecem aqui automaticamente.</p>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                                                <th style={{ padding: '10px 8px', textAlign: 'left', width: '36%' }}>Ferramenta</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'left', width: '28%' }}>Nível de acesso</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'left', width: '18%' }}>Criticidade</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'left', width: '12%' }}>Crítico</th>
                                                <th style={{ padding: '10px 8px', width: 44 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {kitItems.map((item, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #27272a' }}>
                                                    <td style={{ padding: '8px' }}>
                                                        <select
                                                            value={item.toolCode}
                                                            onChange={e => {
                                                                const id = e.target.value;
                                                                const t = tools.find(x => x.id === id);
                                                                if (t) updateRow(index, 'toolCode', id);
                                                            }}
                                                            className="form-input"
                                                            style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {tools.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}{t.acronym ? ` (${t.acronym})` : ''}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <select
                                                            value={item.accessLevelDesc || ''}
                                                            onChange={e => updateRow(index, 'accessLevelDesc', e.target.value || null)}
                                                            disabled={!item.toolCode || getLevelsForTool(item.toolCode).length === 0}
                                                            className="form-input"
                                                            style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
                                                            title={item.toolCode && getLevelsForTool(item.toolCode).length === 0 ? 'Nenhum nível mapeado para esta ferramenta' : undefined}
                                                        >
                                                            <option value="">—</option>
                                                            {(item.toolCode ? getLevelsForTool(item.toolCode) : []).map(l => {
                                                                const lab = typeof l === 'string' ? l : l.label;
                                                                const val = typeof l === 'string' ? l : l.value;
                                                                return <option key={val} value={val}>{lab}</option>;
                                                            })}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <select
                                                            value={item.criticality || ''}
                                                            onChange={e => updateRow(index, 'criticality', e.target.value || null)}
                                                            className="form-input"
                                                            style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
                                                        >
                                                            <option value="">—</option>
                                                            <option value="Alta">Alta</option>
                                                            <option value="Média">Média</option>
                                                            <option value="Baixa">Baixa</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <select
                                                            value={item.isCritical ? 'Sim' : 'Não'}
                                                            onChange={e => updateRow(index, 'isCritical', e.target.value === 'Sim')}
                                                            className="form-input"
                                                            style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
                                                        >
                                                            <option value="Sim">Sim</option>
                                                            <option value="Não">Não</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRow(index)}
                                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button type="button" onClick={addRow} className="btn-mini" style={{ marginTop: 10 }}>
                                    <Plus size={14} style={{ marginRight: 6 }} /> Adicionar ferramenta
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <div style={{ padding: 16, borderTop: '1px solid #27272a', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} className="btn-verify" style={{ background: 'transparent', border: '1px solid #374151', color: '#9CA3AF' }}>
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving || loading} className="btn-verify">
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
