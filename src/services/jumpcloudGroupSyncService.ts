/**
 * Adiciona o usuário JumpCloud apenas a user groups cujo toolCode começa com `ap_` (Acesso Extraordinário).
 * Grupos KBS dinâmicos (Company + Department + Job Title + Manager) são geridos pelo JumpCloud — não usar POST members para eles.
 */
import { PrismaClient } from '@prisma/client';
import { getSystemUserIdByEmail } from './jumpcloudService';

const prisma = new PrismaClient();

const JUMPCLOUD_API_V2 = 'https://console.jumpcloud.com/api/v2';

function getApiKey(): string | null {
  return process.env.JUMPCLOUD_API_KEY?.trim() || null;
}

/** Primeiro usergroup cujo name bate com toolCode (filter name:eq:{toolCode}). */
async function findUserGroupIdByToolCode(toolCode: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const filter = `name:eq:${toolCode.trim()}`;
  const url = `${JUMPCLOUD_API_V2}/usergroups?filter=${encodeURIComponent(filter)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'x-api-key': apiKey }
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error(`[JumpCloud KBS] GET usergroups falhou (${toolCode}):`, res.status, t?.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
    const row = list[0] as { _id?: string; id?: string; name?: string } | undefined;
    return row?._id ?? row?.id ?? null;
  } catch (e) {
    console.error(`[JumpCloud KBS] Erro ao buscar grupo "${toolCode}":`, e);
    return null;
  }
}

async function postAddUserToGroup(groupId: string, jumpcloudUserId: string): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;
  try {
    const url = `${JUMPCLOUD_API_V2}/usergroups/${groupId}/members`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ op: 'add', type: 'user', id: jumpcloudUserId })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[JumpCloud KBS] POST members falhou:', { groupId, status: res.status, body: errText?.slice(0, 300) });
      return false;
    }
    return true;
  } catch (e) {
    console.error('[JumpCloud KBS] POST members erro:', e);
    return false;
  }
}

/**
 * Para cada item do kit do cargo com toolCode `ap_*`, localiza usergroup JumpCloud pelo name = toolCode e adiciona o usuário.
 */
export async function addUserToExtraordinaryToolGroups(
  userEmail: string,
  roleId: string
): Promise<{ added: string[]; failed: string[] }> {
  const added: string[] = [];
  const failed: string[] = [];

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[JumpCloud KBS] JUMPCLOUD_API_KEY ausente; grupos KBS não atualizados.');
    return { added, failed };
  }

  const email = (userEmail || '').trim();
  if (!email || !roleId) {
    return { added, failed };
  }

  const jcUserId = await getSystemUserIdByEmail(email);
  if (!jcUserId) {
    console.log(`[JumpCloud KBS] Usuário JumpCloud não encontrado para ${email}; grupos KBS ignorados.`);
    return { added, failed };
  }

  const kitItems = await prisma.roleKitItem.findMany({
    where: { roleId },
    select: { toolName: true, toolCode: true }
  });

  if (kitItems.length === 0) {
    console.log(`[JumpCloud KBS] Nenhum RoleKitItem para roleId=${roleId}.`);
    return { added, failed };
  }

  const seenToolCodes = new Set<string>();

  for (const item of kitItems) {
    const toolCode = (item.toolCode || '').trim();
    const toolName = (item.toolName || '').trim() || '(sem toolName)';

    if (!toolCode) {
      console.log(`[JumpCloud KBS] toolCode ausente para ${toolName} — pulando`);
      continue;
    }

    if (!/^ap_/i.test(toolCode)) {
      continue;
    }

    if (seenToolCodes.has(toolCode.toLowerCase())) continue;
    seenToolCodes.add(toolCode.toLowerCase());

    try {
      const groupId = await findUserGroupIdByToolCode(toolCode);
      if (!groupId) {
        console.warn(`[JumpCloud KBS] Grupo JumpCloud não encontrado para toolCode "${toolCode}".`);
        failed.push(toolCode);
        continue;
      }
      const ok = await postAddUserToGroup(groupId, jcUserId);
      if (ok) {
        console.log(`[JumpCloud KBS] Usuário ${email} adicionado ao grupo "${toolCode}" (_id=${groupId}).`);
        added.push(toolCode);
      } else {
        failed.push(toolCode);
      }
    } catch (e) {
      console.error(`[JumpCloud KBS] Erro ao processar "${toolCode}":`, e);
      failed.push(toolCode);
    }
  }

  return { added, failed };
}
