import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

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

    const [kitItems, setKitItems] = useState<RoleKitItem[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Add form
    const [selectedToolId, setSelectedToolId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [criticality, setCriticality] = useState<string>('');

    useEffect(() => {
        if (role) {
            setLoading(true);
            Promise.all([
                fetch(`${API_URL}/api/structure/roles/${role.id}/kit`).then(r => r.ok ? r.json() : null),
                fetch(`${API_URL}/api/tools`).then(r => r.ok ? r.json() : [])
            ]).then(([roleData, toolsList]) => {
                setKitItems(roleData?.kitItems?.map((it: RoleKitItem) => ({
                    toolCode: it.toolCode,
                    toolName: it.toolName,
                    accessLevelDesc: it.accessLevelDesc,
                    criticality: it.criticality,
                    isCritical: it.isCritical !== false
                })) || []);
                setTools(toolsList || []);
            }).catch(e => console.error(e)).finally(() => setLoading(false));
        }
    }, [role?.id, isOpen]);

    const selectedTool = tools.find(t => t.id === selectedToolId);
    const levels = selectedTool?.availableAccessLevels?.length
        ? selectedTool.availableAccessLevels
        : ['Admin', 'User', 'Viewer'];

    const addItem = () => {
        if (!selectedToolId || !selectedTool) return;
        const level = selectedLevel || levels[0];
        if (kitItems.some(k => k.toolCode === selectedTool.id)) {
            showToast('Esta ferramenta já está no kit.', 'warning');
            return;
        }
        setKitItems([...kitItems, {
            toolCode: selectedTool.id,
            toolName: selectedTool.name,
            accessLevelDesc: level,
            criticality: criticality || null,
            isCritical: true
        }]);
        setSelectedToolId('');
        setSelectedLevel('');
        setCriticality('');
    };

    const removeItem = (index: number) => {
        setKitItems(kitItems.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!role) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/structure/roles/${role.id}/kit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: kitItems.map(it => ({
                        toolCode: it.toolCode,
                        toolName: it.toolName,
                        accessLevelDesc: it.accessLevelDesc || null,
                        criticality: it.criticality || null,
                        isCritical: it.isCritical !== false
                    }))
                })
            });
            if (res.ok) {
                showToast('Kit do cargo atualizado!', 'success');
                onUpdate();
                onClose();
            } else {
                const err = await res.json();
                showToast(err.error || 'Erro ao salvar.', 'error');
            }
        } catch (e) {
            showToast('Erro de conexão.', 'error');
        }
        setSaving(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '560px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h2>Kit de ferramentas e níveis — {role?.name}</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                    {loading ? (
                        <div style={{ padding: 24, color: '#71717a', textAlign: 'center' }}>Carregando...</div>
                    ) : (
                        <>
                            <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a', marginBottom: 16 }}>
                                <h4 style={{ color: '#f4f4f5', margin: '0 0 12px 0', fontSize: 14 }}>Adicionar ferramenta ao kit padrão</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#a1a1aa' }}>Ferramenta</label>
                                        <select
                                            value={selectedToolId}
                                            onChange={e => { setSelectedToolId(e.target.value); setSelectedLevel(''); }}
                                            className="form-input"
                                            style={{ width: '100%', marginTop: 4 }}
                                        >
                                            <option value="">Selecione...</option>
                                            {tools.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}{t.acronym ? ` (${t.acronym})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedTool && (
                                        <div>
                                            <label style={{ fontSize: 12, color: '#a1a1aa' }}>Nível de acesso padrão</label>
                                            <select
                                                value={selectedLevel}
                                                onChange={e => setSelectedLevel(e.target.value)}
                                                className="form-input"
                                                style={{ width: '100%', marginTop: 4 }}
                                            >
                                                {levels.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ fontSize: 12, color: '#a1a1aa' }}>Criticidade (opcional)</label>
                                        <select
                                            value={criticality}
                                            onChange={e => setCriticality(e.target.value)}
                                            className="form-input"
                                            style={{ width: '100%', marginTop: 4 }}
                                        >
                                            <option value="">—</option>
                                            <option value="Alta">Alta</option>
                                            <option value="Média">Média</option>
                                            <option value="Baixa">Baixa</option>
                                        </select>
                                    </div>
                                    <button type="button" onClick={addItem} className="btn-mini" style={{ alignSelf: 'flex-start' }}>
                                        <Plus size={14} style={{ marginRight: 6 }} /> Adicionar
                                    </button>
                                </div>
                            </div>

                            <h4 style={{ color: '#f4f4f5', margin: '0 0 8px 0', fontSize: 14 }}>Itens do kit</h4>
                            {kitItems.length === 0 ? (
                                <div style={{ padding: 16, color: '#52525b', fontSize: 13, fontStyle: 'italic' }}>Nenhuma ferramenta no kit. Adicione acima.</div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {kitItems.map((item, index) => (
                                        <li
                                            key={`${item.toolCode}-${index}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 12px',
                                                background: '#18181b',
                                                border: '1px solid #27272a',
                                                borderRadius: 8,
                                                marginBottom: 6
                                            }}
                                        >
                                            <div>
                                                <span style={{ color: '#e4e4e7', fontWeight: 500 }}>{item.toolName}</span>
                                                <span style={{ color: '#71717a', fontSize: 12, marginLeft: 8 }}>{item.accessLevelDesc || '—'}</span>
                                                {item.criticality && (
                                                    <span style={{ fontSize: 11, color: '#a78bfa', marginLeft: 8 }}>{item.criticality}</span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
                <div style={{ padding: 16, borderTop: '1px solid #27272a', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} className="btn-verify" style={{ background: 'transparent', border: '1px solid #374151', color: '#9CA3AF' }}>
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving || loading} className="btn-verify">
                        {saving ? 'Salvando...' : 'Salvar kit'}
                    </button>
                </div>
            </div>
        </div>
    );
};
