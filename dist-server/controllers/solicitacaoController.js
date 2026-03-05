"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAttachment = exports.createComment = exports.updateSolicitacaoMetadata = exports.getSolicitacaoById = exports.updateSolicitacao = exports.getMyTickets = exports.getSolicitacoes = exports.createSolicitacao = void 0;
const client_1 = require("@prisma/client");
const cloudinary_1 = require("cloudinary");
const slackService_1 = require("../services/slackService");
const prisma = new client_1.PrismaClient();
// Cloudinary: config via variáveis de ambiente ou CLOUDINARY_URL
if (process.env.CLOUDINARY_URL) {
    cloudinary_1.v2.config({ url: process.env.CLOUDINARY_URL });
}
else if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}
// Bypass RH: solicitante Renata Czapiewski Silva pula gestor e vai direto para SI
const RH_BYPASS_REQUESTER_NAME = 'Renata Czapiewski Silva';
function isRhBypassRequester(name) {
    const n = (name || '').trim();
    return n === RH_BYPASS_REQUESTER_NAME || n.toLowerCase().includes('renata czapiewski');
}
// Aprovadores SI autorizados para solicitações com bypass (Renata): Luan Matheus, Allan Von Stain, Vladimir Sesar.
// Defina no .env: SI_BYPASS_APPROVER_EMAILS=email1@empresa.com,email2@empresa.com,email3@empresa.com
const SI_BYPASS_APPROVER_EMAILS = (process.env.SI_BYPASS_APPROVER_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
/** Tipos de solicitação que representam desligamento/offboarding (ao aprovar, desvincular o colaborador alvo). */
const OFFBOARDING_REQUEST_TYPES = ['FIRING', 'DEMISSAO', 'OFFBOARDING'];
/** Tipos de solicitação que representam admissão/onboarding (ao aprovar, vincular colaborador a departamento e cargo). */
const ONBOARDING_REQUEST_TYPES = ['HIRING', 'ADMISSAO', 'ONBOARDING'];
/**
 * Automação: ao aprovar um chamado de desligamento, desvincula o colaborador alvo da estrutura (soft-delete).
 * O alvo é identificado por: details.targetUserId | details.collaboratorId | details.collaboratorEmail | details.collaboratorName (busca por nome).
 */
async function runOffboardingAutomation(requestId, requestType, detailsJson) {
    if (!OFFBOARDING_REQUEST_TYPES.includes(requestType))
        return;
    let details = {};
    try {
        details = typeof detailsJson === 'string' ? JSON.parse(detailsJson || '{}') : (detailsJson || {});
    }
    catch {
        return;
    }
    const d = details;
    let targetUser = null;
    const targetUserId = d.targetUserId || d.collaboratorId;
    if (targetUserId) {
        const u = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true } });
        if (u)
            targetUser = u;
    }
    if (!targetUser && d.collaboratorEmail) {
        const u = await prisma.user.findUnique({ where: { email: d.collaboratorEmail.trim() }, select: { id: true, name: true } });
        if (u)
            targetUser = u;
    }
    if (!targetUser && (d.collaboratorName || d.substitute)) {
        const name = (d.collaboratorName || d.substitute || '').trim();
        if (name) {
            const u = await prisma.user.findFirst({
                where: { name: { equals: name, mode: 'insensitive' } },
                select: { id: true, name: true }
            });
            if (u)
                targetUser = u;
        }
    }
    if (!targetUser) {
        console.warn(`[Automação] Desligamento: chamado ${requestId} aprovado, mas não foi possível identificar o colaborador alvo (targetUserId/collaboratorEmail/collaboratorName).`);
        return;
    }
    await prisma.user.update({
        where: { id: targetUser.id },
        data: {
            roleId: null,
            departmentId: null,
            unitId: null,
            jobTitle: null,
            managerId: null,
            isActive: false
        }
    });
    console.log(`[Automação] Usuário ${targetUser.name} (${targetUser.id}) desligado com sucesso após aprovação do chamado ${requestId}.`);
}
/**
 * Automação de Onboarding: ao aprovar um chamado de contratação (HIRING, ADMISSAO, ONBOARDING),
 * respeita a hierarquia Unidade → Departamento → Cargo: busca/cria cada nível e vincula o colaborador.
 * Dados extraídos de request.details: unit/Unidade, department/Depto/dept, role/Cargo, collaboratorName/Colaborador, collaboratorEmail/email.
 */
async function runOnboardingAutomation(requestId, request) {
    if (!ONBOARDING_REQUEST_TYPES.includes(request.type))
        return;
    let d = {};
    try {
        d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
    }
    catch {
        return;
    }
    const details = d;
    const collaboratorName = (details.collaboratorName || details.Colaborador || details.target || details.name || '').trim();
    const roleName = (details.role || details.Cargo || details.cargo || details.jobTitle || '').trim();
    const departmentName = (details.department || details.Depto || details.dept || '').trim();
    const unitName = (details.unit || details.unitName || details.Unidade || details.unidade || '').trim();
    const collaboratorEmail = (details.collaboratorEmail || details.email || details.targetEmail || '').trim();
    if (!departmentName) {
        console.warn(`[Automação Onboarding] Chamado ${requestId}: departamento não informado nos detalhes. Ignorando.`);
        return;
    }
    if (!roleName) {
        console.warn(`[Automação Onboarding] Chamado ${requestId}: cargo não informado nos detalhes. Ignorando.`);
        return;
    }
    if (!collaboratorName && !collaboratorEmail) {
        console.warn(`[Automação Onboarding] Chamado ${requestId}: colaborador (nome ou e-mail) não informado. Ignorando.`);
        return;
    }
    // a) Unidade: buscar por nome (case-insensitive). Se não vier no payload, department será buscado/criado sem unitId (compatibilidade).
    let unit = null;
    if (unitName) {
        unit = await prisma.unit.findFirst({
            where: { name: { equals: unitName, mode: 'insensitive' } },
            select: { id: true, name: true }
        });
        if (!unit) {
            console.warn(`[Automação Onboarding] Chamado ${requestId}: unidade "${unitName}" não encontrada no catálogo. Departamento será criado sem vínculo à unidade.`);
        }
    }
    // b) Departamento: buscar pelo nome E pelo unitId (quando houver unidade); se não existir, criar vinculando ao unitId
    let department = await prisma.department.findFirst({
        where: {
            name: { equals: departmentName, mode: 'insensitive' },
            ...(unit ? { unitId: unit.id } : { unitId: null })
        }
    });
    if (!department) {
        department = await prisma.department.create({
            data: { name: departmentName, unitId: unit?.id ?? null }
        });
    }
    // c) Cargo: buscar pelo nome e departmentId; se não existir, criar
    let role = await prisma.role.findFirst({
        where: {
            departmentId: department.id,
            name: { equals: roleName, mode: 'insensitive' }
        }
    });
    if (!role) {
        role = await prisma.role.create({
            data: { name: roleName, departmentId: department.id }
        });
    }
    // d) Colaborador (User): upsert — roleId, departmentId, unitId, jobTitle, isActive
    let user = collaboratorEmail
        ? await prisma.user.findUnique({ where: { email: collaboratorEmail } })
        : null;
    if (!user && collaboratorName) {
        user = await prisma.user.findFirst({
            where: { name: { equals: collaboratorName, mode: 'insensitive' } }
        });
    }
    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                roleId: role.id,
                departmentId: department.id,
                unitId: unit?.id ?? null,
                jobTitle: role.name,
                isActive: true
            }
        });
        console.log(`[Automação Onboarding] Unidade/Depto/Cargo validados e colaborador ${user.name} vinculado com sucesso (Chamado ${requestId}).`);
        return;
    }
    if (!collaboratorEmail) {
        console.warn(`[Automação Onboarding] Chamado ${requestId}: colaborador "${collaboratorName}" não encontrado na base e e-mail não informado. Não foi possível criar usuário.`);
        return;
    }
    await prisma.user.create({
        data: {
            name: collaboratorName || collaboratorEmail.split('@')[0],
            email: collaboratorEmail,
            departmentId: department.id,
            unitId: unit?.id ?? null,
            jobTitle: role.name,
            roleId: role.id,
            isActive: true
        }
    });
    console.log(`[Automação Onboarding] Unidade/Depto/Cargo validados e colaborador ${collaboratorName || collaboratorEmail} criado e vinculado com sucesso (Chamado ${requestId}).`);
}
/** Tipos de solicitação que ao serem aprovados concedem acesso extraordinário (vinculam usuário à ferramenta na tabela Access). */
const EXTRAORDINARY_ACCESS_REQUEST_TYPES = ['ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO', 'ACCESS_TOOL_EXTRA'];
/**
 * Automação: ao aprovar um chamado de acesso extraordinário, vincula o colaborador (requester) à ferramenta na tabela Access com isExtraordinary = true.
 * Usado tanto no fluxo de aprovação (updateSolicitacao) quanto quando o status é alterado para APROVADO via updateSolicitacaoMetadata.
 */
async function runExtraordinaryAccessAutomation(requestId, request) {
    if (!request.requesterId)
        return;
    if (!EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) && !request.isExtraordinary)
        return;
    let d = {};
    try {
        d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
    }
    catch {
        return;
    }
    const toolId = typeof d.toolId === 'string' ? d.toolId.trim() : null;
    const toolName = (d.tool || d.toolName || (d.info && typeof d.info === 'string' ? d.info.split(': ')[1] : null) || '').trim();
    const targetUserId = request.requesterId;
    const levelRequested = (d.target || d.targetValue);
    if (!toolId && !toolName)
        return;
    const tool = toolId
        ? await prisma.tool.findUnique({ where: { id: toolId } })
        : await prisma.tool.findFirst({
            where: {
                OR: [
                    { name: { contains: toolName, mode: 'insensitive' } },
                    { acronym: { equals: toolName, mode: 'insensitive' } }
                ]
            }
        });
    if (!tool) {
        console.warn(`[Automação] Acesso extraordinário: ferramenta "${toolId || toolName}" não encontrada no catálogo (chamado ${requestId}).`);
        return;
    }
    const existing = await prisma.access.findFirst({
        where: { userId: targetUserId, toolId: tool.id }
    });
    const isExtra = request.isExtraordinary ?? EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type);
    const duration = request.extraordinaryDuration ?? (d.duration != null ? parseInt(String(d.duration), 10) : null);
    const unit = (request.extraordinaryUnit ?? d.unit);
    const statusValue = (levelRequested && String(levelRequested).trim()) || 'ACTIVE';
    if (existing) {
        await prisma.access.update({
            where: { id: existing.id },
            data: {
                status: statusValue,
                isExtraordinary: isExtra,
                ...(duration != null && { duration }),
                ...(unit != null && { unit })
            }
        });
    }
    else {
        await prisma.access.create({
            data: {
                toolId: tool.id,
                userId: targetUserId,
                status: statusValue,
                isExtraordinary: isExtra,
                ...(duration != null && { duration }),
                ...(unit != null && { unit })
            }
        });
    }
    console.log(`[Automação] Acesso extraordinário concedido: usuário ${targetUserId} vinculado à ferramenta ${tool.name} (chamado ${requestId}).`);
}
// ============================================================
// AUXILIAR: Encontrar Aprovador da Ferramenta (Lógica Avançada)
// ============================================================
async function findToolApprover(toolName, requesterId) {
    const tool = await prisma.tool.findFirst({
        where: {
            OR: [
                { name: { contains: toolName, mode: 'insensitive' } },
                { name: { equals: toolName } }
            ]
        },
        include: { owner: true, subOwner: true }
    });
    if (!tool)
        return { approverId: null, role: 'SI_ANALYST', status: 'PENDENTE_SI' };
    const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        include: { manager: true }
    });
    const managerId = requester?.managerId;
    // REGRA 1: Gestor Imediato aprova primeiro
    if (managerId) {
        // SE o Gestor Imediato NÃO for o Owner, ele aprova
        if (tool.ownerId !== managerId) {
            return { approverId: managerId, role: 'MANAGER', status: 'PENDENTE_GESTOR' };
        }
        // REGRA 2: Se Gestor == Owner, tenta Sub-owner
        if (tool.subOwnerId && tool.subOwnerId !== managerId) {
            return { approverId: tool.subOwnerId, role: 'TOOL_SUB_OWNER', status: 'PENDENTE_SUB_OWNER' };
        }
    }
    // REGRA 3: Se não tem gestor, ou gestor é owner e não tem sub-owner (ou sub-owner também é gestor), vai para SI
    return { approverId: null, role: 'SI_ANALYST', status: 'PENDENTE_SI' };
}
// ============================================================
// 1. CRIAR SOLICITAÇÃO (POST)
// ============================================================
const createSolicitacao = async (req, res) => {
    try {
        const { requesterId, type, details, justification, isExtraordinary } = req.body;
        const safeRequesterId = String(requesterId);
        const safeType = String(type);
        let detailsObj = {};
        let detailsString = '';
        try {
            if (typeof details === 'string') {
                detailsObj = JSON.parse(details);
                detailsString = details;
            }
            else {
                detailsObj = details;
                detailsString = JSON.stringify(details);
            }
        }
        catch (e) {
            detailsString = '{}';
        }
        let approverId = null;
        let currentApproverRole = 'MANAGER';
        let status = 'PENDENTE_GESTOR';
        // ROTA A: FERRAMENTAS / ACESSOS / EXTRAORDINÁRIO
        if (['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO', 'ACCESS_TOOL_EXTRA'].includes(safeType) || isExtraordinary) {
            status = 'PENDENTE_SI';
            currentApproverRole = 'SI_ANALYST';
            approverId = null;
        }
        // ROTA B: GESTÃO DE PESSOAS / DEPUTY — gestor aprova; exceção: Renata Czapiewski Silva vai direto para SI
        else if (['DEPUTY_DESIGNATION', 'CHANGE_ROLE', 'HIRING', 'FIRING', 'PROMOCAO', 'DEMISSAO', 'ADMISSAO'].includes(safeType)) {
            const requester = await prisma.user.findUnique({
                where: { id: safeRequesterId },
                include: { manager: true }
            });
            if (isRhBypassRequester(requester?.name)) {
                status = 'PENDENTE_SI';
                currentApproverRole = 'SI_ANALYST';
                approverId = null;
                detailsObj = { ...detailsObj, bypassGestor: true };
                detailsString = JSON.stringify(detailsObj);
            }
            else if (requester?.managerId) {
                approverId = requester.managerId;
                status = 'PENDENTE_GESTOR';
                currentApproverRole = 'MANAGER';
            }
            else {
                status = 'PENDENTE_SI';
                currentApproverRole = 'SI_ANALYST';
                approverId = null;
            }
        }
        // ROTA C: GENÉRICA
        else {
            const requester = await prisma.user.findUnique({
                where: { id: safeRequesterId },
                include: { manager: true }
            });
            if (requester?.manager) {
                approverId = requester.manager.id;
                status = 'PENDENTE_GESTOR';
                currentApproverRole = 'MANAGER';
            }
            else {
                status = 'PENDENTE_SI';
                currentApproverRole = 'SI_ANALYST';
            }
        }
        if (isExtraordinary) {
            status = 'PENDENTE_SI';
            currentApproverRole = 'SI_ANALYST';
        }
        const newRequest = await prisma.request.create({
            data: {
                requesterId: safeRequesterId,
                type: safeType,
                details: detailsString,
                justification: justification ? String(justification) : null,
                status,
                currentApproverRole,
                approverId,
                isExtraordinary: Boolean(isExtraordinary),
                extraordinaryDuration: detailsObj.duration ? parseInt(detailsObj.duration) : null,
                extraordinaryUnit: detailsObj.unit || null
            }
        });
        const { notifyTicketEvent } = await Promise.resolve().then(() => __importStar(require('../services/ticketEventService')));
        notifyTicketEvent(newRequest.id, 'TICKET_CREATED', {}).catch(() => { });
        return res.status(201).json(newRequest);
    }
    catch (error) {
        console.error('Erro ao criar solicitação:', error);
        return res.status(500).json({ error: 'Erro interno.' });
    }
};
exports.createSolicitacao = createSolicitacao;
// ============================================================
// 2. LISTAR SOLICITAÇÕES (GET) — com filtros para Gestão de Chamados
// ============================================================
const getSolicitacoes = async (req, res) => {
    try {
        const { status, assigneeId, requester: requesterSearch, startDate, endDate, category } = req.query;
        const where = {};
        // Privacidade VIEWER: retornar apenas chamados onde o usuário é solicitante, responsável ou aprovador
        const userId = req.headers['x-user-id']?.trim();
        if (userId) {
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { systemProfile: true }
            });
            if (currentUser?.systemProfile === 'VIEWER') {
                where.OR = [
                    { requesterId: userId },
                    { assigneeId: userId },
                    { approverId: userId }
                ];
            }
        }
        if (status && status !== 'ALL') {
            if (status === 'PENDENTE') {
                where.status = { startsWith: 'PENDENTE' };
            }
            else {
                where.status = status;
            }
        }
        if (assigneeId) {
            where.assigneeId = assigneeId;
        }
        if (requesterSearch && requesterSearch.trim()) {
            const term = requesterSearch.trim();
            where.requester = {
                OR: [
                    { name: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } }
                ]
            };
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        if (category && category !== 'ALL' && category !== 'Todos') {
            const infraTypes = ['INFRA_SUPPORT'];
            const accessTypes = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
            const peopleTypes = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
            if (category === 'Infra')
                where.type = { in: infraTypes };
            else if (category === 'Acessos')
                where.type = { in: accessTypes };
            else if (category === 'Pessoas')
                where.type = { in: peopleTypes };
        }
        const requests = await prisma.request.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                requester: { select: { id: true, name: true, email: true, department: true } },
                approver: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } }
            }
        });
        return res.json(requests);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar solicitações' });
    }
};
exports.getSolicitacoes = getSolicitacoes;
// ============================================================
// 2b. MEUS CHAMADOS (Viewer) — apenas onde o usuário é solicitante
// ============================================================
const getMyTickets = async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId?.trim())
        return res.status(401).json({ error: 'Usuário não identificado. Envie o header x-user-id.' });
    try {
        const { status, startDate, endDate, category } = req.query;
        const where = { requesterId: userId.trim() };
        if (status && status !== 'ALL') {
            if (status === 'PENDENTE')
                where.status = { startsWith: 'PENDENTE' };
            else
                where.status = status;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        if (category && category !== 'ALL' && category !== 'Todos') {
            const infraTypes = ['INFRA_SUPPORT'];
            const accessTypes = ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
            const peopleTypes = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
            if (category === 'Infra')
                where.type = { in: infraTypes };
            else if (category === 'Acessos')
                where.type = { in: accessTypes };
            else if (category === 'Pessoas')
                where.type = { in: peopleTypes };
        }
        const requests = await prisma.request.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                requester: { select: { id: true, name: true, email: true, department: true } },
                approver: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } }
            }
        });
        return res.json(requests);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar seus chamados' });
    }
};
exports.getMyTickets = getMyTickets;
// ============================================================
// 3. ATUALIZAR / APROVAR (PATCH) - CÉREBRO DA GOVERNANÇA
// ============================================================
const updateSolicitacao = async (req, res) => {
    const { id } = req.params;
    const { status, adminNote, approverId } = req.body;
    try {
        const request = await prisma.request.findUnique({
            where: { id },
            include: { requester: true }
        });
        if (!request)
            return res.status(404).json({ error: 'Solicitação não encontrada' });
        const safeStatus = String(status || '').toUpperCase();
        // Ação "Pendente": apenas atualiza status para PENDENTE_GESTOR (não aprova nem reprova)
        if (safeStatus === 'PENDENTE_GESTOR' || (safeStatus.startsWith('PENDENTE') && safeStatus !== 'PENDENTE_SI' && safeStatus !== 'PENDENTE_OWNER')) {
            const pendingStatus = safeStatus === 'PENDENTE_GESTOR' ? 'PENDENTE_GESTOR' : safeStatus;
            const updated = await prisma.request.update({
                where: { id },
                data: {
                    status: pendingStatus,
                    adminNote: adminNote || null,
                    approverId: approverId || null,
                    updatedAt: new Date()
                }
            });
            return res.json(updated);
        }
        const action = safeStatus === 'APROVAR' ? 'APROVADO' : 'REPROVADO';
        // REGRA DE NEGÓCIO: BLOQUEAR AUTO-APROVAÇÃO
        if (approverId === request.requesterId) {
            return res.status(403).json({ error: 'Você não pode aprovar ou reprovar sua própria solicitação.' });
        }
        // REGRA BYPASS RH: só Luan, Allan ou Vladimir podem aprovar solicitações com bypassGestor (Renata)
        let detailsParsed = {};
        try {
            detailsParsed = JSON.parse(request.details || '{}');
        }
        catch (_) { }
        if (detailsParsed.bypassGestor === true && request.status === 'PENDENTE_SI' && SI_BYPASS_APPROVER_EMAILS.length > 0) {
            const allowedApprovers = await prisma.user.findMany({
                where: { email: { in: SI_BYPASS_APPROVER_EMAILS }, isActive: true },
                select: { id: true }
            });
            const allowedIds = new Set(allowedApprovers.map((u) => u.id));
            if (!allowedIds.has(approverId)) {
                return res.status(403).json({
                    error: 'Apenas aprovadores autorizados de SI (Luan Matheus, Allan Von Stain ou Vladimir Sesar) podem aprovar esta solicitação.'
                });
            }
        }
        // Se for reprovado, encerra imediatamente
        if (action === 'REPROVADO') {
            const updated = await prisma.request.update({
                where: { id },
                data: {
                    status: 'REPROVADO',
                    adminNote: adminNote || 'Solicitação reprovada.',
                    approverId: approverId,
                    updatedAt: new Date()
                }
            });
            if (request.requester.email) {
                // Para rejeição de Acesso, busca o nome do Owner da ferramenta
                let ownerName;
                const ACCESS_TYPES = ['ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
                if (ACCESS_TYPES.includes(request.type)) {
                    try {
                        const det = JSON.parse(request.details || '{}');
                        const toolName = det.tool || det.toolName || (det.info ? det.info.split(': ')[1] : null);
                        if (toolName) {
                            const tool = await prisma.tool.findFirst({
                                where: { name: { contains: toolName, mode: 'insensitive' } },
                                include: { owner: true, subOwner: true }
                            });
                            ownerName = tool?.owner?.name || tool?.subOwner?.name || undefined;
                        }
                    }
                    catch (_) { }
                }
                (0, slackService_1.sendSlackNotification)(request.requester.email, 'REPROVADO', adminNote || 'Reprovado pelo administrador.', request.type, ownerName, request.details);
            }
            return res.json(updated);
        }
        // LÓGICA DE TRANSIÇÃO (SI -> OWNER)
        if (request.status === 'PENDENTE_SI') {
            // 1. Tentar encontrar a ferramenta e o owner
            const currentDetails = JSON.parse(request.details || '{}');
            const toolName = currentDetails.tool || currentDetails.toolName || (currentDetails.info ? currentDetails.info.split(': ')[1] : null);
            if (toolName) {
                const tool = await prisma.tool.findFirst({
                    where: {
                        OR: [
                            { name: { contains: toolName, mode: 'insensitive' } },
                            { acronym: { equals: toolName, mode: 'insensitive' } }
                        ]
                    },
                    include: { owner: true, subOwner: true }
                });
                // Se encontrou a ferramenta e o owner não é o requerente
                if (tool) {
                    let nextApproverId = null;
                    let nextRole = null;
                    if (tool.ownerId && tool.ownerId !== request.requesterId) {
                        nextApproverId = tool.ownerId;
                        nextRole = 'TOOL_OWNER';
                    }
                    else if (tool.subOwnerId && tool.subOwnerId !== request.requesterId) {
                        nextApproverId = tool.subOwnerId;
                        nextRole = 'TOOL_SUB_OWNER';
                    }
                    if (nextApproverId) {
                        const updated = await prisma.request.update({
                            where: { id },
                            data: {
                                status: 'PENDENTE_OWNER',
                                currentApproverRole: nextRole,
                                approverId: nextApproverId,
                                adminNote: `Aprovado por SI. Aguardando aprovação do Owner (${tool.owner?.name || tool.subOwner?.name}).`,
                                updatedAt: new Date()
                            }
                        });
                        return res.json(updated);
                    }
                }
            }
        }
        // APROVAÇÃO FINAL
        const updatedDetails = {
            ...JSON.parse(request.details || '{}'),
            adminNote: adminNote || 'Aprovação final concedida.'
        };
        const updatedRequest = await prisma.request.update({
            where: { id },
            data: {
                status: 'APROVADO',
                adminNote: adminNote || 'Aprovado.',
                approverId: approverId,
                details: JSON.stringify(updatedDetails),
                updatedAt: new Date()
            }
        });
        // Notificação Slack
        if (request.requester.email) {
            (0, slackService_1.sendSlackNotification)(request.requester.email, 'APROVADO', adminNote || 'Solicitação aprovada e executada.', request.type, undefined, request.details);
        }
        // =========================================================
        // 🚀 LÓGICA DE EXECUÇÃO AUTOMÁTICA
        // =========================================================
        if (action === 'APROVADO') {
            // CENÁRIO 1: RH (Promoção, Mudança de Área) — Convenia (apenas log; admissão tem CENÁRIO 1b)
            if (['PROMOCAO', 'MUDANCA_AREA'].includes(request.type)) {
                console.log(`✅ RH: Solicitação ${request.type} aprovada. Aguardando sincronização do Convenia.`);
            }
            // CENÁRIO 1b: ONBOARDING (HIRING, ADMISSAO, ONBOARDING) — vincula colaborador a departamento e cargo
            else if (ONBOARDING_REQUEST_TYPES.includes(request.type)) {
                try {
                    await runOnboardingAutomation(id, request);
                }
                catch (onboardError) {
                    console.error('[Automação] Erro ao vincular colaborador na admissão (onboarding):', onboardError);
                }
            }
            // CENÁRIO 2: ACESSO EXTRAORDINÁRIO / FERRAMENTA PONTUAL — vincula o colaborador à ferramenta na tabela Access
            else if (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(request.type) || request.isExtraordinary) {
                try {
                    await runExtraordinaryAccessAutomation(id, request);
                }
                catch (triggerError) {
                    console.error("❌ Erro gatilho automático (acesso extraordinário):", triggerError);
                }
            }
            // CENÁRIO 3: DESIGNAÇÃO DE DEPUTY (SUBSTITUTO)
            else if (request.type === 'DEPUTY_DESIGNATION') {
                try {
                    const substituteName = currentDetails.substitute;
                    // Tenta achar o usuário substituto pelo nome no banco
                    const substituteUser = await prisma.user.findFirst({
                        where: { name: { contains: substituteName, mode: 'insensitive' } }
                    });
                    if (substituteUser) {
                        await prisma.user.update({
                            where: { id: request.requesterId },
                            data: { myDeputyId: substituteUser.id }
                        });
                        console.log(`✅ Deputy Designado: ${substituteUser.name} para o gestor ${request.requester.name}`);
                    }
                }
                catch (deputyError) {
                    console.error("❌ Erro ao designar deputy:", deputyError);
                }
            }
            // CENÁRIO 4: DESLIGAMENTO (FIRING / DEMISSAO / OFFBOARDING) — desvincula o colaborador alvo da estrutura
            else if (OFFBOARDING_REQUEST_TYPES.includes(request.type)) {
                try {
                    await runOffboardingAutomation(id, request.type, request.details);
                }
                catch (offboardError) {
                    console.error('[Automação] Erro ao desvincular usuário após aprovação de desligamento:', offboardError);
                }
            }
        }
        return res.json(updatedRequest);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
    }
};
exports.updateSolicitacao = updateSolicitacao;
// ============================================================
// 4. GET UMA SOLICITAÇÃO (detalhe + comentários + anexos)
// ============================================================
const getSolicitacaoById = async (req, res) => {
    const { id } = req.params;
    const viewerContext = req.headers['x-context'] === 'my-tickets';
    const userId = req.headers['x-user-id']?.trim();
    try {
        const request = await prisma.request.findUnique({
            where: { id },
            include: {
                requester: { select: { id: true, name: true, email: true, department: true } },
                approver: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } },
                comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true, email: true } } } },
                attachments: { orderBy: { createdAt: 'asc' }, include: { uploadedBy: { select: { id: true, name: true } } } }
            }
        });
        if (!request)
            return res.status(404).json({ error: 'Solicitação não encontrada' });
        if (viewerContext && userId && request.requesterId !== userId)
            return res.status(403).json({ error: 'Acesso negado a este chamado.' });
        return res.json(request);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar solicitação' });
    }
};
exports.getSolicitacaoById = getSolicitacaoById;
// ============================================================
// 5. PATCH METADADOS (Service Desk: status, assignee, scheduledAt)
// ============================================================
const updateSolicitacaoMetadata = async (req, res) => {
    const { id } = req.params;
    const { status, assigneeId, scheduledAt } = req.body;
    try {
        const existing = await prisma.request.findUnique({ where: { id }, include: { requester: true, assignee: true } });
        if (!existing)
            return res.status(404).json({ error: 'Solicitação não encontrada' });
        const data = {};
        if (status !== undefined)
            data.status = String(status);
        if (assigneeId !== undefined)
            data.assigneeId = assigneeId || null;
        if (scheduledAt !== undefined)
            data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
        const updated = await prisma.request.update({
            where: { id },
            data,
            include: {
                requester: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } }
            }
        });
        const { notifyTicketEvent } = await Promise.resolve().then(() => __importStar(require('../services/ticketEventService')));
        if (status !== undefined && status !== existing.status)
            notifyTicketEvent(id, 'STATUS_CHANGED', { from: existing.status, to: status }).catch(() => { });
        if (assigneeId !== undefined && assigneeId !== existing.assigneeId)
            notifyTicketEvent(id, 'ASSIGNEE_CHANGED', { assigneeId }).catch(() => { });
        // Automação: se o status foi alterado para APROVADO, executar regras (desligamento, onboarding, acesso extraordinário)
        const newStatus = (status !== undefined ? String(status) : existing.status) || '';
        if (newStatus === 'APROVADO') {
            if (OFFBOARDING_REQUEST_TYPES.includes(existing.type)) {
                try {
                    await runOffboardingAutomation(id, existing.type, existing.details);
                }
                catch (offboardError) {
                    console.error('[Automação] Erro ao desvincular usuário após aprovação de desligamento (metadata):', offboardError);
                }
            }
            if (ONBOARDING_REQUEST_TYPES.includes(existing.type)) {
                try {
                    await runOnboardingAutomation(id, existing);
                }
                catch (onboardError) {
                    console.error('[Automação] Erro ao vincular colaborador na admissão (metadata):', onboardError);
                }
            }
            if (EXTRAORDINARY_ACCESS_REQUEST_TYPES.includes(existing.type) || existing.isExtraordinary) {
                try {
                    await runExtraordinaryAccessAutomation(id, existing);
                }
                catch (extraError) {
                    console.error('[Automação] Erro ao vincular acesso extraordinário (metadata):', extraError);
                }
            }
        }
        return res.json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao atualizar metadados' });
    }
};
exports.updateSolicitacaoMetadata = updateSolicitacaoMetadata;
// ============================================================
// 6. COMENTÁRIO
// ============================================================
const createComment = async (req, res) => {
    const { id } = req.params;
    const { body, kind } = req.body;
    if (!body || !String(body).trim())
        return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    try {
        const request = await prisma.request.findUnique({ where: { id } });
        if (!request)
            return res.status(404).json({ error: 'Solicitação não encontrada' });
        const comment = await prisma.requestComment.create({
            data: {
                requestId: id,
                authorId: req.body.authorId || null,
                body: String(body).trim(),
                kind: kind === 'SOLUTION' || kind === 'SCHEDULED_TASK' ? kind : 'COMMENT'
            },
            include: { author: { select: { id: true, name: true, email: true } } }
        });
        const { notifyTicketEvent } = await Promise.resolve().then(() => __importStar(require('../services/ticketEventService')));
        notifyTicketEvent(id, 'COMMENT_ADDED', { commentId: comment.id, kind: comment.kind, body: comment.body.slice(0, 200) }).catch(() => { });
        return res.status(201).json(comment);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao adicionar comentário' });
    }
};
exports.createComment = createComment;
// ============================================================
// 7. ANEXO (fileBase64 → Cloudinary; ou fileUrl direto)
// ============================================================
const createAttachment = async (req, res) => {
    const { id } = req.params;
    const { filename, fileUrl, fileBase64, mimeType, uploadedById } = req.body;
    if (!filename)
        return res.status(400).json({ error: 'filename é obrigatório' });
    let finalUrl = fileUrl;
    if (fileBase64) {
        const hasConfig = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
        if (!hasConfig) {
            console.error('createAttachment: Cloudinary não configurado (CLOUDINARY_URL ou CLOUDINARY_*)');
            return res.status(503).json({ error: 'Upload de anexos não configurado. Defina CLOUDINARY_* no .env.' });
        }
        try {
            const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${fileBase64}`;
            const result = await cloudinary_1.v2.uploader.upload(dataUri, { resource_type: 'auto' });
            finalUrl = result.secure_url;
        }
        catch (err) {
            console.error('createAttachment Cloudinary upload:', err);
            return res.status(500).json({ error: 'Erro ao enviar arquivo para o provedor de mídia' });
        }
    }
    if (!finalUrl)
        return res.status(400).json({ error: 'Envie fileUrl ou fileBase64' });
    try {
        const request = await prisma.request.findUnique({ where: { id } });
        if (!request)
            return res.status(404).json({ error: 'Solicitação não encontrada' });
        const attachment = await prisma.requestAttachment.create({
            data: {
                requestId: id,
                filename: String(filename),
                fileUrl: finalUrl,
                mimeType: mimeType || null,
                uploadedById: uploadedById || null
            },
            include: { uploadedBy: { select: { id: true, name: true } } }
        });
        const { notifyTicketEvent } = await Promise.resolve().then(() => __importStar(require('../services/ticketEventService')));
        notifyTicketEvent(id, 'ATTACHMENT_ADDED', { filename: attachment.filename }).catch(() => { });
        return res.status(201).json(attachment);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao adicionar anexo' });
    }
};
exports.createAttachment = createAttachment;
