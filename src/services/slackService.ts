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
// 1. MENU PRINCIPAL (/theris) - RESTAURADO COM CLICKUP
// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  // ACK IMEDIATO: O Slack exige resposta em <3s
  await ack();

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'theris_main_modal',
        title: { type: 'plain_text', text: 'Theris OS' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '👋 *Painel de Governança*\nO que você precisa hoje?' } },

          // BLOCO 1: PESSOAS
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '👤 *Gestão de Pessoas*' } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🔄 Promoção / Mudança' }, action_id: 'btn_move', style: 'primary' },
              { type: 'button', text: { type: 'plain_text', text: '✅ Contratação' }, action_id: 'btn_hire' },
              { type: 'button', text: { type: 'plain_text', text: '❌ Desligamento' }, action_id: 'btn_fire', style: 'danger' }
            ]
          },

          // BLOCO 2: FERRAMENTAS (ACESSOS)
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '🛠️ *Gestão de Acessos*' } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🎚️ Alterar Nível' }, action_id: 'btn_tool_access' },
              { type: 'button', text: { type: 'plain_text', text: '🔥 Acesso Extraordinário' }, action_id: 'btn_tool_extra', style: 'danger' },
              { type: 'button', text: { type: 'plain_text', text: '🤝 Indicar Deputy' }, action_id: 'btn_deputy' }
            ]
          },

          // BLOCO 3: LINKS CLICKUP (RESTAURADO)
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '📋 *Links Rápidos (ClickUp)*' } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🚀 Novo Software' }, url: 'https://forms.clickup.com/31083618/f/xmk32-93933/ON71J584JHXR9PHOA5', action_id: 'link_new_sw' },
              { type: 'button', text: { type: 'plain_text', text: '🏢 Fornecedores' }, url: 'https://forms.clickup.com/31083618/f/xmk32-105593/HW469QNPJSNO576GI1', action_id: 'link_vendor' },
              { type: 'button', text: { type: 'plain_text', text: '🛡️ Security' }, url: 'https://forms.clickup.com/31083618/f/xmk32-98933/6JUAFYHDOBRYD28W7S', action_id: 'link_security' }
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
// 2. MODAIS (ABERTURA)
// ============================================================

// PROMOÇÃO
slackApp.action('btn_move', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_move', title: { type: 'plain_text', text: 'Movimentação' }, submit: { type: 'plain_text', text: 'Enviar' },
        blocks: [
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '*Situação Atual*' } },
          { type: 'input', block_id: 'blk_role_curr', label: { type: 'plain_text', text: 'Cargo Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept_curr', label: { type: 'plain_text', text: 'Departamento Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'section', text: { type: 'mrkdwn', text: '*Situação Nova*' } },
          { type: 'input', block_id: 'blk_role_fut', label: { type: 'plain_text', text: 'Novo Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept_fut', label: { type: 'plain_text', text: 'Novo Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Motivo' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// CONTRATAÇÃO
slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_hire', title: { type: 'plain_text', text: 'Contratação' }, submit: { type: 'plain_text', text: 'Agendar' },
        blocks: [
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome Completo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_date', label: { type: 'plain_text', text: 'Data de Início' }, element: { type: 'datepicker', action_id: 'picker' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_obs', optional: true, label: { type: 'plain_text', text: 'Obs (Equipamentos, etc)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// DESLIGAMENTO
slackApp.action('btn_fire', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_fire', title: { type: 'plain_text', text: 'Desligamento' }, submit: { type: 'plain_text', text: 'Confirmar' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '⚠️ *Inicia o bloqueio imediato de acessos.*' } },
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', optional: true, label: { type: 'plain_text', text: 'Motivo' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// ACESSOS
slackApp.action('btn_tool_access', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_tool_access', title: { type: 'plain_text', text: 'Acesso para ferramentas' }, submit: { type: 'plain_text', text: 'Solicitar' },
        blocks: [
          { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_curr', label: { type: 'plain_text', text: 'Nível Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Nível Desejado' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

slackApp.action('btn_tool_extra', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_tool_extra', title: { type: 'plain_text', text: 'Acesso Extra' }, submit: { type: 'plain_text', text: 'Solicitar' },
        blocks: [
          { type: 'input', block_id: 'blk_collab', label: { type: 'plain_text', text: 'Quem receberá o acesso?' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'Nome da ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Permissão Necessária (nível de acesso)' }, element: { type: 'plain_text_input', action_id: 'inp' } },

          // Campos de Duração
          {
            type: 'section',
            block_id: 'blk_duration_wrap',
            text: { type: 'mrkdwn', text: '*Estimativa de Tempo*' },
            accessory: {
              type: 'static_select',
              action_id: 'unit_select',
              placeholder: { type: 'plain_text', text: 'Unidade' },
              options: [
                { text: { type: 'plain_text', text: 'Horas' }, value: 'horas' },
                { text: { type: 'plain_text', text: 'Dias' }, value: 'dias' },
                { text: { type: 'plain_text', text: 'Meses' }, value: 'meses' }
              ]
            }
          },
          { type: 'input', block_id: 'blk_duration_val', label: { type: 'plain_text', text: 'Quantidade' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: 'plain_text', text: 'Ex: 48' } } },

          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa (Compliance)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// INDICAR DEPUTY (NOVO)
slackApp.action('btn_deputy', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'submit_deputy',
        title: { type: 'plain_text', text: 'Indicar Substituto' },
        submit: { type: 'plain_text', text: 'Indicar' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '_O "Deputy" é um gestor reserva que pode aprovar acessos em seu nome._' } },
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Substituto' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// Ações de Link (Apenas Ack para não dar erro)
slackApp.action('link_new_sw', async ({ ack }) => await ack());
slackApp.action('link_vendor', async ({ ack }) => await ack());
slackApp.action('link_security', async ({ ack }) => await ack());

// ============================================================
// 3. PROCESSAMENTO E BANCO (HANDLERS DE VIEW)
// ============================================================

async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, msgSuccess: string, isExtraordinary = false) {
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

    // Fallback: Se não achar, pega o primeiro admin ou user do banco (para não travar teste)
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

    // Confirma no chat privado do usuário (Ephemeral = apenas ele vê se for em canal público, ou DM)
    // Usamos chat.postMessage simples aqui
    await client.chat.postMessage({ channel: slackId, text: msgSuccess });

  } catch (e) {
    console.error('❌ Erro ao salvar solicitação:', e);
    await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro ao processar solicitação. Seu usuário existe no painel web?" });
  }
}

// Handlers de Submissão
slackApp.view('submit_move', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const details = {
    info: `Movimentação: ${name}`,
    current: { role: v.blk_role_curr.inp.value, dept: v.blk_dept_curr.inp.value },
    future: { role: v.blk_role_fut.inp.value, dept: v.blk_dept_fut.inp.value }
  };
  await saveRequest(body, client, 'CHANGE_ROLE', details, v.blk_reason.inp.value!, `✅ Solicitação de movimentação para *${name}* criada com sucesso.`);
});

slackApp.view('submit_hire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const startDate = v.blk_date.picker.selected_date || 'A definir';
  const details = {
    info: `Contratação: ${name}`,
    startDate,
    role: v.blk_role.inp.value,
    dept: v.blk_dept.inp.value,
    obs: v.blk_obs.inp.value
  };
  await saveRequest(body, client, 'HIRING', details, `Início: ${startDate}`, `✅ Contratação de *${name}* registrada.`);
});

slackApp.view('submit_fire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const details = {
    info: `Desligamento: ${name}`,
    role: v.blk_role.inp.value,
    dept: v.blk_dept.inp.value
  };
  await saveRequest(body, client, 'FIRING', details, v.blk_reason.inp.value!, `⚠️ Desligamento de *${name}* registrado. Processo de offboarding iniciado.`);
});

slackApp.view('submit_tool_access', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const tool = v.blk_tool.inp.value;
  const details = {
    info: `Acesso: ${tool}`,
    tool,
    current: v.blk_curr.inp.value,
    target: v.blk_target.inp.value
  };
  await saveRequest(body, client, 'ACCESS_CHANGE', details, v.blk_reason.inp.value!, `✅ Pedido de alteração de acesso para *${tool}* enviado.`);
});

slackApp.view('submit_tool_extra', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const tool = v.blk_tool.inp.value;
  const duration = v.blk_duration_val.inp.value;
  const unit = v.blk_duration_wrap.unit_select.selected_option?.value;

  const details = {
    info: `Extraordinário: ${tool}`,
    beneficiary: v.blk_collab.inp.value,
    tool,
    target: v.blk_target.inp.value,
    duration,
    unit
  };

  let reason = v.blk_reason.inp.value!;
  if (duration && unit) {
    reason += ` (Duração pedida: ${duration} ${unit})`;
  }

  await saveRequest(body, client, 'ACCESS_TOOL_EXTRA', details, reason, `🔥 Acesso extraordinário para *${tool}* enviado ao time de Segurança.`, true);
});

slackApp.view('submit_deputy', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const details = {
    info: `Indicação de Deputy: ${name}`,
    substitute: name,
    role: v.blk_role.inp.value,
    dept: v.blk_dept.inp.value
  };
  await saveRequest(body, client, 'DEPUTY_DESIGNATION', details, v.blk_reason.inp.value!, `✅ Indicação de *${name}* como seu Substituto (Deputy) enviada para aprovação do time de S.I.`);
});

// ============================================================
// 4. NOTIFICAÇÃO ATIVA (CHAMADA PELO BACKEND WEB)
// ============================================================

const ACCESS_TYPES = ['ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
const PEOPLE_TYPES = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];

export const sendSlackNotification = async (
  email: string,
  status: 'APROVADO' | 'REPROVADO',
  adminNote: string,
  requestType?: string,
  ownerName?: string
) => {
  if (!slackApp) return;

  try {
    const userLookup = await slackApp.client.users.lookupByEmail({ email });
    const slackUserId = userLookup.user?.id;

    if (!slackUserId) {
      console.warn(`⚠️ Usuário Slack não encontrado para o email: ${email}`);
      return;
    }

    const isApproved = status === 'APROVADO';
    const icon = isApproved ? '✅' : '❌';
    const actionText = isApproved ? 'APROVADA' : 'REPROVADA';

    const isAccessRequest = requestType && ACCESS_TYPES.includes(requestType);

    // Bloco principal
    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${icon} Solicitação ${actionText}`, emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Status:*\n${status}` },
          { type: 'mrkdwn', text: `*Nota do Time de SI:*\n_${adminNote || '—'}_` }
        ]
      }
    ];

    // Bloco de contato — apenas para recusa de Gestão de Acessos
    if (!isApproved && isAccessRequest) {
      const contactText = ownerName
        ? `Para mais detalhes, contate o *Owner da ferramenta: ${ownerName}* ou o *time de Segurança da Informação*.`
        : `Para mais detalhes, contate o *time de Segurança da Informação*.`;

      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `ℹ️ ${contactText}` }
      });
    }

    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Theris OS • Governança de Acessos' }]
    });

    await slackApp.client.chat.postMessage({
      channel: slackUserId,
      text: `Sua solicitação foi ${actionText}`,
      blocks
    });

    console.log(`🔔 Notificação enviada para ${email} — ${status} [${requestType || 'n/a'}]`);
  } catch (error) {
    console.error('❌ Erro ao enviar notificação Slack:', error);
  }
};