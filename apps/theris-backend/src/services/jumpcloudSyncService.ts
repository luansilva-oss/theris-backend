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
import { getSystemUserIdByEmail, addUserToGroup } from './jumpcloudService';
import { hasJumpCloudCredentials, jumpcloudFetch } from './jumpcloudAuth';
import {
  addUserToExtraordinaryToolGroups,
  findGroupIdByKbsCode,
  removeUserFromGroup
} from './jumpcloudGroupSyncService';

const prisma = new PrismaClient();

const SYSTEM_USERS_URL = 'https://console.jumpcloud.com/api/systemusers';

/** `Role.code` esperado para usergroups KBS no JumpCloud (ex.: KBS-RA-2). */
const KBS_ROLE_CODE_RE = /^KBS-[A-Z]{2}-\d+$/i;

/** Canal SI (`SLACK_SI_CHANNEL_ID`): texto mrkdwn (onboarding KBS, CHANGE_ROLE KBS, Role sem code, etc.). */
export async function notifySiSlackJumpCloudKbsIssue(text: string): Promise<void> {
  const channelId = process.env.SLACK_SI_CHANNEL_ID?.trim();
  if (!channelId) return;
  try {
    const { getSlackApp } = await import('./slackService');
    const app = getSlackApp();
    if (!app?.client) return;
    await app.client.chat.postMessage({ channel: channelId, text, mrkdwn: true });
  } catch (e) {
    console.error('[SI Slack] Falha ao notificar canal SI:', e);
  }
}

/**
 * Pós-onboarding: adiciona o usuário ao usergroup KBS no JumpCloud (nome do grupo = prefixo de `Role.code`),
 * contornando o atraso do "administrator review" dos grupos dinâmicos.
 * Não lança; falhas apenas log + aviso no canal SI (Slack).
 */
export async function tryBindJumpCloudKbsGroupAfterOnboarding(params: {
  userEmail: string;
  roleId: string;
}): Promise<void> {
  const email = (params.userEmail || '').trim();
  const roleId = (params.roleId || '').trim();
  if (!email || !roleId) return;

  let cargo = '';
  let dept = '';
  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { code: true, name: true, department: { select: { name: true } } }
    });
    cargo = (role?.name || '').trim();
    dept = (role?.department?.name || '').trim();
    const kbsCode = (role?.code || '').trim();

    if (!kbsCode || !KBS_ROLE_CODE_RE.test(kbsCode)) {
      console.warn(
        `[Onboarding] KBS não encontrado para cargo=${cargo} depto=${dept} — usuário ${email} sem grupo KBS (role.code ausente ou inválido).`
      );
      await notifySiSlackJumpCloudKbsIssue(
        `⚠️ *Onboarding JumpCloud — KBS*\n` +
          `Sem \`role.code\` KBS válido para vincular usergroup no JumpCloud.\n` +
          `• E-mail: \`${email}\`\n` +
          `• Cargo: ${cargo || '—'}\n` +
          `• Depto: ${dept || '—'}\n` +
          `_Ação:_ vincular ao grupo KBS correto manualmente no JumpCloud.`
      );
      return;
    }

    const jumpcloudUserId = await getSystemUserIdByEmail(email);
    if (!jumpcloudUserId) {
      console.warn(`[Onboarding] JumpCloud: usuário ${email} sem ID JC — grupo KBS ${kbsCode} não vinculado.`);
      await notifySiSlackJumpCloudKbsIssue(
        `⚠️ *Onboarding JumpCloud — KBS*\n` +
          `Usuário sem ID no JumpCloud (não encontrado por e-mail).\n` +
          `• E-mail: \`${email}\`\n` +
          `• KBS esperado: \`${kbsCode}\`\n` +
          `_Ação:_ após existir no JC, vincular ao usergroup \`${kbsCode}\` manualmente.`
      );
      return;
    }

    const groupId = await findGroupIdByKbsCode(kbsCode);
    if (!groupId) {
      console.error(
        `[Onboarding] Grupo ${kbsCode} não existe no JumpCloud — usuário ${email} sem grupo KBS explícito.`
      );
      await notifySiSlackJumpCloudKbsIssue(
        `⚠️ *Onboarding JumpCloud — KBS*\n` +
          `Usergroup com prefixo \`${kbsCode}\` não encontrado na API JumpCloud.\n` +
          `• E-mail: \`${email}\`\n` +
          `_Ação:_ criar/alinhar o grupo ou vincular manualmente.`
      );
      return;
    }

    await addUserToGroup(jumpcloudUserId, groupId);
    console.info(`[Onboarding] Usuário ${email} adicionado ao grupo ${kbsCode} (${groupId}).`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Onboarding] Falha ao vincular ${email} ao KBS no JumpCloud: ${msg}`);
    await notifySiSlackJumpCloudKbsIssue(
      `⚠️ *Onboarding JumpCloud — KBS*\n` +
        `Falha ao adicionar o usuário ao usergroup KBS (POST members).\n` +
        `• E-mail: \`${email}\`\n` +
        `• Cargo: ${cargo || '—'} / Depto: ${dept || '—'}\n` +
        `• Erro: ${msg}\n` +
        `_Ação:_ vincular ao grupo KBS manualmente no JumpCloud.`
    );
  }
}

/**
 * Pós-CHANGE_ROLE: remove do usergroup KBS do cargo antigo e adiciona ao do novo no JumpCloud.
 * Não lança; falhas → `console.*` + `notifySiSlackJumpCloudKbsIssue`.
 */
export async function tryRebindJumpCloudKbsGroupAfterRoleChange(params: {
  userEmail: string;
  oldRoleCode: string | null;
  newRoleCode: string | null;
}): Promise<void> {
  const email = (params.userEmail || '').trim();
  if (!email) return;

  const oldRaw = params.oldRoleCode != null ? String(params.oldRoleCode).trim() : '';
  const newRaw = params.newRoleCode != null ? String(params.newRoleCode).trim() : '';

  const newValid = Boolean(newRaw && KBS_ROLE_CODE_RE.test(newRaw));
  if (!newValid) {
    console.warn(
      `[CHANGE_ROLE] KBS novo inválido ou ausente para ${email}: old=${oldRaw || 'null'}, new=${newRaw || 'null'}`
    );
    await notifySiSlackJumpCloudKbsIssue(
      `⚠️ *CHANGE_ROLE — KBS*\n` +
        `CHANGE_ROLE sem código KBS válido para o **novo** cargo (grupo KBS no JumpCloud não será atualizado).\n` +
        `• E-mail: \`${email}\`\n` +
        `• Antigo: \`${oldRaw || '—'}\`\n` +
        `• Novo: \`${newRaw || '—'}\`\n` +
        `_Ação:_ corrigir \`role.code\` no Theris e vincular manualmente no JumpCloud se necessário.`
    );
    return;
  }

  if (oldRaw === newRaw) {
    console.info(`[CHANGE_ROLE] KBS inalterado após CHANGE_ROLE de ${email}: ${newRaw} — nada a fazer no JumpCloud.`);
    return;
  }

  let jumpcloudUserId: string | null;
  try {
    jumpcloudUserId = await getSystemUserIdByEmail(email);
  } catch (e) {
    console.error(`[CHANGE_ROLE] Erro ao resolver JumpCloud ID para ${email}:`, e);
    await notifySiSlackJumpCloudKbsIssue(
      `⚠️ *CHANGE_ROLE — KBS*\n` +
        `Erro ao resolver utilizador JumpCloud por e-mail.\n` +
        `• E-mail: \`${email}\`\n` +
        `• Novo KBS: \`${newRaw}\`\n` +
        `_Ação:_ verificar JumpCloud / Theris e vincular KBS manualmente.`
    );
    return;
  }

  if (!jumpcloudUserId) {
    console.warn(`[CHANGE_ROLE] JumpCloud: ${email} sem ID JC — rebind KBS ignorado.`);
    await notifySiSlackJumpCloudKbsIssue(
      `⚠️ *CHANGE_ROLE — KBS*\n` +
        `Utilizador sem ID no JumpCloud (não encontrado por e-mail).\n` +
        `• E-mail: \`${email}\`\n` +
        `• Novo KBS: \`${newRaw}\`\n` +
        `_Ação:_ após existir no JC, vincular ao usergroup \`${newRaw}\` manualmente.`
    );
    return;
  }

  const oldValid = Boolean(oldRaw && KBS_ROLE_CODE_RE.test(oldRaw));
  if (oldValid) {
    try {
      const oldGroupId = await findGroupIdByKbsCode(oldRaw);
      if (!oldGroupId) {
        await notifySiSlackJumpCloudKbsIssue(
          `⚠️ *CHANGE_ROLE — KBS*\n` +
            `Grupo antigo \`${oldRaw}\` não encontrado na API JumpCloud (remoção ignorada; segue adição ao novo).\n` +
            `• E-mail: \`${email}\`\n` +
            `• Novo KBS: \`${newRaw}\`\n` +
            `_Ação:_ alinhar nome do usergroup no JumpCloud ou remover membro manualmente.`
        );
      } else {
        try {
          const removed = await removeUserFromGroup(jumpcloudUserId, oldGroupId);
          if (!removed) {
            await notifySiSlackJumpCloudKbsIssue(
              `⚠️ *CHANGE_ROLE — KBS*\n` +
                `Falha ao remover \`${email}\` do usergroup \`${oldRaw}\` (POST members remove não OK).\n` +
                `• Novo KBS previsto: \`${newRaw}\`\n` +
                `_Ação:_ rever membros no JumpCloud; o fluxo seguiu para tentar adicionar ao novo grupo.`
            );
          }
        } catch (rmErr) {
          const rmMsg = rmErr instanceof Error ? rmErr.message : String(rmErr);
          console.error(`[CHANGE_ROLE] Exceção ao remover ${email} do grupo ${oldRaw}:`, rmErr);
          await notifySiSlackJumpCloudKbsIssue(
            `⚠️ *CHANGE_ROLE — KBS*\n` +
              `Exceção ao remover \`${email}\` do usergroup \`${oldRaw}\`: ${rmMsg}\n` +
              `• Novo KBS previsto: \`${newRaw}\`\n` +
              `_Ação:_ rever JumpCloud manualmente; segue tentativa de adicionar ao novo grupo.`
          );
        }
      }
    } catch (e) {
      console.error(`[CHANGE_ROLE] Erro ao resolver grupo antigo ${oldRaw}:`, e);
      await notifySiSlackJumpCloudKbsIssue(
        `⚠️ *CHANGE_ROLE — KBS*\n` +
          `Erro ao resolver grupo antigo \`${oldRaw}\` para \`${email}\`.\n` +
          `• Novo KBS: \`${newRaw}\`\n` +
          `_Ação:_ verificar JumpCloud.`
      );
    }
  } else {
    console.info(
      `[CHANGE_ROLE] Cargo antigo de ${email} sem code KBS válido (${oldRaw || 'null'}) — pulando remoção de grupo KBS antigo no JumpCloud.`
    );
    await notifySiSlackJumpCloudKbsIssue(
      `⚠️ *CHANGE_ROLE — KBS*\n` +
        `Cargo **antigo** sem \`role.code\` KBS válido (\`${oldRaw || 'null'}\`) — *pulada* remoção do usergroup KBS antigo no JumpCloud.\n` +
        `• E-mail: \`${email}\`\n` +
        `• Novo KBS: \`${newRaw}\`\n` +
        `_Ação:_ rever membros antigos manualmente no JumpCloud se aplicável.`
    );
  }

  try {
    const newGroupId = await findGroupIdByKbsCode(newRaw);
    if (!newGroupId) {
      console.error(`[CHANGE_ROLE] Grupo novo ${newRaw} não encontrado no JumpCloud — ${email} sem KBS após CHANGE_ROLE.`);
      await notifySiSlackJumpCloudKbsIssue(
        `⚠️ *CHANGE_ROLE — KBS*\n` +
          `Grupo novo \`${newRaw}\` não encontrado na API JumpCloud — utilizador \`${email}\` pode ficar sem KBS explícito.\n` +
          `_Ação:_ criar/alinhar o usergroup no JumpCloud ou vincular manualmente.`
      );
      return;
    }
    await addUserToGroup(jumpcloudUserId, newGroupId);
    const removedPart = oldValid ? oldRaw : '— (sem remoção antiga)';
    console.info(`[CHANGE_ROLE] ${email}: removido de ${removedPart}, adicionado a ${newRaw}`);
  } catch (addErr) {
    const addMsg = addErr instanceof Error ? addErr.message : String(addErr);
    console.error(`[CHANGE_ROLE] Falha ao adicionar ${email} ao KBS ${newRaw}:`, addErr);
    await notifySiSlackJumpCloudKbsIssue(
      `⚠️ *CHANGE_ROLE — KBS*\n` +
        `Falha ao adicionar \`${email}\` ao usergroup \`${newRaw}\` (POST members add).\n` +
        `• Erro: ${addMsg}\n` +
        `_Ação:_ vincular ao grupo KBS manualmente no JumpCloud.`
    );
  }
}

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
  if (!hasJumpCloudCredentials()) {
    console.warn('[JumpCloud Provision] Credenciais JumpCloud ausentes; provisionamento ignorado.');
    return null;
  }

  const email = (user.email || '').trim();
  if (!email) return null;

  try {
    const encoded = encodeURIComponent(email);
    const getUrl = `${SYSTEM_USERS_URL}?filter=email:eq:${encoded}`;
    const getRes = await jumpcloudFetch(getUrl, {
      method: 'GET'
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

    const postRes = await jumpcloudFetch(SYSTEM_USERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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

  if (!hasJumpCloudCredentials()) {
    console.warn('[JumpCloud Sync] Credenciais JumpCloud não configuradas; sync ignorado.');
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

    const res = await jumpcloudFetch(`${SYSTEM_USERS_URL}/${jumpcloudId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
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

  if (!hasJumpCloudCredentials()) {
    console.warn('[OFFBOARDING] Credenciais JumpCloud ausentes; suspensão ignorada:', em);
    return;
  }

  try {
    const jumpcloudId = await getSystemUserIdByEmail(em);
    if (!jumpcloudId) {
      console.warn('[OFFBOARDING] Usuário não encontrado no JumpCloud:', em);
      return;
    }

    const res = await jumpcloudFetch(`${SYSTEM_USERS_URL}/${jumpcloudId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
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
