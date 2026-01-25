import { App, LogLevel } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN, 
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.ERROR, // Mantém o log limpo, focando em erros
});

// ============================================================
// 1. MENU PRINCIPAL (/theris)
// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  await ack(); // Resposta imediata para evitar timeout

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'theris_main_modal',
        title: { type: 'plain_text', text: 'Theris IGA 🦅' },
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
              { type: 'button', text: { type: 'plain_text', text: 'Gerenciar Ferramentas' }, action_id: 'btn_tool_mgmt' }
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
// 2. MODAIS DE GESTÃO DE PESSOAS
// ============================================================

// A. PROMOÇÃO / MUDANÇA
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

// B. CONTRATAÇÃO (COM DATEPICKER)
slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'submit_hire',
        title: { type: 'plain_text', text: 'Nova Contratação' },
        submit: { type: 'plain_text', text: 'Agendar Onboarding' },
        blocks: [
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Novo Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { 
              type: 'input', 
              block_id: 'blk_date', 
              label: { type: 'plain_text', text: 'Data de Início' }, 
              element: { type: 'datepicker', action_id: 'picker', placeholder: { type: 'plain_text', text: 'Selecione a data' } } 
          },
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '*Dados da Vaga*' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { 
              type: 'input', 
              block_id: 'blk_obs', 
              optional: true, 
              label: { type: 'plain_text', text: 'Observações (Equipamentos, etc)' }, 
              element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } 
          }
        ]
      }
    });
  } catch (e) { console.error('Erro ao abrir Modal Hire:', e); }
});

// C. DEMISSÃO
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
          { 
              type: 'input', 
              block_id: 'blk_reason', 
              optional: true, 
              label: { type: 'plain_text', text: 'Motivo (Opcional)' }, 
              element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } 
          }
        ]
      }
    });
  } catch (e) { console.error('Erro ao abrir Modal Fire:', e); }
});

// ============================================================
// 3. GESTÃO DE FERRAMENTAS (ROUTER & SUB-MODAIS)
// ============================================================

// MENU INTERMEDIÁRIO (ROUTER)
slackApp.action('btn_tool_mgmt', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'router_tool_request',
        title: { type: 'plain_text', text: 'Gestão de Ferramentas' },
        submit: { type: 'plain_text', text: 'Continuar' },
        blocks: [
          {
              type: 'input', 
              block_id: 'blk_tool_type', 
              label: { type: 'plain_text', text: 'Selecione o tipo de solicitação:' },
              element: {
                type: 'static_select', 
                action_id: 'sel',
                options: [
                  { text: { type: 'plain_text', text: '🔄 Substituição de Ferramenta' }, value: 'REPLACE_TOOL' },
                  { text: { type: 'plain_text', text: '🎚️ Alterar Nível de Acesso' }, value: 'CHANGE_ACCESS' },
                  { text: { type: 'plain_text', text: '🔥 Acesso Extraordinário' }, value: 'EXTRA_ACCESS' }
                ]
              }
          }
        ]
      }
    });
  } catch (e) { console.error('Erro ao abrir Menu Ferramentas:', e); }
});

// ROUTER HANDLER
slackApp.view('router_tool_request', async ({ ack, body, view, client }) => {
  await ack();
  const selectedType = view.state.values.blk_tool_type.sel.selected_option?.value;

  // 1. SUBSTITUIÇÃO DE FERRAMENTA
  if (selectedType === 'REPLACE_TOOL') {
      await client.views.push({
          trigger_id: (body as any).trigger_id,
          view: {
              type: 'modal', callback_id: 'submit_tool_replace', title: { type: 'plain_text', text: 'Substituição' }, submit: { type: 'plain_text', text: 'Solicitar' },
              blocks: [
                  { type: 'input', block_id: 'blk_old', label: { type: 'plain_text', text: 'Ferramenta Atual (Descontinuar)' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'divider' },
                  { type: 'section', text: { type: 'mrkdwn', text: '*Dados da Nova Ferramenta*' } },
                  { type: 'input', block_id: 'blk_new', label: { type: 'plain_text', text: 'Nome da Nova Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_owner', label: { type: 'plain_text', text: 'Owner (Dono)' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_sub', optional: true, label: { type: 'plain_text', text: 'Sub-owner (Opcional)' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Motivo da Alteração de Sistema' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
              ]
          }
      });
  }

  // 2. ALTERAR NÍVEL DE ACESSO
  if (selectedType === 'CHANGE_ACCESS') {
      await client.views.push({
          trigger_id: (body as any).trigger_id,
          view: {
              type: 'modal', callback_id: 'submit_tool_access', title: { type: 'plain_text', text: 'Alterar Acesso' }, submit: { type: 'plain_text', text: 'Solicitar' },
              blocks: [
                  { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'Nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_curr', label: { type: 'plain_text', text: 'Nível de Acesso Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Nível de Acesso Desejado' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'import { App, LogLevel } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN, 
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.ERROR, // Foca apenas em erros críticos
});

// ============================================================
// 1. MENU PRINCIPAL (/theris)
// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  await ack(); // Resposta imediata para evitar timeout

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
// 2. ABERTURA DE MODAIS
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

// CONTRATAÇÃO (COM DATEPICKER)
slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal',
        callback_id: 'submit_hire',
        title: { type: 'plain_text', text: 'Nova Contratação' },
        submit: { type: 'plain_text', text: 'Agendar Onboarding' },
        blocks: [
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Novo Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { 
              type: 'input', 
              block_id: 'blk_date', 
              label: { type: 'plain_text', text: 'Data de Início' }, 
              element: { type: 'datepicker', action_id: 'picker', placeholder: { type: 'plain_text', text: 'Selecione a data' } } 
          },
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '*Dados da Vaga*' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { 
              type: 'input', 
              block_id: 'blk_obs', 
              optional: true, 
              label: { type: 'plain_text', text: 'Observações (Equipamentos, etc)' }, 
              element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } 
          }
        ]
      }
    });
  } catch (e) { console.error('Erro ao abrir Modal Hire:', e); }
});

// DEMISSÃO (CORRIGIDO ERRO DE TYPESCRIPT)
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
          { 
              type: 'input', 
              block_id: 'blk_reason', 
              optional: true, // ✅ Corrigido: optional fica aqui
              label: { type: 'plain_text', text: 'Motivo (Opcional)' }, 
              element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } 
          }
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
      let requesterId = '';
      try {
          const userInfo = await client.users.info({ user: slackUser });
          const email = userInfo.user?.profile?.email;
          if (email) {
             const user = await prisma.user.findFirst({ where: { email } });
             if (user) requesterId = user.id;
          }
      } catch (err) { console.log('Erro ao buscar user info slack:', err); }

      if (!requesterId) {
         const fallback = await prisma.user.findFirst();
         if (fallback) requesterId = fallback.id;
      }

      if (!requesterId) throw new Error("Usuário não identificado.");

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
      
      await client.chat.postMessage({ channel: body.user.id, text: msg });

    } catch (e) { 
        console.error('❌ Erro ao salvar solicitação:', e); 
        await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro interno. Avise a TI." });
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
  const startDate = v.blk_date.picker.selected_date; // Pega a data YYYY-MM-DD
  
  const details = {
      info: `Contratação - ${name}`,
      startDate: startDate, // Salva para o Widget de Onboarding
      future: { role: v.blk_role.inp.value, dept: v.blk_dept.inp.value },
      obs: v.blk_obs.inp.value || ''
  };

  const dateFmt = startDate ? startDate.split('-').reverse().join('/') : 'A definir';
  await saveRequest(body, client, 'HIRING', details, `Início: ${dateFmt}`, `📅 Agendado: Onboarding de *${name}* para *${dateFmt}*.`);
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
};input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } },
                  { type: 'context', elements: [{ type: 'mrkdwn', text: '🔒 *Compliance:* Esta solicitação será auditada por SI e Owner.' }] }
              ]
          }
      });
  }

  // 3. ACESSO EXTRAORDINÁRIO
  if (selectedType === 'EXTRA_ACCESS') {
      await client.views.push({
          trigger_id: (body as any).trigger_id,
          view: {
              type: 'modal', callback_id: 'submit_tool_extra', title: { type: 'plain_text', text: 'Acesso Extraordinário' }, submit: { type: 'plain_text', text: 'Solicitar' },
              blocks: [
                  { type: 'input', block_id: 'blk_collab', label: { type: 'plain_text', text: 'Nome do Colaborador (Beneficiário)' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'Nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_curr', label: { type: 'plain_text', text: 'Nível de Acesso Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Nível de Acesso Desejado' }, element: { type: 'plain_text_input', action_id: 'inp' } },
                  { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa (Compliance)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } },
                  { type: 'context', elements: [{ type: 'mrkdwn', text: '🔥 *Atenção:* Acessos extraordinários são monitorados.' }] }
              ]
          }
      });
  }
});

// ============================================================
// 4. PROCESSAMENTO (HANDLERS)
// ============================================================

// Helper Genérico para Salvar no Banco
async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, msg: string, isExtraordinary = false) {
    try {
      const slackUser = body.user.id;
      let requesterId = '';
      try {
          const userInfo = await client.users.info({ user: slackUser });
          const email = userInfo.user?.profile?.email;
          if (email) {
             const user = await prisma.user.findFirst({ where: { email } });
             if (user) requesterId = user.id;
          }
      } catch (err) { console.log('Erro ao buscar user info slack:', err); }

      if (!requesterId) {
         const fallback = await prisma.user.findFirst();
         if (fallback) requesterId = fallback.id;
      }

      if (!requesterId) throw new Error("Usuário não identificado.");

      // Lógica de Status: Se for extraordinário ou mudança de acesso, pode exigir SI
      let status = 'PENDENTE_GESTOR';
      let role = 'MANAGER';
      
      if (isExtraordinary) {
          status = 'PENDENTE_SI';
          role = 'SI_ANALYST';
      }

      await prisma.request.create({
          data: {
              requesterId,
              type: dbType,
              details: JSON.stringify(details),
              justification: reason || 'Via Slack',
              status: status,
              currentApproverRole: role,
              isExtraordinary: isExtraordinary
          }
      });
      
      await client.chat.postMessage({ channel: body.user.id, text: msg });

    } catch (e) { 
        console.error('❌ Erro ao salvar solicitação:', e); 
        await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro interno. Avise a TI." });
    }
}

// Handler: Promoção (CHANGE_ROLE)
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

// Handler: Contratação (HIRING)
slackApp.view('submit_hire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const startDate = v.blk_date.picker.selected_date; 
  
  const details = {
      info: `Contratação - ${name}`,
      startDate: startDate, 
      future: { role: v.blk_role.inp.value, dept: v.blk_dept.inp.value },
      obs: v.blk_obs.inp.value || ''
  };

  const dateFmt = startDate ? startDate.split('-').reverse().join('/') : 'A definir';
  await saveRequest(body, client, 'HIRING', details, `Início: ${dateFmt}`, `📅 Agendado: Onboarding de *${name}* para *${dateFmt}*.`);
});

// Handler: Demissão (FIRING)
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

// Handler: Substituição de Ferramenta
slackApp.view('submit_tool_replace', async ({ ack, body, view, client }) => {
    await ack();
    const v = view.state.values;
    const oldTool = v.blk_old.inp.value;
    const newTool = v.blk_new.inp.value;
    
    const details = {
        info: `Substituição: ${oldTool} ➡️ ${newTool}`,
        oldTool: oldTool,
        newTool: newTool,
        owner: v.blk_owner.inp.value,
        subOwner: v.blk_sub.inp.value || 'N/A'
    };
    await saveRequest(body, client, 'TOOL_REPLACEMENT', details, v.blk_reason.inp.value!, `✅ Solicitação de troca de sistema (${newTool}) registrada.`);
});

// Handler: Alterar Acesso
slackApp.view('submit_tool_access', async ({ ack, body, view, client }) => {
    await ack();
    const v = view.state.values;
    const tool = v.blk_tool.inp.value;
    
    const details = {
        info: `Alterar Acesso: ${tool}`,
        toolName: tool,
        currentAccess: v.blk_curr.inp.value,
        targetAccess: v.blk_target.inp.value
    };
    await saveRequest(body, client, 'ACCESS_CHANGE', details, v.blk_reason.inp.value!, `✅ Pedido de alteração de acesso em *${tool}* enviado.`);
});

// Handler: Acesso Extraordinário
slackApp.view('submit_tool_extra', async ({ ack, body, view, client }) => {
    await ack();
    const v = view.state.values;
    const tool = v.blk_tool.inp.value;
    const collab = v.blk_collab.inp.value;
    
    const details = {
        info: `🔥 Extraordinário: ${tool} (${collab})`,
        beneficiary: collab,
        toolName: tool,
        currentAccess: v.blk_curr.inp.value,
        targetAccess: v.blk_target.inp.value
    };

    // Flag isExtraordinary = true
    await saveRequest(body, client, 'ACCESS_TOOL', details, v.blk_reason.inp.value!, `🔥 Solicitação de acesso extraordinário enviada para SI.`, true);
});

export const startSlackBot = async () => { 
    try {
        await slackApp.start(); 
        console.log('🤖 Theris Bot está online'); 
    } catch (e) {
        console.error('❌ Falha ao iniciar Slack Bot:', e);
    }
};