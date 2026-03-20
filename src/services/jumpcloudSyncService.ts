/**
 * Sincronização de Employment Information (Theris → JumpCloud) após aprovação de chamados /pessoas.
 * Falhas são apenas logadas; não interrompem o fluxo do Theris.
 */
import { PrismaClient } from '@prisma/client';
import { getSystemUserIdByEmail } from './jumpcloudService';
import { addUserToKBSGroups } from './jumpcloudGroupSyncService';

const prisma = new PrismaClient();

const SYSTEM_USERS_URL = 'https://console.jumpcloud.com/api/systemusers';

/**
 * Atualiza jobTitle, department, company e opcionalmente manager (JumpCloud _id do gestor) no Employment Information.
 * Se o usuário não existir no Theris ou no JumpCloud, retorna silenciosamente (apenas log informativo).
 * @param roleId — Se informado (ex.: onboarding), após o PUT de Employment chama addUserToKBSGroups.
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

    const jumpcloudId = await getSystemUserIdByEmail(user.email);
    if (!jumpcloudId) {
      console.log(`[JumpCloud Sync] Nenhum usuário JumpCloud com e-mail ${user.email}; sync não aplicado.`);
      return;
    }

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

    const body = {
      jobTitle: user.jobTitle ?? '',
      department: user.departmentRef?.name ?? '',
      company: user.unitRef?.name ?? '',
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
        const kbs = await addUserToKBSGroups(user.email, roleId);
        console.log(
          `[JumpCloud Sync] KBS grupos: adicionados=${kbs.added.length} [${kbs.added.join(', ')}] falhas=${kbs.failed.length} [${kbs.failed.join(', ')}]`
        );
      } catch (kbsErr) {
        console.error('[JumpCloud Sync] Erro ao sincronizar grupos KBS:', kbsErr);
      }
    }
  } catch (err) {
    console.error('[JumpCloud Sync] Erro:', err);
  }
}
