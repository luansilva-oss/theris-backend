// @ts-nocheck
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSlackNotification } from '../services/slackService';

const prisma = new PrismaClient();

// ============================================================
// AUXILIAR: Encontrar Aprovador da Ferramenta (Lógica Avançada)
// ============================================================
async function findToolApprover(toolName: string, requesterId: string) {
  const tool = await prisma.tool.findFirst({
    where: {
      OR: [
        { name: { contains: toolName, mode: 'insensitive' } },
        { name: { equals: toolName } }
      ]
    },
    include: { owner: true, subOwner: true }
  });

  if (!tool) return { approverId: null, role: 'SI_ANALYST', status: 'PENDENTE_SI' };

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    include: { manager: true }
  });

  const managerId = requester?.managerId;

  // REGRA 1: Gestor Imediato aprova primeiro
  if (managerId) {
    // SE o Gestor Imediato NÃO for o Owner, ele aprova
    if (tool.ownerId !== managerId) {
      return { approverId: managerId, role: 'MANAGER', status: 'PENDENTE_GESTOR' };
    }

    // REGRA 2: Se Gestor == Owner, tenta Sub-owner
    if (tool.subOwnerId && tool.subOwnerId !== managerId) {
      return { approverId: tool.subOwnerId, role: 'TOOL_SUB_OWNER', status: 'PENDENTE_SUB_OWNER' };
    }
  }

  // REGRA 3: Se não tem gestor, ou gestor é owner e não tem sub-owner (ou sub-owner também é gestor), vai para SI
  return { approverId: null, role: 'SI_ANALYST', status: 'PENDENTE_SI' };
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

    // ROTA A: FERRAMENTAS / ACESSOS
    if (['ACCESS_TOOL', 'ACCESS_CHANGE', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO', 'ACCESS_TOOL_EXTRA'].includes(safeType) || isExtraordinary) {
      // REGRA DE NEGÓCIO: TODA SOLICITAÇÃO DE FERRAMENTA VAI PARA SI PRIMEIRO
      status = 'PENDENTE_SI';
      currentApproverRole = 'SI_ANALYST';
    }
    // ROTA B: GESTÃO DE PESSOAS / DEPUTY
    else if (['DEPUTY_DESIGNATION'].includes(safeType)) {
      status = 'PENDENTE_SI';
      currentApproverRole = 'SI_ANALYST';
    }
    // ROTA C: RH (Admissão, Promoção, Demissão)
    else if (['ADMISSAO', 'DEMISSAO', 'PROMOCAO', 'MUDANCA_AREA', 'HIRING', 'FIRING', 'CHANGE_ROLE'].includes(safeType)) {
      status = 'PENDENTE_SI';
      currentApproverRole = 'SI_ANALYST';
    }
    // ROTA D: GENÉRICA
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
        approverId,
        isExtraordinary: Boolean(isExtraordinary),
        extraordinaryDuration: detailsObj.duration ? parseInt(detailsObj.duration) : null,
        extraordinaryUnit: detailsObj.unit || null
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
        requester: { select: { id: true, name: true, email: true, department: true } },
        approver: { select: { id: true, name: true, email: true } }
      }
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// ============================================================
// 3. ATUALIZAR / APROVAR (PATCH) - CÉREBRO DA GOVERNANÇA
// ============================================================
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminNote, approverId } = req.body;

  try {
    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true }
    });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    // --- REGRA DE NEGÓCIO: NÃO PODE APROVAR A PRÓPRIA SOLICITAÇÃO ---
    if (approverId && approverId === request.requesterId) {
      return res.status(403).json({ error: 'Você não pode aprovar ou reprovar sua própria solicitação. Solicite a outro administrador.' });
    }
    // ---------------------------------------------------------------

    const safeStatus = String(status);
    let newApiStatus = safeStatus === 'APROVAR' ? 'APROVADO' : 'REPROVADO'; // Normaliza

    // --- WORKFLOW DE APROVAÇÃO (SI -> OWNER) ---
    // Apenas se for aprovação (Reprovação mata o fluxo na hora)
    if (newApiStatus === 'APROVADO') {
      // Se estiver pendente de SI, verificar se precisa ir para o Owner
      if (request.status === 'PENDENTE_SI') {
        const currentDetails = JSON.parse(request.details || '{}');
        const toolName = currentDetails.tool || currentDetails.toolName;

        if (toolName) {
          const tool = await prisma.tool.findFirst({
            where: {
              OR: [
                { name: { contains: toolName, mode: 'insensitive' } },
                { name: { equals: toolName } }
              ]
            },
            include: { owner: true, subOwner: true }
          });

          if (tool) {
            // Define quem deve aprovar (Owner ou Sub)
            // Se o requerente for o Owner, tenta o Sub. Se for o Sub, tenta o Owner.
            let nextApproverId = tool.ownerId;

            if (request.requesterId === tool.ownerId && tool.subOwnerId) {
              nextApproverId = tool.subOwnerId;
            }

            // Se achou um aprovador e NÃO É o próprio solicitante
            if (nextApproverId && nextApproverId !== request.requesterId) {
              // Mudar status para PENDENTE_OWNER em vez de APROVADO
              await prisma.request.update({
                where: { id },
                data: {
                  status: 'PENDENTE_OWNER',
                  currentApproverRole: 'TOOL_OWNER',
                  approverId: nextApproverId, // Define quem é OBRIGADO a aprovar
                  updatedAt: new Date(),
                  adminNote: adminNote ? adminNote + " (Aprovado por SI, aguardando Owner)" : "Aprovado por SI, aguardando Owner"
                }
              });

              return res.json({ message: "Aprovado por SI. Encaminhado para o Owner da ferramenta." });
            }
          }
        }
      }
    }
    // -------------------------------------------

    // Atualiza JSON de detalhes
    const currentDetails = JSON.parse(request.details || '{}');
    const updatedDetails = {
      ...currentDetails,
      adminNote: adminNote || 'Sem observações.'
    };

    // Dados a atualizar no banco (Auditoria)
    const updateData: any = {
      status: newApiStatus,
      updatedAt: new Date(),
      details: JSON.stringify(updatedDetails),
      adminNote: adminNote
    };

    // Salva QUEM clicou no botão (Auditável)
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
        newApiStatus,
        adminNote || 'Processado pelo administrador.'
      );
    }

    // =========================================================
    // 🚀 LÓGICA DE EXECUÇÃO AUTOMÁTICA
    // =========================================================
    if (newApiStatus === 'APROVADO') {

      // CENÁRIO 1: RH (Admissão, Promoção, Demissão)
      // AQUI NÃO FAZEMOS NADA NO BANCO.
      // O SI aprovou -> O RH recebe o ok -> Faz no Convenia -> Webhook do Convenia atualiza o Theris.
      if (['ADMISSAO', 'DEMISSAO', 'PROMOCAO', 'MUDANCA_AREA'].includes(request.type)) {
        console.log(`✅ RH: Solicitação ${request.type} aprovada. Aguardando sincronização do Convenia.`);
      }

      // CENÁRIO 2: ACESSO EXTRAORDINÁRIO / FERRAMENTA PONTUAL
      else if (['ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO', 'ACCESS_TOOL_EXTRA'].includes(request.type) || request.isExtraordinary) {
        try {
          const toolName = currentDetails.tool || currentDetails.toolName;
          const targetUserId = request.requesterId;
          const accessStatus = 'ACTIVE';

          if (toolName) {
            const tool = await prisma.tool.findFirst({
              where: { name: { contains: toolName, mode: 'insensitive' } }
            });

            if (tool) {
              const existing = await prisma.access.findFirst({
                where: { userId: targetUserId, toolId: tool.id }
              });

              if (existing) {
                await prisma.access.update({
                  where: { id: existing.id },
                  data: {
                    status: 'ACTIVE',
                    isExtraordinary: request.isExtraordinary,
                    duration: request.extraordinaryDuration,
                    unit: request.extraordinaryUnit
                  }
                });
              } else {
                await prisma.access.create({
                  data: {
                    toolId: tool.id,
                    userId: targetUserId,
                    status: 'ACTIVE',
                    isExtraordinary: request.isExtraordinary,
                    duration: request.extraordinaryDuration,
                    unit: request.extraordinaryUnit
                  }
                });
              }
              console.log(`✅ Acesso Extraordinário Concedido: ${tool.name}`);
            }
          }
        } catch (triggerError) {
          console.error("❌ Erro gatilho automático:", triggerError);
        }
      }

      // CENÁRIO 3: DESIGNAÇÃO DE DEPUTY (SUBSTITUTO)
      else if (request.type === 'DEPUTY_DESIGNATION') {
        try {
          const substituteName = currentDetails.substitute;
          // Tenta achar o usuário substituto pelo nome no banco
          const substituteUser = await prisma.user.findFirst({
            where: { name: { contains: substituteName, mode: 'insensitive' } }
          });

          if (substituteUser) {
            await prisma.user.update({
              where: { id: request.requesterId },
              data: { myDeputyId: substituteUser.id }
            });
            console.log(`✅ Deputy Designado: ${substituteUser.name} para o gestor ${request.requester.name}`);
          }
        } catch (deputyError) {
          console.error("❌ Erro ao designar deputy:", deputyError);
        }
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};