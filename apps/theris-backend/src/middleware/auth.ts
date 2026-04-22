import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkSessionTimeout } from './sessionTimeout';

const prisma = new PrismaClient();

/** Rotas que não exigem autenticação (originalUrl começa com /api/...) */
const AUTH_EXEMPT: { method: string; pathPrefix: string }[] = [
  { method: 'POST', pathPrefix: '/api/login/google' },
  { method: 'POST', pathPrefix: '/api/auth/send-mfa' },
  { method: 'POST', pathPrefix: '/api/auth/verify-mfa' },
  { method: 'GET', pathPrefix: '/api/health' },
];

function isAuthExempt(req: Request): boolean {
  const url = (req.originalUrl || req.url || '').split('?')[0];
  if (url.startsWith('/api/slack') || url.startsWith('/api/webhooks')) return true;
  if (url.startsWith('/api/sgsi-integration')) return true;
  return AUTH_EXEMPT.some((e) => e.method === req.method && (url === e.pathPrefix || url.startsWith(e.pathPrefix + '/')));
}

/**
 * Middleware de autenticação global para /api:
 * - Rotas exempt (login, auth, health, slack, webhooks) passam sem checar.
 * - Demais: exige x-user-id, valida sessão (checkSessionTimeout), carrega usuário e anexa em req.authUser.
 * - Se x-user-id não for enviado ou sessão inválida → 401.
 * - Se usuário não existir no banco → 403 (não confiar cegamente no header).
 *
 * O header `x-user-id` sozinho é forjável pelo cliente; a identidade confiável após este middleware é
 * `req.authUser` (validada contra o banco + sessão). Rate limits e regras de negócio devem usar `authUser.id`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthExempt(req)) return next();

  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) {
    res.status(401).json({ error: 'Não autorizado. Envie o header x-user-id.' });
    return;
  }

  checkSessionTimeout(req, res, () => {
    prisma.user
      .findUnique({
        where: { id: userId },
        select: { id: true, systemProfile: true },
      })
      .then((user) => {
        if (!user) {
          res.status(403).json({ error: 'Forbidden. Usuário não encontrado.' });
          return;
        }
        (req as Request & { authUser: { id: string; systemProfile: string } }).authUser = user;
        next();
      })
      .catch(() => {
        res.status(500).json({ error: 'Erro ao verificar autenticação.' });
      });
  });
}

/** Helper: retorna true se o usuário autenticado tem um dos perfis permitidos */
export function hasProfile(req: Request, profiles: string[]): boolean {
  const authUser = (req as Request & { authUser?: { id: string; systemProfile: string } }).authUser;
  if (!authUser) return false;
  return profiles.includes(authUser.systemProfile);
}
