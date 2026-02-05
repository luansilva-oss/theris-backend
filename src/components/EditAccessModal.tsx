import { useState, useEffect } from 'react';
import { X, Clock, Save } from 'lucide-react';

interface EditAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    access: any;
    toolId: string;
    onUpdate: () => void;
}

export const EditAccessModal = ({ isOpen, onClose, access, toolId, onUpdate }: EditAccessModalProps) => {
    const [duration, setDuration] = useState('');
    const [unit, setUnit] = useState('horas');
    const [isExtraordinary, setIsExtraordinary] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (access) {
            setDuration(access.duration?.toString() || '');
            setUnit(access.unit || 'horas');
            setIsExtraordinary(access.isExtraordinary);
        }
    }, [access]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tools/${toolId}/access/${access.user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isExtraordinary,
                    duration: duration || null,
                    unit
                })
            });

            if (res.ok) {
                onUpdate();
                onClose();
            } else {
                alert("Erro ao atualizar acesso.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão.");
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h3>Editar Acesso: {access?.user?.name}</h3>
                    <button className="btn-icon" onClick={onClose}><X size={20} color="#71717a" /></button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                            type="checkbox"
                            id="isExtra"
                            checked={isExtraordinary}
                            onChange={(e) => setIsExtraordinary(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#a78bfa' }}
                        />
                        <label htmlFor="isExtra" style={{ color: 'white', cursor: 'pointer' }}>É um acesso extraordinário (temporário)?</label>
                    </div>

                    {isExtraordinary && (
                        <div style={{ background: 'rgba(124, 58, 237, 0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(124, 58, 237, 0.1)' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 8, display: 'block' }}>Duração</label>
                                    <input
                                        type="number"
                                        className="mfa-input-single"
                                        style={{ height: '40px', fontSize: '14px', textAlign: 'left', paddingLeft: '12px' }}
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        placeholder="Ex: 48"
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 8, display: 'block' }}>Unidade</label>
                                    <select
                                        className="mfa-input-single"
                                        style={{ height: '40px', fontSize: '14px', background: '#27272a', border: '1px solid #3f3f46', color: 'white', padding: '0 8px' }}
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                    >
                                        <option value="horas">Horas</option>
                                        <option value="dias">Dias</option>
                                        <option value="meses">Meses</option>
                                    </select>
                                </div>
                            </div>
                            <p style={{ color: '#71717a', fontSize: 11, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={12} /> Isso ajudará S/I a gerenciar revogações manuais ou automáticas.
                            </p>
                        </div>
                    )}

                </div>
                <div className="modal-footer" style={{ borderTop: '1px solid #27272a', paddingTop: 16, marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button className="btn-text" onClick={onClose} disabled={loading}>Cancelar</button>
                    <button className="btn-mini approve" style={{ height: '40px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8 }} onClick={handleSave} disabled={loading}>
                        <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};
