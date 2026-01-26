import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- LISTAR SOLICITAÇÕES ---
export const getSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      include: {
        requester: true,
        approver: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(requests);
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    res.status(500).json({ error: "Erro ao buscar solicitações" });
  }
};

// --- CRIAR SOLICITAÇÃO ---
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    const { requesterId, type, details, justification, isExtraordinary } = req.body;

    // Garante que details seja uma string
    const detailsString = typeof details === 'object' ? JSON.stringify(details) : String(details);

    const newRequest = await prisma.request.create({
      data: {
        requesterId: String(requesterId),
        type: String(type),
        status: 'PENDENTE_GESTOR',
        details: detailsString,
        justification: justification ? String(justification) : null,
        isExtraordinary: Boolean(isExtraordinary)
      }
    });

    res.json(newRequest);
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    res.status(500).json({ error: "Erro ao criar solicitação" });
  }
};

// --- ATUALIZAR STATUS (APROVAR/REPROVAR) ---
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // CORREÇÃO DEFINITIVA DO ERRO TS2322:
  // Convertendo explicitamente para String() para garantir que não é um Array
  const rawStatus = req.body.status;
  const rawApproverId = req.body.approverId;

  const status = typeof rawStatus === 'string' ? rawStatus : String(rawStatus);
  const approverId = rawApproverId ? String(rawApproverId) : undefined;

  try {
    const updated = await prisma.request.update({
      where: { id },
      data: {
        status: status,
        approverId: approverId,
        updatedAt: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar solicitação:", error);
    res.status(500).json({ error: "Erro ao atualizar solicitação" });
  }
};