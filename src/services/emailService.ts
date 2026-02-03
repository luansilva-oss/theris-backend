import nodemailer from 'nodemailer';

export const sendMfaEmail = async (to: string, code: string) => {
    // 1. PROTEÇÃO: Se não tiver senha configurada, não tenta conectar (evita travamento)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("⚠️ EMAIL_PASS não configurado no .env");
        console.log(`🔑 CÓDIGO DE ACESSO (MOCK): ${code}`); // Mostra no terminal
        return; // Retorna imediatamente para não travar o front
    }

    // 2. Configuração do Transporter (com timeout para não travar)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        // Define tempo máximo de espera (5 segundos)
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000
    });

    const html = `
    <div style="font-family: sans-serif; padding: 20px; background: #f3f4f6;">
      <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
        <h2 style="color: #7C3AED; margin: 0;">Theris OS</h2>
        <p>Seu código de verificação é:</p>
        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; border: 1px solid #e5e7eb; border-radius: 8px;">
          ${code}
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Válido por 5 minutos.</p>
      </div>
    </div>
  `;

    try {
        await transporter.sendMail({
            from: '"Segurança Theris" <no-reply@theris.com>',
            to,
            subject: '🔐 Código de Acesso',
            html
        });
        console.log(`📧 Email enviado para ${to}`);
    } catch (error) {
        console.error('❌ Falha no envio de email (Timeout ou Auth):', error);
        // Fallback: Mostra no terminal se o email falhar, para você não ficar trancado
        console.log(`🔑 CÓDIGO DE ACESSO (FALLBACK): ${code}`);
    }
};