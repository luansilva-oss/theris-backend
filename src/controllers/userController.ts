import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// FUNÇÃO DE NORMALIZAÇÃO DE E-MAIL (nome.sobrenome@grupo-3c.com)
const normalizeEmail = (email: string): string => {
  const parts = email.toLowerCase().split('@')[0].split('.');
  const normalizedLocal = parts.length > 2
    ? `${parts[0]}.${parts[parts.length - 1]}`
    : parts.join('.');
  return `${normalizedLocal}@grupo-3c.com`;
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        department: true,
        systemProfile: true,
        manager: {
          select: {
            name: true
          }
        }
      } as any
    });

    return res.json(users);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({ error: "Erro interno ao buscar colaboradores." });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, jobTitle, department, systemProfile } = req.body;
  const rawEmail = req.body.email;
  const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
  const requesterId = req.headers['x-requester-id'] as string;

  try {
    if (!requesterId) return res.status(401).json({ error: "Identificação do solicitante ausente." });

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) return res.status(403).json({ error: "Solicitante não encontrado." });

    const isSuperAdmin = (requester as any).systemProfile === 'SUPER_ADMIN';
    const isGestor = ['GESTOR', 'ADMIN'].includes((requester as any).systemProfile);

    if (!isSuperAdmin && !isGestor) {
      return res.status(403).json({ error: "Sem permissão para editar usuários." });
    }

    if (systemProfile && !isSuperAdmin) {
      if (['SUPER_ADMIN', 'GESTOR', 'ADMIN'].includes(systemProfile)) {
        return res.status(403).json({ error: "Gestores não podem conceder perfis administrativos superiores." });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        jobTitle,
        department,
        systemProfile: (isSuperAdmin || isGestor) ? systemProfile : undefined
      }
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return res.status(500).json({ error: "Erro interno ao atualizar colaborador." });
  }
};

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(departments);
  } catch (error) {
    console.error("Erro ao listar departamentos:", error);
    return res.status(500).json({ error: "Erro interno ao buscar departamentos." });
  }
};