import { App, LogLevel } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN, 
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

// ============================================================
// 1. MENU PRINCIPAL (/theris) - AGORA COM 4 BOTÕES
// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'theris_main_modal',
        title: { type: 'plain_text', text: 'Theris' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '*Painel de Governança*\nO que você deseja fazer hoje?' } },
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
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '🛠️ *Acessos & Ferramentas*' } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: 'Solicitar Acesso / Ferramenta' }, action_id: 'btn_tool_mgmt' }
            ]
          }
        ]
      }
    });
  } catch (error) { console.error('Erro ao abrir modal:', error); }
});

// ============================================================
// 2A. MODAL: PROMOÇÃO / MUDANÇA (Pede Atual e Futuro)
// ============================================================
slackApp.action('btn_move', async ({ ack, body, client }) => {
  await ack();
  await client.views.push({ // Usa push para empilhar sobre o menu
    trigger_id: (body as any).trigger_id,
    view: {
      type: 'modal',
      callback_id: 'submit_move',
      title: { type: 'plain_text', text: 'Movimentação' },
      submit: { type: 'plain_text', text: 'Enviar' },
      blocks: [
        { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp_name' } },
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: '*De onde sai (Atual)*' } },
        { type: 'input', block_id: 'blk_role_curr', label: { type: 'plain_text', text: 'Cargo Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
        { type: 'input', block_id: 'blk_dept_curr', label: { type: 'plain_text', text: 'Departamento Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
        { type: 'section', text: { type: 'mrkdwn', text: '*Para onde vai (Novo)*' } },
        { type: 'input', block_id: 'blk_role_fut', label: { type: 'plain_text', text: 'Novo Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
        { type: 'input', block_id: 'blk_dept_fut', label: { type: 'plain_text', text: 'Novo Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
        { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Motivo' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
      ]
    }
  });
});

// ============================================================
// 2B. MODAL: CONTRATAÇÃO (Pede Só Futuro)
// ============================================================
slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack();
  await client.views.push({
    trigger_id: (body as any).trigger_id,
    view: {
      type: 'modal',
      callback_id: 'submit_hire',
      title: { type: 'plain_text', text: 'Nova Contratação' },
      submit: { type: 'plain_text', text: 'Solicitar Onboarding' },
      blocks: [
        { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Novo Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp_name' } },
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: '*Dados da Vaga*' } },
        { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
        { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
        { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Observações / Data de Início' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
      ]
    }
  });
});

// ============================================================
// 2C. MODAL: DEMISSÃO (Pede Só Atual)
// ============================================================
slackApp.action('btn_fire', async ({ ack, body, client }) => {
  await ack();
  await client.views.push({
    trigger_id: (body as any).trigger_id,
    view: {
      type: 'modal',
      callback_id: 'submit_fire',
      title: { type: 'plain_text', text: 'Desligamento' },
      submit: { type: 'plain_text', text: 'Iniciar Offboarding' },
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: '⚠️ *Atenção:* Esta ação iniciará o bloqueio de acessos.' } },
        { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp_name' } },
        { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
        { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
        { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Motivo (Opcional/Confidencial)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp', optional: true } }
      ]
    }
  });
});

// ============================================================
// 2D. MODAL: FERRAMENTAS (MANTIDO)
// ============================================================
slackApp.action('btn_tool_mgmt', async ({ ack, body, client }) => {
  await ack();
  await client.views.push({
    trigger_id: (body as any).trigger_id,
    view: {
      type: 'modal',
      callback_id: 'submit_tool_request',
      title: { type: 'plain_text', text: 'Acessos' },
      submit: { type: 'plain_text', text: 'Enviar' },
      blocks: [
        {
            type: 'input', block_id: 'blk_tool_type', label: { type: 'plain_text', text: 'Tipo' },
            element: {
              type: 'static_select', action_id: 'sel_tool_type',
              options: [
                { text: { type: 'plain_text', text: '🛠️ Nova Ferramenta / Substituição' }, value: 'NEW_TOOL' },
                { text: { type: 'plain_text', text: '🎚️ Alterar Nível de Acesso' }, value: 'ACCESS_SCHEMA' },
                { text: { type: 'plain_text', text: '⚠️ Acesso Extraordinário' }, value: 'EXTRA_ACCESS' }
              ]
            }
        },
        { type: 'input', block_id: 'blk_tool_name', label: { type: 'plain_text', text: 'Nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp_tool_name' } },
        { type: 'input', block_id: 'blk_details', label: { type: 'plain_text', text: 'Detalhes (Nível/Owner)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp_details' } },
        { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp_reason' } }
      ]
    }
  });
});

// ============================================================
// 3. PROCESSADORES (HANDLERS)
// ============================================================

// Helper para salvar no banco
async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, msg: string) {
    try {
      const slackUser = body.user.id;
      const userInfo = await client.users.info({ user: slackUser });
      const email = userInfo.user?.profile?.email;
      let requester = await prisma.user.findFirst({ where: { email } });
      if (!requester) requester = await prisma.user.findFirst(); 

      await prisma.request.create({
          data: {
              requesterId: requester!.id,
              type: dbType,
              details: JSON.stringify(details),
              justification: reason || 'Via Slack',
              status: 'PENDENTE_GESTOR',
              currentApproverRole: 'MANAGER',
              isExtraordinary: false
          }
      });
      await client.chat.postMessage({ channel: body.user.id, text: msg });
    } catch (e) { console.error(e); }
}

// Handler: Promoção (CHANGE_ROLE)
slackApp.view('submit_move', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp_name.value;
  const details = {
      info: `Remanejamento - ${name}`,
      current: { role: v.blk_role_curr.inp.value, dept: v.blk_dept_curr.inp.value },
      future: { role: v.blk_role_fut.inp.value, dept: v.blk_dept_fut.inp.value }
  };
  await saveRequest(body, client, 'CHANGE_ROLE', details, v.blk_reason.inp.value!, `✅ Processo de mudança de *${name}* iniciado.`);
});

// Handler: Contratação (HIRING)
slackApp.view('submit_hire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp_name.value;
  const details = {
      info: `Contratação - ${name}`,
      future: { role: v.blk_role.inp.value, dept: v.blk_dept.inp.value }
  };
  await saveRequest(body, client, 'HIRING', details, v.blk_reason.inp.value!, `✅ Onboarding de *${name}* solicitado.`);
});

// Handler: Demissão (FIRING)
slackApp.view('submit_fire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp_name.value;
  const details = {
      info: `Desligamento - ${name}`,
      current: { role: v.blk_role.inp.value, dept: v.blk_dept.inp.value }
  };
  await saveRequest(body, client, 'FIRING', details, v.blk_reason.inp.value!, `⚠️ Offboarding de *${name}* registrado.`);
});

// Handler: Ferramentas (ACCESS_TOOL)
slackApp.view('submit_tool_request', async ({ ack, body, view, client }) => {
    await ack();
    const v = view.state.values;
    const type = v.blk_tool_type.sel_tool_type.selected_option?.value;
    const tool = v.blk_tool_name.inp_tool_name.value;
    const isExtra = type === 'EXTRA_ACCESS';
    
    // Lógica para salvar específica de ferramenta (com flag isExtraordinary)
    try {
        const slackUser = body.user.id;
        const userInfo = await client.users.info({ user: slackUser });
        const email = userInfo.user?.profile?.email;
        let requester = await prisma.user.findFirst({ where: { email } });
        if (!requester) requester = await prisma.user.findFirst();

        await prisma.request.create({
            data: {
                requesterId: requester!.id,
                type: 'ACCESS_TOOL',
                details: JSON.stringify({ info: `Acesso: ${tool}`, toolName: tool, rawDetails: v.blk_details.inp_details.value }),
                justification: v.blk_reason.inp_reason.value || 'Via Slack',
                status: 'PENDENTE_GESTOR',
                currentApproverRole: 'MANAGER',
                isExtraordinary: isExtra
            }
        });
        await client.chat.postMessage({ channel: body.user.id, text: `✅ Pedido de ferramenta *${tool}* enviado.` });
    } catch (e) { console.error(e); }
});

export const startSlackBot = async () => { await slackApp.start(); console.log('🤖 Theris Bot está online'); };