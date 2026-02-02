// @ts-nocheck
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findToolApprover } from '../services/approvalService';

const prisma = new PrismaClient();

// --- CRIAR SOLICITAÇÃO ---
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    // Pegamos direto do body (sem tipagem estrita graças ao ts-nocheck)
    const { requesterId, type, details, justification, isExtraordinary } = req.body;

    // Tratamento de segurança para garantir String no runtime
    const safeRequesterId = String(requesterId);
    const safeType = String(type);

    // Tratamento do JSON de details
    const detailsString = typeof details === 'string' ? details : JSON.stringify(details);
    let detailsObj = {};
    try {
      detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
    } catch (e) {
      detailsObj = {};
    }

    let approverId = null;
    let currentApproverRole = 'MANAGER';
    let status = 'PENDENTE_GESTOR';

    // ROTA 1: FERRAMENTAS
    if (['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(safeType) || isExtraordinary) {
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
        console.warn("Fallback: Owner não encontrado.", error);
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }
    // ROTA 2: GESTÃO DE PESSOAS
    else {
      const requester = await prisma.user.findUnique({
        where: { id: safeRequesterId },
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
        requesterId: safeRequesterId,
        type: safeType,
        details: detailsString,
        justification: justification ? String(justification) : null,
        status,
        currentApproverRole,
        approverId,
        isExtraordinary: Boolean(isExtraordinary)
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
  const { status, approverId } = req.body;

  try {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    // Tratamento de Runtime (Garante que é String mesmo se vier array)
    const safeStatus = Array.isArray(status) ? String(status[0]) : String(status);

    let safeApproverId = null;
    if (approverId) {
      safeApproverId = Array.isArray(approverId) ? String(approverId[0]) : String(approverId);
    }

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