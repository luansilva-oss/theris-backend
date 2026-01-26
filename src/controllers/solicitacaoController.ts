import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      include: {
        requester: true,
        approver: true // CORREÇÃO: Mudado de lastApprover para approver
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar solicitações" });
  }
};

export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    const { requesterId, type, details, justification, isExtraordinary } = req.body;

    // Converte objeto details para string se vier como objeto
    const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;

    const newRequest = await prisma.request.create({
      data: {
        requesterId,
        type,
        status: 'PENDENTE_GESTOR', // Status inicial padrão
        details: detailsString,
        justification,
        isExtraordinary: isExtraordinary || false
      }
    });

    res.json(newRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar solicitação" });
  }
};

export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approverId } = req.body;

  try {
    const updated = await prisma.request.update({
      where: { id },
      data: {
        status,
        approverId, // CORREÇÃO: Mudado de lastApproverId para approverId
        updatedAt: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar solicitação" });
  }
};