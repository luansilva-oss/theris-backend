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

// Dicionário de Ferramentas e Níveis (para selects dinâmicos do /acessos)
const TOOLS_AND_LEVELS: Record<string, { label: string; value: string }[]> = {
  'Figma': [
    { label: 'Full (FA - 1)', value: 'FA-1' },
    { label: 'Dev (FA - 2)', value: 'FA-2' },
    { label: 'Collab (FA - 3)', value: 'FA-3' },
    { label: 'View (FA - 4)', value: 'FA-4' }
  ],
  'Evolux': [
    { label: 'Developer Group (AE - 1)', value: 'AE-1' },
    { label: 'Tenant Support (AE - 2)', value: 'AE-2' },
    { label: 'Support Group (AE - 3)', value: 'AE-3' }
  ],
  '3C PLUS': [
    { label: 'Nível 3 (CP - 1)', value: 'CP-1' },
    { label: 'Nível 2 (CP - 2)', value: 'CP-2' }
  ],
  'ClickUp': [
    { label: 'Administradores (CK - 1)', value: 'CK-1' },
    { label: 'Membros (CK - 2)', value: 'CK-2' }
  ],
  'JumpCloud': [
    { label: 'Administradores (JC - 1)', value: 'JC-1' },
    { label: 'Manager (JC - 2)', value: 'JC-2' }
  ],
  'Next Router': [
    { label: 'Administradores (NR - 1)', value: 'NR-1' },
    { label: 'Equipe Telecom (NR - 2)', value: 'NR-2' }
  ],
  /** Alias para match no Catálogo (nome da ferramenta pode ser "NextRouter" ou "NextRouter (NR)") */
  'NextRouter': [
    { label: 'Administradores (NR - 1)', value: 'NR-1' },
    { label: 'Equipe Telecom (NR - 2)', value: 'NR-2' }
  ],
  'Click Sign': [
    { label: 'Administradores (CS - 1)', value: 'CS-1' },
    { label: 'Membro (CS - 2)', value: 'CS-2' }
  ],
  'Next Suit (Oracle)': [
    { label: 'Administradores (OR - 1)', value: 'OR-1' },
    { label: 'Analista Fiscal / Comprador / Controller (OR - 2)', value: 'OR-2' },
    { label: 'Comprador (OR - 3)', value: 'OR-3' },
    { label: 'Executivo (OR - 4)', value: 'OR-4' },
    { label: 'Suporte (OR - 5)', value: 'OR-5' }
  ],
  'Hik-Connect': [{ label: 'Administradores (HC - 1)', value: 'HC-1' }],
  'Dizify': [{ label: 'Administradores (DZ - 1)', value: 'DZ-1' }],
  'Vindi': [
    { label: 'Administradores (VI - 1)', value: 'VI-1' },
    { label: 'Gestor (VI - 2)', value: 'VI-2' },
    { label: 'Observador (VI - 3)', value: 'VI-3' }
  ],
  'N8N': [
    { label: 'Owner (NA - 1)', value: 'NA-1' },
    { label: 'Membro (NA - 2)', value: 'NA-2' }
  ],
  'Chat GPT': [
    { label: 'Proprietário (CG - 1)', value: 'CG-1' },
    { label: 'Membro (CG - 2)', value: 'CG-2' }
  ],
  'FiqOn': [{ label: 'Administrador (FO - 1)', value: 'FO-1' }],
  'Focus': [{ label: 'Administrador (FU - 1)', value: 'FU-1' }],
  'GCP': [
    { label: 'Admin / BigQuery Admin / Data Owner (GC - 2)', value: 'GC-2' },
    { label: 'Owner (GC - 1)', value: 'GC-1' },
    { label: 'Editor / Viewer / Usuário (GC - 3)', value: 'GC-3' }
  ],
  'AWS': [
    { label: 'Admin (AS - 1)', value: 'AS-1' },
    { label: 'SysAdmin (AS - 2)', value: 'AS-2' }
  ],
  'Convenia': [
    { label: 'Owner (ap_CV-1)', value: 'CV-1' },
    { label: 'Pessoas e Cultura (CV - 2)', value: 'CV-2' }
  ],
  'HubSpot': [
    { label: 'Administradores (HS - 1)', value: 'HS-1' },
    { label: 'Líder comercial (HS - 2)', value: 'HS-2' },
    { label: 'Closer / Analista (HS - 3)', value: 'HS-3' },
    { label: 'Atendimento ao cliente (HS - 4)', value: 'HS-4' },
    { label: 'Service / Sales (HS - 5)', value: 'HS-5' }
  ],
  'META': [
    { label: 'Business manager (MT - 1)', value: 'MT-1' },
    { label: 'Acesso Parcial - Básico (MT - 2)', value: 'MT-2' },
    { label: 'Acesso Parcial - Básico, Apps e Integrações (MT - 3)', value: 'MT-3' },
    { label: 'Convidado (MT - 4)', value: 'MT-4' }
  ],
  'Gitlab': [
    { label: 'Administradores (GL - 1)', value: 'GL-1' },
    { label: 'Regular (GL - 2)', value: 'GL-2' }
  ],
  // Aliases para match com nomes do Catálogo (ex: "Clicsign (CS)" → Clicsign; "Next Suit (NS)" → Next Suit)
  'Clicsign': [
    { label: 'Administradores (CS - 1)', value: 'CS-1' },
    { label: 'Membro (CS - 2)', value: 'CS-2' }
  ],
  '3C Plus': [
    { label: 'Nível 3 (CP - 1)', value: 'CP-1' },
    { label: 'Nível 2 (CP - 2)', value: 'CP-2' }
  ],
  'Next Suit': [
    { label: 'Administradores (OR - 1)', value: 'OR-1' },
    { label: 'Analista Fiscal / Comprador / Controller (OR - 2)', value: 'OR-2' },
    { label: 'Comprador (OR - 3)', value: 'OR-3' },
    { label: 'Executivo (OR - 4)', value: 'OR-4' },
    { label: 'Suporte (OR - 5)', value: 'OR-5' }
  ],
  'Hik Connect': [{ label: 'Administradores (HC - 1)', value: 'HC-1' }]
};

const TOOL_KEYS = Object.keys(TOOLS_AND_LEVELS);

/** Lista de ferramentas do Catálogo Theris (fonte única para Acesso Extraordinário no Slack — sem duplicatas). */
async function getCatalogToolsForSlack(): Promise<{ id: string; name: string; availableAccessLevels: string[]; accessLevelDescriptions: Record<string, unknown> | null }[]> {
  const tools = await prisma.tool.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, availableAccessLevels: true, accessLevelDescriptions: true }
  });
  return tools as { id: string; name: string; availableAccessLevels: string[]; accessLevelDescriptions: Record<string, unknown> | null }[];
}

/** Label do nível para exibição (Catálogo: accessLevelDescriptions pode ser string ou { description, icon }). */
function getLevelLabel(level: string, accessLevelDescriptions: Record<string, unknown> | null | undefined): string {
  if (!accessLevelDescriptions) return level;
  const descData = accessLevelDescriptions[level];
  if (typeof descData === 'object' && descData !== null && 'description' in descData)
    return String((descData as { description?: string }).description || level);
  if (typeof descData === 'string') return descData;
  return level;
}

/** Exposto para a API do painel (cascata Ferramenta → Níveis no modal de KBS) */
export const getToolsAndLevelsMap = () => ({ ...TOOLS_AND_LEVELS });

/** Exposto para ticketEventService (notificações DM no Slack) */
export const getSlackApp = () => slackApp;

/** Trata expired_trigger_id (Slack: trigger_id válido por ~3s; em cold start pode expirar) */
function getChannelAndUser(ctx: { channel_id?: string; channel?: { id?: string } | string; user_id?: string; user?: { id?: string } }) {
  const ch = ctx.channel_id ?? (typeof ctx.channel === 'object' ? ctx.channel?.id : ctx.channel);
  const uid = ctx.user_id ?? (typeof ctx.user === 'object' ? (ctx.user as any)?.id : ctx.user);
  return { ch, uid };
}
async function openModalSafely(
  client: any,
  triggerId: string,
  view: any,
  ctx: { channel_id?: string; channel?: { id?: string } | string; user_id?: string; user?: { id?: string } } = {}
) {
  try {
    await client.views.open({ trigger_id: triggerId, view });
  } catch (error: any) {
    if (error?.data?.error === 'expired_trigger_id') {
      const { ch, uid } = getChannelAndUser(ctx);
      if (ch && uid) {
        await client.chat.postEphemeral({
          channel: ch,
          user: uid,
          text: '⏱️ A solicitação demorou para processar (trigger expirado). Por favor, execute o comando novamente.'
        }).catch(() => {});
      }
    }
    throw error;
  }
}
async function pushModalSafely(client: any, triggerId: string, view: any, ctx: any) {
  try {
    await client.views.push({ trigger_id: triggerId, view });
  } catch (error: any) {
    if (error?.data?.error === 'expired_trigger_id') {
      const { ch, uid } = getChannelAndUser(ctx);
      if (ch && uid) {
        await client.chat.postEphemeral({
          channel: ch,
          user: uid,
          text: '⏱️ A solicitação demorou para processar (trigger expirado). Por favor, tente novamente.'
        }).catch(() => {});
      }
    }
    throw error;
  }
}

// ============================================================
// COMANDO /pessoas — Abre diretamente Gestão de Pessoas
// ============================================================
slackApp.command('/pessoas', async ({ ack, body, client }) => {
  await ack();
  try {
    await openModalSafely(client, body.trigger_id, {
      type: 'modal',
      callback_id: 'theris_pessoas_modal',
      title: { type: 'plain_text', text: 'Gestão de Pessoas' },
      blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '👤 *Gestão de Pessoas*\nO que você precisa?' } },
          { type: 'divider' },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🔄 Promoção / Mudança' }, action_id: 'btn_move', style: 'primary' },
              { type: 'button', text: { type: 'plain_text', text: '✅ Contratação' }, action_id: 'btn_hire' },
              { type: 'button', text: { type: 'plain_text', text: '❌ Desligamento' }, action_id: 'btn_fire', style: 'danger' }
            ]
          }
        ]
    }, body);
  } catch (error) {
    console.error('❌ Erro /pessoas:', error);
  }
});

// ============================================================
// COMANDO /links — Links Rápidos de SI
// ============================================================
slackApp.command('/links', async ({ ack, body, client }) => {
  await ack();
  try {
    await openModalSafely(client, body.trigger_id, {
      type: 'modal',
      callback_id: 'theris_links_modal',
      title: { type: 'plain_text', text: 'Links Rápidos de SI' },
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: '📋 *Links Rápidos de Segurança da Informação*' } },
        { type: 'divider' },
        {
          type: 'actions',
          elements: [
            { type: 'button', text: { type: 'plain_text', text: '🚀 Novo Software' }, url: 'https://forms.clickup.com/31083618/f/xmk32-93933/ON71J584JHXR9PHOA5', action_id: 'link_new_sw' },
            { type: 'button', text: { type: 'plain_text', text: '🏢 Fornecedores' }, url: 'https://forms.clickup.com/31083618/f/xmk32-105593/HW469QNPJSNO576GI1', action_id: 'link_vendor' },
            { type: 'button', text: { type: 'plain_text', text: '🛡️ Security' }, url: 'https://forms.clickup.com/31083618/f/xmk32-98933/6JUAFYHDOBRYD28W7S', action_id: 'link_security' }
          ]
        }
      ]
    }, body);
  } catch (error) {
    console.error('❌ Erro /links:', error);
  }
});

// ============================================================
// COMANDO /duvidas — Mensagem ephemeral com guia rápido
// ============================================================
slackApp.command('/duvidas', async ({ ack, body, client }) => {
  await ack();
  const text = 'Olá! Aqui está o guia rápido do Theris:\n\n👉 /pessoas: Para solicitações referentes ao time e gestão de pessoas.\n\n👉 /acessos: Para pedir um novo nível de acesso, extraordinário, indicar substituto ou cadastrar nova ferramenta.\n\n👉 /links: Atalhos e links úteis da Segurança da Informação.\n\nQualquer dúvida extra, chame o time de SI!';
  try {
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      text
    });
  } catch (error) {
    console.error('❌ Erro /duvidas:', error);
  }
});

// ============================================================
// COMANDO /acessos — Modal Gestão de Ferramentas/Acessos (com block actions)
// ============================================================
function buildAcessosInitialBlocks() {
  return [
    {
      type: 'input' as const,
      block_id: 'blk_acao',
      label: { type: 'plain_text' as const, text: 'Ação Principal' },
      dispatch_action: true,
      element: {
        type: 'static_select' as const,
        action_id: 'acessos_action_type',
        placeholder: { type: 'plain_text' as const, text: 'Selecione...' },
        options: [
          { text: { type: 'plain_text' as const, text: 'Acesso Extraordinário' }, value: 'acesso_extraordinario' },
          { text: { type: 'plain_text' as const, text: 'Indicar Deputy' }, value: 'indicar_deputy' }
        ]
      }
    }
  ];
}

slackApp.command('/acessos', async ({ ack, body, client }) => {
  await ack();
  try {
    const viewPayload = {
      type: 'modal' as const,
      callback_id: 'acessos_main_modal',
      title: { type: 'plain_text' as const, text: 'Gestão de Acessos' },
      submit: { type: 'plain_text' as const, text: 'Continuar' },
      close: { type: 'plain_text' as const, text: 'Cancelar' },
      private_metadata: JSON.stringify({ actionType: '' }),
      blocks: buildAcessosInitialBlocks()
    };
    await openModalSafely(client, body.trigger_id, viewPayload, body);
  } catch (error: any) {
    const err = error?.data ?? error?.response?.data ?? error;
    console.error('❌ Erro /acessos (views.open):', typeof err === 'object' ? JSON.stringify(err, null, 2) : err);
    if (error?.message) console.error('❌ Mensagem:', error.message);
    if (error?.stack) console.error('❌ Stack:', error.stack);
  }
});

// ============================================================
slackApp.command('/theris', async ({ ack, body, client }) => {
  // ACK IMEDIATO: O Slack exige resposta em <3s
  await ack();

  try {
    await openModalSafely(client, body.trigger_id, {
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
    }, body);
  } catch (error) {
    console.error('❌ Erro Menu Principal:', error);
  }
});

// ============================================================
// 1.1 COMANDO /infra (NOVO)
// ============================================================
slackApp.command('/infra', async ({ ack, body, client }) => {
  await ack();
  try {
    await openModalSafely(client, body.trigger_id, {
        type: 'modal',
        callback_id: 'submit_infra',
        title: { type: 'plain_text', text: 'Suporte de Infra' },
        submit: { type: 'plain_text', text: 'Enviar Pedido' },
        close: { type: 'plain_text', text: 'Cancelar' },
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '🚀 *Solicitação de Hardware ou Suporte de TI*\nDescreva o que você precisa abaixo.' }
          },
          { type: 'divider' },
          {
            type: 'input',
            block_id: 'blk_infra_type',
            label: { type: 'plain_text', text: 'Tipo de Solicitação' },
            element: {
              type: 'static_select',
              action_id: 'inp',
              placeholder: { type: 'plain_text', text: 'Selecione...' },
              options: [
                { text: { type: 'plain_text', text: '💻 Hardware (Monitor, Teclado, Mouse, etc)' }, value: 'HARDWARE' },
                { text: { type: 'plain_text', text: '🛠️ Problema no PC (Lento, Travando, Bug)' }, value: 'SOFTWARE_PROBLEM' },
                { text: { type: 'plain_text', text: '🌐 Internet / Rede / VPN' }, value: 'NETWORK' },
                { text: { type: 'plain_text', text: '❓ Outros Suportes' }, value: 'OTHER' }
              ]
            }
          },
          {
            type: 'input',
            block_id: 'blk_infra_desc',
            label: { type: 'plain_text', text: 'Descrição Detalhada' },
            element: {
              type: 'plain_text_input',
              multiline: true,
              action_id: 'inp',
              placeholder: { type: 'plain_text', text: 'Ex: Meu mouse parou de funcionar / Preciso de um segundo monitor.' }
            }
          },
          {
            type: 'input',
            block_id: 'blk_infra_urgency',
            label: { type: 'plain_text', text: 'Urgência' },
            element: {
              type: 'static_select',
              action_id: 'inp',
              placeholder: { type: 'plain_text', text: 'Selecione...' },
              options: [
                { text: { type: 'plain_text', text: '🟢 Baixa (Não impede o trabalho)' }, value: 'LOW' },
                { text: { type: 'plain_text', text: '🟡 Média (Incomoda mas consigo trabalhar)' }, value: 'MEDIUM' },
                { text: { type: 'plain_text', text: '🟠 Alta (Prejudica muito a produtividade)' }, value: 'HIGH' },
                { text: { type: 'plain_text', text: '🔴 Crítica (Estou parado/Não consigo trabalhar)' }, value: 'CRITICAL' }
              ]
            }
          }
        ]
    }, body);
  } catch (error) {
    console.error('❌ Erro /infra:', error);
  }
});

// ============================================================
// 2. MODAIS (ABERTURA)
// ============================================================

// PROMOÇÃO
slackApp.action('btn_move', async ({ ack, body, client }) => {
  await ack();
  try {
    await pushModalSafely(client, (body as any).trigger_id, {
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
          { type: 'input', block_id: 'data_acao', optional: true, label: { type: 'plain_text', text: 'Data de Ação' }, element: { type: 'datepicker', action_id: 'picker', placeholder: { type: 'plain_text', text: 'Selecione a data' } } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Motivo' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
    }, body);
  } catch (e) { console.error(e); }
});

// Unidades padrão quando o banco não retornar nenhuma (Contratação)
const DEFAULT_UNIT_NAMES = ['3C+', 'Evolux', 'Dizify', 'Instituto 3C', 'FiqOn', 'Dizparos'];

// CONTRATAÇÃO
slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack();
  try {
    let unitOptions: { text: { type: 'plain_text'; text: string }; value: string }[];
    try {
      const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
      unitOptions = units.length > 0
        ? units.map((u) => ({ text: { type: 'plain_text' as const, text: u.name }, value: u.name }))
        : DEFAULT_UNIT_NAMES.map((name) => ({ text: { type: 'plain_text' as const, text: name }, value: name }));
    } catch {
      unitOptions = DEFAULT_UNIT_NAMES.map((name) => ({ text: { type: 'plain_text' as const, text: name }, value: name }));
    }
    await pushModalSafely(client, (body as any).trigger_id, {
        type: 'modal', callback_id: 'submit_hire', title: { type: 'plain_text', text: 'Contratação' }, submit: { type: 'plain_text', text: 'Agendar' },
        blocks: [
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Nome Completo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_date', label: { type: 'plain_text', text: 'Data de Início' }, element: { type: 'datepicker', action_id: 'picker' } },
          {
            type: 'input',
            block_id: 'blk_unit',
            label: { type: 'plain_text', text: 'Unidade' },
            element: {
              type: 'static_select',
              action_id: 'unit_select',
              placeholder: { type: 'plain_text', text: 'Selecione a unidade...' },
              options: unitOptions
            }
          },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_obs', optional: true, label: { type: 'plain_text', text: 'Obs (Equipamentos, etc)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
    }, body);
  } catch (e) { console.error(e); }
});

// DESLIGAMENTO
slackApp.action('btn_fire', async ({ ack, body, client }) => {
  await ack();
  try {
    await pushModalSafely(client, (body as any).trigger_id, {
        type: 'modal', callback_id: 'submit_fire', title: { type: 'plain_text', text: 'Desligamento' }, submit: { type: 'plain_text', text: 'Confirmar' },
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '⚠️ *Inicia o bloqueio imediato de acessos.*' } },
          { type: 'input', block_id: 'blk_name', label: { type: 'plain_text', text: 'Colaborador' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_role', label: { type: 'plain_text', text: 'Cargo' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_dept', label: { type: 'plain_text', text: 'Departamento' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'data_acao', optional: true, label: { type: 'plain_text', text: 'Data de Ação' }, element: { type: 'datepicker', action_id: 'picker', placeholder: { type: 'plain_text', text: 'Selecione a data' } } },
          { type: 'input', block_id: 'blk_reason', optional: true, label: { type: 'plain_text', text: 'Motivo' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
    }, body);
  } catch (e) { console.error(e); }
});

// ACESSOS
slackApp.action('btn_tool_access', async ({ ack, body, client }) => {
  await ack();
  try {
    await pushModalSafely(client, (body as any).trigger_id, {
        type: 'modal', callback_id: 'submit_tool_access', title: { type: 'plain_text', text: 'Acesso para ferramentas' }, submit: { type: 'plain_text', text: 'Solicitar' },
        blocks: [
          { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'nome da Ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_curr', label: { type: 'plain_text', text: 'Nível Atual' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Nível Desejado' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
    }, body);
  } catch (e) { console.error(e); }
});

slackApp.action('btn_tool_extra', async ({ ack, body, client }) => {
  await ack();
  try {
    await pushModalSafely(client, (body as any).trigger_id, {
        type: 'modal', callback_id: 'submit_tool_extra', title: { type: 'plain_text', text: 'Acesso Extra' }, submit: { type: 'plain_text', text: 'Solicitar' },
        blocks: [
          { type: 'input', block_id: 'blk_collab', label: { type: 'plain_text', text: 'Quem receberá o acesso?' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_tool', label: { type: 'plain_text', text: 'Nome da ferramenta' }, element: { type: 'plain_text_input', action_id: 'inp' } },
          { type: 'input', block_id: 'blk_target', label: { type: 'plain_text', text: 'Permissão Necessária (nível de acesso)' }, element: { type: 'plain_text_input', action_id: 'inp' } },

          // Campos de Duração
          { type: 'input', block_id: 'blk_duration_val', label: { type: 'plain_text', text: 'Duração (Quantidade)' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: 'plain_text', text: 'Ex: 48' } } },
          {
            type: 'input',
            block_id: 'blk_duration_wrap',
            label: { type: 'plain_text', text: 'Unidade de Tempo' },
            element: {
              type: 'static_select',
              action_id: 'unit_select',
              placeholder: { type: 'plain_text', text: 'Selecione...' },
              options: [
                { text: { type: 'plain_text', text: 'Horas' }, value: 'horas' },
                { text: { type: 'plain_text', text: 'Dias' }, value: 'dias' },
                { text: { type: 'plain_text', text: 'Meses' }, value: 'meses' }
              ]
            }
          },

          { type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa (Compliance)' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } }
        ]
    }, body);
  } catch (e) { console.error(e); }
});

// INDICAR DEPUTY (NOVO)
slackApp.action('btn_deputy', async ({ ack, body, client }) => {
  await ack();
  try {
    await pushModalSafely(client, (body as any).trigger_id, {
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
    }, body);
  } catch (e) { console.error(e); }
});

// Ações de Link (Apenas Ack para não dar erro)
slackApp.action('link_new_sw', async ({ ack }) => await ack());
slackApp.action('link_vendor', async ({ ack }) => await ack());
slackApp.action('link_security', async ({ ack }) => await ack());

// ============================================================
// BLOCK ACTIONS DO MODAL /acessos — atualizam a view
// ============================================================

slackApp.action('acessos_action_type', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const view = b.view;
  const selected = (b.actions?.[0]?.selected_option?.value ?? '') as string;
  if (!view?.id || !selected) return;

  const actionType = selected;
  const metadata = { actionType };
  const actionLabels: Record<string, string> = { acesso_extraordinario: 'Acesso Extraordinário', indicar_deputy: 'Indicar Deputy' };

  let toolOptions: { text: { type: 'plain_text'; text: string }; value: string }[];
  if (actionType === 'indicar_deputy') {
    let ownedTools: { name: string }[] = [];
    try {
      const slackUserId = b.user?.id;
      if (slackUserId) {
        const info = await client.users.info({ user: slackUserId });
        const email = info.user?.profile?.email;
        if (email) {
          const userDb = await prisma.user.findUnique({
            where: { email },
            select: { toolsOwned: { select: { name: true } } }
          });
          ownedTools = userDb?.toolsOwned ?? [];
        }
      }
    } catch (err) {
      console.error('Erro ao buscar ferramentas do Owner (indicar_deputy):', err);
    }
    toolOptions = ownedTools.map((t) => ({ text: { type: 'plain_text' as const, text: t.name }, value: t.name }));
  } else {
    const catalogTools = await getCatalogToolsForSlack();
    toolOptions = catalogTools.map((t) => ({ text: { type: 'plain_text' as const, text: t.name }, value: t.id }));
  }

  const blocks: any[] = [
    {
      type: 'input',
      block_id: 'blk_acao',
      label: { type: 'plain_text', text: 'Ação Principal' },
      dispatch_action: true,
      element: {
        type: 'static_select',
        action_id: 'acessos_action_type',
        placeholder: { type: 'plain_text', text: 'Selecione...' },
        initial_option: { text: { type: 'plain_text', text: actionLabels[actionType] || actionType }, value: actionType },
        options: [
          { text: { type: 'plain_text', text: 'Acesso Extraordinário' }, value: 'acesso_extraordinario' },
          { text: { type: 'plain_text', text: 'Indicar Deputy' }, value: 'indicar_deputy' }
        ]
      }
    }
  ];

  if (actionType === 'indicar_deputy' && toolOptions.length === 0) {
    blocks.push({
      type: 'section',
      block_id: 'blk_deputy_no_owner',
      text: { type: 'mrkdwn', text: '⚠️ Você não é proprietário de nenhuma ferramenta no momento. Apenas Owners podem indicar um Deputy.' }
    });
  } else {
    blocks.push({
      type: 'input',
      block_id: 'blk_tool',
      label: { type: 'plain_text', text: 'Ferramenta' },
      dispatch_action: true,
      element: {
        type: 'static_select',
        action_id: 'acessos_tool_select',
        placeholder: { type: 'plain_text', text: 'Selecione a ferramenta...' },
        options: toolOptions
      }
    });
  }

  blocks.push({ type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } });

  try {
    await client.views.update({
      view_id: view.id,
      hash: view.hash,
      view: {
        type: 'modal',
        callback_id: 'acessos_main_modal',
        title: { type: 'plain_text', text: 'Gestão de Acessos' },
        submit: { type: 'plain_text', text: 'Enviar' },
        close: { type: 'plain_text', text: 'Cancelar' },
        private_metadata: JSON.stringify(metadata),
        blocks
      }
    });
  } catch (e) {
    console.error('❌ Erro ao atualizar modal acessos (action_type):', e);
  }
});

function normalizeToolName(s: string): string {
  return (s || '').trim().toLowerCase();
}

/** Níveis estáticos (fallback quando availableAccessLevels está vazio no catálogo). */
function getLevelOptionsFromStaticMap(toolName: string): { text: { type: 'plain_text'; text: string }; value: string }[] {
  const map = TOOLS_AND_LEVELS;
  const normalized = normalizeToolName(toolName);
  // 1) Match exato
  const exact = map[toolName?.trim() ?? ''];
  if (exact?.length) return exact.map((item) => ({ text: { type: 'plain_text' as const, text: item.label }, value: item.value }));
  // 2) Match normalizado (ex: "3C Plus" vs "3C PLUS")
  for (const key of TOOL_KEYS) {
    if (normalizeToolName(key) === normalized) {
      const items = map[key];
      if (items?.length) return items.map((item) => ({ text: { type: 'plain_text' as const, text: item.label }, value: item.value }));
      break;
    }
  }
  return [];
}

slackApp.action('acessos_tool_select', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const view = b.view;
  const selectedToolRaw = b.actions?.[0]?.selected_option?.value;
  const selectedToolId = typeof selectedToolRaw === 'string' ? selectedToolRaw.trim() : '';
  if (!view?.id || !selectedToolId) return;

  let actionType = 'acesso_extraordinario';
  try {
    const parsed = JSON.parse((view.private_metadata as string) || '{}');
    actionType = parsed.actionType || actionType;
  } catch (_) {}

  let toolOptions: { text: { type: 'plain_text'; text: string }; value: string }[];
  let selectedToolName = '';
  if (actionType === 'indicar_deputy') {
    let ownedTools: { name: string }[] = [];
    try {
      const slackUserId = b.user?.id;
      if (slackUserId) {
        const info = await client.users.info({ user: slackUserId });
        const email = info.user?.profile?.email;
        if (email) {
          const userDb = await prisma.user.findUnique({
            where: { email },
            select: { toolsOwned: { select: { name: true } } }
          });
          ownedTools = userDb?.toolsOwned ?? [];
        }
      }
    } catch (err) {
      console.error('Erro ao buscar ferramentas do Owner (tool_select deputy):', err);
    }
    toolOptions = ownedTools.length > 0
      ? ownedTools.map((t) => ({ text: { type: 'plain_text' as const, text: t.name }, value: t.name }))
      : [{ text: { type: 'plain_text' as const, text: selectedToolId }, value: selectedToolId }];
    selectedToolName = selectedToolId;
  } else {
    const catalogTools = await getCatalogToolsForSlack();
    toolOptions = catalogTools.map((t) => ({ text: { type: 'plain_text' as const, text: t.name }, value: t.id }));
    const selectedTool = catalogTools.find((t) => t.id === selectedToolId);
    selectedToolName = selectedTool?.name ?? selectedToolId;
  }

  const actionLabels: Record<string, string> = { acesso_extraordinario: 'Acesso Extraordinário', indicar_deputy: 'Indicar Deputy' };

  const blocks: any[] = [
    {
      type: 'input',
      block_id: 'blk_acao',
      label: { type: 'plain_text', text: 'Ação Principal' },
      dispatch_action: true,
      element: {
        type: 'static_select',
        action_id: 'acessos_action_type',
        placeholder: { type: 'plain_text', text: 'Selecione...' },
        initial_option: { text: { type: 'plain_text', text: actionLabels[actionType] || actionType }, value: actionType },
        options: [
          { text: { type: 'plain_text', text: 'Acesso Extraordinário' }, value: 'acesso_extraordinario' },
          { text: { type: 'plain_text', text: 'Indicar Deputy' }, value: 'indicar_deputy' }
        ]
      }
    },
    {
      type: 'input',
      block_id: 'blk_tool',
      label: { type: 'plain_text', text: 'Ferramenta' },
      dispatch_action: true,
      element: {
        type: 'static_select',
        action_id: 'acessos_tool_select',
        placeholder: { type: 'plain_text', text: 'Selecione a ferramenta...' },
        initial_option: {
          text: { type: 'plain_text' as const, text: actionType === 'acesso_extraordinario' ? selectedToolName : selectedToolName },
          value: selectedToolId
        },
        options: toolOptions
      }
    }
  ];

  if (actionType === 'acesso_extraordinario') {
    let currentLevelMessage: string;
    const normalizeForMatch = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, '');
    try {
      const slackUserId = b.user?.id;
      const selectedNorm = normalizeForMatch(selectedToolName || '');
      let found = false;
      if (slackUserId) {
        const info = await client.users.info({ user: slackUserId });
        const email = info.user?.profile?.email;
        if (email) {
          const userDb = await prisma.user.findUnique({
            where: { email },
            select: { roleId: true }
          });
          if (userDb?.roleId) {
            const role = await prisma.role.findUnique({
              where: { id: userDb.roleId },
              include: { kitItems: true }
            });
            const kitItem = role?.kitItems?.find(
              (item) => normalizeForMatch(item.toolName || '') === selectedNorm
            );
            if (kitItem) {
              const levelName = (kitItem.accessLevelDesc || kitItem.toolCode || 'KBS').trim();
              currentLevelMessage = `ℹ️ Seu nível atual nesta ferramenta por padrão é: *${levelName}*.`;
              found = true;
            }
          }
        }
      }
      if (!found) currentLevelMessage = '⚠️ Você atualmente não possui acesso padrão a esta ferramenta.';
    } catch (err) {
      console.error('Erro ao buscar nível atual (KBS) no acessos_tool_select:', err);
      currentLevelMessage = '⚠️ Você atualmente não possui acesso padrão a esta ferramenta.';
    }
    blocks.push({
      type: 'section',
      block_id: 'blk_current_level_info',
      text: { type: 'mrkdwn', text: currentLevelMessage }
    });

    const catalogTool = await prisma.tool.findUnique({
      where: { id: selectedToolId },
      select: { availableAccessLevels: true, accessLevelDescriptions: true }
    });
    const levelsArray = catalogTool?.availableAccessLevels ?? [];
    const descMap = (catalogTool?.accessLevelDescriptions as Record<string, unknown>) ?? null;
    let levelOptions = levelsArray.map((code) => ({
      text: { type: 'plain_text' as const, text: getLevelLabel(code, descMap) },
      value: code
    }));
    // Fallback: se o catálogo não tiver níveis, usa mapa estático TOOLS_AND_LEVELS (para solicitação extraordinária)
    if (levelOptions.length === 0 && selectedToolName) {
      levelOptions = getLevelOptionsFromStaticMap(selectedToolName);
    }
    if (levelOptions.length >= 1) {
      blocks.push({
        type: 'input',
        block_id: 'blk_level',
        label: { type: 'plain_text', text: 'Nível de Acesso' },
        element: {
          type: 'static_select',
          action_id: 'acessos_level_select',
          placeholder: { type: 'plain_text', text: 'Selecione o nível...' },
          options: levelOptions
        }
      });
    }
  } else if (actionType === 'indicar_deputy') {
    blocks.push(
      { type: 'input', block_id: 'blk_deputy_name', label: { type: 'plain_text', text: 'Nome do Substituto' }, element: { type: 'plain_text_input', action_id: 'inp' } },
      { type: 'input', block_id: 'blk_deputy_email', label: { type: 'plain_text', text: 'E-mail do Substituto' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: 'plain_text', text: 'email@empresa.com' } } }
    );
  }

  blocks.push({ type: 'input', block_id: 'blk_reason', label: { type: 'plain_text', text: 'Justificativa' }, element: { type: 'plain_text_input', multiline: true, action_id: 'inp' } });

  try {
    await client.views.update({
      view_id: view.id,
      hash: view.hash,
      view: {
        type: 'modal',
        callback_id: 'acessos_main_modal',
        title: { type: 'plain_text', text: 'Gestão de Acessos' },
        submit: { type: 'plain_text', text: 'Enviar' },
        close: { type: 'plain_text', text: 'Cancelar' },
        private_metadata: JSON.stringify({ actionType }),
        blocks
      }
    });
  } catch (e) {
    console.error('❌ Erro ao atualizar modal acessos (tool_select):', e);
  }
});

// ============================================================
// 3. PROCESSAMENTO E BANCO (HANDLERS DE VIEW)
// ============================================================

const PEOPLE_REQUEST_TYPES_SLACK = ['CHANGE_ROLE', 'HIRING', 'FIRING'];
const RH_BYPASS_REQUESTER_NAME = 'Renata Czapiewski Silva';

function isRhBypassRequester(name: string | null | undefined): boolean {
  const n = (name || '').trim();
  return n === RH_BYPASS_REQUESTER_NAME || n.toLowerCase().includes('renata czapiewski');
}

async function saveRequest(body: any, client: any, dbType: string, details: any, reason: string, msgSuccess: string, isExtraordinary = false, actionDate?: string | null) {
  try {
    const slackId = body.user.id;
    let requesterId = '';
    let requesterEmail: string | null = null;

    // Tenta achar o usuário no banco pelo email do Slack
    try {
      const info = await client.users.info({ user: slackId });
      const email = info.user?.profile?.email;
      requesterEmail = email || null;
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

    let status = 'PENDENTE_SI';
    let currentApproverRole: string | null = 'SI_ANALYST';
    let approverId: string | null = null;
    let detailsWithMeta: Record<string, unknown> = {
      ...details,
      slackRequesterId: slackId,
      requesterEmail: requesterEmail ?? undefined,
      source: 'slack'
    };

    // Regra de bypass /pessoas: Renata Czapiewski Silva pula gestor e vai direto para SI
    if (PEOPLE_REQUEST_TYPES_SLACK.includes(dbType)) {
      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        include: { manager: true }
      });
      if (isRhBypassRequester(requester?.name)) {
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
        approverId = null;
        detailsWithMeta = { ...detailsWithMeta, bypassGestor: true };
      } else if (requester?.managerId) {
        status = 'PENDENTE_GESTOR';
        currentApproverRole = 'MANAGER';
        approverId = requester.managerId;
      }
      // se não tem gestor, mantém PENDENTE_SI
    }

    // Inclui Slack ID e e-mail do solicitante nos detalhes (auditoria e exibição no painel)
    detailsWithMeta.slackRequesterId = slackId;
    detailsWithMeta.requesterEmail = requesterEmail ?? undefined;
    detailsWithMeta.source = 'slack';

    // AEX: fluxo Owner primeiro -> status PENDING_OWNER
    if (isExtraordinary && (dbType === 'ACCESS_TOOL_EXTRA' || dbType === 'ACCESS_TOOL' || dbType === 'ACESSO_FERRAMENTA' || dbType === 'EXTRAORDINARIO')) {
      status = 'PENDING_OWNER';
      currentApproverRole = 'TOOL_OWNER';
      approverId = null;
    }

    const toolName = (details as { tool?: string; toolName?: string }).tool || (details as { tool?: string; toolName?: string }).toolName;
    const accessLevel = (details as { target?: string; targetValue?: string }).target || (details as { target?: string; targetValue?: string }).targetValue;

    const created = await prisma.request.create({
      data: {
        requesterId,
        type: dbType,
        details: JSON.stringify(detailsWithMeta),
        justification: reason || 'Via Slack',
        status,
        currentApproverRole,
        approverId,
        isExtraordinary,
        ...(isExtraordinary && toolName && { toolName }),
        ...(isExtraordinary && accessLevel && { accessLevel }),
        ...(actionDate && { actionDate: new Date(actionDate) })
      }
    });

    // AEX: enviar DMs para Owner/Sub e SI
    if (isExtraordinary && toolName) {
      const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } });
      const { sendAexCreationDMs } = await import('./aexOwnerService');
      sendAexCreationDMs(client, created.id, toolName, accessLevel || '—', requester?.name || 'Solicitante', reason).catch(err => console.error('[AEX] Erro ao enviar DMs:', err));
    }

    // Confirma no chat privado do usuário (Ephemeral = apenas ele vê se for em canal público, ou DM)
    // Usamos chat.postMessage simples aqui
    await client.chat.postMessage({ channel: slackId, text: msgSuccess });

  } catch (e) {
    console.error('❌ Erro ao salvar solicitação:', e);
    await client.chat.postMessage({ channel: body.user.id, text: "❌ Erro ao processar solicitação. Seu usuário existe no painel web?" });
  }
}

// ============================================================
// BLOCK ACTIONS: AEX Owner Approve/Reject
// ============================================================
slackApp.action('aex_approve', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const requestId = b.actions?.[0]?.value;
  if (!requestId) return;

  try {
    const req = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: { select: { id: true, name: true, email: true } } }
    });
    if (!req || req.status !== 'PENDING_OWNER') return;

    const ownerSlackId = b.user.id;
    const reqAny = req as { toolName?: string; accessLevel?: string; details?: string };
    const toolName = reqAny.toolName || (() => { try { const d = JSON.parse(req.details || '{}'); return d.tool || d.toolName || '—'; } catch { return '—'; } })();
    const accessLevel = reqAny.accessLevel || (() => { try { const d = JSON.parse(req.details || '{}'); return d.target || d.targetValue || '—'; } catch { return '—'; } })();

    await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'PENDING_SI',
        currentApproverRole: 'SI_ANALYST',
        approverId: null,
        ownerApprovedAt: new Date(),
        ownerApprovedBy: ownerSlackId,
        updatedAt: new Date()
      } as any
    });

    const { sendAexOwnerApprovedDMs } = await import('./aexOwnerService');
    await sendAexOwnerApprovedDMs(client, requestId, toolName, accessLevel, req.requester?.name || 'Solicitante', ownerSlackId);
  } catch (e) {
    console.error('❌ Erro ao processar aprovação AEX pelo owner:', e);
  }
});

slackApp.action('aex_reject', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const requestId = b.actions?.[0]?.value;
  if (!requestId) return;

  try {
    const req = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: { select: { email: true } } }
    });
    if (!req || req.status !== 'PENDING_OWNER') return;

    const ownerSlackId = b.user.id;
    const reqAny = req as { toolName?: string; details?: string };
    const toolName = reqAny.toolName || (() => { try { const d = JSON.parse(req.details || '{}'); return d.tool || d.toolName || '—'; } catch { return '—'; } })();

    await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        ownerRejectedAt: new Date(),
        ownerRejectedBy: ownerSlackId,
        updatedAt: new Date()
      } as any
    });

    const { sendAexRejectedByOwnerDM } = await import('./aexOwnerService');
    let requesterSlackId: string | null = null;
    if (req.requester?.email) {
      try {
        const info = await client.users.lookupByEmail({ email: req.requester.email });
        requesterSlackId = info.user?.id ?? null;
      } catch (_) {}
    }
    if (requesterSlackId) {
      await sendAexRejectedByOwnerDM(client, requesterSlackId, toolName);
    }
  } catch (e) {
    console.error('❌ Erro ao processar rejeição AEX pelo owner:', e);
  }
});

// Handlers de Submissão
slackApp.view('submit_move', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const actionDate = v.data_acao?.picker?.selected_date ?? null;
  const details = {
    info: `Movimentação: ${name}`,
    collaboratorName: name,
    current: { role: v.blk_role_curr.inp.value, dept: v.blk_dept_curr.inp.value },
    future: { role: v.blk_role_fut.inp.value, dept: v.blk_dept_fut.inp.value },
    reason: v.blk_reason.inp.value ?? '',
    ...(actionDate && { actionDate })
  };
  await saveRequest(body, client, 'CHANGE_ROLE', details, v.blk_reason.inp.value!, `✅ Solicitação de movimentação para *${name}* criada com sucesso.`, false, actionDate);
});

slackApp.view('submit_hire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const startDate = v.blk_date.picker?.selected_date || 'A definir';
  const unitName = v.blk_unit?.unit_select?.selected_option?.value ?? '';
  const details = {
    info: `Contratação: ${name}`,
    collaboratorName: name,
    startDate,
    unit: unitName,
    role: v.blk_role.inp.value,
    dept: v.blk_dept.inp.value,
    department: v.blk_dept.inp.value,
    obs: v.blk_obs?.inp?.value ?? ''
  };
  await saveRequest(body, client, 'HIRING', details, `Início: ${startDate}`, `✅ Contratação de *${name}* registrada.`);
});

slackApp.view('submit_fire', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const name = v.blk_name.inp.value;
  const reason = v.blk_reason.inp.value ?? '';
  const actionDate = v.data_acao?.picker?.selected_date ?? null;
  const details = {
    info: `Desligamento: ${name}`,
    collaboratorName: name,
    role: v.blk_role.inp.value,
    dept: v.blk_dept.inp.value,
    reason,
    ...(actionDate && { actionDate })
  };
  await saveRequest(body, client, 'FIRING', details, reason, `⚠️ Desligamento de *${name}* registrado. Processo de offboarding iniciado.`, false, actionDate);
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

slackApp.view('submit_infra', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const typeOpt = v.blk_infra_type?.inp?.selected_option;
  const urgencyOpt = v.blk_infra_urgency?.inp?.selected_option;
  const type = typeOpt?.value ?? '';
  const typeLabel = typeOpt?.text?.text ?? type;
  const desc = v.blk_infra_desc?.inp?.value ?? '';
  const urgency = urgencyOpt?.value ?? '';
  const urgencyLabel = urgencyOpt?.text?.text ?? urgency;

  const details = {
    info: `Suporte de Infra: ${typeLabel}`,
    requestType: type,
    requestTypeLabel: typeLabel,
    description: desc,
    urgency,
    urgencyLabel
  };

  await saveRequest(body, client, 'INFRA_SUPPORT', details, `Urgência: ${urgencyLabel}\n${desc}`, `✅ Sua solicitação de infraestrutura foi enviada com sucesso ao time de suporte.`);
});

// ============================================================
// SUBMISSÃO DO MODAL /acessos (acessos_main_modal)
// ============================================================
slackApp.view('acessos_main_modal', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  let metadata = { actionType: '' };
  try {
    metadata = JSON.parse((view.private_metadata as string) || '{}');
  } catch (_) {}

  const actionType = metadata.actionType || '';
  if (!actionType) {
    await (client as any).chat.postMessage({ channel: body.user.id, text: '⚠️ Selecione primeiro uma ação (Acesso Extraordinário ou Indicar Deputy) e preencha os campos.' });
    return;
  }

  const toolBlock = v.blk_tool;
  const levelBlock = v.blk_level;
  const reasonBlock = v.blk_reason;
  const toolOption = toolBlock?.acessos_tool_select?.selected_option;
  const toolId = toolOption?.value ?? '';
  const toolName = toolOption?.text?.text ?? toolId;
  const levelValue = levelBlock?.acessos_level_select?.selected_option?.value ?? '';
  const levelLabel = levelBlock?.acessos_level_select?.selected_option?.text?.text ?? levelValue;
  const reason = reasonBlock?.inp?.value ?? '';
  const deputyName = v.blk_deputy_name?.inp?.value ?? '';
  const deputyEmail = v.blk_deputy_email?.inp?.value ?? '';

  if (actionType === 'acesso_extraordinario') {
    const details = { info: `Acesso extraordinário: ${toolName}`, tool: toolName, toolId: toolId || undefined, target: levelLabel, targetValue: levelValue };
    await saveRequest(body, client, 'ACCESS_TOOL_EXTRA', details, reason, `🔥 Acesso extraordinário para *${toolName}* enviado ao time de Segurança.`, true);
  } else if (actionType === 'indicar_deputy') {
    if (!toolName) {
      await (client as any).chat.postMessage({ channel: body.user.id, text: '⚠️ Apenas Owners de ferramentas podem indicar um Deputy. Você não é proprietário de nenhuma ferramenta no momento.' });
      return;
    }
    const details = {
      info: `Indicar Deputy: ${toolName}`,
      tool: toolName,
      substituteName: deputyName,
      substituteEmail: deputyEmail,
      substitute: deputyName || deputyEmail,
      justification: reason || undefined,
      source: 'acessos'
    };
    await saveRequest(body, client, 'DEPUTY_DESIGNATION', details, reason, `✅ Indicação de substituto (Deputy) para *${toolName}* enviada para aprovação do time de S.I.`);
  }
});

// ============================================================
// 4. NOTIFICAÇÃO ATIVA (CHAMADA PELO BACKEND WEB)
// ============================================================

const ACCESS_TYPES = ['ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
const PEOPLE_TYPES = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
const INFRA_TYPES = ['INFRA_SUPPORT'];

const TYPE_LABELS: Record<string, string> = {
  ACCESS_TOOL: 'Kit Padrão / Nova Ferramenta',
  ACCESS_CHANGE: 'Alteração de Acesso',
  ACCESS_TOOL_EXTRA: 'Acesso Extraordinário',
  DEPUTY_DESIGNATION: 'Indicar Deputy',
  CHANGE_ROLE: 'Mudança de Cargo',
  HIRING: 'Contratação',
  FIRING: 'Desligamento',
  ADMISSAO: 'Admissão',
  DEMISSAO: 'Desligamento',
  PROMOCAO: 'Promoção',
  INFRA_SUPPORT: 'Suporte Infra / TI'
};

function buildNotificationSummary(requestType: string, detailsJson?: string | null): { category: string; typeLabel: string; detailsText: string } {
  let d: Record<string, unknown> = {};
  try {
    d = typeof detailsJson === 'string' ? JSON.parse(detailsJson || '{}') : (detailsJson || {});
  } catch (_) {}

  const category = ACCESS_TYPES.includes(requestType) || (requestType === 'DEPUTY_DESIGNATION' && d.tool)
    ? 'ACESSOS'
    : PEOPLE_TYPES.includes(requestType)
      ? 'PESSOAS'
      : INFRA_TYPES.includes(requestType)
        ? 'INFRA'
        : 'GERAL';

  const typeLabel = TYPE_LABELS[requestType] || requestType;

  const parts: string[] = [];
  if (requestType === 'INFRA_SUPPORT') {
    if (d.requestTypeLabel || d.requestType) parts.push(`Tipo: ${d.requestTypeLabel || d.requestType}`);
    if (d.urgencyLabel || d.urgency) parts.push(`Urgência: ${d.urgencyLabel || d.urgency}`);
    if (d.description) parts.push(`Descrição: ${(d.description as string).slice(0, 150)}${(d.description as string).length > 150 ? '…' : ''}`);
  } else if (PEOPLE_TYPES.includes(requestType) && requestType !== 'DEPUTY_DESIGNATION') {
    const collab = (d.collaboratorName as string) || (d.info as string)?.toString().replace(/^[^:]+:\s*/, '') || '—';
    parts.push(`Colaborador: ${collab}`);
    if (requestType === 'CHANGE_ROLE') {
      const curr = d.current as Record<string, string> | undefined;
      const fut = d.future as Record<string, string> | undefined;
      if (curr?.role || curr?.dept) parts.push(`Atual: ${[curr?.role, curr?.dept].filter(Boolean).join(' / ')}`);
      if (fut?.role || fut?.dept) parts.push(`Novo: ${[fut?.role, fut?.dept].filter(Boolean).join(' / ')}`);
    }
    if (requestType === 'HIRING' && (d.role || d.dept || d.startDate)) {
      if (d.role) parts.push(`Cargo: ${d.role}`);
      if (d.dept) parts.push(`Depto: ${d.dept}`);
      if (d.startDate) parts.push(`Início: ${d.startDate}`);
    }
    if (requestType === 'FIRING' && (d.role || d.dept)) {
      if (d.role) parts.push(`Cargo: ${d.role}`);
      if (d.dept) parts.push(`Depto: ${d.dept}`);
    }
  } else if (requestType === 'DEPUTY_DESIGNATION' && d.tool) {
    const sub = (d.substituteName as string) || (d.substituteEmail as string) || (d.substitute as string) || '—';
    parts.push(`Substituto: ${sub}`);
    parts.push(`Ferramenta: ${d.tool}`);
  } else if (ACCESS_TYPES.includes(requestType) || (requestType === 'DEPUTY_DESIGNATION' && !d.tool)) {
    const tool = (d.tool as string) || (d.toolName as string) || '—';
    parts.push(`Ferramenta: ${tool}`);
    if (d.target) parts.push(`Nível: ${d.target}`);
    if (d.beneficiary) parts.push(`Beneficiário: ${d.beneficiary}`);
    if (requestType === 'ACCESS_TOOL' && (d.owner || d.subOwner)) {
      if (d.owner) parts.push(`Owner: ${d.owner}`);
      if (d.subOwner) parts.push(`Sub-Owner: ${d.subOwner}`);
    }
  }
  const detailsText = parts.length ? parts.join(' · ') : (d.info as string) || '—';

  return { category, typeLabel, detailsText };
}

export const sendSlackNotification = async (
  email: string,
  status: 'APROVADO' | 'REPROVADO',
  adminNote: string,
  requestType?: string,
  ownerName?: string,
  requestDetails?: string | null
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

    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${icon} Solicitação ${actionText}`, emoji: true }
      }
    ];

    if (requestType && requestDetails) {
      const { category, typeLabel, detailsText } = buildNotificationSummary(requestType, requestDetails);
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Categoria:* ${category}\n*Tipo/Ação:* ${typeLabel}\n*Detalhes:* ${detailsText}`
        }
      });
    }

    blocks.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Status:*\n${status}` },
        { type: 'mrkdwn', text: `*Nota do Time de SI:*\n_${adminNote || '—'}_` }
      ]
    });

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