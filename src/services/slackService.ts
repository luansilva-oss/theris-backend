import { App, LogLevel } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN, 
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.ERROR, 
});

// ============================================================
// 1. MENU PRINCIPAL (/theris) - COM LINKS DIRETOS
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
          { type: 'section', text: { type: 'mrkdwn', text: '*Painel de Governança*\nSelecione a categoria de serviço:' } },
          
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
              { type: 'button', text: { type: 'plain_text', text: '🎚️ Alterar Nível de Acesso' }, action_id: 'btn_tool_access' },
              { type: 'button', text: { type: 'plain_text', text: '🔥 Acesso Extraordinário' }, action_id: 'btn_tool_extra', style: 'danger' }
            ]
          },

          // BLOCO 3: DEMANDAS GERAIS (LINKS DIRETOS AGORA)
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '📋 *Demandas Gerais / Projetos (ClickUp)*' } },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '🚀 Novo Software' },
                url: 'https://forms.clickup.com/31083618/f/xmk32-93933/ON71J584JHXR9PHOA5',
                action_id: 'link_new_sw'
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '🏢 Fornecedores' },
                url: 'https://forms.clickup.com/31083618/f/xmk32-105593/HW469QNPJSNO576GI1',
                action_id: 'link_vendor'
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '🛡️ Security' },
                url: 'https://forms.clickup.com/31083618/f/xmk32-98933/6JUAFYHDOBRYD28W7S',
                action_id: 'link_security'
              }
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

// A. PROMOÇÃO
slackApp.action('btn_move', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_move', title: { type: 'plain_text', text: 'Movimentação' }, submit: { type: 'plain_text', text: 'Enviar' },
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
  } catch (e) { console.error(e); }
});

// B. CONTRATAÇÃO
slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_hire', title: { type: 'plain_text', text: 'Nova Contratação' }, submit: { type: 'plain_text', text: 'Agendar' },
        blocks: [
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Novo Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_date', label: { type: 'plain_text', text: 'Data de Início' }, element: { type: 'datepicker', action_id: 'picker', placeholder: { type: 'plain_text', text: 'Selecione a data' } } },
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: '*Dados da Vaga*' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_obs', optional: true, label: { type: 'plain_text', text: 'Observações' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// C. DEMISSÃO
slackApp.action('btn_fire', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_fire', title: { type: 'plain_text', text: 'Desligamento' }, submit: { type: 'plain_text', text: 'Confirmar' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '⚠️ *Esta ação iniciará o bloqueio de acessos.*' } },
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome do Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', optional: true, label: { type: 'plain_text', text: 'Motivo (Opcional)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// LINKS EXTERNOS (AÇÕES MUDAS - APENAS LOG)
// O Slack trata o clique em botões com URL nativamente, mas precisamos registrar a action_id para não dar erro
slackApp.action('link_new_sw', async ({ ack }) => { await ack(); });
slackApp.action('link_vendor', async ({ ack }) => { await ack(); });
slackApp.action('link_security', async ({ ack }) => { await ack(); });


// ============================================================
// 3. GESTÃO DE ACESSOS (FERRAMENTAS)
// ============================================================

// E. ALTERAR NÍVEL DE ACESSO
slackApp.action('btn_tool_access', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_tool_access', title: { type: 'plain_text', text: 'Alterar Acesso' }, submit: { type: 'plain_text', text: 'Solicitar' },
        blocks: [
          { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'Nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_curr', label: { type: 'plain_text', text: 'Nível de Acesso Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Nível de Acesso Desejado' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: '🔒 *Auditado por SI e Owner.*' }] }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// F. ACESSO EXTRAORDINÁRIO
slackApp.action('btn_tool_extra', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.push({
      trigger_id: (body as any).trigger_id,
      view: {
        type: 'modal', callback_id: 'submit_tool_extra', title: { type: 'plain_text', text: 'Acesso Extra' }, submit: { type: 'plain_text', text: 'Solicitar' },
        blocks: [
          { type: 'input', block_id: 'blk_collab', label: { type: 'plain_text', text: 'Nome do Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'Nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_curr', label: { type: 'plain_text', text: 'Nível de Acesso Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Nível de Acesso Desejado' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa (Compliance)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: '🔥 *Atenção: Acessos temporários.*' }] }
        ]
      }
    });
  } catch (e) { console.error(e); }
});

// ============================================================
// 4. PROCESSAMENTO (HANDLERS)
// ============================================================

async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, msg: string, isExtraordinary = false) {
    try {
      const slackUser = body.user.id;
      let requesterId = '';
      try {
          const u = await client.users.info({ user: slackUser });
          if (u.user?.profile?.email) {
             const userDb = await prisma.user.findFirst({ where: { email: u.user.profile.email } });
             if (userDb) requesterId = userDb.id;
          }
      } catch (err) {}

      if (!requesterId) { const f = await prisma.user.findFirst(); if(f) requesterId = f.id; }
      if (!requesterId) throw new Error("User not found");

      let status = isExtraordinary ? 'PENDENTE_SI' : 'PENDENTE_GESTOR';
      let role = isExtraordinary ? 'SI_ANALYST' : 'MANAGER';

      await prisma.request.create({
          data: {
              requesterId,
              type: dbType,
              details: JSON.stringify(details),
              justification: reason || 'Via Slack',
              status,
              currentApproverRole: role,
              isExtraordinary
          }
      });
      await client.chat.postMessage({ channel: body.user.id, text: msg });
    } catch (e) { 
        console.error('❌ Erro Save:', e); 
        await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro ao salvar." });
    }
}

// HANDLERS DE SUBMISSÃO
slackApp.view('submit_move', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const details = {
      info: `Remanejamento - ${name}`,
      current: { role: v.blk_role_curr.inp.value, dept: v.blk_dept_curr.inp.value },
      future: { role: v.blk_role_fut.inp.value, dept: v.blk_dept_fut.inp.value }
  };
  await saveRequest(body, client, 'CHANGE_ROLE', details, v.blk_reason.inp.value!, `✅ Mudança de *${name}* iniciada.`);
});

slackApp.view('submit_hire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const startDate = v.blk_date.picker.selected_date; 
  const details = {
      info: `Contratação - ${name}`,
      startDate,
      future: { role: v.blk_role.inp.value, dept: v.blk_dept.inp.value },
      obs: v.blk_obs.inp.value || ''
  };
  const d = startDate ? startDate.split('-').reverse().join('/') : '?';
  await saveRequest(body, client, 'HIRING', details, `Início: ${d}`, `📅 Onboarding de *${name}* agendado para *${d}*.`);
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
    await saveRequest(body, client, 'ACCESS_CHANGE', details, v.blk_reason.inp.value!, `✅ Alteração de acesso em *${tool}* enviada.`);
});

slackApp.view('submit_tool_extra', async ({ ack, body, view, client }) => {
    await ack();
    const v = view.state.values;
    const tool = v.blk_tool.inp.value;
    const details = {
        info: `🔥 Extraordinário: ${tool} (${v.blk_collab.inp.value})`,
        beneficiary: v.blk_collab.inp.value,
        toolName: tool,
        currentAccess: v.blk_curr.inp.value,
        targetAccess: v.blk_target.inp.value
    };
    await saveRequest(body, client, 'ACCESS_TOOL', details, v.blk_reason.inp.value!, `🔥 Acesso extraordinário enviado para SI.`, true);
});

export const startSlackBot = async () => { 
    try { await slackApp.start(); console.log('🤖 Theris Bot está online'); } 
    catch (e) { console.error('❌ Falha ao iniciar Bot:', e); }
};