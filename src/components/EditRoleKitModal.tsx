import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, User } from 'lucide-react';

import { API_URL } from '../config';
import { EntityAuditHistory } from './EntityAuditHistory';

/** API pode retornar array direto ou objeto com lista aninhada. */
function parseLeaderSearchResponse(data: unknown): { id: string; name: string; email: string }[] {
    let raw: unknown[] = [];
    if (Array.isArray(data)) {
        raw = data;
    } else if (data != null && typeof data === 'object') {
        const o = data as Record<string, unknown>;
        const nested = o.users ?? o.results ?? o.data ?? o.items;
        if (Array.isArray(nested)) raw = nested;
    }
    return raw
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .map((x) => ({
            id: String(x.id ?? ''),
            name: String(x.name ?? ''),
            email: String(x.email ?? ''),
        }))
        .filter((u) => u.id.length > 0 && u.name.length > 0);
}

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
    leaderId?: string | null;
    leader?: { id: string; name: string; email: string } | null;
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
    onUpdate: () => void | Promise<void>;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    onOpenAuditHistory?: (entidadeId: string, entidadeTipo: string) => void;
    /** Apenas SUPER_ADMIN vê a seção de líder do cargo. */
    currentUser?: { systemProfile: string } | null;
}

export const EditRoleKitModal: React.FC<Props> = ({
    isOpen,
    onClose,
    role,
    departmentId,
    units = [],
    departments = [],
    onUpdate,
    showToast,
    onOpenAuditHistory,
    currentUser = null,
}) => {
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

    const isSuperAdmin = currentUser?.systemProfile === 'SUPER_ADMIN';
    /** Só muda no PUT ao remover ou ao escolher alguém na lista. Pré-carrega com role.leader na primeira montagem. */
    const [leaderForPut, setLeaderForPut] = useState<{ id: string; name: string; email: string } | null>(() =>
        role?.leader?.id
            ? { id: role.leader.id, name: role.leader.name, email: role.leader.email || '' }
            : null
    );
    const [isSearchingReplacement, setIsSearchingReplacement] = useState(false);
    const [leaderSearch, setLeaderSearch] = useState('');
    const [leaderSuggestions, setLeaderSuggestions] = useState<{ id: string; name: string; email: string }[]>([]);
    const [isLeaderInputFocused, setIsLeaderInputFocused] = useState(false);
    const [leaderDropdownPos, setLeaderDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const leaderInputRef = useRef<HTMLInputElement | null>(null);
    const leaderBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedDept = departments.find(d => d.id === selectedDepartmentId);
    const unitOfSelectedDept = selectedDept?.unitId ? units.find(u => u.id === selectedDept.unitId) : null;

    const lastInitializedForRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (leaderBlurTimeoutRef.current) clearTimeout(leaderBlurTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            lastInitializedForRef.current = null;
            setIsSearchingReplacement(false);
            setIsLeaderInputFocused(false);
            setLeaderDropdownPos(null);
            setLeaderSearch('');
            setLeaderSuggestions([]);
            if (leaderBlurTimeoutRef.current) {
                clearTimeout(leaderBlurTimeoutRef.current);
                leaderBlurTimeoutRef.current = null;
            }
            return;
        }
        const key = isCreateMode
            ? `create-${departmentId}`
            : `edit-${role?.id}-${role?.leader?.id ?? 'noleader'}`;
        if (lastInitializedForRef.current === key) return;
        lastInitializedForRef.current = key;

        if (isCreateMode) {
            setLeaderForPut(null);
            setIsSearchingReplacement(false);
            setLeaderSearch('');
            setLeaderSuggestions([]);
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
            if (role.leader?.id) {
                setLeaderForPut({
                    id: role.leader.id,
                    name: role.leader.name,
                    email: role.leader.email || '',
                });
            } else {
                setLeaderForPut(null);
            }
            setIsSearchingReplacement(false);
            setLeaderSearch('');
            setLeaderSuggestions([]);
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
                if (roleData?.leader?.id) {
                    setLeaderForPut({
                        id: (roleData.leaderId as string) || roleData.leader.id,
                        name: roleData.leader.name,
                        email: roleData.leader.email || '',
                    });
                } else if (roleData?.leaderId && role.leader?.id === roleData.leaderId) {
                    setLeaderForPut({
                        id: role.leader.id,
                        name: role.leader.name,
                        email: role.leader.email || '',
                    });
                } else if (roleData != null && roleData.leaderId === null) {
                    setLeaderForPut(null);
                }
                setLeaderSearch('');
                setLeaderSuggestions([]);
            }).catch(e => console.error(e)).finally(() => setLoading(false));
        }
    }, [isOpen, role?.id, role?.leader?.id, departmentId, isCreateMode]);

    useEffect(() => {
        if (!isOpen || isCreateMode || !isSuperAdmin) return;
        const q = leaderSearch.trim();
        if (q.length < 2) {
            setLeaderSuggestions([]);
            return;
        }
        const ac = new AbortController();
        const t = window.setTimeout(() => {
            const ts = Date.now();
            (async () => {
                try {
                    const res = await fetch(
                        `${API_URL}/api/users/search?q=${encodeURIComponent(q)}&_=${ts}`,
                        {
                            credentials: 'include',
                            headers: { 'Cache-Control': 'no-cache' },
                            signal: ac.signal,
                        }
                    );
                    if (!res.ok) {
                        setLeaderSuggestions([]);
                        return;
                    }
                    const data: unknown = await res.json();
                    setLeaderSuggestions(parseLeaderSearchResponse(data));
                } catch (e) {
                    if ((e as { name?: string }).name === 'AbortError') return;
                    setLeaderSuggestions([]);
                }
            })();
        }, 300);
        return () => {
            window.clearTimeout(t);
            ac.abort();
        };
    }, [leaderSearch, isOpen, isCreateMode, isSuperAdmin]);

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
                    credentials: 'include',
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
                    await Promise.resolve(onUpdate());
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
                if (isSuperAdmin) {
                    (payload as { leaderId?: string | null }).leaderId = leaderForPut?.id ?? null;
                }
                const res = await fetch(`${API_URL}/api/structure/roles/${role.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast('Cargo e kit atualizados!', 'success');
                    await Promise.resolve(onUpdate());
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

    const showLeaderCard = Boolean(leaderForPut) && !isSearchingReplacement;
    const leaderInputValue = isSearchingReplacement || !leaderForPut ? leaderSearch : '';

    const clearLeaderBlurTimer = () => {
        if (leaderBlurTimeoutRef.current) {
            clearTimeout(leaderBlurTimeoutRef.current);
            leaderBlurTimeoutRef.current = null;
        }
    };

    const scheduleEndLeaderSearch = () => {
        clearLeaderBlurTimer();
        leaderBlurTimeoutRef.current = setTimeout(() => {
            leaderBlurTimeoutRef.current = null;
            setIsLeaderInputFocused(false);
            setLeaderDropdownPos(null);
            setIsSearchingReplacement(false);
            setLeaderSearch('');
            setLeaderSuggestions([]);
        }, 180);
    };

    const showLeaderDropdown =
        isLeaderInputFocused &&
        leaderSuggestions.length > 0 &&
        (isSearchingReplacement || !leaderForPut);

    const updateLeaderDropdownPosition = () => {
        const el = leaderInputRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setLeaderDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };

    useLayoutEffect(() => {
        if (!showLeaderDropdown) {
            setLeaderDropdownPos(null);
            return;
        }
        updateLeaderDropdownPosition();
        const onScrollOrResize = () => updateLeaderDropdownPosition();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [showLeaderDropdown, leaderSuggestions]);

    if (!isOpen) return null;

    const leaderDropdownPortal =
        typeof document !== 'undefined' &&
        showLeaderDropdown &&
        leaderDropdownPos != null &&
        createPortal(
            <div
                role="listbox"
                onMouseDown={(e) => e.preventDefault()}
                style={{
                    position: 'fixed',
                    top: leaderDropdownPos.top,
                    left: leaderDropdownPos.left,
                    width: leaderDropdownPos.width,
                    zIndex: 100020,
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: 'auto',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
                }}
            >
                {leaderSuggestions.map((u, idx) => (
                    <button
                        key={u.id}
                        type="button"
                        role="option"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            clearLeaderBlurTimer();
                            setLeaderForPut({
                                id: u.id,
                                name: u.name,
                                email: u.email || '',
                            });
                            setIsSearchingReplacement(false);
                            setIsLeaderInputFocused(false);
                            setLeaderSearch('');
                            setLeaderSuggestions([]);
                            setLeaderDropdownPos(null);
                        }}
                        style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: idx < leaderSuggestions.length - 1 ? '1px solid #3f3f46' : 'none',
                            color: '#e4e4e7',
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        <span style={{ fontWeight: 600, display: 'block' }}>{u.name}</span>
                        <span style={{ display: 'block', color: '#71717a', fontSize: 12, marginTop: 2 }}>{u.email}</span>
                    </button>
                ))}
            </div>,
            document.body
        );

    return (
        <>
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

                            {!isCreateMode && isSuperAdmin && role && (
                                <div
                                    className="card-base"
                                    style={{ background: '#18181b', border: '1px solid #27272a', marginBottom: 16, overflow: 'visible', position: 'relative', zIndex: 1 }}
                                >
                                    <h4 style={{ color: '#f4f4f5', margin: '0 0 12px 0', fontSize: 14 }}>Liderança</h4>
                                    <label style={{ fontSize: 12, color: '#a1a1aa' }}>Líder do cargo</label>

                                    {showLeaderCard && leaderForPut && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                marginTop: 10,
                                                padding: '12px 14px',
                                                background: '#27272a',
                                                borderRadius: 10,
                                                border: '1px solid #3f3f46',
                                            }}
                                        >
                                            <User size={22} color="#a1a1aa" style={{ flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 16px' }}>
                                                <span style={{ color: '#f4f4f5', fontSize: 15, fontWeight: 600 }}>{leaderForPut.name}</span>
                                                <span style={{ color: '#71717a', fontSize: 13, opacity: 0.95 }}>{leaderForPut.email || '—'}</span>
                                            </div>
                                            <button
                                                type="button"
                                                title="Remover líder"
                                                onClick={() => {
                                                    clearLeaderBlurTimer();
                                                    setLeaderForPut(null);
                                                    setIsSearchingReplacement(true);
                                                    setLeaderSearch('');
                                                    setLeaderSuggestions([]);
                                                }}
                                                style={{
                                                    flexShrink: 0,
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 8,
                                                    border: '1px solid #52525b',
                                                    background: 'transparent',
                                                    color: '#a1a1aa',
                                                    cursor: 'pointer',
                                                    fontSize: 16,
                                                    lineHeight: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ position: 'relative', marginTop: showLeaderCard ? 12 : 8, overflow: 'visible' }}>
                                        <input
                                            ref={leaderInputRef}
                                            className="form-input"
                                            style={{ width: '100%', marginTop: 4 }}
                                            placeholder={
                                                leaderForPut && !isSearchingReplacement
                                                    ? 'Clique para buscar outro líder'
                                                    : 'Digite o nome para buscar colaboradores ativos'
                                            }
                                            value={leaderInputValue}
                                            onChange={(e) => setLeaderSearch(e.target.value)}
                                            onFocus={() => {
                                                clearLeaderBlurTimer();
                                                setIsLeaderInputFocused(true);
                                                if (leaderForPut && !isSearchingReplacement) {
                                                    setIsSearchingReplacement(true);
                                                    setLeaderSearch('');
                                                    setLeaderSuggestions([]);
                                                }
                                            }}
                                            onBlur={() => {
                                                scheduleEndLeaderSearch();
                                            }}
                                        />
                                    </div>
                                    <p style={{ color: '#a16207', fontSize: 12, margin: '12px 0 0 0', lineHeight: 1.45 }}>
                                        Ao definir ou alterar o líder, todos os colaboradores deste cargo terão o gestor atualizado automaticamente.
                                    </p>
                                </div>
                            )}

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
        {leaderDropdownPortal}
        </>
    );
};
