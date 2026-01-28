import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req: Request, res: Response) => {
  try {
    // O Frontend pode mandar 'credential' (jeito antigo) ou 'accessToken' (jeito novo)
    const { credential, accessToken } = req.body;

    let email = '';
    let name = '';

    // CENÁRIO 1: Novo Botão Customizado (Manda accessToken)
    if (accessToken) {
      // Com o accessToken, perguntamos ao Google quem é o usuário
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      const googleUser = await response.json();
      
      if (!googleUser.email) {
        return res.status(400).json({ error: 'Email não retornado pelo Google.' });
      }

      email = googleUser.email;
      name = googleUser.name;
    } 
    // CENÁRIO 2: Botão Padrão Antigo (Manda credential/JWT)
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

    // --- A PARTIR DAQUI A LÓGICA É IGUAL PARA OS DOIS ---

    // 1. Verificar domínio (Segurança Extra)
    if (!email.endsWith('@grupo-3c.com') && !email.endsWith('@3cplus.com.br')) { // Adicione seus domínios
       // Opcional: Se for super admin ou exceção, deixar passar.
       // Por enquanto, vamos buscar no banco pra ver se existe.
    }

    // 2. Buscar usuário no Banco
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

    // 3. Sucesso! Retornar dados do usuário e perfil
    return res.json({
      user,
      profile: user.systemProfile, // 'ADMIN', 'VIEWER', etc.
      token: 'sessao-criada' // Aqui você geraria seu JWT de sessão do Theris se tiver
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};