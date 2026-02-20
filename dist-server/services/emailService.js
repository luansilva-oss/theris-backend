"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMfaEmail = void 0;
const resend_1 = require("resend");

// Inicializa a API
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);

const sendMfaEmail = async (to, code) => {
  // Verifica a chave
  if (!process.env.RESEND_API_KEY) {
    console.error("⚠️ RESEND_API_KEY não configurada.");
    console.log(`🔑 CÓDIGO (FALLBACK): ${code}`);
    return;
  }

  const html = `
    <div style="font-family: sans-serif; padding: 20px; background: #f3f4f6;">
      <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
        <h2 style="color: #7C3AED; margin: 0; text-align: center;">Theris OS</h2>
        <p style="text-align: center; color: #4b5563;">Seu código de verificação:</p>
        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="text-align: center; font-size: 12px; color: #9ca3af;">Válido por 5 minutos.</p>
      </div>
    </div>
    `;

  try {
    console.log(`📤 Enviando via Resend API para ${to}...`);

    const data = await resend.emails.send({
      // ✅ Domínio verificado no Resend! Agora usando o e-mail oficial da empresa.
      from: 'Theris Security <si@grupo-3c.com>',
      to: [to],
      subject: '🔐 Código de Acesso - Theris',
      html: html,
    });

    if (data.error) {
      console.error('❌ Erro Resend:', data.error);
      throw new Error(data.error.message);
    }

    console.log(`✅ Email enviado com sucesso! ID: ${data.data?.id}`);
  }
  catch (error) {
    console.error('❌ Falha no envio (API):', error);
    console.log('------------------------------------------------');
    console.log(`🔑 CÓDIGO DE ACESSO (FALLBACK): ${code}`);
    console.log('------------------------------------------------');
  }
};

exports.sendMfaEmail = sendMfaEmail;