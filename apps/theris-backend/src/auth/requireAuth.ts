/**
 * Novo middleware requireAuth (cookie-based).
 *
 * IMPORTANTE: este middleware NÃO está plugado em nenhuma rota ainda.
 * Será ativado no Bloco 5 substituindo o requireAuth antigo de src/middleware/auth.ts.
 *
 * Fluxo:
 *   1. Lê cookie SESSION_COOKIE (raw token).
 *   2. HMAC-hash do token e busca Session pelo tokenHash.
 *   3. Valida: sessão existe, isActive=true, não revogada, user ativo.
 *   4. Valida: now <= absoluteExpiresAt e now <= idleExpiresAt.
 *   5. Atualiza lastUsedAt + estende idleExpiresAt (sliding, com guard de 30s pra evitar write storm).
 *   6. Popula req.authUserNew com { userId, email, systemProfile, sessionId, acr, authTime }.
 *   7. Erros sempre 401 com `error` code identificável (frontend decide refresh vs relogin).
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashToken } from './tokens';
import { SESSION_COOKIE } from './cookies';

const prisma = new PrismaClient();
const IDLE_MS = Number(process.env.SESSION_IDLE_MINUTES ?? 30) * 60_000;

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface AuthUserNew {
      userId: string;
      email: string;
      systemProfile: string;
      sessionId: string;
      acr: string;
      authTime: Date;
    }
    interface Request {
      /** Identidade autenticada via cookie (Bloco 2+). NÃO confundir com authUser legado. */
      authUserNew?: AuthUserNew;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

function deny(res: Response, code: string, status = 401): void {
  res.status(status).json({ error: code });
}

export const requireAuthCookie: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!raw) return deny(res, 'SESSION_MISSING');

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: {
        user: { select: { id: true, email: true, systemProfile: true, isActive: true } },
      },
    });

    if (!session || !session.user) return deny(res, 'SESSION_INVALID');
    if (!session.isActive || session.revokedAt) return deny(res, 'SESSION_REVOKED');
    if (!session.user.isActive) return deny(res, 'USER_DISABLED', 403);

    const nowMs = Date.now();
    if (nowMs > session.absoluteExpiresAt.getTime()) return deny(res, 'SESSION_EXPIRED_ABSOLUTE');
    if (nowMs > session.idleExpiresAt.getTime()) return deny(res, 'SESSION_EXPIRED_IDLE');

    // Sliding com guard de 30s: evita UPDATE em toda request (write storm)
    if (nowMs - session.lastUsedAt.getTime() >= 30_000) {
      const newIdle = new Date(nowMs + IDLE_MS);
      // Fire-and-forget: erro de update não derruba a request
      prisma.session
        .update({
          where: { id: session.id },
          data: { lastUsedAt: new Date(nowMs), idleExpiresAt: newIdle },
        })
        .catch((err) => console.error('[requireAuthCookie] sliding update failed:', err));
    }

    req.authUserNew = {
      userId: session.user.id,
      email: session.user.email,
      systemProfile: session.user.systemProfile,
      sessionId: session.id,
      acr: session.acr,
      authTime: session.authTime,
    };

    return next();
  } catch (err) {
    console.error('[requireAuthCookie]', err);
    return deny(res, 'AUTH_INTERNAL_ERROR', 500);
  }
};

/** Helper: confere systemProfile do usuário cookie-autenticado. */
export function hasProfileCookie(req: Request, profiles: string[]): boolean {
  const u = req.authUserNew;
  if (!u) return false;
  return profiles.includes(u.systemProfile);
}
