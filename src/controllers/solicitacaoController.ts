import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findToolApprover } from '../services/approvalService';

const prisma = new PrismaClient();

// CRIAR SOLICITAÇÃO
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    const { requesterId, type, details, justification, isExtraordinary } = req.body;

    // Converte details para string se vier como objeto
    const detailsString = typeof details === 'string' ? details : JSON.stringify(details);
    const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;

    let approverId = null;
    let currentApproverRole = 'MANAGER'; // Padrão
    let status = 'PENDENTE_GESTOR';

    // --- LÓGICA DE DECISÃO DE APROVADOR ---

    // CASO 1: É SOBRE FERRAMENTA? (Owner/SubOwner)
    if (['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(type) || isExtraordinary) {
      try {
        const toolName = detailsObj.tool || detailsObj.toolName || detailsObj.info.split(': ')[1];

        if (toolName) {
          // Usa nosso serviço inteligente
          const route = await findToolApprover(toolName);
          approverId = route.approverId;
          currentApproverRole = route.role; // Ex: 'OWNER', 'DEPUTY_OWNER'

          // Se for Deputy ou Sub, status reflete isso
          if (route.role.includes('OWNER')) status = 'PENDENTE_OWNER';
          if (route.role.includes('SI')) status = 'PENDENTE_SI';
        }
      } catch (error) {
        console.warn("Não foi possível achar o Owner automático:", error);
        // Se falhar, cai para o SI por segurança
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }

    // CASO 2: RH / DEPT PESSOAL (Promoção, Contratação)
    else {
      // Busca o Gestor Direto do solicitante
      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        include: { manager: true }
      });

      if (requester?.manager) {
        approverId = requester.manager.id;
      } else {
        // Se não tem gestor (ex: CEO), cai para Admin/RH
        status = 'PENDENTE_RH';
      }
    }

    // --- CRIAÇÃO NO BANCO ---
    const newRequest = await prisma.request.create({
      data: {
        requesterId,
        type,
        details: detailsString,
        justification,
        status,
        currentApproverRole,
        approverId, // Pode ser null se não achou (fica pendente na fila geral)
        isExtraordinary: !!isExtraordinary
      }
    });

    return res.status(201).json(newRequest);

  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno ao processar solicitação.' });
  }
};

// LISTAR SOLICITAÇÕES
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

// ATUALIZAR (APROVAR/REPROVAR)
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approverId } = req.body; // status: 'APROVADO' | 'REPROVADO'

  try {
    const updated = await prisma.request.update({
      where: { id },
      data: {
        status,
        approverId,
        updatedAt: new Date()
      }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};