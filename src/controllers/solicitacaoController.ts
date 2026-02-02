import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findToolApprover } from '../services/approvalService';

const prisma = new PrismaClient();

// --- FUNÇÕES AUXILIARES PARA ACALMAR O TYPESCRIPT ---
// Força qualquer coisa a virar uma string simples, pegando o primeiro item se for array
const safeString = (value: any): string => {
  if (Array.isArray(value)) return String(value[0]);
  if (!value) return "";
  return String(value);
};

// O mesmo, mas permite retornar null (para campos opcionais)
const safeStringOrNull = (value: any): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) return String(value[0]);
  return String(value);
};

// --- CRIAR SOLICITAÇÃO ---
export const createSolicitacao = async (req: Request, res: Response) => {
  try {
    // Cast brutal para 'any' na entrada
    const body = req.body as any;

    const requesterId = safeString(body.requesterId);
    const type = safeString(body.type);
    const details = body.details; // Mantém original para processar
    const justification = body.justification ? safeString(body.justification) : null;
    const isExtraordinary = Boolean(body.isExtraordinary);

    const detailsString = typeof details === 'string' ? details : JSON.stringify(details);
    const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;

    let approverId: string | null = null;
    let currentApproverRole = 'MANAGER';
    let status = 'PENDENTE_GESTOR';

    // ROTA 1: FERRAMENTAS
    if (['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(type) || isExtraordinary) {
      try {
        const toolName = detailsObj.tool || detailsObj.toolName || (detailsObj.info ? detailsObj.info.split(': ')[1] : null);

        if (toolName) {
          const route = await findToolApprover(toolName);
          approverId = route.approverId;
          currentApproverRole = route.role;

          if (route.role.includes('OWNER')) status = 'PENDENTE_OWNER';
          else if (route.role.includes('SI')) status = 'PENDENTE_SI';
          else if (route.role.includes('SUB')) status = 'PENDENTE_SUB_OWNER';
        }
      } catch (error) {
        console.warn("⚠️ Fallback: Owner não encontrado.", error);
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
      }
    }
    // ROTA 2: GESTÃO DE PESSOAS
    else {
      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        include: { manager: true }
      });

      if (requester?.manager) {
        approverId = requester.manager.id;
      } else {
        status = 'PENDENTE_RH';
      }
    }

    const newRequest = await prisma.request.create({
      data: {
        requesterId,
        type,
        details: detailsString,
        justification,
        status,
        currentApproverRole,
        approverId,
        isExtraordinary
      }
    });

    return res.status(201).json(newRequest);

  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};

// --- LISTAR ---
export const getSolicitacoes = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, department: true } },
        lastApprover: { select: { id: true, name: true } }
      }
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// --- ATUALIZAR ---
export const updateSolicitacao = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as any;

  // 1. Extração Higienizada dos dados
  // Aqui garantimos que SÃO strings antes de tocar no Prisma
  const statusInput: string = safeString(body.status);
  const approverIdInput: string | null = safeStringOrNull(body.approverId);

  try {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        status: statusInput,       // Agora é garantido ser string
        approverId: approverIdInput, // Agora é garantido ser string | null
        updatedAt: new Date()
      }
    });

    // GATILHO DE ACESSO
    if (statusInput === 'APROVADO' && ['ACCESS_TOOL', 'ACCESS_CHANGE'].includes(request.type)) {
      try {
        const details = JSON.parse(request.details);
        const toolName = details.tool || details.toolName;
        // targetUserId vem do beneficiaryId ou do próprio requester
        const targetUserId = details.beneficiaryId ? safeString(details.beneficiaryId) : request.requesterId;

        // Garante nível de acesso como string
        const rawLevel = details.target || details.targetAccess || 'Membro';
        const accessLevelInput: string = safeString(rawLevel);

        if (toolName) {
          const tool = await prisma.tool.findUnique({ where: { name: toolName } });

          if (tool) {
            await prisma.toolAccess.create({
              data: {
                toolId: tool.id,
                userId: targetUserId,
                accessLevel: accessLevelInput, // Garantido ser string
                status: 'ACTIVE'
              }
            });
            console.log(`✅ ACESSO AUTOMÁTICO: ${toolName}`);
          }
        }
      } catch (triggerError) {
        console.error("❌ Erro no gatilho:", triggerError);
      }
    }

    return res.json(updatedRequest);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};