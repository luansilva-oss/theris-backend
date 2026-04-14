// @ts-nocheck
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { sendSlackNotification } from '../services/slackService';
import { syncUserToJumpCloud, provisionUserOnJumpCloud } from '../services/jumpcloudSyncService';
import { bindUserToGoogleWorkspaceDirectory } from '../services/jumpcloudService';
import { mapTherisUnitNameToJumpCloudCompany } from '../config/jumpcloud';
import { hasProfile } from '../middleware/auth';
import { isInfraTicketType, isInboxMember } from '../lib/infraTicket';
import { CHAMADO_PENDING_ALL_STATUSES, STATUS_FILTER_VALUE_PENDING_ALL } from '../constants/requestStatusConfig';

const prisma = new PrismaClient();

// Cloudinary: config via variáveis de ambiente ou CLOUDINARY_URL
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ url: process.env.CLOUDINARY_URL });
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Bypass RH: solicitante Renata Czapiewski Silva pula gestor e vai direto para SI
const RH_BYPASS_REQUESTER_NAME = 'Renata Czapiewski Silva';
function isRhBypassRequester(name: string | null | undefined): boolean {
  const n = (name || '').trim();
  return n === RH_BYPASS_REQUESTER_NAME || n.toLowerCase().includes('renata czapiewski');
}

// Aprovadores SI autorizados para solicitações com bypass (Renata): Luan Matheus, Allan Von Stain, Vladimir Sesar.
// Defina no .env: SI_BYPASS_APPROVER_EMAILS=email1@empresa.com,email2@empresa.com,email3@empresa.com
const SI_BYPASS_APPROVER_EMAILS = (process.env.SI_BYPASS_APPROVER_EMAILS || '')
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

/** Tipos de solicitação que representam desligamento/offboarding (ao aprovar, desvincular o colaborador alvo). */
const OFFBOARDING_REQUEST_TYPES = ['FIRING', 'DEMISSAO', 'OFFBOARDING'];

/** Tipos de solicitação que representam admissão/onboarding (ao aprovar, vincular colaborador a departamento e cargo). */
const ONBOARDING_REQUEST_TYPES = ['HIRING', 'ADMISSAO', 'ONBOARDING'];

type HiringJumpCloudSiPayload =
  | { outcome: 'created'; email: string; jumpcloudId: string }
  | { outcome: 'manual_check' };

function splitNameForJumpCloud(fullName: string): { firstName: string; lastName: string } {
  const t = (fullName || '').trim();
  if (!t) return { firstName: 'Colaborador', lastName: '-' };
  const i = t.indexOf(' ');
  if (i < 0) return { firstName: t, lastName: '' };
  return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() || '' };
}

/**
 * HIRING: cria usuário no JumpCloud se não existir. Não lança; retorna payload opcional para Slack SI.
 * Persiste `User.jumpcloudId` quando o JumpCloud retorna o ID (novo ou já existente).
 */
async function tryHiringJumpCloudProvisionForEmail(userEmail: string): Promise<HiringJumpCloudSiPayload | undefined> {
  try {
    const hiringUser = await prisma.user.findFirst({
      where: { email: { equals: userEmail.trim(), mode: 'insensitive' } },
      include: { manager: { select: { email: true } } }
    });
    if (!hiringUser?.roleId) {
      return { outcome: 'manual_check' };
    }
    const role = await prisma.role.findUnique({
      where: { id: hiringUser.roleId },
      include: { department: { include: { unit: true } } }
    });
    if (!role?.department) {
      return { outcome: 'manual_check' };
    }
    const { firstName, lastName } = splitNameForJumpCloud(hiringUser.name);
    let managerJcId: string | undefined;
    if (hiringUser.manager?.email) {
      const { getSystemUserIdByEmail } = await import('../services/jumpcloudService');
      managerJcId = (await getSystemUserIdByEmail(hiringUser.manager.email)) ?? undefined;
    }
    const company = mapTherisUnitNameToJumpCloudCompany(role.department.unit?.name ?? '');
    const jcResult = await provisionUserOnJumpCloud({
      email: hiringUser.email,
      firstName,
      lastName,
      jobTitle: role.name,
      department: role.department.name,
      company,
      managerJcId
    });
    if (jcResult === null) {
      return { outcome: 'manual_check' };
    }
    try {
      await prisma.user.update({
        where: { id: hiringUser.id },
        data: { jumpcloudId: jcResult.jumpcloudId }
      });
    } catch (persistErr) {
      console.warn('[HIRING] Persistir jumpcloudId falhou:', persistErr);
    }
    if (jcResult.created) {
      console.info(`[HIRING] Usuário criado no JumpCloud: ${hiringUser.email} → ${jcResult.jumpcloudId}`);
      return { outcome: 'created', email: hiringUser.email, jumpcloudId: jcResult.jumpcloudId };
    }
    return undefined;
  } catch (e) {
    console.error('[HIRING] Erro ao provisionar JumpCloud:', e);
    return { outcome: 'manual_check' };
  }
}

/**
 * Automação: ao aprovar um chamado de desligamento, desvincula o colaborador alvo da estrutura (soft-delete)
 * e notifica os Owners das ferramentas (KBS do cargo) para revogação imediata, com botão de confirmação.
 * O alvo é identificado por: details.targetUserId | details.collaboratorId | details.collaboratorEmail | details.collaboratorName (busca por nome).
 */
async function runOffboardingAutomation(
  requestId: string,
  requestType: string,
  detailsJson: string | null,
  actionDate?: Date | string | null,
  authorId?: string | null
): Promise<void> {
  if (!OFFBOARDING_REQUEST_TYPES.includes(requestType)) return;
  let details: Record<string, unknown> = {};
  try {
    details = typeof detailsJson === 'string' ? JSON.parse(detailsJson || '{}') : (detailsJson || {});
  } catch {
    return;
  }
  const d = details as Record<string, string | undefined>;
  let targetUser: {
    id: string;
    name: string;
    email: string;
    roleId: string | null;
    departmentId: string | null;
    unitId: string | null;
  } | null = null;

  const targetUserId = d.targetUserId || d.collaboratorId;
  if (targetUserId) {
    const u = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, roleId: true, departmentId: true, unitId: true }
    });
    if (u) targetUser = u;
  }
  if (!targetUser && d.collaboratorEmail) {
    const u = await prisma.user.findUnique({
      where: { email: d.collaboratorEmail.trim() },
      select: { id: true, name: true, email: true, roleId: true, departmentId: true, unitId: true }
    });
    if (u) targetUser = u;
  }
  if (!targetUser && (d.collaboratorName || d.substitute)) {
    const name = (d.collaboratorName || d.substitute || '').trim();
    if (name) {
      const u = await prisma.user.findFirst({
        where: { isActive: true, name: { equals: name, mode: 'insensitive' } },
        select: { id: true, name: true, email: true, roleId: true, departmentId: true, unitId: true }
      });
      if (u) targetUser = u;
    }
  }

  if (!targetUser) {
    console.warn(`[Automação] Desligamento: chamado ${requestId} aprovado, mas não foi possível identificar o colaborador alvo (targetUserId/collaboratorEmail/collaboratorName).`);
    return;
  }

  let departmentName = '—';
  let unitName = '—';
  let jobTitle = '—';
  const kitItems: { toolName: string; accessLevelDesc: string | null }[] = [];
  if (targetUser.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: targetUser.roleId },
      include: { kitItems: true, department: { include: { unit: true } } }
    });
    if (role?.kitItems?.length) {
      kitItems.push(...role.kitItems.map((k) => ({ toolName: k.toolName, accessLevelDesc: k.accessLevelDesc })));
      departmentName = role.department?.name ?? '—';
      unitName = role.department?.unit?.name ?? '—';
      jobTitle = role.name;
    }
  }
  if (targetUser.departmentId && departmentName === '—') {
    const dept = await prisma.department.findUnique({
      where: { id: targetUser.departmentId },
      include: { unit: true }
    });
    if (dept) {
      departmentName = dept.name;
      unitName = dept.unit?.name ?? '—';
    }
  }

  const offboardUserId = targetUser.id;
  const offboardRoleId = targetUser.roleId;

  const aexRows = await prisma.access.findMany({
    where: {
      userId: targetUser.id,
      isExtraordinary: true,
      status: { not: 'REVOKED' }
    },
    include: { tool: { include: { owner: { select: { id: true, email: true, name: true } } } } }
  });

  const slack = await import('../services/slackService');
  const aexSiLines: { toolName: string; toolCode: string; ownerName: string }[] = [];

  for (const accessRow of aexRows) {
    try {
      await prisma.access.update({
        where: { id: accessRow.id },
        data: { status: 'REVOKED' }
      });
    } catch (aexDbErr) {
      console.error('[Automação] Desligamento AEX: falha ao atualizar Access', accessRow.id, aexDbErr);
      continue;
    }
    const tool = accessRow.tool;
    if (!tool) continue;
    const toolCode = (tool.acronym || '').trim() || '—';
    aexSiLines.push({ toolName: tool.name, toolCode, ownerName: tool.owner?.name || '—' });

    slack.scheduleDesligamentoAexJumpCloudRevoke(targetUser.email, tool.acronym);
    slack.scheduleDesligamentoAexOwnerDm({
      requestId,
      collaboratorName: targetUser.name,
      offboardUserId: targetUser.id,
      toolId: tool.id,
      toolName: tool.name,
      toolCode,
      owner: tool.owner
    });
  }

  void import('../services/jumpcloudSyncService')
    .then((m) =>
      m.suspendUserOnJumpCloud(targetUser.email).then(() => {
        slack.firePostSlackAcessosChannel(`🔧 Usuário removido/suspenso no JumpCloud | Ticket: #${requestId.slice(0, 8)}`);
      })
    )
    .catch((err) => console.error('[OFFBOARDING] Falha fire-and-forget suspensão JC:', err));

  void import('../services/googleWorkspaceService')
    .then(({ suspendGoogleWorkspaceUserFireAndForget }) => {
      suspendGoogleWorkspaceUserFireAndForget({
        email: targetUser.email,
        requestId,
        onDone: (ok) => {
          if (ok) {
            void import('../services/slackService').then(({ firePostSlackAcessosChannel }) =>
              firePostSlackAcessosChannel(`🔧 Usuário suspenso no Google Workspace | Ticket: #${requestId.slice(0, 8)}`)
            );
          }
        }
      });
    })
    .catch((err) => console.error('[OFFBOARDING] Google offboard (não bloqueia):', err));

  await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      roleId: null,
      departmentId: null,
      unitId: null,
      jobTitle: null,
      managerId: null,
      isActive: false
    }
  });

  try {
    const { handleLeaderRoleChange } = await import('../services/leadershipPropagationService');
    await handleLeaderRoleChange(offboardUserId, offboardRoleId, null, authorId ?? undefined);
  } catch (leadErr) {
    console.error('[Automação] Desligamento: handleLeaderRoleChange:', leadErr);
  }

  console.log(`[Automação] Usuário ${targetUser.name} (${targetUser.id}) desligado com sucesso após aprovação do chamado ${requestId}.`);

  const actionDateStr = actionDate instanceof Date ? actionDate.toISOString().slice(0, 10) : (typeof actionDate === 'string' ? actionDate : null);
  try {
    if (kitItems.length > 0) {
      await slack.notificarOwnersDesligamento(requestId, targetUser.name, jobTitle, departmentName, unitName, kitItems, actionDateStr);
    }
    void slack.postDesligamentoSiResumoKbsEAex({
      requestId,
      collaboratorName: targetUser.name,
      jobTitle,
      departmentName,
      unitName,
      actionDate: actionDateStr,
      kitItems,
      aexLines: aexSiLines
    }).catch((siErr) => console.error('[Automação] Desligamento: resumo SI (não bloqueia):', siErr));
  } catch (notifErr) {
    console.error('[Automação] Desligamento: falha ao notificar owners / SI (não bloqueia):', notifErr);
  }

  slack.firePostSlackAcessosChannel(`🔒 Offboarding concluído — ${targetUser.name} | Ticket: #${requestId.slice(0, 8)}`);
}

/**
 * Automação de Onboarding: ao aprovar um chamado de contratação (HIRING, ADMISSAO, ONBOARDING),
 * respeita a hierarquia Unidade → Departamento → Cargo: busca/cria cada nível e vincula o colaborador.
 * Dados extraídos de request.details: unit/Unidade, department/Depto/dept, role/Cargo, collaboratorName/Colaborador, collaboratorEmail/email.
 */
type OnboardingResult = {
  requestId: string;
  roleId: string;
  userId: string;
  collaboratorName: string;
  jobTitle: string;
  departmentName: string;
  unitName: string;
  startDate: string;
  /** E-mail do colaborador após create/update (sync JumpCloud). */
  userEmail: string;
};
async function runOnboardingAutomation(
  requestId: string,
  request: { type: string; details: string | null },
  authorId?: string | null
): Promise<OnboardingResult | void> {
  if (!ONBOARDING_REQUEST_TYPES.includes(request.type)) return;
  let d: Record<string, unknown> = {};
  try {
    d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
  } catch (parseErr) {
    console.warn(
      '[Automação Onboarding] Falha ao parsear details do chamado:',
      requestId,
      parseErr
    );
    return;
  }
  const details = d as Record<string, string | undefined>;
  const collaboratorName = (
    details.fullName ||
    details.collaboratorName ||
    details.Colaborador ||
    details.target ||
    details.name ||
    ''
  ).trim();
  const roleName = (details.role || details.Cargo || details.cargo || details.jobTitle || '').trim();
  const departmentName = (details.department || details.Depto || details.dept || '').trim();
  const unitName = (details.unit || details.unitName || details.Unidade || details.unidade || '').trim();
  const collaboratorEmail = (
    details.collaboratorEmail ||
    details.corporateEmail ||
    details.email ||
    details.targetEmail ||
    ''
  ).trim();

  if (!departmentName) {
    console.warn(`[Automação Onboarding] Chamado ${requestId}: departamento não informado nos detalhes. Ignorando.`);
    return;
  }
  if (!roleName) {
    console.warn(`[Automação Onboarding] Chamado ${requestId}: cargo não informado nos detalhes. Ignorando.`);
    return;
  }
  if (!collaboratorName && !collaboratorEmail) {
    console.warn(`[Automação Onboarding] Chamado ${requestId}: colaborador (nome ou e-mail) não informado. Ignorando.`);
    return;
  }

  // a) Unidade: buscar por nome (case-insensitive). Se não vier no payload, department será buscado/criado sem unitId (compatibilidade).
  let unit: { id: string; name: string } | null = null;
  if (unitName) {
    unit = await prisma.unit.findFirst({
      where: { name: { equals: unitName, mode: 'insensitive' } },
      select: { id: true, name: true }
    });
    if (!unit) {
      console.warn(`[Automação Onboarding] Chamado ${requestId}: unidade "${unitName}" não encontrada no catálogo. Departamento será criado sem vínculo à unidade.`);
    }
  }

  // b) Departamento: buscar pelo nome E pelo unitId (quando houver unidade); se não existir, criar vinculando ao unitId
  let department = await prisma.department.findFirst({
    where: {
      name: { equals: departmentName, mode: 'insensitive' },
      ...(unit ? { unitId: unit.id } : { unitId: null })
    }
  });
  if (!department) {
    department = await prisma.department.create({
      data: { name: departmentName, unitId: unit?.id ?? null }
    });
  }

  // c) Cargo: buscar pelo nome e departmentId; se não existir, criar
  let role = await prisma.role.findFirst({
    where: {
      departmentId: department.id,
      name: { equals: roleName, mode: 'insensitive' }
    }
  });
  if (!role) {
    role = await prisma.role.create({
      data: { name: roleName, departmentId: department.id }
    });
  }

  // d) Colaborador (User): upsert — roleId, departmentId, unitId, jobTitle, isActive
  let user = collaboratorEmail
    ? await prisma.user.findUnique({ where: { email: collaboratorEmail } })
    : null;
  if (!user && collaboratorName) {
    user = await prisma.user.findFirst({
      where: { isActive: true, name: { equals: collaboratorName, mode: 'insensitive' } }
    });
  }

  const startDate = (details.startDate as string) || new Date().toISOString().slice(0, 10);
  const departmentNameRes = department.name;
  const unitNameRes = unit?.name ?? '—';

  const managerEmailOnb = (details.managerEmail || details.managerCorporateEmail || '').trim();

  if (user) {
    let managerId: string | null = null;
    if (managerEmailOnb) {
      const mgr = await prisma.user.findFirst({
        where: { email: { equals: managerEmailOnb, mode: 'insensitive' } },
        select: { id: true }
      });
      managerId = mgr?.id ?? null;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        roleId: role.id,
        departmentId: department.id,
        unitId: unit?.id ?? null,
        jobTitle: role.name,
        isActive: true,
        ...(managerId ? { managerId } : {})
      }
    });
    try {
      const { propagateLeaderOnRoleChange } = await import('../services/leadershipPropagationService');
      await propagateLeaderOnRoleChange(user.id, role.id, authorId ?? undefined);
    } catch (leadErr) {
      console.error('[Automação Onboarding] propagateLeaderOnRoleChange:', leadErr);
    }
    console.log(`[Automação Onboarding] Unidade/Depto/Cargo validados e colaborador ${user.name} vinculado com sucesso (Chamado ${requestId}).`);
    return {
      requestId,
      roleId: role.id,
      userId: user.id,
      collaboratorName: user.name,
      jobTitle: role.name,
      departmentName: departmentNameRes,
      unitName: unitNameRes,
      startDate,
      userEmail: user.email
    };
  }

  if (!collaboratorEmail) {
    console.warn(`[Automação Onboarding] Chamado ${requestId}: colaborador "${collaboratorName}" não encontrado na base e e-mail não informado. Não foi possível criar usuário.`);
    return;
  }

  let managerIdCreate: string | null = null;
  if (managerEmailOnb) {
    const mgr = await prisma.user.findFirst({
      where: { email: { equals: managerEmailOnb, mode: 'insensitive' } },
      select: { id: true }
    });
    managerIdCreate = mgr?.id ?? null;
  }

  const created = await prisma.user.create({
    data: {
      name: collaboratorName || collaboratorEmail.split('@')[0],
      email: collaboratorEmail,
      departmentId: department.id,
      unitId: unit?.id ?? null,
      jobTitle: role.name,
      roleId: role.id,
      isActive: true,
      ...(managerIdCreate ? { managerId: managerIdCreate } : {})
    }
  });
  try {
    const { propagateLeaderOnRoleChange } = await import('../services/leadershipPropagationService');
    await propagateLeaderOnRoleChange(created.id, role.id, authorId ?? undefined);
  } catch (leadErr) {
    console.error('[Automação Onboarding] propagateLeaderOnRoleChange:', leadErr);
  }
  console.log(`[Automação Onboarding] Unidade/Depto/Cargo validados e colaborador ${collaboratorName || collaboratorEmail} criado e vinculado com sucesso (Chamado ${requestId}).`);
  return {
    requestId,
    roleId: role.id,
    userId: created.id,
    collaboratorName: collaboratorName || collaboratorEmail,
    jobTitle: role.name,
    departmentName: departmentNameRes,
    unitName: unitNameRes,
    startDate,
    userEmail: created.email
  };
}

/** Tipos de solicitação que ao serem aprovados concedem acesso extraordinário (vinculam usuário à ferramenta na tabela Access). */
const EXTRAORDINARY_ACCESS_REQUEST_TYPES = ['ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO', 'ACCESS_TOOL_EXTRA'];

type ExtraordinaryAccessAutomationResult = {
  accessId: string;
  toolId: string;
  requesterId: string;
};

/**
 * Automação: ao aprovar um chamado de acesso extraordinário, vincula o colaborador (requester) à ferramenta na tabela Access com isExtraordinary = true.
 * Renovação (já existe AEX ativo na mesma ferramenta): cria nova linha de Access; o fluxo seguinte revoga a anterior (substituição).
 * Usado tanto no fluxo de aprovação (updateSolicitacao) quanto quando o status é alterado para APROVADO via updateSolicitacaoMetadata.
 */
async function runExtraordinaryAccessAutomation(
  requestId: string,
  request: { type: string; requesterId: string | null; details: string | null; isExtraordinary?: boolean; extraordinaryDuration?: number | null; extraordinaryUnit?: string | null }
): Promise<ExtraordinaryAccessAutomationResult | null> {
  if (!request.requesterId) return null;
  if (!EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) && !request.isExtraordinary) return null;
  let d: Record<string, unknown> = {};
  try {
    d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
  } catch {
    return null;
  }
  const toolId = typeof d.toolId === 'string' ? d.toolId.trim() : null;
  const toolName = (d.tool || d.toolName || (d.info && typeof d.info === 'string' ? (d.info as string).split(': ')[1] : null) || '').trim();
  const targetUserId = request.requesterId;
  const levelRequested = (d.target || d.targetValue) as string | null;

  if (!toolId && !toolName) return null;

  const tool = toolId
    ? await prisma.tool.findUnique({ where: { id: toolId } })
    : await prisma.tool.findFirst({
        where: {
          OR: [
            { name: { contains: toolName, mode: 'insensitive' } },
            { acronym: { equals: toolName, mode: 'insensitive' } }
          ]
        }
      });
  if (!tool) {
    console.warn(`[Automação] Acesso extraordinário: ferramenta "${toolId || toolName}" não encontrada no catálogo (chamado ${requestId}).`);
    return null;
  }

  const existing = await prisma.access.findFirst({
    where: { userId: targetUserId, toolId: tool.id },
    orderBy: { createdAt: 'desc' }
  });
  const isExtra = request.isExtraordinary ?? EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type);
  const duration = request.extraordinaryDuration ?? (d.duration != null ? parseInt(String(d.duration), 10) : null);
  const unit = (request.extraordinaryUnit ?? d.unit) as string | null;
  const statusValue = (levelRequested && String(levelRequested).trim()) || 'ACTIVE';

  const levelValue = levelRequested && String(levelRequested).trim() ? levelRequested.trim() : null;
  const accessData = {
    status: statusValue,
    isExtraordinary: isExtra,
    ...(levelValue != null && { level: levelValue }),
    ...(duration != null && { duration }),
    ...(unit != null && { unit })
  };

  const renewalCreatesNewRow = Boolean(
    existing && isExtra && existing.isExtraordinary === true && existing.status !== 'REVOKED'
  );

  if (renewalCreatesNewRow) {
    const created = await prisma.access.create({
      data: {
        toolId: tool.id,
        userId: targetUserId,
        ...accessData
      }
    });
    console.log(`[Automação] Acesso extraordinário concedido (renovação): usuário ${targetUserId} — nova linha ${created.id} — ferramenta ${tool.name} (chamado ${requestId}).`);
    return { accessId: created.id, toolId: tool.id, requesterId: targetUserId };
  }

  if (existing) {
    await prisma.access.update({
      where: { id: existing.id },
      data: accessData
    });
    console.log(`[Automação] Acesso extraordinário concedido: usuário ${targetUserId} vinculado à ferramenta ${tool.name} (chamado ${requestId}).`);
    return { accessId: existing.id, toolId: tool.id, requesterId: targetUserId };
  }

  const created = await prisma.access.create({
    data: {
      toolId: tool.id,
      userId: targetUserId,
      ...accessData
    }
  });
  console.log(`[Automação] Acesso extraordinário concedido: usuário ${targetUserId} vinculado à ferramenta ${tool.name} (chamado ${requestId}).`);
  return { accessId: created.id, toolId: tool.id, requesterId: targetUserId };
}

/** Revoga Access AEX anteriores (mesmo usuário/ferramenta), após Prisma criar o novo ciclo — antes do provisionamento JumpCloud. */
async function supersedePriorExtraordinaryAccessAfterRenewal(params: {
  requesterId: string;
  toolId: string;
  keepAccessId: string;
}): Promise<void> {
  const others = await prisma.access.findMany({
    where: {
      userId: params.requesterId,
      toolId: params.toolId,
      isExtraordinary: true,
      status: { not: 'REVOKED' },
      id: { not: params.keepAccessId }
    }
  });
  if (others.length === 0) return;

  const { registrarMudanca } = await import('../lib/auditLog');
  const tool = await prisma.tool.findUnique({
    where: { id: params.toolId },
    select: { acronym: true }
  });
  const toolCode = (tool?.acronym || '').trim();
  const u = await prisma.user.findUnique({
    where: { id: params.requesterId },
    select: { email: true }
  });
  const email = (u?.email || '').trim();

  for (const prev of others) {
    try {
      await prisma.access.update({
        where: { id: prev.id },
        data: { status: 'REVOKED' }
      });
    } catch (e) {
      console.error('[AEX] Falha ao revogar access anterior (supersede):', prev.id, e);
      continue;
    }

    void registrarMudanca({
      tipo: 'AEX_SUPERSEDED',
      entidadeTipo: 'Access',
      entidadeId: prev.id,
      descricao: 'Acesso extraordinário substituído por renovação',
      dadosAntes: {
        userId: prev.userId,
        toolId: prev.toolId,
        status: prev.status,
        isExtraordinary: prev.isExtraordinary
      },
      dadosDepois: { status: 'REVOKED' }
    }).catch((err) => console.warn('[AEX] Auditoria supersede:', prev.id, err));

    if (toolCode && /^ap_/i.test(toolCode) && email) {
      void (async () => {
        try {
          const { getSystemUserIdByEmail } = await import('../services/jumpcloudService');
          const { revokeExtraordinaryAccessOnJumpCloud } = await import('../services/jumpcloudGroupSyncService');
          const jcId = await getSystemUserIdByEmail(email);
          if (jcId) await revokeExtraordinaryAccessOnJumpCloud(jcId, toolCode);
        } catch (e) {
          console.error('[AEX] JumpCloud revoke supersede:', e);
        }
      })();
    }
    console.info('[AEX] Acesso anterior substituído por renovação:', toolCode || params.toolId);
  }
}

/** toolCode JumpCloud (ex.: ap_*) para grupo AEX — details, depois acronym da Tool. */
async function resolveAexJumpCloudToolCode(request: { details: string | null }): Promise<string | null> {
  let d: Record<string, unknown> = {};
  try {
    d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : {};
  } catch {
    return null;
  }
  for (const key of ['toolCode', 'accessLevelCode']) {
    const v = d[key];
    if (typeof v === 'string' && /^ap_/i.test(v.trim())) return v.trim();
  }
  const toolId = typeof d.toolId === 'string' ? d.toolId.trim() : null;
  const toolName = String(d.tool || d.toolName || '').trim();
  if (!toolId && !toolName) return null;
  const tool = toolId
    ? await prisma.tool.findUnique({ where: { id: toolId }, select: { acronym: true } })
    : await prisma.tool.findFirst({
        where: {
          OR: [
            { name: { contains: toolName, mode: 'insensitive' } },
            { acronym: { equals: toolName, mode: 'insensitive' } }
          ]
        },
        select: { acronym: true }
      });
  const ac = tool?.acronym?.trim();
  if (ac && /^ap_/i.test(ac)) return ac;
  return null;
}

async function fireAexJumpCloudProvisionAfterPrisma(request: {
  details: string | null;
  requesterId: string | null;
}): Promise<void> {
  const toolCodeJc = await resolveAexJumpCloudToolCode(request);
  if (!toolCodeJc || !request.requesterId) return;
  const reqUser = await prisma.user.findUnique({
    where: { id: request.requesterId },
    select: { email: true }
  });
  if (!reqUser?.email) return;
  const { getSystemUserIdByEmail } = await import('../services/jumpcloudService');
  const jcId = await getSystemUserIdByEmail(reqUser.email);
  if (!jcId) {
    console.warn('[AEX] Provisionamento JumpCloud ignorado: usuário sem ID JumpCloud (e-mail:', reqUser.email, ')');
    return;
  }
  const { provisionExtraordinaryAccessOnJumpCloud } = await import('../services/jumpcloudGroupSyncService');
  void provisionExtraordinaryAccessOnJumpCloud(jcId, toolCodeJc).catch((err) =>
    console.error('[AEX] Falha fire-and-forget provisioning:', err)
  );
}

/** Tipo de item KBS para notificação pós-mudança (compatível com slackService.KBSItem). */
type KBSItem = { toolName: string; accessLevelDesc: string | null };

/**
 * Sincroniza a tabela Access (Catálogo) após mudança de cargo: remove acessos das ferramentas que saíram do KBS,
 * adiciona/atualiza acessos para as ferramentas do novo KBS com o nível correto.
 */
async function syncAccessAfterRoleChange(userId: string, kbsAnterior: KBSItem[], kbsNovo: KBSItem[]): Promise<void> {
  const novoByTool = new Map<string, string | null>();
  kbsNovo.forEach((k) => novoByTool.set(k.toolName.trim().toLowerCase(), k.accessLevelDesc ?? null));

  const anteriorOnly = kbsAnterior.filter((a) => !novoByTool.has(a.toolName.trim().toLowerCase()));

  for (const item of anteriorOnly) {
    const tool = await prisma.tool.findFirst({
      where: {
        OR: [
          { name: { equals: item.toolName, mode: 'insensitive' } },
          { name: { contains: item.toolName, mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });
    if (tool) {
      await prisma.access.deleteMany({ where: { toolId: tool.id, userId } });
    }
  }

  for (const item of kbsNovo) {
    const tool = await prisma.tool.findFirst({
      where: {
        OR: [
          { name: { equals: item.toolName, mode: 'insensitive' } },
          { name: { contains: item.toolName, mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });
    if (!tool) continue;
    const level = item.accessLevelDesc ?? 'ACTIVE';
    await prisma.access.deleteMany({ where: { toolId: tool.id, userId } });
    await prisma.access.create({
      data: {
        toolId: tool.id,
        userId,
        status: level,
        isExtraordinary: false
      }
    });
  }
}

/**
 * Sincroniza Access (Catálogo) a partir do KBS do cargo: cria registros de acesso para cada ferramenta do role.
 * Usado após onboarding (novo colaborador vinculado ao cargo).
 */
async function syncAccessFromRole(userId: string, roleId: string): Promise<void> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { kitItems: true }
  });
  if (!role?.kitItems?.length) return;
  for (const ki of role.kitItems) {
    const tool = await prisma.tool.findFirst({
      where: {
        OR: [
          { name: { equals: ki.toolName, mode: 'insensitive' } },
          { name: { contains: ki.toolName, mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });
    if (!tool) continue;
    const level = ki.accessLevelDesc ?? 'ACTIVE';
    await prisma.access.deleteMany({ where: { toolId: tool.id, userId } });
    await prisma.access.create({
      data: { toolId: tool.id, userId, status: level, isExtraordinary: false }
    });
  }
}

/** Conta quantas palavras do input existem no nome do candidato (case-insensitive). Usado para desempate na camada 3. */
function scoreSimilarity(input: string, candidate: string): number {
  const words = input.toLowerCase().split(/\s+/).filter(Boolean);
  const candLower = candidate.toLowerCase();
  return words.filter((w) => candLower.includes(w)).length;
}

/** Busca departamento em 3 camadas: (1) por ID, (2) equals case-insensitive, (3) contains + melhor similaridade. */
async function findDepartmentByThreeLayers(
  departmentIdFromDetails: string | null | undefined,
  deptName: string
): Promise<{ id: string; name: string; unitId: string | null } | null> {
  const id = (departmentIdFromDetails || '').toString().trim();
  if (id) {
    const dept = await prisma.department.findUnique({ where: { id }, include: { unit: true } });
    if (dept) return { id: dept.id, name: dept.name, unitId: dept.unitId ?? (dept as any).unit?.id ?? null };
  }
  if (!deptName) return null;
  let dept = await prisma.department.findFirst({
    where: { name: { equals: deptName, mode: 'insensitive' } },
    include: { unit: true }
  });
  if (dept) return { id: dept.id, name: dept.name, unitId: dept.unitId ?? (dept as any).unit?.id ?? null };
  const candidates = await prisma.department.findMany({
    where: { name: { contains: deptName, mode: 'insensitive' } },
    include: { unit: true }
  });
  if (candidates.length === 0) return null;
  const best = candidates.sort(
    (a, b) => scoreSimilarity(deptName, b.name) - scoreSimilarity(deptName, a.name)
  )[0];
  return { id: best.id, name: best.name, unitId: best.unitId ?? (best as any).unit?.id ?? null };
}

/** Busca cargo em 3 camadas: (1) por ID, (2) equals case-insensitive, (3) contains + melhor similaridade. departmentId opcional para restringir ao depto. */
async function findRoleByThreeLayers(
  roleIdFromDetails: string | null | undefined,
  roleName: string,
  departmentId: string | null
): Promise<{ id: string; name: string; departmentId: string; unitId: string | null } | null> {
  const id = (roleIdFromDetails || '').toString().trim();
  if (id) {
    const role = await prisma.role.findUnique({ where: { id }, include: { department: true } });
    if (role) return { id: role.id, name: role.name, departmentId: role.departmentId, unitId: role.department?.unitId ?? null };
  }
  if (!roleName) return null;
  const baseWhere = departmentId ? { departmentId } : {};
  let role = await prisma.role.findFirst({
    where: { ...baseWhere, name: { equals: roleName, mode: 'insensitive' } },
    include: { department: true }
  });
  if (role) return { id: role.id, name: role.name, departmentId: role.departmentId, unitId: role.department?.unitId ?? null };
  const candidates = await prisma.role.findMany({
    where: { ...baseWhere, name: { contains: roleName, mode: 'insensitive' } },
    include: { department: true }
  });
  if (candidates.length === 0) return null;
  const best = candidates.sort(
    (a, b) => scoreSimilarity(roleName, b.name) - scoreSimilarity(roleName, a.name)
  )[0];
  return { id: best.id, name: best.name, departmentId: best.departmentId, unitId: best.department?.unitId ?? null };
}

/**
 * Automação CHANGE_ROLE: ao aprovar um chamado de movimentação, atualiza o colaborador no banco.
 * Dados em details: collaboratorId | collaboratorEmail | collaboratorName; future: { role, dept, roleId?, departmentId?, unitId? };
 * details.newRoleId e details.newDepartmentId (ou future.roleId / future.departmentId) têm prioridade (camada 1).
 * Resolução por texto: camada 2 equals case-insensitive, camada 3 contains + similaridade.
 * Retorna payload para notificarOwnersFerramenta quando success.
 */
async function runChangeRoleAutomation(
  requestId: string,
  request: { type: string; requesterId: string | null; details: string | null; actionDate?: string | Date | null; requester?: { name?: string; email?: string } | null },
  approverId?: string | null
): Promise<{
  success: boolean;
  collaboratorName?: string;
  /** E-mail do colaborador após update (sync JumpCloud). */
  userEmail?: string;
  notifPayload?: {
    colaborador: { nome: string; cargoAnterior: string; deptAnterior: string; cargoNovo: string; deptNovo: string };
    kbsAnterior: KBSItem[];
    kbsNovo: KBSItem[];
    dataAcao: string;
  };
}> {
  if (request.type !== 'CHANGE_ROLE') return { success: false };
  let d: Record<string, unknown> = {};
  try {
    d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
  } catch (parseErr) {
    console.error('[CHANGE_ROLE] Erro ao fazer parse de details:', parseErr);
    return { success: false };
  }
  const details = d as Record<string, string | { role?: string; dept?: string } | undefined>;
  const future = details.future as Record<string, string> | undefined;
  const futureRole = (future?.role ?? (future as any)?.roleName ?? '').toString().trim();
  const futureDept = (future?.dept ?? (future as any)?.deptName ?? '').toString().trim();
  const newRoleId = (details.newRoleId ?? (future as any)?.roleId ?? '').toString().trim() || null;
  const newDepartmentId = (details.newDepartmentId ?? (future as any)?.departmentId ?? '').toString().trim() || null;
  if (!futureRole && !futureDept && !newRoleId && !newDepartmentId) {
    console.warn(`[CHANGE_ROLE] Chamado ${requestId}: detalhes future não informados (future=%s). Ignorando.`, JSON.stringify(future));
    return { success: false };
  }
  console.log('[CHANGE_ROLE] Executando mudança de cargo para requestId:', requestId, 'future.role=', futureRole, 'future.dept=', futureDept, 'newRoleId=', newRoleId, 'newDepartmentId=', newDepartmentId);

  let targetUser: { id: string; name: string; email: string } | null = null;
  const collaboratorId = details.collaboratorId || details.targetUserId;
  const collaboratorEmail = (details.collaboratorEmail || details.email || '').toString().trim();
  const collaboratorName = (details.collaboratorName || details.info || '').toString().replace(/^[^:]+:\s*/, '').trim();

  if (collaboratorId) {
    const u = await prisma.user.findUnique({ where: { id: collaboratorId }, select: { id: true, name: true, email: true } });
    if (u) targetUser = u;
  }
  if (!targetUser && collaboratorEmail) {
    const u = await prisma.user.findUnique({ where: { email: collaboratorEmail }, select: { id: true, name: true, email: true } });
    if (u) targetUser = u;
  }
  if (!targetUser && collaboratorName) {
    let u = await prisma.user.findFirst({
      where: { isActive: true, name: { equals: collaboratorName, mode: 'insensitive' } },
      select: { id: true, name: true, email: true }
    });
    if (!u) {
      u = await prisma.user.findFirst({
        where: { isActive: true, name: { contains: collaboratorName, mode: 'insensitive' } },
        select: { id: true, name: true, email: true }
      });
    }
    if (u) targetUser = u;
  }
  if (!targetUser) {
    console.warn(`[Automação CHANGE_ROLE] Chamado ${requestId}: colaborador não identificado (collaboratorId/email/nome="${collaboratorName}").`);
    return { success: false };
  }

  let roleId: string | null = null;
  let departmentId: string | null = null;
  let unitId: string | null = null;
  let jobTitle: string | null = null;
  const futureUnitId = (future as any)?.unitId;

  const bestDept = await findDepartmentByThreeLayers(newDepartmentId, futureDept);
  if (bestDept) {
    departmentId = bestDept.id;
    unitId = bestDept.unitId;
  }
  console.log('[CHANGE_ROLE] Buscando depto:', futureDept || newDepartmentId || '(vazio)', '→ encontrado:', bestDept?.name ?? 'NENHUM');

  const bestRole = await findRoleByThreeLayers(newRoleId, futureRole, departmentId);
  if (bestRole) {
    roleId = bestRole.id;
    jobTitle = bestRole.name;
    if (!departmentId) {
      departmentId = bestRole.departmentId;
      unitId = bestRole.unitId;
    }
  }
  console.log('[CHANGE_ROLE] Buscando cargo:', futureRole || newRoleId || '(vazio)', '→ encontrado:', bestRole?.name ?? 'NENHUM');

  if (futureUnitId && !unitId) unitId = futureUnitId;

  if (!roleId || !departmentId) {
    const cargoBuscado = futureRole || newRoleId || '(não informado)';
    const deptoBuscado = futureDept || newDepartmentId || '(não informado)';
    console.warn(`[CHANGE_ROLE] Chamado ${requestId}: cargo ou departamento não encontrados. Cargo buscado: "${cargoBuscado}". Depto buscado: "${deptoBuscado}".`);
    const { registrarMudanca } = await import('../lib/auditLog');
    await registrarMudanca({
      tipo: 'ERRO_CHANGE_ROLE',
      entidadeTipo: 'Solicitacao',
      entidadeId: requestId,
      descricao: `Automação CHANGE_ROLE: cargo ou departamento não encontrados. Cargo buscado: ${cargoBuscado}. Depto buscado: ${deptoBuscado}. Ação necessária: revisar manualmente.`,
      dadosDepois: { cargoBuscado, deptoBuscado, roleId, departmentId }
    }).catch((e) => console.error('[CHANGE_ROLE] HistoricoMudanca ERRO_CHANGE_ROLE:', e));
    try {
      const { notificarLuanErroChangeRole } = await import('../services/slackService');
      await notificarLuanErroChangeRole(requestId, String(cargoBuscado), String(deptoBuscado));
    } catch (notifErr) {
      console.error('[CHANGE_ROLE] Falha ao notificar SLACK_ID_LUAN:', notifErr);
    }
    return { success: false };
  }
  console.log('[CHANGE_ROLE] Colaborador identificado userId=', targetUser.id, '; novo roleId=', roleId, 'departmentId=', departmentId);
  if (!jobTitle && futureRole) jobTitle = futureRole;

  const oldUser = await prisma.user.findUnique({
    where: { id: targetUser.id },
    select: { roleId: true, jobTitle: true, departmentId: true, unitId: true, managerId: true }
  });
  const dadosAntes = {
    roleId: oldUser?.roleId,
    jobTitle: oldUser?.jobTitle,
    departmentId: oldUser?.departmentId,
    unitId: oldUser?.unitId
  };

  // KBS anterior e novo para notificação aos owners (após atualizar o usuário)
  const [oldRole, newRole] = await Promise.all([
    oldUser?.roleId ? prisma.role.findUnique({ where: { id: oldUser.roleId }, include: { kitItems: true, department: true } }) : null,
    prisma.role.findUnique({ where: { id: roleId! }, include: { kitItems: true, department: true } })
  ]);
  const kbsAnterior: KBSItem[] = (oldRole?.kitItems ?? []).map((k) => ({ toolName: k.toolName, accessLevelDesc: k.accessLevelDesc }));
  const kbsNovo: KBSItem[] = (newRole?.kitItems ?? []).map((k) => ({ toolName: k.toolName, accessLevelDesc: k.accessLevelDesc }));
  const cargoAnterior = oldRole?.name ?? (details.current as any)?.role ?? '';
  const deptAnterior = oldRole?.department?.name ?? (details.current as any)?.dept ?? '';
  const cargoNovo = jobTitle ?? '';
  const deptNovo = newRole?.department?.name ?? '';
  const dataAcao = request.actionDate instanceof Date ? request.actionDate.toISOString().slice(0, 10) : (typeof request.actionDate === 'string' ? request.actionDate : '') || new Date().toISOString().slice(0, 10);

  const deptChanged = departmentId !== oldUser?.departmentId;
  let newManagerId: string | null | undefined = undefined;
  if (deptChanged && departmentId) {
    let lider = await prisma.user.findFirst({
      where: {
        departmentId,
        isActive: true,
        jobTitle: { contains: 'Líder', mode: 'insensitive' }
      },
      select: { id: true }
    });
    if (!lider) {
      const rolesInDept = await prisma.role.findMany({
        where: { departmentId, code: { not: null } },
        select: { id: true, code: true }
      });
      const roleKbs1 = rolesInDept.find(r => r.code && /^KBS-[A-Z]{2}-1$/i.test(r.code));
      if (roleKbs1) {
        lider = await prisma.user.findFirst({
          where: { roleId: roleKbs1.id, departmentId, isActive: true },
          select: { id: true }
        });
      }
    }
    if (lider) newManagerId = lider.id;
    else console.warn(`[Automação CHANGE_ROLE] Chamado ${requestId}: não foi possível identificar líder do departamento ${departmentId}. Gestor mantido.`);
  }

  const updateData: Record<string, unknown> = {
    roleId,
    departmentId,
    unitId,
    jobTitle: jobTitle || undefined
  };
  if (newManagerId !== undefined) updateData.managerId = newManagerId;

  await prisma.user.update({
    where: { id: targetUser.id },
    data: updateData
  });

  const { registrarMudanca } = await import('../lib/auditLog');
  await registrarMudanca({
    tipo: 'USER_UPDATED',
    entidadeTipo: 'User',
    entidadeId: targetUser.id,
    descricao: `Cargo alterado via chamado #${requestId} aprovado por [SI]. Colaborador: ${targetUser.name}`,
    dadosAntes,
    dadosDepois: { roleId, departmentId, unitId, jobTitle },
    autorId: approverId ?? undefined
  });

  try {
    const { propagateLeaderOnRoleChange, handleLeaderRoleChange } = await import('../services/leadershipPropagationService');
    await propagateLeaderOnRoleChange(targetUser.id, roleId!, approverId ?? undefined);
    await handleLeaderRoleChange(targetUser.id, oldUser?.roleId ?? null, roleId, approverId ?? undefined);
  } catch (leadErr) {
    console.error('[CHANGE_ROLE] Leadership propagation:', leadErr);
  }

  console.log(`[Automação CHANGE_ROLE] Usuário ${targetUser.name} (${targetUser.id}) atualizado: cargo/departamento aplicados (chamado ${requestId}).`);

  // Sincronizar Catálogo (Access): remover acessos do KBS anterior que não estão no novo; adicionar/atualizar acessos do KBS novo
  try {
    await syncAccessAfterRoleChange(targetUser.id, kbsAnterior, kbsNovo);
    try {
      const { firePostSlackAcessosChannel } = await import('../services/slackService');
      firePostSlackAcessosChannel(`🔧 KBS atualizado para novo cargo | Ticket: #${requestId.slice(0, 8)}`);
    } catch (_) {}
  } catch (syncErr) {
    console.error('[Automação CHANGE_ROLE] Falha ao sincronizar Access com Catálogo (não bloqueia):', syncErr);
  }

  return {
    success: true,
    collaboratorName: targetUser.name,
    userEmail: targetUser.email,
    notifPayload: {
      colaborador: { nome: targetUser.name, cargoAnterior, deptAnterior, cargoNovo, deptNovo },
      kbsAnterior,
      kbsNovo,
      dataAcao
    }
  };
}

// ============================================================
// AUXILIAR: Encontrar Aprovador da Ferramenta (Lógica Avançada)
// ============================================================
async function findToolApprover(toolName: string, requesterId: string) {
  const tool = await prisma.tool.findFirst({
    where: {
      OR: [
        { name: { contains: toolName, mode: 'insensitive' } },
        { name: { equals: toolName } }
      ]
    },
    include: { owner: true, subOwner: true }
  });

  if (!tool) return { approverId: null, role: 'SI_ANALYST', status: 'PENDENTE_SI' };

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    include: { manager: true }
  });

  const managerId = requester?.managerId;

  // REGRA 1: Gestor Imediato aprova primeiro
  if (managerId) {
    // SE o Gestor Imediato NÃO for o Owner, ele aprova
    if (tool.ownerId !== managerId) {
      return { approverId: managerId, role: 'MANAGER', status: 'PENDENTE_GESTOR' };
    }

    // REGRA 2: Se Gestor == Owner, tenta Sub-owner
    if (tool.subOwnerId && tool.subOwnerId !== managerId) {
      return { approverId: tool.subOwnerId, role: 'TOOL_SUB_OWNER', status: 'PENDENTE_SUB_OWNER' };
    }
  }

  // REGRA 3: Se não tem gestor, ou gestor é owner e não tem sub-owner (ou sub-owner também é gestor), vai para SI
  return { approverId: null, role: 'SI_ANALYST', status: 'PENDENTE_SI' };
}

// ============================================================
// 1. CRIAR SOLICITAÇÃO (POST)
// ============================================================
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    const { requesterId, type, details, justification, isExtraordinary } = req.body;
    const safeRequesterId = String(requesterId);
    const safeType = String(type);

    let detailsObj: any = {};
    let detailsString = '';
    try {
      if (typeof details === 'string') {
        detailsObj = JSON.parse(details);
        detailsString = details;
      } else {
        detailsObj = details;
        detailsString = JSON.stringify(details);
      }
    } catch (e) { detailsString = '{}'; }

    let approverId = null;
    let currentApproverRole = 'MANAGER';
    let status = 'PENDENTE_GESTOR';
    const toolNameAex = detailsObj?.tool || detailsObj?.toolName;
    const accessLevelAex = detailsObj?.target || detailsObj?.targetValue;

    // ROTA A: ACESSO EXTRAORDINÁRIO — sempre 2 etapas: Owner aprova → SI aprova
    if (isExtraordinary || ['ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'].includes(safeType)) {
      status = 'PENDING_OWNER';
      currentApproverRole = 'TOOL_OWNER';
      approverId = null;
    }
    // ROTA A2: Kit padrão / alteração (não extraordinário)
    else if (['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(safeType)) {
      status = 'PENDENTE_SI';
      currentApproverRole = 'SI_ANALYST';
      approverId = null;
    }
    // ROTA B: GESTÃO DE PESSOAS / DEPUTY — gestor aprova; exceção: Renata Czapiewski Silva vai direto para SI
    // Para CHANGE_ROLE: ao criar o chamado, enviar details.newRoleId e details.newDepartmentId (ou future.roleId / future.departmentId) quando disponíveis, para priorizar busca por ID na automação.
    else if (['DEPUTY_DESIGNATION', 'CHANGE_ROLE', 'HIRING', 'FIRING', 'PROMOCAO', 'DEMISSAO', 'ADMISSAO'].includes(safeType)) {
      const requester = await prisma.user.findUnique({
        where: { id: safeRequesterId },
        include: { manager: true }
      });
      if (isRhBypassRequester(requester?.name)) {
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
        approverId = null;
        detailsObj = { ...detailsObj, bypassGestor: true };
        detailsString = JSON.stringify(detailsObj);
      } else if (requester?.managerId) {
        approverId = requester.managerId;
        status = 'PENDENTE_GESTOR';
        currentApproverRole = 'MANAGER';
      } else {
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
        approverId = null;
      }
    }
    // ROTA C: GENÉRICA
    else {
      const requester = await prisma.user.findUnique({
        where: { id: safeRequesterId },
        include: { manager: true }
      });
      if (requester?.manager) {
        approverId = requester.manager.id;
        status = 'PENDENTE_GESTOR';
        currentApproverRole = 'MANAGER';
      } else {
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }

    const newRequest = await prisma.request.create({
      data: {
        requesterId: safeRequesterId,
        type: safeType,
        details: detailsString,
        justification: justification ? String(justification) : null,
        status,
        currentApproverRole,
        approverId,
        assigneeId: isInfraTicketType(safeType) ? null : safeRequesterId,
        isExtraordinary: Boolean(isExtraordinary),
        extraordinaryDuration: detailsObj.duration ? parseInt(detailsObj.duration) : null,
        extraordinaryUnit: detailsObj.unit || null,
        ...(toolNameAex && { toolName: String(toolNameAex) }),
        ...(accessLevelAex && { accessLevel: String(accessLevelAex) })
      }
    });

    const requesterForAudit = await prisma.user.findUnique({ where: { id: safeRequesterId }, select: { name: true } });
    const { registrarMudanca } = await import('../lib/auditLog');
    if (!isInfraTicketType(safeType)) {
      await registrarMudanca({
        tipo: 'TICKET_ASSIGNED',
        entidadeTipo: 'Request',
        entidadeId: newRequest.id,
        descricao: `Responsável atribuído: ${requesterForAudit?.name ?? '—'}`,
        dadosAntes: { responsavel: null },
        dadosDepois: { responsavel: requesterForAudit?.name ?? '—' },
        autorId: safeRequesterId,
      }).catch(() => {});
    }
    await registrarMudanca({
      tipo: 'TICKET_CREATED',
      entidadeTipo: 'Request',
      entidadeId: newRequest.id,
      descricao: `Chamado criado: ${detailsString.slice(0, 80)}${detailsString.length > 80 ? '...' : ''}`,
      dadosDepois: {
        categoria: safeType,
        assunto: detailsString.slice(0, 200),
        solicitante: requesterForAudit?.name ?? safeRequesterId,
      },
      autorId: safeRequesterId,
    }).catch(() => {});

    if ((isExtraordinary || ['ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'].includes(safeType)) && toolNameAex) {
      const period = detailsObj.accessPeriodRaw || (detailsObj.duration != null && detailsObj.unit ? `${detailsObj.duration} ${detailsObj.unit}` : null) || null;
      await registrarMudanca({
        tipo: 'AEX_CREATED',
        entidadeTipo: 'Request',
        entidadeId: newRequest.id,
        descricao: 'Solicitação de Acesso Extraordinário criada',
        dadosDepois: { ferramenta: toolNameAex, nivel: accessLevelAex, periodo: period || undefined, justificativa: justification || undefined },
        autorId: safeRequesterId
      });
    }

    const { notifyTicketEvent } = await import('../services/ticketEventService');
    console.log('[Chamado] Tentando enviar notificação Slack para chamado:', newRequest.id, 'tipo: TICKET_CREATED');
    try {
      await notifyTicketEvent(newRequest.id, 'TICKET_CREATED', {});
      if (newRequest.assigneeId) {
        await notifyTicketEvent(newRequest.id, 'ASSIGNEE_CHANGED', { assigneeId: newRequest.assigneeId });
      }
      console.log('[Chamado] Slack enviado com sucesso para chamado:', newRequest.id);
    } catch (err) {
      console.error('[Chamado] Erro ao enviar Slack:', err);
    }

    console.log('[Chamado] Tentando enviar notificação SI (novo ticket) para chamado:', newRequest.id, 'tipo:', newRequest.type);
    try {
      const { notificarSINovoTicket } = await import('../services/slackService');
      await notificarSINovoTicket({
        id: newRequest.id,
        type: newRequest.type,
        status: newRequest.status,
        justification: newRequest.justification,
        details: newRequest.details,
        requesterId: newRequest.requesterId,
        createdAt: newRequest.createdAt
      });
      console.log('[Chamado] Slack SI enviado com sucesso para chamado:', newRequest.id);
    } catch (notifErr) {
      console.error('[Chamado] Erro ao enviar Slack SI:', notifErr);
    }

    if ((isExtraordinary || ['ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'].includes(safeType)) && toolNameAex) {
      const requester = await prisma.user.findUnique({ where: { id: safeRequesterId }, select: { name: true, email: true } });
      const { getSlackApp } = await import('../services/slackService');
      const { sendAexCreationDMs, sendAexRequesterCreatedDM } = await import('../services/aexOwnerService');
      const app = getSlackApp();
      if (app?.client) {
        const dur = detailsObj.duration != null ? String(detailsObj.duration) : null;
        const unit = detailsObj.unit || '';
        const period = detailsObj.accessPeriodRaw || (dur && unit ? `${dur} ${unit}` : null) || '—';
        sendAexCreationDMs(app.client, newRequest.id, String(toolNameAex), String(accessLevelAex || '—'), requester?.name || 'Solicitante', String(justification || ''), { period }).catch((err: unknown) => console.error('[AEX] Erro ao enviar DMs:', err));
        if (requester?.email) {
          try {
            const lookup = await app.client.users.lookupByEmail({ email: requester.email });
            if (lookup.user?.id) {
              await sendAexRequesterCreatedDM(app.client, lookup.user.id, newRequest.id, String(toolNameAex), String(accessLevelAex || '—'));
            }
          } catch (_) {}
        }
      }
    }

    return res.status(201).json(newRequest);
  } catch (error) {
    console.error('SOLICITACOES ERROR (createSolicitacao):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};

// ============================================================
// 2. LISTAR SOLICITAÇÕES (GET) — com filtros para Gestão de Chamados
// ============================================================
export const getSolicitacoes = async (req: Request, res: Response) => {
  try {
    const {
      status,
      assigneeId,
      requester: requesterSearch,
      startDate,
      endDate,
      category
    } = req.query as Record<string, string | undefined>;

    const where: any = {};
    const andClauses: any[] = [];

    // Privacidade VIEWER: retornar apenas chamados onde o usuário é solicitante, responsável ou aprovador
    const userId = (req.headers['x-user-id'] as string)?.trim();
    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { systemProfile: true }
      });
      if (currentUser?.systemProfile === 'VIEWER') {
        andClauses.push({
          OR: [
            { requesterId: userId },
            { assigneeId: userId },
            { approverId: userId }
          ]
        });
      }
    }

    if (status && status !== 'ALL') {
      if (status === 'PENDENTE') {
        andClauses.push({
          OR: [
            { status: { startsWith: 'PENDENTE' } },
            { status: 'PENDING_OWNER' },
            { status: 'PENDING_SI' }
          ]
        });
      } else if (status === STATUS_FILTER_VALUE_PENDING_ALL) {
        andClauses.push({ status: { in: [...CHAMADO_PENDING_ALL_STATUSES] } });
      } else if (status === 'PENDENTE_SI') {
        andClauses.push({ status: { in: ['PENDENTE_SI', 'PENDING_SI'] } });
      } else if (status === 'RESOLVIDO') {
        andClauses.push({ status: { in: ['RESOLVIDO', 'RESOLVED'] } });
      } else {
        where.status = status;
      }
    }

    if (andClauses.length > 0) where.AND = andClauses;

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (requesterSearch && requesterSearch.trim()) {
      const term = requesterSearch.trim();
      where.requester = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } }
        ]
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (category && category !== 'ALL' && category !== 'Todos') {
      const infraTypes = ['INFRA_SUPPORT', 'INFRA'];
      const accessTypes = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
      const peopleTypes = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
      if (category === 'Infra') where.type = { in: infraTypes };
      else if (category === 'Acessos') where.type = { in: accessTypes };
      else if (category === 'Pessoas') where.type = { in: peopleTypes };
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, departmentRef: { select: { id: true, name: true } } } },
        approver: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } }
      }
    });
    return res.json(requests);
  } catch (error) {
    console.error('SOLICITACOES ERROR (getSolicitacoes):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// ============================================================
// 2b. MEUS CHAMADOS (Viewer) — apenas onde o usuário é solicitante
// ============================================================
export const getMyTickets = async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId?.trim()) return res.status(401).json({ error: 'Usuário não identificado. Envie o header x-user-id.' });

  try {
    const { status, startDate, endDate, category } = req.query as Record<string, string | undefined>;
    const where: any = { requesterId: userId.trim() };

    if (status && status !== 'ALL') {
      if (status === 'PENDENTE') {
        where.OR = [
          { status: { startsWith: 'PENDENTE' } },
          { status: 'PENDING_OWNER' },
          { status: 'PENDING_SI' }
        ];
      } else if (status === STATUS_FILTER_VALUE_PENDING_ALL) {
        where.status = { in: [...CHAMADO_PENDING_ALL_STATUSES] };
      } else if (status === 'PENDENTE_SI') {
        where.status = { in: ['PENDENTE_SI', 'PENDING_SI'] };
      } else if (status === 'RESOLVIDO') {
        where.status = { in: ['RESOLVIDO', 'RESOLVED'] };
      } else {
        where.status = status;
      }
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (category && category !== 'ALL' && category !== 'Todos') {
      const infraTypes = ['INFRA_SUPPORT', 'INFRA'];
      const accessTypes = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
      const peopleTypes = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
      if (category === 'Infra') where.type = { in: infraTypes };
      else if (category === 'Acessos') where.type = { in: accessTypes };
      else if (category === 'Pessoas') where.type = { in: peopleTypes };
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, departmentRef: { select: { id: true, name: true } } } },
        approver: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } }
      }
    });
    return res.json(requests);
  } catch (error) {
    console.error('SOLICITACOES ERROR (getMyTickets):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao buscar seus chamados' });
  }
};

// ============================================================
// 3. ATUALIZAR / APROVAR (PATCH) - CÉREBRO DA GOVERNANÇA
// ============================================================
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminNote, approverId } = req.body;

  try {
    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true, assignee: { select: { name: true } } }
    });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    const userIdHeader = (req.headers['x-user-id'] as string)?.trim();
    if (isInfraTicketType(request.type)) {
      const actorId = (approverId && String(approverId).trim()) || userIdHeader;
      if (!actorId) return res.status(401).json({ error: 'Usuário não identificado.' });
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { departmentId: true, roleId: true, systemProfile: true },
      });
      if (!actor || !isInboxMember(actor, request)) {
        return res.status(403).json({ error: 'Apenas a equipe da inbox responsável pode alterar este chamado.' });
      }
    }

    const safeStatus = String(status || '').toUpperCase();

    // Ação "Pendente": apenas atualiza status para PENDENTE_GESTOR (não aprova nem reprova)
    if (safeStatus === 'PENDENTE_GESTOR' || (safeStatus.startsWith('PENDENTE') && safeStatus !== 'PENDENTE_SI' && safeStatus !== 'PENDENTE_OWNER')) {
      const pendingStatus = safeStatus === 'PENDENTE_GESTOR' ? 'PENDENTE_GESTOR' : safeStatus;
      const updated = await prisma.request.update({
        where: { id },
        data: {
          status: pendingStatus,
          adminNote: adminNote || null,
          approverId: approverId || null,
          updatedAt: new Date()
        }
      });
      return res.json(updated);
    }

    const action = safeStatus === 'APROVAR' ? 'APROVADO' : 'REPROVADO';

    // REGRA DE NEGÓCIO: solicitante não pode aprovar/reprovar o próprio chamado (exceto chamados Infra)
    if (!isInfraTicketType(request.type) && approverId === request.requesterId) {
      return res.status(403).json({ error: 'O solicitante não pode aprovar ou reprovar o próprio chamado.' });
    }

    // REGRA BYPASS RH: só Luan, Allan ou Vladimir podem aprovar solicitações com bypassGestor (Renata)
    let detailsParsed: any = {};
    try {
      detailsParsed = JSON.parse(request.details || '{}');
    } catch (_) {}
    if (detailsParsed.bypassGestor === true && request.status === 'PENDENTE_SI' && SI_BYPASS_APPROVER_EMAILS.length > 0) {
      const allowedApprovers = await prisma.user.findMany({
        where: { email: { in: SI_BYPASS_APPROVER_EMAILS }, isActive: true },
        select: { id: true }
      });
      const allowedIds = new Set(allowedApprovers.map((u) => u.id));
      if (!allowedIds.has(approverId)) {
        return res.status(403).json({
          error: 'Apenas aprovadores autorizados de SI (Luan Matheus, Allan Von Stain ou Vladimir Sesar) podem aprovar esta solicitação.'
        });
      }
    }

    // AEX: controle de fechamento — ambas as partes devem aprovar, e quem aprovou não pode fechar
    const isAex = request.type === 'ACCESS_TOOL_EXTRA' || (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) && request.isExtraordinary);
    const isVpn = request.type === 'VPN_ACCESS';
    const ownerApprovedBy = (request as { ownerApprovedBy?: string }).ownerApprovedBy;
    const siApprovedBy = (request as { siApprovedBy?: string }).siApprovedBy;
    const isAexPendingSI = request.status === 'PENDING_SI' && isAex;

    if (
      (action === 'APROVADO' || action === 'REPROVADO') &&
      !isVpn &&
      request.status === 'PENDING_SI' &&
      (isAexPendingSI || request.type === 'HIRING')
    ) {
      return res.status(403).json({
        error: 'USE_SLACK_ACTION',
        message: 'Esta etapa só pode ser concluída pelos botões na DM do Slack.'
      });
    }

    if (action === 'APROVADO' && (isAex || isVpn)) {
      if (isVpn && !ownerApprovedBy) {
        return res.status(403).json({
          error: 'PARTIAL_APPROVAL',
          message: 'Este chamado requer aprovação do líder direto e do time de SI. Aguardando aprovação pendente.'
        });
      }
      if (isAex && !ownerApprovedBy) {
        return res.status(403).json({
          error: 'PARTIAL_APPROVAL',
          message: 'Este chamado requer aprovação das duas partes. Aguardando aprovação pendente para encerrar.'
        });
      }
      // Conflito SI/Líder: bloquear apenas quem já aprovou como líder (ownerApprovedBy = Slack ID), não todos do SI
      if (isVpn && request.status === 'PENDING_SI' && ownerApprovedBy && approverId) {
        try {
          const approverUser = await prisma.user.findUnique({
            where: { id: approverId },
            select: { email: true }
          });
          if (approverUser?.email) {
            const { getSlackApp } = await import('../services/slackService');
            const app = getSlackApp();
            if (app?.client) {
              const lookup = await app.client.users.lookupByEmail({ email: approverUser.email });
              const approverSlackId = lookup.user?.id;
              if (approverSlackId === ownerApprovedBy) {
                return res.status(403).json({
                  error: 'SAME_APPROVER',
                  message: 'Você já aprovou este chamado como líder direto e não pode aprovar também pelo time de SI.'
                });
              }
            }
          }
        } catch (e) {
          console.error('[AEX/VPN] Erro ao verificar ownerApprovedBy:', e);
        }
      }
      if (isAexPendingSI && approverId && ownerApprovedBy) {
        try {
          const approverUser = await prisma.user.findUnique({
            where: { id: approverId },
            select: { email: true }
          });
          if (approverUser?.email) {
            const { getSlackApp } = await import('../services/slackService');
            const app = getSlackApp();
            if (app?.client) {
              const lookup = await app.client.users.lookupByEmail({ email: approverUser.email });
              const approverSlackId = lookup.user?.id;
              if (approverSlackId === ownerApprovedBy) {
                return res.status(403).json({
                  error: 'SAME_APPROVER',
                  message: 'Você já aprovou este chamado na etapa anterior. O fechamento deve ser feito pela outra parte.'
                });
              }
            }
          }
        } catch (e) {
          console.error('[AEX] Erro ao verificar ownerApprovedBy:', e);
        }
      }
    }

    // Se for reprovado, encerra imediatamente
    if (action === 'REPROVADO') {
      const updated = await prisma.request.update({
        where: { id },
        data: {
          status: 'REPROVADO',
          adminNote: adminNote || 'Solicitação reprovada.',
          approverId: approverId,
          assigneeId: approverId || undefined,
          updatedAt: new Date()
        }
      });

      if (approverId && request.assigneeId !== approverId) {
        const { registrarMudanca } = await import('../lib/auditLog');
        const { notifyTicketEvent } = await import('../services/ticketEventService');
        const newAssignee = await prisma.user.findUnique({ where: { id: approverId }, select: { name: true } });
        await registrarMudanca({
          tipo: 'TICKET_ASSIGNED',
          entidadeTipo: 'Request',
          entidadeId: id,
          descricao: `Responsável atribuído: ${newAssignee?.name ?? '—'}`,
          dadosAntes: { responsavel: (request as { assignee?: { name: string } }).assignee?.name ?? null },
          dadosDepois: { responsavel: newAssignee?.name ?? null },
          autorId: approverId,
        }).catch(() => {});
        try {
          await notifyTicketEvent(id, 'ASSIGNEE_CHANGED', { assigneeId: approverId });
        } catch (_) {}
      }

      {
        const { firePostSlackAcessosChannel } = await import('../services/slackService');
        const ticketShort = id.slice(0, 8);
        if (OFFBOARDING_REQUEST_TYPES.includes(request.type)) {
          if (request.status === 'PENDENTE_GESTOR') {
            firePostSlackAcessosChannel(`❌ Offboarding recusado por gestor | Ticket: #${ticketShort}`);
          } else if (request.status === 'PENDENTE_SI') {
            firePostSlackAcessosChannel(`❌ Offboarding recusado por SI | Ticket: #${ticketShort}`);
          }
        }
        if (request.type === 'CHANGE_ROLE') {
          let rejectApprover = '—';
          if (approverId) {
            const u = await prisma.user.findUnique({ where: { id: approverId }, select: { name: true } });
            if (u?.name) rejectApprover = u.name;
          }
          firePostSlackAcessosChannel(`❌ Movimentação recusada por ${rejectApprover} | Ticket: #${ticketShort}`);
        }
      }

      if (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) || request.isExtraordinary) {
        const { registrarMudanca } = await import('../lib/auditLog');
        await registrarMudanca({
          tipo: 'AEX_SI_REJECTED',
          entidadeTipo: 'Request',
          entidadeId: id,
          descricao: 'Time de SI reprovou a solicitação AEX',
          dadosAntes: { status: request.status },
          dadosDepois: { status: 'REJECTED', siRejectedBy: approverId },
          autorId: approverId ?? undefined
        });
      }
      if (request.type === 'VPN_ACCESS' && request.requester?.email) {
        try {
          const { getSlackApp, sendDmToSlackUser } = await import('../services/slackService');
          const app = getSlackApp();
          if (app?.client) {
            const lookup = await app.client.users.lookupByEmail({ email: request.requester.email });
            if (lookup.user?.id) {
              await sendDmToSlackUser(app.client, lookup.user.id, '❌ Sua solicitação de Acesso a VPN foi recusada pelo time de SI.');
            }
          }
        } catch (e) {
          console.error('[VPN] Erro ao notificar rejeição SI:', e);
        }
      }

      if (request.requester.email) {
        const toolNameAex = (request as { toolName?: string }).toolName || (() => { try { const d = JSON.parse(request.details || '{}'); return d.tool || d.toolName || '—'; } catch { return '—'; } })();
        if (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) || request.isExtraordinary) {
          try {
            const { getSlackApp } = await import('../services/slackService');
            const { sendAexRejectedBySIDM } = await import('../services/aexOwnerService');
            const app = getSlackApp();
            if (app?.client) {
              const lookup = await app.client.users.lookupByEmail({ email: request.requester.email });
              if (lookup.user?.id) {
                await sendAexRejectedBySIDM(app.client, lookup.user.id, id, toolNameAex);
              }
            }
          } catch (e) {
            console.error('[AEX] Erro ao notificar rejeição SI:', e);
            sendSlackNotification(request.requester.email, 'REPROVADO', adminNote || 'Reprovado.', request.type, undefined, request.details);
          }
        } else {
          let ownerName: string | undefined;
          const ACCESS_TYPES = ['ACCESS_CHANGE', 'ACCESS_TOOL', 'ACESSO_FERRAMENTA'];
          if (ACCESS_TYPES.includes(request.type)) {
            try {
              const det = JSON.parse(request.details || '{}');
              const toolName = det.tool || det.toolName || (det.info ? det.info.split(': ')[1] : null);
              if (toolName) {
                const tool = await prisma.tool.findFirst({
                  where: { name: { contains: toolName, mode: 'insensitive' } },
                  include: { owner: true, subOwner: true }
                });
                ownerName = tool?.owner?.name || tool?.subOwner?.name || undefined;
              }
            } catch (_) { }
          }
          sendSlackNotification(request.requester.email, 'REPROVADO', adminNote || 'Reprovado pelo administrador.', request.type, ownerName, request.details);
        }
      }
      return res.json(updated);
    }

    // LÓGICA DE TRANSIÇÃO (SI -> OWNER)
    if (request.status === 'PENDENTE_SI') {
      // 1. Tentar encontrar a ferramenta e o owner
      const currentDetails = JSON.parse(request.details || '{}');
      const toolName = currentDetails.tool || currentDetails.toolName || (currentDetails.info ? currentDetails.info.split(': ')[1] : null);

      if (toolName) {
        const tool = await prisma.tool.findFirst({
          where: {
            OR: [
              { name: { contains: toolName, mode: 'insensitive' } },
              { acronym: { equals: toolName, mode: 'insensitive' } }
            ]
          },
          include: { owner: true, subOwner: true }
        });

        // Se encontrou a ferramenta e o owner não é o requerente
        if (tool) {
          let nextApproverId = null;
          let nextRole = null;

          if (tool.ownerId && tool.ownerId !== request.requesterId) {
            nextApproverId = tool.ownerId;
            nextRole = 'TOOL_OWNER';
          } else if (tool.subOwnerId && tool.subOwnerId !== request.requesterId) {
            nextApproverId = tool.subOwnerId;
            nextRole = 'TOOL_SUB_OWNER';
          }

          if (nextApproverId) {
            const updated = await prisma.request.update({
              where: { id },
              data: {
                status: 'PENDENTE_OWNER',
                currentApproverRole: nextRole,
                approverId: nextApproverId,
                adminNote: `Aprovado por SI. Aguardando aprovação do Owner (${tool.owner?.name || tool.subOwner?.name}).`,
                updatedAt: new Date()
              }
            });
            return res.json(updated);
          }
        }
      }
    }

    // Obter Slack ID do aprovador (SI) antes de qualquer uso — evita TDZ
    let siApprovedBySlackForVpn: string | undefined;
    if (approverId && (isAexPendingSI || isVpn)) {
      try {
        const approverUser = await prisma.user.findUnique({
          where: { id: approverId },
          select: { email: true }
        });
        if (approverUser?.email) {
          const { getSlackApp } = await import('../services/slackService');
          const app = getSlackApp();
          if (app?.client) {
            const lookup = await app.client.users.lookupByEmail({ email: approverUser.email });
            siApprovedBySlackForVpn = lookup.user?.id ?? undefined;
          }
        }
      } catch (_) {}
    }

    // APROVAÇÃO FINAL — para AEX, registrar siApprovedBy
    const updatedDetails = {
      ...JSON.parse(request.details || '{}'),
      adminNote: adminNote || 'Aprovação final concedida.'
    };

    if (isAex && isAexPendingSI) {
      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'AEX_SI_APPROVED',
        entidadeTipo: 'Request',
        entidadeId: id,
        descricao: 'Time de SI aprovou a solicitação AEX',
        dadosAntes: { status: 'PENDING_SI' },
        dadosDepois: { status: 'APPROVED', siApprovedBy: siApprovedBySlackForVpn },
        autorId: approverId ?? undefined
      });
    }
    if (isVpn && siApprovedBySlackForVpn) {
      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'VPN_SI_APPROVED',
        entidadeTipo: 'Request',
        entidadeId: id,
        descricao: 'Time de SI aprovou solicitação de Acesso a VPN',
        dadosDepois: { siApprovedBy: siApprovedBySlackForVpn },
        autorId: approverId ?? undefined
      });
    }

    const updateData: any = {
      status: 'APROVADO',
      adminNote: adminNote || 'Aprovado.',
      approverId: approverId,
      details: JSON.stringify(updatedDetails),
      updatedAt: new Date()
    };
    if (approverId) updateData.assigneeId = approverId;
    if (isAex && isAexPendingSI && siApprovedBySlackForVpn) {
      updateData.siApprovedBy = siApprovedBySlackForVpn;
      updateData.siApprovedAt = new Date();
    }
    if (isVpn) {
      updateData.siApprovedBy = siApprovedBySlackForVpn;
      updateData.siApprovedAt = new Date();
      updateData.status = undefined; // mantém PENDING_SI; RESOLVED será setado em completeVpnAccess
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData
    });

    if (action === 'APROVADO' && updateData.status === 'APROVADO') {
      const { firePostSlackAcessosChannel } = await import('../services/slackService');
      const ticketShort = id.slice(0, 8);
      let approverName = '—';
      if (approverId) {
        const u = await prisma.user.findUnique({ where: { id: approverId }, select: { name: true } });
        if (u?.name) approverName = u.name;
      }
      if (OFFBOARDING_REQUEST_TYPES.includes(request.type) && (request.status === 'PENDENTE_GESTOR' || request.status === 'PENDENTE_SI')) {
        if (request.status === 'PENDENTE_GESTOR') {
          firePostSlackAcessosChannel(`✅ Offboarding aprovado pelo gestor ${approverName} | Ticket: #${ticketShort}`);
        } else {
          firePostSlackAcessosChannel(`✅ Offboarding aprovado pelo SI (${approverName}) | Ticket: #${ticketShort}`);
        }
      }
      if (request.type === 'CHANGE_ROLE' && (request.status === 'PENDENTE_GESTOR' || request.status === 'PENDENTE_SI')) {
        firePostSlackAcessosChannel(`✅ Movimentação aprovada por ${approverName} | Ticket: #${ticketShort}`);
      }
    }

    if (approverId && request.assigneeId !== approverId) {
      const { registrarMudanca } = await import('../lib/auditLog');
      const { notifyTicketEvent } = await import('../services/ticketEventService');
      const newAssignee = await prisma.user.findUnique({ where: { id: approverId }, select: { name: true } });
      await registrarMudanca({
        tipo: 'TICKET_ASSIGNED',
        entidadeTipo: 'Request',
        entidadeId: id,
        descricao: `Responsável atribuído: ${newAssignee?.name ?? '—'}`,
        dadosAntes: { responsavel: request.assignee?.name ?? null },
        dadosDepois: { responsavel: newAssignee?.name ?? null },
        autorId: approverId,
      }).catch(() => {});
      try {
        await notifyTicketEvent(id, 'ASSIGNEE_CHANGED', { assigneeId: approverId });
      } catch (_) {}
    }

    // VPN: se líder já aprovou, concluir (JumpCloud + RESOLVED). Senão, apenas notificar e encerrar resposta.
    if (isVpn && action === 'APROVADO') {
      const reqWithOwner = updatedRequest as { ownerApprovedBy?: string };
      if (reqWithOwner.ownerApprovedBy) {
        try {
          const { getSystemUserIdByEmail, addUserToVpnGroup, getVpnGroupIds } = await import('../services/jumpcloudService');
          const { notificarVpnConcedido, notificarVpnFalhaInserção } = await import('../services/slackService');
          const detailsObj = JSON.parse(updatedRequest.details || '{}');
          const vpnLevel = (detailsObj.vpnLevel || 'VPN - Default').trim();
          const assetNumber = detailsObj.assetNumber || '—';
          const operatingSystem = detailsObj.operatingSystem || '—';
          const requesterEmail = request.requester?.email;
          if (!requesterEmail) {
            return res.json(updatedRequest);
          }
          const jcUserId = await getSystemUserIdByEmail(requesterEmail);
          const vpnGroupIds = getVpnGroupIds();
          const groupId = vpnGroupIds[vpnLevel];
          console.log('[VPN] GROUP IDS:', {
            default: process.env.VPN_GROUP_DEFAULT_ID,
            admin: process.env.VPN_GROUP_ADMIN_ID,
            vpnLevel: detailsObj.vpnLevel,
            resolvedGroupId: vpnGroupIds[vpnLevel]
          });
          if (!jcUserId || !groupId) {
            const hasDefaultId = !!process.env.VPN_GROUP_DEFAULT_ID?.trim();
            const hasAdminId = !!process.env.VPN_GROUP_ADMIN_ID?.trim();
            console.error('[VPN] JumpCloud: usuário ou grupo não encontrado', {
              jcUserId: !!jcUserId,
              groupId: !!groupId,
              vpnLevel,
              envVPN_GROUP_DEFAULT_ID: hasDefaultId,
              envVPN_GROUP_ADMIN_ID: hasAdminId
            });
            await notificarVpnFalhaInserção(requesterEmail);
            return res.json(updatedRequest);
          }
          console.log('[VPN] Inserindo usuário no grupo JumpCloud:', { email: requesterEmail, groupId, vpnLevel });
          const added = await addUserToVpnGroup(groupId, jcUserId);
          if (added) {
            const { resolveVpnTicket } = await import('../services/vpnService');
            const resolvedRequest = await resolveVpnTicket(id, approverId ?? undefined);
            const leaderName = (updatedRequest as { ownerApprovedByName?: string }).ownerApprovedByName || 'Líder';
            const approverUser = approverId ? await prisma.user.findUnique({ where: { id: approverId }, select: { name: true } }) : null;
            const siName = approverUser?.name || 'SI';
            await notificarVpnConcedido({
              requesterEmail,
              vpnLevel,
              assetNumber,
              operatingSystem,
              leaderName,
              siName
            });
            return res.json(resolvedRequest ?? updatedRequest);
          } else {
            console.error('[VPN] Falha ao inserir no JumpCloud:', new Error('addUserToVpnGroup retornou false'));
            await notificarVpnFalhaInserção(requesterEmail);
          }
        } catch (e) {
          console.error('[VPN] Erro ao concluir acesso:', e);
          if (request.requester?.email) {
            const { notificarVpnFalhaInserção } = await import('../services/slackService');
            await notificarVpnFalhaInserção(request.requester.email);
          }
        }
        return res.json(updatedRequest);
      }
      if (request.requester?.email) {
        try {
          const { getSlackApp, sendDmToSlackUser } = await import('../services/slackService');
          const app = getSlackApp();
          if (app?.client) {
            const lookup = await app.client.users.lookupByEmail({ email: request.requester.email });
            if (lookup.user?.id) {
              await sendDmToSlackUser(
                app.client,
                lookup.user.id,
                '✅ O time de SI aprovou sua solicitação de Acesso a VPN. Aguardando aprovação do seu líder.'
              );
            }
          }
        } catch (_) {}
      }
      return res.json(updatedRequest);
    }

    // Notificação Slack (AEX e CHANGE_ROLE usam mensagem específica após execução)
    const isAexApproval = action === 'APROVADO' && (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) || request.isExtraordinary);
    const isChangeRoleApproval = action === 'APROVADO' && request.type === 'CHANGE_ROLE';
    if (request.requester?.email && !isAexApproval && !isChangeRoleApproval) {
      sendSlackNotification(request.requester.email, 'APROVADO', adminNote || 'Solicitação aprovada e executada.', request.type, undefined, request.details);
    }

    // =========================================================
    // 🚀 LÓGICA DE EXECUÇÃO AUTOMÁTICA
    // =========================================================
    if (action === 'APROVADO') {

      // CENÁRIO 1: RH (Promoção, Mudança de Área) — Convenia (apenas log; admissão tem CENÁRIO 1b)
      if (['PROMOCAO', 'MUDANCA_AREA'].includes(request.type)) {
        console.log(`✅ RH: Solicitação ${request.type} aprovada. Aguardando sincronização do Convenia.`);
      }

      // CENÁRIO 1b: ONBOARDING (HIRING, ADMISSAO, ONBOARDING) — vincula colaborador a departamento e cargo + JML notifica Owners (Joiner)
      else if (ONBOARDING_REQUEST_TYPES.includes(request.type)) {
        try {
          const onboardingResult = await runOnboardingAutomation(id, request, approverId);
          if (onboardingResult) {
            let jumpCloudSi: HiringJumpCloudSiPayload | undefined;
            if (request.type === 'HIRING') {
              try {
                jumpCloudSi = await tryHiringJumpCloudProvisionForEmail(onboardingResult.userEmail);
              } catch {
                jumpCloudSi = { outcome: 'manual_check' };
              }
            }
            // KBS groups são dinâmicos no JumpCloud (Department + Job Title + Company + Manager)
            // Não gerenciar membros KBS manualmente — syncUserToJumpCloud() é suficiente
            // ATENÇÃO: company deve usar UNIT_TO_JC_COMPANY (mapTherisUnitNameToJumpCloudCompany) para correspondência exata
            syncUserToJumpCloud(onboardingResult.userEmail, onboardingResult.roleId).catch((err) =>
              console.error(
                request.type === 'HIRING' ? '[HIRING] Falha no sync JumpCloud pós-criação:' : '[JumpCloud Sync] Erro:',
                err
              )
            );
            try {
              await syncAccessFromRole(onboardingResult.userId, onboardingResult.roleId);
            } catch (syncErr) {
              console.error('[Automação] Onboarding: falha ao sincronizar Access/Catálogo (não bloqueia):', syncErr);
            }
            {
              const { notificarOwnersJoiner } = await import('../services/slackService');
              const closer = approverId
                ? await prisma.user.findUnique({ where: { id: approverId }, select: { name: true } })
                : null;
              void notificarOwnersJoiner({
                requestId: id,
                requestType: request.type,
                collaboratorName: onboardingResult.collaboratorName,
                collaboratorUserId: onboardingResult.userId,
                jobTitle: onboardingResult.jobTitle,
                departmentName: onboardingResult.departmentName,
                unitName: onboardingResult.unitName,
                startDate: onboardingResult.startDate,
                roleId: onboardingResult.roleId,
                requesterName: request.requester?.name ?? null,
                closedByName: closer?.name ?? null,
                jumpCloudSi
              }).catch((notifErr) =>
                console.error('[Automação] Joiner: falha ao notificar owners (não bloqueia):', notifErr)
              );
            }
          }
        } catch (onboardError) {
          console.error('[Automação] Erro ao vincular colaborador na admissão (onboarding):', onboardError);
        }
      }

      // CENÁRIO 2: ACESSO EXTRAORDINÁRIO / FERRAMENTA PONTUAL — vincula o colaborador à ferramenta na tabela Access
      else if (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) || request.isExtraordinary) {
        try {
          const aexAuto = await runExtraordinaryAccessAutomation(id, request);
          if (aexAuto) {
            await supersedePriorExtraordinaryAccessAfterRenewal({
              requesterId: aexAuto.requesterId,
              toolId: aexAuto.toolId,
              keepAccessId: aexAuto.accessId
            });
          }
          await fireAexJumpCloudProvisionAfterPrisma({
            details: request.details,
            requesterId: request.requesterId
          });
          const { registrarMudanca } = await import('../lib/auditLog');
          const toolNameAex = (request as { toolName?: string }).toolName || (() => { try { const d = JSON.parse(request.details || '{}'); return d.tool || d.toolName || '—'; } catch { return '—'; } })();
          const accessLevelAex = (request as { accessLevel?: string }).accessLevel || (() => { try { const d = JSON.parse(request.details || '{}'); return d.target || d.targetValue || '—'; } catch { return '—'; } })();
          const reqAny = request as { ownerApprovedBy?: string; siApprovedBy?: string; accessPeriodRaw?: string; extraordinaryDuration?: number; extraordinaryUnit?: string };
          const periodo = reqAny.accessPeriodRaw || (reqAny.extraordinaryDuration != null && reqAny.extraordinaryUnit ? `${reqAny.extraordinaryDuration} ${reqAny.extraordinaryUnit}` : undefined);
          await registrarMudanca({
            tipo: 'AEX_APPROVED',
            entidadeTipo: 'User',
            entidadeId: request.requesterId || id,
            descricao: `Acesso extraordinário concedido: ${toolNameAex} - ${accessLevelAex}`,
            dadosDepois: {
              ferramenta: toolNameAex,
              nivel: accessLevelAex,
              periodo,
              ownerApprovedBy: reqAny.ownerApprovedBy,
              siApprovedBy: (updatedRequest as { siApprovedBy?: string }).siApprovedBy,
              requestId: id
            },
            autorId: approverId || undefined
          });
          if (request.requester?.email) {
            const { getSlackApp } = await import('../services/slackService');
            const { sendAexApprovedBySIDM } = await import('../services/aexOwnerService');
            const app = getSlackApp();
            if (app?.client) {
              try {
                const lookup = await app.client.users.lookupByEmail({ email: request.requester.email });
                const requesterSlackId = lookup.user?.id;
                if (requesterSlackId) {
                  await sendAexApprovedBySIDM(app.client, requesterSlackId, id, toolNameAex, accessLevelAex);
                }
              } catch (e) {
                console.error('[AEX] Erro ao notificar solicitante da aprovação:', e);
              }
            }
          }
        } catch (triggerError) {
          console.error("❌ Erro gatilho automático (acesso extraordinário):", triggerError);
        }
      }

      // CENÁRIO 2.5: CHANGE_ROLE (MOVIMENTAÇÃO) — atualiza colaborador no banco e notifica
      else if (request.type === 'CHANGE_ROLE') {
        console.log('[CHANGE_ROLE] Executando fluxo pós-aprovação para requestId:', id);
        try {
          const result = await runChangeRoleAutomation(id, request, approverId);
          if (result.success) {
            if (result.userEmail) {
              // KBS groups são dinâmicos no JumpCloud (Department + Job Title + Company + Manager)
              // Não gerenciar membros KBS manualmente — syncUserToJumpCloud() é suficiente
              // ATENÇÃO: company deve usar UNIT_TO_JC_COMPANY para garantir correspondência exata
              const { firePostSlackAcessosChannel } = await import('../services/slackService');
              syncUserToJumpCloud(result.userEmail)
                .then(() => {
                  firePostSlackAcessosChannel(
                    `🔧 JumpCloud atualizado — novo cargo/departamento sincronizado | Ticket: #${id.slice(0, 8)}`
                  );
                })
                .catch((err) => console.error('[JumpCloud Sync] Erro:', err));
            }
            console.log('[CHANGE_ROLE] Mudança aplicada com sucesso. userId atualizado; notificações em seguida.');
          } else {
            console.warn('[CHANGE_ROLE] runChangeRoleAutomation retornou success: false. Verifique details.future e colaborador.');
          }
          if (result.success && request.requester?.email) {
            const { sendChangeRoleApprovedDM } = await import('../services/slackService');
            await sendChangeRoleApprovedDM(request.requester.email, result.collaboratorName || 'Colaborador');
          }
          if (result.success && result.notifPayload) {
            try {
              const details = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
              const subtipo = (details.subtipo as string | undefined)?.trim()?.toUpperCase() || '';
              const isCargo = subtipo === 'MUDANCA_CARGO';
              const isDepto = subtipo === 'MUDANCA_DEPARTAMENTO';
              console.log('[CHANGE_ROLE] Notificações: subtipo=', details.subtipo, '→ isCargo=', isCargo, 'isDepto=', isDepto);
              if (isCargo) {
                const { notificarOwnersMudancaCargo } = await import('../services/slackService');
                await notificarOwnersMudancaCargo(
                  result.notifPayload.colaborador,
                  result.notifPayload.kbsAnterior,
                  result.notifPayload.kbsNovo,
                  id,
                  result.notifPayload.dataAcao
                );
                console.log('[CHANGE_ROLE] notificarOwnersMudancaCargo concluído.');
              } else if (isDepto) {
                const { notificarOwnersMudancaDepto } = await import('../services/slackService');
                await notificarOwnersMudancaDepto(
                  result.notifPayload.colaborador,
                  result.notifPayload.kbsAnterior,
                  result.notifPayload.kbsNovo,
                  id,
                  result.notifPayload.dataAcao
                );
                console.log('[CHANGE_ROLE] notificarOwnersMudancaDepto concluído.');
              } else {
                const { notificarOwnersFerramenta } = await import('../services/slackService');
                await notificarOwnersFerramenta(
                  result.notifPayload.colaborador,
                  result.notifPayload.kbsAnterior,
                  result.notifPayload.kbsNovo,
                  id,
                  result.notifPayload.dataAcao
                );
              }
            } catch (notifErr) {
              console.error('[Automação CHANGE_ROLE] Falha ao notificar owners (não bloqueia aprovação):', notifErr);
            }
          }
          if (result.success) {
            try {
              const detNome = JSON.parse(request.details || '{}') as { collaboratorName?: string };
              const nomeFim = String(detNome.collaboratorName || result.collaboratorName || '—');
              const { firePostSlackAcessosChannel } = await import('../services/slackService');
              firePostSlackAcessosChannel(`🔒 Movimentação concluída — ${nomeFim} | Ticket: #${id.slice(0, 8)}`);
            } catch (_) {}
          }
          if (!result.success && request.requester?.email) {
            sendSlackNotification(request.requester.email, 'APROVADO', adminNote || 'Solicitação aprovada.', request.type, undefined, request.details);
          }
        } catch (changeRoleError) {
          console.error('[CHANGE_ROLE] Erro ao executar mudança:', changeRoleError);
          try {
            const { registrarMudanca } = await import('../lib/auditLog');
            await registrarMudanca({
              tipo: 'CHANGE_ROLE_ERRO',
              entidadeTipo: 'Request',
              entidadeId: id,
              descricao: `Falha ao aplicar mudança de cargo após aprovação: ${changeRoleError instanceof Error ? changeRoleError.message : String(changeRoleError)}`,
              dadosDepois: { error: String(changeRoleError), requestId: id },
              autorId: approverId ?? undefined
            });
          } catch (_) {}
          if (request.requester?.email) {
            sendSlackNotification(request.requester.email, 'APROVADO', adminNote || 'Solicitação aprovada.', request.type, undefined, request.details);
          }
        }
      }

      // CENÁRIO 3: DESIGNAÇÃO DE DEPUTY (SUBSTITUTO)
      else if (request.type === 'DEPUTY_DESIGNATION') {
        try {
          const substituteName = currentDetails.substitute;
          // Tenta achar o usuário substituto pelo nome no banco
          const substituteUser = await prisma.user.findFirst({
            where: { isActive: true, name: { contains: substituteName, mode: 'insensitive' } },
            select: { id: true, name: true }
          });

          if (substituteUser) {
            await prisma.user.update({
              where: { id: request.requesterId },
              data: { myDeputyId: substituteUser.id }
            });
            console.log(`✅ Deputy Designado: ${substituteUser.name} para o gestor ${request.requester.name}`);
          }
        } catch (deputyError) {
          console.error("❌ Erro ao designar deputy:", deputyError);
        }
      }

      // CENÁRIO 4: DESLIGAMENTO (FIRING / DEMISSAO / OFFBOARDING) — desvincula o colaborador alvo e notifica Owners
      else if (OFFBOARDING_REQUEST_TYPES.includes(request.type)) {
        try {
          await runOffboardingAutomation(id, request.type, request.details, request.actionDate, approverId);
        } catch (offboardError) {
          console.error('[Automação] Erro ao desvincular usuário após aprovação de desligamento:', offboardError);
        }
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    console.error('SOLICITACOES ERROR (updateSolicitacao):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};

// ============================================================
// 4. GET UMA SOLICITAÇÃO (detalhe + comentários + anexos)
// ============================================================
export const getSolicitacaoById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const viewerContext = req.headers['x-context'] === 'my-tickets';
  const userId = (req.headers['x-user-id'] as string)?.trim();
  try {
    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, departmentRef: { select: { id: true, name: true } } } },
        approver: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true, jobTitle: true } },
        inboxDepartment: { select: { id: true, name: true } },
        inboxRole: { select: { id: true, name: true, departmentId: true } },
        comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true, email: true } } } },
        attachments: { orderBy: { createdAt: 'asc' }, include: { uploadedBy: { select: { id: true, name: true } } } }
      }
    });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });
    if (viewerContext && userId && request.requesterId !== userId) return res.status(403).json({ error: 'Acesso negado a este chamado.' });

    // AEX PENDING_SI: indicar se Owner é do time de SI (para exibir aviso no painel)
    let ownerIsSIMember = false;
    if (request.status === 'PENDING_SI' && ((request as { toolName?: string }).toolName || EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) || request.isExtraordinary)) {
      const toolName = (request as { toolName?: string }).toolName;
      if (toolName) {
        const { isOwnerSIMember } = await import('../services/aexOwnerService');
        ownerIsSIMember = await isOwnerSIMember(toolName);
      }
    }

    // AEX / VPN: canAddSolution — bloqueio de "Adicionar uma solução" até aprovação dupla completa
    let canAddSolution = true;
    let solutionBlockReason: string | null = null;
    const isAexDetail = request.type === 'ACCESS_TOOL_EXTRA' || (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) && request.isExtraordinary) || request.type === 'VPN_ACCESS';
    if (isAexDetail && request.status !== 'APROVADO' && request.status !== 'REPROVADO' && request.status !== 'RESOLVED') {
      if (request.status === 'PENDING_OWNER') {
        canAddSolution = false;
        solutionBlockReason = request.type === 'VPN_ACCESS'
          ? 'Não é possível adicionar uma solução ainda. Aguardando aprovação do líder direto antes que o Time de SI possa encerrar este chamado.'
          : 'Não é possível adicionar uma solução ainda. Aguardando aprovação do Owner/Sub-owner da ferramenta antes que o Time de SI possa encerrar este chamado.';
      } else if (request.status === 'PENDING_SI') {
        const ownerApprovedBy = (request as { ownerApprovedBy?: string }).ownerApprovedBy;
        if (ownerApprovedBy && userId) {
          const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
          const isSI = viewer?.email && SI_BYPASS_APPROVER_EMAILS.includes(viewer.email.toLowerCase());
          let isOwner = false;
          if (viewer?.email) {
            try {
              const { getSlackApp } = await import('../services/slackService');
              const app = getSlackApp();
              if (app?.client) {
                const lookup = await app.client.users.lookupByEmail({ email: viewer.email });
                if (lookup.user?.id === ownerApprovedBy) isOwner = true;
              }
            } catch (_) {}
          }
          if (isOwner) {
            canAddSolution = false;
            solutionBlockReason = request.type === 'VPN_ACCESS'
              ? 'Você já aprovou como líder direto. A solução final deve ser adicionada pelo Time de Segurança da Informação.'
              : 'Você já aprovou como Owner/Sub-owner. A solução final deve ser adicionada pelo Time de Segurança da Informação.';
          } else if (!isSI) {
            canAddSolution = false;
            solutionBlockReason = 'A solução final deve ser adicionada pelo Time de Segurança da Informação.';
          }
        }
      }
    }

    const isHiring = ONBOARDING_REQUEST_TYPES.includes(request.type);
    if (isHiring) {
      if (request.status === 'PENDING_SI') {
        const viewer = userId
          ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
          : null;
        const isSI = viewer?.email && SI_BYPASS_APPROVER_EMAILS.includes(viewer.email.toLowerCase());
        if (!isSI) {
          canAddSolution = false;
          solutionBlockReason = 'A solução final deve ser adicionada pelo Time de Segurança da Informação.';
        }
      } else if (
        !['APROVADO', 'REPROVADO', 'RESOLVED', 'RESOLVIDO', 'CONCLUIDO', 'FECHADO'].includes(request.status)
      ) {
        canAddSolution = false;
        solutionBlockReason = 'Este chamado ainda está em andamento.';
      }
    }

    const requestHistory = await prisma.historicoMudanca.findMany({
      where: { entidadeTipo: 'Request', entidadeId: id },
      orderBy: { createdAt: 'asc' },
      include: { autor: { select: { name: true } } }
    });

    return res.json({ ...request, ownerIsSIMember, canAddSolution, solutionBlockReason, requestHistory });
  } catch (error) {
    console.error('SOLICITACOES ERROR (getSolicitacaoById):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao buscar solicitação' });
  }
};

// ============================================================
// 5. PATCH METADADOS (Service Desk: status, assignee, scheduledAt)
// ============================================================
export const updateSolicitacaoMetadata = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, assigneeId, scheduledAt } = req.body;
  const userId = (req.headers['x-user-id'] as string)?.trim();
  try {
    const existing = await prisma.request.findUnique({ where: { id }, include: { requester: true, assignee: true } });
    if (!existing) return res.status(404).json({ error: 'Solicitação não encontrada' });

    const changingStatus = status !== undefined;
    const changingSchedule = scheduledAt !== undefined;
    const cancelRequested = changingStatus && String(status) === 'CANCELADO';

    // Cancelamento: SUPER_ADMIN (qualquer tipo) ou solicitante em chamado Infra
    if (cancelRequested) {
      if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
      const caller = await prisma.user.findUnique({ where: { id: userId }, select: { systemProfile: true, name: true } });
      const isRequester = existing.requesterId === userId;
      const canCancel =
        caller?.systemProfile === 'SUPER_ADMIN' ||
        (isInfraTicketType(existing.type) && isRequester);
      if (!canCancel) {
        return res.status(403).json({ error: 'Você não tem permissão para cancelar este chamado.' });
      }
      const currentStatus = (existing.status || '').toUpperCase();
      if (['CANCELADO', 'RESOLVIDO', 'CONCLUIDO', 'RESOLVED', 'APROVADO', 'REPROVADO', 'FECHADO'].includes(currentStatus)) {
        return res.status(400).json({ error: 'Chamado já encerrado e não pode ser cancelado.' });
      }
    }

    // Infra: alteração de status (exceto cancelamento) ou agendamento — só inbox (ou fallback admin)
    if (
      isInfraTicketType(existing.type) &&
      ((changingStatus && !cancelRequested) || (changingSchedule && !cancelRequested))
    ) {
      if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true, roleId: true, systemProfile: true },
      });
      if (!actor || !isInboxMember(actor, existing)) {
        return res.status(403).json({ error: 'Apenas a equipe da inbox responsável pode alterar este chamado.' });
      }
    }

    // Solicitante não pode aprovar/reprovar o próprio chamado (exceto chamados Infra), antes de qualquer outra checagem
    if (
      !isInfraTicketType(existing.type) &&
      status !== undefined &&
      (String(status) === 'APROVADO' || String(status) === 'RESOLVED' || String(status) === 'RESOLVIDO') &&
      userId &&
      existing.requesterId === userId
    ) {
      return res.status(403).json({ error: 'O solicitante não pode aprovar ou reprovar o próprio chamado.' });
    }

    const isAex = existing.type === 'ACCESS_TOOL_EXTRA' || (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(existing.type) && existing.isExtraordinary);
    const isVpnMetadata = existing.type === 'VPN_ACCESS';
    const ownerApprovedBy = (existing as { ownerApprovedBy?: string }).ownerApprovedBy;
    let siApprovedBy = (existing as { siApprovedBy?: string }).siApprovedBy;

    if (status !== undefined && (String(status) === 'RESOLVED' || String(status) === 'RESOLVIDO' || String(status) === 'APROVADO')) {
      if (isVpnMetadata) {
        if (!ownerApprovedBy || !siApprovedBy) {
          return res.status(403).json({
            error: 'VPN_DUAL_APPROVAL_REQUIRED',
            message: 'Chamado de Acesso a VPN requer aprovação do líder direto e do time de SI antes de ser encerrado.'
          });
        }
        return res.status(403).json({
          error: 'VPN_USE_APPROVE_FLOW',
          message: 'Chamado de Acesso a VPN deve ser encerrado pelo botão Aprovar no fluxo de aprovação (que dispara a inserção no JumpCloud), não pela alteração manual de status.'
        });
      }
    }

    if (status !== undefined && String(status) === 'APROVADO' && isAex) {
      if (!ownerApprovedBy) {
        return res.status(403).json({
          error: 'PARTIAL_APPROVAL',
          message: 'Este chamado requer aprovação das duas partes. Aguardando aprovação do Owner.'
        });
      }
      if (!siApprovedBy) {
        if (existing.status === 'PENDING_SI') {
          return res.status(403).json({
            error: 'USE_SLACK_ACTION',
            message: 'A aprovação do SI deve ser feita pelos botões na DM do Slack.'
          });
        }
        if (!userId) {
          return res.status(401).json({ error: 'Usuário não identificado.' });
        }
        const approverUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        const isSI = approverUser?.email && SI_BYPASS_APPROVER_EMAILS.includes(approverUser.email.toLowerCase());
        if (!isSI) {
          return res.status(403).json({
            error: 'PARTIAL_APPROVAL',
            message: 'Este chamado requer aprovação das duas partes. Use o botão Aprovar no fluxo de aprovação.'
          });
        }
        try {
          const { getSlackApp } = await import('../services/slackService');
          const app = getSlackApp();
          if (app?.client && approverUser?.email) {
            const lookup = await app.client.users.lookupByEmail({ email: approverUser.email });
            siApprovedBy = lookup.user?.id ?? undefined;
          }
        } catch (_) {}
      }
    }

    if (status !== undefined && String(status) === 'APROVADO' && existing.type === 'HIRING' && existing.status === 'PENDING_SI') {
      return res.status(403).json({
        error: 'USE_SLACK_ACTION',
        message: 'Onboarding: aprove ou recuse pelos botões na DM do Slack.'
      });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = String(status);
    // Responsável é preenchido automaticamente por fase (Service Desk). Em Infra, assigneeId é o executor definido pelo solicitante — não sobrescrever.
    const statusStr = status !== undefined ? String(status) : '';
    const autoAssigneeStatuses = ['IN_PROGRESS', 'EM_ANDAMENTO', 'RESOLVED', 'RESOLVIDO', 'CONCLUIDO', 'APROVADO', 'CANCELADO', 'FECHADO'];
    const autoAssigneeId =
      !isInfraTicketType(existing.type) && status !== undefined && autoAssigneeStatuses.includes(statusStr) && userId ? userId : undefined;
    if (autoAssigneeId !== undefined) (data as any).assigneeId = autoAssigneeId;
    if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    // Ao SI adicionar solução em AEX PENDING_SI: preencher siApprovedBy/siApprovedAt (acima já validado)
    if (status === 'APROVADO' && isAex && siApprovedBy && !(existing as { siApprovedBy?: string }).siApprovedBy) {
      (data as any).siApprovedBy = siApprovedBy;
      (data as any).siApprovedAt = new Date();
    }

    const updated = await prisma.request.update({
      where: { id },
      data,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true, jobTitle: true } },
        inboxDepartment: { select: { id: true, name: true } },
        inboxRole: { select: { id: true, name: true, departmentId: true } },
      }
    });

    const { notifyTicketEvent } = await import('../services/ticketEventService');
    if (status !== undefined && status !== existing.status) {
      console.log('[Chamado] Tentando enviar notificação Slack para chamado:', id, 'tipo: STATUS_CHANGED');
      const notifPayload: Record<string, unknown> = { from: existing.status, to: status };
      if (userId) notifPayload.actorId = userId;
      if (String(status) === 'CANCELADO' && userId) {
        const canceler = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        if (canceler?.name) notifPayload.cancelledByName = canceler.name;
      }
      try {
        await notifyTicketEvent(id, 'STATUS_CHANGED', notifPayload);
        console.log('[Chamado] Slack enviado com sucesso para chamado:', id);
      } catch (err) {
        console.error('[Chamado] Erro ao enviar Slack:', err);
      }
    }
    if (autoAssigneeId !== undefined && autoAssigneeId !== existing.assigneeId) {
      console.log('[Chamado] Tentando enviar notificação Slack para chamado:', id, 'tipo: ASSIGNEE_CHANGED');
      try {
        await notifyTicketEvent(id, 'ASSIGNEE_CHANGED', { assigneeId: autoAssigneeId });
        console.log('[Chamado] Slack enviado com sucesso para chamado:', id);
      } catch (err) {
        console.error('[Chamado] Erro ao enviar Slack:', err);
      }
    }

    const newStatus = (status !== undefined ? String(status) : existing.status) || '';
    const { registrarMudanca } = await import('../lib/auditLog');
    if (autoAssigneeId !== undefined && autoAssigneeId !== existing.assigneeId) {
      const newAssignee = autoAssigneeId ? await prisma.user.findUnique({ where: { id: autoAssigneeId }, select: { name: true } }) : null;
      await registrarMudanca({
        tipo: 'TICKET_ASSIGNED',
        entidadeTipo: 'Request',
        entidadeId: id,
        descricao: `Responsável atribuído: ${newAssignee?.name ?? '—'}`,
        dadosAntes: { responsavel: existing.assignee?.name ?? null },
        dadosDepois: { responsavel: newAssignee?.name ?? null },
        autorId: userId ?? undefined,
      }).catch(() => {});
    }
    if (status !== undefined && status !== existing.status) {
      if (['RESOLVIDO', 'CONCLUIDO', 'FECHADO', 'RESOLVED'].includes(newStatus)) {
        await registrarMudanca({
          tipo: 'TICKET_RESOLVED',
          entidadeTipo: 'Request',
          entidadeId: id,
          descricao: `Chamado encerrado: ${existing.details?.slice(0, 60) ?? id}...`,
          dadosAntes: { status: existing.status },
          dadosDepois: { status: 'RESOLVIDO' },
          autorId: userId ?? undefined,
        }).catch(() => {});
      } else if (['RESOLVIDO', 'CONCLUIDO', 'FECHADO', 'RESOLVED'].includes(existing.status)) {
        await registrarMudanca({
          tipo: 'TICKET_REOPENED',
          entidadeTipo: 'Request',
          entidadeId: id,
          descricao: 'Chamado reaberto',
          dadosAntes: { status: 'RESOLVIDO' },
          dadosDepois: { status: newStatus || 'ABERTO' },
          autorId: userId ?? undefined,
        }).catch(() => {});
      } else {
        await registrarMudanca({
          tipo: 'STATUS_CHANGED',
          entidadeTipo: 'Request',
          entidadeId: id,
          descricao: `Status alterado: ${existing.status} → ${newStatus}`,
          dadosAntes: { status: existing.status },
          dadosDepois: { status: newStatus },
          autorId: userId ?? undefined,
        }).catch(() => {});
      }
    }

    // Automação: se o status foi alterado para APROVADO, executar regras (desligamento, onboarding, acesso extraordinário, CHANGE_ROLE)
    if (newStatus === 'APROVADO') {
      {
        const { firePostSlackAcessosChannel } = await import('../services/slackService');
        const ticketShort = id.slice(0, 8);
        let metaApprover = '—';
        if (userId) {
          const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
          if (u?.name) metaApprover = u.name;
        }
        if (OFFBOARDING_REQUEST_TYPES.includes(existing.type) && (existing.status === 'PENDENTE_GESTOR' || existing.status === 'PENDENTE_SI')) {
          if (existing.status === 'PENDENTE_GESTOR') {
            firePostSlackAcessosChannel(`✅ Offboarding aprovado pelo gestor ${metaApprover} | Ticket: #${ticketShort}`);
          } else {
            firePostSlackAcessosChannel(`✅ Offboarding aprovado pelo SI (${metaApprover}) | Ticket: #${ticketShort}`);
          }
        }
        if (existing.type === 'CHANGE_ROLE' && (existing.status === 'PENDENTE_GESTOR' || existing.status === 'PENDENTE_SI')) {
          firePostSlackAcessosChannel(`✅ Movimentação aprovada por ${metaApprover} | Ticket: #${ticketShort}`);
        }
      }
      if (existing.type === 'CHANGE_ROLE') {
        console.log('[CHANGE_ROLE] Executando fluxo pós-aprovação (metadata) para requestId:', id);
        try {
          const result = await runChangeRoleAutomation(id, existing, existing.approverId || userId);
          if (result.success) {
            if (result.userEmail) {
              // KBS groups são dinâmicos no JumpCloud (Department + Job Title + Company + Manager)
              // Não gerenciar membros KBS manualmente — syncUserToJumpCloud() é suficiente
              // ATENÇÃO: company deve usar UNIT_TO_JC_COMPANY para garantir correspondência exata
              const { firePostSlackAcessosChannel } = await import('../services/slackService');
              syncUserToJumpCloud(result.userEmail)
                .then(() => {
                  firePostSlackAcessosChannel(
                    `🔧 JumpCloud atualizado — novo cargo/departamento sincronizado | Ticket: #${id.slice(0, 8)}`
                  );
                })
                .catch((err) => console.error('[JumpCloud Sync] Erro:', err));
            }
            console.log('[CHANGE_ROLE] (metadata) Mudança aplicada com sucesso.');
          } else {
            console.warn('[CHANGE_ROLE] (metadata) runChangeRoleAutomation retornou success: false.');
          }
          if (result.success && existing.requester?.email) {
            const { sendChangeRoleApprovedDM } = await import('../services/slackService');
            await sendChangeRoleApprovedDM(existing.requester.email, result.collaboratorName || 'Colaborador');
          }
          if (result.success && result.notifPayload) {
            try {
              const details = typeof existing.details === 'string' ? JSON.parse(existing.details || '{}') : (existing.details || {});
              const subtipo = (details.subtipo as string | undefined)?.trim()?.toUpperCase() || '';
              const isCargo = subtipo === 'MUDANCA_CARGO';
              const isDepto = subtipo === 'MUDANCA_DEPARTAMENTO';
              if (isCargo) {
                const { notificarOwnersMudancaCargo } = await import('../services/slackService');
                await notificarOwnersMudancaCargo(
                  result.notifPayload.colaborador,
                  result.notifPayload.kbsAnterior,
                  result.notifPayload.kbsNovo,
                  id,
                  result.notifPayload.dataAcao
                );
              } else if (isDepto) {
                const { notificarOwnersMudancaDepto } = await import('../services/slackService');
                await notificarOwnersMudancaDepto(
                  result.notifPayload.colaborador,
                  result.notifPayload.kbsAnterior,
                  result.notifPayload.kbsNovo,
                  id,
                  result.notifPayload.dataAcao
                );
              } else {
                const { notificarOwnersFerramenta } = await import('../services/slackService');
                await notificarOwnersFerramenta(
                  result.notifPayload.colaborador,
                  result.notifPayload.kbsAnterior,
                  result.notifPayload.kbsNovo,
                  id,
                  result.notifPayload.dataAcao
                );
              }
            } catch (notifErr) {
              console.error('[Automação CHANGE_ROLE] Falha ao notificar owners (metadata, não bloqueia):', notifErr);
            }
          }
          if (result.success) {
            try {
              const detNome = JSON.parse(existing.details || '{}') as { collaboratorName?: string };
              const nomeFim = String(detNome.collaboratorName || result.collaboratorName || '—');
              const { firePostSlackAcessosChannel } = await import('../services/slackService');
              firePostSlackAcessosChannel(`🔒 Movimentação concluída — ${nomeFim} | Ticket: #${id.slice(0, 8)}`);
            } catch (_) {}
          }
        } catch (changeRoleError) {
          console.error('[CHANGE_ROLE] Erro ao aplicar movimentação (metadata):', changeRoleError);
        }
      }
      if (OFFBOARDING_REQUEST_TYPES.includes(existing.type)) {
        try {
          await runOffboardingAutomation(id, existing.type, existing.details, existing.actionDate, userId);
        } catch (offboardError) {
          console.error('[Automação] Erro ao desvincular usuário após aprovação de desligamento (metadata):', offboardError);
        }
      }
      if (ONBOARDING_REQUEST_TYPES.includes(existing.type)) {
        try {
          const onboardingResult = await runOnboardingAutomation(id, existing, userId);
          if (onboardingResult) {
            let jumpCloudSi: HiringJumpCloudSiPayload | undefined;
            if (existing.type === 'HIRING') {
              try {
                jumpCloudSi = await tryHiringJumpCloudProvisionForEmail(onboardingResult.userEmail);
              } catch {
                jumpCloudSi = { outcome: 'manual_check' };
              }
            }
            // KBS groups são dinâmicos no JumpCloud (Department + Job Title + Company + Manager)
            // Não gerenciar membros KBS manualmente — syncUserToJumpCloud() é suficiente
            // ATENÇÃO: company deve usar UNIT_TO_JC_COMPANY (mapTherisUnitNameToJumpCloudCompany) para correspondência exata
            syncUserToJumpCloud(onboardingResult.userEmail, onboardingResult.roleId).catch((err) =>
              console.error(
                existing.type === 'HIRING' ? '[HIRING] Falha no sync JumpCloud pós-criação:' : '[JumpCloud Sync] Erro:',
                err
              )
            );
            try {
              await syncAccessFromRole(onboardingResult.userId, onboardingResult.roleId);
            } catch (syncErr) {
              console.error('[Automação] Onboarding (metadata): falha ao sincronizar Access/Catálogo (não bloqueia):', syncErr);
            }
            {
              const { notificarOwnersJoiner } = await import('../services/slackService');
              const closerMeta = userId
                ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
                : null;
              void notificarOwnersJoiner({
                requestId: id,
                requestType: existing.type,
                collaboratorName: onboardingResult.collaboratorName,
                collaboratorUserId: onboardingResult.userId,
                jobTitle: onboardingResult.jobTitle,
                departmentName: onboardingResult.departmentName,
                unitName: onboardingResult.unitName,
                startDate: onboardingResult.startDate,
                roleId: onboardingResult.roleId,
                requesterName: existing.requester?.name ?? null,
                closedByName: closerMeta?.name ?? null,
                jumpCloudSi
              }).catch((notifErr) =>
                console.error('[Automação] Joiner (metadata): falha ao notificar owners (não bloqueia):', notifErr)
              );
            }
          }
        } catch (onboardError) {
          console.error('[Automação] Erro ao vincular colaborador na admissão (metadata):', onboardError);
        }
      }
      if (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(existing.type) || existing.isExtraordinary) {
        try {
          const aexAuto = await runExtraordinaryAccessAutomation(id, existing);
          if (aexAuto) {
            await supersedePriorExtraordinaryAccessAfterRenewal({
              requesterId: aexAuto.requesterId,
              toolId: aexAuto.toolId,
              keepAccessId: aexAuto.accessId
            });
          }
          await fireAexJumpCloudProvisionAfterPrisma({
            details: existing.details,
            requesterId: existing.requesterId
          });
          const { registrarMudanca } = await import('../lib/auditLog');
          const toolNameAex = (existing as { toolName?: string }).toolName || (() => { try { const d = JSON.parse(existing.details || '{}'); return d.tool || d.toolName || '—'; } catch { return '—'; } })();
          const accessLevelAex = (existing as { accessLevel?: string }).accessLevel || (() => { try { const d = JSON.parse(existing.details || '{}'); return d.target || d.targetValue || '—'; } catch { return '—'; } })();
          const exAny = existing as { ownerApprovedBy?: string; siApprovedBy?: string; accessPeriodRaw?: string; extraordinaryDuration?: number; extraordinaryUnit?: string };
          const periodo = exAny.accessPeriodRaw || (exAny.extraordinaryDuration != null && exAny.extraordinaryUnit ? `${exAny.extraordinaryDuration} ${exAny.extraordinaryUnit}` : undefined);
          await registrarMudanca({
            tipo: 'AEX_APPROVED',
            entidadeTipo: 'User',
            entidadeId: existing.requesterId || id,
            descricao: `Acesso extraordinário concedido: ${toolNameAex} - ${accessLevelAex}`,
            dadosDepois: {
              ferramenta: toolNameAex,
              nivel: accessLevelAex,
              periodo,
              ownerApprovedBy: exAny.ownerApprovedBy,
              siApprovedBy: exAny.siApprovedBy,
              requestId: id
            },
          });
          if (existing.requester?.email) {
            const { getSlackApp } = await import('../services/slackService');
            const { sendAexApprovedBySIDM } = await import('../services/aexOwnerService');
            const app = getSlackApp();
            if (app?.client) {
              try {
                const lookup = await app.client.users.lookupByEmail({ email: existing.requester.email });
                if (lookup.user?.id) {
                  await sendAexApprovedBySIDM(app.client, lookup.user.id, id, toolNameAex, accessLevelAex);
                }
              } catch (e) {
                console.error('[AEX] Erro ao notificar solicitante da aprovação (metadata):', e);
              }
            }
          }
        } catch (extraError) {
          console.error('[Automação] Erro ao vincular acesso extraordinário (metadata):', extraError);
        }
      }
    }

    return res.json(updated);
  } catch (error) {
    console.error('SOLICITACOES ERROR (updateSolicitacaoMetadata):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao atualizar metadados' });
  }
};

// ============================================================
// 5b. INBOX (Infra) — apenas ADMIN/SUPER_ADMIN
// ============================================================
export const patchRequestInbox = async (req: Request, res: Response) => {
  if (!hasProfile(req, ['ADMIN', 'SUPER_ADMIN'])) {
    return res.status(403).json({ error: 'Apenas administradores podem definir a inbox do chamado.' });
  }
  const { id } = req.params;
  const userId = (req.headers['x-user-id'] as string)?.trim();
  const { inboxDepartmentId, inboxRoleId } = req.body as { inboxDepartmentId?: string; inboxRoleId?: string };
  const deptId = String(inboxDepartmentId || '').trim();
  const roleId = String(inboxRoleId || '').trim();
  if (!deptId || !roleId) {
    return res.status(400).json({ error: 'inboxDepartmentId e inboxRoleId são obrigatórios.' });
  }
  try {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });
    if (!isInfraTicketType(request.type)) {
      return res.status(400).json({ error: 'Inbox só se aplica a chamados de infraestrutura.' });
    }
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!role) return res.status(400).json({ error: 'Cargo não encontrado.' });
    if (role.departmentId !== deptId) {
      return res.status(400).json({ error: 'O cargo não pertence ao departamento informado.' });
    }
    const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { id: true, name: true } });
    if (!dept) return res.status(400).json({ error: 'Departamento não encontrado.' });

    const updated = await prisma.request.update({
      where: { id },
      data: {
        inboxDepartmentId: deptId,
        inboxRoleId: roleId,
        updatedAt: new Date(),
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true, jobTitle: true } },
        inboxDepartment: { select: { id: true, name: true } },
        inboxRole: { select: { id: true, name: true, departmentId: true } },
      },
    });

    const adminUser = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : null;
    const adminName = adminUser?.name || 'Administrador';
    const { registrarMudanca } = await import('../lib/auditLog');
    await registrarMudanca({
      tipo: 'INFRA_INBOX_SET',
      entidadeTipo: 'Request',
      entidadeId: id,
      descricao: `Inbox definida: ${dept.name} · ${role.name} por ${adminName}`,
      dadosDepois: {
        inboxDepartmentId: deptId,
        inboxRoleId: roleId,
        departmentName: dept.name,
        roleName: role.name,
      },
      autorId: userId || undefined,
    }).catch(() => {});

    const { notifyInfraInboxConfigured } = await import('../services/slackService');
    notifyInfraInboxConfigured({
      requestId: id,
      departmentName: dept.name,
      roleName: role.name,
      adminName,
    }).catch((err: unknown) => console.error('[INFRA] Slack inbox:', err));

    return res.json(updated);
  } catch (error) {
    console.error('SOLICITACOES ERROR (patchRequestInbox):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao definir inbox' });
  }
};

// ============================================================
// 5c. ATRIBUIR EXECUTOR (Infra) — membro da inbox; assigneeId = executor
// ============================================================
export const patchRequestAssignee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.headers['x-user-id'] as string)?.trim();
  const rawAssignee = (req.body as { assigneeId?: string | null }).assigneeId;

  if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });

  try {
    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: { select: { name: true, email: true } } }
    });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });
    if (!isInfraTicketType(request.type)) {
      return res.status(400).json({ error: 'Atribuição só é permitida em chamados de infraestrutura.' });
    }
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true, roleId: true, systemProfile: true },
    });
    if (!actor || !isInboxMember(actor, request)) {
      return res.status(403).json({ error: 'Apenas a equipe da inbox responsável pode definir o executor deste chamado.' });
    }

    const prevAssigneeId = request.assigneeId;
    let nextAssigneeId: string | null;
    if (rawAssignee === null || rawAssignee === undefined || rawAssignee === '') {
      nextAssigneeId = null;
    } else {
      const target = await prisma.user.findUnique({
        where: { id: String(rawAssignee) },
        select: { id: true, isActive: true, email: true }
      });
      if (!target) return res.status(400).json({ error: 'Usuário não encontrado.' });
      if (!target.isActive) return res.status(400).json({ error: 'Usuário inativo não pode ser atribuído.' });
      nextAssigneeId = target.id;
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { assigneeId: nextAssigneeId, updatedAt: new Date() },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true, jobTitle: true } },
        inboxDepartment: { select: { id: true, name: true } },
        inboxRole: { select: { id: true, name: true, departmentId: true } },
      }
    });

    if (nextAssigneeId && nextAssigneeId !== prevAssigneeId) {
      const assigneeRow = await prisma.user.findUnique({
        where: { id: nextAssigneeId },
        select: { email: true }
      });
      if (assigneeRow?.email) {
        const { getRequestContext } = await import('../services/ticketEventService');
        const { sendInfraTicketAssigneeDm } = await import('../services/slackService');
        const { summary } = getRequestContext({
          type: request.type,
          details: request.details,
          justification: request.justification ?? null
        });
        sendInfraTicketAssigneeDm({
          assigneeEmail: assigneeRow.email,
          requestId: id,
          detailsSummary: summary || '—',
          requesterName: request.requester?.name || 'Solicitante'
        }).catch((err: unknown) => console.error('[INFRA] Erro ao notificar executor no Slack:', err));
      }
    }

    return res.json(updated);
  } catch (error) {
    console.error('SOLICITACOES ERROR (patchRequestAssignee):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao atualizar executor do chamado' });
  }
};

// ============================================================
// 6. COMENTÁRIO
// ============================================================
export const createComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body, kind } = req.body;
  const authorId = (req.headers['x-user-id'] as string)?.trim() || req.body.authorId || null;
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
  try {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    if (isInfraTicketType(request.type)) {
      if (!authorId) return res.status(401).json({ error: 'Usuário não identificado.' });
      const author = await prisma.user.findUnique({
        where: { id: authorId },
        select: { departmentId: true, roleId: true, systemProfile: true },
      });
      if (!author || !isInboxMember(author, request)) {
        return res.status(403).json({ error: 'Apenas a equipe da inbox responsável pode adicionar anotações.' });
      }
    }

    // AEX: bloquear solução enquanto aprovação dupla não estiver completa
    const isAex = request.type === 'ACCESS_TOOL_EXTRA' || (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) && request.isExtraordinary);
    if (isAex && (kind === 'SOLUTION' || kind === 'solution')) {
      const status = request.status;
      const ownerApprovedBy = (request as { ownerApprovedBy?: string }).ownerApprovedBy;

      if (status === 'PENDING_OWNER') {
        return res.status(403).json({
          error: 'AEX_SOLUTION_BLOCKED',
          message: 'Não é possível adicionar uma solução ainda. Aguardando aprovação do Owner/Sub-owner da ferramenta antes que o Time de SI possa encerrar este chamado.'
        });
      }

      if (status === 'PENDING_SI' && ownerApprovedBy) {
        if (!authorId) {
          return res.status(401).json({ error: 'Usuário não identificado.' });
        }
        const author = await prisma.user.findUnique({ where: { id: authorId }, select: { email: true } });
        const isSI = author?.email && SI_BYPASS_APPROVER_EMAILS.includes(author.email.toLowerCase());

        // Verificar se o autor é o Owner (já aprovou) — não pode fechar
        let isOwner = false;
        if (author?.email) {
          try {
            const { getSlackApp } = await import('../services/slackService');
            const app = getSlackApp();
            if (app?.client) {
              const lookup = await app.client.users.lookupByEmail({ email: author.email });
              const authorSlackId = lookup.user?.id;
              if (authorSlackId === ownerApprovedBy) isOwner = true;
            }
          } catch (_) {}
        }

        if (isOwner) {
          return res.status(403).json({
            error: 'AEX_SOLUTION_BLOCKED',
            message: 'Você já aprovou como Owner/Sub-owner. A solução final deve ser adicionada pelo Time de Segurança da Informação.'
          });
        }
        if (!isSI) {
          return res.status(403).json({
            error: 'AEX_SOLUTION_BLOCKED',
            message: 'A solução final deve ser adicionada pelo Time de Segurança da Informação.'
          });
        }
      }
    }

    const comment = await prisma.requestComment.create({
      data: {
        requestId: id,
        authorId,
        body: String(body).trim(),
        kind: kind === 'SOLUTION' || kind === 'SCHEDULED_TASK' ? kind : 'COMMENT'
      },
      include: { author: { select: { id: true, name: true, email: true } } }
    });

    const { registrarMudanca } = await import('../lib/auditLog');
    await registrarMudanca({
      tipo: 'TICKET_COMMENTED',
      entidadeTipo: 'Request',
      entidadeId: id,
      descricao: 'Comentário adicionado ao chamado',
      dadosDepois: { autor: comment.author?.name ?? '—', preview: comment.body.slice(0, 100) },
      autorId: authorId ?? undefined,
    }).catch(() => {});

    const { notifyTicketEvent } = await import('../services/ticketEventService');
    console.log('[Chamado] Tentando enviar notificação Slack para chamado:', id, 'tipo: COMMENT_ADDED');
    try {
      await notifyTicketEvent(id, 'COMMENT_ADDED', {
        commentId: comment.id,
        kind: comment.kind,
        body: comment.body.slice(0, 200),
        authorId: comment.authorId ?? comment.author?.id,
        authorName: comment.author?.name ?? 'Alguém'
      });
      console.log('[Chamado] Slack enviado com sucesso para chamado:', id);
    } catch (err) {
      console.error('[Chamado] Erro ao enviar Slack:', err);
    }

    return res.status(201).json(comment);
  } catch (error) {
    console.error('SOLICITACOES ERROR (createComment):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao adicionar comentário' });
  }
};

// ============================================================
// 7. ANEXO (fileBase64 → Cloudinary; ou fileUrl direto)
// ============================================================

export const createAttachment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filename, fileUrl, fileBase64, mimeType, uploadedById } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename é obrigatório' });

  let finalUrl = fileUrl;
  if (fileBase64) {
    const hasConfig = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
    if (!hasConfig) {
      console.error('createAttachment: Cloudinary não configurado (CLOUDINARY_URL ou CLOUDINARY_*)');
      return res.status(503).json({ error: 'Upload de anexos não configurado. Defina CLOUDINARY_* no .env.' });
    }
    try {
      const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${fileBase64}`;
      const result = await cloudinary.uploader.upload(dataUri, { resource_type: 'auto' });
      finalUrl = result.secure_url;
    } catch (err) {
      console.error('createAttachment Cloudinary upload:', err);
      return res.status(500).json({ error: 'Erro ao enviar arquivo para o provedor de mídia' });
    }
  }
  if (!finalUrl) return res.status(400).json({ error: 'Envie fileUrl ou fileBase64' });

  try {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    let effectiveUploaderId: string | null = uploadedById || null;
    if (isInfraTicketType(request.type)) {
      const uploaderId = ((req.headers['x-user-id'] as string)?.trim() || uploadedById || '').trim();
      if (!uploaderId) return res.status(401).json({ error: 'Usuário não identificado.' });
      const uploader = await prisma.user.findUnique({
        where: { id: uploaderId },
        select: { departmentId: true, roleId: true, systemProfile: true },
      });
      if (!uploader || !isInboxMember(uploader, request)) {
        return res.status(403).json({ error: 'Apenas a equipe da inbox responsável pode anexar arquivos neste chamado.' });
      }
      effectiveUploaderId = uploaderId;
    }

    const attachment = await prisma.requestAttachment.create({
      data: {
        requestId: id,
        filename: String(filename),
        fileUrl: finalUrl,
        mimeType: mimeType || null,
        uploadedById: effectiveUploaderId
      },
      include: { uploadedBy: { select: { id: true, name: true } } }
    });

    const { notifyTicketEvent } = await import('../services/ticketEventService');
    console.log('[Chamado] Tentando enviar notificação Slack para chamado:', id, 'tipo: ATTACHMENT_ADDED');
    try {
      await notifyTicketEvent(id, 'ATTACHMENT_ADDED', {
        filename: attachment.filename,
        uploadedById: attachment.uploadedById ?? attachment.uploadedBy?.id
      });
      console.log('[Chamado] Slack enviado com sucesso para chamado:', id);
    } catch (err) {
      console.error('[Chamado] Erro ao enviar Slack:', err);
    }

    return res.status(201).json(attachment);
  } catch (error) {
    console.error('SOLICITACOES ERROR (createAttachment):', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Erro ao adicionar anexo' });
  }
};

// ============================================================
// 8. EXPORT CSV (Relatório - SUPER_ADMIN)
// ============================================================
const EXPORT_CATEGORY_TYPES: Record<string, string[]> = {
  GESTAO_PESSOAS: ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'PROMOCAO', 'DEMISSAO', 'ADMISSAO'],
  GESTAO_ACESSOS: ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'],
  TI_INFRA: ['INFRA_SUPPORT', 'INFRA']
};

const SUBJECT_MAP: Record<string, string> = {
  'ACCESS_TOOL': 'Novo Acesso',
  'ACESSO_FERRAMENTA': 'Novo Acesso',
  'ACCESS_CHANGE': 'Alteração de Acesso',
  'EXTRAORDINARIO': 'Acesso Extraordinário',
  'ACCESS_TOOL_EXTRA': 'Acesso Extraordinário',
  'DEPUTY_DESIGNATION': 'Designação de Substituto',
  'CHANGE_ROLE': 'Mudança de Cargo',
  'PROMOCAO': 'Promoção',
  'ADMISSAO': 'Admissão / Onboarding',
  'DEMISSAO': 'Desligamento / Offboarding',
  'FIRING': 'Desligamento / Offboarding',
  'INFRA_SUPPORT': 'Suporte de TI / Hardware',
  'INFRA': 'Suporte de TI / Hardware'
};

function getCategoryForType(type: string): string {
  for (const [cat, types] of Object.entries(EXPORT_CATEGORY_TYPES)) {
    if (types.includes(type)) {
      return cat === 'GESTAO_PESSOAS' ? 'Gestão de Pessoas' : cat === 'GESTAO_ACESSOS' ? 'Gestão de Acessos' : 'TI / Infra';
    }
  }
  return 'Geral';
}

function formatDetailsForCsv(details: string | null, type: string, actionDate?: Date | string | null, accessPeriodRaw?: string | null): string {
  try {
    const d = typeof details === 'string' ? JSON.parse(details || '{}') : (details || {});
    const parts: string[] = [];
    if (d.info) parts.push(String(d.info));
    if (type === 'CHANGE_ROLE' && d.current) parts.push(`Atual: ${d.current.role || ''} / ${d.current.dept || ''}`);
    if (type === 'CHANGE_ROLE' && d.future) parts.push(`Novo: ${d.future.role || ''} / ${d.future.dept || ''}`);
    if (d.collaboratorName) parts.push(`Colaborador: ${d.collaboratorName}`);
    if (d.tool) parts.push(`Ferramenta: ${d.tool}`);
    if (d.target) parts.push(`Nível: ${d.target}`);
    if (accessPeriodRaw) parts.push(`Período: ${accessPeriodRaw}`);
    if (actionDate) {
      const dt = typeof actionDate === 'string' ? new Date(actionDate) : actionDate;
      parts.push(`Data de Ação: ${dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`);
    }
    return parts.join(' · ') || '-';
  } catch {
    return details || '-';
  }
}

/** Remove emojis e caracteres que quebram CSV/Excel */
function sanitizeForCsv(val: string): string {
  return String(val ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F900}-\u{1F9FF}]/gu, ''); // emojis
}

/** Escapa célula CSV (padrão Excel Brasil): ; " → aspas, quebras de linha → espaço */
function escapeCsvCell(val: string): string {
  if (val == null || val === '') return '';
  const str = sanitizeForCsv(
    String(val).replace(/\n/g, ' ').replace(/\r/g, '')
  );
  if (str.includes(';') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export const exportRequestsCsv = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { systemProfile: true } });
  if (!user || user.systemProfile !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Apenas SUPER_ADMIN pode exportar relatórios.' });

  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const categories = (req.query.categories as string | string[] | undefined);
  const columns = (req.query.columns as string | string[] | undefined);

  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate e endDate são obrigatórios.' });

  const catArr = Array.isArray(categories) ? categories : categories ? [categories] : ['GESTAO_PESSOAS', 'GESTAO_ACESSOS', 'TI_INFRA'];
  const colArr = Array.isArray(columns) ? columns : columns ? [columns] : ['id', 'categoria', 'assunto', 'status', 'solicitante', 'responsavel', 'data', 'justificativa', 'detalhes', 'observacao'];

  const typeList: string[] = [];
  for (const c of catArr) {
    const types = EXPORT_CATEGORY_TYPES[c];
    if (types) typeList.push(...types);
  }

  const where: any = {
    createdAt: {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  };
  if (typeList.length > 0) where.type = { in: [...new Set(typeList)] };

  const requests = await prisma.request.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { name: true } },
      assignee: { select: { name: true } }
    }
  });

  const COL_LABELS: Record<string, string> = {
    id: 'ID do chamado',
    categoria: 'Categoria',
    assunto: 'Assunto / Tipo',
    status: 'Status',
    solicitante: 'Solicitante',
    responsavel: 'Responsável',
    data: 'Data e Hora',
    justificativa: 'Justificativa',
    detalhes: 'Detalhes (Slack)',
    observacao: 'Observação'
  };

  const header = colArr.map(c => escapeCsvCell(COL_LABELS[c] || c));
  const rows: string[][] = [header];

  const fmt = (d: Date) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  for (const r of requests) {
    const category = getCategoryForType(r.type);
    const subject = SUBJECT_MAP[r.type] || r.type;
    const detailsStr = formatDetailsForCsv(r.details, r.type, (r as { actionDate?: Date | string | null }).actionDate, (r as { accessPeriodRaw?: string | null }).accessPeriodRaw);
    const adminNote = (r as { adminNote?: string }).adminNote || '';

    const row: string[] = [];
    for (const c of colArr) {
      if (c === 'id') row.push(escapeCsvCell('#' + r.id.split('-')[0].toUpperCase()));
      else if (c === 'categoria') row.push(escapeCsvCell(category));
      else if (c === 'assunto') row.push(escapeCsvCell(subject));
      else if (c === 'status') row.push(escapeCsvCell(r.status));
      else if (c === 'solicitante') row.push(escapeCsvCell(r.requester?.name || '-'));
      else if (c === 'responsavel') row.push(escapeCsvCell(r.assignee?.name || '-'));
      else if (c === 'data') row.push(escapeCsvCell(fmt(r.createdAt)));
      else if (c === 'justificativa') row.push(escapeCsvCell(r.justification || '-'));
      else if (c === 'detalhes') row.push(escapeCsvCell(detailsStr));
      else if (c === 'observacao') row.push(escapeCsvCell(adminNote));
      else row.push('');
    }
    rows.push(row);
  }

  const SEP = ';'; // separador padrão Brasil (Excel/LibreOffice)
  const csv = rows.map(r => r.join(SEP)).join('\r\n');
  const bom = '\uFEFF';
  const buffer = Buffer.from(bom + csv, 'utf-8');

  const catLabel = catArr.length >= 3 ? 'todos' : catArr.join('_').toLowerCase();
  const d1 = new Date(startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const d2 = new Date(endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const filename = `relatorio_${catLabel}_${d1}_${d2}.csv`;

  const { registrarMudanca } = await import('../lib/auditLog');
  const { getClientIp } = await import('../lib/requestContext');
  await registrarMudanca({
    tipo: 'REPORT_EXPORTED',
    entidadeTipo: 'System',
    entidadeId: 'report',
    descricao: 'Relatório exportado',
    dadosDepois: {
      categoria: catArr.join(','),
      periodo: { de: startDate, ate: endDate },
      colunas: colArr,
      ip: getClientIp(req),
    },
    autorId: userId,
  }).catch(() => {});

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

// --- Aprovação SI via Slack (AEX + HIRING): efeitos pós-Prisma ---

function isAexRequestRow(r: { type: string; isExtraordinary: boolean }): boolean {
  return r.type === 'ACCESS_TOOL_EXTRA' || (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(r.type) && r.isExtraordinary);
}

async function executeAexSiSideEffects(
  request: {
    id: string;
    type: string;
    requesterId: string | null;
    details: string | null;
    isExtraordinary?: boolean;
    toolName?: string | null;
    accessLevel?: string | null;
    ownerApprovedBy?: string | null;
    siApprovedBy?: string | null;
    accessPeriodRaw?: string | null;
    extraordinaryDuration?: number | null;
    extraordinaryUnit?: string | null;
    requester: { id?: string; email?: string | null } | null;
  },
  approverId: string | null
): Promise<void> {
  const id = request.id;
  try {
    const aexAuto = await runExtraordinaryAccessAutomation(id, request);
    if (aexAuto) {
      await supersedePriorExtraordinaryAccessAfterRenewal({
        requesterId: aexAuto.requesterId,
        toolId: aexAuto.toolId,
        keepAccessId: aexAuto.accessId
      });
    }
    await fireAexJumpCloudProvisionAfterPrisma({
      details: request.details,
      requesterId: request.requesterId
    });
    const { registrarMudanca } = await import('../lib/auditLog');
    const toolNameAex =
      request.toolName ||
      (() => {
        try {
          const d = JSON.parse(request.details || '{}');
          return d.tool || d.toolName || '—';
        } catch {
          return '—';
        }
      })();
    const accessLevelAex =
      request.accessLevel ||
      (() => {
        try {
          const d = JSON.parse(request.details || '{}');
          return d.target || d.targetValue || '—';
        } catch {
          return '—';
        }
      })();
    const periodo =
      request.accessPeriodRaw ||
      (request.extraordinaryDuration != null && request.extraordinaryUnit
        ? `${request.extraordinaryDuration} ${request.extraordinaryUnit}`
        : undefined);
    await registrarMudanca({
      tipo: 'AEX_APPROVED',
      entidadeTipo: 'User',
      entidadeId: request.requesterId || id,
      descricao: `Acesso extraordinário concedido: ${toolNameAex} - ${accessLevelAex}`,
      dadosDepois: {
        ferramenta: toolNameAex,
        nivel: accessLevelAex,
        periodo,
        ownerApprovedBy: request.ownerApprovedBy,
        siApprovedBy: request.siApprovedBy,
        requestId: id
      },
      autorId: approverId ?? undefined
    });
    if (request.requester?.email) {
      const { getSlackApp } = await import('../services/slackService');
      const { sendAexApprovedBySIDM } = await import('../services/aexOwnerService');
      const app = getSlackApp();
      if (app?.client) {
        try {
          const lookup = await app.client.users.lookupByEmail({ email: request.requester.email });
          const requesterSlackId = lookup.user?.id;
          if (requesterSlackId) {
            await sendAexApprovedBySIDM(app.client, requesterSlackId, id, toolNameAex, accessLevelAex);
          }
        } catch (e) {
          console.error('[AEX] Erro ao notificar solicitante (Slack SI):', e);
        }
      }
    }
  } catch (triggerError) {
    console.error('❌ executeAexSiSideEffects:', triggerError);
  }
}

async function executeHiringSiSideEffects(
  request: { id: string; type: string; details: string | null; requester: { name?: string | null; email?: string | null } | null },
  approverId: string | null
): Promise<void> {
  const id = request.id;
  try {
    const onboardingResult = await runOnboardingAutomation(id, request as { type: string; details: string | null }, approverId);
    if (!onboardingResult) return;

    void (async () => {
      try {
        const jumpCloudSi = await tryHiringJumpCloudProvisionForEmail(onboardingResult.userEmail);
        if (jumpCloudSi?.outcome === 'created') {
          await prisma.request.update({ where: { id }, data: { jumpcloudCreatedAt: new Date() } }).catch(() => {});
          try {
            const { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } = await import('../services/slackService');
            const app = getSlackApp();
            if (app?.client) {
              const short = id.slice(0, 8);
              await postSlackAcessosChannel(
                app.client,
                `🔧 Usuário criado no JumpCloud · ${onboardingResult.collaboratorName} · #${short} · ${formatTimestampBrt()} BRT`
              );
              await postSlackAcessosChannel(
                app.client,
                `✅ Onboarding concluído pelo time de SI · ${onboardingResult.collaboratorName} · #${short} · ${formatTimestampBrt()} BRT\n` +
                  `📋 Favor registrar o ID do chamado *#${short}* na task do ClickUp aberta pela liderança do novo colaborador.`
              );
            }
          } catch (_) {}
        }
        // Aguarda propagação no JumpCloud antes de sincronizar grupos ap_*
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await syncUserToJumpCloud(onboardingResult.userEmail, onboardingResult.roleId);
        if (jumpCloudSi?.outcome === 'created' && jumpCloudSi.jumpcloudId) {
          void bindUserToGoogleWorkspaceDirectory(jumpCloudSi.jumpcloudId).catch((e) =>
            console.error('[HIRING] Falha ao vincular Google Workspace Directory:', e)
          );
        }
      } catch (err) {
        console.error('[HIRING] JumpCloud (Slack SI):', err);
      }
    })();

    try {
      await syncAccessFromRole(onboardingResult.userId, onboardingResult.roleId);
    } catch (syncErr) {
      console.error('[Onboarding Slack SI] sync Access:', syncErr);
    }

    let d: Record<string, unknown> = {};
    try {
      d = JSON.parse(request.details || '{}');
    } catch (_) {}
    const { provisionGoogleWorkspaceUserFireAndForget } = await import('../services/googleWorkspaceService');
    provisionGoogleWorkspaceUserFireAndForget({
      email: onboardingResult.userEmail,
      fullName: onboardingResult.collaboratorName,
      jobTitle: onboardingResult.jobTitle,
      department: onboardingResult.departmentName,
      unit: onboardingResult.unitName,
      managerEmail: (d.managerEmail as string) || undefined,
      requestId: id,
      onDone: async (ok) => {
        if (ok) {
          await prisma.request.update({ where: { id }, data: { googleCreatedAt: new Date() } }).catch(() => {});
          try {
            const { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } = await import('../services/slackService');
            const app = getSlackApp();
            if (app?.client) {
              await postSlackAcessosChannel(
                app.client,
                `🔧 Usuário criado / provisionado no Google Workspace · ${onboardingResult.collaboratorName} · #${id.slice(0, 8)} · ${formatTimestampBrt()} BRT`
              );
            }
          } catch (_) {}
        }
      }
    });

    const { notificarOwnersJoiner } = await import('../services/slackService');
    const closer = approverId
      ? await prisma.user.findUnique({ where: { id: approverId }, select: { name: true } })
      : null;
    void notificarOwnersJoiner({
      requestId: id,
      requestType: request.type,
      collaboratorName: onboardingResult.collaboratorName,
      collaboratorUserId: onboardingResult.userId,
      jobTitle: onboardingResult.jobTitle,
      departmentName: onboardingResult.departmentName,
      unitName: onboardingResult.unitName,
      startDate: onboardingResult.startDate,
      roleId: onboardingResult.roleId,
      requesterName: request.requester?.name ?? null,
      closedByName: closer?.name ?? null,
      jumpCloudSi: undefined
    }).catch((notifErr) => console.error('[Joiner Slack SI]:', notifErr));

    if (request.requester?.email) {
      sendSlackNotification(
        request.requester.email,
        'APROVADO',
        'Onboarding aprovado pelo time de SI.',
        'HIRING',
        undefined,
        request.details
      );
    }
  } catch (e) {
    console.error('❌ executeHiringSiSideEffects:', e);
  }
}

export async function approveAexViaSlack(
  requestId: string,
  actorSlackId: string,
  therisApproverId: string | null
): Promise<'ok' | 'race' | 'bad_status'> {
  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, email: true } } }
  });
  if (!req || req.status !== 'PENDING_SI' || !isAexRequestRow(req)) return 'bad_status';

  const cnt = await prisma.request.updateMany({
    where: { id: requestId, status: 'PENDING_SI', siApprovedBy: null },
    data: {
      status: 'APROVADO',
      siApprovedBy: actorSlackId,
      siApprovedAt: new Date(),
      approverId: therisApproverId,
      ...(therisApproverId ? { assigneeId: therisApproverId } : {}),
      adminNote: 'Aprovado pelo SI (Slack).',
      updatedAt: new Date()
    }
  });
  if (cnt.count === 0) return 'race';

  const { registrarMudanca } = await import('../lib/auditLog');
  await registrarMudanca({
    tipo: 'AEX_SI_APPROVED',
    entidadeTipo: 'Request',
    entidadeId: requestId,
    descricao: 'Time de SI aprovou a solicitação AEX (Slack)',
    dadosAntes: { status: 'PENDING_SI' },
    dadosDepois: { status: 'APROVADO', siApprovedBy: actorSlackId },
    autorId: therisApproverId ?? undefined
  });

  const fresh = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, email: true } } }
  });
  if (fresh) await executeAexSiSideEffects(fresh, therisApproverId);

  try {
    const { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } = await import('../services/slackService');
    const app = getSlackApp();
    if (app?.client) {
      const nm = therisApproverId
        ? await prisma.user.findUnique({ where: { id: therisApproverId }, select: { name: true } })
        : null;
      const line = `✅ Aprovado pelo SI · AEX · #${requestId.slice(0, 8)} · por ${nm?.name || 'SI'} · ${formatTimestampBrt()} BRT`;
      await postSlackAcessosChannel(app.client, line);
    }
  } catch (_) {}

  return 'ok';
}

export async function rejectAexViaSlack(
  requestId: string,
  actorSlackId: string,
  therisApproverId: string | null
): Promise<'ok' | 'race'> {
  const cnt = await prisma.request.updateMany({
    where: { id: requestId, status: 'PENDING_SI' },
    data: {
      status: 'REJECTED',
      adminNote: 'Recusado pelo SI (Slack).',
      updatedAt: new Date(),
      ...(therisApproverId ? { approverId: therisApproverId, assigneeId: therisApproverId } : {})
    }
  });
  if (cnt.count === 0) return 'race';

  const req = await prisma.request.findUnique({ where: { id: requestId }, include: { requester: { select: { email: true } } } });
  const toolNameAex =
    (req as { toolName?: string })?.toolName ||
    (() => {
      try {
        const d = JSON.parse(req?.details || '{}');
        return d.tool || d.toolName || '—';
      } catch {
        return '—';
      }
    })();

  const { registrarMudanca } = await import('../lib/auditLog');
  await registrarMudanca({
    tipo: 'AEX_SI_REJECTED',
    entidadeTipo: 'Request',
    entidadeId: requestId,
    descricao: 'Time de SI reprovou a solicitação AEX (Slack)',
    dadosDepois: { status: 'REJECTED', slackActor: actorSlackId },
    autorId: therisApproverId ?? undefined
  });

  if (req?.requester?.email) {
    try {
      const { getSlackApp } = await import('../services/slackService');
      const { sendAexRejectedBySIDM } = await import('../services/aexOwnerService');
      const app = getSlackApp();
      if (app?.client) {
        const lookup = await app.client.users.lookupByEmail({ email: req.requester.email });
        if (lookup.user?.id) await sendAexRejectedBySIDM(app.client, lookup.user.id, requestId, toolNameAex);
      }
    } catch (e) {
      console.error('[AEX] reject Slack SI notify:', e);
    }
  }

  try {
    const { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } = await import('../services/slackService');
    const app = getSlackApp();
    if (app?.client) {
      const nm = await prisma.user.findUnique({ where: { id: therisApproverId || '' }, select: { name: true } });
      const line = `❌ AEX recusado pelo SI · #${requestId.slice(0, 8)} · por ${nm?.name || 'SI'} · ${formatTimestampBrt()} BRT`;
      await postSlackAcessosChannel(app.client, line);
    }
  } catch (_) {}

  return 'ok';
}

export async function approveHiringViaSlack(
  requestId: string,
  actorSlackId: string,
  therisApproverId: string | null
): Promise<'ok' | 'race' | 'bad_status'> {
  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, name: true, email: true } } }
  });
  if (!req || req.status !== 'PENDING_SI' || req.type !== 'HIRING') return 'bad_status';

  const cnt = await prisma.request.updateMany({
    where: { id: requestId, status: 'PENDING_SI', siApprovedBy: null, type: 'HIRING' },
    data: {
      status: 'APROVADO',
      siApprovedBy: actorSlackId,
      siApprovedAt: new Date(),
      approverId: therisApproverId,
      ...(therisApproverId ? { assigneeId: therisApproverId } : {}),
      adminNote: 'Aprovado pelo SI (Slack) — onboarding.',
      updatedAt: new Date()
    }
  });
  if (cnt.count === 0) return 'race';

  const fresh = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, name: true, email: true } } }
  });
  if (fresh) await executeHiringSiSideEffects(fresh, therisApproverId);

  try {
    const { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } = await import('../services/slackService');
    const app = getSlackApp();
    if (app?.client) {
      const nm = await prisma.user.findUnique({ where: { id: therisApproverId || '' }, select: { name: true } });
      const d = JSON.parse(fresh?.details || '{}');
      const collab = (d.collaboratorName as string) || '—';
      const line = `✅ Aprovado pelo SI (Onboarding) · ${collab} · #${requestId.slice(0, 8)} · ${nm?.name || 'SI'} · ${formatTimestampBrt()} BRT`;
      await postSlackAcessosChannel(app.client, line);
    }
  } catch (_) {}

  return 'ok';
}

export async function rejectHiringViaSlack(
  requestId: string,
  actorSlackId: string,
  therisApproverId: string | null
): Promise<'ok' | 'race'> {
  const cnt = await prisma.request.updateMany({
    where: { id: requestId, status: 'PENDING_SI', type: 'HIRING' },
    data: {
      status: 'REJECTED',
      adminNote: 'Recusado pelo SI (Slack) — onboarding.',
      updatedAt: new Date(),
      ...(therisApproverId ? { approverId: therisApproverId, assigneeId: therisApproverId } : {})
    }
  });
  if (cnt.count === 0) return 'race';

  const req = await prisma.request.findUnique({ where: { id: requestId }, include: { requester: { select: { email: true } } } });
  if (req?.requester?.email) {
    try {
      const { getSlackApp, sendDmToSlackUser } = await import('../services/slackService');
      const app = getSlackApp();
      if (app?.client) {
        const lookup = await app.client.users.lookupByEmail({ email: req.requester.email });
        if (lookup.user?.id) {
          await sendDmToSlackUser(
            app.client,
            lookup.user.id,
            `❌ Seu pedido de onboarding (#${requestId.slice(0, 8)}) foi recusado pelo time de SI.`
          );
        }
      }
    } catch (e) {
      console.error('[HIRING] reject notify:', e);
    }
  }

  try {
    const { getSlackApp, postSlackAcessosChannel, formatTimestampBrt } = await import('../services/slackService');
    const app = getSlackApp();
    if (app?.client) {
      const nm = await prisma.user.findUnique({ where: { id: therisApproverId || '' }, select: { name: true } });
      const d = JSON.parse(req?.details || '{}');
      const collab = (d.collaboratorName as string) || '—';
      const line = `❌ Onboarding recusado pelo SI · ${collab} · #${requestId.slice(0, 8)} · ${nm?.name || 'SI'} · ${formatTimestampBrt()} BRT`;
      await postSlackAcessosChannel(app.client, line);
    }
  } catch (_) {}

  return 'ok';
}