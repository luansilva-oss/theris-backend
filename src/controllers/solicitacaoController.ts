import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Criar Solicitação
export const criarSolicitacao = async (req: Request, res: Response) => {
  try {
    const { requesterId, type, details, justification } = req.body;

    const novaSolicitacao = await prisma.request.create({
      data: {
        requesterId,
        type, // 'CHANGE_ROLE' ou 'ACCESS_TOOL'
        details: JSON.stringify(details),
        justification,
        status: 'PENDENTE_SI', // Tudo começa com SI
        currentApproverRole: 'SI'
      }
    });

    return res.status(201).json(novaSolicitacao);
  } catch (error) {
    console.error("Erro ao criar:", error);
    return res.status(500).json({ error: "Erro ao criar solicitação" });
  }
};

// Listar (ATUALIZADO PARA TRAZER O APROVADOR)
export const listarSolicitacoes = async (req: Request, res: Response) => {
  try {
    const lista = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        requester: true,    // Traz dados de quem pediu
        lastApprover: true  // <--- IMPORTANTE: Traz o nome de quem assinou
      } 
    });
    return res.json(lista);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar" });
  }
};

// Aprovação com Regras de SoD e Fluxo
export const atualizarStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status, approverId } = req.body;

    // 1. Buscar a solicitação atual
    const solicitacao = await prisma.request.findUnique({ 
      where: { id },
      include: { requester: true }
    });

    if (!solicitacao) return res.status(404).json({ error: "Solicitação não encontrada" });

    // ⛔ REGRA DE OURO: Quem solicitou NÃO pode aprovar (SoD)
    if (solicitacao.requesterId === approverId) {
      return res.status(403).json({ error: "VIOLAÇÃO DE COMPLIANCE: Você não pode aprovar sua própria solicitação." });
    }

    // Se for REJEIÇÃO, encerra
    if (status === 'REPROVADO') {
      const atualizada = await prisma.request.update({
        where: { id },
        data: { status: 'REPROVADO', lastApproverId: approverId }
      });
      return res.json(atualizada);
    }

    // LÓGICA DE APROVAÇÃO EM CASCATA
    let novoStatus = solicitacao.status;
    let proximoAprovador = solicitacao.currentApproverRole;

    // Cenário 1: Está com SI e foi aprovado
    if (solicitacao.status === 'PENDENTE_SI') {
        if (solicitacao.type === 'CHANGE_ROLE') {
            novoStatus = 'PENDENTE_RH';
            proximoAprovador = 'RH';
        } else if (solicitacao.type === 'ACCESS_TOOL') {
            novoStatus = 'PENDENTE_OWNER';
            proximoAprovador = 'OWNER';
        }
    } 
    // Cenário 2: Está com RH ou OWNER e foi aprovado -> Finaliza
    else if (solicitacao.status === 'PENDENTE_RH' || solicitacao.status === 'PENDENTE_OWNER') {
        novoStatus = 'APROVADO';
        proximoAprovador = 'CONCLUIDO';
        
        // Log de Auditoria
        await prisma.auditLog.create({
            data: {
                action: solicitacao.type,
                targetUser: solicitacao.requester.name,
                executor: approverId,
                details: `Aprovado final por ${proximoAprovador}.`
            }
        });
    }

    // Atualiza no Banco
    const solicitacaoFinal = await prisma.request.update({
      where: { id },
      data: { 
        status: novoStatus, 
        currentApproverRole: proximoAprovador,
        lastApproverId: approverId // Salva quem clicou no botão
      }
    });

    return res.json(solicitacaoFinal);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao processar aprovação" });
  }
};