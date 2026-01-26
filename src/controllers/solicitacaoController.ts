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
    // Tratamos o body como 'any' para extrair os dados sem burocracia de tipos
    const body = req.body as any;

    const requesterId: string = String(body.requesterId);
    const type: string = String(body.type);
    
    // Tratamento especial para details (JSON ou String)
    let detailsString: string = "";
    if (typeof body.details === 'object') {
        detailsString = JSON.stringify(body.details);
    } else {
        detailsString = String(body.details || "");
    }

    const justification: string | null = body.justification ? String(body.justification) : null;
    const isExtraordinary: boolean = Boolean(body.isExtraordinary);

    const newRequest = await prisma.request.create({
      data: {
        requesterId,
        type,
        status: 'PENDENTE_GESTOR',
        details: detailsString,
        justification,
        isExtraordinary
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
  try {
    // 1. Extração e Limpeza do ID (Onde estava o erro TS2322)
    // Forçamos o 'req.params.id' a ser tratado como string pura antes de tocar no Prisma
    const rawId = req.params.id;
    const safeId: string = String(rawId);

    // 2. Extração e Limpeza do Body
    const body = req.body as any;
    const safeStatus: string = String(body.status);
    
    // ApproverId pode ser nulo, então tratamos separadamente
    let safeApproverId: string | null = null;
    if (body.approverId) {
        safeApproverId = String(body.approverId);
    }

    // 3. Chamada ao Banco (Agora as variáveis são garantidamente strings)
    const updated = await prisma.request.update({
      where: { id: safeId },
      data: {
        status: safeStatus,
        approverId: safeApproverId,
        updatedAt: new Date()
      }
    });
    
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar solicitação:", error);
    res.status(500).json({ error: "Erro ao atualizar solicitação" });
  }
};