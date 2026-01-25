import { App, LogLevel } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN, 
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.ERROR, // Reduz logs desnecessários, foca em erros
});

// ============================================================
// 1. MENU PRINCIPAL (/theris)
// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  // 1. ACK IMEDIATO (Essencial para não dar erro na tela)
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
  } catch (error) { 
    console.error('❌ Erro ao abrir Menu Principal:', error); 
  }
});

// ============================================================
// 2. ABERTURA DE MODAIS (Formulários)
// ============================================================

// PROMOÇÃO / MUDANÇA
slackApp.action('btn_move', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'submit_move',
        title: { type: 'plain_text', text: 'Movimentação' },
        submit: { type: 'plain_text', text: 'Enviar' },
        blocks: [
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
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
  } catch (e) { console.error('Erro ao abrir Modal Move:', e); }
});

// CONTRATAÇÃO
slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'submit_hire',
        title: { type: 'plain_text', text: 'Nova Contratação' },
        submit: { type: 'plain_text', text: 'Solicitar' },
        blocks: [
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Novo Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '*Dados da Vaga*' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Data de Início / Obs' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error('Erro ao abrir Modal Hire:', e); }
});

// DEMISSÃO
slackApp.action('btn_fire', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'submit_fire',
        title: { type: 'plain_text', text: 'Desligamento' },
        submit: { type: 'plain_text', text: 'Confirmar' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '⚠️ *Atenção:* Esta ação iniciará o bloqueio de acessos.' } },
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Motivo (Opcional)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp', optional: true } }
        ]
      }
    });
  } catch (e) { console.error('Erro ao abrir Modal Fire:', e); }
});

// FERRAMENTAS
slackApp.action('btn_tool_mgmt', async ({ ack, body, client }) => {
  await ack();
  try {
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
                type: 'static_select', action_id: 'sel',
                options: [
                  { text: { type: 'plain_text', text: '🛠️ Nova Ferramenta / Substituição' }, value: 'NEW_TOOL' },
                  { text: { type: 'plain_text', text: '🎚️ Alterar Nível de Acesso' }, value: 'ACCESS_SCHEMA' },
                  { text: { type: 'plain_text', text: '⚠️ Acesso Extraordinário' }, value: 'EXTRA_ACCESS' }
                ]
              }
          },
          { type: 'input', block_id: 'blk_tool_name', label: { type: 'plain_text', text: 'Nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_details', label: { type: 'plain_text', text: 'Detalhes (Nível/Owner)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error('Erro ao abrir Modal Tool:', e); }
});

// ============================================================
// 3. PROCESSAMENTO (HANDLERS)
// ============================================================

// Helper para salvar
async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, msg: string) {
    try {
      const slackUser = body.user.id;
      // Busca usuário (Tenta seguro, falha graciosa)
      let requesterId = '';
      try {
          const userInfo = await client.users.info({ user: slackUser });
          const email = userInfo.user?.profile?.email;
          if (email) {
             const user = await prisma.user.findFirst({ where: { email } });
             if (user) requesterId = user.id;
          }
      } catch (err) { console.log('Erro ao buscar user info slack:', err); }

      // Fallback para testes
      if (!requesterId) {
         const fallback = await prisma.user.findFirst();
         if (fallback) requesterId = fallback.id;
      }

      if (!requesterId) {
          throw new Error("Impossível identificar usuário solicitante no banco.");
      }

      await prisma.request.create({
          data: {
              requesterId,
              type: dbType,
              details: JSON.stringify(details),
              justification: reason || 'Via Slack',
              status: 'PENDENTE_GESTOR',
              currentApproverRole: 'MANAGER',
              isExtraordinary: false
          }
      });
      
      // Feedback no chat
      await client.chat.postMessage({ channel: body.user.id, text: msg });

    } catch (e) { 
        console.error('❌ Erro ao salvar solicitação:', e); 
        await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro interno ao processar. Contate o administrador." });
    }
}

// Handlers
slackApp.view('submit_move', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const details = {
      info: `Remanejamento - ${name}`,
      current: { role: v.blk_role_curr.inp.value, dept: v.blk_dept_curr.inp.value },
      future: { role: v.blk_role_fut.inp.value, dept: v.blk_dept_fut.inp.value }
  };
  await saveRequest(body, client, 'CHANGE_ROLE', details, v.blk_reason.inp.value!, `✅ Processo de mudança de *${name}* iniciado.`);
});

slackApp.view('submit_hire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const details = {
      info: `Contratação - ${name}`,
      future: { role: v.blk_role.inp.value, dept: v.blk_dept.inp.value }
  };
  await saveRequest(body, client, 'HIRING', details, v.blk_reason.inp.value!, `✅ Onboarding de *${name}* solicitado.`);
});

slackApp.view('submit_fire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const details = {
      info: `Desligamento - ${name}`,
      current: { role: v.blk_role.inp.value, dept: v.blk_dept.inp.value }
  };
  await saveRequest(body, client, 'FIRING', details, v.blk_reason.inp.value!, `⚠️ Offboarding de *${name}* registrado.`);
});

slackApp.view('submit_tool_request', async ({ ack, body, view, client }) => {
    await ack();
    const v = view.state.values;
    const type = v.blk_tool_type.sel.selected_option?.value;
    const tool = v.blk_tool_name.inp.value;
    const isExtra = type === 'EXTRA_ACCESS';
    
    const details = { 
        info: `Acesso: ${tool}`, 
        toolName: tool, 
        rawDetails: v.blk_details.inp.value,
        accessLevel: isExtra ? 'Extraordinary' : 'Standard'
    };

    // Reutiliza a função saveRequest, mas precisamos tratar o isExtraordinary
    // Vamos fazer manual aqui para passar o flag correto
    try {
        const slackUser = body.user.id;
        let requesterId = '';
        try {
            const userInfo = await client.users.info({ user: slackUser });
            const email = userInfo.user?.profile?.email;
            if(email) {
                const user = await prisma.user.findFirst({ where: { email } });
                if(user) requesterId = user.id;
            }
        } catch(e) {}
        if(!requesterId) { const f = await prisma.user.findFirst(); if(f) requesterId = f.id; }

        await prisma.request.create({
            data: {
                requesterId: requesterId!,
                type: 'ACCESS_TOOL',
                details: JSON.stringify(details),
                justification: v.blk_reason.inp.value || 'Via Slack',
                status: 'PENDENTE_GESTOR',
                currentApproverRole: 'MANAGER',
                isExtraordinary: isExtra
            }
        });
        await client.chat.postMessage({ channel: body.user.id, text: `✅ Pedido de ferramenta *${tool}* enviado.` });
    } catch (e) { console.error(e); }
});

export const startSlackBot = async () => { 
    try {
        await slackApp.start(); 
        console.log('🤖 Theris Bot está online'); 
    } catch (e) {
        console.error('❌ Falha ao iniciar Slack Bot:', e);
    }
};