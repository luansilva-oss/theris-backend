/**
 * Sincronização de Employment Information (Theris → JumpCloud) após aprovação de chamados /pessoas.
 * Falhas são apenas logadas; não interrompem o fluxo do Theris.
 *
 * CONTRATO (company): o valor enviado em `company` deve bater exatamente com o campo Company dos
 * grupos dinâmicos KBS no JumpCloud. `Unit.name` no Theris pode divergir (ex.: "3C+" vs "3C Plus");
 * use sempre `mapTherisUnitNameToJumpCloudCompany` antes do PUT.
 */
import { PrismaClient } from '@prisma/client';
import { mapTherisUnitNameToJumpCloudCompany } from '../config/jumpcloud';
import { getSystemUserIdByEmail } from './jumpcloudService';
import { addUserToExtraordinaryToolGroups } from './jumpcloudGroupSyncService';

const prisma = new PrismaClient();

const SYSTEM_USERS_URL = 'https://console.jumpcloud.com/api/systemusers';

function parseSystemUsersList(data: unknown): { email?: string; _id?: string; id?: string }[] {
  if (Array.isArray(data)) return data as { email?: string; _id?: string; id?: string }[];
  const o = data as { results?: unknown; data?: unknown };
  if (Array.isArray(o?.results)) return o.results as { email?: string; _id?: string; id?: string }[];
  if (Array.isArray(o?.data)) return o.data as { email?: string; _id?: string; id?: string }[];
  return [];
}

/**
 * Cria usuário no JumpCloud se ainda não existir (GET por e-mail → POST systemusers).
 * Convite de definição de senha é enviado pelo JumpCloud ao e-mail do colaborador (sem senha pelo Theris).
 * Não altera syncUserToJumpCloud; chame o sync após esta função para Employment Info.
 */
export async function provisionUserOnJumpCloud(user: {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  company: string;
  managerJcId?: string;
}): Promise<{ created: boolean; jumpcloudId: string } | null> {
  const apiKey = process.env.JUMPCLOUD_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[JumpCloud Provision] JUMPCLOUD_API_KEY ausente; provisionamento ignorado.');
    return null;
  }

  const email = (user.email || '').trim();
  if (!email) return null;

  try {
    const encoded = encodeURIComponent(email);
    const getUrl = `${SYSTEM_USERS_URL}?filter=email:eq:${encoded}`;
    const getRes = await fetch(getUrl, {
      method: 'GET',
      headers: { 'x-api-key': apiKey }
    });

    if (!getRes.ok) {
      const errText = await getRes.text().catch(() => '');
      console.error('[JumpCloud Provision] GET systemusers falhou:', {
        status: getRes.status,
        body: errText?.slice(0, 500)
      });
      return null;
    }

    const getData = await getRes.json().catch(() => null);
    const list = parseSystemUsersList(getData);
    const found = list.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    const existingId = found?._id ?? found?.id;
    if (existingId) {
      return { created: false, jumpcloudId: String(existingId) };
    }

    const rawUsername = email.split('@')[0] || email;
    const username =
      rawUsername
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\-._]/g, '')
        .replace(/^[^a-zA-Z]+/, '')
        .slice(0, 30) || 'user';
    const body: Record<string, unknown> = {
      email,
      username,
      firstname: user.firstName,
      lastname: user.lastName,
      company: user.company,
      jobTitle: user.jobTitle,
      department: user.department,
      send_user_invitation_email: true,
      password_never_expires: false,
      externally_managed: false,
      allow_public_key: true,
      sudo: false,
      enable_managed_uid: false
    };
    if (user.managerJcId) body.manager = user.managerJcId;

    const postRes = await fetch(SYSTEM_USERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    if (postRes.status === 201 || postRes.status === 200) {
      const created = (await postRes.json().catch(() => ({}))) as { _id?: string; id?: string };
      const jumpcloudId = created._id ?? created.id;
      if (jumpcloudId) {
        return { created: true, jumpcloudId: String(jumpcloudId) };
      }
      console.error('[JumpCloud Provision] POST retornou sucesso mas sem _id no corpo:', created);
      return null;
    }

    const errText = await postRes.text().catch(() => '');
    console.error('[JumpCloud Provision] POST systemusers falhou:', {
      status: postRes.status,
      body: errText?.slice(0, 500)
    });
    return null;
  } catch (err) {
    console.error('[JumpCloud Provision] Erro:', err);
    return null;
  }
}

/**
 * Atualiza jobTitle, department, company e opcionalmente manager (JumpCloud _id do gestor) no Employment Information.
 * Se o usuário não existir no Theris ou no JumpCloud, retorna silenciosamente (apenas log informativo).
 * @param roleId — Se informado (ex.: onboarding), após o PUT chama addUserToExtraordinaryToolGroups (somente toolCode ap_*).
 */
export async function syncUserToJumpCloud(userEmail: string, roleId?: string | null): Promise<void> {
  const email = (userEmail || '').trim().toLowerCase();
  if (!email) {
    console.warn('[JumpCloud Sync] E-mail vazio; sync ignorado.');
    return;
  }

  const apiKey = process.env.JUMPCLOUD_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[JumpCloud Sync] JUMPCLOUD_API_KEY não configurada; sync ignorado.');
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        departmentRef: { select: { name: true } },
        unitRef: { select: { name: true } },
        manager: { select: { email: true } }
      }
    });

    if (!user) {
      console.log(`[JumpCloud Sync] Usuário não encontrado no Theris para o e-mail ${email}.`);
      return;
    }

    if (!user.isActive) {
      console.log(`[JumpCloud Sync] Usuário ${email} inativo (isActive=false); sync de Employment ignorado.`);
      return;
    }

    const jumpcloudId = await getSystemUserIdByEmail(user.email);
    if (!jumpcloudId) {
      console.log(`[JumpCloud Sync] Nenhum usuário JumpCloud com e-mail ${user.email}; sync não aplicado.`);
      return;
    }

    const roleRow = user.roleId
      ? await prisma.role.findUnique({ where: { id: user.roleId }, select: { name: true } })
      : null;
    const jobTitleOut = (user.jobTitle || roleRow?.name || '').trim();

    let managerJcId: string | undefined;
    if (user.manager?.email) {
      try {
        const resolved = await getSystemUserIdByEmail(user.manager.email);
        if (resolved) {
          managerJcId = resolved;
        } else {
          console.log(
            `[JumpCloud Sync] Gestor ${user.manager.email} não encontrado no JumpCloud; campo manager omitido no PUT para ${user.email}.`
          );
        }
      } catch {
        console.log(
          `[JumpCloud Sync] Não foi possível resolver gestor no JumpCloud (${user.manager.email}); manager omitido no PUT para ${user.email}.`
        );
      }
    }

    const jcCompany = mapTherisUnitNameToJumpCloudCompany(user.unitRef?.name ?? '');
    const body = {
      jobTitle: jobTitleOut,
      department: user.departmentRef?.name ?? '',
      company: jcCompany,
      ...(managerJcId ? { manager: managerJcId } : {})
    };

    const res = await fetch(`${SYSTEM_USERS_URL}/${jumpcloudId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[JumpCloud Sync] Falha no PUT systemusers:', {
        status: res.status,
        jumpcloudId,
        email: user.email,
        body: errText?.slice(0, 500)
      });
      return;
    }

    console.log(`[JumpCloud Sync] Employment Information atualizada no JumpCloud para ${user.email} (_id=${jumpcloudId}).`);

    if (roleId) {
      try {
        const kbs = await addUserToExtraordinaryToolGroups(user.email, roleId);
        console.log(
          `[JumpCloud Sync] Grupos ap_* (extraordinário): adicionados=${kbs.added.length} [${kbs.added.join(', ')}] falhas=${kbs.failed.length} [${kbs.failed.join(', ')}]`
        );
      } catch (kbsErr) {
        console.error('[JumpCloud Sync] Erro ao sincronizar grupos ap_*:', kbsErr);
      }
    }
  } catch (err) {
    console.error('[JumpCloud Sync] Erro:', err);
  }
}

// OFFBOARDING: suspender usuário no JumpCloud — NUNCA deletar.
// Deleção perderia histórico de acesso, grupos e trilha de auditoria (ISO 27001).
export async function suspendUserOnJumpCloud(email: string): Promise<void> {
  const em = (email || '').trim();
  if (!em) return;

  const apiKey = process.env.JUMPCLOUD_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[OFFBOARDING] JUMPCLOUD_API_KEY ausente; suspensão ignorada:', em);
    return;
  }

  try {
    const jumpcloudId = await getSystemUserIdByEmail(em);
    if (!jumpcloudId) {
      console.warn('[OFFBOARDING] Usuário não encontrado no JumpCloud:', em);
      return;
    }

    const res = await fetch(`${SYSTEM_USERS_URL}/${jumpcloudId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ suspended: true })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[OFFBOARDING] Falha ao suspender no JumpCloud:', em, res.status, errText?.slice(0, 300));
      return;
    }

    console.info('[OFFBOARDING] Usuário suspenso no JumpCloud:', em);
  } catch (err) {
    console.error('[OFFBOARDING] Falha ao suspender no JumpCloud:', em, err);
  }
}
