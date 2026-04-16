import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /actions — lista todas as ações recorrentes
router.get('/', async (_req: Request, res: Response) => {
  try {
    const actions = await prisma.sgsiRecurringAction.findMany({
      where: { isActive: true },
      orderBy: { nextDueAt: 'asc' },
    });
    res.json(actions);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// GET /actions/:id — busca ação por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const action = await prisma.sgsiRecurringAction.findUnique({
      where: { id: req.params.id },
      include: { occurrences: { orderBy: { executedAt: 'desc' }, take: 10 } },
    });
    if (!action) {
      res.status(404).json({ error: 'Ação não encontrada.' });
      return;
    }
    res.json(action);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// POST /actions — cria nova ação recorrente
router.post('/', async (req: Request, res: Response) => {
  try {
    const action = await prisma.sgsiRecurringAction.create({ data: req.body });
    res.status(201).json(action);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// PATCH /actions/:id — atualiza ação recorrente
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const action = await prisma.sgsiRecurringAction.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(action);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// POST /actions/:id/complete — registra conclusão de uma ação
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { executedByEmail, notes, source } = req.body;
    const action = await prisma.sgsiRecurringAction.findUnique({
      where: { id: req.params.id },
    });
    if (!action) {
      res.status(404).json({ error: 'Ação não encontrada.' });
      return;
    }

    // Calcula próxima data baseado na frequência
    const nextDueAt = calcularProximaData(action.frequency, new Date());

    const [occurrence] = await prisma.$transaction([
      prisma.sgsiOccurrence.create({
        data: {
          actionId: action.id,
          executedByEmail,
          notes,
          source: source || 'PANEL',
          result: 'COMPLETED',
        },
      }),
      prisma.sgsiRecurringAction.update({
        where: { id: action.id },
        data: {
          status: 'SCHEDULED',
          lastDoneAt: new Date(),
          nextDueAt,
        },
      }),
    ]);

    res.json({ occurrence, nextDueAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

function calcularProximaData(frequency: string, from: Date): Date {
  const next = new Date(from);
  switch (frequency) {
    case 'DAILY':      next.setDate(next.getDate() + 1); break;
    case 'WEEKLY':     next.setDate(next.getDate() + 7); break;
    case 'BIWEEKLY':   next.setDate(next.getDate() + 14); break;
    case 'MONTHLY':    next.setMonth(next.getMonth() + 1); break;
    case 'QUARTERLY':  next.setMonth(next.getMonth() + 3); break;
    case 'SEMIANNUAL': next.setMonth(next.getMonth() + 6); break;
    case 'ANNUAL':     next.setFullYear(next.getFullYear() + 1); break;
    default:           next.setMonth(next.getMonth() + 1); break;
  }
  return next;
}

export default router;
