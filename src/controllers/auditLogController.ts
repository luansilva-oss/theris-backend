import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** GET /api/audit-log?entidadeId=xxx&entidadeTipo=Role&tipo=X&limit=20&offset=0&search=text&dataInicio=ISO&dataFim=ISO&autorNome=... */
export const getAuditLog = async (req: Request, res: Response) => {
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
        if (entidadeId) where.entidadeId = entidadeId;
        if (entidadeTipo) where.entidadeTipo = entidadeTipo;
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

        const [items, total] = await Promise.all([
            prisma.historicoMudanca.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: { autor: { select: { id: true, name: true, email: true } } },
            }),
            prisma.historicoMudanca.count({ where }),
        ]);

        return res.json({ items, total, limit, offset });
    } catch (error) {
        console.error('Erro ao buscar histórico de auditoria:', error);
        if (error instanceof Error) console.error('Stack:', error.stack);
        return res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
};
