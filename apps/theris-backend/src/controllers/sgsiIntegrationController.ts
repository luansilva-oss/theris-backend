import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/sgsi-integration/users
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        systemProfile: true,
        unitRef: { select: { name: true } },
        departmentRef: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
}

// GET /api/sgsi-integration/users/by-email/:email
export async function getUserByEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.params;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        systemProfile: true,
        isActive: true,
        unitRef: { select: { name: true } },
        departmentRef: { select: { name: true } },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
}

// GET /api/sgsi-integration/users/si-members
export async function getSiMembers(req: Request, res: Response): Promise<void> {
  try {
    const members = await prisma.user.findMany({
      where: {
        isActive: true,
        systemProfile: { in: ['SUPER_ADMIN'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        systemProfile: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(members);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar membros do SI.' });
  }
}

// GET /api/sgsi-integration/users/board
export async function getBoardMembers(req: Request, res: Response): Promise<void> {
  try {
    const members = await prisma.user.findMany({
      where: {
        isActive: true,
        systemProfile: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        systemProfile: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(members);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar membros do Board.' });
  }
}
