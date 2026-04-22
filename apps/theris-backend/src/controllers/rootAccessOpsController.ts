import { Request, Response } from 'express';
import { z } from 'zod';
import { hasProfile } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { REQUEST_TYPES } from '../types/requestTypes';
import type { RootAccessDetails } from '../types/rootAccess';
import { revokeAccessRequest } from '../services/accessRequestRevoke';
import { rowMatchesRootAccessFilters, type RootAccessFilterParams, type RootAccessFilterRow } from '../lib/rootAccessReportFilters';
import { computeEffectiveStatus, type EffectiveStatus } from '../utils/rootAccessStatus';

const revokeBodySchema = z.object({
  reason: z.string().trim().min(10).max(500)
});

const exportQuerySchema = z.object({
  type: z.literal('ROOT_ACCESS'),
  from: z.coerce.date(),
  to: z.coerce.date(),
  status: z.string().optional(),
  userId: z.string().uuid().optional(),
  deviceId: z.string().optional(),
  searchTerm: z.string().optional()
});

function parseDetailsForCsv(raw: string | null): RootAccessDetails | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RootAccessDetails;
  } catch {
    return null;
  }
}

const STATUS_LABELS: Record<EffectiveStatus, string> = {
  PENDING_SI: 'Aguardando SI',
  APROVADO: 'Aprovado (aguardando JC)',
  APPLIED: 'Aplicado',
  REJECTED: 'Reprovado',
  FAILED: 'Falha JC',
  EXPIRED: 'Expirado',
  REVOKED_EARLY: 'Revogado antecipadamente',
  REVOKED_EXPIRED: 'Revogado (expirado)'
};

function effectiveStatusLabel(
  status: string,
  details: RootAccessDetails | null,
  revokeTrigger: 'CRON_EXPIRED' | 'ADMIN_EARLY' | null | undefined
): string {
  const s = computeEffectiveStatus(status, details?.statusJc ?? null, revokeTrigger ?? undefined);
  return STATUS_LABELS[s] ?? s;
}

/** POST /api/requests/:id/revoke — ROOT_ACCESS aplicado; apenas ADMIN/SUPER_ADMIN. */
export async function postRevokeRootAccessRequest(req: Request, res: Response): Promise<void> {
  if (!hasProfile(req, ['ADMIN', 'SUPER_ADMIN'])) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const authUser = (req as Request & { authUser: { id: string; systemProfile: string } }).authUser;
  const id = (req.params.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const parsed = revokeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Motivo inválido', details: parsed.error.flatten() });
    return;
  }

  const result = await revokeAccessRequest({
    requestId: id,
    trigger: 'ADMIN_EARLY',
    triggeredById: authUser.id,
    reason: parsed.data.reason
  });

  if (result.ok === false) {
    if (['invalid_status', 'wrong_type', 'missing_access_request'].includes(result.error)) {
      res.status(409).json({ error: result.error });
      return;
    }
    res.status(500).json({ error: result.error });
    return;
  }

  const fresh = await prisma.request.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      revokedBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!fresh) {
    res.status(200).json({ ok: true });
    return;
  }

  const details = parseDetailsForCsv(fresh.details);
  let detailsSafe: Omit<RootAccessDetails, 'rawAccessRequestResponse'> | null = null;
  if (details) {
    const { rawAccessRequestResponse: _omit, ...rest } = details;
    detailsSafe = rest;
  }

  res.status(200).json({
    id: fresh.id,
    createdAt: fresh.createdAt,
    updatedAt: fresh.updatedAt,
    status: fresh.status,
    siApprovedAt: fresh.siApprovedAt,
    siApprovedBy: fresh.siApprovedBy,
    justification: fresh.justification ?? '',
    requester: fresh.requester,
    approver: fresh.approver,
    revokedAt: fresh.revokedAt,
    revokedBy: fresh.revokedBy,
    revokeReason: fresh.revokeReason,
    revokeTrigger: fresh.revokeTrigger,
    details: detailsSafe
  });
}

/** GET /api/requests/export?type=ROOT_ACCESS&from=&to= — apenas ADMIN/SUPER_ADMIN; CSV UTF-8 BOM `;`. */
export async function getRootAccessExportCsv(req: Request, res: Response): Promise<void> {
  if (!hasProfile(req, ['ADMIN', 'SUPER_ADMIN'])) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const q = exportQuerySchema.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: 'Parâmetros inválidos', details: q.error.flatten() });
    return;
  }

  const fromD = q.data.from;
  const toD = q.data.to;
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    res.status(400).json({ error: 'Datas inválidas' });
    return;
  }
  if (toD.getTime() < fromD.getTime()) {
    res.status(400).json({ error: 'Intervalo inválido' });
    return;
  }
  if (toD.getTime() - fromD.getTime() > 180 * 86400000) {
    res.status(400).json({ error: 'Janela máxima: 180 dias' });
    return;
  }

  const statusTokens = (q.data.status || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as EffectiveStatus[];

  const filterParams: RootAccessFilterParams = {
    searchTerm: q.data.searchTerm,
    startDate: fromD.toISOString().slice(0, 10),
    endDate: toD.toISOString().slice(0, 10),
    userId: q.data.userId,
    deviceId: q.data.deviceId,
    statusFilter: 'ALL'
  };

  const rows = await prisma.request.findMany({
    where: {
      type: REQUEST_TYPES.ROOT_ACCESS,
      createdAt: { gte: fromD, lte: toD }
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      revokedBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const toFilterRow = (r: (typeof rows)[number]): RootAccessFilterRow => ({
    id: r.id,
    createdAt: r.createdAt,
    status: r.status,
    requesterId: r.requesterId,
    requester: r.requester,
    details: r.details,
    revokedAt: r.revokedAt,
    revokeTrigger: r.revokeTrigger
  });

  let filtered = rows.filter((r) => rowMatchesRootAccessFilters(toFilterRow(r), filterParams));

  if (statusTokens.length > 0) {
    filtered = filtered.filter((r) => {
      const d = parseDetailsForCsv(r.details);
      const eff = computeEffectiveStatus(r.status, d?.statusJc ?? null, r.revokeTrigger ?? undefined);
      return statusTokens.includes(eff);
    });
  }

  const records = filtered.map((row) => {
    const d = parseDetailsForCsv(row.details);
    const ttlHours = d?.ttlSegundos != null ? (d.ttlSegundos / 3600).toFixed(2) : '';
    return {
      id: row.id,
      criadoEm: row.createdAt.toISOString(),
      solicitante: row.requester?.name ?? '',
      deviceName: d?.hostname ?? '',
      status: effectiveStatusLabel(row.status, d, row.revokeTrigger),
      motivo: row.justification ?? '',
      ttlHours,
      aprovadoEm: row.siApprovedAt?.toISOString() ?? '',
      aprovador: row.approver?.name ?? '',
      revokedAt: row.revokedAt?.toISOString() ?? '',
      revokeTrigger: row.revokeTrigger ?? '',
      revokeReason: row.revokeReason ?? ''
    };
  });

  const columns = [
    { key: 'id', header: 'id' },
    { key: 'criadoEm', header: 'criadoEm' },
    { key: 'solicitante', header: 'solicitante' },
    { key: 'deviceName', header: 'deviceName' },
    { key: 'status', header: 'status' },
    { key: 'motivo', header: 'motivo' },
    { key: 'ttlHours', header: 'ttlHours' },
    { key: 'aprovadoEm', header: 'aprovadoEm' },
    { key: 'aprovador', header: 'aprovador' },
    { key: 'revokedAt', header: 'revokedAt' },
    { key: 'revokeTrigger', header: 'revokeTrigger' },
    { key: 'revokeReason', header: 'revokeReason' }
  ];

  const d1 = fromD.toISOString().slice(0, 10);
  const d2 = toD.toISOString().slice(0, 10);
  const filename = `infra-requests-${d1}-${d2}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  if (records.length > 1000) {
    const { stringify: createStringify } = await import('csv-stringify');
    const stringifier = createStringify({
      header: true,
      columns: columns.map((c) => ({ key: c.key, header: c.header })),
      delimiter: ';',
      bom: true
    });
    stringifier.pipe(res);
    for (const rec of records) {
      stringifier.write(rec);
    }
    stringifier.end();
    return;
  }

  const { stringify: stringifySync } = await import('csv-stringify/sync');
  const csv = stringifySync(records, {
    header: true,
    columns: columns.map((c) => ({ key: c.key, header: c.header })),
    delimiter: ';',
    bom: true
  });
  res.send(csv);
}
