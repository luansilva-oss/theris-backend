import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
// Usa variável de ambiente ou string vazia para evitar erro se não tiver configurado ainda
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    // Se não tiver token configurado, finge login para teste (Remover em produção real se tiver credenciais)
    let email = '';

    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await client.getTokenInfo(accessToken);
      email = ticket.email || '';
    } else {
      // Fallback temporário caso as credenciais do Google não estejam no .env do Render
      // Decodifica o JWT do Google de forma simples (não segura, mas funciona pra teste)
      const parts = accessToken.split('.');
      if (parts.length > 1) {
        const payload = JSON.parse(atob(parts[1])); // decodifica base64
        email = payload.email;
      }
    }

    if (!email) return res.status(400).json({ error: 'Email inválido' });

    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, department: true }
    });

    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });

    // LÓGICA DE PERFIL (Calculada aqui, não vem do banco)
    let systemProfile = 'VIEWER';
    if (user.role?.name === 'Head') systemProfile = 'APPROVER';
    if (user.email.includes('admin') || user.name.includes('Vladimir')) systemProfile = 'SUPER_ADMIN';
    if (user.email.includes('luan')) systemProfile = 'ADMIN';

    // Token
    const token = jwt.sign(
      { id: user.id, email: user.email, profile: systemProfile },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      profile: systemProfile, // Retorna o perfil calculado
      user
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro de Autenticação' });
  }
};