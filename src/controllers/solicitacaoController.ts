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
    // Usamos 'as any' para evitar que o TypeScript reclame da tipagem do body
    const body = req.body as any;

    const { requesterId, type, details, justification, isExtraordinary } = body;

    // Garante que details seja uma string
    const detailsString = typeof details === 'object' ? JSON.stringify(details) : String(details);

    const newRequest = await prisma.request.create({
      data: {
        requesterId: String(requesterId),
        type: String(type),
        status: 'PENDENTE_GESTOR', // Status inicial padrão
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
  
  // AQUI ESTÁ A CORREÇÃO DEFINITIVA:
  // Tratamos o body como 'any' para ignorar a verificação restrita de array
  const body = req.body as any;

  try {
    const updated = await prisma.request.update({
      where: { id },
      data: {
        // Forçamos a conversão para String direto na atribuição
        status: String(body.status),
        // Se tiver approverId, converte para string, senão passa null
        approverId: body.approverId ? String(body.approverId) : null,
        updatedAt: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar solicitação:", error);
    res.status(500).json({ error: "Erro ao atualizar solicitação" });
  }
};