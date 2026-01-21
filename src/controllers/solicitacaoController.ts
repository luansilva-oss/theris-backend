import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. CRIA UMA NOVA SOLICITAÇÃO (POST)
export const criarSolicitacao = async (req: Request, res: Response) => {
  try {
    const { solicitanteId, tipo, colaboradorAlvo, cargoNovo, departamentoNovo, justificativa } = req.body;

    // Verifica se o solicitante existe
    const solicitante = await prisma.colaborador.findUnique({
      where: { id: solicitanteId }
    });

    if (!solicitante) {
      return res.status(404).json({ error: 'Solicitante não encontrado' });
    }

    // Cria a solicitação no banco
    const novaSolicitacao = await prisma.solicitacao.create({
      data: {
        solicitanteId,
        tipo,              // Ex: "MUDANCA_CARGO"
        colaboradorAlvo,
        cargoNovo,
        departamentoNovo,
        justificativa
        // status entra como "PENDENTE_SI" automaticamente
      }
    });

    return res.status(201).json(novaSolicitacao);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar solicitação' });
  }
};

// 2. LISTA SOLICITAÇÕES COM FILTRO (GET)
// Exemplo de uso: /api/solicitacoes?status=PENDENTE_SI
export const listarSolicitacoes = async (req: Request, res: Response) => {
  try {
    // Pega o status da URL (query param)
    const { status } = req.query;

    // Se veio status na URL, filtra por ele. Se não, traz tudo (objeto vazio).
    // O "as any" força o TypeScript a aceitar a string como enum
    const filtro = status ? { status: String(status) as any } : {};

    const lista = await prisma.solicitacao.findMany({
      where: filtro,                  // Aplica o filtro aqui
      include: { solicitante: true }, // Traz os dados do Colaborador que pediu
      orderBy: { criadoEm: 'desc' }   // Mais recentes primeiro
    });

    return res.json(lista);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// 3. ATUALIZA O STATUS (PATCH)
export const atualizarStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Atualiza no banco
    const solicitacaoAtualizada = await prisma.solicitacao.update({
      where: { id: String(id) }, // Garante que o ID seja string
      data: { status }
    });

    return res.json(solicitacaoAtualizada);

  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: 'Erro ao atualizar status. Verifique o ID.' });
  }
};