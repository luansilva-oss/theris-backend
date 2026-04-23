/**
 * Handlers de logout.
 *
 * /logout: revoga sessão atual + sua family (uma cadeia de refresh).
 *          Outras sessões do mesmo user em outros dispositivos NÃO são afetadas.
 *
 * /logout-all: revoga TODAS as sessões ativas do user (todos os dispositivos).
 *              Útil pra "Sair de todos os dispositivos" ou response a comprometimento.
 *
 * Pré-requisito: requireAuthCookie já rodou e populou req.authUserNew.
 */

import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { clearAuthCookies } from './cookies';
import { killFamily, killAllUserSessions } from './session';
import { logAuthEvent } from './auditAuth';

const prisma = new PrismaClient();

export async function handleLogout(req: Request, res: Response): Promise<void> {
  const auth = req.authUserNew;
  if (!auth) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'SESSION_MISSING' });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: auth.sessionId },
      select: { family: true },
    });

    if (session) {
      await killFamily(session.family, 'USER_LOGOUT');
    }

    clearAuthCookies(res);

    await logAuthEvent({
      req,
      event: 'AUTH_LOGOUT',
      userId: auth.userId,
      metadata: { sessionId: auth.sessionId, family: session?.family },
    });

    res.status(204).end();
  } catch (err) {
    console.error('[handleLogout]', err);
    // Mesmo em erro: limpa cookies. Logout deve ser robusto.
    clearAuthCookies(res);
    res.status(204).end();
  }
}

export async function handleLogoutAll(req: Request, res: Response): Promise<void> {
  const auth = req.authUserNew;
  if (!auth) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'SESSION_MISSING' });
    return;
  }

  try {
    const result = await killAllUserSessions(auth.userId, 'USER_LOGOUT_ALL');

    clearAuthCookies(res);

    await logAuthEvent({
      req,
      event: 'AUTH_LOGOUT_ALL',
      userId: auth.userId,
      metadata: {
        sessionsRevoked: result.sessionsRevoked,
        refreshTokensRevoked: result.refreshTokensRevoked,
      },
    });

    res.status(204).end();
  } catch (err) {
    console.error('[handleLogoutAll]', err);
    clearAuthCookies(res);
    res.status(204).end();
  }
}
