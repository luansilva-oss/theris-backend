import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- CRIAR SOLICITAÇÃO ---
export const criarSolicitacao = async (req: Request, res: Response) => {
  const { requesterId, type, details, justification } = req.body;

  try {
    const novaSolicitacao = await prisma.request.create({
      data: {
        requesterId,
        type, // 'CHANGE_ROLE' ou 'ACCESS_TOOL'
        details: JSON.stringify(details), // Salva como string JSON no banco
        justification,
        status: 'PENDENTE_RH', // Status inicial padrão
        currentApproverRole: 'RH' // Primeiro nível de aprovação
      }
    });

    return res.status(201).json(novaSolicitacao);
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    return res.status(500).json({ error: "Erro interno ao criar solicitação." });
  }
};

// --- LISTAR SOLICITAÇÕES (COM DADOS PARA AUDITORIA) ---
export const listarSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      include: {
        requester: true,    // Traz dados de quem pediu (Nome, Cargo, etc)
        lastApprover: true  // <--- Traz dados de QUEM APROVOU (Essencial para Auditoria)
      },
      orderBy: {
        createdAt: 'desc'   // Mais recentes primeiro
      }
    });

    return res.json(requests);
  } catch (error) {
    console.error("Erro ao listar solicitações:", error);
    return res.status(500).json({ error: "Erro ao buscar solicitações." });
  }
};

// --- ATUALIZAR STATUS (APROVAR/REPROVAR) ---
export const atualizarStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approverId } = req.body; // Recebe o ID de quem está clicando no botão

  try {
    const solicitacaoAtualizada = await prisma.request.update({
      where: { id },
      data: {
        status, // 'APROVADO' ou 'REPROVADO'
        lastApproverId: approverId, // Salva o ID do aprovador para o Log de Auditoria
        updatedAt: new Date() // Atualiza a data da decisão
      }
    });

    // (Opcional) Aqui você poderia adicionar lógica extra, 
    // como atualizar o cargo do usuário na tabela User se o status for APROVADO.
    
    return res.json(solicitacaoAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar solicitação:", error);
    return res.status(500).json({ error: "Erro ao processar aprovação." });
  }
};