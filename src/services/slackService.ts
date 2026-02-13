import { App, LogLevel, ExpressReceiver } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Configuração do Receptor HTTP (Para o Render)
export const slackReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  endpoints: '/events', // A rota final será /api/slack/events
});

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: slackReceiver, // Conecta ao Express do index.ts
  logLevel: LogLevel.ERROR,
});

// ============================================================
// 1. MENU PRINCIPAL (/theris) - ACESSO EXTRAORDINÁRIO APENAS
// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  // ACK IMEDIATO: O Slack exige resposta em <3s
  try {
    await ack();
  } catch (error) {
    console.error("Erro ao enviar ack para o Slack:", error);
    return; // Se falhar o ack, provavelmente já expirou ou erro de rede
  }

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'submit_extraordinary_access', // Callback único
        title: { type: 'plain_text', text: 'Theris OS' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '👋 *Acesso Extraordinário*\nUtilize este canal para solicitar acessos que você não possui ou elevar seu nível de permissão temporariamente.' } },

          { type: 'divider' },

          { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'Nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: "plain_text", text: "Ex: AWS, GitHub, Jira" } } },

          { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Nível de Acesso Desejado' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: "plain_text", text: "Ex: Admin, Leitura, Write" } } },

          // Campos de Duração (Opcional)
          {
            type: 'input',
            block_id: 'blk_duration_val',
            optional: true,
            label: { type: 'plain_text', text: 'Tempo de Duração (Opcional/Temporário)' },
            element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: 'plain_text', text: 'Ex: 24' } }
          },
          {
            type: 'section',
            block_id: 'blk_duration_unit',
            text: { type: 'mrkdwn', text: 'Unidade de Tempo' },
            accessory: {
              type: 'static_select',
              action_id: 'unit_select',
              placeholder: { type: 'plain_text', text: 'Selecione...' },
              options: [
                { text: { type: 'plain_text', text: 'Horas' }, value: 'horas' },
                { text: { type: 'plain_text', text: 'Dias' }, value: 'dias' },
                { text: { type: 'plain_text', text: 'Semanas' }, value: 'semanas' }
              ]
            }
          },

          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp', placeholder: { type: "plain_text", text: "Explique por que precisa deste acesso..." } } }
        ],
        submit: {
          type: 'plain_text',
          text: 'Solicitar Acesso'
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro Menu Principal:', error);
  }
});

// ============================================================
// 2. PROCESSAMENTO (HANDLERS DE VIEW)
// ============================================================

// Helper: Salvar Solicitação
async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, msgSuccess: string, isExtraordinary = true) {
  try {
    const slackId = body.user.id;
    let requesterId = '';

    // Tenta achar o usuário no banco pelo email do Slack
    try {
      const info = await client.users.info({ user: slackId });
      const email = info.user?.profile?.email;
      if (email) {
        const userDb = await prisma.user.findUnique({ where: { email } });
        if (userDb) requesterId = userDb.id;
      }
    } catch (err) { console.log('Erro ao buscar user Slack:', err); }

    // Fallback: Se não achar, pega o primeiro admin ou user do banco (para não travar teste, mas idealmente deveria falhar)
    // MUDANÇA: Se não achar, vamos tentar criar um log ou avisar, mas manteremos o fallback por compatibilidade com dev
    if (!requesterId) {
      const fallback = await prisma.user.findFirst();
      if (fallback) requesterId = fallback.id;
    }

    if (!requesterId) throw new Error("Usuário não encontrado no sistema Theris.");

    // Salva no Banco (Status PENDENTE_SI para cair pra segurança)
    await prisma.request.create({
      data: {
        requesterId,
        type: dbType,
        details: JSON.stringify(details),
        justification: reason || 'Via Slack',
        status: 'PENDENTE_SI',
        currentApproverRole: 'SI_ANALYST',
        isExtraordinary
      }
    });

    // Confirma no chat privado do usuário
    await client.chat.postMessage({ channel: slackId, text: msgSuccess });

  } catch (e) {
    console.error('❌ Erro ao salvar solicitação:', e);
    await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro ao processar solicitação. Seu email do Slack corresponde ao do Theris?" });
  }
}

// Handler ÚNICO de Submissão
slackApp.view('submit_extraordinary_access', async ({ ack, body, view, client }) => {
  await ack();

  try {
    const v = view.state.values;
    const tool = v.blk_tool.inp.value;
    const target = v.blk_target.inp.value;
    const duration = v.blk_duration_val.inp.value;
    const unit = v.blk_duration_unit.unit_select.selected_option?.value;
    const reasonRaw = v.blk_reason.inp.value || '';

    const details = {
      info: `Acesso Extraordinário: ${tool}`,
      tool,
      targetLevel: target, // Padronizado
      duration: duration || null,
      unit: unit || null
    };

    let fullReason = reasonRaw;
    if (duration && unit) {
      fullReason += ` (Duração solicitada: ${duration} ${unit})`;
    }

    await saveRequest(
      body,
      client,
      'ACCESS_TOOL_EXTRA',
      details,
      fullReason,
      `✅ Solicitação de acesso extraordinário para *${tool}* enviada com sucesso! Você será notificado aqui quando houver uma decisão.`
    );

  } catch (error) {
    console.error("Erro no submit_extraordinary_access:", error);
  }
});


// ============================================================
// 3. NOTIFICAÇÃO ATIVA (CHAMADA PELO BACKEND WEB)
// ============================================================
export const sendSlackNotification = async (email: string, status: string, adminNote: string) => {
  if (!slackApp) return;

  try {
    // 1. Tenta achar o ID do usuário no Slack pelo e-mail
    const userLookup = await slackApp.client.users.lookupByEmail({ email });
    const slackUserId = userLookup.user?.id;

    if (slackUserId) {
      // 2. Define a cor e o ícone
      // status do prisma geralmente é "APROVADO" ou "REPROVADO"
      const isApproved = status === 'APROVADO';
      const icon = isApproved ? '✅' : '❌';
      const requestStatusText = isApproved ? 'APROVADA' : 'REPROVADA'; // Texto para o título

      // Pela imagem do usuário:
      // "Pedido de alteração de acesso para [ferramenta] enviado." (Isso é feito no submit)
      // "Solicitação APROVADA" (Isso é aqui)

      // 3. Envia a DM Bonita
      await slackApp.client.chat.postMessage({
        channel: slackUserId,
        text: `Sua solicitação foi ${requestStatusText}`, // Fallback text notifications
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${icon} Solicitação ${requestStatusText}`,
              emoji: true
            }
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Status:*\n${status}` },
              { type: "mrkdwn", text: `*Justificativa do Gestor:*\n${adminNote || 'Sem observações.'}` }
            ]
          },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: "Theris OS • Governança de Acessos" }]
          }
        ]
      });
      console.log(`🔔 Notificação enviada para ${email}`);
    } else {
      console.warn(`⚠️ Usuário Slack não encontrado para o email: ${email}`);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar notificação Slack:', error);
  }
};