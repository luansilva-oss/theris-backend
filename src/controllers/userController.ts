import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        systemProfile: true,
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
  const { name, email, jobTitle, department, systemProfile } = req.body;
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