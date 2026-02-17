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
// ============================================================
// 1. MENU PRINCIPAL (/theris) - INTERFACE CENTRAL
// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  await ack();

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        title: { type: 'plain_text', text: 'Theris OS' },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👋 *Olá, <@${body.user_id}>!* \nBem-vindo ao *Theris OS*. O que você deseja fazer hoje?`
            }
          },
          { type: 'divider' },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*🔐 Acessos e Permissões*' },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Solicitar Acesso Extraordinário' },
                style: 'primary',
                action_id: 'open_extraordinary'
              }
            ]
          },
          { type: 'divider' },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*⚙️ Gestão Administrativa*' },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Gestão de Pessoas' },
                action_id: 'open_people_management'
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Gestão de Ferramentas' },
                action_id: 'open_tool_management'
              }
            ]
          }
        ]
      }
    });
  } catch (error) {
    console.error('❌ Erro Menu Principal:', error);
  }
});

// --- ACTION HANDLERS ---

// 1. Acesso Extraordinário (Abre o formulário antigo)
slackApp.action('open_extraordinary', async ({ ack, body, client }) => {
  await ack();
  try {
    // @ts-ignore
    const triggerId = body.trigger_id;

    await client.views.push({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'submit_extraordinary_access',
        title: { type: 'plain_text', text: 'Solicitar Acesso' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '*Formulário de Acesso*\nPreencha os dados abaixo para solicitar acesso a uma ferramenta.' } },
          { type: 'divider' },
          { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'Nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: "plain_text", text: "Ex: AWS, GitHub, Jira" } } },
          { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Nível de Acesso' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: "plain_text", text: "Ex: Admin, Leitura" } } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp', placeholder: { type: "plain_text", text: "Motivo..." } } }
        ],
        submit: {
          type: 'plain_text',
          text: 'Enviar'
        }
      }
    });
  } catch (error) {
    console.error('Erro ao abrir modal extraordinário:', error);
  }
});

// 2. Gestão de Pessoas (Menu Intermediário)
slackApp.action('open_people_management', async ({ ack, body, client }) => {
  await ack();
  try {
    // @ts-ignore
    const triggerId = body.trigger_id;
    await client.views.push({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        title: { type: 'plain_text', text: 'Gestão de Pessoas' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '🔧 *Opções de Gestão de Pessoas*\nSelecione uma ação administrativa:' } },
          { type: 'divider' },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '👥 Ver Equipe' }, action_id: 'open_team_view' },
              { type: 'button', text: { type: 'plain_text', text: '🔄 Mudança Cargo' }, action_id: 'req_change_role' },
              { type: 'button', text: { type: 'plain_text', text: '👤 Designar Gestor' }, action_id: 'designate_manager' }
            ]
          },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🛡️ Designar Substituto' }, action_id: 'designate_deputy' },
              { type: 'button', text: { type: 'plain_text', text: '📊 Organograma' }, url: 'https://theris-os.web.app/org-chart' }
            ]
          },
          { type: 'divider' },
          { type: 'context', elements: [{ type: 'mrkdwn', text: 'Para gestão completa (admissão/demissão), utilize o Portal Web.' }] }
        ]
      }
    });
  } catch (error) {
    console.error(error);
  }
});

// 3. Gestão de Ferramentas (Menu Intermediário)
slackApp.action('open_tool_management', async ({ ack, body, client }) => {
  await ack();
  try {
    // @ts-ignore
    const triggerId = body.trigger_id;
    await client.views.push({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        title: { type: 'plain_text', text: 'Gestão de Ferramentas' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '🛠 *Opções de Ferramentas*\nGerencie acessos e configurações do catálogo.' } },
          { type: 'divider' },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '➕ Solicitar Acesso' }, style: 'primary', action_id: 'open_extraordinary' },
              { type: 'button', text: { type: 'plain_text', text: '🔑 Meus Acessos' }, action_id: 'view_my_access' }
            ]
          },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '📝 Editar Tool (Owner/Crit)' }, action_id: 'edit_tool_meta' },
              { type: 'button', text: { type: 'plain_text', text: '📜 Listar Usuários' }, action_id: 'list_tool_users' }
            ]
          },
          { type: 'divider' },
          { type: 'context', elements: [{ type: 'mrkdwn', text: 'Para cadastrar novas ferramentas ou auditoria em massa, acesse a Web.' }] }
        ]
      }
    });
  } catch (error) {
    console.error(error);
  }
});

// HANDLERS PLACEHOLDER
slackApp.action('open_team_view', async ({ ack, body, client }) => { await ack(); await client.chat.postMessage({ channel: body.user.id, text: "ℹ️ Funcionalidade 'Ver Equipe' em desenvolvimento no Slack. Use a Web." }); });
slackApp.action('req_change_role', async ({ ack, body, client }) => { await ack(); await client.chat.postMessage({ channel: body.user.id, text: "ℹ️ Funcionalidade 'Mudança de Cargo' em desenvolvimento no Slack. Use a Web." }); });
slackApp.action('designate_manager', async ({ ack, body, client }) => { await ack(); await client.chat.postMessage({ channel: body.user.id, text: "ℹ️ Funcionalidade 'Designar Gestor' em desenvolvimento. Use a Web." }); });
slackApp.action('designate_deputy', async ({ ack, body, client }) => { await ack(); await client.chat.postMessage({ channel: body.user.id, text: "ℹ️ Funcionalidade 'Designar Substituto' em desenvolvimento. Use a Web." }); });
slackApp.action('view_my_access', async ({ ack, body, client }) => { await ack(); await client.chat.postMessage({ channel: body.user.id, text: "ℹ️ Funcionalidade 'Meus Acessos' em desenvolvimento. Consulte seu perfil na Web." }); });
slackApp.action('edit_tool_meta', async ({ ack, body, client }) => { await ack(); await client.chat.postMessage({ channel: body.user.id, text: "ℹ️ Edição de Metadados de Ferramentas via Slack requer permissão Admin. Acesse a Web." }); });
slackApp.action('list_tool_users', async ({ ack, body, client }) => { await ack(); await client.chat.postMessage({ channel: body.user.id, text: "ℹ️ Listagem de Usuários via Slack em desenvolvimento." }); });


// ============================================================
// 2. PROCESSAMENTO (HANDLERS DE VIEW)
// ============================================================

// Helper: Salvar Solicitação
// Função de Normalização (Mesma do AuthController para garantir match)
const normalizeEmail = (email: string): string => {
  if (!email) return '';
  const [localPart, domain] = email.toLowerCase().split('@');
  const parts = localPart.split('.');
  // Se tiver mais de 2 partes (ex: nome.nome.sobrenome), pega apenas a primeira e a última
  const normalizedLocal = parts.length > 2
    ? `${parts[0]}.${parts[parts.length - 1]}`
    : localPart;
  return `${normalizedLocal}@grupo-3c.com`;
};

// Helper: Salvar Solicitação
async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, msgSuccess: string, isExtraordinary = true) {
  try {
    const slackId = body.user.id;
    let requesterId = '';
    let slackEmail = '';
    let debugMsg = '';

    // Tenta achar o usuário no banco pelo email do Slack
    try {
      const info = await client.users.info({ user: slackId });
      const rawEmail = info.user?.profile?.email;

      if (rawEmail) {
        slackEmail = normalizeEmail(rawEmail); // NORMALIZA O EMAIL DO SLACK
        console.log(`🔍 Slack Info: ID=${slackId}, Raw=${rawEmail}, Normalized=${slackEmail}`);

        // Usando findFirst para evitar erros de unique constraint se houver sujeira no banco
        const userDb = await prisma.user.findFirst({ where: { email: slackEmail } });
        if (userDb) {
          requesterId = userDb.id;
        } else {
          console.warn(`⚠️ E-mail normalizado (${slackEmail}) não encontrado no banco.`);
        }
      } else {
        console.warn(`⚠️ Não foi possível obter o e-mail do usuário Slack (ID: ${slackId}).`);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar user info no Slack:', err);
    }

    if (!requesterId) {
      // Se não achou, NÃO usa fallback. Retorna erro para o usuário corrigir seu cadastro.
      let errorMsg = `❌ *Erro de Identificação*: Não encontrei seu e-mail (${slackEmail || 'desconhecido'}) no sistema Theris.\n\n*Dica:* O sistema normaliza emails para o padrão \`nome.sobrenome@grupo-3c.com\`. Verifique se você já realizou o primeiro login na plataforma Web.`;

      await client.chat.postMessage({
        channel: slackId,
        text: errorMsg
      });
      return;
    }

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
    await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro interno ao processar solicitação." });
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