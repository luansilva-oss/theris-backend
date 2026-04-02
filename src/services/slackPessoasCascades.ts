/**
 * Cascata Unidade → Departamento → Cargo nos modais /pessoas (Slack Block Kit).
 * Atualiza a view via views.update; selects com dispatch_action disparam estes handlers.
 */
import type { App } from '@slack/bolt';
import { prisma } from '../lib/prisma';

const DEFAULT_UNIT_NAMES = ['3C+', 'Evolux', 'Dizify', 'Instituto 3C', 'FiqOn', 'Dizparos'];

/** Estado parcial do modal Slack (values misturam plain_text_input, static_select, datepicker). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PessoasViewLike = { state?: { values?: Record<string, Record<string, any>> } };

export const PESSOAS_PLACEHOLDER = '__pessoas_placeholder__';

function isPh(v: string | undefined | null): boolean {
  return !v || v === PESSOAS_PLACEHOLDER;
}

function parsePipe(val: string | undefined): { id: string; name: string } | null {
  if (!val || isPh(val)) return null;
  const i = val.indexOf('|');
  if (i < 0) return { id: val, name: val };
  return { id: val.slice(0, i), name: val.slice(i + 1) };
}

function phOptions(msg: string) {
  return [{ text: { type: 'plain_text' as const, text: msg }, value: PESSOAS_PLACEHOLDER }];
}

async function unitSelectOptions(): Promise<{ text: { type: 'plain_text'; text: string }; value: string }[]> {
  try {
    const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
    if (units.length > 0) {
      return units.map((u) => ({
        text: { type: 'plain_text' as const, text: u.name },
        value: `${u.id}|${u.name}`
      }));
    }
  } catch {
    /* fallthrough */
  }
  return DEFAULT_UNIT_NAMES.map((name) => ({
    text: { type: 'plain_text' as const, text: name },
    value: `__noid__|${name}`
  }));
}

async function deptOptionsForUnit(unitId: string | null): Promise<{ text: { type: 'plain_text'; text: string }; value: string }[]> {
  if (!unitId || unitId === '__noid__') return phOptions('Selecione a unidade primeiro');
  try {
    const depts = await prisma.department.findMany({
      where: { unitId },
      orderBy: { name: 'asc' },
      take: 100
    });
    if (depts.length === 0) return phOptions('Nenhum departamento nesta unidade');
    return depts.map((d) => ({
      text: { type: 'plain_text' as const, text: d.name.length > 75 ? d.name.slice(0, 72) + '...' : d.name },
      value: `${d.id}|${d.name}`
    }));
  } catch {
    return phOptions('Erro ao carregar departamentos');
  }
}

async function roleOptionsForDepartment(deptId: string | null): Promise<{ text: { type: 'plain_text'; text: string }; value: string }[]> {
  if (!deptId) return phOptions('Selecione o departamento primeiro');
  try {
    const roles = await prisma.role.findMany({
      where: { departmentId: deptId },
      orderBy: { name: 'asc' },
      take: 100
    });
    if (roles.length === 0) return phOptions('Nenhum cargo neste departamento');
    return roles.map((r) => {
      const t = r.name.length > 75 ? r.name.slice(0, 72) + '...' : r.name;
      return { text: { type: 'plain_text' as const, text: t }, value: `${r.id}|${r.name}` };
    });
  } catch {
    return phOptions('Erro ao carregar cargos');
  }
}

function staticSelectInput(
  blockId: string,
  label: string,
  actionId: string,
  placeholder: string,
  options: { text: { type: 'plain_text'; text: string }; value: string }[],
  selectedValue: string | undefined
) {
  const el: Record<string, unknown> = {
    type: 'static_select',
    action_id: actionId,
    dispatch_action: true,
    placeholder: { type: 'plain_text', text: placeholder },
    options: options.length > 0 ? options : phOptions(placeholder)
  };
  if (selectedValue && !isPh(selectedValue)) {
    const opt = (el.options as { value: string }[]).find((o) => o.value === selectedValue);
    if (opt) el.initial_option = opt;
  }
  return {
    type: 'input' as const,
    block_id: blockId,
    label: { type: 'plain_text' as const, text: label },
    element: el
  };
}

async function resolveUnitIdFromSelection(unitVal: string | undefined): Promise<string | null> {
  const p = parsePipe(unitVal);
  if (!p) return null;
  if (p.id === '__noid__') {
    const u = await prisma.unit.findFirst({
      where: { name: { equals: p.name, mode: 'insensitive' } },
      select: { id: true }
    });
    return u?.id ?? null;
  }
  const u = await prisma.unit.findUnique({ where: { id: p.id }, select: { id: true } });
  return u?.id ?? null;
}

async function sanitizeDeptValue(unitId: string | null, deptVal: string | undefined): Promise<string | undefined> {
  const p = parsePipe(deptVal);
  if (!p || !unitId) return undefined;
  const d = await prisma.department.findUnique({ where: { id: p.id }, select: { id: true, unitId: true } });
  if (!d || d.unitId !== unitId) return undefined;
  return deptVal;
}

async function sanitizeRoleValue(deptId: string | null, roleVal: string | undefined): Promise<string | undefined> {
  const p = parsePipe(roleVal);
  if (!p || !deptId) return undefined;
  const r = await prisma.role.findUnique({ where: { id: p.id }, select: { id: true, departmentId: true } });
  if (!r || r.departmentId !== deptId) return undefined;
  return roleVal;
}

type MoveDeptOverrides = Partial<{
  currUnit: string;
  currDept: string;
  currRole: string;
  newUnit: string;
  newDept: string;
  newRole: string;
}>;

export async function buildMoveDeptModalBlocks(view: PessoasViewLike, overrides: MoveDeptOverrides = {}) {
  const v = view.state?.values ?? {};
  const g = (bid: string, aid: string) => v[bid]?.[aid]?.selected_option?.value as string | undefined;
  const nameVal = String(v.blk_name?.inp?.value ?? '');
  const currUnitSel = overrides.currUnit ?? g('blk_curr_unit', 'move_dept_curr_unit');
  const currDeptSel = overrides.currDept ?? g('blk_curr_dept', 'move_dept_curr_dept');
  const currRoleSel = overrides.currRole ?? g('blk_curr_role', 'move_dept_curr_role');
  const newUnitSel = overrides.newUnit ?? g('blk_new_unit', 'move_dept_new_unit');
  const newDeptSel = overrides.newDept ?? g('blk_new_dept', 'move_dept_new_dept');
  const newRoleSel = overrides.newRole ?? g('blk_new_role', 'move_dept_new_role');

  const currUnitId = await resolveUnitIdFromSelection(currUnitSel);
  let currDeptOk = await sanitizeDeptValue(currUnitId, currDeptSel);
  const currDeptId = parsePipe(currDeptOk)?.id ?? null;
  let currRoleOk = await sanitizeRoleValue(currDeptId, currRoleSel);
  if (!currDeptOk) currRoleOk = undefined;

  const newUnitId = await resolveUnitIdFromSelection(newUnitSel);
  let newDeptOk = await sanitizeDeptValue(newUnitId, newDeptSel);
  const newDeptId = parsePipe(newDeptOk)?.id ?? null;
  let newRoleOk = await sanitizeRoleValue(newDeptId, newRoleSel);
  if (!newDeptOk) newRoleOk = undefined;

  const unitOpts = await unitSelectOptions();
  const currDeptOpts = await deptOptionsForUnit(currUnitId);
  const currRoleOpts = await roleOptionsForDepartment(currDeptId);
  const newDeptOpts = await deptOptionsForUnit(newUnitId);
  const newRoleOpts = await roleOptionsForDepartment(newDeptId);

  const mgrCurr = String(v.blk_manager_curr?.inp?.value ?? '');
  const mgrFut = String(v.blk_manager_fut?.inp?.value ?? '');
  const dateVal = (v.data_acao?.picker?.selected_date as string | undefined) ?? null;
  const reasonVal = String(v.blk_reason?.inp?.value ?? '');

  const blocks: unknown[] = [
    {
      type: 'input',
      block_id: 'blk_name',
      label: { type: 'plain_text', text: 'Nome do Colaborador' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: nameVal || undefined }
    },
    {
      type: 'actions',
      block_id: 'blk_prefill_md',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Carregar situação atual' },
          action_id: 'pessoas_prefill_move_dept'
        }
      ]
    },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: '*Situação Atual*' } },
    staticSelectInput('blk_curr_unit', 'Unidade', 'move_dept_curr_unit', 'Selecione a unidade...', unitOpts, currUnitSel),
    staticSelectInput(
      'blk_curr_dept',
      'Departamento',
      'move_dept_curr_dept',
      'Selecione a unidade primeiro',
      currDeptOpts,
      currDeptOk
    ),
    staticSelectInput(
      'blk_curr_role',
      'Cargo',
      'move_dept_curr_role',
      'Selecione o departamento primeiro',
      currRoleOpts,
      currRoleOk
    ),
    { type: 'section', text: { type: 'mrkdwn', text: '*Situação Nova*' } },
    staticSelectInput('blk_new_unit', 'Unidade', 'move_dept_new_unit', 'Selecione a unidade...', unitOpts, newUnitSel),
    staticSelectInput(
      'blk_new_dept',
      'Departamento',
      'move_dept_new_dept',
      'Selecione a unidade primeiro',
      newDeptOpts,
      newDeptOk
    ),
    staticSelectInput(
      'blk_new_role',
      'Cargo',
      'move_dept_new_role',
      'Selecione o departamento primeiro',
      newRoleOpts,
      newRoleOk
    ),
    {
      type: 'input',
      block_id: 'blk_manager_curr',
      optional: true,
      label: { type: 'plain_text', text: 'Gestor atual' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: mgrCurr || undefined }
    },
    {
      type: 'input',
      block_id: 'blk_manager_fut',
      optional: true,
      label: { type: 'plain_text', text: 'Novo gestor' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: mgrFut || undefined }
    },
    {
      type: 'input',
      block_id: 'data_acao',
      optional: true,
      label: { type: 'plain_text', text: 'Data de Ação' },
      element: {
        type: 'datepicker',
        action_id: 'picker',
        placeholder: { type: 'plain_text', text: 'Selecione a data' },
        ...(dateVal ? { initial_date: dateVal } : {})
      }
    },
    {
      type: 'input',
      block_id: 'blk_reason',
      label: { type: 'plain_text', text: 'Justificativa' },
      element: { type: 'plain_text_input', multiline: true, action_id: 'inp', initial_value: reasonVal || undefined }
    }
  ];
  return blocks;
}

export async function buildMoveCargoModalBlocks(
  view: PessoasViewLike,
  overrides: Partial<{ unit: string; dept: string; roleCurr: string; roleFut: string }> = {}
) {
  const v = view.state?.values ?? {};
  const g = (bid: string, aid: string) => v[bid]?.[aid]?.selected_option?.value as string | undefined;
  const nameVal = String(v.blk_name?.inp?.value ?? '');
  const unitSel = overrides.unit ?? g('blk_mc_unit', 'mc_unit_select');
  const deptSel = overrides.dept ?? g('blk_mc_dept', 'mc_dept_select');
  const roleCurrSel = overrides.roleCurr ?? g('blk_mc_role_curr', 'mc_role_curr_select');
  const roleFutSel = overrides.roleFut ?? g('blk_mc_role_fut', 'mc_role_fut_select');

  const unitId = await resolveUnitIdFromSelection(unitSel);
  let deptOk = await sanitizeDeptValue(unitId, deptSel);
  const deptId = parsePipe(deptOk)?.id ?? null;
  let roleCurrOk = await sanitizeRoleValue(deptId, roleCurrSel);
  let roleFutOk = await sanitizeRoleValue(deptId, roleFutSel);
  if (!deptOk) {
    roleCurrOk = undefined;
    roleFutOk = undefined;
  }

  const unitOpts = await unitSelectOptions();
  const deptOpts = await deptOptionsForUnit(unitId);
  const roleOpts = await roleOptionsForDepartment(deptId);

  const mgrCurr = (v.blk_manager_curr?.inp?.value as string | undefined) ?? '';
  const mgrFut = (v.blk_manager_fut?.inp?.value as string | undefined) ?? '';
  const dateVal = (v.data_acao?.picker?.selected_date as string | undefined) ?? null;
  const reasonVal = (v.blk_reason?.inp?.value as string | undefined) ?? '';

  return [
    {
      type: 'input',
      block_id: 'blk_name',
      label: { type: 'plain_text', text: 'Nome do Colaborador' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: nameVal || undefined }
    },
    {
      type: 'actions',
      block_id: 'blk_prefill_mc',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Carregar situação atual' },
          action_id: 'pessoas_prefill_move_cargo'
        }
      ]
    },
    { type: 'divider' },
    staticSelectInput('blk_mc_unit', 'Unidade', 'mc_unit_select', 'Selecione a unidade...', unitOpts, unitSel),
    staticSelectInput(
      'blk_mc_dept',
      'Departamento',
      'mc_dept_select',
      'Selecione a unidade primeiro',
      deptOpts,
      deptOk
    ),
    staticSelectInput(
      'blk_mc_role_curr',
      'Cargo Atual',
      'mc_role_curr_select',
      'Selecione o departamento primeiro',
      roleOpts,
      roleCurrOk
    ),
    staticSelectInput(
      'blk_mc_role_fut',
      'Novo Cargo',
      'mc_role_fut_select',
      'Selecione o departamento primeiro',
      roleOpts,
      roleFutOk
    ),
    {
      type: 'input',
      block_id: 'blk_manager_curr',
      optional: true,
      label: { type: 'plain_text', text: 'Gestor atual' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: mgrCurr || undefined }
    },
    {
      type: 'input',
      block_id: 'blk_manager_fut',
      optional: true,
      label: { type: 'plain_text', text: 'Novo gestor' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: mgrFut || undefined }
    },
    {
      type: 'input',
      block_id: 'data_acao',
      optional: true,
      label: { type: 'plain_text', text: 'Data de Ação' },
      element: {
        type: 'datepicker',
        action_id: 'picker',
        placeholder: { type: 'plain_text', text: 'Selecione a data' },
        ...(dateVal ? { initial_date: dateVal } : {})
      }
    },
    {
      type: 'input',
      block_id: 'blk_reason',
      label: { type: 'plain_text', text: 'Justificativa' },
      element: { type: 'plain_text_input', multiline: true, action_id: 'inp', initial_value: reasonVal || undefined }
    }
  ];
}

export async function buildHireModalBlocks(view: PessoasViewLike, overrides: Partial<{ unit: string; dept: string; role: string }> = {}) {
  const v = view.state?.values ?? {};
  const g = (bid: string, aid: string) => v[bid]?.[aid]?.selected_option?.value as string | undefined;
  const nameVal = String(v.blk_name?.inp?.value ?? '');
  const startDate = (v.blk_date?.picker?.selected_date as string | undefined) ?? null;
  const unitSel = overrides.unit ?? g('blk_hire_unit', 'hire_unit_select');
  const deptSel = overrides.dept ?? g('blk_hire_dept', 'hire_dept_select');
  const roleSel = overrides.role ?? g('blk_hire_role', 'hire_role_select');

  const unitId = await resolveUnitIdFromSelection(unitSel);
  let deptOk = await sanitizeDeptValue(unitId, deptSel);
  const deptId = parsePipe(deptOk)?.id ?? null;
  let roleOk = await sanitizeRoleValue(deptId, roleSel);
  if (!deptOk) roleOk = undefined;

  const unitOpts = await unitSelectOptions();
  const deptOpts = await deptOptionsForUnit(unitId);
  const roleOpts = await roleOptionsForDepartment(deptId);

  const mgr = (v.blk_manager?.inp?.value as string | undefined) ?? '';
  const email = (v.blk_email?.inp?.value as string | undefined) ?? '';
  const contractOpt = v.blk_contract_type?.inp_select?.selected_option as { value?: string; text?: { text?: string } } | undefined;
  const obs = (v.blk_obs?.inp?.value as string | undefined) ?? '';

  return [
    {
      type: 'input',
      block_id: 'blk_name',
      label: { type: 'plain_text', text: 'Nome Completo' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: nameVal || undefined }
    },
    {
      type: 'input',
      block_id: 'blk_date',
      label: { type: 'plain_text', text: 'Data de Início' },
      element: {
        type: 'datepicker',
        action_id: 'picker',
        ...(startDate ? { initial_date: startDate } : {})
      }
    },
    staticSelectInput('blk_hire_unit', 'Unidade', 'hire_unit_select', 'Selecione a unidade...', unitOpts, unitSel),
    staticSelectInput(
      'blk_hire_dept',
      'Departamento',
      'hire_dept_select',
      'Selecione a unidade primeiro',
      deptOpts,
      deptOk
    ),
    staticSelectInput(
      'blk_hire_role',
      'Cargo',
      'hire_role_select',
      'Selecione o departamento primeiro',
      roleOpts,
      roleOk
    ),
    {
      type: 'input',
      block_id: 'blk_manager',
      optional: true,
      label: { type: 'plain_text', text: 'Gestor direto' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: mgr || undefined }
    },
    {
      type: 'input',
      block_id: 'blk_email',
      optional: true,
      label: { type: 'plain_text', text: 'E-mail corporativo' },
      element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: 'plain_text', text: 'exemplo@empresa.com' }, initial_value: email || undefined }
    },
    {
      type: 'input',
      block_id: 'blk_contract_type',
      label: { type: 'plain_text', text: 'Tipo de contratação' },
      element: {
        type: 'static_select',
        action_id: 'inp_select',
        placeholder: { type: 'plain_text', text: 'Selecione...' },
        options: [
          { text: { type: 'plain_text', text: 'CLT' }, value: 'CLT' },
          { text: { type: 'plain_text', text: 'PJ' }, value: 'PJ' }
        ],
        ...(contractOpt?.value
          ? {
              initial_option: {
                text: { type: 'plain_text', text: contractOpt.text?.text || contractOpt.value },
                value: contractOpt.value
              }
            }
          : {})
      }
    },
    {
      type: 'input',
      block_id: 'blk_obs',
      optional: true,
      label: { type: 'plain_text', text: 'Observações' },
      element: { type: 'plain_text_input', multiline: true, action_id: 'inp', initial_value: obs || undefined }
    }
  ];
}

export async function buildFireModalBlocks(view: PessoasViewLike, overrides: Partial<{ unit: string; dept: string; role: string }> = {}) {
  const v = view.state?.values ?? {};
  const g = (bid: string, aid: string) => v[bid]?.[aid]?.selected_option?.value as string | undefined;
  const nameVal = String(v.blk_name?.inp?.value ?? '');
  const unitSel = overrides.unit ?? g('blk_fire_unit', 'fire_unit_select');
  const deptSel = overrides.dept ?? g('blk_fire_dept', 'fire_dept_select');
  const roleSel = overrides.role ?? g('blk_fire_role', 'fire_role_select');

  const unitId = await resolveUnitIdFromSelection(unitSel);
  let deptOk = await sanitizeDeptValue(unitId, deptSel);
  const deptId = parsePipe(deptOk)?.id ?? null;
  let roleOk = await sanitizeRoleValue(deptId, roleSel);
  if (!deptOk) roleOk = undefined;

  const unitOpts = await unitSelectOptions();
  const deptOpts = await deptOptionsForUnit(unitId);
  const roleOpts = await roleOptionsForDepartment(deptId);

  const actionDate = (v.data_acao?.picker?.selected_date as string | undefined) ?? null;
  const reasonVal = (v.blk_reason?.inp?.value as string | undefined) ?? '';
  const mgr = (v.blk_manager?.inp?.value as string | undefined) ?? '';
  const equipmentOpt = v.blk_equipment?.inp_select?.selected_option as { value?: string; text?: { text?: string } } | undefined;
  const obs = (v.blk_obs?.inp?.value as string | undefined) ?? '';

  return [
    { type: 'section', text: { type: 'mrkdwn', text: '⚠️ *Inicia o bloqueio imediato de acessos.*' } },
    {
      type: 'input',
      block_id: 'blk_name',
      label: { type: 'plain_text', text: 'Colaborador' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: nameVal || undefined }
    },
    {
      type: 'actions',
      block_id: 'blk_prefill_fire',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Carregar situação atual' },
          action_id: 'pessoas_prefill_fire'
        }
      ]
    },
    staticSelectInput('blk_fire_unit', 'Unidade', 'fire_unit_select', 'Selecione a unidade...', unitOpts, unitSel),
    staticSelectInput(
      'blk_fire_dept',
      'Departamento',
      'fire_dept_select',
      'Selecione a unidade primeiro',
      deptOpts,
      deptOk
    ),
    staticSelectInput(
      'blk_fire_role',
      'Cargo',
      'fire_role_select',
      'Selecione o departamento primeiro',
      roleOpts,
      roleOk
    ),
    {
      type: 'input',
      block_id: 'data_acao',
      optional: true,
      label: { type: 'plain_text', text: 'Data de desligamento' },
      element: {
        type: 'datepicker',
        action_id: 'picker',
        placeholder: { type: 'plain_text', text: 'Selecione a data' },
        ...(actionDate ? { initial_date: actionDate } : {})
      }
    },
    {
      type: 'input',
      block_id: 'blk_reason',
      optional: true,
      label: { type: 'plain_text', text: 'Motivo do desligamento' },
      element: { type: 'plain_text_input', multiline: true, action_id: 'inp', initial_value: reasonVal || undefined }
    },
    {
      type: 'input',
      block_id: 'blk_manager',
      optional: true,
      label: { type: 'plain_text', text: 'Gestor' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: mgr || undefined }
    },
    {
      type: 'input',
      block_id: 'blk_equipment',
      optional: true,
      label: { type: 'plain_text', text: 'Devolução de equipamento' },
      element: {
        type: 'static_select',
        action_id: 'inp_select',
        placeholder: { type: 'plain_text', text: 'Selecione...' },
        options: [
          { text: { type: 'plain_text', text: 'Sim' }, value: 'Sim' },
          { text: { type: 'plain_text', text: 'Não' }, value: 'Não' }
        ],
        ...(equipmentOpt?.value
          ? {
              initial_option: {
                text: { type: 'plain_text', text: equipmentOpt.text?.text || equipmentOpt.value },
                value: equipmentOpt.value
              }
            }
          : {})
      }
    },
    {
      type: 'input',
      block_id: 'blk_obs',
      optional: true,
      label: { type: 'plain_text', text: 'Observações' },
      element: { type: 'plain_text_input', multiline: true, action_id: 'inp', initial_value: obs || undefined }
    }
  ];
}

async function updateMoveDeptView(body: { view: PessoasViewLike & { id: string; hash: string } }, client: { views: { update: (a: unknown) => Promise<unknown> } }) {
  const view = body.view;
  const blocks = await buildMoveDeptModalBlocks(view);
  await client.views.update({
    view_id: view.id,
    hash: view.hash,
    view: {
      type: 'modal',
      callback_id: 'submit_move_dept',
      title: { type: 'plain_text', text: 'Mudança de Departamento' },
      submit: { type: 'plain_text', text: 'Enviar' },
      blocks
    }
  });
}

async function updateMoveCargoView(body: { view: PessoasViewLike & { id: string; hash: string } }, client: { views: { update: (a: unknown) => Promise<unknown> } }) {
  const view = body.view;
  const blocks = await buildMoveCargoModalBlocks(view);
  await client.views.update({
    view_id: view.id,
    hash: view.hash,
    view: {
      type: 'modal',
      callback_id: 'submit_move_cargo',
      title: { type: 'plain_text', text: 'Mudança de Cargo' },
      submit: { type: 'plain_text', text: 'Enviar' },
      blocks
    }
  });
}

async function updateHireView(body: { view: PessoasViewLike & { id: string; hash: string } }, client: { views: { update: (a: unknown) => Promise<unknown> } }) {
  const view = body.view;
  const blocks = await buildHireModalBlocks(view);
  await client.views.update({
    view_id: view.id,
    hash: view.hash,
    view: {
      type: 'modal',
      callback_id: 'submit_hire',
      title: { type: 'plain_text', text: 'Contratação' },
      submit: { type: 'plain_text', text: 'Agendar' },
      blocks
    }
  });
}

async function updateFireView(body: { view: PessoasViewLike & { id: string; hash: string } }, client: { views: { update: (a: unknown) => Promise<unknown> } }) {
  const view = body.view;
  const blocks = await buildFireModalBlocks(view);
  await client.views.update({
    view_id: view.id,
    hash: view.hash,
    view: {
      type: 'modal',
      callback_id: 'submit_fire',
      title: { type: 'plain_text', text: 'Desligamento' },
      submit: { type: 'plain_text', text: 'Confirmar' },
      blocks
    }
  });
}

export function registerPessoasModalCascadeHandlers(app: App): void {
  const cascadeMoveDept = [
    'move_dept_curr_unit',
    'move_dept_curr_dept',
    'move_dept_new_unit',
    'move_dept_new_dept'
  ];
  for (const aid of cascadeMoveDept) {
    app.action(aid, async ({ ack, body, client }) => {
      await ack();
      try {
        await updateMoveDeptView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
      } catch (e) {
        console.error('[pessoas] views.update move_dept:', e);
      }
    });
  }

  app.action('mc_unit_select', async ({ ack, body, client }) => {
    await ack();
    try {
      await updateMoveCargoView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
    } catch (e) {
      console.error('[pessoas] views.update move_cargo:', e);
    }
  });
  app.action('mc_dept_select', async ({ ack, body, client }) => {
    await ack();
    try {
      await updateMoveCargoView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
    } catch (e) {
      console.error('[pessoas] views.update move_cargo dept:', e);
    }
  });

  app.action('hire_unit_select', async ({ ack, body, client }) => {
    await ack();
    try {
      await updateHireView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
    } catch (e) {
      console.error('[pessoas] views.update hire:', e);
    }
  });
  app.action('hire_dept_select', async ({ ack, body, client }) => {
    await ack();
    try {
      await updateHireView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
    } catch (e) {
      console.error('[pessoas] views.update hire dept:', e);
    }
  });

  app.action('fire_unit_select', async ({ ack, body, client }) => {
    await ack();
    try {
      await updateFireView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
    } catch (e) {
      console.error('[pessoas] views.update fire:', e);
    }
  });
  app.action('fire_dept_select', async ({ ack, body, client }) => {
    await ack();
    try {
      await updateFireView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
    } catch (e) {
      console.error('[pessoas] views.update fire dept:', e);
    }
  });

  app.action('pessoas_prefill_move_dept', async ({ ack, body, client }) => {
    await ack();
    const view = (body as { view: PessoasViewLike & { id: string; hash: string } }).view;
    const name = String(view.state?.values?.blk_name?.inp?.value || '').trim();
    if (!name) return;
    try {
      let u = await prisma.user.findFirst({
        where: { isActive: true, name: { equals: name, mode: 'insensitive' } },
        include: { unitRef: true, departmentRef: true }
      });
      if (!u) {
        u = await prisma.user.findFirst({
          where: { isActive: true, name: { contains: name, mode: 'insensitive' } },
          include: { unitRef: true, departmentRef: true }
        });
      }
      if (!u?.unitRef?.id || !u.departmentRef?.id || !u.roleId) return;
      const roleRow = await prisma.role.findUnique({ where: { id: u.roleId }, select: { id: true, name: true } });
      if (!roleRow) return;
      const overrides: MoveDeptOverrides = {
        currUnit: `${u.unitRef.id}|${u.unitRef.name}`,
        currDept: `${u.departmentRef.id}|${u.departmentRef.name}`,
        currRole: `${roleRow.id}|${roleRow.name}`
      };
      const blocks = await buildMoveDeptModalBlocks(view, overrides);
      await (client as { views: { update: (a: unknown) => Promise<unknown> } }).views.update({
        view_id: view.id,
        hash: view.hash,
        view: {
          type: 'modal',
          callback_id: 'submit_move_dept',
          title: { type: 'plain_text', text: 'Mudança de Departamento' },
          submit: { type: 'plain_text', text: 'Enviar' },
          blocks
        }
      });
    } catch (e) {
      console.error('[pessoas] prefill move_dept:', e);
    }
  });

  app.action('pessoas_prefill_move_cargo', async ({ ack, body, client }) => {
    await ack();
    const view = (body as { view: PessoasViewLike & { id: string; hash: string } }).view;
    const name = String(view.state?.values?.blk_name?.inp?.value || '').trim();
    if (!name) return;
    try {
      let u = await prisma.user.findFirst({
        where: { isActive: true, name: { equals: name, mode: 'insensitive' } },
        include: { unitRef: true, departmentRef: true }
      });
      if (!u) {
        u = await prisma.user.findFirst({
          where: { isActive: true, name: { contains: name, mode: 'insensitive' } },
          include: { unitRef: true, departmentRef: true }
        });
      }
      if (!u?.unitRef?.id || !u.departmentRef?.id || !u.roleId) return;
      const roleRow = await prisma.role.findUnique({ where: { id: u.roleId }, select: { id: true, name: true } });
      if (!roleRow) return;
      const unit = `${u.unitRef.id}|${u.unitRef.name}`;
      const dept = `${u.departmentRef.id}|${u.departmentRef.name}`;
      const roleCurr = `${roleRow.id}|${roleRow.name}`;
      const blocks = await buildMoveCargoModalBlocks(view, { unit, dept, roleCurr });
      await (client as { views: { update: (a: unknown) => Promise<unknown> } }).views.update({
        view_id: view.id,
        hash: view.hash,
        view: {
          type: 'modal',
          callback_id: 'submit_move_cargo',
          title: { type: 'plain_text', text: 'Mudança de Cargo' },
          submit: { type: 'plain_text', text: 'Enviar' },
          blocks
        }
      });
    } catch (e) {
      console.error('[pessoas] prefill move_cargo:', e);
    }
  });

  app.action('pessoas_prefill_fire', async ({ ack, body, client }) => {
    await ack();
    const view = (body as { view: PessoasViewLike & { id: string; hash: string } }).view;
    const name = String(view.state?.values?.blk_name?.inp?.value || '').trim();
    if (!name) return;
    try {
      let u = await prisma.user.findFirst({
        where: { isActive: true, name: { equals: name, mode: 'insensitive' } },
        include: { unitRef: true, departmentRef: true }
      });
      if (!u) {
        u = await prisma.user.findFirst({
          where: { isActive: true, name: { contains: name, mode: 'insensitive' } },
          include: { unitRef: true, departmentRef: true }
        });
      }
      if (!u?.unitRef?.id || !u.departmentRef?.id || !u.roleId) return;
      const roleRow = await prisma.role.findUnique({ where: { id: u.roleId }, select: { id: true, name: true } });
      if (!roleRow) return;
      const blocks = await buildFireModalBlocks(view, {
        unit: `${u.unitRef.id}|${u.unitRef.name}`,
        dept: `${u.departmentRef.id}|${u.departmentRef.name}`,
        role: `${roleRow.id}|${roleRow.name}`
      });
      await (client as { views: { update: (a: unknown) => Promise<unknown> } }).views.update({
        view_id: view.id,
        hash: view.hash,
        view: {
          type: 'modal',
          callback_id: 'submit_fire',
          title: { type: 'plain_text', text: 'Desligamento' },
          submit: { type: 'plain_text', text: 'Confirmar' },
          blocks
        }
      });
    } catch (e) {
      console.error('[pessoas] prefill fire:', e);
    }
  });
}

export function isPessoasSelectPlaceholder(val: string | undefined | null): boolean {
  return isPh(val);
}
