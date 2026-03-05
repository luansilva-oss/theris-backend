"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLog = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/** GET /api/audit-log?entidadeId=xxx&entidadeTipo=Role&tipo=X&limit=20&offset=0&search=text&dataInicio=ISO&dataFim=ISO&autorNome=... */
const getAuditLog = async (req, res) => {
    const entidadeId = req.query.entidadeId;
    const entidadeTipo = req.query.entidadeTipo;
    const tipo = req.query.tipo;
    const search = req.query.search;
    const dataInicio = req.query.dataInicio;
    const dataFim = req.query.dataFim;
    const autorNome = req.query.autorNome;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    try {
        const where = {};
        if (entidadeId)
            where.entidadeId = entidadeId;
        if (entidadeTipo)
            where.entidadeTipo = entidadeTipo;
        if (tipo)
            where.tipo = tipo;
        if (search && search.trim())
            where.descricao = { contains: search.trim(), mode: 'insensitive' };
        if (dataInicio || dataFim) {
            where.createdAt = {};
            if (dataInicio)
                where.createdAt.gte = new Date(dataInicio);
            if (dataFim)
                where.createdAt.lte = new Date(dataFim);
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
    }
    catch (error) {
        console.error('Erro ao buscar histórico de auditoria:', error);
        return res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
};
exports.getAuditLog = getAuditLog;
