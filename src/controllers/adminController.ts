import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** GET /api/admin/login-attempts — apenas SUPER_ADMIN. Query: limit, page, onlyFailed, email, ip, since (ISO). */
export const getLoginAttempts = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
  const caller = await prisma.user.findUnique({ where: { id: userId }, select: { systemProfile: true } });
  if (caller?.systemProfile !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Acesso negado.' });

  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const onlyFailed = req.query.onlyFailed === 'true';
  const email = (req.query.email as string)?.trim() || undefined;
  const ip = (req.query.ip as string)?.trim() || undefined;
  const since = (req.query.since as string)?.trim() || undefined;

  const where: any = {};
  if (onlyFailed) where.success = false;
  if (email) where.email = { contains: email, mode: 'insensitive' };
  if (ip) where.ipAddress = { contains: ip };
  if (since) where.createdAt = { gte: new Date(since) };

  const [items, total] = await Promise.all([
    prisma.loginAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.loginAttempt.count({ where }),
  ]);

  return res.json({ items, total, limit, page });
};

/** GET /api/admin/sessions — apenas SUPER_ADMIN. Sessões ativas com dados do usuário. */
export const getSessions = async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string)?.trim();
  if (!userId) return res.status(401).json({ error: 'Usuário não identificado.' });
  const caller = await prisma.user.findUnique({ where: { id: userId }, select: { systemProfile: true } });
  if (caller?.systemProfile !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Acesso negado.' });

  const sessions = await prisma.session.findMany({
    orderBy: { lastActivity: 'desc' },
  });
  if (sessions.length === 0) return res.json([]);

  const userIds = [...new Set(sessions.map((s) => s.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      systemProfile: true,
      departmentRef: { select: { name: true } },
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const now = Date.now();

  const items = sessions.map((s) => {
    const u = userMap.get(s.userId);
    const createdAt = s.createdAt ? new Date(s.createdAt).getTime() : new Date(s.lastActivity).getTime();
    const lastActivityTime = new Date(s.lastActivity).getTime();
    return {
      sessionId: s.id,
      userId: s.userId,
      userName: u?.name ?? '—',
      userEmail: u?.email ?? '—',
      userRole: u?.systemProfile ?? '—',
      userDepartment: u?.departmentRef?.name ?? '—',
      lastActivity: s.lastActivity,
      createdAt: s.createdAt ?? s.lastActivity,
      minutesActive: Math.floor((now - createdAt) / 60000),
      minutesSinceActivity: Math.floor((now - lastActivityTime) / 60000),
    };
  });

  return res.json(items);
};

/** DELETE /api/admin/sessions/:userId — revogar sessão de um usuário. */
export const revokeSession = async (req: Request, res: Response) => {
  const callerId = (req.headers['x-user-id'] as string)?.trim();
  if (!callerId) return res.status(401).json({ error: 'Usuário não identificado.' });
  const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { systemProfile: true, name: true } });
  if (caller?.systemProfile !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Acesso negado.' });

  const targetUserId = req.params.userId;
  if (!targetUserId) return res.status(400).json({ error: 'userId obrigatório.' });

  const session = await prisma.session.findUnique({ where: { userId: targetUserId } });
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });

  await prisma.session.delete({ where: { userId: targetUserId } });
  await prisma.historicoMudanca.create({
    data: {
      tipo: 'SESSION_REVOKED',
      entidadeTipo: 'User',
      entidadeId: targetUserId,
      descricao: `Sessão revogada por ${caller.name ?? 'SUPER_ADMIN'}.`,
      dadosAntes: { status: 'ATIVA' },
      dadosDepois: { status: 'REVOGADA' },
      autorId: callerId,
    },
  });

  return res.json({ success: true });
};

/** DELETE /api/admin/sessions — revogar todas as sessões exceto a do próprio usuário. */
export const revokeAllSessions = async (req: Request, res: Response) => {
  const callerId = (req.headers['x-user-id'] as string)?.trim();
  if (!callerId) return res.status(401).json({ error: 'Usuário não identificado.' });
  const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { systemProfile: true, name: true } });
  if (caller?.systemProfile !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Acesso negado.' });

  const sessions = await prisma.session.findMany({
    where: { userId: { not: callerId } },
  });

  for (const s of sessions) {
    await prisma.session.delete({ where: { userId: s.userId } });
    await prisma.historicoMudanca.create({
      data: {
        tipo: 'SESSION_REVOKED',
        entidadeTipo: 'User',
        entidadeId: s.userId,
        descricao: `Sessão revogada em lote por ${caller.name ?? 'SUPER_ADMIN'}.`,
        dadosAntes: { status: 'ATIVA' },
        dadosDepois: { status: 'REVOGADA' },
        autorId: callerId,
      },
    });
  }

  return res.json({ success: true, count: sessions.length });
};

// --- DADOS OFICIAIS (A tua lista completa) ---
const toolsData = [
    {
        name: "JumpCloud", acronym: "JC",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: "luan.silva@grupo-3c.com", subOwnerName: "Luan Matheus",
        accesses: [
            { email: "vladimir.sesar@grupo-3c.com", level: "Administrador with Billing" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador with Billing" },
            { email: "luan.silva@grupo-3c.com", level: "Administrador with Billing" },
            { email: "allan.vonstein@grupo-3c.com", level: "Administrador with Billing" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Help Desk" }
        ]
    },
    {
        name: "ClickUp", acronym: "CK",
        ownerEmail: "isabely.wendler@grupo-3c.com", ownerName: "Isabely Wendler",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Proprietário" },
            { email: "alexander.reis@grupo-3c.com", level: "Administrador" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "isabely.wendler@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Administrador" },
            { email: "ricardo.camargo@grupo-3c.com", level: "Administrador" },
            { email: "alan.armstrong@grupo-3c.com", level: "Membro" },
            { email: "bruno.levy@grupo-3c.com", level: "Membro" },
            { email: "fernando.takakusa@grupo-3c.com", level: "Membro" },
            { email: "gabriel.krysa@grupo-3c.com", level: "Membro" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Membro" },
            { email: "luan.silva@grupo-3c.com", level: "Membro" }
        ]
    },
    {
        name: "HubSpot", acronym: "HS",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        subOwnerEmail: "deborah.peres@grupo-3c.com", subOwnerName: "Deborah Peres",
        accesses: [
            { email: "wagner.wolff@grupo-3c.com", level: "Administrador" },
            { email: "thiago.marcondes@grupo-3c.com", level: "Administrador" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Administrador" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" },
            { email: "thomas.ferreira@grupo-3c.com", level: "Líder Comercial" },
            { email: "camila.oliveira@grupo-3c.com", level: "Líder Comercial" },
            { email: "taissa.almeida@grupo-3c.com", level: "Closer / Analista" },
            { email: "felipe.nascimento@grupo-3c.com", level: "Atendimento" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Service / Sales" }
        ]
    },
    {
        name: "3C Plus", acronym: "CP",
        ownerEmail: "allan.vonstein@grupo-3c.com", ownerName: "Allan Von Stein",
        subOwnerEmail: "fernando.mosquer@grupo-3c.com", subOwnerName: "Fernando Mosquer",
        accesses: [
            { email: "andrieli.javorski@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "vladimir.sesar@grupo-3c.com", level: "Nível 3 (Produto)" },
            { email: "diogo.hartmann@3cplusnow.com", level: "Admin / Elements" },
            { email: "alana.gaspar@grupo-3c.com", level: "Nível 2 (Atendimento)" },
            { email: "alexsandy.correa@grupo-3c.com", level: "Nível 2 (Comercial)" }
        ]
    },
    {
        name: "GitLab", acronym: "GL",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "bruno.levy@grupo-3c.com", level: "Administrator" },
            { email: "carlos.marques@grupo-3c.com", level: "Administrator" },
            { email: "diogo.hartmann@grupo-3c.com", level: "Administrator" },
            { email: "gabriel.krysa@3cplusnow.com", level: "Administrator" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "Administrator" },
            { email: "andrieli.javorski@grupo-3c.com", level: "Regular" },
            { email: "eduardo.goncalves@grupo-3c.com", level: "Regular" }
        ]
    },
    {
        name: "AWS", acronym: "AS",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "alexander.reis@grupo-3c.com", level: "User" },
            { email: "carlos.marques@grupo-3c.com", level: "User" },
            { email: "diogo.hartmann@grupo-3c.com", level: "User" },
            { email: "joao.vasconcelos@grupo-3c.com", level: "User" },
            { email: "vladimir.sesar@grupo-3c.com", level: "User" }
        ]
    },
    {
        name: "GCP", acronym: "GC",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        subOwnerEmail: "joao.vasconcelos@grupo-3c.com", subOwnerName: "Joao Paulo",
        accesses: [
            { email: "diogo.hartmann@grupo-3c.com", level: "Owner" },
            { email: "pablo.emanuel@grupo-3c.com", level: "Admin" },
            { email: "vinicius.assmann@grupo-3c.com", level: "Admin" }
        ]
    },
    {
        name: "Convenia", acronym: "CV",
        ownerEmail: "raphael.pires@grupo-3c.com", ownerName: "Raphael Pires",
        subOwnerEmail: "renata.czapiewski@grupo-3c.com", subOwnerName: "Renata Czapiewski",
        accesses: [
            { email: "ney.pereira@grupo-3c.com", level: "Owner" },
            { email: "raphael.pires@grupo-3c.com", level: "Owner" },
            { email: "renata.czapiewski@grupo-3c.com", level: "Pessoas e Cultura" }
        ]
    },
    {
        name: "Clicsign", acronym: "CS",
        ownerEmail: "fernando.takakusa@grupo-3c.com", ownerName: "Fernando Takakusa",
        subOwnerEmail: "aline.fonseca@grupo-3c.com", subOwnerName: "Aline Fonseca",
        accesses: [
            { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" },
            { email: "aline.fonseca@grupo-3c.com", level: "Membro" },
            { email: "raphael.pires@grupo-3c.com", level: "Membro" }
        ]
    },
    {
        name: "Figma", acronym: "FA",
        ownerEmail: "gabriel.ida@grupo-3c.com", ownerName: "Gabriel Pires Ida",
        subOwnerEmail: null, subOwnerName: null,
        accesses: [
            { email: "gabriel.ida@grupo-3c.com", level: "Full (Total)" },
            { email: "guilherme.pimpao@grupo-3c.com", level: "Full (Total)" },
            { email: "diogo.hartmann@grupo-3c.com", level: "View" }
        ]
    },
    {
        name: "Slack", acronym: null,
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        subOwnerEmail: null, subOwnerName: null,
        accesses: []
    },
    {
        name: "Evolux", acronym: "EX",
        ownerEmail: "carlos.marques@grupo-3c.com", ownerName: "Carlos Marques",
        accesses: []
    },
    {
        name: "Dizify", acronym: "DZ",
        ownerEmail: "marieli.ferreira@grupo-3c.com", ownerName: "Marieli Ferreira",
        accesses: [ { email: "marieli.ferreira@grupo-3c.com", level: "Administrador" } ]
    },
    {
        name: "Next Suit", acronym: "NS",
        ownerEmail: "aline.fonseca@grupo-3c.com", ownerName: "Aline Fonseca",
        accesses: [ { email: "fernando.takakusa@grupo-3c.com", level: "Administrador" } ]
    },
    {
        name: "Fiqon", acronym: "FO",
        ownerEmail: "guilherme.pinheiro@grupo-3c.com", ownerName: "Guilherme Pinheiro",
        accesses: [ { email: "lucas.matheus@grupo-3c.com", level: "Administrador" } ]
    },
    {
        name: "N8N", acronym: "NA",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [ { email: "pablo.emanuel@grupo-3c.com", level: "Owner" } ]
    },
    {
        name: "Hik Connect", acronym: "HC",
        ownerEmail: "vladimir.sesar@grupo-3c.com", ownerName: "Vladimir Sesar",
        accesses: [ { email: "portaria@grupo-3c.com", level: "Administrador" } ]
    },
    {
        name: "Chat GPT", acronym: "CG",
        ownerEmail: "pablo.emanuel@3cplusnow.com", ownerName: "Pablo Emanuel",
        accesses: [ { email: "wagner@3cplusnow.com", level: "Proprietário" } ]
    },
    {
        name: "Focus", acronym: "FU",
        ownerEmail: "aline.fonseca@3cplusnow.com", ownerName: "Aline Fonseca",
        accesses: [ { email: "aline.fonseca@3cplusnow.com", level: "Administrador" } ]
    },
    {
        name: "Vindi", acronym: "VI",
        ownerEmail: "pablo.emanuel@grupo-3c.com", ownerName: "Pablo Emanuel",
        accesses: [ { email: "pablo.emanuel@grupo-3c.com", level: "Administrador" } ]
    },
    {
        name: "NextRouter", acronym: "NR",
        ownerEmail: "diogo.hartmann@grupo-3c.com", ownerName: "Diogo Hartmann",
        accesses: [ { email: "diogo.hartmann@grupo-3c.com", level: "Administrador" } ]
    },
    {
        name: "Meta", acronym: "MT",
        ownerEmail: "rafael.schimanski@grupo-3c.com", ownerName: "Rafael Blaka",
        accesses: [ { email: "rafael.schimanski@3cplusnow.com", level: "Business Manager" } ]
    }
];

// --- FUNÇÃO AUXILIAR (BUSCA USER INTELIGENTE) ---
async function ensureUser(email: string, name: string) {
    if (!email) return null;
    let user = await prisma.user.findFirst({
        where: { OR: [{ email: { equals: email, mode: 'insensitive' } }] }
    });
    // Fallback: Tenta trocar domínio (3cplusnow <-> grupo-3c)
    if (!user) {
        const altEmail = email.includes('3cplusnow')
            ? email.replace('3cplusnow.com', 'grupo-3c.com')
            : email.replace('grupo-3c.com', '3cplusnow.com');
        user = await prisma.user.findFirst({ where: { email: { equals: altEmail, mode: 'insensitive' } } });
    }
    // Cria placeholder se não achar
    if (!user) {
        try {
            user = await prisma.user.create({
                data: {
                    name: name || email.split('@')[0],
                    email: email,
                    jobTitle: "Não mapeado",
                    departmentId: (await prisma.department.findFirst({ where: { name: { equals: 'Geral', mode: 'insensitive' } } }))?.id ?? null
                }
            });
        } catch (e) {
            user = await prisma.user.findUnique({ where: { email } });
        }
    }
    return user;
}

// --- FUNÇÃO PRINCIPAL (ROTA) ---
export const resetCatalog = async (req: Request, res: Response) => {
    try {
        console.log('🚨 API: INICIANDO RESET DE CATÁLOGO...');
        
        // 1. Limpeza
        await prisma.access.deleteMany({});
        await prisma.tool.deleteMany({});
        console.log('🗑️ Catálogo zerado.');

        // 2. Recriação
        let count = 0;
        for (const t of toolsData) {
            const owner = await ensureUser(t.ownerEmail, t.ownerName);
            let subOwner = null;
            if (t.subOwnerEmail) subOwner = await ensureUser(t.subOwnerEmail, t.subOwnerName || '');

            const tool = await prisma.tool.create({
                data: {
                    name: t.name,
                    acronym: t.acronym || undefined,
                    ownerId: owner?.id,
                    subOwnerId: subOwner?.id
                }
            });

            if (t.accesses) {
                for (const acc of t.accesses) {
                    const u = await ensureUser(acc.email, acc.email.split('@')[0]);
                    if (u) {
                        await prisma.access.create({
                            data: { toolId: tool.id, userId: u.id, status: acc.level }
                        });
                    }
                }
            }
            count++;
        }

        return res.status(200).json({ 
            message: `Sucesso! ${count} ferramentas restauradas.`, 
            timestamp: new Date() 
        });

    } catch (error) {
        console.error("❌ Erro ao resetar catálogo:", error);
        return res.status(500).json({ error: "Erro interno ao processar catálogo." });
    }
};