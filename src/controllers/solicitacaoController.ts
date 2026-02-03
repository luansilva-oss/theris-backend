// @ts-nocheck
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSlackNotification } from '../services/slackService';

const prisma = new PrismaClient();

// ============================================================
// AUXILIAR: Encontrar Aprovador da Ferramenta
// ============================================================
async function findToolApprover(toolName: string) {
  // Tenta achar a ferramenta pelo nome ou sigla
  const tool = await prisma.tool.findFirst({
    where: {
      OR: [
        { name: { contains: toolName, mode: 'insensitive' } },
        { name: { equals: toolName } } // Para busca exata de sigla se houver
      ]
    },
    include: { owner: true, subOwner: true }
  });

  if (!tool) throw new Error('Ferramenta não encontrada');

  // Prioridade: Owner -> SubOwner -> SI (Fallback)
  if (tool.owner) {
    return { approverId: tool.owner.id, role: 'TOOL_OWNER' };
  }
  if (tool.subOwner) {
    return { approverId: tool.subOwner.id, role: 'TOOL_SUB_OWNER' };
  }

  return { approverId: null, role: 'SI_ANALYST' };
}

// ============================================================
// 1. CRIAR SOLICITAÇÃO (POST) - Chamado pelo Slack ou Web
// ============================================================
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    const { requesterId, type, details, justification, isExtraordinary } = req.body;

    const safeRequesterId = String(requesterId);
    const safeType = String(type);

    // Garante que details seja processado corretamente (String ou Objeto)
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

    // ROTA A: FERRAMENTAS (Vai para o Owner da ferramenta)
    if (['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA'].includes(safeType) || isExtraordinary) {
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
        console.warn("Fallback: Ferramenta/Owner não encontrado. Enviando para SI.", error);
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }
    // ROTA B: GESTÃO DE PESSOAS (Vai para o Gestor Direto ou RH)
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

    // Se for Extraordinário, força Segurança da Informação
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
        approverId,
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
// 2. LISTAR SOLICITAÇÕES (GET) - Para o Dashboard
// ============================================================
export const getSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } }
      }
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// ============================================================
// 3. ATUALIZAR / APROVAR (PATCH) - Ação do Admin
// ============================================================
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminNote } = req.body; // adminNote vem do prompt do frontend

  try {
    // 1. Busca a solicitação original
    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true }
    });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    const safeStatus = String(status);

    // 2. Atualiza o JSON de detalhes inserindo a Justificativa do Admin
    const currentDetails = JSON.parse(request.details || '{}');
    const updatedDetails = {
      ...currentDetails,
      adminNote: adminNote || 'Sem observações.'
    };

    // 3. Atualiza no Banco
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status: safeStatus,
        updatedAt: new Date(),
        details: JSON.stringify(updatedDetails)
      }
    });

    // 4. NOTIFICAÇÃO SLACK (Envia DM pro usuário)
    if (request.requester.email) {
      sendSlackNotification(
        request.requester.email,
        safeStatus,
        adminNote || 'Processado pelo administrador.'
      );
    }

    // 5. GATILHO: SE APROVADO -> CRIA O ACESSO NA TABELA (Trigger)
    if (safeStatus === 'APROVADO' && ['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA'].includes(request.type)) {
      try {
        const toolName = currentDetails.tool || currentDetails.toolName;

        // Quem ganha o acesso? (Pode ser o solicitante ou um terceiro especificado)
        const rawTarget = currentDetails.beneficiary || request.requesterId; // beneficiary vem do modal extra

        // Se for string (nome/email do slack modal), tenta achar user, senão usa ID direto
        let targetUserId = request.requesterId;

        // Tenta achar o nível solicitado
        const rawLevel = currentDetails.target || currentDetails.targetAccess || 'Membro';
        const accessLevel = String(rawLevel);

        if (toolName) {
          // Busca a ferramenta
          const tool = await prisma.tool.findFirst({
            where: {
              name: { contains: toolName, mode: 'insensitive' }
            }
          });

          if (tool) {
            // Cria registro na tabela Access
            // O campo 'status' da tabela Access estamos usando para guardar o NOME do nível (ex: Admin GL-1)
            await prisma.access.create({
              data: {
                toolId: tool.id,
                userId: targetUserId,
                status: accessLevel
              }
            });
            console.log(`✅ ACESSO AUTOMÁTICO CRIADO: ${tool.name} - Nível: ${accessLevel}`);
          } else {
            console.warn(`⚠️ Ferramenta "${toolName}" não encontrada para automação.`);
          }
        }
      } catch (triggerError) {
        console.error("❌ Erro no gatilho de acesso automático:", triggerError);
        // Não falhamos a requisição inteira só por causa do gatilho
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};