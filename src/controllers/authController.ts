import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential, accessToken } = req.body;
    
    let email = '';
    let name = '';

    // --- ROTA NOVA (Botão Customizado Viaj.AI) ---
    if (accessToken) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      // 'any' evita erros de build no Render
      const googleUser: any = await response.json();

      if (!googleUser.email) {
        return res.status(400).json({ error: 'Email não retornado pelo Google.' });
      }

      email = googleUser.email;
      name = googleUser.name;
    } 
    // --- ROTA ANTIGA (Fallback) ---
    else if (credential) {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email || '';
      name = payload?.name || '';
    } else {
      return res.status(400).json({ error: 'Token não fornecido.' });
    }

    // --- LÓGICA DE LOGIN ---
    if (!email) return res.status(400).json({ error: 'Email inválido.' });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, department: true, manager: true, myDeputy: true }
    });

    if (!user) {
      return res.status(403).json({ error: 'Usuário não cadastrado.' });
    }

    return res.json({
      user,
      profile: user.systemProfile,
      token: 'session-ok'
    });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};