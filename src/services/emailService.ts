import nodemailer from 'nodemailer';

export const sendMfaEmail = async (to: string, code: string) => {
    // 1. Configurações
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const host = 'smtp.gmail.com';
    const port = 465;

    if (!user || !pass) {
        console.log(`🔑 CÓDIGO (FALLBACK): ${code}`);
        return;
    }

    // 2. Transporter com FORÇA BRUTA de IPv4
    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: true, // Porta 465 exige true
        auth: {
            user: user,
            pass: pass
        },
        // --- AQUI ESTÁ O TRUQUE ---
        // Força o Node a usar apenas IPv4 (resolve 80% dos timeouts no Render)
        family: 4,
        // -------------------------
        tls: {
            rejectUnauthorized: false
        },
        // Logs detalhados para vermos o que acontece "por baixo do capô"
        logger: true,
        debug: true,
        // Timeouts curtos para não ficar "pendurado" se falhar
        connectionTimeout: 10000
    });

    const html = `
    <div style="font-family: sans-serif; padding: 20px;">
        <h2>Theris OS</h2>
        <p>Seu código: <strong>${code}</strong></p>
    </div>
    `;

    try {
        console.log(`🔌 Tentando conectar ao Gmail via IPv4...`);
        await transporter.sendMail({
            from: `"Theris Security" <${user}>`,
            to,
            subject: 'Theris - Código de Acesso',
            html
        });
        console.log(`✅ SUCESSO! Email enviado.`);

    } catch (error: any) {
        console.error('❌ ERRO FINAL SMTP:', error.message);
        console.log('------------------------------------------------');
        console.log(`🔑 CÓDIGO DE ACESSO (FALLBACK): ${code}`);
        console.log('------------------------------------------------');
    }
};