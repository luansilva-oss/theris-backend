import { Request, Response, NextFunction } from 'express';

export function requireServiceToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-service-token'] as string;
  const expected = process.env.SGSI_SERVICE_TOKEN;

  if (!expected) {
    res.status(500).json({ error: 'SGSI_SERVICE_TOKEN não configurado no servidor.' });
    return;
  }

  if (!token || token !== expected) {
    res.status(401).json({ error: 'Token de serviço inválido ou ausente.' });
    return;
  }

  next();
}
