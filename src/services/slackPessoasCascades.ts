/**
 * Cascata Unidade → Departamento → Cargo nos modais /pessoas (Slack Block Kit).
 * Unidade/Departamento: type "input" com dispatch_action no bloco (não no static_select).
 * Cargo: type "input" sem dispatch_action (fim da cascata).
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
    const units = await prisma.unit.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
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
    // Department não tem isActive no schema; lista todos do vínculo unitId. take: 100 = limite do Slack static_select.
    const depts = await prisma.department.findMany({
      where: { unitId },
      select: { id: true, name: true },
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
    // Role não tem isActive no schema; todos os cargos do departamento. take: 100 = limite do Slack static_select.
    const roles = await prisma.role.findMany({
      where: { departmentId: deptId },
      select: { id: true, name: true },
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

/** Líder do cargo (mesmos dados que a hierarquia / estrutura); e-mail obrigatório para usar o dropdown no onboarding. */
export type HireRoleLeader = { id: string; name: string; email: string };

/** Cargos do departamento + mapa líder por roleId (uma consulta; sem fetch extra ao trocar cargo). */
async function hireRoleDataForDepartment(deptId: string | null): Promise<{
  options: { text: { type: 'plain_text'; text: string }; value: string }[];
  leaderByRoleId: Map<string, HireRoleLeader | null>;
}> {
  if (!deptId) {
    return { options: phOptions('Selecione o departamento primeiro'), leaderByRoleId: new Map() };
  }
  try {
    const roles = await prisma.role.findMany({
      where: { departmentId: deptId },
      select: {
        id: true,
        name: true,
        leader: { select: { id: true, name: true, email: true } }
      },
      orderBy: { name: 'asc' },
      take: 100
    });
    if (roles.length === 0) {
      return { options: phOptions('Nenhum cargo neste departamento'), leaderByRoleId: new Map() };
    }
    const leaderByRoleId = new Map<string, HireRoleLeader | null>();
    const options = roles.map((r) => {
      const l = r.leader;
      const leader =
        l?.email?.trim() ? { id: l.id, name: (l.name || '—').trim() || '—', email: l.email.trim() } : null;
      leaderByRoleId.set(r.id, leader);
      const t = r.name.length > 75 ? r.name.slice(0, 72) + '...' : r.name;
      return { text: { type: 'plain_text' as const, text: t }, value: `${r.id}|${r.name}` };
    });
    return { options, leaderByRoleId };
  } catch {
    return { options: phOptions('Erro ao carregar cargos'), leaderByRoleId: new Map() };
  }
}

/** Valor do static_select de gestor (onboarding); limite Slack 150 chars. */
function encodeHireManagerSelectValue(leader: HireRoleLeader): string {
  let name = leader.name;
  let email = leader.email;
  for (let k = 0; k < 12; k++) {
    const raw = JSON.stringify({ i: leader.id, n: name, e: email });
    const b64 = Buffer.from(raw, 'utf8').toString('base64');
    if (b64.length <= 150) return b64;
    name = name.slice(0, Math.max(8, Math.floor(name.length * 0.75)));
    email = email.slice(0, Math.max(12, Math.floor(email.length * 0.85)));
  }
  return `id:${leader.id}`;
}

/** Decodifica opção do dropdown de gestor (submit_hire). Retorna null se for token `id:` (resolver no handler com DB). */
export function decodeHireManagerSelectValue(val: string | undefined | null): HireRoleLeader | null {
  if (!val || isPh(val)) return null;
  if (val.startsWith('id:')) return null;
  try {
    const json = Buffer.from(val, 'base64').toString('utf8');
    const o = JSON.parse(json) as { i?: string; n?: string; e?: string };
    if (o.i && o.n != null && o.e) return { id: String(o.i), name: String(o.n), email: String(o.e) };
  } catch {
    /* ignore */
  }
  return null;
}

/** Se o valor do select for `id:uuid`, devolve o id do usuário líder. */
export function hireManagerSelectLeaderIdOnly(val: string | undefined | null): string | null {
  if (!val || isPh(val)) return null;
  if (val.startsWith('id:')) return val.slice(3).trim() || null;
  return null;
}

function buildStaticSelectElement(
  actionId: string,
  placeholder: string,
  options: { text: { type: 'plain_text'; text: string }; value: string }[],
  selectedValue: string | undefined
): Record<string, unknown> {
  const list = options.length > 0 ? options : phOptions(placeholder);
  const el: Record<string, unknown> = {
    type: 'static_select',
    action_id: actionId,
    placeholder: { type: 'plain_text', text: placeholder },
    options: list
  };
  if (selectedValue && !isPh(selectedValue)) {
    const opt = list.find((o) => o.value === selectedValue);
    if (opt) el.initial_option = opt;
  }
  return el;
}

/** Unidade / Departamento: input com dispatch_action no bloco (mesma largura visual do Cargo). */
function cascadeSelectInputBlock(
  blockId: string,
  label: string,
  actionId: string,
  placeholder: string,
  options: { text: { type: 'plain_text'; text: string }; value: string }[],
  selectedValue: string | undefined
) {
  const el = buildStaticSelectElement(actionId, placeholder, options, selectedValue);
  return {
    type: 'input' as const,
    dispatch_action: true,
    block_id: blockId,
    label: { type: 'plain_text' as const, text: label },
    element: el
  };
}

/** Último da cascata (cargo): input com label; static_select sem dispatch_action no elemento. */
function roleSelectInputBlock(
  blockId: string,
  label: string,
  actionId: string,
  placeholder: string,
  options: { text: { type: 'plain_text'; text: string }; value: string }[],
  selectedValue: string | undefined
) {
  const el = buildStaticSelectElement(actionId, placeholder, options, selectedValue);
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

export async function buildMoveDeptModalBlocks(view: PessoasViewLike) {
  const v = view.state?.values ?? {};
  const g = (bid: string, aid: string) => v[bid]?.[aid]?.selected_option?.value as string | undefined;
  const nameVal = String(v.blk_name?.inp?.value ?? '');
  const currUnitSel = g('blk_curr_unit', 'move_dept_curr_unit');
  const currDeptSel = g('blk_curr_dept', 'move_dept_curr_dept');
  const currRoleSel = g('blk_curr_role', 'move_dept_curr_role');
  const newUnitSel = g('blk_new_unit', 'move_dept_new_unit');
  const newDeptSel = g('blk_new_dept', 'move_dept_new_dept');
  const newRoleSel = g('blk_new_role', 'move_dept_new_role');

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
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: '*Situação Atual*' } },
    cascadeSelectInputBlock('blk_curr_unit', 'Unidade', 'move_dept_curr_unit', 'Selecione a unidade...', unitOpts, currUnitSel),
    cascadeSelectInputBlock(
      'blk_curr_dept',
      'Departamento',
      'move_dept_curr_dept',
      'Selecione a unidade primeiro',
      currDeptOpts,
      currDeptOk
    ),
    roleSelectInputBlock(
      'blk_curr_role',
      'Cargo',
      'move_dept_curr_role',
      'Selecione o departamento primeiro',
      currRoleOpts,
      currRoleOk
    ),
    { type: 'section', text: { type: 'mrkdwn', text: '*Situação Nova*' } },
    cascadeSelectInputBlock('blk_new_unit', 'Unidade', 'move_dept_new_unit', 'Selecione a unidade...', unitOpts, newUnitSel),
    cascadeSelectInputBlock(
      'blk_new_dept',
      'Departamento',
      'move_dept_new_dept',
      'Selecione a unidade primeiro',
      newDeptOpts,
      newDeptOk
    ),
    roleSelectInputBlock(
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

export async function buildMoveCargoModalBlocks(view: PessoasViewLike) {
  const v = view.state?.values ?? {};
  const g = (bid: string, aid: string) => v[bid]?.[aid]?.selected_option?.value as string | undefined;
  const nameVal = String(v.blk_name?.inp?.value ?? '');
  const unitSel = g('blk_mc_unit', 'mc_unit_select');
  const deptSel = g('blk_mc_dept', 'mc_dept_select');
  const roleCurrSel = g('blk_mc_role_curr', 'mc_role_curr_select');
  const roleFutSel = g('blk_mc_role_fut', 'mc_role_fut_select');

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
    { type: 'divider' },
    cascadeSelectInputBlock('blk_mc_unit', 'Unidade', 'mc_unit_select', 'Selecione a unidade...', unitOpts, unitSel),
    cascadeSelectInputBlock(
      'blk_mc_dept',
      'Departamento',
      'mc_dept_select',
      'Selecione a unidade primeiro',
      deptOpts,
      deptOk
    ),
    roleSelectInputBlock(
      'blk_mc_role_curr',
      'Cargo Atual',
      'mc_role_curr_select',
      'Selecione o departamento primeiro',
      roleOpts,
      roleCurrOk
    ),
    roleSelectInputBlock(
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

export async function buildHireModalBlocks(view: PessoasViewLike) {
  const v = view.state?.values ?? {};
  const g = (bid: string, aid: string) => v[bid]?.[aid]?.selected_option?.value as string | undefined;
  const nameVal = String(v.blk_name?.inp?.value ?? '');
  const actionDateVal = (v.blk_action_date?.picker?.selected_date as string | undefined) ?? null;
  const unitSel = g('blk_hire_unit', 'hire_unit_select');
  const deptSel = g('blk_hire_dept', 'hire_dept_select');
  const roleSel = g('blk_hire_role', 'hire_role_select');

  const unitId = await resolveUnitIdFromSelection(unitSel);
  let deptOk = await sanitizeDeptValue(unitId, deptSel);
  const deptId = parsePipe(deptOk)?.id ?? null;
  let roleOk = await sanitizeRoleValue(deptId, roleSel);
  if (!deptOk) roleOk = undefined;

  const unitOpts = await unitSelectOptions();
  const deptOpts = await deptOptionsForUnit(unitId);
  const { options: roleOpts, leaderByRoleId } = await hireRoleDataForDepartment(deptId);

  const roleIdSelected = parsePipe(roleOk)?.id ?? null;
  const leaderForRole = roleIdSelected ? leaderByRoleId.get(roleIdSelected) ?? null : null;
  console.log('[HIRE DEBUG]', {
    deptId,
    roleIdSelected,
    roleOk,
    leaderForRole,
    leaderByRoleIdSize: leaderByRoleId.size,
    leaderByRoleIdKeys: [...leaderByRoleId.keys()].slice(0, 5)
  });
  const hireMgrSel = g('blk_hire_manager', 'hire_manager_select');

  const mgr = (v.blk_manager?.inp?.value as string | undefined) ?? '';
  const mgrEmail = (v.blk_manager_email?.inp?.value as string | undefined) ?? '';
  const email = (v.blk_email?.inp?.value as string | undefined) ?? '';
  const contractOpt = v.blk_contract_type?.inp_select?.selected_option as { value?: string; text?: { text?: string } } | undefined;
  const obs = (v.blk_obs?.inp?.value as string | undefined) ?? '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [
    {
      type: 'input',
      block_id: 'blk_name',
      label: { type: 'plain_text', text: 'Nome completo' },
      element: { type: 'plain_text_input', action_id: 'inp', initial_value: nameVal || undefined }
    },
    {
      type: 'input',
      block_id: 'blk_email',
      label: { type: 'plain_text', text: 'E-mail corporativo' },
      element: {
        type: 'plain_text_input',
        action_id: 'inp',
        placeholder: { type: 'plain_text', text: 'exemplo@empresa.com' },
        initial_value: email || undefined
      }
    },
    cascadeSelectInputBlock('blk_hire_unit', 'Unidade', 'hire_unit_select', 'Selecione a unidade...', unitOpts, unitSel),
    cascadeSelectInputBlock(
      'blk_hire_dept',
      'Departamento',
      'hire_dept_select',
      'Selecione a unidade primeiro',
      deptOpts,
      deptOk
    ),
    roleSelectInputBlock(
      'blk_hire_role',
      'Cargo',
      'hire_role_select',
      'Selecione o departamento primeiro',
      roleOpts,
      roleOk
    )
  ];

  if (roleOk && leaderForRole) {
    const enc = encodeHireManagerSelectValue(leaderForRole);
    const labelText =
      leaderForRole.name.length > 75 ? leaderForRole.name.slice(0, 72) + '...' : leaderForRole.name;
    const mgrOpts = [{ text: { type: 'plain_text' as const, text: labelText }, value: enc }];
    const selectedMgr = mgrOpts.some((o) => o.value === hireMgrSel) ? hireMgrSel! : enc;
    blocks.push(
      cascadeSelectInputBlock(
        'blk_hire_manager',
        'Gestor direto (líder do cargo)',
        'hire_manager_select',
        'Selecione o gestor',
        mgrOpts,
        selectedMgr
      )
    );
  } else if (roleOk) {
    blocks.push(
      {
        type: 'input',
        block_id: 'blk_manager',
        label: { type: 'plain_text', text: 'Gestor direto' },
        element: { type: 'plain_text_input', action_id: 'inp', initial_value: mgr || undefined }
      },
      {
        type: 'input',
        block_id: 'blk_manager_email',
        label: { type: 'plain_text', text: 'E-mail do gestor direto' },
        element: {
          type: 'plain_text_input',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'gestor@empresa.com' },
          initial_value: mgrEmail || undefined
        }
      }
    );
  }

  blocks.push(
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
      block_id: 'blk_action_date',
      label: { type: 'plain_text', text: 'Data de ação' },
      element: {
        type: 'datepicker',
        action_id: 'picker',
        ...(actionDateVal ? { initial_date: actionDateVal } : {})
      }
    },
    {
      type: 'input',
      block_id: 'blk_obs',
      optional: true,
      label: { type: 'plain_text', text: 'Observações' },
      element: { type: 'plain_text_input', multiline: true, action_id: 'inp', initial_value: obs || undefined }
    }
  );

  return blocks;
}

export async function buildFireModalBlocks(view: PessoasViewLike) {
  const v = view.state?.values ?? {};
  const g = (bid: string, aid: string) => v[bid]?.[aid]?.selected_option?.value as string | undefined;
  const nameVal = String(v.blk_name?.inp?.value ?? '');
  const unitSel = g('blk_fire_unit', 'fire_unit_select');
  const deptSel = g('blk_fire_dept', 'fire_dept_select');
  const roleSel = g('blk_fire_role', 'fire_role_select');

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
    cascadeSelectInputBlock('blk_fire_unit', 'Unidade', 'fire_unit_select', 'Selecione a unidade...', unitOpts, unitSel),
    cascadeSelectInputBlock(
      'blk_fire_dept',
      'Departamento',
      'fire_dept_select',
      'Selecione a unidade primeiro',
      deptOpts,
      deptOk
    ),
    roleSelectInputBlock(
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
  app.action('hire_role_select', async ({ ack, body, client }) => {
    await ack();
    try {
      await updateHireView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
    } catch (e) {
      console.error('[pessoas] views.update hire role:', e);
    }
  });
  app.action('hire_manager_select', async ({ ack, body, client }) => {
    await ack();
    try {
      await updateHireView(body as { view: PessoasViewLike & { id: string; hash: string } }, client as { views: { update: (a: unknown) => Promise<unknown> } });
    } catch (e) {
      console.error('[pessoas] views.update hire manager:', e);
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
}

export function isPessoasSelectPlaceholder(val: string | undefined | null): boolean {
  return isPh(val);
}
