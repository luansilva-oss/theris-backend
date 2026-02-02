import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findToolApprover } from '../services/approvalService';

const prisma = new PrismaClient();

// --- CRIAR SOLICITAÇÃO ---
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    // Cast para any para evitar conflitos de tipagem estrita do Express
    const body = req.body as any;

    const requesterId = body.requesterId;
    const type = body.type;
    const details = body.details;
    const justification = body.justification;
    const isExtraordinary = body.isExtraordinary;

    const detailsString = typeof details === 'string' ? details : JSON.stringify(details);
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
        isExtraordinary: !!isExtraordinary
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

// --- ATUALIZAR (SOLUÇÃO FINAL PARA O ERRO DE BUILD) ---
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;

  // ⚠️ O PULO DO GATO: Usamos 'as any' para desligar a checagem estrita aqui
  const body = req.body as any;
  const rawStatus = body.status;
  const rawApproverId = body.approverId;

  try {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    // Tratamento manual e forçado para String
    const finalStatus = Array.isArray(rawStatus) ? String(rawStatus[0]) : String(rawStatus);

    let finalApproverId: string | null = null;
    if (rawApproverId) {
      finalApproverId = Array.isArray(rawApproverId) ? String(rawApproverId[0]) : String(rawApproverId);
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status: finalStatus,
        approverId: finalApproverId,
        updatedAt: new Date()
      }
    });

    // GATILHO DE ACESSO
    if (finalStatus === 'APROVADO' && ['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(request.type)) {
      try {
        const details = JSON.parse(request.details);
        const toolName = details.tool || details.toolName;
        const targetUserId = details.beneficiaryId || request.requesterId;

        const rawLevel = details.target || details.targetAccess || 'Membro';
        const finalLevel = Array.isArray(rawLevel) ? String(rawLevel[0]) : String(rawLevel);

        if (toolName) {
          const tool = await prisma.tool.findUnique({ where: { name: toolName } });

          if (tool) {
            await prisma.toolAccess.create({
              data: {
                toolId: tool.id,
                userId: targetUserId,
                accessLevel: finalLevel,
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