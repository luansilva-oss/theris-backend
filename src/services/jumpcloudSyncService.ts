/**
 * Sincronização de Employment Information (Theris → JumpCloud) após aprovação de chamados /pessoas.
 * Falhas são apenas logadas; não interrompem o fluxo do Theris.
 */
import { PrismaClient } from '@prisma/client';
import { getSystemUserIdByEmail } from './jumpcloudService';

const prisma = new PrismaClient();

const SYSTEM_USERS_URL = 'https://console.jumpcloud.com/api/systemusers';

/**
 * Atualiza jobTitle, department e company no JumpCloud para o usuário identificado pelo e-mail corporativo.
 * Se o usuário não existir no Theris ou no JumpCloud, retorna silenciosamente (apenas log informativo).
 */
export async function syncUserToJumpCloud(userEmail: string): Promise<void> {
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

    const body = {
      jobTitle: user.jobTitle ?? '',
      department: user.departmentRef?.name ?? '',
      company: user.unitRef?.name ?? ''
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
  } catch (err) {
    console.error('[JumpCloud Sync] Erro:', err);
  }
}
