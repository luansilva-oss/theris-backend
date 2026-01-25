import { App, LogLevel } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- INICIALIZAÇÃO SEGURA ---
// Lê os tokens das variáveis de ambiente (.env)
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
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*Bem-vindo ao Painel de Governança.*\nSelecione o tipo de solicitação:' }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '👤 Gestão de Pessoas' },
                action_id: 'btn_people_mgmt',
                style: 'primary'
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '🛠️ Gestão de Ferramentas' },
                action_id: 'btn_tool_mgmt'
              }
            ]
          }
        ]
      }
    });
  } catch (error) {
    console.error('Erro ao abrir modal:', error);
  }
});

// ============================================================
// 2. MODAL: GESTÃO DE PESSOAS
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
        {
          type: 'divider'
        },
        {
          type: 'input',
          block_id: 'blk_current_info',
          optional: true,
          label: { type: 'plain_text', text: 'Cargo/Depto ATUAL (Se houver)' },
          element: { type: 'plain_text_input', action_id: 'inp_curr', placeholder: { type: 'plain_text', text: 'Ex: Vendedor - Comercial' } }
        },
        {
          type: 'input',
          block_id: 'blk_future_info',
          optional: true,
          label: { type: 'plain_text', text: 'Cargo/Depto FUTURO' },
          element: { type: 'plain_text_input', action_id: 'inp_fut', placeholder: { type: 'plain_text', text: 'Ex: Líder - Comercial' } }
        },
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
// 3. MODAL: GESTÃO DE FERRAMENTAS
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
            element: { 
                type: 'plain_text_input', 
                multiline: true, 
                action_id: 'inp_details', 
                placeholder: {type:'plain_text', text: 'Se for nova: Quem é Owner/Sub-Owner?\nSe for acesso: Qual nível?'} 
            }
        },
        {
            type: 'context',
            elements: [
                { type: 'mrkdwn', text: '⚠️ *Atenção:* Acessos Extraordinários passarão por aprovação de Segurança da Informação.' }
            ]
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
// 4. PROCESSAMENTO: SALVAR NO BANCO (PESSOAS)
// ============================================================
slackApp.view('submit_people_request', async ({ ack, body, view, client }) => {
  await ack();
  
  const values = view.state.values;
  const type = values.blk_type.sel_type.selected_option?.value;
  const name = values.blk_name.inp_name.value;
  const reason = values.blk_reason.inp_reason.value;
  
  // Mapeia para tipos que o Banco entenda
  const dbType = type === 'MOVE' ? 'CHANGE_ROLE' : type === 'HIRE' ? 'HIRING' : 'FIRING';
  
  const details = {
      info: `${type === 'MOVE' ? 'Remanejamento' : type === 'HIRE' ? 'Contratação' : 'Demissão'} - ${name}`,
      targetName: name,
      currentInfo: values.blk_current_info.inp_curr.value || 'N/A',
      futureInfo: values.blk_future_info.inp_fut.value || 'N/A'
  };

  try {
      // 1. Identificar quem está pedindo (pelo email do Slack)
      const slackUser = body.user.id;
      const userInfo = await client.users.info({ user: slackUser });
      const email = userInfo.user?.profile?.email;

      let requester = await prisma.user.findFirst({ where: { email } });
      
      // Fallback: Se não achar pelo email (ex: ambiente de teste), pega o primeiro usuário do banco
      if (!requester) {
          console.log(`⚠️ Usuário Slack (${email}) não encontrado no banco. Usando fallback.`);
          requester = await prisma.user.findFirst(); 
      }

      if (!requester) throw new Error("Nenhum usuário encontrado no banco de dados.");

      // 2. Criar a solicitação
      await prisma.request.create({
          data: {
              requesterId: requester.id,
              type: dbType,
              details: JSON.stringify(details),
              justification: reason || 'Solicitado via Slack',
              status: 'PENDENTE_GESTOR',
              currentApproverRole: 'MANAGER',
              isExtraordinary: false
          }
      });

      // 3. Confirmar para o usuário
      await client.chat.postMessage({
          channel: body.user.id,
          text: `✅ *Sucesso!* Sua solicitação de movimentação para *${name}* foi criada e enviada para aprovação.`
      });

  } catch (error) {
      console.error('Erro ao processar modal pessoas:', error);
      await client.chat.postMessage({
          channel: body.user.id,
          text: `❌ Ocorreu um erro ao processar sua solicitação.`
      });
  }
});

// ============================================================
// 5. PROCESSAMENTO: SALVAR NO BANCO (FERRAMENTAS)
// ============================================================
slackApp.view('submit_tool_request', async ({ ack, body, view, client }) => {
    await ack();
    
    const values = view.state.values;
    const type = values.blk_tool_type.sel_tool_type.selected_option?.value;
    const toolName = values.blk_tool_name.inp_tool_name.value;
    const detailsText = values.blk_details.inp_details.value;
    const reason = values.blk_reason.inp_reason.value;

    // Regra de Negócio: Se for EXTRA_ACCESS, marca flag
    const isExtraordinary = type === 'EXTRA_ACCESS';
    
    try {
        const slackUser = body.user.id;
        const userInfo = await client.users.info({ user: slackUser });
        const email = userInfo.user?.profile?.email;
        
        let requester = await prisma.user.findFirst({ where: { email } });
        if (!requester) requester = await prisma.user.findFirst(); 

        if (!requester) throw new Error("Usuário inválido.");

        // Define rótulo amigável
        let labelType = 'Acesso';
        if (type === 'NEW_TOOL') labelType = 'Nova Ferramenta';
        if (type === 'EXTRA_ACCESS') labelType = '🔥 Acesso Extraordinário';

        await prisma.request.create({
            data: {
                requesterId: requester.id,
                type: 'ACCESS_TOOL', 
                details: JSON.stringify({
                    info: `${labelType}: ${toolName}`,
                    toolName: toolName,
                    rawDetails: detailsText,
                    accessLevel: isExtraordinary ? 'Admin/Extra' : 'Standard' // Simplificação para lógica de aprovação
                }),
                justification: reason || 'Solicitado via Slack',
                status: 'PENDENTE_GESTOR',
                currentApproverRole: 'MANAGER',
                isExtraordinary: isExtraordinary
            }
        });

        await client.chat.postMessage({
            channel: body.user.id,
            text: `✅ *Recebido!* A solicitação para a ferramenta *${toolName}* foi registrada.\n\n🔍 *Status:* Aguardando Gestor.`
        });

    } catch (error) { 
        console.error('Erro ao processar modal ferramentas:', error); 
    }
});

// Função para iniciar o bot (chamada no index.ts)
export const startSlackBot = async () => {
  await slackApp.start();
  console.log('🤖 Theris Bot está online e escutando o comando /theris');
};