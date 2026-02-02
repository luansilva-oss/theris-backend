import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findToolApprover } from '../services/approvalService';

const prisma = new PrismaClient();

// --- CRIAR SOLICITAÇÃO ---
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    // ⚠️ CAST NUCLEAR: Desliga a checagem de tipos do Express para o body
    const body = req.body as any;

    const requesterId = String(body.requesterId);
    const type = String(body.type);
    const details = body.details;
    const justification = body.justification ? String(body.justification) : null;
    const isExtraordinary = Boolean(body.isExtraordinary);

    const detailsString = typeof details === 'string' ? details : JSON.stringify(details);

    // Parse seguro para extrair nome da ferramenta
    const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;

    let approverId: string | null = null;
    let currentApproverRole = 'MANAGER';
    let status = 'PENDENTE_GESTOR';

    // ROTA 1: FERRAMENTAS
    if (['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(type) || isExtraordinary) {
      try {
        const toolName = detailsObj.tool || detailsObj.toolName || (detailsObj.info ? detailsObj.info.split(': ')[1] : null);

        if (toolName) {
          const route = await findToolApprover(toolName);
          approverId = route.approverId;
          currentApproverRole = route.role;

          if (route.role.includes('OWNER')) status = 'PENDENTE_OWNER';
          else if (route.role.includes('SI')) status = 'PENDENTE_SI';
          else if (route.role.includes('SUB')) status = 'PENDENTE_SUB_OWNER';
        }
      } catch (error) {
        console.warn("⚠️ Fallback: Owner não encontrado.", error);
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }
    // ROTA 2: GESTÃO DE PESSOAS
    else {
      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        include: { manager: true }
      });

      if (requester?.manager) {
        approverId = requester.manager.id;
      } else {
        status = 'PENDENTE_RH';
      }
    }

    const newRequest = await prisma.request.create({
      data: {
        requesterId,
        type,
        details: detailsString,
        justification,
        status,
        currentApproverRole,
        approverId,
        isExtraordinary
      }
    });

    return res.status(201).json(newRequest);

  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};

// --- LISTAR ---
export const getSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
        lastApprover: { select: { id: true, name: true } }
      }
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// --- ATUALIZAR ---
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;

  // ⚠️ CAST NUCLEAR: Tratamos como 'any' para evitar erro TS2322 (string | string[])
  const body = req.body as any;

  try {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    // Tratamento MANUAL:
    // Se vier array, pega o primeiro. Se vier string, usa ela.
    // E no final, envolvemos em String() para garantir o tipo primitivo.

    let safeStatus = '';
    if (Array.isArray(body.status)) {
      safeStatus = String(body.status[0]);
    } else {
      safeStatus = String(body.status);
    }

    let safeApproverId: string | null = null;
    if (body.approverId) {
      if (Array.isArray(body.approverId)) {
        safeApproverId = String(body.approverId[0]);
      } else {
        safeApproverId = String(body.approverId);
      }
    }

    // Agora o TypeScript sabe que safeStatus é string e safeApproverId é string | null
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status: safeStatus,
        approverId: safeApproverId,
        updatedAt: new Date()
      }
    });

    // GATILHO DE ACESSO
    if (safeStatus === 'APROVADO' && ['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(request.type)) {
      try {
        const details = JSON.parse(request.details);
        const toolName = details.tool || details.toolName;
        // Pega ID do beneficiário ou do solicitante. Converte para string seguro.
        const rawTarget = details.beneficiaryId || request.requesterId;
        const targetUserId = Array.isArray(rawTarget) ? String(rawTarget[0]) : String(rawTarget);

        const rawLevel = details.target || details.targetAccess || 'Membro';
        const accessLevel = Array.isArray(rawLevel) ? String(rawLevel[0]) : String(rawLevel);

        if (toolName) {
          const tool = await prisma.tool.findUnique({ where: { name: toolName } });

          if (tool) {
            await prisma.toolAccess.create({
              data: {
                toolId: tool.id,
                userId: targetUserId,
                accessLevel: accessLevel,
                status: 'ACTIVE'
              }
            });
            console.log(`✅ ACESSO AUTOMÁTICO: ${toolName}`);
          }
        }
      } catch (triggerError) {
        console.error("❌ Erro no gatilho:", triggerError);
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};