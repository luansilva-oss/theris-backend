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
// 1. MENU PRINCIPAL (/theris)
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
          { type: 'section', text: { type: 'mrkdwn', text: '*Bem-vindo ao Painel de Governança.*\nSelecione o tipo de solicitação:' } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '👤 Gestão de Pessoas' }, action_id: 'btn_people_mgmt', style: 'primary' },
              { type: 'button', text: { type: 'plain_text', text: '🛠️ Gestão de Ferramentas' }, action_id: 'btn_tool_mgmt' }
            ]
          }
        ]
      }
    });
  } catch (error) { console.error('Erro ao abrir modal:', error); }
});

// ============================================================
// 2. MODAL: GESTÃO DE PESSOAS (ATUALIZADO E SEPARADO)
// ============================================================
slackApp.action('btn_people_mgmt', async ({ ack, body, client }) => {
  await ack();
  
  await client.views.update({
    view_id: (body as any).view.id,
    view: {
      type: 'modal',
      callback_id: 'submit_people_request',
      title: { type: 'plain_text', text: 'Gestão de Pessoas' },
      submit: { type: 'plain_text', text: 'Enviar' },
      close: { type: 'plain_text', text: 'Cancelar' },
      blocks: [
        {
          type: 'input',
          block_id: 'blk_type',
          label: { type: 'plain_text', text: 'Tipo de Movimentação' },
          element: {
            type: 'static_select',
            action_id: 'sel_type',
            options: [
              { text: { type: 'plain_text', text: '🔄 Remanejamento / Promoção' }, value: 'MOVE' },
              { text: { type: 'plain_text', text: '✅ Nova Contratação' }, value: 'HIRE' },
              { text: { type: 'plain_text', text: '❌ Demissão / Desligamento' }, value: 'FIRE' }
            ]
          }
        },
        {
          type: 'input',
          block_id: 'blk_name',
          label: { type: 'plain_text', text: 'Nome do Colaborador' },
          element: { type: 'plain_text_input', action_id: 'inp_name' }
        },
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: '*Situação Atual (Obrigatório para Demissão/Mudança)*' } },
        {
          type: 'input',
          block_id: 'blk_role_curr',
          optional: true,
          label: { type: 'plain_text', text: 'Cargo Atual' },
          element: { type: 'plain_text_input', action_id: 'inp_role_curr', placeholder: { type: 'plain_text', text: 'Ex: Analista Junior' } }
        },
        {
          type: 'input',
          block_id: 'blk_dept_curr',
          optional: true,
          label: { type: 'plain_text', text: 'Departamento Atual' },
          element: { type: 'plain_text_input', action_id: 'inp_dept_curr', placeholder: { type: 'plain_text', text: 'Ex: Financeiro' } }
        },
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: '*Situação Futura (Obrigatório para Contratação/Mudança)*' } },
        {
          type: 'input',
          block_id: 'blk_role_fut',
          optional: true,
          label: { type: 'plain_text', text: 'Novo Cargo' },
          element: { type: 'plain_text_input', action_id: 'inp_role_fut', placeholder: { type: 'plain_text', text: 'Ex: Analista Pleno' } }
        },
        {
          type: 'input',
          block_id: 'blk_dept_fut',
          optional: true,
          label: { type: 'plain_text', text: 'Novo Departamento' },
          element: { type: 'plain_text_input', action_id: 'inp_dept_fut', placeholder: { type: 'plain_text', text: 'Ex: Controladoria' } }
        },
        { type: 'divider' },
        {
            type: 'input',
            block_id: 'blk_reason',
            label: { type: 'plain_text', text: 'Motivo da Alteração' },
            element: { type: 'plain_text_input', multiline: true, action_id: 'inp_reason' }
        }
      ]
    }
  });
});

// ============================================================
// 3. MODAL: GESTÃO DE FERRAMENTAS (MANTIDO IGUAL)
// ============================================================
slackApp.action('btn_tool_mgmt', async ({ ack, body, client }) => {
  await ack();
  await client.views.update({
    view_id: (body as any).view.id,
    view: {
      type: 'modal',
      callback_id: 'submit_tool_request',
      title: { type: 'plain_text', text: 'Ferramentas & Acessos' },
      submit: { type: 'plain_text', text: 'Enviar' },
      close: { type: 'plain_text', text: 'Cancelar' },
      blocks: [
        {
            type: 'input',
            block_id: 'blk_tool_type',
            label: { type: 'plain_text', text: 'O que você precisa?' },
            element: {
              type: 'static_select',
              action_id: 'sel_tool_type',
              options: [
                { text: { type: 'plain_text', text: '🛠️ Nova Ferramenta / Substituição' }, value: 'NEW_TOOL' },
                { text: { type: 'plain_text', text: '🎚️ Alterar Nível de Acesso' }, value: 'ACCESS_SCHEMA' },
                { text: { type: 'plain_text', text: '⚠️ Acesso Extraordinário' }, value: 'EXTRA_ACCESS' }
              ]
            }
        },
        {
            type: 'input',
            block_id: 'blk_tool_name',
            label: { type: 'plain_text', text: 'Nome da Ferramenta' },
            element: { type: 'plain_text_input', action_id: 'inp_tool_name' }
        },
        {
            type: 'input',
            block_id: 'blk_details',
            label: { type: 'plain_text', text: 'Detalhes Técnicos' },
            element: { type: 'plain_text_input', multiline: true, action_id: 'inp_details', placeholder: {type:'plain_text', text: 'Owner, Nível de Acesso, etc.'} }
        },
        {
            type: 'input',
            block_id: 'blk_reason',
            label: { type: 'plain_text', text: 'Justificativa' },
            element: { type: 'plain_text_input', multiline: true, action_id: 'inp_reason' }
        }
      ]
    }
  });
});

// ============================================================
// 4. PROCESSAMENTO: PESSOAS (ATUALIZADO)
// ============================================================
slackApp.view('submit_people_request', async ({ ack, body, view, client }) => {
  await ack();
  
  const values = view.state.values;
  const type = values.blk_type.sel_type.selected_option?.value;
  const name = values.blk_name.inp_name.value;
  const reason = values.blk_reason.inp_reason.value;

  // Extração dos novos campos separados
  const currentRole = values.blk_role_curr.inp_role_curr.value || 'N/A';
  const currentDept = values.blk_dept_curr.inp_dept_curr.value || 'N/A';
  const futureRole = values.blk_role_fut.inp_role_fut.value || 'N/A';
  const futureDept = values.blk_dept_fut.inp_dept_fut.value || 'N/A';
  
  const dbType = type === 'MOVE' ? 'CHANGE_ROLE' : type === 'HIRE' ? 'HIRING' : 'FIRING';
  
  // Monta o JSON detalhado
  const details = {
      info: `${type === 'MOVE' ? 'Remanejamento' : type === 'HIRE' ? 'Contratação' : 'Demissão'} - ${name}`,
      targetName: name,
      current: { role: currentRole, dept: currentDept },
      future: { role: futureRole, dept: futureDept }
  };

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

      await client.chat.postMessage({
          channel: body.user.id,
          text: `✅ *Recebido!* Movimentação de *${name}* registrada.\n📂 *De:* ${currentRole} (${currentDept})\n📂 *Para:* ${futureRole} (${futureDept})`
      });

  } catch (error) { console.error(error); }
});

// ============================================================
// 5. PROCESSAMENTO: FERRAMENTAS (MANTIDO)
// ============================================================
slackApp.view('submit_tool_request', async ({ ack, body, view, client }) => {
    await ack();
    const values = view.state.values;
    const type = values.blk_tool_type.sel_tool_type.selected_option?.value;
    const toolName = values.blk_tool_name.inp_tool_name.value;
    const detailsText = values.blk_details.inp_details.value;
    const reason = values.blk_reason.inp_reason.value;
    const isExtraordinary = type === 'EXTRA_ACCESS';
    
    try {
        const slackUser = body.user.id;
        const userInfo = await client.users.info({ user: slackUser });
        const email = userInfo.user?.profile?.email;
        let requester = await prisma.user.findFirst({ where: { email } });
        if (!requester) requester = await prisma.user.findFirst(); 

        let labelType = 'Acesso';
        if (type === 'NEW_TOOL') labelType = 'Nova Ferramenta';
        if (type === 'EXTRA_ACCESS') labelType = '🔥 Acesso Extraordinário';

        await prisma.request.create({
            data: {
                requesterId: requester!.id,
                type: 'ACCESS_TOOL', 
                details: JSON.stringify({
                    info: `${labelType}: ${toolName}`,
                    toolName: toolName,
                    rawDetails: detailsText,
                    accessLevel: isExtraordinary ? 'Admin/Extra' : 'Standard'
                }),
                justification: reason || 'Via Slack',
                status: 'PENDENTE_GESTOR',
                currentApproverRole: 'MANAGER',
                isExtraordinary: isExtraordinary
            }
        });

        await client.chat.postMessage({
            channel: body.user.id,
            text: `✅ *Recebido!* Solicitação para *${toolName}* encaminhada.`
        });
    } catch (e) { console.error(e); }
});

export const startSlackBot = async () => {
  await slackApp.start();
  console.log('🤖 Theris Bot está online e escutando /theris');
};