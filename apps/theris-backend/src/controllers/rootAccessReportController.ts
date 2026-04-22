import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { RootAccessDetails } from '../types/rootAccess';
import { REQUEST_TYPES } from '../types/requestTypes';

const prisma = new PrismaClient();

/** Perfis que veem todos os ROOT_ACCESS no relatório (GESTOR: PR futuro com filtro por subordinados). */
const CAN_SEE_ALL_ROOT_ACCESS_REPORT = new Set(['ADMIN', 'SUPER_ADMIN']);

function parseDetailsJson(raw: string | null | undefined): RootAccessDetails | null {
  if (raw == null || raw === '') return null;
  try {
    return JSON.parse(raw) as RootAccessDetails;
  } catch {
    return null;
  }
}

/** Remove payload bruto de debug antes de enviar ao cliente. */
function sanitizeDetails(details: RootAccessDetails | null): Omit<RootAccessDetails, 'rawAccessRequestResponse'> | null {
  if (!details) return null;
  const { rawAccessRequestResponse: _omit, ...rest } = details;
  return rest;
}

const approverSelect = { id: true, name: true, email: true } as const;
const requesterSelect = { id: true, name: true, email: true } as const;

export async function getRootAccessReport(req: Request, res: Response): Promise<void> {
  const authUser = (req as Request & { authUser: { id: string; systemProfile: string } }).authUser;
  if (!authUser) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const whereClause: { type: string; requesterId?: string } = {
    type: REQUEST_TYPES.ROOT_ACCESS
  };

  if (authUser.systemProfile === 'VIEWER') {
    whereClause.requesterId = authUser.id;
  } else if (!CAN_SEE_ALL_ROOT_ACCESS_REPORT.has(authUser.systemProfile)) {
    res.json([]);
    return;
  }

  try {
    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        requester: { select: requesterSelect },
        approver: { select: approverSelect }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = requests.map((row) => {
      const details = parseDetailsJson(row.details);
      return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        status: row.status,
        siApprovedAt: row.siApprovedAt,
        justification: row.justification ?? '',
        requester: row.requester,
        approver: row.approver,
        details: sanitizeDetails(details)
      };
    });

    res.json(enriched);
  } catch (e) {
    console.error('[getRootAccessReport]', e);
    res.status(500).json({ error: 'Erro ao carregar relatório.' });
  }
}

export async function getRootAccessDetail(req: Request, res: Response): Promise<void> {
  const authUser = (req as Request & { authUser: { id: string; systemProfile: string } }).authUser;
  if (!authUser) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const { id } = req.params;
  if (!id?.trim()) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }

  try {
    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        requester: { select: requesterSelect },
        approver: { select: approverSelect }
      }
    });

    if (!request || request.type !== REQUEST_TYPES.ROOT_ACCESS) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const canSeeAll = CAN_SEE_ALL_ROOT_ACCESS_REPORT.has(authUser.systemProfile);
    const canSeeOwn = authUser.systemProfile === 'VIEWER';

    if (!canSeeAll && !canSeeOwn) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (canSeeOwn && request.requesterId !== authUser.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const details = parseDetailsJson(request.details);

    res.json({
      id: request.id,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      status: request.status,
      siApprovedAt: request.siApprovedAt,
      siApprovedBy: request.siApprovedBy,
      justification: request.justification ?? '',
      requester: request.requester,
      approver: request.approver,
      details: sanitizeDetails(details)
    });
  } catch (e) {
    console.error('[getRootAccessDetail]', e);
    res.status(500).json({ error: 'Erro ao carregar registro.' });
  }
}
