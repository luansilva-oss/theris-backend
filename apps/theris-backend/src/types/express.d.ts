import 'express-serve-static-core';

/**
 * Usuário autenticado após `requireAuth` (sessão + `x-user-id` validado no banco).
 * Não confundir com o header bruto: use sempre `authUser.id` para rate limit e autorização.
 */
declare module 'express-serve-static-core' {
  interface Request {
    authUser?: { id: string; systemProfile: string };
  }
}

export {};
