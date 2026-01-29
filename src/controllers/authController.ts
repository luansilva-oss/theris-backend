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

    // --- CENÁRIO 1: Novo Botão Customizado (Manda accessToken) ---
    if (accessToken) {
      // Pergunta diretamente ao Google quem é o usuário
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      // 'any' para evitar travar o build do Render com tipagem estrita agora
      const googleUser: any = await response.json();

      if (!googleUser.email) {
        return res.status(400).json({ error: 'Email não retornado pelo Google.' });
      }

      email = googleUser.email;
      name = googleUser.name;
    } 
    // --- CENÁRIO 2: Legado (Se algo mandar credential) ---
    else if (credential) {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email || '';
      name = payload?.name || '';
    } else {
      return res.status(400).json({ error: 'Nenhum token fornecido.' });
    }

    // --- LÓGICA DE NEGÓCIO ---
    if (!email) return res.status(400).json({ error: 'Email inválido.' });

    // Busca usuário e carrega TODOS os dados necessários
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, department: true, manager: true, myDeputy: true }
    });

    if (!user) {
      return res.status(403).json({ error: 'Usuário não cadastrado no sistema.' });
    }

    // Sucesso!
    return res.json({
      user,
      profile: user.systemProfile,
      token: 'session-ok'
    });

  } catch (error) {
    console.error('Erro Auth:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};