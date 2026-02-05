import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendMfaEmail } from '../services/emailService';

const prisma = new PrismaClient();

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

    if (!googleRes.ok) return res.status(401).json({ error: 'Token Google inválido' });

    const googleData = await googleRes.json();
    const rawEmail = googleData.email;
    const email = normalizeEmail(rawEmail);

    // 2. Verificar Domínio (Segurança)
    if (!email.endsWith('@grupo-3c.com')) {
      return res.status(403).json({ error: 'Acesso restrito ao domínio corporativo.' });
    }

    // 3. Buscar ou Criar Usuário
    // (Removemos o 'include: { role: true }' pois não existe mais)
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Criação automática no primeiro login
      user = await prisma.user.create({
        data: {
          email,
          name: googleData.name || 'Usuário Google',
          jobTitle: 'Colaborador', // Default
          department: 'Geral'      // Default
        }
      });
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

    return res.json({
      user,
      profile: systemProfile,
      token: 'fake-jwt-token'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro no login Google' });
  }
};

// ENVIAR MFA
export const sendMfa = async (req: Request, res: Response) => {
  const { userId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

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

    res.json({ message: 'Código enviado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar MFA' });
  }
};

// VERIFICAR MFA
export const verifyMfa = async (req: Request, res: Response) => {
  const { userId, code } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.mfaCode !== code) {
      return res.status(400).json({ error: 'Código inválido', valid: false });
    }

    if (user.mfaExpiresAt && new Date() > user.mfaExpiresAt) {
      return res.status(400).json({ error: 'Código expirado', valid: false });
    }

    // Limpa o código após uso (opcional, mas recomendado)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaCode: null, mfaExpiresAt: null }
    });

    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar MFA' });
  }
};