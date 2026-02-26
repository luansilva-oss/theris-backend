import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config';

interface DeptInfo {
  id: string;
  name: string;
  rolesCount: number;
}

interface Unit {
  id: string;
  name: string;
  departments?: { id: string; name: string }[];
}

interface Department {
  id: string;
  name: string;
  unitId?: string;
  unit?: { name: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unit: { id: string; name: string } | null;
  departments: DeptInfo[];
  otherUnits: Unit[];
  allDepartments: Department[];
  onSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type Decision = {
  departmentId: string;
  action: 'migrate_department' | 'delete_department';
  targetUnitId?: string;
  targetDepartmentId?: string;
};

export const UnitMigrationWizardModal: React.FC<Props> = ({
  isOpen, onClose, unit, departments, otherUnits, allDepartments, onSuccess, showToast
}) => {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !unit) return null;

  const setDecision = (deptId: string, action: 'migrate_department' | 'delete_department', targetUnitId?: string, targetDepartmentId?: string) => {
    setDecisions(prev => ({
      ...prev,
      [deptId]: { departmentId: deptId, action, targetUnitId, targetDepartmentId }
    }));
  };

  const canSubmit = departments.every(d => {
    const dec = decisions[d.id];
    if (!dec) return false;
    if (dec.action === 'migrate_department') return !!dec.targetUnitId;
    return !!dec.targetDepartmentId;
  });

  const handleSubmit = async () => {
    if (!canSubmit) return showToast('Preencha todas as decisões (destino para cada departamento).', 'warning');
    setIsSubmitting(true);
    try {
      const payload = { decisions: Object.values(decisions) };
      const res = await fetch(`${API_URL}/api/structure/units/${unit.id}/migrate-and-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Migração concluída. Unidade excluída.', 'success');
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro na migração.', 'error');
      }
    } catch {
      showToast('Erro de conexão.', 'error');
    }
    setIsSubmitting(false);
  };

  const departmentsInOtherUnits = allDepartments.filter(d => d.unitId && d.unitId !== unit.id);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '560px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={22} color="#f59e0b" /> Migrar e excluir unidade
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 20 }}>
            A unidade <strong style={{ color: '#f4f4f5' }}>{unit.name}</strong> possui departamentos. Para cada um, escolha migrar o departamento inteiro para outra unidade ou excluir o departamento (movendo os cargos para um departamento de destino).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {departments.map(dept => {
              const dec = decisions[dept.id];
              const action = dec?.action ?? null;
              return (
                <div key={dept.id} style={{ border: '1px solid #27272a', borderRadius: 10, padding: 16, background: '#18181b' }}>
                  <div style={{ fontWeight: 600, color: '#e4e4e7', marginBottom: 8 }}>{dept.name}</div>
                  <div style={{ fontSize: 12, color: '#71717a', marginBottom: 12 }}>{dept.rolesCount} cargo(s) · KBS preservado em qualquer opção</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#e4e4e7', fontSize: 13 }}>
                      <input type="radio" name={`action-${dept.id}`} checked={action === 'migrate_department'} onChange={() => setDecision(dept.id, 'migrate_department')} />
                      Migrar departamento inteiro
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#e4e4e7', fontSize: 13 }}>
                      <input type="radio" name={`action-${dept.id}`} checked={action === 'delete_department'} onChange={() => setDecision(dept.id, 'delete_department')} />
                      Excluir departamento (mapear cargos)
                    </label>
                  </div>
                  {action === 'migrate_department' && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Unidade de destino</label>
                      <select
                        className="form-input"
                        style={{ width: '100%' }}
                        value={dec?.targetUnitId ?? ''}
                        onChange={e => setDecision(dept.id, 'migrate_department', e.target.value || undefined)}
                      >
                        <option value="">Selecione...</option>
                        {otherUnits.filter(u => u.id !== unit.id).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {action === 'delete_department' && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Departamento que receberá os cargos</label>
                      <select
                        className="form-input"
                        style={{ width: '100%' }}
                        value={dec?.targetDepartmentId ?? ''}
                        onChange={e => setDecision(dept.id, 'delete_department', undefined, e.target.value || undefined)}
                      >
                        <option value="">Selecione...</option>
                        {departmentsInOtherUnits.map(d => (
                          <option key={d.id} value={d.id}>{d.name} {d.unit?.name ? `(${d.unit.name})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} className="btn-text">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="btn-verify" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isSubmitting ? 'Executando...' : <><Save size={18} /> Migrar e excluir unidade</>}
          </button>
        </div>
      </div>
    </div>
  );
};
