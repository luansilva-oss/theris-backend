import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendMfaEmail } from '../services/emailService';
import { getClientIp, getClientUserAgent } from '../lib/requestContext';
import { sendSuspiciousIpAlertToSI } from '../services/suspiciousIpSlackAlert';
import { registrarMudanca } from '../lib/auditLog';

const prisma = new PrismaClient();

async function logLoginAttempt(params: {
  req: Request;
  email?: string | null;
  success: boolean;
  failReason?: string | null;
  userId?: string | null;
}) {
  const { req, email, success, failReason, userId } = params;
  const clientIp = getClientIp(req);
  const userAgent = getClientUserAgent(req);
  try {
    await prisma.loginAttempt.create({
      data: {
        email: email ?? null,
        ipAddress: clientIp,
        userAgent: userAgent ?? undefined,
        success,
        failReason: failReason ?? null,
      },
    });

    if (!success) {
      await registrarMudanca({
        tipo: 'LOGIN_FAILED',
        entidadeTipo: 'User',
        entidadeId: userId ?? 'LOGIN_ATTEMPT',
        descricao: `Tentativa de login com falha: ${failReason ?? 'DESCONHECIDO'}`,
        dadosDepois: { ip: clientIp, email: email ?? null, failReason: failReason ?? null },
        autorId: undefined,
      }).catch((e) => console.error('[logLoginAttempt] HistoricoMudanca:', e));
      const recentFails = await prisma.loginAttempt.count({
        where: {
          ipAddress: clientIp,
          success: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (recentFails === 5) {
        sendSuspiciousIpAlertToSI({
          ipAddress: clientIp,
          email: email ?? null,
          failReason: failReason ?? null,
          timestamp: new Date(),
        }).catch((e) => console.error('[logLoginAttempt] Alerta IP suspeito:', e));
      }
    }
  } catch (e) {
    console.error('[logLoginAttempt]', e);
  }
}

// FUNÇÃO DE NORMALIZAÇÃO DE E-MAIL (nome.sobrenome@grupo-3c.com)
const normalizeEmail = (email: string): string => {
  const [localPart, domain] = email.toLowerCase().split('@');
  const parts = localPart.split('.');

  // Se tiver mais de 2 partes (ex: nome.nome.sobrenome), pega apenas a primeira e a última
  const normalizedLocal = parts.length > 2
    ? `${parts[0]}.${parts[parts.length - 1]}`
    : localPart;

  return `${normalizedLocal}@grupo-3c.com`; // Força o domínio correto também
};

// LOGIN COM GOOGLE
export const googleLogin = async (req: Request, res: Response) => {
  const { accessToken } = req.body;

  try {
    // 1. Validar Token no Google
    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    });

    if (!googleRes.ok) {
      await logLoginAttempt({ req, email: req.body?.email ?? null, success: false, failReason: 'GOOGLE_AUTH_FAILED', userId: undefined });
      return res.status(401).json({ error: 'Token Google inválido' });
    }

    const googleData = await googleRes.json();
    const rawEmail = googleData.email;
    const email = normalizeEmail(rawEmail);

    // 2. Verificar Domínio (Segurança)
    if (!email.endsWith('@grupo-3c.com')) {
      await logLoginAttempt({ req, email, success: false, failReason: 'DOMAIN_DENIED', userId: undefined });
      return res.status(403).json({ error: 'Acesso restrito ao domínio corporativo.' });
    }

    // 3. Buscar ou Criar Usuário (com manager para exibir Gestor Direto no Dashboard)
    let user = await prisma.user.findUnique({
      where: { email },
      include: { manager: { select: { id: true, name: true } } }
    });

    if (!user) {
      const deptGeral = await prisma.department.findFirst({ where: { name: { equals: 'Geral', mode: 'insensitive' } } });
      const created = await prisma.user.create({
        data: {
          email,
          name: googleData.name || 'Usuário Google',
          jobTitle: 'Colaborador',
          departmentId: deptGeral?.id ?? null
        }
      });
      user = await prisma.user.findUnique({
        where: { id: created.id },
        include: { manager: { select: { id: true, name: true } } }
      })!;
    }

    // 4. Definir Perfil de Sistema Persistente
    // Super Admins definidos pelo usuário
    const superAdminEmails = [
      'luan.silva@grupo-3c.com',
      'vladimir.sesar@grupo-3c.com',
      'allan.vonstein@grupo-3c.com',
      'si@grupo-3c.com'
    ];

    let systemProfile = (user as any).systemProfile;

    // Se o usuário está na lista de Super Admins e ainda é VIEWER, promove automaticamente
    if (superAdminEmails.includes(email.toLowerCase()) && systemProfile === 'VIEWER') {
      systemProfile = 'SUPER_ADMIN';
      await prisma.user.update({
        where: { id: user.id },
        data: { systemProfile: 'SUPER_ADMIN' }
      });
    }
    // Se for um gestor e ainda for VIEWER, vira APPROVER por padrão
    else if (systemProfile === 'VIEWER') {
      if (user.jobTitle && (user.jobTitle.includes('Coord') || user.jobTitle.includes('Gerente') || user.jobTitle.includes('Head'))) {
        systemProfile = 'APPROVER';
        await prisma.user.update({
          where: { id: user.id },
          data: { systemProfile: 'APPROVER' }
        });
      }
    }

    await logLoginAttempt({ req, email, success: true, userId: user.id });
    return res.json({
      user,
      profile: systemProfile,
      token: 'fake-jwt-token'
    });

  } catch (error) {
    console.error(error);
    await logLoginAttempt({ req, email: null, success: false, failReason: 'GOOGLE_AUTH_FAILED', userId: undefined });
    return res.status(500).json({ error: 'Erro no login Google' });
  }
};

// ENVIAR MFA
export const sendMfa = async (req: Request, res: Response) => {
  const { userId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await logLoginAttempt({ req, email: null, success: false, failReason: 'USER_NOT_FOUND', userId: undefined });
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Salva no banco
    await prisma.user.update({
      where: { id: userId },
      data: { mfaCode: code, mfaExpiresAt: expiresAt }
    });

    // Envia Email
    await sendMfaEmail(user.email, code);

    await logLoginAttempt({ req, email: user.email, success: true, userId: user.id });
    await registrarMudanca({
      tipo: 'MFA_SENT',
      entidadeTipo: 'User',
      entidadeId: user.id,
      descricao: 'Código MFA enviado por e-mail',
      dadosDepois: { ip: getClientIp(req) },
      autorId: user.id,
    }).catch((e) => console.error('[sendMfa] HistoricoMudanca:', e));
    res.json({ message: 'Código enviado' });
  } catch (error) {
    await logLoginAttempt({ req, email: null, success: false, failReason: 'MFA_SEND_FAILED', userId: undefined });
    res.status(500).json({ error: 'Erro ao enviar MFA' });
  }
};

// VERIFICAR MFA
export const verifyMfa = async (req: Request, res: Response) => {
  const { userId, code } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.mfaCode !== code) {
      await logLoginAttempt({ req, email: user?.email ?? null, success: false, failReason: 'MFA_INVALID', userId: user?.id ?? undefined });
      if (user) {
        await registrarMudanca({
          tipo: 'MFA_FAILED',
          entidadeTipo: 'User',
          entidadeId: user.id,
          descricao: 'Falha na verificação MFA: MFA_INVALID',
          dadosDepois: { ip: getClientIp(req), failReason: 'MFA_INVALID' },
          autorId: user.id,
        }).catch((e) => console.error('[verifyMfa] HistoricoMudanca:', e));
      }
      return res.status(400).json({ error: 'Código inválido', valid: false });
    }

    if (user.mfaExpiresAt && new Date() > user.mfaExpiresAt) {
      await logLoginAttempt({ req, email: user.email, success: false, failReason: 'MFA_EXPIRED', userId: user.id });
      await registrarMudanca({
        tipo: 'MFA_FAILED',
        entidadeTipo: 'User',
        entidadeId: user.id,
        descricao: 'Falha na verificação MFA: MFA_EXPIRED',
        dadosDepois: { ip: getClientIp(req), failReason: 'MFA_EXPIRED' },
        autorId: user.id,
      }).catch((e) => console.error('[verifyMfa] HistoricoMudanca:', e));
      return res.status(400).json({ error: 'Código expirado', valid: false });
    }

    // Limpa o código após uso (opcional, mas recomendado)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaCode: null, mfaExpiresAt: null }
    });

    // Criar/atualizar sessão para timeout por inatividade
    await prisma.session.upsert({
      where: { userId },
      create: { userId, lastActivity: new Date() },
      update: { lastActivity: new Date() },
    });

    await logLoginAttempt({ req, email: user.email, success: true, userId: user.id });
    await registrarMudanca({
      tipo: 'LOGIN_SUCCESS',
      entidadeTipo: 'User',
      entidadeId: user.id,
      descricao: 'Login realizado com sucesso',
      dadosDepois: { ip: getClientIp(req), userAgent: getClientUserAgent(req) ?? undefined },
      autorId: user.id,
    }).catch((e) => console.error('[verifyMfa] HistoricoMudanca:', e));
    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar MFA' });
  }
};