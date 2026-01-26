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

    // Garante que details seja uma string (para o banco PostgreSQL)
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
    console.error("Erro ao criar solicitação:", error);
    res.status(500).json({ error: "Erro ao criar solicitação" });
  }
};

// --- ATUALIZAR STATUS (APROVAR/REPROVAR) ---
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // CORREÇÃO CRÍTICA DO ERRO DE BUILD:
  // Forçamos o tipo para string para o TypeScript não reclamar de (string | string[])
  const status = req.body.status as string;
  const approverId = req.body.approverId as string;

  try {
    const updated = await prisma.request.update({
      where: { id },
      data: {
        status,
        approverId,
        updatedAt: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar solicitação:", error);
    res.status(500).json({ error: "Erro ao atualizar solicitação" });
  }
};