import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos

/** Verifica inatividade e atualiza lastActivity. Retorna 401 SESSION_EXPIRED se expirado. */
export async function checkSessionTimeout(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return next();

  try {
    const session = await prisma.session.findUnique({ where: { userId } });
    const now = new Date();
    if (!session) {
      res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Sessão expirada por inatividade.' });
      return;
    }
    const elapsed = now.getTime() - session.lastActivity.getTime();
    if (elapsed > SESSION_TIMEOUT_MS) {
      await prisma.session.delete({ where: { userId } }).catch(() => {});
      res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Sessão expirada por inatividade.' });
      return;
    }
    await prisma.session.update({
      where: { userId },
      data: { lastActivity: now }
    });
    next();
  } catch (e) {
    console.error('[sessionTimeout]', e);
    res.status(500).json({ error: 'Erro ao verificar sessão.' });
  }
}
