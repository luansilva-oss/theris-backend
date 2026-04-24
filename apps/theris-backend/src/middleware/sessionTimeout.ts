import { Request, Response, NextFunction } from 'express';

/**
 * TODO(auth-refactor): re-implementar com nova Session/RefreshToken.
 * Lógica original removida no bloco 1 do refactor de auth (26/abr/2026).
 * O timeout agora é controlado por idleExpiresAt/absoluteExpiresAt em Session,
 * verificado dentro do novo requireAuth (Bloco 2).
 */
export async function checkSessionTimeout(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  return next();
}
