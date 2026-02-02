import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findToolApprover } from '../services/approvalService';

const prisma = new PrismaClient();

// --- CRIAR SOLICITAÇÃO (ROTEAMENTO INTELIGENTE) ---
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    const { requesterId, type, details, justification, isExtraordinary } = req.body;

    // Normaliza o JSON de detalhes
    const detailsString = typeof details === 'string' ? details : JSON.stringify(details);
    const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;

    let approverId = null;
    let currentApproverRole = 'MANAGER'; // Padrão inicial
    let status = 'PENDENTE_GESTOR';

    // ROTA 1: ACESSO A FERRAMENTAS (Owner -> Sub -> SI)
    if (['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(type) || isExtraordinary) {
      try {
        // Tenta pegar o nome da ferramenta do JSON
        const toolName = detailsObj.tool || detailsObj.toolName || (detailsObj.info ? detailsObj.info.split(': ')[1] : null);

        if (toolName) {
          // Busca quem é o dono da bola
          const route = await findToolApprover(toolName);

          approverId = route.approverId;
          currentApproverRole = route.role; // Ex: 'OWNER', 'DEPUTY_SUB_OWNER'

          if (route.role.includes('OWNER')) status = 'PENDENTE_OWNER';
          else if (route.role.includes('SI')) status = 'PENDENTE_SI';
          else if (route.role.includes('SUB')) status = 'PENDENTE_SUB_OWNER';
        }
      } catch (error) {
        console.warn("⚠️ Fallback: Owner não encontrado, enviando para SI.", error);
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }

    // ROTA 2: GESTÃO DE PESSOAS (Gestor Direto)
    else {
      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        include: { manager: true }
      });

      if (requester?.manager) {
        approverId = requester.manager.id;
      } else {
        // Se for o CEO pedindo, vai para Admin/RH
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
    return res.status(500).json({ error: 'Erro interno ao processar solicitação.' });
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

// --- ATUALIZAR (APROVAR + GATILHO DE ACESSO) ---
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approverId } = req.body; // Esperado: 'APROVADO' ou 'REPROVADO'

  try {
    // 1. Busca dados originais
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    // 2. Atualiza Status
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: { status, approverId, updatedAt: new Date() }
    });

    // 3. O GATILHO: Se Aprovou ferramenta, grava o acesso no banco
    if (status === 'APROVADO' && ['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(request.type)) {
      try {
        const details = JSON.parse(request.details);
        const toolName = details.tool || details.toolName;
        // Se for "Extraordinário" para outra pessoa, usa o beneficiaryId, senão o próprio solicitante
        const targetUserId = details.beneficiaryId || request.requesterId;
        const level = details.target || details.targetAccess || 'Membro';

        if (toolName) {
          const tool = await prisma.tool.findUnique({ where: { name: toolName } });

          if (tool) {
            // Cria registro na tabela ToolAccess
            await prisma.toolAccess.create({
              data: {
                toolId: tool.id,
                userId: targetUserId,
                accessLevel: level,
                status: 'ACTIVE'
              }
            });
            console.log(`✅ ACESSO AUTOMÁTICO: ${toolName} liberado para UserID ${targetUserId}`);
          }
        }
      } catch (triggerError) {
        console.error("❌ Erro no gatilho de acesso automático:", triggerError);
        // Não falhamos o request HTTP, apenas logamos o erro do trigger
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};