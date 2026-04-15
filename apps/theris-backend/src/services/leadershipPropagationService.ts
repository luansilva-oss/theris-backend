import { prisma } from '../lib/prisma';
import { registrarMudanca } from '../lib/auditLog';
import { syncUserToJumpCloud } from './jumpcloudSyncService';

/**
 * Atualiza managerId de todos os colaboradores ativos do cargo (exceto o próprio líder quando definido).
 * Não registra histórico quando managerId já está correto.
 */
export async function propagateLeaderToRole(
  roleId: string,
  newLeaderId: string | null,
  authorId: string | undefined
): Promise<{ updated: number; skipped: number }> {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { name: true } });
  const roleName = role?.name ?? 'Cargo';

  const newLeader = newLeaderId
    ? await prisma.user.findUnique({ where: { id: newLeaderId }, select: { name: true } })
    : null;
  const newLeaderLabel = newLeader?.name ?? '—';

  const users = await prisma.user.findMany({
    where: { roleId, isActive: true },
    select: { id: true, name: true, email: true, managerId: true },
  });

  const mgrIds = new Set<string>();
  for (const u of users) {
    if (u.managerId) mgrIds.add(u.managerId);
  }
  const mgrNames = new Map<string, string>();
  if (mgrIds.size > 0) {
    const mgrs = await prisma.user.findMany({
      where: { id: { in: [...mgrIds] } },
      select: { id: true, name: true },
    });
    for (const m of mgrs) mgrNames.set(m.id, m.name);
  }

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      if (newLeaderId && user.id === newLeaderId) {
        skipped++;
        continue;
      }
      const already =
        (newLeaderId === null && user.managerId === null) ||
        (newLeaderId !== null && user.managerId === newLeaderId);
      if (already) {
        skipped++;
        continue;
      }

      const prevMgrId = user.managerId;
      const prevLabel = prevMgrId ? mgrNames.get(prevMgrId) ?? '—' : '—';

      await prisma.user.update({
        where: { id: user.id },
        data: { managerId: newLeaderId },
      });

      await registrarMudanca({
        tipo: 'LEADER_PROPAGATION',
        entidadeTipo: 'User',
        entidadeId: user.id,
        descricao: `Liderança atualizada via cargo ${roleName}: ${prevLabel} → ${newLeaderLabel}`,
        dadosAntes: { managerId: prevMgrId },
        dadosDepois: { managerId: newLeaderId },
        autorId: authorId,
      }).catch(() => {});

      void syncUserToJumpCloud(user.email).catch(() => {});
      updated++;
    } catch (e) {
      console.error('[propagateLeaderToRole] user', user.id, e);
    }
  }

  return { updated, skipped };
}

/** Ao mudar o cargo do usuário: aplica líder do Role se existir. */
export async function propagateLeaderOnRoleChange(
  userId: string,
  newRoleId: string,
  authorId: string | undefined
): Promise<void> {
  const role = await prisma.role.findUnique({
    where: { id: newRoleId },
    select: { leaderId: true, name: true },
  });
  if (!role?.leaderId) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { managerId: true, email: true },
  });
  if (!user) return;
  if (user.managerId === role.leaderId) return;

  const dadosAntes = { managerId: user.managerId };

  await prisma.user.update({
    where: { id: userId },
    data: { managerId: role.leaderId },
  });

  await registrarMudanca({
    tipo: 'LEADER_AUTO_ASSIGNED',
    entidadeTipo: 'User',
    entidadeId: userId,
    descricao: `Líder atribuído automaticamente ao mudar para cargo ${role.name}`,
    dadosAntes,
    dadosDepois: { managerId: role.leaderId },
    autorId: authorId,
  }).catch(() => {});

  void syncUserToJumpCloud(user.email).catch(() => {});
}

/**
 * Remove o usuário como líder de todos os cargos onde era líder (mudança de cargo/desligamento).
 */
export async function handleLeaderRoleChange(
  leaderUserId: string,
  _oldRoleId: string | null,
  _newRoleId: string | null,
  authorId: string | undefined
): Promise<void> {
  const roles = await prisma.role.findMany({
    where: { leaderId: leaderUserId },
    select: { id: true, name: true },
  });
  if (roles.length === 0) return;

  const leader = await prisma.user.findUnique({
    where: { id: leaderUserId },
    select: { name: true },
  });
  const leaderName = leader?.name ?? 'Líder';

  for (const r of roles) {
    try {
      await prisma.role.update({
        where: { id: r.id },
        data: { leaderId: null },
      });
      await propagateLeaderToRole(r.id, null, authorId);
      await registrarMudanca({
        tipo: 'LEADER_REMOVED_ON_MOVE',
        entidadeTipo: 'Role',
        entidadeId: r.id,
        descricao: `Líder ${leaderName} removido do cargo ${r.name} por mudança de cargo/departamento`,
        dadosAntes: { leaderId: leaderUserId },
        dadosDepois: { leaderId: null },
        autorId: authorId,
      }).catch(() => {});
    } catch (e) {
      console.error('[handleLeaderRoleChange] role', r.id, e);
    }
  }
}
