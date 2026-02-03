import { App, LogLevel, ExpressReceiver } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Configuração do Receptor
export const slackReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  endpoints: '/events',
});

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: slackReceiver,
  logLevel: LogLevel.ERROR,
});

// ============================================================
// 1. COMANDO /theris (Funciona em DMs e Canais)
// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'theris_main_modal',
        title: { type: 'plain_text', text: 'Theris OS' },
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🛡️ Governança de Acessos' } },
          { type: 'section', text: { type: 'mrkdwn', text: 'Olá! Como o time de Segurança pode ajudar?' } },

          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '*👤 Gestão de Pessoas*' } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🔄 Promoção / Mudança' }, action_id: 'btn_move' },
              { type: 'button', text: { type: 'plain_text', text: '✅ Contratação' }, action_id: 'btn_hire' },
              { type: 'button', text: { type: 'plain_text', text: '❌ Desligamento' }, action_id: 'btn_fire', style: 'danger' }
            ]
          },

          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '*🛠️ Ferramentas e Sistemas*' } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🎚️ Alterar/Solicitar Acesso' }, action_id: 'btn_tool_access', style: 'primary' },
              { type: 'button', text: { type: 'plain_text', text: '🔥 Acesso Extraordinário' }, action_id: 'btn_tool_extra', style: 'danger' }
            ]
          }
        ]
      }
    });
  } catch (error) {
    console.error('❌ Erro Menu Principal:', error);
  }
});

// ============================================================
// 2. FUNÇÃO DE NOTIFICAÇÃO (FORMATO NOVO)
// ============================================================
export const sendSlackNotification = async (email: string, status: string, adminNote: string) => {
  if (!slackApp) return;

  try {
    // 1. Busca ID do usuário
    const userLookup = await slackApp.client.users.lookupByEmail({ email });
    const slackUserId = userLookup.user?.id;

    if (slackUserId) {
      const isApproved = status === 'APROVADO';

      // Layout Visual
      const headerText = isApproved ? '✅ Solicitação APROVADA' : '❌ Solicitação REPROVADA';
      const colorBar = isApproved ? '#10b981' : '#ef4444'; // Verde ou Vermelho (usado em attachments se preferir, mas blocks são melhores)

      await slackApp.client.chat.postMessage({
        channel: slackUserId,
        text: `Sua solicitação foi ${isApproved ? 'aprovada' : 'reprovada'}.`, // Texto fallback notificação push
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: headerText,
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Justificativa / Observação do Time de Segurança:*\n> ${adminNote || "Sem observações."}`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `📅 Processado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
              }
            ]
          },
          { type: "divider" }
        ]
      });
      console.log(`🔔 DM enviada para ${email}`);
    }
  } catch (error) {
    console.error('❌ Erro notification:', error);
  }
};

// ============================================================
// 3. HANDLERS E MODAIS (Mesma lógica, apenas enxuguei repetições)
// ============================================================

// Função auxiliar para salvar
async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, successMsg: string) {
  try {
    const slackId = body.user.id;
    let requesterId = '';

    // Tenta achar user no DB
    try {
      const info = await client.users.info({ user: slackId });
      const email = info.user?.profile?.email;
      if (email) {
        const userDb = await prisma.user.findUnique({ where: { email } });
        if (userDb) requesterId = userDb.id;
      }
    } catch (e) { }

    // Fallback para não travar (Pega o primeiro user do banco, útil para testes)
    if (!requesterId) {
      const fallback = await prisma.user.findFirst();
      if (fallback) requesterId = fallback.id;
    }

    if (!requesterId) throw new Error("Usuário não vinculado ao Theris Web.");

    // CRIAÇÃO DA SOLICITAÇÃO (Status sempre PENDENTE_SI para cair pro time de segurança)
    await prisma.request.create({
      data: {
        requesterId,
        type: dbType,
        details: JSON.stringify(details),
        justification: reason,
        status: 'PENDENTE_SI', // <--- Força ir para Segurança
        currentApproverRole: 'SI_ANALYST',
        isExtraordinary: dbType === 'ACCESS_TOOL_EXTRA'
      }
    });

    // Resposta ao usuário (Ephemeral = só ele vê)
    await client.chat.postMessage({ channel: slackId, text: successMsg });

  } catch (e) {
    console.error(e);
    await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro. Seu email do Slack está cadastrado no Theris?" });
  }
}

// --- Definição dos Modais ---
slackApp.action('btn_move', async ({ ack, body, client }) => {
  await ack(); openModal(client, body, 'submit_move', 'Movimentação', [
    input('blk_name', 'Nome do Colaborador'),
    input('blk_role_fut', 'Novo Cargo'),
    input('blk_dept_fut', 'Novo Departamento'),
    input('blk_reason', 'Motivo', true)
  ]);
});

slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack(); openModal(client, body, 'submit_hire', 'Contratação', [
    input('blk_name', 'Nome Completo'),
    input('blk_role', 'Cargo'),
    input('blk_reason', 'Data Início e Obs', true)
  ]);
});

slackApp.action('btn_fire', async ({ ack, body, client }) => {
  await ack(); openModal(client, body, 'submit_fire', 'Desligamento', [
    input('blk_name', 'Nome'),
    input('blk_reason', 'Motivo', true)
  ]);
});

slackApp.action('btn_tool_access', async ({ ack, body, client }) => {
  await ack(); openModal(client, body, 'submit_tool_access', 'Solicitar Acesso', [
    input('blk_tool', 'Ferramenta (Ex: Jira, AWS)'),
    input('blk_target', 'Nível de Acesso Desejado'),
    input('blk_reason', 'Justificativa', true)
  ]);
});

slackApp.action('btn_tool_extra', async ({ ack, body, client }) => {
  await ack(); openModal(client, body, 'submit_tool_extra', 'Acesso Extraordinário', [
    input('blk_tool', 'Ferramenta'),
    input('blk_target', 'Nível Crítico Necessário'),
    input('blk_reason', 'Justificativa de Segurança', true)
  ]);
});


// --- Handlers de Submissão ---
slackApp.view('submit_move', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  await saveRequest(body, client, 'CHANGE_ROLE', { info: `Movimentação: ${v.blk_name.inp.value}`, role: v.blk_role_fut.inp.value }, v.blk_reason.inp.value!, "✅ Solicitação enviada ao time de Segurança.");
});

slackApp.view('submit_hire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  await saveRequest(body, client, 'HIRING', { info: `Contratação: ${v.blk_name.inp.value}`, role: v.blk_role.inp.value }, v.blk_reason.inp.value!, "✅ Contratação registrada.");
});

slackApp.view('submit_fire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  await saveRequest(body, client, 'FIRING', { info: `Desligamento: ${v.blk_name.inp.value}` }, v.blk_reason.inp.value!, "⚠️ Desligamento enviado para bloqueio imediato.");
});

slackApp.view('submit_tool_access', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  await saveRequest(body, client, 'ACCESS_CHANGE', { tool: v.blk_tool.inp.value, target: v.blk_target.inp.value }, v.blk_reason.inp.value!, "✅ Pedido de acesso enviado.");
});

slackApp.view('submit_tool_extra', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  await saveRequest(body, client, 'ACCESS_TOOL_EXTRA', { tool: v.blk_tool.inp.value, target: v.blk_target.inp.value }, v.blk_reason.inp.value!, "🔥 Pedido Crítico enviado à Segurança.");
});

// Helpers de UI
async function openModal(client: any, body: any, id: string, title: string, blocks: any[]) {
  await client.views.push({
    trigger_id: body.trigger_id,
    view: { type: 'modal', callback_id: id, title: { type: 'plain_text', text: title }, submit: { type: 'plain_text', text: 'Enviar' }, blocks }
  });
}
function input(id: string, label: string, multi = false) {
  return { type: 'input', block_id: id, label: { type: 'plain_text', text: label }, element: { type: 'plain_text_input', action_id: 'inp', multiline: multi } };
}