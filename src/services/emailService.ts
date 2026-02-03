import nodemailer from 'nodemailer';

export const sendMfaEmail = async (to: string, code: string) => {
    // 1. VERIFICAÇÃO INICIAL
    // Verifica se as credenciais existem. Se não, avisa e segue para o fallback.
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("⚠️ AVISO: EMAIL_USER ou EMAIL_PASS não configurados.");
        console.log(`🔑 CÓDIGO DE ACESSO (MOCK - SEM ENVIO): ${code}`);
        return;
    }

    // Definições de Host e Porta (com valores padrão para Gmail caso a variável falte)
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = Number(process.env.EMAIL_PORT) || 587;

    // 2. CONFIGURAÇÃO DO TRANSPORTER ROBUSTO
    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465, // True apenas para porta 465, false para outras (587)
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        // Configurações vitais para evitar Timeouts no Render/AWS/Cloud
        tls: {
            ciphers: 'SSLv3', // Ajuda na compatibilidade
            rejectUnauthorized: false // ⚠️ Importante: evita erros de certificado em servidores proxy
        },
        connectionTimeout: 10000, // 10 segundos
        greetingTimeout: 10000,
        socketTimeout: 15000
    });

    const html = `
    <div style="font-family: sans-serif; padding: 20px; background: #f3f4f6;">
      <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #7C3AED; margin: 0; text-align: center;">Theris OS</h2>
        <p style="text-align: center; color: #4b5563;">Seu código de verificação é:</p>
        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Este código expira em 5 minutos.</p>
      </div>
    </div>
  `;

    try {
        // Tenta enviar o e-mail
        const info = await transporter.sendMail({
            from: `"Segurança Theris" <${process.env.EMAIL_USER}>`,
            to,
            subject: '🔐 Código de Acesso - Theris',
            html
        });
        console.log(`✅ Email enviado com sucesso para ${to} (ID: ${info.messageId})`);

    } catch (error) {
        // 3. TRATAMENTO DE ERRO (FALLBACK)
        // Se der erro no SMTP, mostramos o erro mas garantimos que consegues entrar no sistema
        console.error('❌ ERRO CRÍTICO SMTP:', error);
        console.log('------------------------------------------------');
        console.log(`🔑 CÓDIGO DE ACESSO DE EMERGÊNCIA (FALLBACK): ${code}`);
        console.log('------------------------------------------------');
    }
};  