/**
 * Adiciona o usuário JumpCloud apenas a user groups cujo toolCode começa com `ap_` (Acesso Extraordinário).
 * Grupos KBS com critério dinâmico + "administrator review" no JumpCloud não aplicam o add automático via
 * critérios até o review; no onboarding o Theris faz POST members no usergroup KBS (nome prefixado pelo
 * `Role.code`) para vincular imediatamente — ver `tryBindJumpCloudKbsGroupAfterOnboarding` em jumpcloudSyncService.
 */
import { PrismaClient } from '@prisma/client';
import { getSystemUserIdByEmail } from './jumpcloudService';

const prisma = new PrismaClient();

const JUMPCLOUD_API_V2 = 'https://console.jumpcloud.com/api/v2';

const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type JcUserGroup = { id?: string; _id?: string; name?: string };

let userGroupsCache: { data: JcUserGroup[]; fetchedAt: number } | null = null;

/** Cache KBS code (ex.: KBS-RA-2) → JumpCloud usergroup _id (além do cache paginado de `fetchAllJumpCloudUserGroups`). */
const kbsCodeToGroupIdCache = new Map<string, string>();

function getApiKey(): string | null {
  return process.env.JUMPCLOUD_API_KEY?.trim() || null;
}

function parseUserGroupPage(data: unknown): JcUserGroup[] {
  if (Array.isArray(data)) return data as JcUserGroup[];
  const o = data as { results?: unknown; data?: unknown };
  if (Array.isArray(o?.results)) return o.results as JcUserGroup[];
  if (Array.isArray(o?.data)) return o.data as JcUserGroup[];
  return [];
}

/**
 * Lista todos os usergroups JumpCloud (paginado, até 1000). Cache em memória 5 min.
 */
export async function fetchAllJumpCloudUserGroups(): Promise<JcUserGroup[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[JumpCloud KBS] JUMPCLOUD_API_KEY ausente; lista de usergroups vazia.');
    return [];
  }
  if (userGroupsCache && Date.now() - userGroupsCache.fetchedAt < CACHE_TTL_MS) {
    return userGroupsCache.data;
  }
  const all: JcUserGroup[] = [];
  let hadSuccessfulPage = false;
  try {
    for (let p = 0; p < MAX_PAGES; p++) {
      const skip = p * PAGE_SIZE;
      const url = `${JUMPCLOUD_API_V2}/usergroups?limit=${PAGE_SIZE}&skip=${skip}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': apiKey }
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        console.error('[JumpCloud KBS] GET usergroups (página) falhou:', res.status, t?.slice(0, 200));
        break;
      }
      hadSuccessfulPage = true;
      const rows = parseUserGroupPage(await res.json().catch(() => null));
      all.push(...rows);
      if (rows.length < PAGE_SIZE) break;
    }
    if (hadSuccessfulPage) {
      userGroupsCache = { data: all, fetchedAt: Date.now() };
    }
  } catch (e) {
    console.error('[JumpCloud KBS] Erro ao listar usergroups:', e);
    return userGroupsCache?.data ?? [];
  }
  return all;
}

/**
 * Resolve o `_id` do usergroup JumpCloud cujo nome começa exatamente pelo código KBS do cargo
 * (ex.: `KBS-RA-2` ou `KBS-RA-2 (Analista de RevOps)`).
 */
export async function findGroupIdByKbsCode(kbsCode: string): Promise<string | null> {
  const code = (kbsCode || '').trim();
  if (!code) return null;
  const cached = kbsCodeToGroupIdCache.get(code);
  if (cached) return cached;

  const groups = await fetchAllJumpCloudUserGroups();
  const exactMatch = groups.find((g) => {
    const name = (g.name || '').trim();
    return name === code || name.startsWith(`${code} `) || name.startsWith(`${code}(`);
  });
  if (!exactMatch) {
    return null;
  }
  const idRaw = exactMatch._id ?? exactMatch.id;
  if (idRaw == null) return null;
  const id = String(idRaw);
  kbsCodeToGroupIdCache.set(code, id);
  return id;
}

/** Match case-insensitive (ex.: Theris ap_* vs JumpCloud Ap_*). */
async function findUserGroupIdByToolCode(toolCode: string): Promise<string | null> {
  try {
    const needle = (toolCode || '').trim().toLowerCase();
    if (!needle) return null;
    const groups = await fetchAllJumpCloudUserGroups();
    const match = groups.find((g) => (g.name || '').trim().toLowerCase() === needle);
    if (!match) {
      console.warn('[JumpCloud KBS] Grupo JumpCloud não encontrado para toolCode:', toolCode);
      return null;
    }
    return match._id ?? match.id ?? null;
  } catch (e) {
    console.error(`[JumpCloud KBS] Erro ao buscar grupo "${toolCode}":`, e);
    return null;
  }
}

async function postUserGroupMemberOp(groupId: string, jumpcloudUserId: string, op: 'add' | 'remove'): Promise<boolean> {
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
      body: JSON.stringify({ op, type: 'user', id: jumpcloudUserId })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[JumpCloud KBS] POST members (${op}) falhou:`, { groupId, status: res.status, body: errText?.slice(0, 300) });
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[JumpCloud KBS] POST members (${op}) erro:`, e);
    return false;
  }
}

async function postAddUserToGroup(groupId: string, jumpcloudUserId: string): Promise<boolean> {
  return postUserGroupMemberOp(groupId, jumpcloudUserId, 'add');
}

/**
 * AEX: adiciona o usuário JumpCloud ao usergroup cujo name = toolCode (ex.: ap_*).
 * Erros são apenas logados; não propaga exceções.
 */
export async function provisionExtraordinaryAccessOnJumpCloud(jumpcloudUserId: string, toolCode: string): Promise<void> {
  try {
    const jcId = (jumpcloudUserId || '').trim();
    const code = (toolCode || '').trim();
    if (!jcId || !code) return;
    const groupId = await findUserGroupIdByToolCode(code);
    if (!groupId) {
      console.warn('[AEX] Grupo JumpCloud não encontrado para toolCode:', code);
      return;
    }
    const ok = await postUserGroupMemberOp(groupId, jcId, 'add');
    if (ok) console.info('[AEX] Usuário provisionado no grupo JumpCloud:', code);
    else console.error('[AEX] Falha ao provisionar grupo JumpCloud:', code);
  } catch (err) {
    console.error('[AEX] Falha ao provisionar grupo JumpCloud:', toolCode, err);
  }
}

/**
 * AEX: remove o usuário JumpCloud do usergroup ap_* (revogação manual ou fluxo futuro).
 * Erros são apenas logados; não propaga exceções.
 */
export async function revokeExtraordinaryAccessOnJumpCloud(jumpcloudUserId: string, toolCode: string): Promise<void> {
  try {
    const jcId = (jumpcloudUserId || '').trim();
    const code = (toolCode || '').trim();
    if (!jcId || !code) return;
    const groupId = await findUserGroupIdByToolCode(code);
    if (!groupId) {
      console.warn('[AEX] Revogação: grupo JumpCloud não encontrado para toolCode:', code);
      return;
    }
    const ok = await postUserGroupMemberOp(groupId, jcId, 'remove');
    if (ok) console.info('[AEX] Revogação: usuário removido do grupo JumpCloud:', code);
    else console.error('[AEX] Revogação: falha ao remover do grupo JumpCloud:', code);
  } catch (err) {
    console.error('[AEX] Revogação: falha ao remover grupo JumpCloud:', toolCode, err);
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
