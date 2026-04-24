/**
 * Adaptador de auth durante transicao do refactor.
 *
 * Durante os Blocos 5-7, frontend ainda envia x-user-id (sera removido no Bloco 7).
 * Este modulo faz a ponte: se cookie de sessao existe e e valido, popula tanto
 * o req.authUserNew (formato novo) quanto o req.authUser + req.headers['x-user-id']
 * (formato legado), permitindo que controllers existentes continuem funcionando
 * sem modificacao imediata.
 *
 * SEGURANCA: quando cookie esta presente, sobrescrevemos x-user-id com o id real
 * da sessao validada. Cliente nao consegue mais forjar o header — backend confia
 * na sessao, nao no que veio do cliente.
 *
 * Sera removido no Bloco 12, junto com o refactor final dos controllers.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashToken } from './tokens';
import { SESSION_COOKIE } from './cookies';

const prisma = new PrismaClient();
const IDLE_MS = Number(process.env.SESSION_IDLE_MINUTES ?? 30) * 60_000;

/**
 * Tenta validar cookie de sessao. Se valido, popula req.authUserNew.
 * NAO retorna 401 em caso de ausencia ou invalidez — segue silenciosamente
 * pro proximo middleware (que pode ser o requireAuth legado, que valida x-user-id).
 */
export const requireAuthCookieOptional: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const raw = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!raw) return next();

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: {
        user: { select: { id: true, email: true, systemProfile: true, isActive: true } },
      },
    });

    if (!session || !session.user) return next();
    if (!session.isActive || session.revokedAt) return next();
    if (!session.user.isActive) return next();

    const nowMs = Date.now();
    if (nowMs > session.absoluteExpiresAt.getTime()) return next();
    if (nowMs > session.idleExpiresAt.getTime()) return next();

    // Sliding (idem requireAuth.ts)
    if (nowMs - session.lastUsedAt.getTime() >= 30_000) {
      const newIdle = new Date(nowMs + IDLE_MS);
      prisma.session
        .update({
          where: { id: session.id },
          data: { lastUsedAt: new Date(nowMs), idleExpiresAt: newIdle },
        })
        .catch((err) => console.error('[requireAuthCookieOptional] sliding update failed:', err));
    }

    req.authUserNew = {
      userId: session.user.id,
      email: session.user.email,
      systemProfile: session.user.systemProfile,
      sessionId: session.id,
      acr: session.acr,
      authTime: session.authTime,
    };

    next();
  } catch (err) {
    console.error('[requireAuthCookieOptional]', err);
    // Em caso de erro, segue silenciosamente (legacy auth pode salvar)
    next();
  }
};

/**
 * Se req.authUserNew existe (cookie validado), sobrescreve x-user-id no header
 * e popula req.authUser no formato legado. Garante que controllers existentes
 * leiam o user real da sessao, nao o que veio no header do cliente.
 *
 * Se req.authUserNew nao existe: nao faz nada, deixa o requireAuth legado decidir.
 */
export function bridgeAuthToLegacy(req: Request, _res: Response, next: NextFunction): void {
  const authNew = req.authUserNew;
  if (!authNew) return next();

  // Sobrescreve header x-user-id com user real da sessao
  // (controllers que ainda leem do header recebem o ID validado, nao o forjavel)
  req.headers['x-user-id'] = authNew.userId;

  // Popula req.authUser no formato legado { id, systemProfile }
  // (controllers que usam req.authUser direto)
  (req as Request & { authUser: { id: string; systemProfile: string } }).authUser = {
    id: authNew.userId,
    systemProfile: authNew.systemProfile,
  };

  next();
}
