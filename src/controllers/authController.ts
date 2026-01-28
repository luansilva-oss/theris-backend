import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 👇 1. Definimos a interface para corrigir o erro do TypeScript
interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

export const googleLogin = async (req: Request, res: Response) => {
  try {
    // Aceita tanto o jeito antigo (credential) quanto o novo (accessToken)
    const { credential, accessToken } = req.body;

    let email = '';
    let name = '';

    // --- ROTA NOVA (Botão Customizado) ---
    if (accessToken) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      // 👇 2. Forçamos a tipagem aqui usando 'as GoogleUserInfo'
      const googleUser = (await response.json()) as GoogleUserInfo;

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

    // --- LÓGICA DE LOGIN (IGUAL PARA OS DOIS) ---
    
    // Verifica Domínio (Opcional)
    // if (!email.endsWith('@grupo-3c.com')) { ... }

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
      token: 'session-token-placeholder'
    });

  } catch (error) {
    console.error('Erro no login:', error);
    // Tratamento de erro seguro para TS
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno.', details: errorMessage });
  }
};