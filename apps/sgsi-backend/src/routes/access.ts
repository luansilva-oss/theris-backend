import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /access — lista todos os usuários com acesso ao SGSI
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.sgsiUserAccess.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// POST /access — concede acesso ao SGSI para um usuário
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, role } = req.body;
    const user = await prisma.sgsiUserAccess.upsert({
      where: { email },
      create: { email, name, role: role || 'VIEWER' },
      update: { name, role: role || 'VIEWER', isActive: true },
    });
    res.status(201).json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// PATCH /access/:email — atualiza papel do usuário no SGSI
router.patch('/:email', async (req: Request, res: Response) => {
  try {
    const { role, isActive } = req.body;
    const user = await prisma.sgsiUserAccess.update({
      where: { email: req.params.email },
      data: { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
    });
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// DELETE /access/:email — revoga acesso ao SGSI (soft delete)
router.delete('/:email', async (req: Request, res: Response) => {
  try {
    const user = await prisma.sgsiUserAccess.update({
      where: { email: req.params.email },
      data: { isActive: false },
    });
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

export default router;
