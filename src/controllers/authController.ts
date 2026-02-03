import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { sendMfaEmail } from '../services/emailService';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// ... (Função googleLogin permanece igual) ...
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    let email = '';

    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await client.getTokenInfo(accessToken);
      email = ticket.email || '';
    } else {
      const parts = accessToken.split('.');
      if (parts.length > 1) {
        const payload = JSON.parse(atob(parts[1]));
        email = payload.email;
      }
    }

    if (!email) return res.status(400).json({ error: 'Email inválido' });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, department: true }
    });

    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });

    let systemProfile = 'VIEWER';
    if (user.role?.name === 'Head') systemProfile = 'APPROVER';
    if (user.email.includes('admin') || user.name.includes('Vladimir')) systemProfile = 'SUPER_ADMIN';
    if (user.email.includes('luan')) systemProfile = 'ADMIN';

    const token = jwt.sign(
      { id: user.id, email: user.email, profile: systemProfile },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    return res.json({ token, profile: systemProfile, user });

  } catch (error) {
    return res.status(500).json({ error: 'Erro de Autenticação' });
  }
};

// --- GERAÇÃO DE CÓDIGO ALEATÓRIO E ÚNICO ---
export const sendMfa = async (req: Request, res: Response) => {
  const { userId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // 1. GERA CÓDIGO ALEATÓRIO DE 6 DÍGITOS
    // Math.random() gera entre 0 e 1. Multiplicamos para ter 6 casas.
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. DEFINE VALIDADE (5 Minutos a partir de agora)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 3. SALVA NO BANCO (Específico deste usuário)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaCode: code, mfaExpiresAt: expiresAt }
    });

    // 4. ENVIA PARA O EMAIL DESTE USUÁRIO
    console.log(`Log de Segurança: Enviando código ${code} para ${user.email}`); // Log para debug
    await sendMfaEmail(user.email, code);

    return res.json({ message: 'Código enviado com sucesso.' });
  } catch (error) {
    console.error('Erro ao enviar MFA:', error);
    return res.status(500).json({ error: 'Erro ao gerar MFA' });
  }
};

// --- VERIFICAÇÃO REAL ---
export const verifyMfa = async (req: Request, res: Response) => {
  const { userId, code } = req.body;

  try {
    // Busca o usuário específico no banco
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Valida se o código bate com o que está salvo no banco
    if (!user || user.mfaCode !== code) {
      return res.status(400).json({ valid: false, error: 'Código incorreto.' });
    }

    // Valida o tempo
    if (new Date() > (user.mfaExpiresAt || new Date(0))) {
      return res.status(400).json({ valid: false, error: 'Código expirado. Faça login novamente.' });
    }

    // Se passou, limpa o código (para não ser usado de novo)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaCode: null, mfaExpiresAt: null }
    });

    return res.json({ valid: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro na verificação' });
  }
};