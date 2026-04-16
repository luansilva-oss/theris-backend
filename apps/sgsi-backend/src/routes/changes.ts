import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /changes — lista todas as mudanças
router.get('/', async (_req: Request, res: Response) => {
  try {
    const changes = await prisma.sgsiChange.findMany({
      orderBy: { reportedAt: 'desc' },
    });
    res.json(changes);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// GET /changes/:id — busca mudança por ID com impactos
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const change = await prisma.sgsiChange.findUnique({
      where: { id: req.params.id },
      include: {
        impacts: {
          include: { action: { select: { id: true, name: true, frequency: true } } },
        },
      },
    });
    if (!change) {
      res.status(404).json({ error: 'Mudança não encontrada.' });
      return;
    }
    res.json(change);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// POST /changes — registra nova mudança urgente
router.post('/', async (req: Request, res: Response) => {
  try {
    const change = await prisma.sgsiChange.create({ data: req.body });
    res.status(201).json(change);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// PATCH /changes/:id — atualiza mudança (status, decisão, data de reunião)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const change = await prisma.sgsiChange.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(change);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// POST /changes/:id/decide — registra decisão e fecha a mudança
router.post('/:id/decide', async (req: Request, res: Response) => {
  try {
    const { decision, decisionMakers } = req.body;
    const change = await prisma.sgsiChange.update({
      where: { id: req.params.id },
      data: {
        decision,
        decisionMakers,
        decidedAt: new Date(),
        status: 'DECISION_RECORDED',
      },
    });
    res.json(change);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// POST /changes/:id/close — encerra a mudança
router.post('/:id/close', async (_req: Request, res: Response) => {
  try {
    const change = await prisma.sgsiChange.update({
      where: { id: _req.params.id },
      data: { status: 'CLOSED' },
    });
    res.json(change);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// POST /changes/:id/impacts — vincula ação recorrente impactada
router.post('/:id/impacts', async (req: Request, res: Response) => {
  try {
    const { actionId, impactDescription } = req.body;
    const impact = await prisma.sgsiChangeImpact.create({
      data: {
        changeId: req.params.id,
        actionId,
        impactDescription,
      },
    });
    res.status(201).json(impact);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

export default router;
