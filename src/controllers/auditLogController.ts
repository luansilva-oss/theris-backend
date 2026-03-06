import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SENSITIVE_KEYS = new Set(['mfaCode', 'mfaExpiresAt', 'lastPasswordChangeAt', 'senha', 'password', 'hash', 'passwordHash', 'token', 'secret']);

function filterSensitive(obj: unknown): unknown {
    if (obj == null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(filterSensitive);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        const lower = k.toLowerCase();
        if (SENSITIVE_KEYS.has(k) || lower.includes('senha') || lower.includes('password') || lower.includes('hash') || lower.includes('token') || lower.includes('secret')) continue;
        out[k] = filterSensitive(v);
    }
    return out;
}

/** GET /api/audit-log?entidadeId=xxx&entidadeTipo=Role&tipo=X&limit=20&offset=0&search=text&dataInicio=ISO&dataFim=ISO&autorNome=... */
export const getAuditLog = async (req: Request, res: Response) => {
    const userId = (req.headers['x-user-id'] as string)?.trim();
    if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { systemProfile: true } });
    if (!user || user.systemProfile === 'VIEWER') return res.status(403).json({ error: 'Acesso negado. Perfil VIEWER não pode acessar o histórico de auditoria.' });

    const entidadeId = req.query.entidadeId as string | undefined;
    const entidadeTipo = req.query.entidadeTipo as string | undefined;
    const tipo = req.query.tipo as string | undefined;
    const search = req.query.search as string | undefined;
    const dataInicio = req.query.dataInicio as string | undefined;
    const dataFim = req.query.dataFim as string | undefined;
    const autorNome = req.query.autorNome as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    try {
        const where: any = {};

        // Histórico do perfil do colaborador: incluir eventos User + Request AEX onde o usuário é o solicitante
        if (entidadeTipo === 'User' && entidadeId) {
            const requestIds = await prisma.request.findMany({
                where: { requesterId: entidadeId },
                select: { id: true },
            }).then(rows => rows.map(r => r.id));
            where.OR = [
                { entidadeTipo: 'User', entidadeId },
                ...(requestIds.length > 0 ? [{ entidadeTipo: 'Request', entidadeId: { in: requestIds } }] : []),
            ];
        } else {
            if (entidadeId) where.entidadeId = entidadeId;
            if (entidadeTipo) where.entidadeTipo = entidadeTipo;
        }

        if (tipo) where.tipo = tipo;
        if (search && search.trim()) where.descricao = { contains: search.trim(), mode: 'insensitive' };
        if (dataInicio || dataFim) {
            where.createdAt = {};
            if (dataInicio) where.createdAt.gte = new Date(dataInicio);
            if (dataFim) where.createdAt.lte = new Date(dataFim);
        }
        if (autorNome && autorNome.trim()) {
            where.autor = { name: { contains: autorNome.trim(), mode: 'insensitive' } };
        }

        const [rows, total] = await Promise.all([
            prisma.historicoMudanca.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: { autor: { select: { id: true, name: true, email: true } } },
            }),
            prisma.historicoMudanca.count({ where }),
        ]);

        const items = rows.map((r) => ({
            ...r,
            dadosAntes: r.dadosAntes ? filterSensitive(r.dadosAntes as object) : null,
            dadosDepois: r.dadosDepois ? filterSensitive(r.dadosDepois as object) : null,
        }));

        return res.json({ items, total, limit, offset });
    } catch (error) {
        console.error('Erro ao buscar histórico de auditoria:', error);
        if (error instanceof Error) console.error('Stack:', error.stack);
        return res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
};
