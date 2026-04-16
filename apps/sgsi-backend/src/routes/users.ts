import { Router, Request, Response } from 'express';
import { therisClient } from '../integrations/therisClient';

const router = Router();

// GET /users — lista usuários ativos do Theris
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await therisClient.getUsers();
    res.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// GET /users/si-members — membros do time de SI
router.get('/si-members', async (_req: Request, res: Response) => {
  try {
    const members = await therisClient.getSiMembers();
    res.json(members);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// GET /users/board — membros do Board
router.get('/board', async (_req: Request, res: Response) => {
  try {
    const members = await therisClient.getBoardMembers();
    res.json(members);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// GET /users/by-email/:email — busca usuário por email
router.get('/by-email/:email', async (req: Request, res: Response) => {
  try {
    const user = await therisClient.getUserByEmail(req.params.email);
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

export default router;
