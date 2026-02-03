import nodemailer from 'nodemailer';

// Configure com seu serviço de email real
const transporter = nodemailer.createTransport({
    service: 'gmail', // ou use host/port para outros SMTP
    auth: {
        user: process.env.EMAIL_USER, // Ex: 'seu-email@grupo-3c.com'
        pass: process.env.EMAIL_PASS  // Ex: 'senha-de-app-do-google'
    }
});

export const sendMfaEmail = async (to: string, code: string) => {
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #f3f4f6;">
      <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #7C3AED; margin-top: 0;">Theris OS 🛡️</h2>
        <p style="color: #374151; font-size: 16px;">Seu código de verificação de segurança é:</p>
        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
          ${code}
        </div>
        <p style="color: #6b7280; font-size: 14px;">Este código expira em 5 minutos.<br>Se não foi você, contate a Segurança da Informação imediatamente.</p>
      </div>
    </div>
  `;

    try {
        await transporter.sendMail({
            from: '"Segurança Theris" <no-reply@theris.com>',
            to,
            subject: '🔐 Seu Código de Acesso Theris',
            html
        });
        console.log(`📧 Email de MFA enviado para ${to}`);
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        // Em dev, mostramos o código no console caso o email falhe
        console.log(`🔑 CÓDIGO MFA (Fallback): ${code}`);
    }
};