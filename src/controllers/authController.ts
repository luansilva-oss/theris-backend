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
      // Busca dados do usuário no Google usando a chave de acesso
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      // Usa 'any' para evitar erro de build no Render
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
      
      if (!payload?.email) {
        return res.status(400).json({ error: 'Token inválido.' });
      }

      email = payload.email;
      name = payload.name || '';
    } else {
      return res.status(400).json({ error: 'Nenhum token fornecido.' });
    }

    // --- LÓGICA DE LOGIN ---
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        department: true,
        manager: true,
        myDeputy: true
      }
    });

    if (!user) {
      return res.status(403).json({ error: 'Usuário não cadastrado no sistema.' });
    }

    return res.json({
      user,
      profile: user.systemProfile,
      token: 'session-ok'
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};