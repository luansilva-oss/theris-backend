import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** GET /api/kbu — lista todas as ferramentas do KBU (todos os perfis) */
export const getKbu = async (_req: Request, res: Response) => {
  try {
    const list = await prisma.kBUFerramenta.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' }
    });
    return res.json(list);
  } catch (error) {
    console.error('❌ Erro no getKbu:', error);
    return res.status(500).json({ error: 'Erro ao buscar KBU' });
  }
};

/** PUT /api/kbu/:id — atualiza uma ferramenta KBU (apenas SUPER_ADMIN) */
export const putKbu = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
  const caller = await prisma.user.findUnique({ where: { id: userId }, select: { systemProfile: true } });
  if (caller?.systemProfile !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Acesso negado. Apenas SUPER_ADMIN pode editar o KBU.' });

  const { id } = req.params;
  const { nome, sigla, owner, ativo } = req.body;
  try {
    const data: { nome?: string; sigla?: string; owner?: string; ativo?: boolean } = {};
    if (nome !== undefined) data.nome = nome;
    if (sigla !== undefined) data.sigla = sigla;
    if (owner !== undefined) data.owner = owner;
    if (ativo !== undefined) data.ativo = ativo;

    const updated = await prisma.kBUFerramenta.update({
      where: { id },
      data
    });
    return res.json(updated);
  } catch (error) {
    console.error('❌ Erro no putKbu:', error);
    return res.status(500).json({ error: 'Erro ao atualizar KBU' });
  }
};

/** POST /api/kbu — adiciona ferramenta ao KBU (apenas SUPER_ADMIN) */
export const postKbu = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
  const caller = await prisma.user.findUnique({ where: { id: userId }, select: { systemProfile: true } });
  if (caller?.systemProfile !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Acesso negado. Apenas SUPER_ADMIN pode editar o KBU.' });

  const { nome, sigla, owner } = req.body;
  if (!nome || typeof nome !== 'string' || !nome.trim()) return res.status(400).json({ error: 'Campo nome é obrigatório.' });
  try {
    const created = await prisma.kBUFerramenta.create({
      data: { nome: nome.trim(), sigla: sigla?.trim() || null, owner: owner?.trim() || null }
    });
    return res.status(201).json(created);
  } catch (error) {
    console.error('❌ Erro no postKbu:', error);
    return res.status(500).json({ error: 'Erro ao adicionar ferramenta ao KBU' });
  }
};

/** DELETE /api/kbu/:id — remove ferramenta do KBU (apenas SUPER_ADMIN) */
export const deleteKbu = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
  const caller = await prisma.user.findUnique({ where: { id: userId }, select: { systemProfile: true } });
  if (caller?.systemProfile !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Acesso negado. Apenas SUPER_ADMIN pode editar o KBU.' });

  const { id } = req.params;
  try {
    await prisma.kBUFerramenta.delete({ where: { id } });
    return res.json({ message: 'Ferramenta removida do KBU' });
  } catch (error) {
    console.error('❌ Erro no deleteKbu:', error);
    return res.status(500).json({ error: 'Erro ao remover do KBU' });
  }
};
