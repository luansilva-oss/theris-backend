import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new OAuth2Client(); // O Client ID vem do Front, a lib valida

// Palavras-chave para definir permissão
const ADMIN_DEPTS = ['Board', 'Tecnologia'];
const APPROVER_KEYWORDS = ['Pessoas e Cultura'];

export const loginGoogle = async (req: Request, res: Response) => {
  const { credential, clientId } = req.body; // O token que veio do Google

  try {
    // 1. Validar se o token é real e veio do Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId, 
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(401).json({ error: "Token inválido" });

    const emailGoogle = payload.email;

    // 2. Buscar usuário no Banco pelo Email
    const user = await prisma.user.findUnique({
      where: { email: emailGoogle },
      include: { role: true, department: true, manager: true }
    });

    if (!user) {
      return res.status(403).json({ error: "Usuário não cadastrado no sistema Theris IGA." });
    }

    // 3. Definir Perfil (RBAC) - Lógica movida para o Backend (Segurança)
    let profile = 'VIEWER';
    const deptName = user.department?.name || '';
    
    // Verifica se é Dono de alguma ferramenta
    const ownedTools = await prisma.tool.count({ where: { ownerId: user.id } });

    if (deptName === 'Board' || deptName.includes('Tecnologia')) {
      profile = 'ADMIN';
    } else if (deptName.includes('Pessoas') || ownedTools > 0) {
      profile = 'APPROVER';
    }

    // 4. Retorna os dados para o Front
    return res.json({
      user,
      profile,
      token: "sessao-simulada-jwt" // Num sistema real, aqui você criaria um JWT seu
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro na autenticação" });
  }
};