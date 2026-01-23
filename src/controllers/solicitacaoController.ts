import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- CRIAR SOLICITAÇÃO ---
export const criarSolicitacao = async (req: Request, res: Response) => {
  const { requesterId, type, details, justification, isExtraordinary } = req.body;

  try {
    // Define o primeiro passo da esteira
    // Se for Deputy Nomination, vai direto pra SI. Se não, vai pro Gestor.
    let initialStatus = 'PENDENTE_GESTOR';
    let initialRole = 'MANAGER';

    if (type === 'NOMINATE_DEPUTY') {
      initialStatus = 'PENDENTE_SI';
      initialRole = 'SI';
    }

    const novaSolicitacao = await prisma.request.create({
      data: {
        requesterId,
        type,
        details: JSON.stringify(details),
        justification,
        isExtraordinary: !!isExtraordinary,
        status: initialStatus,
        currentApproverRole: initialRole
      }
    });

    return res.status(201).json(novaSolicitacao);
  } catch (error) {
    console.error("Erro ao criar:", error);
    return res.status(500).json({ error: "Erro interno." });
  }
};

// --- LISTAR SOLICITAÇÕES ---
export const listarSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      include: { requester: true, lastApprover: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar." });
  }
};

// --- MÁQUINA DE ESTADOS DE APROVAÇÃO (UPDATE) ---
export const atualizarStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approverId } = req.body; // status aqui é 'APROVAR' ou 'REPROVAR'

  try {
    // CORREÇÃO 1: String(id) para garantir que é texto
    const request = await prisma.request.findUnique({ 
      where: { id: String(id) },
      include: { requester: { include: { manager: true } } }
    });

    if (!request) return res.status(404).json({ error: "Solicitação não encontrada" });

    // 1. Se foi REPROVADO, morre aqui.
    if (status === 'REPROVADO') {
      // CORREÇÃO 2: String(id)
      const updated = await prisma.request.update({
        where: { id: String(id) },
        data: { status: 'REPROVADO', lastApproverId: approverId, updatedAt: new Date() }
      });
      return res.json(updated);
    }

    // 2. Se foi APROVADO, calculamos o PRÓXIMO passo.
    let nextStatus = 'APROVADO'; // Padrão: acabou
    let nextRole = 'FINALIZADO';

    const details = JSON.parse(request.details);
    
    // LOGICA PARA FERRAMENTAS
    if (request.type === 'ACCESS_TOOL') {
      const toolName = details.toolName; 
      const tool = await prisma.tool.findFirst({ where: { name: toolName }, include: { owner: true, subOwner: true } });

      // Onde estamos agora?
      if (request.status === 'PENDENTE_GESTOR') {
        // Gestor aprovou. Próximo é o Owner da ferramenta.
        
        // CORREÇÃO 3: tool?.ownerId (Optional Chaining) para não quebrar se tool for null
        // CHECK DE CONFLITO (SoD): O Gestor que aprovou é o Owner?
        if (tool?.ownerId === approverId) {
          console.log("Conflito de SoD: Gestor é Owner. Escalando para Sub-Owner.");
          
          if (tool?.subOwnerId) {
            nextStatus = 'PENDENTE_SUB_OWNER';
            nextRole = 'SUB_OWNER';
          } else {
            console.log("Sem Sub-Owner. Escalando para SI (Fallback).");
            nextStatus = 'PENDENTE_SI';
            nextRole = 'SI';
          }
        } else {
          // Sem conflito, vai pro Owner normal
          if (tool?.ownerId) {
            nextStatus = 'PENDENTE_OWNER';
            nextRole = 'OWNER';
          } else {
             // Ferramenta sem dono? SI assume.
             nextStatus = 'PENDENTE_SI';
             nextRole = 'SI';
          }
        }
      } 
      
      else if (request.status === 'PENDENTE_OWNER' || request.status === 'PENDENTE_SUB_OWNER') {
        // Owner/Sub aprovou. Acabou? Depende.
        // É Admin ou Extraordinário?
        const isAdminAccess = details.accessLevel?.toLowerCase().includes('admin');
        
        if (isAdminAccess || request.isExtraordinary) {
          console.log("Acesso Crítico/Extraordinário. SI precisa aprovar.");
          nextStatus = 'PENDENTE_SI';
          nextRole = 'SI';
        } else {
          nextStatus = 'APROVADO'; // Fluxo normal finalizado
        }
      }
      
      else if (request.status === 'PENDENTE_SI') {
        nextStatus = 'APROVADO'; // SI é a autoridade final
      }
    } 
    
    // LOGICA PARA DEPUTY
    else if (request.type === 'NOMINATE_DEPUTY') {
        // Se SI aprovou a indicação
        if (request.status === 'PENDENTE_SI') {
            nextStatus = 'APROVADO';
            // Efetivar a mudança no usuário
            await prisma.user.update({
                where: { id: request.requesterId }, // Quem pediu (o Gestor) ganha o deputy
                data: { deputyId: details.targetUserId }
            });
        }
    }

    // Salva o novo estado
    // CORREÇÃO 4: String(id)
    const updatedRequest = await prisma.request.update({
      where: { id: String(id) },
      data: {
        status: nextStatus,
        currentApproverRole: nextRole,
        lastApproverId: approverId,
        updatedAt: new Date()
      }
    });

    return res.json(updatedRequest);

  } catch (error) {
    console.error("Erro na aprovação:", error);
    return res.status(500).json({ error: "Erro interno." });
  }
};