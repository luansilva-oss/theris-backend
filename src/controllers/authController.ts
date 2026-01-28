import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 👇 DEFINIÇÃO DE TIPO (Isso acalma o TypeScript)
interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential, accessToken } = req.body;

    let email = '';
    let name = '';

    // --- CENÁRIO 1: Novo Botão Customizado (Manda accessToken) ---
    if (accessToken) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      // 👇 AQUI ESTAVA O ERRO: Adicionamos "as GoogleUserInfo"
      const googleUser = (await response.json()) as GoogleUserInfo;
      
      if (!googleUser.email) {
        return res.status(400).json({ error: 'Email não retornado pelo Google.' });
      }

      email = googleUser.email;
      name = googleUser.name;
    } 
    // --- CENÁRIO 2: Botão Antigo (Manda credential/JWT) ---
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

    // --- LÓGICA COMUM (Buscar no Banco) ---

    // 1. Opcional: Validar domínio
    // if (!email.endsWith('@grupo-3c.com')) { ... }

    // 2. Buscar usuário
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

    // 3. Sucesso
    return res.json({
      user,
      profile: user.systemProfile,
      token: 'sessao-simulada-jwt'
    });

  } catch (error) {
    console.error('Erro no login:', error);
    // Cast do erro para acessar message se necessário
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno no servidor.', details: errorMessage });
  }
};