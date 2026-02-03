// @ts-nocheck
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSlackNotification } from '../services/slackService';

const prisma = new PrismaClient();

// ============================================================
// AUXILIAR: Encontrar Aprovador da Ferramenta
// ============================================================
async function findToolApprover(toolName: string) {
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

  if (tool.owner) return { approverId: tool.owner.id, role: 'TOOL_OWNER' };
  if (tool.subOwner) return { approverId: tool.subOwner.id, role: 'TOOL_SUB_OWNER' };

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

    let detailsObj: any = {};
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

    // ROTA A: FERRAMENTAS
    if (['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA'].includes(safeType) || isExtraordinary) {
      try {
        const toolName = detailsObj.tool || detailsObj.toolName || (detailsObj.info ? detailsObj.info.split(': ')[1] : null);
        if (toolName) {
          const route = await findToolApprover(toolName);
          approverId = route.approverId;
          currentApproverRole = route.role;
          if (route.role === 'TOOL_OWNER') status = 'PENDENTE_OWNER';
          else if (route.role === 'TOOL_SUB_OWNER') status = 'PENDENTE_SUB_OWNER';
          else status = 'PENDENTE_SI';
        } else {
          status = 'PENDENTE_SI';
          currentApproverRole = 'SI_ANALYST';
        }
      } catch (error) {
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }
    // ROTA B: GESTÃO DE PESSOAS
    else {
      const requester = await prisma.user.findUnique({
        where: { id: safeRequesterId },
        include: { manager: true }
      });
      if (requester?.manager) {
        approverId = requester.manager.id;
      } else {
        status = 'PENDENTE_RH';
        currentApproverRole = 'HR_ANALYST';
      }
    }

    if (isExtraordinary) {
      status = 'PENDENTE_SI';
      currentApproverRole = 'SI_ANALYST';
    }

    const newRequest = await prisma.request.create({
      data: {
        requesterId: safeRequesterId,
        type: safeType,
        details: detailsString,
        justification: justification ? String(justification) : null,
        status,
        currentApproverRole,
        approverId, // Define quem DEVE aprovar (pendente)
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
// 2. LISTAR SOLICITAÇÕES (GET) - AJUSTADO PARA AUDITORIA
// ============================================================
export const getSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
        // AQUI ESTÁ O SEGREDO: Incluir dados de quem aprovou/reprovou
        approver: { select: { id: true, name: true, email: true } }
      }
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// ============================================================
// 3. ATUALIZAR / APROVAR (PATCH) - AJUSTADO PARA SALVAR RESPONSÁVEL
// ============================================================
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  // Agora recebemos também o 'approverId' que vem do frontend (quem clicou no botão)
  const { status, adminNote, approverId } = req.body;

  try {
    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true }
    });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    const safeStatus = String(status);

    // Atualiza JSON de detalhes
    const currentDetails = JSON.parse(request.details || '{}');
    const updatedDetails = {
      ...currentDetails,
      adminNote: adminNote || 'Sem observações.'
    };

    // Dados a atualizar no banco
    const updateData: any = {
      status: safeStatus,
      updatedAt: new Date(),
      details: JSON.stringify(updatedDetails),
      // Se o schema tiver coluna adminNote, salva nela também
      adminNote: adminNote
    };

    // Se quem está aprovando agora é diferente de quem estava "pendente", 
    // atualizamos o campo approverId para refletir QUEM FEZ a ação.
    if (approverId) {
      updateData.approverId = approverId;
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData
    });

    // Notificação Slack
    if (request.requester.email) {
      sendSlackNotification(
        request.requester.email,
        safeStatus,
        adminNote || 'Processado pelo administrador.'
      );
    }

    // GATILHO: Acesso Automático
    if (safeStatus === 'APROVADO' && ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA'].includes(request.type)) {
      try {
        const toolName = currentDetails.tool || currentDetails.toolName;
        const targetUserId = request.requesterId;
        const rawLevel = currentDetails.target || currentDetails.targetAccess || 'Membro';
        const accessLevel = String(rawLevel);

        if (toolName) {
          const tool = await prisma.tool.findFirst({
            where: { name: { contains: toolName, mode: 'insensitive' } }
          });

          if (tool) {
            await prisma.access.create({
              data: {
                toolId: tool.id,
                userId: targetUserId,
                status: accessLevel
              }
            });
            console.log(`✅ ACESSO CRIADO: ${tool.name} - ${accessLevel}`);
          }
        }
      } catch (triggerError) {
        console.error("❌ Erro gatilho automático:", triggerError);
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};