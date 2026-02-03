// @ts-nocheck
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSlackNotification } from '../services/slackService';

const prisma = new PrismaClient();

// --- AUXILIAR: Encontrar Aprovador da Ferramenta ---
async function findToolApprover(toolName: string) {
  // Tenta achar a ferramenta pelo nome ou sigla
  const tool = await prisma.tool.findFirst({
    where: {
      OR: [
        { name: { contains: toolName, mode: 'insensitive' } },
        { name: { equals: toolName } }
      ]
    },
    include: { owner: true, subOwner: true }
  });

  if (!tool) throw new Error('Ferramenta não encontrada');

  // Prioridade: Owner -> SubOwner -> Admin Genérico
  if (tool.owner) {
    return { approverId: tool.owner.id, role: 'TOOL_OWNER' };
  }
  if (tool.subOwner) {
    return { approverId: tool.subOwner.id, role: 'TOOL_SUB_OWNER' };
  }

  return { approverId: null, role: 'SI_ANALYST' };
}

// ============================================================
// 1. CRIAR SOLICITAÇÃO (POST)
// ============================================================
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    const { requesterId, type, details, justification, isExtraordinary } = req.body;

    const safeRequesterId = String(requesterId);
    const safeType = String(type);

    // Garante que details seja um objeto
    let detailsObj = {};
    let detailsString = '';
    try {
      if (typeof details === 'string') {
        detailsObj = JSON.parse(details);
        detailsString = details;
      } else {
        detailsObj = details;
        detailsString = JSON.stringify(details);
      }
    } catch (e) { detailsString = '{}'; }

    let approverId = null;
    let currentApproverRole = 'MANAGER';
    let status = 'PENDENTE_GESTOR';

    // ROTA A: FERRAMENTAS (Vai para o Owner)
    if (['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(safeType) || isExtraordinary) {
      try {
        // Tenta extrair o nome da ferramenta do JSON
        const toolName = detailsObj.tool || detailsObj.toolName || (detailsObj.info ? detailsObj.info.split(': ')[1] : null);

        if (toolName) {
          const route = await findToolApprover(toolName);
          approverId = route.approverId;
          currentApproverRole = route.role;

          if (route.role === 'TOOL_OWNER') status = 'PENDENTE_OWNER';
          else if (route.role === 'TOOL_SUB_OWNER') status = 'PENDENTE_SUB_OWNER';
          else status = 'PENDENTE_SI';
        } else {
          // Se não achou nome da ferramenta, cai para Segurança
          status = 'PENDENTE_SI';
          currentApproverRole = 'SI_ANALYST';
        }
      } catch (error) {
        console.warn("Fallback: Ferramenta/Owner não encontrado.", error);
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }
    // ROTA B: GESTÃO DE PESSOAS (Vai para o Gestor)
    else {
      const requester = await prisma.user.findUnique({
        where: { id: safeRequesterId },
        include: { manager: true }
      });

      if (requester?.manager) {
        approverId = requester.manager.id;
      } else {
        // Se não tem gestor, cai para o RH ou Admin
        status = 'PENDENTE_RH';
        currentApproverRole = 'HR_ANALYST';
      }
    }

    const newRequest = await prisma.request.create({
      data: {
        requesterId: safeRequesterId,
        type: safeType,
        details: detailsString,
        justification: justification ? String(justification) : null,
        status,
        currentApproverRole,
        approverId, // Pode ser null se não tiver owner/gestor
        isExtraordinary: Boolean(isExtraordinary)
      }
    });

    return res.status(201).json(newRequest);

  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};

// ============================================================
// 2. LISTAR SOLICITAÇÕES (GET)
// ============================================================
export const getSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } }
        // Se tivesse tabela de aprovadores, incluiria aqui
      }
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// ============================================================
// 3. ATUALIZAR / APROVAR (PATCH)
// ============================================================
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approverId, adminNote } = req.body; // adminNote vem do frontend

  try {
    // 1. Busca a solicitação original
    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true }
    });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    const safeStatus = String(status);

    // 2. Atualiza o JSON de detalhes com a Justificativa do Admin
    const currentDetails = JSON.parse(request.details || '{}');
    const updatedDetails = {
      ...currentDetails,
      adminNote: adminNote || 'Sem justificativa informada.'
    };

    // 3. Atualiza no Banco
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status: safeStatus,
        // Se veio um approverId novo (ex: encaminhamento), usa. Se não, mantém null.
        // Na aprovação simples, geralmente não mudamos o approverId, apenas o status.
        updatedAt: new Date(),
        details: JSON.stringify(updatedDetails)
      }
    });

    // 4. NOTIFICAÇÃO SLACK (A Mágica ✨)
    if (request.requester.email) {
      // Envia DM pro usuário avisando que foi Aprovado/Reprovado
      sendSlackNotification(
        request.requester.email,
        safeStatus,
        adminNote || 'Processado pelo administrador.'
      );
    }

    // 5. GATILHO: SE APROVADO -> CRIA ACESSO NA TABELA (Trigger)
    if (safeStatus === 'APROVADO' && ['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(request.type)) {
      try {
        const toolName = currentDetails.tool || currentDetails.toolName;

        // Quem ganha o acesso? (Pode ser o solicitante ou um beneficiário escrito no detalhe)
        const rawTarget = currentDetails.beneficiaryId || request.requesterId;
        const targetUserId = String(rawTarget);

        // Qual nível?
        const rawLevel = currentDetails.target || currentDetails.targetAccess || 'Membro';
        const accessLevel = String(rawLevel);

        if (toolName) {
          // Busca a ferramenta pelo nome (insensitivo)
          const tool = await prisma.tool.findFirst({
            where: {
              name: { contains: toolName, mode: 'insensitive' }
            }
          });

          if (tool) {
            // Cria registro na tabela Access
            await prisma.access.create({
              data: {
                toolId: tool.id,
                userId: targetUserId,
                status: accessLevel // O status na tabela Access é o Nível (Ex: "Admin (GL-1)")
              }
            });
            console.log(`✅ ACESSO AUTOMÁTICO CRIADO: ${tool.name} para ${targetUserId}`);
          } else {
            console.warn(`⚠️ Ferramenta "${toolName}" não encontrada para criar acesso automático.`);
          }
        }
      } catch (triggerError) {
        console.error("❌ Erro no gatilho de acesso automático:", triggerError);
        // Não falhamos a requisição inteira só por causa do gatilho, apenas logamos.
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};