import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

import { API_URL } from '../config';
import { EntityAuditHistory } from './EntityAuditHistory';

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
    department?: { name: string; unitId?: string; unit?: { name: string } };
    kitItems?: RoleKitItem[];
}

interface Department {
    id: string;
    name: string;
    unitId?: string;
    unit?: { name: string };
}

interface Unit {
    id: string;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Cargo a editar; null = modo criação. Em modo criação, departmentId é obrigatório. */
    role: Role | null;
    /** Departamento ao qual o novo cargo será vinculado (apenas em modo criação). */
    departmentId?: string | null;
    /** Unidades e departamentos para os selects (da estrutura /api/structure). */
    units?: Unit[];
    departments?: Department[];
    onUpdate: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    onOpenAuditHistory?: (entidadeId: string, entidadeTipo: string) => void;
}

export const EditRoleKitModal: React.FC<Props> = ({ isOpen, onClose, role, departmentId, units = [], departments = [], onUpdate, showToast, onOpenAuditHistory }) => {
    if (!isOpen) return null;

    const isCreateMode = !role;
    const [roleName, setRoleName] = useState('');
    const [roleCode, setRoleCode] = useState('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [kitItems, setKitItems] = useState<RoleKitItem[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [toolsAndLevelsMap, setToolsAndLevelsMap] = useState<Record<string, { label: string; value: string }[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const selectedDept = departments.find(d => d.id === selectedDepartmentId);
    const unitOfSelectedDept = selectedDept?.unitId ? units.find(u => u.id === selectedDept.unitId) : null;

    useEffect(() => {
        if (isCreateMode) {
            setRoleName('');
            setRoleCode('');
            setSelectedDepartmentId(departmentId || '');
            const dept = departments.find(d => d.id === departmentId);
            setSelectedUnitId(dept?.unitId || '');
            setKitItems([]);
            setLoading(true);
            Promise.all([
                fetch(`${API_URL}/api/tools`).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}/api/tools-and-levels`).then(r => r.ok ? r.json() : {})
            ]).then(([toolsList, levelsMap]) => {
                setTools(toolsList || []);
                setToolsAndLevelsMap(levelsMap || {});
            }).catch(e => console.error(e)).finally(() => setLoading(false));
        } else if (role) {
            setRoleName(role.name);
            setRoleCode(role.code || '');
            setSelectedDepartmentId(role.departmentId || '');
            const dept = departments.find(d => d.id === role.departmentId) ?? (role.department as Department & { unitId?: string });
            setSelectedUnitId(dept?.unitId || (role.department as any)?.unit?.id || '');
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
    }, [role?.id, role?.name, role?.code, role?.departmentId, departmentId, isOpen, isCreateMode, departments]);

    useEffect(() => {
        if (role) {
            setRoleName(role.name);
            setRoleCode(role.code || '');
        }
    }, [role?.name, role?.code]);

    // Ao trocar departamento, atualiza Unidade para a unidade do novo departamento
    useEffect(() => {
        if (selectedDepartmentId && selectedDept?.unitId && selectedUnitId !== selectedDept.unitId) {
            setSelectedUnitId(selectedDept.unitId);
        }
    }, [selectedDepartmentId, selectedDept?.unitId]);

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
        const name = roleName.trim();
        if (!name) {
            showToast('Informe o nome do cargo.', 'warning');
            return;
        }
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

            if (isCreateMode) {
                const deptId = selectedDepartmentId || departmentId;
                if (!deptId) {
                    showToast('Departamento não informado.', 'error');
                    setSaving(false);
                    return;
                }
                const res = await fetch(`${API_URL}/api/structure/roles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        code: roleCode.trim() || null,
                        departmentId: deptId,
                        kitItems: validItems
                    })
                });
                if (res.ok) {
                    showToast('Cargo criado com sucesso!', 'success');
                    onUpdate();
                    onClose();
                } else {
                    const err = await res.json();
                    showToast(err.error || 'Erro ao criar cargo.', 'error');
                }
            } else if (role) {
                const payload: { name: string; code?: string | null; departmentId?: string; kitItems: typeof validItems } = {
                    name: name || role.name,
                    code: roleCode.trim() || null,
                    kitItems: validItems
                };
                if (selectedDepartmentId && selectedDepartmentId !== role.departmentId) {
                    payload.departmentId = selectedDepartmentId;
                }
                const res = await fetch(`${API_URL}/api/structure/roles/${role.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast('Cargo e kit atualizados!', 'success');
                    onUpdate();
                    onClose();
                } else {
                    const err = await res.json();
                    showToast(err.error || 'Erro ao salvar cargo.', 'error');
                }
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
                    <h2>{isCreateMode ? 'Novo cargo e kit básico' : 'Editar cargo e kit básico'}</h2>
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
                                <h4 style={{ color: '#f4f4f5', margin: '0 0 12px 0', fontSize: 14 }}>Departamento e Unidade</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#a1a1aa' }}>Departamento</label>
                                        <select
                                            value={selectedDepartmentId}
                                            onChange={e => setSelectedDepartmentId(e.target.value)}
                                            className="form-input"
                                            style={{ width: '100%', marginTop: 4 }}
                                        >
                                            <option value="">Selecione...</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#a1a1aa' }}>Unidade</label>
                                        <select
                                            value={selectedUnitId}
                                            onChange={e => setSelectedUnitId(e.target.value)}
                                            className="form-input"
                                            style={{ width: '100%', marginTop: 4 }}
                                        >
                                            <option value="">Selecione...</option>
                                            {units.filter(u => !selectedDepartmentId || selectedDept?.unitId === u.id).map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <p style={{ color: '#71717a', fontSize: 12, margin: '12px 0 0 0' }}>Ao alterar o departamento, todos os colaboradores deste cargo serão movidos junto.</p>
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

                            {!isCreateMode && role && (
                                <EntityAuditHistory
                                    entidadeId={role.id}
                                    entidadeTipo="Role"
                                    limit={5}
                                    onOpenFullHistory={onOpenAuditHistory ? (p) => onOpenAuditHistory(p.entidadeId, p.entidadeTipo) : undefined}
                                />
                            )}
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
