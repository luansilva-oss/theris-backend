import { App, LogLevel, ExpressReceiver } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { PrismaClient } from '@prisma/client';
import { isInfraTicketType } from '../lib/infraTicket';
import { INFRA_REQUEST_SUBTYPES, REQUEST_TYPES } from '../types/requestTypes';
import type { InfraRequestSubtype } from '../types/requestTypes';
import type { RootAccessDetails, TipoTTLUnidade, TipoUrgencia } from '../types/rootAccess';
import {
  JUSTIFICATIVA_MIN_CHARS,
  TTL_MAX_SEGUNDOS,
  TTL_UNIDADE_PARA_SEGUNDOS,
  isTipoEmpresa,
  isTipoOS,
  isTipoTTLUnidade,
  isTipoUrgencia
} from '../types/rootAccess';
import { getStaticLevelOptionsForToolName } from '../lib/catalogStaticToolLevels';
import { hasJumpCloudCredentials } from './jumpcloudAuth';
import { getSystemUserIdByEmail } from './jumpcloudService';
import { findDeviceByHostname, validateUserDeviceLink } from './jumpcloudAccessRequestService';
import {
  registerPessoasModalCascadeHandlers,
  buildMoveDeptModalBlocks,
  buildMoveCargoModalBlocks,
  buildHireModalBlocks,
  buildFireModalBlocks,
  isPessoasSelectPlaceholder,
  decodeHireManagerSelectValue,
  hireManagerSelectLeaderIdOnly
} from './slackPessoasCascades';

const prisma = new PrismaClient();

function parsePessoasPipeSelect(val: string | undefined): { id: string; name: string } | null {
  if (!val || isPessoasSelectPlaceholder(val)) return null;
  const i = val.indexOf('|');
  if (i < 0) return { id: val, name: val };
  return { id: val.slice(0, i), name: val.slice(i + 1) };
}

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
              { type: 'button', text: { type: 'plain_text', text: '📂 Mudança de Departamento' }, action_id: 'btn_move_dept', style: 'primary' },
              { type: 'button', text: { type: 'plain_text', text: '📋 Mudança de Cargo' }, action_id: 'btn_move_cargo' },
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
// COMANDO /acessos — Modal Gestão de Ferramentas/Acessos (botões no estilo /pessoas)
// ============================================================
function buildAcessosInitialBlocks() {
  return [
    { type: 'section' as const, text: { type: 'mrkdwn' as const, text: '🛠️ *Gestão de Acessos*\nEscolha a ação:' } },
    { type: 'divider' as const },
    {
      type: 'actions' as const,
      block_id: 'blk_acao',
      elements: [
        { type: 'button' as const, text: { type: 'plain_text' as const, text: '🔑 Acesso Extraordinário', emoji: true }, action_id: 'acessos_extraordinario', value: 'acesso_extraordinario', style: 'primary' as const },
        { type: 'button' as const, text: { type: 'plain_text' as const, text: '👤 Indicar Deputy', emoji: true }, action_id: 'acessos_deputy', value: 'indicar_deputy' }
      ]
    },
    {
      type: 'actions' as const,
      block_id: 'blk_acao_row2',
      elements: [
        { type: 'button' as const, text: { type: 'plain_text' as const, text: '🔐 Acesso a VPN', emoji: true }, action_id: 'acessos_vpn', value: 'vpn_access', style: 'primary' as const }
      ]
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
              { type: 'button', text: { type: 'plain_text', text: '📂 Mudança de Departamento' }, action_id: 'btn_move_dept', style: 'primary' },
              { type: 'button', text: { type: 'plain_text', text: '📋 Mudança de Cargo' }, action_id: 'btn_move_cargo' },
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
// /infra — hub (views.open) + formulários (views.push), paridade com /pessoas
// ============================================================

const INFRA_SUBTYPE_LABELS: Record<InfraRequestSubtype, string> = {
  HARDWARE: '💻 Hardware',
  SOFTWARE_PROBLEM: '🛠️ Problemas no PC',
  NETWORK: '🌐 Internet / Rede / VPN',
  OTHER: '❓ Outros Assuntos'
};

function buildInfraSubmitView(tipo: InfraRequestSubtype): Record<string, unknown> {
  return {
    type: 'modal',
    callback_id: 'submit_infra',
    private_metadata: JSON.stringify({ tipo }),
    title: { type: 'plain_text', text: 'Suporte de Infra' },
    submit: { type: 'plain_text', text: 'Enviar Pedido' },
    close: { type: 'plain_text', text: 'Cancelar' },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Tipo:* ${INFRA_SUBTYPE_LABELS[tipo]}` }
      },
      { type: 'divider' },
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
  };
}

function buildInfraRootSubmitView(): Record<string, unknown> {
  return {
    type: 'modal',
    callback_id: 'submit_infra_root',
    title: { type: 'plain_text', text: 'Acesso Root' },
    submit: { type: 'plain_text', text: 'Enviar Pedido' },
    close: { type: 'plain_text', text: 'Cancelar' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '🔐 *Solicitação de Acesso Root (sudo)*\n' +
            'Este acesso permite uso de sudo temporário no seu device.\n' +
            '⏱️ Máximo: *15 dias*. Para períodos maiores, seu gestor precisa contatar o time de SI justificando.'
        }
      },
      { type: 'divider' },
      {
        type: 'input',
        block_id: 'blk_root_empresa',
        label: { type: 'plain_text', text: 'Empresa' },
        element: {
          type: 'static_select',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Selecione...' },
          options: [
            { text: { type: 'plain_text', text: '3C Plus' }, value: 'PLUS' },
            { text: { type: 'plain_text', text: 'Instituto 3C' }, value: 'INS' },
            { text: { type: 'plain_text', text: 'Evolux' }, value: 'EVO' }
          ]
        }
      },
      {
        type: 'input',
        block_id: 'blk_root_os',
        label: { type: 'plain_text', text: 'Sistema Operacional' },
        element: {
          type: 'static_select',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Selecione...' },
          options: [
            { text: { type: 'plain_text', text: 'Linux' }, value: 'LIN' },
            { text: { type: 'plain_text', text: 'Windows' }, value: 'WIN' },
            { text: { type: 'plain_text', text: 'macOS' }, value: 'MAC' }
          ]
        }
      },
      {
        type: 'input',
        block_id: 'blk_root_patrimonio',
        label: { type: 'plain_text', text: 'Patrimônio' },
        hint: { type: 'plain_text', text: 'Apenas números. Ex: 0816' },
        element: {
          type: 'plain_text_input',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Ex: 0060' }
        }
      },
      {
        type: 'input',
        block_id: 'blk_root_hostname_custom',
        optional: true,
        label: { type: 'plain_text', text: 'Hostname customizado' },
        hint: {
          type: 'plain_text',
          text: 'Se preenchido, Empresa/SO/Patrimônio são ignorados. Padrão: 3C-{empresa}-{SO}-{patrimônio}.'
        },
        element: {
          type: 'plain_text_input',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Ex: MacBook-Pro.local' }
        }
      },
      {
        type: 'input',
        block_id: 'blk_root_ttl_qtd',
        label: { type: 'plain_text', text: 'Duração — Quantidade' },
        element: {
          type: 'plain_text_input',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Ex: 4' }
        }
      },
      {
        type: 'input',
        block_id: 'blk_root_ttl_unidade',
        label: { type: 'plain_text', text: 'Duração — Unidade' },
        element: {
          type: 'static_select',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Selecione...' },
          options: [
            { text: { type: 'plain_text', text: 'Minutos' }, value: 'MINUTOS' },
            { text: { type: 'plain_text', text: 'Horas' }, value: 'HORAS' },
            { text: { type: 'plain_text', text: 'Dias' }, value: 'DIAS' }
          ]
        }
      },
      {
        type: 'input',
        block_id: 'blk_root_justificativa',
        label: { type: 'plain_text', text: 'Justificativa (mínimo 20 caracteres)' },
        element: {
          type: 'plain_text_input',
          multiline: true,
          action_id: 'inp',
          placeholder: {
            type: 'plain_text',
            text: 'Ex: Preciso instalar dependência Python (sudo apt install python3-dev) para desenvolvimento do projeto X...'
          }
        }
      },
      {
        type: 'input',
        block_id: 'blk_root_urgencia',
        label: { type: 'plain_text', text: 'Urgência' },
        element: {
          type: 'static_select',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Selecione...' },
          options: [
            { text: { type: 'plain_text', text: '🟢 Baixa' }, value: 'LOW' },
            { text: { type: 'plain_text', text: '🟡 Média' }, value: 'MEDIUM' },
            { text: { type: 'plain_text', text: '🟠 Alta' }, value: 'HIGH' },
            { text: { type: 'plain_text', text: '🔴 Crítica' }, value: 'CRITICAL' }
          ]
        }
      }
    ]
  };
}

slackApp.command('/infra', async ({ ack, body, client }) => {
  await ack();
  try {
    await openModalSafely(client, body.trigger_id, {
      type: 'modal',
      callback_id: 'theris_infra_modal',
      title: { type: 'plain_text', text: 'Suporte de Infra' },
      close: { type: 'plain_text', text: 'Fechar' },
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '🛠️ *Suporte de Infra*\nO que você precisa?' }
        },
        { type: 'divider' },
        {
          type: 'actions',
          block_id: 'blk_infra_menu',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '💻 Hardware', emoji: true },
              action_id: 'btn_infra_hardware',
              value: INFRA_REQUEST_SUBTYPES.HARDWARE
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '🛠️ Problemas no PC', emoji: true },
              action_id: 'btn_infra_software',
              value: INFRA_REQUEST_SUBTYPES.SOFTWARE_PROBLEM
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔐 Acesso Root', emoji: true },
              action_id: 'btn_infra_root',
              value: 'ROOT_ACCESS',
              style: 'primary'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '🌐 Internet / Rede / VPN', emoji: true },
              action_id: 'btn_infra_network',
              value: INFRA_REQUEST_SUBTYPES.NETWORK
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '❓ Outros Assuntos', emoji: true },
              action_id: 'btn_infra_other',
              value: INFRA_REQUEST_SUBTYPES.OTHER
            }
          ]
        }
      ]
    }, body);
  } catch (error) {
    console.error('❌ Erro /infra menu:', error);
  }
});

function buildInfraSubtypePushHandler(tipo: InfraRequestSubtype) {
  return async ({ ack, body, client }: { ack: () => Promise<void>; body: unknown; client: WebClient }) => {
    await ack();
    const b = body as { trigger_id?: string };
    try {
      await pushModalSafely(client, b.trigger_id as string, buildInfraSubmitView(tipo), b);
    } catch (error) {
      console.error(`❌ Erro abrindo modal infra (${tipo}):`, error);
    }
  };
}

slackApp.action('btn_infra_hardware', buildInfraSubtypePushHandler(INFRA_REQUEST_SUBTYPES.HARDWARE));
slackApp.action('btn_infra_software', buildInfraSubtypePushHandler(INFRA_REQUEST_SUBTYPES.SOFTWARE_PROBLEM));
slackApp.action('btn_infra_network', buildInfraSubtypePushHandler(INFRA_REQUEST_SUBTYPES.NETWORK));
slackApp.action('btn_infra_other', buildInfraSubtypePushHandler(INFRA_REQUEST_SUBTYPES.OTHER));

slackApp.action('btn_infra_root', async ({ ack, body, client }) => {
  await ack();
  try {
    await pushModalSafely(client, (body as { trigger_id?: string }).trigger_id as string, buildInfraRootSubmitView(), body);
  } catch (error) {
    console.error('❌ Erro abrindo modal ROOT_ACCESS:', error);
  }
});

// ============================================================
// 2. MODAIS (ABERTURA)
// ============================================================

// Mudança de Departamento — cascata Unidade → Departamento → Cargo (atual e nova situação)
slackApp.action('btn_move_dept', async ({ ack, body, client }) => {
  await ack();
  try {
    const blocks = await buildMoveDeptModalBlocks({ state: { values: {} } });
    await pushModalSafely(
      client,
      (body as any).trigger_id,
      {
        type: 'modal',
        callback_id: 'submit_move_dept',
        title: { type: 'plain_text', text: 'Mudança de Departamento' },
        submit: { type: 'plain_text', text: 'Enviar' },
        blocks
      },
      body
    );
  } catch (e) {
    console.error(e);
  }
});

// Mudança de Cargo — Unidade → Departamento → Cargo atual / Novo cargo
slackApp.action('btn_move_cargo', async ({ ack, body, client }) => {
  await ack();
  try {
    const blocks = await buildMoveCargoModalBlocks({ state: { values: {} } });
    await pushModalSafely(
      client,
      (body as any).trigger_id,
      {
        type: 'modal',
        callback_id: 'submit_move_cargo',
        title: { type: 'plain_text', text: 'Mudança de Cargo' },
        submit: { type: 'plain_text', text: 'Enviar' },
        blocks
      },
      body
    );
  } catch (e) {
    console.error(e);
  }
});

// CONTRATAÇÃO
slackApp.action('btn_hire', async ({ ack, body, client }) => {
  await ack();
  try {
    const blocks = await buildHireModalBlocks({ state: { values: {} } });
    await pushModalSafely(
      client,
      (body as any).trigger_id,
      {
        type: 'modal',
        callback_id: 'submit_hire',
        title: { type: 'plain_text', text: 'Contratação' },
        submit: { type: 'plain_text', text: 'Agendar' },
        blocks
      },
      body
    );
  } catch (e) {
    console.error(e);
  }
});

// DESLIGAMENTO
slackApp.action('btn_fire', async ({ ack, body, client }) => {
  await ack();
  try {
    const blocks = await buildFireModalBlocks({ state: { values: {} } });
    await pushModalSafely(
      client,
      (body as any).trigger_id,
      {
        type: 'modal',
        callback_id: 'submit_fire',
        title: { type: 'plain_text', text: 'Desligamento' },
        submit: { type: 'plain_text', text: 'Confirmar' },
        blocks
      },
      body
    );
  } catch (e) {
    console.error(e);
  }
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

async function handleAcessosActionType(b: any, client: any, selected: string): Promise<void> {
  const view = b.view;
  if (!selected) return;
  if (selected !== 'vpn_access' && !view?.id) return;

  const actionType = selected;
  if (actionType === 'vpn_access') {
    try {
      await client.views.push({
        trigger_id: b.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'vpn_access_request',
          title: { type: 'plain_text', text: 'Acesso a VPN' },
          submit: { type: 'plain_text', text: 'Enviar' },
          close: { type: 'plain_text', text: 'Cancelar' },
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: '🔐 Solicitação de Acesso a VPN\nPreencha os campos abaixo.' } },
            {
              type: 'input',
              block_id: 'vpn_level',
              label: { type: 'plain_text', text: 'Nível de acesso' },
              element: {
                type: 'static_select',
                action_id: 'vpn_level_sel',
                placeholder: { type: 'plain_text', text: 'Selecione...' },
                options: [
                  { text: { type: 'plain_text', text: 'VPN - Default' }, value: 'VPN - Default' },
                  { text: { type: 'plain_text', text: 'VPN - Admin' }, value: 'VPN - Admin' }
                ]
              }
            },
            {
              type: 'input',
              block_id: 'vpn_asset',
              label: { type: 'plain_text', text: 'Patrimônio da máquina' },
              element: {
                type: 'plain_text_input',
                action_id: 'vpn_asset_inp',
                placeholder: { type: 'plain_text', text: 'Apenas números' }
              }
            },
            {
              type: 'input',
              block_id: 'vpn_os',
              label: { type: 'plain_text', text: 'Sistema operacional' },
              element: {
                type: 'static_select',
                action_id: 'vpn_os_sel',
                placeholder: { type: 'plain_text', text: 'Selecione...' },
                options: [
                  { text: { type: 'plain_text', text: 'Windows' }, value: 'Windows' },
                  { text: { type: 'plain_text', text: 'Mac' }, value: 'Mac' },
                  { text: { type: 'plain_text', text: 'Linux' }, value: 'Linux' }
                ]
              }
            },
            {
              type: 'input',
              block_id: 'vpn_justification',
              label: { type: 'plain_text', text: 'Justificativa' },
              element: {
                type: 'plain_text_input',
                action_id: 'vpn_just_inp',
                multiline: true,
                placeholder: { type: 'plain_text', text: 'Descreva a necessidade do acesso à VPN...' }
              }
            }
          ]
        }
      });
    } catch (e) {
      console.error('❌ Erro ao abrir modal VPN:', e);
    }
    return;
  }

  const metadata = { actionType };

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
    const aexTools = catalogTools.filter((f) => f.name.toLowerCase() !== 'vpn - ldap');
    toolOptions = aexTools.map((t) => ({ text: { type: 'plain_text' as const, text: t.name }, value: t.id }));
  }

  // Subfluxo: não exibir novamente o dropdown "Ação Principal" (seleção já feita na etapa anterior)
  const blocks: any[] = [];

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
}

slackApp.action('acessos_extraordinario', async ({ ack, body, client }) => {
  await ack();
  const selected = ((body as any).actions?.[0]?.value ?? '') as string;
  await handleAcessosActionType(body as any, client, selected);
});

slackApp.action('acessos_deputy', async ({ ack, body, client }) => {
  await ack();
  const selected = ((body as any).actions?.[0]?.value ?? '') as string;
  await handleAcessosActionType(body as any, client, selected);
});

slackApp.action('acessos_vpn', async ({ ack, body, client }) => {
  await ack();
  const selected = ((body as any).actions?.[0]?.value ?? '') as string;
  await handleAcessosActionType(body as any, client, selected);
});

slackApp.action('acessos_action_type', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const selected = (b.actions?.[0]?.selected_option?.value ?? b.actions?.[0]?.value ?? '') as string;
  await handleAcessosActionType(b, client, selected);
});

function normalizeToolName(s: string): string {
  return (s || '').trim().toLowerCase();
}

/** Níveis estáticos (fallback quando catálogo + banco não têm níveis). */
function getLevelOptionsFromStaticMap(toolName: string): { text: { type: 'plain_text'; text: string }; value: string }[] {
  const items = getStaticLevelOptionsForToolName(toolName);
  return items.map((item) => ({ text: { type: 'plain_text' as const, text: item.label }, value: item.value }));
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
    const aexTools = catalogTools.filter((f) => f.name.toLowerCase() !== 'vpn - ldap');
    toolOptions = aexTools.map((t) => ({ text: { type: 'plain_text' as const, text: t.name }, value: t.id }));
    const selectedTool = aexTools.find((t) => t.id === selectedToolId) ?? catalogTools.find((t) => t.id === selectedToolId);
    selectedToolName = selectedTool?.name ?? selectedToolId;
  }

  // Subfluxo: não exibir novamente o dropdown "Ação Principal"
  const blocks: any[] = [
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

    const dbLevels = await prisma.toolAccessLevel.findMany({
      where: { toolId: selectedToolId },
      orderBy: { code: 'asc' }
    });
    const catalogTool = await prisma.tool.findUnique({
      where: { id: selectedToolId },
      select: { availableAccessLevels: true, accessLevelDescriptions: true }
    });
    const descMap = (catalogTool?.accessLevelDescriptions as Record<string, unknown>) ?? null;
    const dbCodesLower = new Set(dbLevels.map((l) => l.code.trim().toLowerCase()));
    let levelOptions: { text: { type: 'plain_text'; text: string }; value: string }[] = dbLevels.map((l) => ({
      text: { type: 'plain_text' as const, text: l.name?.trim() ? l.name : l.code },
      value: l.code
    }));
    for (const code of catalogTool?.availableAccessLevels ?? []) {
      const c = String(code).trim();
      if (!c || dbCodesLower.has(c.toLowerCase())) continue;
      levelOptions.push({
        text: { type: 'plain_text' as const, text: getLevelLabel(c, descMap) },
        value: c
      });
    }
    levelOptions.sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }));
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

    blocks.push(
      {
        type: 'input',
        block_id: 'periodo_numero',
        label: { type: 'plain_text', text: 'Período Necessário (Quantidade)' },
        element: {
          type: 'plain_text_input',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Ex: 30' }
        }
      },
      {
        type: 'input',
        block_id: 'periodo_unidade',
        label: { type: 'plain_text', text: 'Unidade' },
        element: {
          type: 'static_select',
          action_id: 'periodo_unit_select',
          placeholder: { type: 'plain_text', text: 'Selecione...' },
          options: [
            { text: { type: 'plain_text', text: 'Horas' }, value: 'horas' },
            { text: { type: 'plain_text', text: 'Dias' }, value: 'dias' },
            { text: { type: 'plain_text', text: 'Meses' }, value: 'meses' }
          ]
        }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: 'ℹ️ O período máximo permitido é de 90 dias. Solicitações com período superior serão reprovadas automaticamente.' }
        ]
      }
    );
  } else if (actionType === 'indicar_deputy') {
    blocks.push(
      {
        type: 'input',
        block_id: 'blk_deputy_user',
        optional: true,
        label: { type: 'plain_text', text: 'Responsável (opcional: selecione para preencher e-mail automaticamente)' },
        element: {
          type: 'users_select',
          action_id: 'deputy_user_select',
          placeholder: { type: 'plain_text', text: 'Selecione um usuário @...' }
        }
      },
      { type: 'input', block_id: 'blk_deputy_name', optional: true, label: { type: 'plain_text', text: 'Nome do Substituto' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: 'plain_text', text: 'Preenchido automaticamente se selecionar usuário acima' }, hint: { type: 'plain_text', text: 'Preenchido automaticamente se um usuário for selecionado acima. Verifique e edite se necessário.' } } },
      { type: 'input', block_id: 'blk_deputy_email', label: { type: 'plain_text', text: 'E-mail do Substituto (obrigatório)' }, element: { type: 'plain_text_input', action_id: 'inp', placeholder: { type: 'plain_text', text: 'email@empresa.com' } } },
      {
        type: 'input',
        block_id: 'deputy_periodo_numero',
        label: { type: 'plain_text', text: 'Período (Quantidade)' },
        element: {
          type: 'plain_text_input',
          action_id: 'inp',
          placeholder: { type: 'plain_text', text: 'Ex: 7, 15, 30, 60 ou 90' }
        }
      },
      {
        type: 'input',
        block_id: 'deputy_periodo_unidade',
        label: { type: 'plain_text', text: 'Unidade' },
        element: {
          type: 'static_select',
          action_id: 'deputy_periodo_unit_select',
          placeholder: { type: 'plain_text', text: 'Selecione...' },
          options: [
            { text: { type: 'plain_text', text: 'Horas' }, value: 'horas' },
            { text: { type: 'plain_text', text: 'Dias' }, value: 'dias' },
            { text: { type: 'plain_text', text: 'Meses' }, value: 'meses' }
          ]
        }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: 'ℹ️ O período máximo permitido é de 90 dias. Solicitações com período superior serão bloqueadas.' }
        ]
      }
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
const OFFBOARDING_REQUEST_TYPES = ['FIRING', 'DEMISSAO', 'OFFBOARDING'];
const ONBOARDING_REQUEST_TYPES_SLACK = ['HIRING', 'ADMISSAO', 'ONBOARDING'];
const RH_BYPASS_REQUESTER_NAME = 'Renata Czapiewski Silva';

function isRhBypassRequester(name: string | null | undefined): boolean {
  const n = (name || '').trim();
  return n === RH_BYPASS_REQUESTER_NAME || n.toLowerCase().includes('renata czapiewski');
}

/** Pós-criação HIRING: canal acessos + DMs ao SI (solicitante não recebe botão de aprovação). */
async function runHiringSlackFlowAfterCreate(
  client: WebClient,
  created: { id: string; status: string; details: string | null },
  detailsWithMeta: Record<string, unknown>,
  requesterName: string,
  requesterSlackId?: string | null
): Promise<void> {
  const short = created.id.slice(0, 8);
  const d = detailsWithMeta;
  const collab = String(d.collaboratorName || '—');
  const role = String(d.role || '—');
  const dept = String(d.department || d.dept || '—');
  const unit = String(d.unit || '—');
  const ct = String(d.contractType || '—');
  const ad = String(d.actionDate || d.startDate || '—');
  const summaryLines = `*Novo colaborador:* ${collab}\n*Cargo:* ${role}\n*Departamento:* ${dept}\n*Unidade:* ${unit}\n*Tipo de contratação:* ${ct}\n*Data de ação:* ${ad}\n*Solicitante (Theris):* ${requesterName}`;

  await postSlackAcessosChannel(client, `📋 Onboarding aberto · ${collab} · #${short} · ${formatTimestampBrt()} BRT`, [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📋 *Onboarding aberto*\n*Colaborador:* ${collab}\n*Solicitante:* ${requesterName}\n*Quando:* ${formatTimestampBrt()} BRT\n*Chamado:* #${short}`
      }
    }
  ]);

  const { sendSiTeamOnboardingApprovalDms } = await import('./siSlackApprovalService');
  await sendSiTeamOnboardingApprovalDms(client, created.id, summaryLines, requesterSlackId ?? null);

  await postSlackAcessosChannel(
    client,
    `ℹ️ Solicitação de aprovação SI enviada (DM) · ${collab} · #${short} · ${formatTimestampBrt()} BRT`
  );
}

/** Pós-criação FIRING (/pessoas): canal acessos + DMs ao SI (solicitante excluído da lista). */
async function runFiringSlackFlowAfterCreate(
  client: WebClient,
  created: { id: string },
  detailsWithMeta: Record<string, unknown>,
  requesterName: string,
  requesterSlackId?: string | null
): Promise<void> {
  const short = created.id.slice(0, 8);
  const d = detailsWithMeta;
  const nome = String(d.collaboratorName || '—');
  const cargo = String(d.role || '—');
  const dept = String(d.dept || d.department || '—');
  const unit = String(d.unit || '—');
  const ad = String(d.actionDate || d.startDate || '—');
  const summaryBody = `🔴 Offboarding — ${nome}, ${cargo}, ${dept}, ${unit}\nSolicitante: ${requesterName} | Data de ação: ${ad} | Ticket: #${short}`;

  await postSlackAcessosChannel(
    client,
    `🔴 Offboarding aberto — ${nome}, ${cargo}, ${dept} | Solicitante: ${requesterName} | Ticket: #${short}`
  );

  const { sendSiTeamFiringApprovalDms } = await import('./siSlackApprovalService');
  await sendSiTeamFiringApprovalDms(client, created.id, summaryBody, requesterSlackId ?? null);

  await postSlackAcessosChannel(
    client,
    `ℹ️ Solicitação de aprovação SI enviada (DM) · ${nome} · #${short} · ${formatTimestampBrt()} BRT`
  );
}

async function saveRequest(
  body: any,
  client: any,
  dbType: string,
  details: any,
  reason: string,
  msgSuccess: string,
  isExtraordinary = false,
  actionDate?: string | null,
  accessPeriodDays?: number,
  accessPeriodRaw?: string
) {
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
        const userDb = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (userDb) requesterId = userDb.id;
      }
    } catch (err) { console.log('Erro ao buscar user Slack:', err); }

    // Fallback: evita findFirst sem WHERE (full scan). Preferir env; senão um usuário ativo por id estável.
    if (!requesterId) {
      const envFallback = process.env.SLACK_SAVE_REQUEST_FALLBACK_USER_ID?.trim();
      if (envFallback) {
        const byEnv = await prisma.user.findUnique({ where: { id: envFallback }, select: { id: true } });
        if (byEnv) requesterId = byEnv.id;
      }
      if (!requesterId) {
        const active = await prisma.user.findFirst({
          where: { isActive: true },
          orderBy: { id: 'asc' },
          select: { id: true }
        });
        if (active) requesterId = active.id;
      }
      if (!requesterId) {
        const anyUser = await prisma.user.findFirst({
          orderBy: { id: 'asc' },
          select: { id: true }
        });
        if (anyUser) requesterId = anyUser.id;
      }
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

    const requesterPeople = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true, managerId: true }
    });

    // Contratação (/pessoas): aprovação apenas do SI (gestor no formulário é só registro)
    if (dbType === 'HIRING') {
      status = 'PENDING_SI';
      currentApproverRole = 'SI_ANALYST';
      approverId = null;
      if (isRhBypassRequester(requesterPeople?.name)) {
        detailsWithMeta = { ...detailsWithMeta, bypassGestor: true };
      }
    } else if (dbType === 'FIRING') {
      status = 'PENDING_SI';
      currentApproverRole = 'SI_ANALYST';
      approverId = null;
    } else if (PEOPLE_REQUEST_TYPES_SLACK.includes(dbType)) {
      // Regra de bypass /pessoas: Renata pula gestor Theris e vai direto para SI
      if (isRhBypassRequester(requesterPeople?.name)) {
        status = 'PENDENTE_SI';
        currentApproverRole = 'SI_ANALYST';
        approverId = null;
        detailsWithMeta = { ...detailsWithMeta, bypassGestor: true };
      } else if (requesterPeople?.managerId) {
        status = 'PENDENTE_GESTOR';
        currentApproverRole = 'MANAGER';
        approverId = requesterPeople.managerId;
      }
    }

    // Inclui Slack ID e e-mail do solicitante nos detalhes (auditoria e exibição no painel)
    detailsWithMeta.slackRequesterId = slackId;
    detailsWithMeta.requesterEmail = requesterEmail ?? undefined;
    detailsWithMeta.source = 'slack';

    const toolName = (details as { tool?: string; toolName?: string }).tool || (details as { tool?: string; toolName?: string }).toolName;
    const accessLevel = (details as { target?: string; targetValue?: string }).target || (details as { target?: string; targetValue?: string }).targetValue;

    // AEX: sempre 2 etapas — Owner aprova → SI aprova (mesmo se Owner for do time de SI)
    if (isExtraordinary && (dbType === 'ACCESS_TOOL_EXTRA' || dbType === 'ACCESS_TOOL' || dbType === 'ACESSO_FERRAMENTA' || dbType === 'EXTRAORDINARIO')) {
      status = 'PENDING_OWNER';
      currentApproverRole = 'TOOL_OWNER';
      approverId = null;
    }

    const hireFull = dbType === 'HIRING' ? String((details as { collaboratorName?: string }).collaboratorName || '') : null;
    const hireMgrEmail = dbType === 'HIRING' ? String((details as { managerEmail?: string }).managerEmail || '').trim() : null;

    const created = await prisma.request.create({
      data: {
        requesterId,
        type: dbType,
        details: JSON.stringify(detailsWithMeta),
        justification: reason || 'Via Slack',
        status,
        currentApproverRole,
        approverId,
        assigneeId: isInfraTicketType(dbType) ? null : requesterId,
        isExtraordinary,
        ...(isExtraordinary && toolName && { toolName }),
        ...(isExtraordinary && accessLevel && { accessLevel }),
        ...(actionDate && { actionDate: new Date(actionDate) }),
        ...(accessPeriodDays != null && { accessPeriodDays: Math.round(accessPeriodDays) }),
        ...(accessPeriodRaw && { accessPeriodRaw }),
        ...(dbType === 'HIRING' && hireFull && { onboardingFullName: hireFull }),
        ...(dbType === 'HIRING' && hireMgrEmail && { onboardingManagerEmail: hireMgrEmail })
      }
    });

    console.log('[Chamado] Tentando enviar notificação SI para chamado:', created.id, 'tipo:', created.type);
    try {
      if (dbType !== 'HIRING' && dbType !== 'FIRING') {
        await notificarSINovoTicket({
          id: created.id,
          type: created.type,
          status: created.status,
          justification: created.justification,
          details: created.details,
          requesterId: created.requesterId,
          createdAt: created.createdAt
        });
        console.log('[Chamado] Slack SI enviado com sucesso para chamado:', created.id);
      }
    } catch (notifErr) {
      console.error('[Chamado] Erro ao enviar Slack SI:', notifErr);
    }

    if (dbType === 'HIRING') {
      void runHiringSlackFlowAfterCreate(
        client,
        created,
        detailsWithMeta,
        requesterPeople?.name || 'Solicitante',
        body.user?.id
      ).catch((e) => console.error('[HIRING] pós-criação Slack:', e));
    }

    if (dbType === 'FIRING') {
      let requesterSlackIdForFiring: string | null = null;
      const reqUser = await prisma.user.findUnique({ where: { id: requesterId }, select: { email: true } });
      if (reqUser?.email) {
        try {
          const lu = await client.users.lookupByEmail({ email: reqUser.email });
          requesterSlackIdForFiring = lu.user?.id ?? null;
        } catch (_) {}
      }
      void runFiringSlackFlowAfterCreate(
        client,
        created,
        detailsWithMeta,
        requesterPeople?.name || 'Solicitante',
        requesterSlackIdForFiring
      ).catch((e) => console.error('[FIRING] pós-criação Slack:', e));
    }
    if (dbType === 'CHANGE_ROLE') {
      const short = created.id.slice(0, 8);
      const d = detailsWithMeta;
      const nome = String(d.collaboratorName || '—');
      const cur = (d.current as { role?: string; dept?: string }) || {};
      const fut = (d.future as { role?: string; dept?: string }) || {};
      const cargoAtual = String(cur.role || '—');
      const novoCargo = String(fut.role || '—');
      const dept = String(fut.dept || cur.dept || '—');
      const sol = requesterPeople?.name || 'Solicitante';
      firePostSlackAcessosChannel(
        `🔄 Movimentação interna aberta — ${nome}: ${cargoAtual} → ${novoCargo}, ${dept} | Solicitante: ${sol} | Ticket: #${short}`
      );
    }

    if (isExtraordinary && toolName) {
      const { registrarMudanca } = await import('../lib/auditLog');
      const period = accessPeriodRaw || (accessPeriodDays != null ? `${accessPeriodDays} dias` : null) || undefined;
      await registrarMudanca({
        tipo: 'AEX_CREATED',
        entidadeTipo: 'Request',
        entidadeId: created.id,
        descricao: 'Solicitação de Acesso Extraordinário criada',
        dadosDepois: { ferramenta: toolName, nivel: accessLevel, periodo: period, justificativa: reason || undefined },
        autorId: requesterId
      });
    }

    // AEX: enviar DMs para Owner/Sub, SI e solicitante
    if (isExtraordinary && toolName) {
      const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { name: true, email: true } });
      const { sendAexCreationDMs, sendAexRequesterCreatedDM } = await import('./aexOwnerService');
      const period = accessPeriodRaw || (accessPeriodDays != null ? `${accessPeriodDays} dias` : '—');
      sendAexCreationDMs(client, created.id, toolName, accessLevel || '—', requester?.name || 'Solicitante', reason, { period, requesterId }).catch(err => console.error('[AEX] Erro ao enviar DMs:', err));
      if (requester?.email) {
        try {
          const lookup = await client.users.lookupByEmail({ email: requester.email });
          if (lookup.user?.id) {
            await sendAexRequesterCreatedDM(client, lookup.user.id, created.id, toolName, accessLevel || '—');
          }
        } catch (_) {}
      }
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
// APENAS cliques explícitos nos botões disparam mudança de status.
// Validações rígidas para evitar disparos indevidos (ex: retry, message event).
// action_id: aex_owner_approve_v2 | aex_owner_reject_v2
// value: approve_<requestId> | reject_<requestId>
// ============================================================
slackApp.action({ action_id: /^aex_owner_(approve|reject)_v2$/, block_id: 'aex_owner_decision' }, async ({ ack, body, client }) => {
  const b = body as any;

  // DEBUG: identificar qual evento disparou (remover após diagnóstico)
  console.log('[AEX DEBUG] Payload completo:', JSON.stringify({ type: b.type, actions: b.actions?.map((a: any) => ({ action_id: a.action_id, value: a.value })), user: b.user?.id }, null, 2));

  // 1. Validar tipo do payload — só processar block_actions (não event_callback, shortcut, etc.)
  if (b.type !== 'block_actions') {
    console.warn('[AEX] Ignorando payload que não é block_actions:', b.type);
    await ack();
    return;
  }

  // 2. Validar actions
  const actions = b.actions;
  if (!Array.isArray(actions) || actions.length === 0) {
    console.warn('[AEX] Ignorando: actions ausente ou vazio');
    await ack();
    return;
  }

  const action = actions[0];
  const actionId = action?.action_id ?? '';
  const rawValue = typeof action?.value === 'string' ? action.value : '';

  // 3. Validar action_id exato
  const validActionIds = ['aex_owner_approve_v2', 'aex_owner_reject_v2'];
  if (!validActionIds.includes(actionId)) {
    console.warn('[AEX] Ignorando: action_id inválido:', actionId);
    await ack();
    return;
  }

  // 4. Validar value (approve_xxx ou reject_xxx)
  if (!rawValue.startsWith('approve_') && !rawValue.startsWith('reject_')) {
    console.warn('[AEX] Ignorando: value inválido (deve começar com approve_ ou reject_):', rawValue?.slice(0, 50));
    await ack();
    return;
  }

  const requestId = rawValue.startsWith('approve_')
    ? rawValue.replace(/^approve_/, '')
    : rawValue.replace(/^reject_/, '');
  const isApprove = rawValue.startsWith('approve_');

  if (!requestId) {
    console.warn('[AEX] requestId vazio após parse');
    await ack();
    return;
  }

  await ack();

  // 5. Verificar status do chamado ANTES de processar — evita reprocessar ou eventos fora de ordem
  let req: any;
  try {
    req = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { id: true, name: true, email: true, managerId: true, manager: { select: { email: true } } } },
        assignee: { select: { name: true } }
      }
    });
  } catch (e) {
    console.error('[AEX] Erro ao buscar request:', e);
    return;
  }

  if (!req) {
    console.warn('[AEX] Chamado não encontrado:', requestId);
    return;
  }

  if (req.status !== 'PENDING_OWNER') {
    console.log('[AEX] Ignorando: chamado não está em PENDING_OWNER, status atual:', req.status);
    return;
  }

  const ownerSlackId = b.user?.id;
  if (!ownerSlackId) {
    console.warn('[AEX] Ignorando: user.id ausente no payload');
    return;
  }

  // Regra de conflito: Líder que é também Owner não pode aprovar como Owner (já aprovou ou aprovará como Líder)
  const toolNameForConflict = (req as { toolName?: string; details?: string }).toolName || (() => { try { const d = JSON.parse(req.details || '{}'); return d.tool || d.toolName; } catch { return null; } })();
  const leaderEmail = (req.requester as { manager?: { email?: string } } | null)?.manager?.email;
  if (toolNameForConflict && leaderEmail) {
    try {
      const { getOwnerAndSubSlackIdsForTool } = await import('./aexOwnerService');
      const { ownerSlackId: toolOwnerSlackId } = await getOwnerAndSubSlackIdsForTool(toolNameForConflict);
      const leaderLookup = await client.users.lookupByEmail({ email: leaderEmail });
      const leaderSlackId = leaderLookup.user?.id ?? null;
      if (toolOwnerSlackId && leaderSlackId && ownerSlackId === toolOwnerSlackId && ownerSlackId === leaderSlackId) {
        const shortId = requestId.slice(0, 8);
        const toolNameForDm = toolNameForConflict || '—';
        await sendDmToSlackUser(client, ownerSlackId, `Você aprovou o chamado #${shortId} como Líder do solicitante. Por isso, a aprovação como Owner da ferramenta ${toolNameForDm} foi direcionada automaticamente ao sub-owner. Nenhuma ação é necessária da sua parte neste chamado.`);
        return;
      }
    } catch (_) {}
  }

  // Regra genérica: solicitante não pode aprovar/reprovar o próprio chamado (qualquer perfil)
  if (req.requester?.email) {
    try {
      const requesterLookup = await client.users.lookupByEmail({ email: req.requester.email });
      if (requesterLookup.user?.id === ownerSlackId) {
        try {
          await sendDmToSlackUser(client, ownerSlackId, 'O solicitante não pode aprovar ou reprovar o próprio chamado.');
        } catch (_) {}
        return;
      }
    } catch (_) {}
  }

  try {
    const reqAny = req as { toolName?: string; accessLevel?: string; details?: string };
    const toolName = reqAny.toolName || (() => { try { const d = JSON.parse(req.details || '{}'); return d.tool || d.toolName || '—'; } catch { return '—'; } })();
    const accessLevel = reqAny.accessLevel || (() => { try { const d = JSON.parse(req.details || '{}'); return d.target || d.targetValue || '—'; } catch { return '—'; } })();

    let ownerUserId: string | undefined;
    try {
      const ownerInfo = await client.users.info({ user: ownerSlackId });
      const ownerEmail = ownerInfo.user?.profile?.email;
      if (ownerEmail) {
        const ownerDb = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
        if (ownerDb) ownerUserId = ownerDb.id;
      }
    } catch (_) {}

    if (isApprove) {
      let ownerName: string | null = null;
      try {
        const userInfo = await client.users.info({ user: ownerSlackId });
        ownerName = userInfo.user?.real_name ?? userInfo.user?.name ?? null;
      } catch (_) {}

      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'PENDING_SI',
          currentApproverRole: 'SI_ANALYST',
          approverId: null,
          ownerApprovedAt: new Date(),
          ownerApprovedBy: ownerSlackId,
          ownerApprovedByName: ownerName,
          ...(ownerUserId && { assigneeId: ownerUserId }),
          updatedAt: new Date()
        } as any
      });

      if (ownerUserId && req.assigneeId !== ownerUserId) {
        const { registrarMudanca } = await import('../lib/auditLog');
        const { notifyTicketEvent } = await import('./ticketEventService');
        await registrarMudanca({
          tipo: 'TICKET_ASSIGNED',
          entidadeTipo: 'Request',
          entidadeId: requestId,
          descricao: `Responsável atribuído: ${ownerName ?? '—'}`,
          dadosAntes: { responsavel: req.assignee?.name ?? null },
          dadosDepois: { responsavel: ownerName ?? '—' },
          autorId: ownerUserId,
        }).catch(() => {});
        try {
          await notifyTicketEvent(requestId, 'ASSIGNEE_CHANGED', { assigneeId: ownerUserId });
        } catch (_) {}
      }

      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'AEX_OWNER_APPROVED',
        entidadeTipo: 'Request',
        entidadeId: requestId,
        descricao: 'Owner/Sub-owner aprovou a solicitação AEX',
        dadosAntes: { status: 'PENDING_OWNER' },
        dadosDepois: { status: 'PENDING_SI', ownerApprovedBy: ownerSlackId },
        autorId: ownerUserId
      });

      const { sendAexOwnerApprovedDMs, sendAexRequesterOwnerApprovedDM } = await import('./aexOwnerService');
      await sendAexOwnerApprovedDMs(client, requestId, toolName, accessLevel, req.requester?.name || 'Solicitante', ownerSlackId, ownerName ?? undefined);
      let requesterSlackIdForNotif: string | null = null;
      if (req.requester?.email) {
        try {
          const info = await client.users.lookupByEmail({ email: req.requester.email });
          requesterSlackIdForNotif = info.user?.id ?? null;
        } catch (_) {}
      }
      if (requesterSlackIdForNotif) {
        await sendAexRequesterOwnerApprovedDM(client, requesterSlackIdForNotif, requestId, toolName, accessLevel);
      }
    } else {
      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          ownerRejectedAt: new Date(),
          ownerRejectedBy: ownerSlackId,
          ...(ownerUserId && { assigneeId: ownerUserId }),
          updatedAt: new Date()
        } as any
      });

      if (ownerUserId && req.assigneeId !== ownerUserId) {
        const { registrarMudanca } = await import('../lib/auditLog');
        const { notifyTicketEvent } = await import('./ticketEventService');
        let ownerNameReject: string | null = null;
        try {
          const userInfo = await client.users.info({ user: ownerSlackId });
          ownerNameReject = userInfo.user?.real_name ?? userInfo.user?.name ?? null;
        } catch (_) {}
        await registrarMudanca({
          tipo: 'TICKET_ASSIGNED',
          entidadeTipo: 'Request',
          entidadeId: requestId,
          descricao: `Responsável atribuído: ${ownerNameReject ?? '—'}`,
          dadosAntes: { responsavel: req.assignee?.name ?? null },
          dadosDepois: { responsavel: ownerNameReject ?? '—' },
          autorId: ownerUserId,
        }).catch(() => {});
        try {
          await notifyTicketEvent(requestId, 'ASSIGNEE_CHANGED', { assigneeId: ownerUserId });
        } catch (_) {}
      }

      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'AEX_OWNER_REJECTED',
        entidadeTipo: 'Request',
        entidadeId: requestId,
        descricao: 'Owner/Sub-owner reprovou a solicitação AEX',
        dadosAntes: { status: 'PENDING_OWNER' },
        dadosDepois: { status: 'REJECTED', ownerRejectedBy: ownerSlackId },
        autorId: ownerUserId
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
        await sendAexRejectedByOwnerDM(client, requesterSlackId, requestId, toolName);
      }
    }
  } catch (e) {
    console.error('❌ Erro ao processar decisão AEX pelo owner:', e);
  }
});

// ============================================================
// AEX + Onboarding: SI Aprovar / Recusar — aex_si_approve_v2 | aex_si_reject_v2
// ============================================================
slackApp.action({ action_id: /^aex_si_(approve|reject)_v2$/, block_id: 'aex_si_decision' }, async ({ ack, body, client, respond }) => {
  const b = body as any;
  if (b.type !== 'block_actions') {
    await ack();
    return;
  }
  await ack();
  const action = b.actions?.[0];
  const isApprove = action?.action_id === 'aex_si_approve_v2';
  const { handleSiDualApprovalSlackAction } = await import('./siSlackApprovalService');
  await handleSiDualApprovalSlackAction({ client, body: b, isApprove, respond });
});

// Acesso Root: action_ids dedicados (block_id distinto de AEX) — mesmo value approve_{id} / reject_{id}
slackApp.action({ action_id: /^root_si_(approve|reject)_v1$/, block_id: 'root_si_decision' }, async ({ ack, body, client, respond }) => {
  const b = body as { type?: string; actions?: { action_id?: string }[] };
  if (b.type !== 'block_actions') {
    await ack();
    return;
  }
  await ack();
  const action = b.actions?.[0];
  const isApprove = action?.action_id === 'root_si_approve_v1';
  const { handleSiDualApprovalSlackAction } = await import('./siSlackApprovalService');
  await handleSiDualApprovalSlackAction({ client, body: b as any, isApprove, respond });
});

// ============================================================
// VPN: Líder Aprovar / Recusar (action_id: vpn_leader_approve | vpn_leader_reject, value: requestId)
// ============================================================
slackApp.action({ action_id: /^vpn_leader_(approve|reject)$/, block_id: 'vpn_leader_decision' }, async ({ ack, body, client }) => {
  const b = body as any;
  await ack();
  const action = b.actions?.[0];
  const requestId = action?.value;
  const leaderSlackId = b.user?.id;
  if (!requestId || !leaderSlackId) return;

  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, name: true, email: true } }, assignee: { select: { name: true } } }
  });
  if (!req || req.type !== 'VPN_ACCESS') return;
  if (req.status !== 'PENDING_OWNER' && req.status !== 'PENDING_SI' && req.status !== 'PENDENTE_SI') return;

  let leaderUserId: string | undefined;
  try {
    const leaderInfo = await client.users.info({ user: leaderSlackId });
    const leaderEmail = leaderInfo.user?.profile?.email;
    if (leaderEmail) {
      const leaderDb = await prisma.user.findUnique({ where: { email: leaderEmail }, select: { id: true } });
      if (leaderDb) leaderUserId = leaderDb.id;
    }
  } catch (_) {}

  // Regra genérica: solicitante não pode aprovar/reprovar o próprio chamado (qualquer perfil)
  if (req.requester?.email) {
    try {
      const requesterLookup = await client.users.lookupByEmail({ email: req.requester.email });
      if (requesterLookup.user?.id === leaderSlackId) {
        try {
          await sendDmToSlackUser(client, leaderSlackId, 'O solicitante não pode aprovar ou reprovar o próprio chamado.');
        } catch (_) {}
        return;
      }
    } catch (_) {}
  }

  if ((req as any).ownerApprovedBy || (req as any).ownerRejectedAt) {
    try {
      await sendDmToSlackUser(client, leaderSlackId, 'Esta solicitação de VPN já foi respondida.');
    } catch (_) {}
    return;
  }

  const isApprove = action?.action_id === 'vpn_leader_approve';
  let leaderName: string | null = null;
  try {
    const userInfo = await client.users.info({ user: leaderSlackId });
    leaderName = userInfo.user?.real_name ?? userInfo.user?.name ?? null;
  } catch (_) {}

  const channelId = b.channel?.id ?? b.channel_id;
  const messageTs = b.message?.ts ?? (b as any).message_ts;

  if (isApprove) {
    await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'PENDING_SI',
        currentApproverRole: 'SI_ANALYST',
        ownerApprovedAt: new Date(),
        ownerApprovedBy: leaderSlackId,
        ownerApprovedByName: leaderName,
        ...(leaderUserId && { assigneeId: leaderUserId }),
        updatedAt: new Date()
      } as any
    });
    if (channelId && messageTs) {
      try {
        await client.chat.update({
          channel: channelId,
          ts: messageTs,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ Você aprovou esta solicitação de Acesso a VPN.'
              }
            }
          ]
        });
      } catch (e) {
        console.warn('[VPN] chat.update (aprovar) falhou:', e);
      }
    }
    if (leaderUserId && (req as { assigneeId?: string }).assigneeId !== leaderUserId) {
      const { registrarMudanca } = await import('../lib/auditLog');
      const { notifyTicketEvent } = await import('./ticketEventService');
      await registrarMudanca({
        tipo: 'TICKET_ASSIGNED',
        entidadeTipo: 'Request',
        entidadeId: requestId,
        descricao: `Responsável atribuído: ${leaderName ?? '—'}`,
        dadosAntes: { responsavel: (req as { assignee?: { name: string } }).assignee?.name ?? null },
        dadosDepois: { responsavel: leaderName ?? '—' },
        autorId: leaderUserId,
      }).catch(() => {});
      try {
        await notifyTicketEvent(requestId, 'ASSIGNEE_CHANGED', { assigneeId: leaderUserId });
      } catch (_) {}
    }
    const { registrarMudanca } = await import('../lib/auditLog');
    await registrarMudanca({
      tipo: 'VPN_LEADER_APPROVED',
      entidadeTipo: 'Request',
      entidadeId: requestId,
      descricao: 'Líder aprovou solicitação de Acesso a VPN',
      dadosDepois: { ownerApprovedBy: leaderSlackId },
      autorId: req.requesterId ?? undefined
    }).catch(() => {});

    const updatedReq = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: { select: { email: true } } }
    });
    const siApprovedBy = updatedReq ? (updatedReq as { siApprovedBy?: string }).siApprovedBy : null;
    if (siApprovedBy && updatedReq?.requester?.email) {
      try {
        const { getSystemUserIdByEmail, addUserToVpnGroup, getVpnGroupIds } = await import('./jumpcloudService');
        const detailsObj = JSON.parse(updatedReq.details || '{}');
        const vpnLevel = (detailsObj.vpnLevel || 'VPN - Default').trim();
        const assetNumber = detailsObj.assetNumber || '—';
        const operatingSystem = detailsObj.operatingSystem || '—';
        const requesterEmail = updatedReq.requester.email;
        const jcUserId = await getSystemUserIdByEmail(requesterEmail);
        const vpnGroupIds = getVpnGroupIds();
        const groupId = vpnGroupIds[vpnLevel];
        console.log('[VPN] GROUP IDS:', {
          default: process.env.VPN_GROUP_DEFAULT_ID,
          admin: process.env.VPN_GROUP_ADMIN_ID,
          vpnLevel: detailsObj.vpnLevel,
          resolvedGroupId: vpnGroupIds[vpnLevel]
        });
        console.log('[VPN] Inserindo usuário no grupo JumpCloud:', { email: requesterEmail, groupId, vpnLevel });
        if (jcUserId && groupId && (await addUserToVpnGroup(groupId, jcUserId))) {
          await prisma.request.update({
            where: { id: requestId },
            data: { status: 'RESOLVED', updatedAt: new Date() }
          });
          const leaderName = (updatedReq as { ownerApprovedByName?: string }).ownerApprovedByName || 'Líder';
          let siName = 'SI';
          try {
            const siInfo = await client.users.info({ user: siApprovedBy });
            siName = siInfo.user?.real_name ?? siInfo.user?.name ?? siName;
          } catch (_) {}
          await notificarVpnConcedido({
            requesterEmail,
            vpnLevel,
            assetNumber,
            operatingSystem,
            leaderName,
            siName
          });
        } else {
          console.error('[VPN] Falha ao inserir no JumpCloud:', new Error('usuário ou grupo não encontrado ou addUserToVpnGroup retornou false'));
          await notificarVpnFalhaInserção(requesterEmail);
        }
      } catch (e) {
        console.error('[VPN] Erro ao concluir após aprovação do líder:', e);
        if (updatedReq?.requester?.email) await notificarVpnFalhaInserção(updatedReq.requester.email);
      }
    } else if (req.requester?.email) {
      try {
        const lookup = await client.users.lookupByEmail({ email: req.requester.email });
        if (lookup.user?.id) {
          await sendDmToSlackUser(
            client,
            lookup.user.id,
            '✅ Seu líder aprovou sua solicitação de Acesso a VPN. Aguardando aprovação do time de SI.'
          );
        }
      } catch (_) {}
    }
  } else {
    await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        ownerRejectedAt: new Date(),
        ownerRejectedBy: leaderSlackId,
        ...(leaderUserId && { assigneeId: leaderUserId }),
        updatedAt: new Date()
      } as any
    });
    if (channelId && messageTs) {
      try {
        await client.chat.update({
          channel: channelId,
          ts: messageTs,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '❌ Você recusou esta solicitação de Acesso a VPN.'
              }
            }
          ]
        });
      } catch (e) {
        console.warn('[VPN] chat.update (recusar) falhou:', e);
      }
    }
    if (leaderUserId && (req as { assigneeId?: string }).assigneeId !== leaderUserId) {
      const { registrarMudanca } = await import('../lib/auditLog');
      const { notifyTicketEvent } = await import('./ticketEventService');
      await registrarMudanca({
        tipo: 'TICKET_ASSIGNED',
        entidadeTipo: 'Request',
        entidadeId: requestId,
        descricao: `Responsável atribuído: ${leaderName ?? '—'}`,
        dadosAntes: { responsavel: (req as { assignee?: { name: string } }).assignee?.name ?? null },
        dadosDepois: { responsavel: leaderName ?? '—' },
        autorId: leaderUserId,
      }).catch(() => {});
      try {
        await notifyTicketEvent(requestId, 'ASSIGNEE_CHANGED', { assigneeId: leaderUserId });
      } catch (_) {}
    }
    const { registrarMudanca } = await import('../lib/auditLog');
    await registrarMudanca({
      tipo: 'VPN_LEADER_REJECTED',
      entidadeTipo: 'Request',
      entidadeId: requestId,
      descricao: 'Líder recusou solicitação de Acesso a VPN',
      dadosDepois: { ownerRejectedBy: leaderSlackId },
      autorId: req.requesterId ?? undefined
    }).catch(() => {});
    if (req.requester?.email) {
      try {
        const lookup = await client.users.lookupByEmail({ email: req.requester.email });
        if (lookup.user?.id) {
          await sendDmToSlackUser(
            client,
            lookup.user.id,
            '❌ Sua solicitação de Acesso a VPN foi recusada pelo seu líder.'
          );
        }
      } catch (_) {}
    }
  }
});

// ——— JML: handlers de confirmação (ack < 3s, processar assíncrono) ———

function runAsync(fn: () => Promise<void>) {
  setImmediate(() => fn().catch((e) => console.error('[JML async]', e)));
}

async function processOffboardingRevokeButton(b: any, client: WebClient): Promise<void> {
  const value = b.actions?.[0]?.value;
  const clickerSlackId = b.user?.id;
  if (!value || !clickerSlackId) return;
  let requestId: string;
  let toolId: string;
  try {
    const parsed = JSON.parse(value);
    requestId = parsed.requestId;
    toolId = parsed.toolId;
  } catch (_) {
    console.warn('[offboarding_revoke_confirm] value inválido:', value);
    return;
  }
  try {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: { owner: { select: { id: true, name: true, email: true } }, subOwner: { select: { id: true } } }
    });
    if (!request || !tool) {
      console.warn('[offboarding_revoke_confirm] Request ou Tool não encontrado:', requestId, toolId);
      return;
    }
    if (!OFFBOARDING_REQUEST_TYPES.includes(request.type)) {
      console.warn('[offboarding_revoke_confirm] Chamado não é de desligamento:', request.type);
      return;
    }
    let clickerUserId: string | null = null;
    let clickerName = '';
    let clickerProfile: string | null = null;
    try {
      const info = await client.users.info({ user: clickerSlackId });
      const email = info.user?.profile?.email;
      if (email) {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, systemProfile: true }
        });
        if (user) {
          clickerUserId = user.id;
          clickerName = user.name || '';
          clickerProfile = user.systemProfile;
        }
      }
    } catch (_) {}
    const isOwner = clickerUserId && (tool.ownerId === clickerUserId || tool.subOwnerId === clickerUserId);
    const isAdmin = clickerProfile && ['ADMIN', 'SUPER_ADMIN'].includes(clickerProfile);
    if (!isOwner && !isAdmin) {
      try {
        await client.chat.postEphemeral({
          channel: b.channel?.id || clickerSlackId,
          user: clickerSlackId,
          text: '⚠️ Apenas o Owner/Sub-owner da ferramenta ou um Admin podem confirmar esta revogação.'
        });
      } catch (_) {}
      return;
    }
    const ownerName = tool.owner?.name || clickerName || 'Owner';
    let detailsObj: Record<string, unknown> = {};
    try {
      detailsObj = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
    } catch (_) {}
    const confirmations = Array.isArray(detailsObj.revocationConfirmations) ? (detailsObj.revocationConfirmations as any[]) : [];
    if (confirmations.some((c: any) => c.toolId === toolId)) {
      try {
        await client.chat.postEphemeral({
          channel: b.channel?.id || clickerSlackId,
          user: clickerSlackId,
          text: '✅ Esta revogação já foi confirmada anteriormente.'
        });
      } catch (_) {}
      return;
    }
    confirmations.push({
      toolId: tool.id,
      toolName: tool.name,
      ownerSlackId: clickerSlackId,
      ownerName,
      confirmedAt: new Date().toISOString()
    });
    detailsObj.revocationConfirmations = confirmations;
    await prisma.request.update({
      where: { id: requestId },
      data: {
        details: JSON.stringify(detailsObj),
        status: 'ACESSOS_REVOGADOS_OWNER'
      }
    });
    const colaboradorName = (detailsObj.collaboratorName as string) || (detailsObj.info as string)?.toString().replace(/^[^:]+:\s*/, '') || 'Colaborador';
    const tsBrt = formatTimestampBrt();
    await slackUpdateInteractiveMessage(
      client,
      b,
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Revogação confirmada.* Obrigado, *${ownerName}*! (${tsBrt} BRT)`
          }
        },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${requestId.slice(0, 8)} · Theris` }] }
      ],
      `Revogação confirmada — ${tool.name}`
    );
    try {
      await notificarConfirmacaoRevogacaoDesligamento(ownerName, tool.name, colaboradorName, requestId);
    } catch (notifErr) {
      console.error('[offboarding_revoke_confirm] Falha ao notificar Luan/Grupo (DB já atualizado):', notifErr);
    }
    try {
      await client.chat.postEphemeral({
        channel: b.channel?.id || clickerSlackId,
        user: clickerSlackId,
        text: `✅ Confirmação registrada. O time de SI foi notificado.`
      });
    } catch (_) {}
  } catch (e) {
    console.error('[offboarding_revoke_confirm] Erro:', e);
  }
}

async function processHiringAccessConfirmation(b: any, client: WebClient): Promise<void> {
  const value = b.actions?.[0]?.value;
  const clickerSlackId = b.user?.id;
  if (!value || !clickerSlackId) return;
  let solicitacaoId: string;
  let toolId: string;
  let colaboradorUserId: string | undefined;
  let ownerIdFromPayload: string | undefined;
  try {
    const parsed = JSON.parse(value);
    solicitacaoId = parsed.solicitacaoId || parsed.requestId;
    toolId = parsed.toolId;
    colaboradorUserId = typeof parsed.userId === 'string' ? parsed.userId : undefined;
    ownerIdFromPayload = typeof parsed.ownerId === 'string' ? parsed.ownerId : undefined;
  } catch (_) {
    console.warn('[hiring_access] value inválido:', value);
    return;
  }
  if (!solicitacaoId || !toolId) return;

  try {
    const request = await prisma.request.findUnique({ where: { id: solicitacaoId } });
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: { owner: { select: { id: true, name: true, email: true } }, subOwner: { select: { id: true } } }
    });
    if (!request || !tool) return;
    if (!ONBOARDING_REQUEST_TYPES_SLACK.includes(request.type)) return;

    let detailsObj: Record<string, unknown> = {};
    try {
      detailsObj = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
    } catch (_) {}

    if (!colaboradorUserId) {
      const email = (detailsObj.collaboratorEmail || detailsObj.email || detailsObj.targetEmail) as string | undefined;
      if (email?.trim()) {
        const u = await prisma.user.findUnique({ where: { email: email.trim() }, select: { id: true } });
        if (u) colaboradorUserId = u.id;
      }
    }
    if (!colaboradorUserId && (detailsObj.collaboratorName || detailsObj.Colaborador)) {
      const nm = String(detailsObj.collaboratorName || detailsObj.Colaborador).trim();
      if (nm) {
        const u = await prisma.user.findFirst({
          where: { isActive: true, name: { equals: nm, mode: 'insensitive' } },
          select: { id: true }
        });
        if (u) colaboradorUserId = u.id;
      }
    }

    let clickerUserId: string | null = null;
    let clickerName = '';
    let clickerProfile: string | null = null;
    try {
      const info = await client.users.info({ user: clickerSlackId });
      const email = info.user?.profile?.email;
      if (email) {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, systemProfile: true }
        });
        if (user) {
          clickerUserId = user.id;
          clickerName = user.name || '';
          clickerProfile = user.systemProfile;
        }
      }
    } catch (_) {}

    const isOwner = clickerUserId && (tool.ownerId === clickerUserId || tool.subOwnerId === clickerUserId);
    const isAdmin = clickerProfile && ['ADMIN', 'SUPER_ADMIN'].includes(clickerProfile);
    if (!isOwner && !isAdmin) {
      try {
        await client.chat.postEphemeral({
          channel: b.channel?.id || clickerSlackId,
          user: clickerSlackId,
          text: '⚠️ Apenas o Owner/Sub-owner da ferramenta ou um Admin podem confirmar.'
        });
      } catch (_) {}
      return;
    }

    if (ownerIdFromPayload && tool.ownerId && ownerIdFromPayload !== tool.ownerId) {
      try {
        await client.chat.postEphemeral({
          channel: b.channel?.id || clickerSlackId,
          user: clickerSlackId,
          text: '⚠️ Este botão não corresponde ao Owner atual da ferramenta.'
        });
      } catch (_) {}
      return;
    }

    const hiringConf = Array.isArray(detailsObj.hiringAccessConfirmations) ? (detailsObj.hiringAccessConfirmations as any[]) : [];
    if (hiringConf.some((c: any) => c.toolId === toolId)) {
      try {
        await client.chat.postEphemeral({
          channel: b.channel?.id || clickerSlackId,
          user: clickerSlackId,
          text: '✅ Este provisionamento já foi confirmado anteriormente.'
        });
      } catch (_) {}
      return;
    }

    const ownerName = tool.owner?.name || clickerName || 'Owner';
    const colaboradorName =
      (detailsObj.collaboratorName as string) ||
      (detailsObj.Colaborador as string) ||
      (detailsObj.name as string) ||
      'Colaborador';

    hiringConf.push({
      toolId: tool.id,
      toolName: tool.name,
      ownerSlackId: clickerSlackId,
      ownerName,
      colaboradorUserId: colaboradorUserId ?? null,
      confirmedAt: new Date().toISOString()
    });
    detailsObj.hiringAccessConfirmations = hiringConf;

    await prisma.request.update({
      where: { id: solicitacaoId },
      data: { details: JSON.stringify(detailsObj) }
    });

    const { registrarMudanca } = await import('../lib/auditLog');
    await registrarMudanca({
      tipo: 'HIRING_ACCESS_CONFIRMED',
      entidadeTipo: 'Request',
      entidadeId: solicitacaoId,
      descricao: `Owner ${ownerName} confirmou acesso liberado para ${colaboradorName} em ${tool.name}`,
      dadosDepois: {
        ownerName,
        toolName: tool.name,
        colaboradorName,
        colaboradorUserId: colaboradorUserId ?? null,
        confirmedAt: new Date().toISOString()
      },
      autorId: clickerUserId ?? undefined
    });

    const tsBrt = formatTimestampBrt();
    await slackUpdateInteractiveMessage(
      client,
      b,
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Acesso liberado confirmado.* Obrigado, *${ownerName}*! (${tsBrt} BRT)`
          }
        },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${solicitacaoId.slice(0, 8)} · Theris` }] }
      ],
      `Acesso liberado confirmado — ${tool.name}`
    );

    try {
      await client.chat.postEphemeral({
        channel: b.channel?.id || clickerSlackId,
        user: clickerSlackId,
        text: '✅ Confirmação registrada no Theris.'
      });
    } catch (_) {}
  } catch (e) {
    console.error('[hiring_access] Erro:', e);
  }
}

// TODO: remover handler offboarding_revoke_confirm após confirmar que não há
// mais mensagens pendentes com esse action_id (verificar logs por 30 dias após deploy).
// Novas DMs de offboarding usam leaver_access_done.
slackApp.action('offboarding_revoke_confirm', async ({ ack, body, client }) => {
  await ack();
  runAsync(async () => {
    console.warn(
      '[DEPRECATED] Handler offboarding_revoke_confirm recebido. ' +
        'Este action_id é legado — novas DMs usam leaver_access_done. ' +
        'Remover após confirmar ausência de mensagens pendentes (verificar logs por 30 dias).'
    );
    await processOffboardingRevokeButton(body as any, client);
  });
});

// Contratação: Owner confirmou "✅ Acesso Liberado"
slackApp.action('hiring_access_confirmed', async ({ ack, body, client }) => {
  await ack();
  runAsync(async () => {
    await processHiringAccessConfirmation(body as any, client);
  });
});

// Joiner (mensagens antigas): mesmo processamento que hiring_access_confirmed
slackApp.action('joiner_access_done', async ({ ack, body, client }) => {
  await ack();
  runAsync(async () => {
    await processHiringAccessConfirmation(body as any, client);
  });
});

// Mudança de Cargo: Owner confirmou "Nível Ajustado"
slackApp.action('cargo_review_done', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const value = b.actions?.[0]?.value;
  const clickerSlackId = b.user?.id;
  if (!value || !clickerSlackId) return;
  let requestId: string;
  let toolId: string;
  try {
    const parsed = JSON.parse(value);
    requestId = parsed.requestId;
    toolId = parsed.toolId;
  } catch (_) {
    return;
  }
  runAsync(async () => {
    try {
      const request = await prisma.request.findUnique({ where: { id: requestId } });
      const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        include: { owner: { select: { name: true } } }
      });
      if (!request || !tool) return;
      let clickerUserId: string | null = null;
      try {
        const info = await client.users.info({ user: clickerSlackId });
        const email = info.user?.profile?.email;
        if (email) {
          const u = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
          if (u) clickerUserId = u.id;
        }
      } catch (_) {}
      const ownerName = tool.owner?.name || 'Owner';
      let colaboradorName = 'Colaborador';
      let cargoAnterior = '';
      let cargoNovo = '';
      try {
        const d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
        colaboradorName = (d.collaboratorName || d.info || 'Colaborador')?.toString().replace(/^[^:]+:\s*/, '') || 'Colaborador';
        const curr = d.current as Record<string, string> | undefined;
        const fut = d.future as Record<string, string> | undefined;
        cargoAnterior = curr?.role || '';
        cargoNovo = fut?.role || '';
      } catch (_) {}
      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'CARGO_REVIEW_CONCLUIDO',
        entidadeTipo: 'Request',
        entidadeId: requestId,
        descricao: `Owner ${ownerName} confirmou ajuste de nível de ${colaboradorName} em ${tool.name}. Cargo anterior: ${cargoAnterior} → Novo: ${cargoNovo}`,
        dadosDepois: { ownerName, toolName: tool.name, colaboradorName, cargoAnterior, cargoNovo, confirmedAt: new Date().toISOString() },
        autorId: clickerUserId ?? undefined
      });
      const now = new Date();
      const dataHora = now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const text = `✅ *Mudança de Cargo Concluída*\n\nO Owner *${ownerName}* confirmou o ajuste de nível de acesso de *${colaboradorName}* em *${tool.name}*.\nCargo anterior: ${cargoAnterior} → Novo cargo: ${cargoNovo}\n🕒 ${dataHora}`;
      const targets: string[] = [];
      if (SLACK_ID_LUAN) targets.push(SLACK_ID_LUAN);
      if (SLACK_ID_RENATA) targets.push(SLACK_ID_RENATA);
      if (SLACK_SI_CHANNEL_ID) targets.push(SLACK_SI_CHANNEL_ID);
      for (const ch of targets) {
        try {
          await client.chat.postMessage({ channel: ch, text });
        } catch (e) {
          console.error('[cargo_review_done] Notify:', e);
        }
      }
      try {
        await client.chat.postEphemeral({ channel: b.channel?.id || clickerSlackId, user: clickerSlackId, text: '✅ Confirmação registrada. O time de SI foi notificado.' });
      } catch (_) {}
    } catch (e) {
      console.error('[cargo_review_done] Erro:', e);
    }
  });
});

// Mudança de Departamento: Owner confirmou (revogação / provisionamento / revisão)
slackApp.action('dept_review_done', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const value = b.actions?.[0]?.value;
  const clickerSlackId = b.user?.id;
  if (!value || !clickerSlackId) return;
  let requestId: string;
  let toolId: string;
  let tipo: string;
  try {
    const parsed = JSON.parse(value);
    requestId = parsed.requestId;
    toolId = parsed.toolId;
    tipo = parsed.tipo || 'revisao';
  } catch (_) {
    return;
  }
  runAsync(async () => {
    try {
      const request = await prisma.request.findUnique({ where: { id: requestId } });
      const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        include: { owner: { select: { name: true } } }
      });
      if (!request || !tool) return;
      const ownerName = tool.owner?.name || 'Owner';
      let colaboradorName = 'Colaborador';
      let deptAnterior = '';
      let deptNovo = '';
      try {
        const d = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
        colaboradorName = (d.collaboratorName || d.info || 'Colaborador')?.toString().replace(/^[^:]+:\s*/, '') || 'Colaborador';
        const curr = d.current as Record<string, string> | undefined;
        const fut = d.future as Record<string, string> | undefined;
        deptAnterior = curr?.dept || '';
        deptNovo = fut?.dept || '';
      } catch (_) {}
      const tipoLabel = tipo === 'revogacao' ? 'Revogação' : tipo === 'provisionamento' ? 'Provisionamento' : 'Revisão';
      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'DEPT_REVIEW_CONCLUIDO',
        entidadeTipo: 'Request',
        entidadeId: requestId,
        descricao: `Owner ${ownerName} confirmou ação de acesso de ${colaboradorName} em ${tool.name}. Tipo: ${tipoLabel}`,
        dadosDepois: { ownerName, toolName: tool.name, colaboradorName, tipo, deptAnterior, deptNovo, confirmedAt: new Date().toISOString() },
        autorId: undefined
      });
      const now = new Date();
      const dataHora = now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const text = `✅ *Mudança de Departamento Concluída*\n\nO Owner *${ownerName}* confirmou a ação de acesso de *${colaboradorName}* em *${tool.name}*.\nTipo: ${tipoLabel}\nDepto anterior: ${deptAnterior} → Novo depto: ${deptNovo}\n🕒 ${dataHora}`;
      const targets: string[] = [];
      if (SLACK_ID_LUAN) targets.push(SLACK_ID_LUAN);
      if (SLACK_ID_RENATA) targets.push(SLACK_ID_RENATA);
      if (SLACK_SI_CHANNEL_ID) targets.push(SLACK_SI_CHANNEL_ID);
      for (const ch of targets) {
        try {
          await client.chat.postMessage({ channel: ch, text });
        } catch (e) {
          console.error('[dept_review_done] Notify:', e);
        }
      }
      try {
        await client.chat.postEphemeral({ channel: b.channel?.id || clickerSlackId, user: clickerSlackId, text: '✅ Confirmação registrada. O time de SI foi notificado.' });
      } catch (_) {}
    } catch (e) {
      console.error('[dept_review_done] Erro:', e);
    }
  });
});

// Leaver: Owner confirmou "Acesso Revogado" (action_id leaver_access_done)
slackApp.action('leaver_access_done', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const value = b.actions?.[0]?.value;
  const clickerSlackId = b.user?.id;
  if (!value || !clickerSlackId) return;
  let requestId: string;
  let toolId: string;
  try {
    const parsed = JSON.parse(value);
    requestId = parsed.requestId;
    toolId = parsed.toolId;
  } catch (_) {
    return;
  }
  runAsync(async () => {
    try {
      const request = await prisma.request.findUnique({ where: { id: requestId } });
      const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        include: { owner: { select: { id: true, name: true, email: true } } }
      });
      if (!request || !tool) return;
      if (!OFFBOARDING_REQUEST_TYPES.includes(request.type)) return;
      let clickerUserId: string | null = null;
      let clickerName = '';
      let clickerProfile: string | null = null;
      try {
        const info = await client.users.info({ user: clickerSlackId });
        const email = info.user?.profile?.email;
        if (email) {
          const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, systemProfile: true } });
          if (user) {
            clickerUserId = user.id;
            clickerName = user.name || '';
            clickerProfile = user.systemProfile;
          }
        }
      } catch (_) {}
      const isOwner = clickerUserId && (tool.ownerId === clickerUserId || tool.subOwnerId === clickerUserId);
      const isAdmin = clickerProfile && ['ADMIN', 'SUPER_ADMIN'].includes(clickerProfile);
      if (!isOwner && !isAdmin) {
        try {
          await client.chat.postEphemeral({
            channel: b.channel?.id || clickerSlackId,
            user: clickerSlackId,
            text: '⚠️ Apenas o Owner/Sub-owner da ferramenta ou um Admin podem confirmar esta revogação.'
          });
        } catch (_) {}
        return;
      }
      const ownerName = tool.owner?.name || clickerName || 'Owner';
      let detailsObj: Record<string, unknown> = {};
      try {
        detailsObj = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
      } catch (_) {}
      const confirmations = Array.isArray(detailsObj.revocationConfirmations) ? (detailsObj.revocationConfirmations as any[]) : [];
      if (confirmations.some((c: any) => c.toolId === toolId)) {
        try {
          await client.chat.postEphemeral({
            channel: b.channel?.id || clickerSlackId,
            user: clickerSlackId,
            text: '✅ Esta revogação já foi confirmada anteriormente.'
          });
        } catch (_) {}
        return;
      }
      confirmations.push({
        toolId: tool.id,
        toolName: tool.name,
        ownerSlackId: clickerSlackId,
        ownerName,
        confirmedAt: new Date().toISOString()
      });
      detailsObj.revocationConfirmations = confirmations;
      await prisma.request.update({
        where: { id: requestId },
        data: {
          details: JSON.stringify(detailsObj),
          status: 'ACESSOS_REVOGADOS_OWNER'
        }
      });
      const colaboradorName = (detailsObj.collaboratorName as string) || (detailsObj.info as string)?.toString().replace(/^[^:]+:\s*/, '') || 'Colaborador';
      const tsBrt = formatTimestampBrt();
      await slackUpdateInteractiveMessage(
        client,
        b,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Revogação confirmada.* Obrigado, *${ownerName}*! (${tsBrt} BRT)`
            }
          },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${requestId.slice(0, 8)} · Theris` }] }
        ],
        `Revogação confirmada — ${tool.name}`
      );
      await notificarConfirmacaoLeaverConcluido(ownerName, tool.name, colaboradorName, requestId);
      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'LEAVER_CONCLUIDO',
        entidadeTipo: 'Request',
        entidadeId: requestId,
        descricao: `Owner ${ownerName} confirmou revogação de ${colaboradorName} em ${tool.name}`,
        dadosDepois: { ownerName, toolName: tool.name, colaboradorName, confirmedAt: new Date().toISOString() },
        autorId: clickerUserId ?? undefined
      });
      try {
        await client.chat.postEphemeral({
          channel: b.channel?.id || clickerSlackId,
          user: clickerSlackId,
          text: '✅ Confirmação registrada. O time de SI foi notificado.'
        });
      } catch (_) {}
    } catch (e) {
      console.error('[leaver_access_done] Erro:', e);
    }
  });
});

// Leaver: Owner confirmou revogação de Acesso Extraordinário (mesmo padrão que leaver_access_done)
slackApp.action('leaver_aex_done', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const value = b.actions?.[0]?.value;
  const clickerSlackId = b.user?.id;
  if (!value || !clickerSlackId) return;
  let requestId: string;
  let toolId: string;
  let userId: string;
  try {
    const parsed = JSON.parse(value);
    requestId = parsed.requestId;
    toolId = parsed.toolId;
    userId = parsed.userId;
  } catch (_) {
    return;
  }
  if (!requestId || !toolId || !userId) return;

  runAsync(async () => {
    try {
      const request = await prisma.request.findUnique({ where: { id: requestId } });
      const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        include: { owner: { select: { id: true, name: true, email: true } } }
      });
      if (!request || !tool) return;
      if (!OFFBOARDING_REQUEST_TYPES.includes(request.type)) return;

      let clickerUserId: string | null = null;
      let clickerName = '';
      let clickerProfile: string | null = null;
      try {
        const info = await client.users.info({ user: clickerSlackId });
        const email = info.user?.profile?.email;
        if (email) {
          const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, systemProfile: true } });
          if (user) {
            clickerUserId = user.id;
            clickerName = user.name || '';
            clickerProfile = user.systemProfile;
          }
        }
      } catch (_) {}

      const isOwner = clickerUserId && (tool.ownerId === clickerUserId || tool.subOwnerId === clickerUserId);
      const isAdmin = clickerProfile && ['ADMIN', 'SUPER_ADMIN'].includes(clickerProfile);
      if (!isOwner && !isAdmin) {
        try {
          await client.chat.postEphemeral({
            channel: b.channel?.id || clickerSlackId,
            user: clickerSlackId,
            text: '⚠️ Apenas o Owner/Sub-owner da ferramenta ou um Admin podem confirmar esta revogação.'
          });
        } catch (_) {}
        return;
      }

      let detailsObj: Record<string, unknown> = {};
      try {
        detailsObj = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
      } catch (_) {}

      const aexConfirmations = Array.isArray(detailsObj.aexRevocationConfirmations)
        ? (detailsObj.aexRevocationConfirmations as any[])
        : [];
      if (aexConfirmations.some((c: any) => c.toolId === toolId && c.userId === userId)) {
        try {
          await client.chat.postEphemeral({
            channel: b.channel?.id || clickerSlackId,
            user: clickerSlackId,
            text: '✅ Esta confirmação (AEX) já foi registrada anteriormente.'
          });
        } catch (_) {}
        return;
      }

      const ownerName = tool.owner?.name || clickerName || 'Owner';
      aexConfirmations.push({
        toolId: tool.id,
        userId,
        toolName: tool.name,
        ownerSlackId: clickerSlackId,
        ownerName,
        confirmedAt: new Date().toISOString()
      });
      detailsObj.aexRevocationConfirmations = aexConfirmations;

      await prisma.request.update({
        where: { id: requestId },
        data: {
          details: JSON.stringify(detailsObj),
          status: 'ACESSOS_REVOGADOS_OWNER'
        }
      });

      const colaboradorName =
        (detailsObj.collaboratorName as string) ||
        (detailsObj.info as string)?.toString().replace(/^[^:]+:\s*/, '') ||
        'Colaborador';
      const tsBrt = formatTimestampBrt();
      await slackUpdateInteractiveMessage(
        client,
        b,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Revogação (AEX) confirmada.* Obrigado, *${ownerName}*! (${tsBrt} BRT)`
            }
          },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${requestId.slice(0, 8)} · Theris` }] }
        ],
        `Revogação AEX confirmada — ${tool.name}`
      );

      await notificarConfirmacaoLeaverConcluido(ownerName, tool.name, colaboradorName, requestId);

      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'LEAVER_CONCLUIDO',
        entidadeTipo: 'Request',
        entidadeId: requestId,
        descricao: `Owner ${ownerName} confirmou revogação AEX de ${colaboradorName} em ${tool.name}`,
        dadosDepois: {
          ownerName,
          toolName: tool.name,
          colaboradorName,
          kind: 'aex_extraordinary',
          confirmedAt: new Date().toISOString()
        },
        autorId: clickerUserId ?? undefined
      });

      try {
        await client.chat.postEphemeral({
          channel: b.channel?.id || clickerSlackId,
          user: clickerSlackId,
          text: '✅ Confirmação registrada. O time de SI foi notificado.'
        });
      } catch (_) {}
    } catch (e) {
      console.error('[leaver_aex_done] Erro:', e);
    }
  });
});

// Revisão trimestral de acessos: Owner clica em "Revisão Concluída" — responder < 3s e processar em background
slackApp.action('review_completed', async ({ ack, body, client }) => {
  await ack();
  const b = body as any;
  const value = b.actions?.[0]?.value as string | undefined;
  const clickerSlackId = b.user?.id;
  if (!value || !clickerSlackId) return;
  const toolIds = value.split(',').map((id: string) => id.trim()).filter(Boolean);
  if (toolIds.length === 0) return;

  setImmediate(async () => {
    try {
      const now = new Date();
      const nextReview = new Date(now);
      nextReview.setDate(nextReview.getDate() + 90);

      const tools = await prisma.tool.findMany({
        where: { id: { in: toolIds } },
        include: { owner: { select: { name: true } } }
      });
      if (tools.length === 0) return;

      for (const id of toolIds) {
        // lastReviewAt/nextReviewAt adicionados na migration add_tool_review_fields
        await prisma.tool.update({
          where: { id },
          data: { lastReviewAt: now, nextReviewAt: nextReview } as any
        });
      }

      const ownerName = tools[0]?.owner?.name || 'Owner';
      const toolNames = tools.map((t) => t.name);

      const { registrarMudanca } = await import('../lib/auditLog');
      await registrarMudanca({
        tipo: 'REVISAO_ACESSOS',
        entidadeTipo: 'Tool',
        entidadeId: toolIds[0] ?? 'multiple',
        descricao: `Revisão trimestral concluída pelo Owner ${ownerName}. Ferramentas: ${toolNames.join(', ')}`,
        dadosDepois: { toolIds, ownerName, completedAt: now.toISOString() }
      });

      try {
        await notificarRevisaoTrimestralConcluida(ownerName, toolNames, now);
      } catch (notifErr) {
        console.error('[review_completed] Falha ao notificar Luan/SI (DB já atualizado):', notifErr);
      }
    } catch (e) {
      console.error('[review_completed] Erro no processamento assíncrono:', e);
    }
  });
});

// Handlers de Submissão — Movimentação
slackApp.view('submit_move_dept', async ({ ack, body, view, client }) => {
  const v = view.state.values;
  const errs: Record<string, string> = {};
  const reqSel = (bid: string, val: string | undefined, msg: string) => {
    if (!val || isPessoasSelectPlaceholder(val)) errs[bid] = msg;
  };
  reqSel('blk_curr_unit', v.blk_curr_unit?.move_dept_curr_unit?.selected_option?.value, 'Selecione a unidade (situação atual).');
  reqSel('blk_curr_dept', v.blk_curr_dept?.move_dept_curr_dept?.selected_option?.value, 'Selecione o departamento atual.');
  reqSel('blk_curr_role', v.blk_curr_role?.move_dept_curr_role?.selected_option?.value, 'Selecione o cargo atual.');
  reqSel('blk_new_unit', v.blk_new_unit?.move_dept_new_unit?.selected_option?.value, 'Selecione a unidade (situação nova).');
  reqSel('blk_new_dept', v.blk_new_dept?.move_dept_new_dept?.selected_option?.value, 'Selecione o novo departamento.');
  reqSel('blk_new_role', v.blk_new_role?.move_dept_new_role?.selected_option?.value, 'Selecione o novo cargo.');
  if (Object.keys(errs).length > 0) {
    await ack({ response_action: 'errors', errors: errs });
    return;
  }
  await ack();
  const name = v.blk_name.inp.value;
  const currRoleP = parsePessoasPipeSelect(v.blk_curr_role.move_dept_curr_role.selected_option?.value);
  const currDeptP = parsePessoasPipeSelect(v.blk_curr_dept.move_dept_curr_dept.selected_option?.value);
  const newUnitP = parsePessoasPipeSelect(v.blk_new_unit.move_dept_new_unit.selected_option?.value);
  const newDeptP = parsePessoasPipeSelect(v.blk_new_dept.move_dept_new_dept.selected_option?.value);
  const newRoleP = parsePessoasPipeSelect(v.blk_new_role.move_dept_new_role.selected_option?.value);
  const roleSelectVal = newRoleP ? `${newRoleP.id}|${newRoleP.name}` : '';
  const deptSelectVal = newDeptP ? `${newDeptP.id}|${newDeptP.name}` : '';
  const [newRoleId, newRoleName] = roleSelectVal.includes('|') ? roleSelectVal.split('|', 2) : [roleSelectVal, ''];
  const [newDepartmentId, newDeptName] = deptSelectVal.includes('|') ? deptSelectVal.split('|', 2) : [deptSelectVal, ''];
  const actionDate = v.data_acao?.picker?.selected_date ?? null;
  const managerCurr = v.blk_manager_curr?.inp?.value?.trim();
  const managerFut = v.blk_manager_fut?.inp?.value?.trim();
  const unitValue =
    newUnitP && newUnitP.id !== '__noid__' ? newUnitP.id : undefined;
  const details: Record<string, unknown> = {
    info: `Mudança de Departamento: ${name}`,
    collaboratorName: name,
    subtipo: 'MUDANCA_DEPARTAMENTO',
    unitId: unitValue,
    unit: newUnitP?.name,
    current: { role: currRoleP?.name ?? '', dept: currDeptP?.name ?? '' },
    future: {
      role: newRoleName || roleSelectVal,
      dept: newDeptName || deptSelectVal,
      ...(unitValue && { unitId: unitValue })
    },
    reason: v.blk_reason.inp.value ?? '',
    managerCurrent: managerCurr || undefined,
    managerNew: managerFut || undefined,
    ...(actionDate && { actionDate })
  };
  if (newRoleId) details.newRoleId = newRoleId;
  if (newRoleName) details.newRoleName = newRoleName;
  if (newDepartmentId) details.newDepartmentId = newDepartmentId;
  if (newDeptName) details.newDeptName = newDeptName;
  await saveRequest(body, client, 'CHANGE_ROLE', details, v.blk_reason.inp.value!, `✅ Solicitação de mudança de departamento para *${name}* criada com sucesso.`, false, actionDate);
});

slackApp.view('submit_move_cargo', async ({ ack, body, view, client }) => {
  const v = view.state.values;
  const errs: Record<string, string> = {};
  const reqSel = (bid: string, val: string | undefined, msg: string) => {
    if (!val || isPessoasSelectPlaceholder(val)) errs[bid] = msg;
  };
  reqSel('blk_mc_unit', v.blk_mc_unit?.mc_unit_select?.selected_option?.value, 'Selecione a unidade.');
  reqSel('blk_mc_dept', v.blk_mc_dept?.mc_dept_select?.selected_option?.value, 'Selecione o departamento.');
  reqSel('blk_mc_role_curr', v.blk_mc_role_curr?.mc_role_curr_select?.selected_option?.value, 'Selecione o cargo atual.');
  reqSel('blk_mc_role_fut', v.blk_mc_role_fut?.mc_role_fut_select?.selected_option?.value, 'Selecione o novo cargo.');
  if (Object.keys(errs).length > 0) {
    await ack({ response_action: 'errors', errors: errs });
    return;
  }
  await ack();
  const name = v.blk_name.inp.value;
  const unitP = parsePessoasPipeSelect(v.blk_mc_unit.mc_unit_select.selected_option?.value);
  const deptP = parsePessoasPipeSelect(v.blk_mc_dept.mc_dept_select.selected_option?.value);
  const currRoleP = parsePessoasPipeSelect(v.blk_mc_role_curr.mc_role_curr_select.selected_option?.value);
  const futRoleP = parsePessoasPipeSelect(v.blk_mc_role_fut.mc_role_fut_select.selected_option?.value);
  const unitValue = unitP && unitP.id !== '__noid__' ? unitP.id : undefined;
  const deptSelectVal = deptP ? `${deptP.id}|${deptP.name}` : '';
  const roleSelectVal = futRoleP ? `${futRoleP.id}|${futRoleP.name}` : '';
  const [newDepartmentId, newDeptName] = deptSelectVal.includes('|') ? deptSelectVal.split('|', 2) : [deptSelectVal, ''];
  const [newRoleId, newRoleName] = roleSelectVal.includes('|') ? roleSelectVal.split('|', 2) : [roleSelectVal, ''];
  const deptDisplay = newDeptName || deptSelectVal;
  const actionDate = v.data_acao?.picker?.selected_date ?? null;
  const managerCurr = v.blk_manager_curr?.inp?.value?.trim();
  const managerFut = v.blk_manager_fut?.inp?.value?.trim();
  const details: Record<string, unknown> = {
    info: `Mudança de Cargo: ${name}`,
    collaboratorName: name,
    subtipo: 'MUDANCA_CARGO',
    unitId: unitValue,
    unit: unitP?.name,
    current: { role: currRoleP?.name ?? '', dept: deptDisplay },
    future: {
      role: newRoleName || roleSelectVal,
      dept: deptDisplay,
      ...(unitValue && { unitId: unitValue })
    },
    reason: v.blk_reason.inp.value ?? '',
    managerCurrent: managerCurr || undefined,
    managerNew: managerFut || undefined,
    ...(actionDate && { actionDate })
  };
  if (newRoleId) details.newRoleId = newRoleId;
  if (newRoleName) details.newRoleName = newRoleName;
  if (newDepartmentId) details.newDepartmentId = newDepartmentId;
  if (newDeptName) details.newDeptName = newDeptName;
  await saveRequest(body, client, 'CHANGE_ROLE', details, v.blk_reason.inp.value!, `✅ Solicitação de mudança de cargo para *${name}* criada com sucesso.`, false, actionDate);
});

slackApp.view('submit_hire', async ({ ack, body, view, client }) => {
  const v = view.state.values;
  const errs: Record<string, string> = {};
  const reqSel = (bid: string, val: string | undefined, msg: string) => {
    if (!val || isPessoasSelectPlaceholder(val)) errs[bid] = msg;
  };
  reqSel('blk_hire_unit', v.blk_hire_unit?.hire_unit_select?.selected_option?.value, 'Selecione a unidade.');
  reqSel('blk_hire_dept', v.blk_hire_dept?.hire_dept_select?.selected_option?.value, 'Selecione o departamento.');
  reqSel('blk_hire_role', v.blk_hire_role?.hire_role_select?.selected_option?.value, 'Selecione o cargo.');
  const emailValue = v.blk_email?.inp?.value?.trim() || '';
  if (!emailValue) {
    errs.blk_email = 'Informe o e-mail corporativo.';
  }
  let mgrName = '';
  let mgrEmail = '';
  const hireMgrRaw = v.blk_hire_manager?.hire_manager_select?.selected_option?.value;
  if (v.blk_hire_manager?.hire_manager_select) {
    let decoded = decodeHireManagerSelectValue(hireMgrRaw);
    const idOnly = hireManagerSelectLeaderIdOnly(hireMgrRaw);
    if (!decoded && idOnly) {
      const u = await prisma.user.findUnique({
        where: { id: idOnly },
        select: { name: true, email: true }
      });
      if (u?.email?.trim()) {
        decoded = { id: idOnly, name: (u.name || '—').trim(), email: u.email.trim() };
      }
    }
    if (decoded) {
      mgrName = decoded.name.trim();
      mgrEmail = decoded.email.trim();
      if (!mgrName) errs.blk_hire_manager = 'Gestor sem nome cadastrado.';
      if (!mgrEmail) {
        errs.blk_hire_manager = 'Gestor sem e-mail cadastrado.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mgrEmail)) {
        errs.blk_hire_manager = 'E-mail do gestor inválido.';
      }
    } else {
      errs.blk_hire_manager = 'Selecione o gestor direto.';
    }
  } else {
    mgrName = v.blk_manager?.inp?.value?.trim() || '';
    if (!mgrName) errs.blk_manager = 'Informe o gestor direto.';
    mgrEmail = v.blk_manager_email?.inp?.value?.trim() || '';
    if (!mgrEmail) {
      errs.blk_manager_email = 'Informe o e-mail do gestor direto.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mgrEmail)) {
      errs.blk_manager_email = 'E-mail do gestor inválido.';
    }
  }
  const actionDate = v.blk_action_date?.picker?.selected_date;
  if (!actionDate) errs.blk_action_date = 'Selecione a data de ação.';
  if (!v.blk_contract_type?.inp_select?.selected_option?.value) {
    errs.blk_contract_type = 'Selecione o tipo de contratação.';
  }
  if (Object.keys(errs).length > 0) {
    await ack({ response_action: 'errors', errors: errs });
    return;
  }
  await ack();
  const name = v.blk_name.inp.value.trim();
  const unitP = parsePessoasPipeSelect(v.blk_hire_unit.hire_unit_select.selected_option?.value);
  const deptP = parsePessoasPipeSelect(v.blk_hire_dept.hire_dept_select.selected_option?.value);
  const roleP = parsePessoasPipeSelect(v.blk_hire_role.hire_role_select.selected_option?.value);
  const unitName = unitP?.name ?? '';
  const contractOpt = v.blk_contract_type?.inp_select?.selected_option;
  const details: Record<string, unknown> = {
    info: `Contratação: ${name}`,
    collaboratorName: name,
    fullName: name,
    startDate: actionDate,
    actionDate,
    unit: unitName,
    ...(unitP && unitP.id !== '__noid__' ? { unitId: unitP.id } : {}),
    role: roleP?.name ?? '',
    dept: deptP?.name ?? '',
    department: deptP?.name ?? '',
    ...(roleP ? { newRoleId: roleP.id } : {}),
    ...(deptP ? { newDepartmentId: deptP.id } : {}),
    managerName: mgrName,
    managerEmail: mgrEmail,
    corporateEmail: emailValue,
    collaboratorEmail: emailValue,
    contractType: contractOpt?.value ?? contractOpt?.text?.text ?? undefined,
    obs: v.blk_obs?.inp?.value?.trim() || undefined
  };
  await saveRequest(
    body,
    client,
    'HIRING',
    details,
    `Data de ação: ${actionDate}`,
    `✅ Contratação de *${name}* registrada. Aguardando aprovação do gestor direto (e-mail informado).`,
    false,
    actionDate
  );
});

slackApp.view('submit_fire', async ({ ack, body, view, client }) => {
  const v = view.state.values;
  const errs: Record<string, string> = {};
  const reqSel = (bid: string, val: string | undefined, msg: string) => {
    if (!val || isPessoasSelectPlaceholder(val)) errs[bid] = msg;
  };
  reqSel('blk_fire_unit', v.blk_fire_unit?.fire_unit_select?.selected_option?.value, 'Selecione a unidade.');
  reqSel('blk_fire_dept', v.blk_fire_dept?.fire_dept_select?.selected_option?.value, 'Selecione o departamento.');
  reqSel('blk_fire_role', v.blk_fire_role?.fire_role_select?.selected_option?.value, 'Selecione o cargo.');
  if (Object.keys(errs).length > 0) {
    await ack({ response_action: 'errors', errors: errs });
    return;
  }
  await ack();
  const name = v.blk_name.inp.value;
  const reason = v.blk_reason?.inp?.value ?? '';
  const actionDate = v.data_acao?.picker?.selected_date ?? null;
  const equipmentOpt = v.blk_equipment?.inp_select?.selected_option;
  const roleP = parsePessoasPipeSelect(v.blk_fire_role.fire_role_select.selected_option?.value);
  const deptP = parsePessoasPipeSelect(v.blk_fire_dept.fire_dept_select.selected_option?.value);
  const details: Record<string, unknown> = {
    info: `Desligamento: ${name}`,
    collaboratorName: name,
    role: roleP?.name ?? '',
    dept: deptP?.name ?? '',
    reason: reason || undefined,
    managerName: v.blk_manager?.inp?.value?.trim() || undefined,
    equipmentReturn: equipmentOpt?.value ?? equipmentOpt?.text?.text ?? undefined,
    obs: v.blk_obs?.inp?.value?.trim() || undefined,
    ...(actionDate && { actionDate })
  };
  await saveRequest(body, client, 'FIRING', details, reason || 'Desligamento', `⚠️ Desligamento de *${name}* registrado. Processo de offboarding iniciado.`, false, actionDate);
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

const INFRA_SUBMIT_SUBTYPES: readonly InfraRequestSubtype[] = [
  INFRA_REQUEST_SUBTYPES.HARDWARE,
  INFRA_REQUEST_SUBTYPES.SOFTWARE_PROBLEM,
  INFRA_REQUEST_SUBTYPES.NETWORK,
  INFRA_REQUEST_SUBTYPES.OTHER
];

function isInfraSubmitSubtype(v: unknown): v is InfraRequestSubtype {
  return typeof v === 'string' && (INFRA_SUBMIT_SUBTYPES as readonly string[]).includes(v);
}

slackApp.view('submit_infra', async ({ ack, body, view, client }) => {
  const userId = body.user?.id;
  console.log('[Chamado] submit_infra: view_submission recebido', { userId, callback_id: view?.callback_id });

  let tipo: InfraRequestSubtype | null = null;
  try {
    const metadata = JSON.parse(view.private_metadata || '{}') as { tipo?: unknown };
    if (isInfraSubmitSubtype(metadata.tipo)) tipo = metadata.tipo;
  } catch (e) {
    console.error('[submit_infra] private_metadata inválido:', e);
  }

  if (!tipo) {
    await ack({
      response_action: 'errors',
      errors: {
        blk_infra_desc:
          'Erro interno: tipo não identificado. Feche o modal e abra /infra novamente.'
      }
    });
    return;
  }

  const v = view.state?.values ?? {};
  const urgencyOpt = v.blk_infra_urgency?.inp?.selected_option;
  const typeLabel = INFRA_SUBTYPE_LABELS[tipo];
  const desc = v.blk_infra_desc?.inp?.value ?? '';
  const urgency = urgencyOpt?.value ?? '';
  const urgencyLabel = urgencyOpt?.text?.text ?? urgency;

  const details = {
    info: `Suporte de Infra: ${typeLabel}`,
    requestType: tipo,
    requestTypeLabel: typeLabel,
    description: desc,
    urgency,
    urgencyLabel
  };

  await ack();

  try {
    await saveRequest(
      body,
      client,
      'INFRA_SUPPORT',
      details,
      `Urgência: ${urgencyLabel}\n${desc}`,
      `✅ Sua solicitação de infraestrutura foi enviada com sucesso ao time de suporte.`
    );
  } catch (err) {
    console.error('[Chamado] submit_infra: erro ao salvar solicitação', err);
    try {
      if (userId) {
        await sendDmToSlackUser(
          client,
          userId,
          '❌ Não foi possível criar o chamado no painel. O time de SI foi notificado. Tente novamente ou abra o chamado pelo painel Theris.'
        );
      }
    } catch (dmErr) {
      console.error('[Chamado] submit_infra: falha ao enviar DM de erro', dmErr);
    }
  }
});

slackApp.view('submit_infra_root', async ({ ack, body, view, client }) => {
  const values = view.state.values;
  const empresaRaw = values.blk_root_empresa?.inp?.selected_option?.value;
  const osRaw = values.blk_root_os?.inp?.selected_option?.value;
  const patrimonio = values.blk_root_patrimonio?.inp?.value?.trim() ?? '';
  const hostnameCustom = values.blk_root_hostname_custom?.inp?.value?.trim() ?? '';
  const ttlQtdRaw = values.blk_root_ttl_qtd?.inp?.value?.trim() ?? '';
  const ttlUnidadeRaw = values.blk_root_ttl_unidade?.inp?.selected_option?.value;
  const justificativa = values.blk_root_justificativa?.inp?.value?.trim() ?? '';
  const urgenciaRaw = values.blk_root_urgencia?.inp?.selected_option?.value;

  const errors: Record<string, string> = {};
  const usouHostnameCustom = hostnameCustom.length > 0;

  if (!usouHostnameCustom) {
    if (!empresaRaw) errors.blk_root_empresa = 'Selecione a empresa';
    else if (!isTipoEmpresa(empresaRaw)) errors.blk_root_empresa = 'Empresa inválida';
    if (!osRaw) errors.blk_root_os = 'Selecione o sistema operacional';
    else if (!isTipoOS(osRaw)) errors.blk_root_os = 'Sistema operacional inválido';
    if (!patrimonio) errors.blk_root_patrimonio = 'Informe o patrimônio';
    else if (!/^\d+$/.test(patrimonio)) errors.blk_root_patrimonio = 'Patrimônio deve conter apenas números';
  }

  let qtd = 0;
  if (!ttlQtdRaw) {
    errors.blk_root_ttl_qtd = 'Informe a quantidade';
  } else {
    qtd = Number(ttlQtdRaw);
    if (!Number.isFinite(qtd) || qtd <= 0 || !Number.isInteger(qtd)) {
      errors.blk_root_ttl_qtd = 'Quantidade deve ser um número inteiro positivo';
    }
  }

  if (!ttlUnidadeRaw) {
    errors.blk_root_ttl_unidade = 'Selecione a unidade';
  } else if (!isTipoTTLUnidade(ttlUnidadeRaw)) {
    errors.blk_root_ttl_unidade = 'Unidade inválida';
  }

  let ttlSegundos = 0;
  if (!errors.blk_root_ttl_qtd && !errors.blk_root_ttl_unidade && ttlUnidadeRaw && isTipoTTLUnidade(ttlUnidadeRaw)) {
    ttlSegundos = qtd * TTL_UNIDADE_PARA_SEGUNDOS[ttlUnidadeRaw];
    if (ttlSegundos > TTL_MAX_SEGUNDOS) {
      errors.blk_root_ttl_qtd =
        'O teto máximo é 15 dias. Para períodos maiores, seu gestor precisa contatar o time de SI justificando.';
    }
  }

  if (!justificativa || justificativa.length < JUSTIFICATIVA_MIN_CHARS) {
    errors.blk_root_justificativa = `Justificativa deve ter no mínimo ${JUSTIFICATIVA_MIN_CHARS} caracteres descrevendo o motivo`;
  }

  if (!urgenciaRaw) {
    errors.blk_root_urgencia = 'Selecione a urgência';
  } else if (!isTipoUrgencia(urgenciaRaw)) {
    errors.blk_root_urgencia = 'Urgência inválida';
  }

  if (Object.keys(errors).length > 0) {
    await ack({ response_action: 'errors', errors });
    return;
  }

  const slackId = body.user.id;
  let requesterId: string | null = null;
  let requesterEmail: string | null = null;
  try {
    const info = await client.users.info({ user: slackId });
    const email = info.user?.profile?.email?.trim();
    if (email) {
      requesterEmail = email;
      const userDb = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (userDb) requesterId = userDb.id;
    }
  } catch (e) {
    console.error('[submit_infra_root] lookup requester:', e);
  }

  const empresa = empresaRaw && isTipoEmpresa(empresaRaw) ? empresaRaw : null;
  const os = osRaw && isTipoOS(osRaw) ? osRaw : null;
  const ttlUnidade = ttlUnidadeRaw as TipoTTLUnidade;
  const urgencia = urgenciaRaw as TipoUrgencia;

  let hostname: string;
  if (usouHostnameCustom) {
    hostname = hostnameCustom;
  } else {
    hostname = `3C-${empresa}-${os}-${patrimonio}`;
  }

  const jcErrors: Record<string, string> = {};
  let jumpcloudUserId: string | null = null;
  let jumpcloudDeviceId: string | null = null;

  if (!requesterEmail) {
    jcErrors.blk_root_justificativa = 'Não foi possível ler o e-mail do seu perfil Slack. Contate SI.';
  } else if (!hasJumpCloudCredentials()) {
    jcErrors.blk_root_justificativa =
      'Integração JumpCloud indisponível neste ambiente. Contate o time de SI.';
  } else {
    const jcUid = await getSystemUserIdByEmail(requesterEmail);
    if (!jcUid) {
      jcErrors.blk_root_justificativa = 'Seu usuário não está vinculado ao JumpCloud. Contate SI.';
    } else {
      jumpcloudUserId = jcUid;
      const deviceRes = await findDeviceByHostname(hostname);
      if (deviceRes.ok === false) {
        if (deviceRes.error === 'NOT_FOUND') {
          const msg = `Device \`${hostname}\` não encontrado no JumpCloud. Confira o patrimônio ou use hostname customizado.`;
          jcErrors[usouHostnameCustom ? 'blk_root_hostname_custom' : 'blk_root_patrimonio'] = msg;
        } else if (deviceRes.error === 'MULTIPLE') {
          if (deviceRes.candidates?.length) {
            const list = deviceRes.candidates.map((c) => `\`${c.displayName}\``).join(', ');
            const targetBlock = usouHostnameCustom ? 'blk_root_hostname_custom' : 'blk_root_patrimonio';
            jcErrors[targetBlock] =
              `Encontrei ${deviceRes.candidates.length} devices ativos com esse patrimônio: ${list}. ` +
              `Use o hostname customizado com o nome exato.`;
          } else {
            jcErrors.blk_root_hostname_custom = `Múltiplos devices com hostname \`${hostname}\`. Use hostname customizado ou contate SI.`;
          }
        } else {
          jcErrors.blk_root_justificativa = 'Erro ao validar device, tente novamente em instantes.';
        }
      } else if (!deviceRes.active) {
        const msg = `Device \`${hostname}\` está desativado no JumpCloud.`;
        jcErrors[usouHostnameCustom ? 'blk_root_hostname_custom' : 'blk_root_patrimonio'] = msg;
      } else {
        jumpcloudDeviceId = deviceRes.deviceId;
        const linkRes = await validateUserDeviceLink(jumpcloudUserId, jumpcloudDeviceId);
        if (linkRes.ok === false) {
          if (linkRes.error === 'NOT_LINKED') {
            jcErrors.blk_root_justificativa = `Você não tem \`${hostname}\` associado ao seu usuário. Contate SI.`;
          } else {
            jcErrors.blk_root_justificativa = 'Erro ao validar device, tente novamente em instantes.';
          }
        }
      }
    }
  }

  if (Object.keys(jcErrors).length > 0) {
    await ack({ response_action: 'errors', errors: jcErrors });
    return;
  }

  await ack();

  if (!requesterId) {
    await sendDmToSlackUser(
      client,
      slackId,
      '❌ Não encontramos seu usuário no Theris pelo e-mail do Slack. Cadastre-se no painel ou alinhe o e-mail com o RH/SI.'
    );
    return;
  }

  if (!jumpcloudUserId || !jumpcloudDeviceId) {
    await sendDmToSlackUser(
      client,
      slackId,
      '❌ Validação JumpCloud inconsistente. Tente novamente ou contate o SI.'
    );
    return;
  }

  const expiryAtHipotetico = new Date(Date.now() + ttlSegundos * 1000).toISOString();

  const details: RootAccessDetails = {
    subtipo: REQUEST_TYPES.ROOT_ACCESS,
    hostname,
    empresa: usouHostnameCustom ? null : empresa,
    os: usouHostnameCustom ? null : os,
    patrimonio: usouHostnameCustom ? null : patrimonio,
    hostnameCustom: usouHostnameCustom ? hostnameCustom : null,
    ttlQuantidade: qtd,
    ttlUnidade,
    ttlSegundos,
    expiryAt: expiryAtHipotetico,
    urgencia,
    jumpcloudDeviceId,
    jumpcloudUserId,
    jumpcloudAccessRequestId: null,
    appliedAt: null,
    statusJc: null
  };

  try {
    // PENDING_SI (inglês): alinha com handleSiDualApprovalSlackAction (HIRING/FIRING/AEX).
    // Débito técnico: parte do código ainda usa PENDENTE_SI em outros fluxos.
    const created = await prisma.request.create({
      data: {
        requesterId,
        type: REQUEST_TYPES.ROOT_ACCESS,
        status: 'PENDING_SI',
        justification: justificativa,
        details: JSON.stringify(details),
        currentApproverRole: 'SI',
        approverId: null,
        assigneeId: null,
        isExtraordinary: false
      }
    });

    const request = await prisma.request.findUnique({
      where: { id: created.id },
      include: { requester: { select: { name: true, email: true } } }
    });
    if (!request) throw new Error('Request recém-criado não encontrado');

    const { detectActiveRootAccessOverlap, sendSiTeamRootAccessDms } = await import('./siSlackApprovalService');
    const activeSudoWarning = await detectActiveRootAccessOverlap(
      requesterId,
      hostname,
      created.id,
      jumpcloudDeviceId
    );
    await sendSiTeamRootAccessDms({ client, request, activeSudoWarning });

    await client.chat.postMessage({
      channel: slackId,
      text:
        '✅ Pedido de *Acesso Root* enviado ao time de SI. Você receberá uma DM quando houver decisão.'
    });
  } catch (err) {
    console.error('[submit_infra_root] erro ao criar/notificar:', err);
    await sendDmToSlackUser(
      client,
      slackId,
      '❌ Não foi possível registrar o pedido de Acesso Root. Tente novamente ou contate o SI.'
    );
  }
});

// ============================================================
// SUBMISSÃO DO MODAL VPN (vpn_access_request)
// ============================================================
slackApp.view('vpn_access_request', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const vpnLevel = v.vpn_level?.vpn_level_sel?.selected_option?.value ?? '';
  const assetRaw = (v.vpn_asset?.vpn_asset_inp?.value ?? '').trim();
  const operatingSystem = v.vpn_os?.vpn_os_sel?.selected_option?.value ?? '';
  const justification = (v.vpn_justification?.vpn_just_inp?.value ?? '').trim();

  if (!vpnLevel || !operatingSystem || !justification) {
    await sendDmToSlackUser(client, body.user.id, '⚠️ Preencha todos os campos obrigatórios: Nível, Patrimônio, SO e Justificativa.');
    return;
  }
  const assetNumber = assetRaw.replace(/\D/g, '');
  if (!assetNumber) {
    await sendDmToSlackUser(client, body.user.id, '⚠️ Patrimônio da máquina deve conter apenas números.');
    return;
  }

  let requesterId: string | null = null;
  let requesterEmail: string | null = null;
  try {
    const info = await client.users.info({ user: body.user.id });
    requesterEmail = info.user?.profile?.email ?? null;
    if (requesterEmail) {
      const userDb = await prisma.user.findUnique({
        where: { email: requesterEmail },
        select: {
          id: true,
          managerId: true,
          manager: { select: { id: true, name: true, email: true } }
        }
      });
      if (userDb) {
        requesterId = userDb.id;
        if (!userDb.managerId || !userDb.manager?.email) {
          await sendDmToSlackUser(client, body.user.id, '⚠️ Seu perfil não possui líder direto cadastrado. Entre em contato com o time de SI para registrar seu gestor.');
          return;
        }
      }
    }
  } catch (e) {
    console.error('[VPN] Erro ao buscar usuário:', e);
    await sendDmToSlackUser(client, body.user.id, '❌ Erro ao identificar seu usuário. Verifique se seu e-mail do Slack está cadastrado no Theris.');
    return;
  }
  if (!requesterId) {
    await sendDmToSlackUser(client, body.user.id, '❌ Usuário não encontrado no sistema Theris. Cadastre-se no painel antes de solicitar acesso à VPN.');
    return;
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      departmentRef: { select: { name: true } }
    }
  });
  const leader = requester?.manager;
  if (!leader?.email) {
    await sendDmToSlackUser(client, body.user.id, '⚠️ Seu líder direto não possui e-mail cadastrado. Entre em contato com o time de SI.');
    return;
  }

  const details = {
    vpnLevel,
    assetNumber,
    operatingSystem,
    justification,
    slackRequesterId: body.user.id,
    requesterEmail: requesterEmail ?? undefined,
    source: 'slack'
  };

  const created = await prisma.request.create({
    data: {
      requesterId,
      type: 'VPN_ACCESS',
      status: 'PENDING_OWNER',
      details: JSON.stringify(details),
      justification,
      currentApproverRole: 'LEADER',
      approverId: null,
      assigneeId: requesterId
    }
  });

  const { registrarMudanca } = await import('../lib/auditLog');
  const { notifyTicketEvent } = await import('./ticketEventService');
  await registrarMudanca({
    tipo: 'TICKET_ASSIGNED',
    entidadeTipo: 'Request',
    entidadeId: created.id,
    descricao: `Responsável atribuído: ${requester?.name ?? '—'}`,
    dadosAntes: { responsavel: null },
    dadosDepois: { responsavel: requester?.name ?? '—' },
    autorId: requesterId,
  }).catch(() => {});
  try {
    await notifyTicketEvent(created.id, 'ASSIGNEE_CHANGED', { assigneeId: requesterId });
  } catch (_) {}

  const dataHora = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // DM ao líder: Slack ID obtido dinamicamente via users.lookupByEmail(manager.email)
  let leaderSlackId: string | null = null;
  try {
    const leaderSlackUser = await client.users.lookupByEmail({ email: leader.email });
    leaderSlackId = leaderSlackUser.user?.id ?? null;
  } catch (e) {
    console.error('[VPN] Líder não encontrado no Slack (lookupByEmail):', leader.email, e);
  }
  if (!leaderSlackId) {
    console.error('[VPN] Líder não encontrado no Slack:', leader.email);
  }
  if (leaderSlackId) {
    console.log('[VPN] Enviando DM ao líder:', leader.email, 'Slack ID:', leaderSlackId);
    const leaderMsg =
      `🔐 *Solicitação de Acesso a VPN*\n\n` +
      `Solicitante: ${requester?.name ?? '—'}\n` +
      `Nível: ${vpnLevel}\n` +
      `Patrimônio: ${assetNumber}\n` +
      `SO: ${operatingSystem}\n` +
      `Justificativa: ${justification.slice(0, 500)}${justification.length > 500 ? '…' : ''}`;
    const leaderBlocks: any[] = [
      { type: 'section', text: { type: 'mrkdwn', text: leaderMsg } },
      {
        type: 'actions',
        block_id: 'vpn_leader_decision',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '✅ Aprovar', emoji: true }, action_id: 'vpn_leader_approve', value: created.id, style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: '❌ Recusar', emoji: true }, action_id: 'vpn_leader_reject', value: created.id }
        ]
      }
    ];
    try {
      await sendDmToSlackUser(client, leaderSlackId, leaderMsg, leaderBlocks);
    } catch (e) {
      console.error('[VPN] Erro ao enviar DM ao líder:', e);
    }
  }

  // Mensagem informativa no canal SI (sem botões)
  const siChannelId = process.env.SLACK_SI_CHANNEL_ID || '';
  const deptName = requester?.departmentRef?.name ?? '—';
  let siMsg =
    `🔐 *Nova Solicitação de Acesso a VPN*\n\n` +
    `Solicitante: ${requester?.name ?? '—'} · ${deptName}\n` +
    `Nível: ${vpnLevel}\n` +
    `Patrimônio: ${assetNumber}\n` +
    `SO: ${operatingSystem}\n` +
    `Justificativa: ${justification.slice(0, 400)}${justification.length > 400 ? '…' : ''}\n` +
    `Data: ${dataHora}\n\n` +
    `👉 Acesse o Theris para aprovar ou recusar.`;
  if (!leaderSlackId) {
    siMsg += `\n\n⚠️ *Não foi possível notificar o líder direto (${leader.name ?? leader.email}) via DM no Slack.* A aprovação do líder deverá ser feita manualmente pelo painel do Theris.`;
  }
  if (siChannelId) {
    try {
      await client.chat.postMessage({ channel: siChannelId, text: siMsg });
    } catch (e) {
      console.error('[VPN] Erro ao postar no canal SI:', e);
    }
  }

  // DM ao solicitante
  const requesterSlackId = body.user.id;
  try {
    await sendDmToSlackUser(
      client,
      requesterSlackId,
      'Sua solicitação de Acesso a VPN foi aberta e aguarda aprovação do seu líder e do time de SI.'
    );
  } catch (_) {}

});

// ============================================================
// SUBMISSÃO DO MODAL /acessos (acessos_main_modal)
// ============================================================
slackApp.view('acessos_main_modal', async ({ ack, body, view, client }) => {
  const v = view.state.values;
  let metadata = { actionType: '' };
  try {
    metadata = JSON.parse((view.private_metadata as string) || '{}');
  } catch (_) {}

  const actionType = metadata.actionType || '';
  if (!actionType) {
    await ack();
    await (client as any).chat.postMessage({ channel: body.user.id, text: '⚠️ Selecione primeiro uma ação (Acesso Extraordinário ou Indicar Deputy) e preencha os campos.' });
    return;
  }

  // Validação Indicar Deputy: período <= 90 dias e e-mail obrigatório (bloqueia envio com erros no modal)
  if (actionType === 'indicar_deputy') {
    const deputyUserId = (v.blk_deputy_user?.deputy_user_select as any)?.selected_user ?? (v.blk_deputy_user?.deputy_user_select as any)?.value;
    const deputyEmailInput = (v.blk_deputy_email?.inp?.value ?? '').trim();
    const periodoNumStr = (v.deputy_periodo_numero?.inp?.value ?? '').trim();
    const periodoUnit = v.deputy_periodo_unidade?.deputy_periodo_unit_select?.selected_option?.value ?? 'dias';
    const periodoNum = parseInt(periodoNumStr, 10) || 0;
    let periodDays: number | null = null;
    if (periodoNum > 0 && periodoUnit) {
      if (periodoUnit === 'horas') periodDays = Math.round((periodoNum / 24) * 100) / 100;
      else if (periodoUnit === 'dias') periodDays = periodoNum;
      else if (periodoUnit === 'meses') {
        const hoje = new Date();
        const futuro = new Date(hoje.getTime());
        futuro.setMonth(futuro.getMonth() + periodoNum);
        periodDays = Math.round((futuro.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    const validationErrors: Record<string, string> = {};
    if (periodDays !== null && periodDays > 90) {
      validationErrors.deputy_periodo_numero = 'O período máximo permitido é de 90 dias.';
    }
    let resolvedEmail = deputyEmailInput;
    if (deputyUserId) {
      try {
        const info = await (client as any).users.info({ user: deputyUserId });
        resolvedEmail = ((info.user?.profile?.email as string) ?? resolvedEmail).trim();
      } catch (_) {}
    }
    if (deputyUserId && resolvedEmail && !resolvedEmail.toLowerCase().endsWith('@grupo-3c.com')) {
      validationErrors.blk_deputy_user = 'Selecione um colaborador do Grupo 3C (@grupo-3c.com).';
    }
    if (!resolvedEmail) {
      validationErrors.blk_deputy_email = 'E-mail do substituto é obrigatório.';
    }
    if (Object.keys(validationErrors).length > 0) {
      await ack({ response_action: 'errors', errors: validationErrors });
      return;
    }
  }

  await ack();

  const toolBlock = v.blk_tool;
  const levelBlock = v.blk_level;
  const reasonBlock = v.blk_reason;
  const toolOption = toolBlock?.acessos_tool_select?.selected_option;
  const toolId = toolOption?.value ?? '';
  const toolName = toolOption?.text?.text ?? toolId;
  const levelValue = levelBlock?.acessos_level_select?.selected_option?.value ?? '';
  const levelLabel = levelBlock?.acessos_level_select?.selected_option?.text?.text ?? levelValue;
  const reason = reasonBlock?.inp?.value ?? '';
  let deputyName = (v.blk_deputy_name?.inp?.value ?? '').trim();
  let deputyEmail = (v.blk_deputy_email?.inp?.value ?? '').trim();

  if (actionType === 'acesso_extraordinario') {
    const periodoNumStr = v.periodo_numero?.inp?.value?.trim() ?? '';
    const periodoUnit = v.periodo_unidade?.periodo_unit_select?.selected_option?.value ?? 'dias';
    const periodoNum = parseInt(periodoNumStr, 10) || 0;

    let accessPeriodDays: number | null = null;
    let accessPeriodRaw: string | null = null;
    if (periodoNum > 0 && periodoUnit) {
      if (periodoUnit === 'horas') accessPeriodDays = Math.round((periodoNum / 24) * 100) / 100;
      else if (periodoUnit === 'dias') accessPeriodDays = periodoNum;
      else if (periodoUnit === 'meses') accessPeriodDays = periodoNum * 30;
      accessPeriodRaw = `${periodoNum} ${periodoUnit}`;
    }

    if (accessPeriodDays !== null && accessPeriodDays > 90) {
      let autoRejectRequesterId: string | undefined;
      try {
        const info = await (client as any).users.info({ user: body.user.id });
        const email = info.user?.profile?.email;
        if (email) {
          const userDb = await prisma.user.findUnique({ where: { email }, select: { id: true } });
          if (userDb) autoRejectRequesterId = userDb.id;
        }
      } catch (_) {}

      const { registrarMudanca } = await import('../lib/auditLog');
      const periodoSolicitado = accessPeriodRaw || `${periodoNum} ${periodoUnit}`;
      await registrarMudanca({
        tipo: 'AEX_AUTO_REJECTED',
        entidadeTipo: 'User',
        entidadeId: autoRejectRequesterId || body.user.id,
        descricao: 'Solicitação AEX reprovada automaticamente: período superior a 90 dias',
        dadosDepois: { periodoSolicitado, limite: '90 dias' },
        autorId: autoRejectRequesterId
      });

      const unitLabel = periodoUnit === 'horas' ? 'horas' : periodoUnit === 'dias' ? 'dias' : 'meses';
      const rejectMsg = `❌ *Solicitação Reprovada Automaticamente*

Sua solicitação de acesso extraordinário para *${toolName}* foi reprovada automaticamente.

*Motivo:* O período solicitado (*${periodoNum} ${unitLabel}*) excede o limite máximo de 90 dias estabelecido pela política de Acessos Extraordinários do Grupo 3C.

Para solicitar acesso, escolha um período de até 90 dias.
Caso precise de acesso permanente, entre em contato com o time de Segurança da Informação.`;
      await (client as any).chat.postMessage({ channel: body.user.id, text: rejectMsg });
      return;
    }

    const details = { info: `Acesso extraordinário: ${toolName}`, tool: toolName, toolId: toolId || undefined, target: levelLabel, targetValue: levelValue };
    await saveRequest(body, client, 'ACCESS_TOOL_EXTRA', details, reason, `🔥 Acesso extraordinário para *${toolName}* enviado ao time de Segurança.`, true, undefined, accessPeriodDays ?? undefined, accessPeriodRaw ?? undefined);
  } else if (actionType === 'indicar_deputy') {
    if (!toolName) {
      await (client as any).chat.postMessage({ channel: body.user.id, text: '⚠️ Apenas Owners de ferramentas podem indicar um Deputy. Você não é proprietário de nenhuma ferramenta no momento.' });
      return;
    }
    const deputyUserId = (v.blk_deputy_user?.deputy_user_select as any)?.selected_user ?? (v.blk_deputy_user?.deputy_user_select as any)?.value;
    if (deputyUserId) {
      try {
        const info = await (client as any).users.info({ user: deputyUserId });
        const profile = info.user?.profile as { email?: string; real_name?: string } | undefined;
        if (profile?.email) deputyEmail = profile.email.trim();
        if (profile?.real_name && !deputyName) deputyName = profile.real_name.trim();
      } catch (_) {}
    }
    const periodoNumStr = (v.deputy_periodo_numero?.inp?.value ?? '').trim();
    const periodoUnit = v.deputy_periodo_unidade?.deputy_periodo_unit_select?.selected_option?.value ?? 'dias';
    const periodoNum = parseInt(periodoNumStr, 10) || 0;
    let deputyPeriodDays: number | null = null;
    let deputyPeriodRaw: string | null = null;
    if (periodoNum > 0 && periodoUnit) {
      if (periodoUnit === 'horas') deputyPeriodDays = Math.round((periodoNum / 24) * 100) / 100;
      else if (periodoUnit === 'dias') deputyPeriodDays = periodoNum;
      else if (periodoUnit === 'meses') {
        const hoje = new Date();
        const futuro = new Date(hoje.getTime());
        futuro.setMonth(futuro.getMonth() + periodoNum);
        deputyPeriodDays = Math.round((futuro.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      }
      deputyPeriodRaw = `${periodoNum} ${periodoUnit}`;
    }
    const details: Record<string, unknown> = {
      info: `Indicar Deputy: ${toolName}`,
      tool: toolName,
      substituteName: deputyName || undefined,
      substituteEmail: deputyEmail,
      substitute: deputyName || deputyEmail,
      justification: reason || undefined,
      source: 'acessos'
    };
    if (deputyPeriodRaw) details.deputyPeriodRaw = deputyPeriodRaw;
    if (deputyPeriodDays != null) details.deputyPeriodDays = deputyPeriodDays;
    await saveRequest(body, client, 'DEPUTY_DESIGNATION', details, reason, `✅ Indicação de substituto (Deputy) para *${toolName}* enviada para aprovação do time de S.I.`);
  }
});

// ============================================================
// 4. NOTIFICAÇÃO ATIVA (CHAMADA PELO BACKEND WEB)
// ============================================================

const ACCESS_TYPES = ['ACCESS_CHANGE', 'ACCESS_TOOL_EXTRA', 'ACCESS_TOOL', 'ACESSO_FERRAMENTA', 'EXTRAORDINARIO'];
const PEOPLE_TYPES = ['CHANGE_ROLE', 'HIRING', 'FIRING', 'DEPUTY_DESIGNATION', 'ADMISSAO', 'DEMISSAO', 'PROMOCAO'];
const INFRA_TYPES = ['INFRA_SUPPORT', 'INFRA', 'ROOT_ACCESS'];

const TYPE_LABELS: Record<string, string> = {
  ACCESS_TOOL: 'Kit Padrão / Nova Ferramenta',
  ACCESS_CHANGE: 'Alteração de Acesso',
  ACCESS_TOOL_EXTRA: 'Acesso Extraordinário',
  DEPUTY_DESIGNATION: 'Indicar Deputy',
  VPN_ACCESS: 'Acesso a VPN',
  CHANGE_ROLE: 'Mudança de Cargo',
  HIRING: 'Contratação',
  FIRING: 'Desligamento',
  ADMISSAO: 'Admissão',
  DEMISSAO: 'Desligamento',
  PROMOCAO: 'Promoção',
  INFRA_SUPPORT: 'Suporte Infra / TI',
  INFRA: 'Suporte Infra / TI',
  ROOT_ACCESS: 'Acesso Root (sudo)'
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
  if (requestType === 'INFRA_SUPPORT' || requestType === 'INFRA') {
    if (d.requestTypeLabel || d.requestType) parts.push(`Tipo: ${d.requestTypeLabel || d.requestType}`);
    if (d.urgencyLabel || d.urgency) parts.push(`Urgência: ${d.urgencyLabel || d.urgency}`);
    if (d.description) parts.push(`Descrição: ${(d.description as string).slice(0, 150)}${(d.description as string).length > 150 ? '…' : ''}`);
  } else if (requestType === 'ROOT_ACCESS') {
    const host = typeof d.hostname === 'string' ? d.hostname : '—';
    parts.push(`Device: ${host}`);
    if (d.ttlQuantidade != null && d.ttlUnidade) parts.push(`TTL: ${String(d.ttlQuantidade)} ${String(d.ttlUnidade)}`);
    if (d.urgencia) parts.push(`Urgência: ${String(d.urgencia)}`);
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

    await sendDmToSlackUser(slackApp.client, slackUserId, `Sua solicitação foi ${actionText}`, blocks);

    console.log(`🔔 Notificação enviada para ${email} — ${status} [${requestType || 'n/a'}]`);
  } catch (error) {
    console.error('❌ Erro ao enviar notificação Slack:', error);
  }
};

/** DM específica quando movimentação (CHANGE_ROLE) é aprovada e aplicada no banco. */
export const sendChangeRoleApprovedDM = async (requesterEmail: string, collaboratorName: string) => {
  if (!slackApp) return;
  try {
    const lookup = await slackApp.client.users.lookupByEmail({ email: requesterEmail });
    const slackUserId = lookup.user?.id;
    if (!slackUserId) {
      console.warn(`⚠️ sendChangeRoleApprovedDM: usuário Slack não encontrado para ${requesterEmail}`);
      return;
    }
    await sendDmToSlackUser(slackApp.client, slackUserId, `✅ A movimentação de ${collaboratorName} foi aprovada e já está refletida no sistema.`);
    console.log(`🔔 DM movimentação aprovada enviada para ${requesterEmail}`);
  } catch (e) {
    console.error('❌ Erro ao enviar DM de movimentação aprovada:', e);
  }
};

/** Tipo de item KBS (RoleKitItem) para comparação pós-mudança. */
export type KBSItem = { toolName: string; accessLevelDesc: string | null };

/** URL do frontend para links "Ver chamado". No Render, configurar FRONTEND_URL=https://theris.grupo-3c.com */
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';
const SLACK_ID_LUAN = process.env.SLACK_ID_LUAN || '';
const SLACK_ID_VLADIMIR = process.env.SLACK_ID_VLADIMIR || '';
const SLACK_ID_ALLAN = process.env.SLACK_ID_ALLAN || '';
const SLACK_ID_RENATA = process.env.SLACK_ID_RENATA || '';
const SLACK_SI_CHANNEL_ID = process.env.SLACK_SI_CHANNEL_ID || 'C09PZQ9FM9C';
/** Canal Grupo Segurança: só usado se definido e diferente de SLACK_SI_CHANNEL_ID (senão usa apenas SI). */
const SLACK_GRUPO_SEGURANCA_CHANNEL_ID = process.env.SLACK_GRUPO_SEGURANCA_CHANNEL_ID || '';

/** Membros do SI para DM em novo chamado (todos os tipos). */
const SI_MEMBERS = [SLACK_ID_LUAN, SLACK_ID_VLADIMIR, SLACK_ID_ALLAN].filter(Boolean) as string[];

/** Timestamp legível em BRT — alinhado a VPN / JumpCloud no projeto. */
export function formatTimestampBrt(d: Date = new Date()): string {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/** Data DD/MM/YYYY em BRT (ex.: último dia útil / desligamento nos avisos Slack). */
export function formatDateOnlyBrt(input: string | Date | null | undefined): string {
  if (!input) {
    return new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  const d =
    typeof input === 'string'
      ? new Date(input.length <= 10 ? `${input}T12:00:00-03:00` : input)
      : input;
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * DMs ao SI (Luan/Vladimir/Allan) após desligamento aprovado e automação Theris:
 * Owners notificados; JumpCloud será manual após último dia útil.
 */
export async function notifySiTeamDesligamentoAprovadoDms(params: {
  collaboratorName: string;
  jobTitle: string;
  departmentName: string;
  actionDate: string | null;
  /** true = Owners já notificados na aprovação; false = agendado para 17h BRT no último dia. */
  notifyNow?: boolean;
  /** YYYY-MM-DD do último dia (para texto de agendamento). */
  scheduleDayYyyyMmDd?: string | null;
}): Promise<void> {
  if (!slackApp?.client || SI_MEMBERS.length === 0) return;
  const client = slackApp.client;
  const lastDayFormatted = formatDateOnlyBrt(params.actionDate);
  const notifyNow = params.notifyNow ?? true;
  const scheduledDayDisplay = formatDateOnlyBrt(params.scheduleDayYyyyMmDd ?? params.actionDate);
  const ownersLine = notifyNow
    ? `Os Owners foram notificados para revogar os acessos nas ferramentas.\n`
    : `Os Owners serão notificados em *${scheduledDayDisplay}* às 17h para revogar os acessos nas ferramentas.\n`;
  const text =
    `✅ *Desligamento aprovado*\n` +
    `*Colaborador:* ${params.collaboratorName}\n` +
    `*Cargo:* ${params.jobTitle ?? '—'}\n` +
    `*Departamento:* ${params.departmentName ?? '—'}\n` +
    `*Último dia:* ${lastDayFormatted}\n\n` +
    ownersLine +
    `⚠️ Lembrete: suspensão da conta no JumpCloud será feita manualmente pelo SI ao final do último dia útil.`;
  for (const uid of SI_MEMBERS) {
    try {
      await client.chat.postMessage({ channel: uid, text, mrkdwn: true });
    } catch (e) {
      console.error('[notifySiTeamDesligamentoAprovadoDms] DM falhou:', uid, e);
    }
  }
}

/** Após SI confirmar suspensão manual no JumpCloud (Leaver). DMs SI + canal SLACK_ACESSOS_CHANNEL_ID. */
export async function notifyJcSuspensionManualConfirmedSlack(params: {
  targetUserName: string;
  targetUserEmail: string;
  lastDayFormatted: string;
  confirmedByName: string;
  confirmedAtFormatted: string;
}): Promise<void> {
  if (!slackApp?.client) return;
  const client = slackApp.client;
  const text =
    `✅ *Suspensão manual no JumpCloud confirmada*\n` +
    `*Colaborador:* ${params.targetUserName}\n` +
    `*Email:* ${params.targetUserEmail}\n` +
    `*Último dia:* ${params.lastDayFormatted}\n` +
    `*Confirmado por:* ${params.confirmedByName}\n` +
    `*Confirmado em:* ${params.confirmedAtFormatted}\n\n` +
    `Fluxo Leaver finalizado. Auditoria registrada.`;
  const blocks: unknown[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text
      }
    }
  ];
  for (const uid of SI_MEMBERS) {
    try {
      await client.chat.postMessage({ channel: uid, text, blocks: blocks as any, mrkdwn: true });
    } catch (e) {
      console.error('[notifyJcSuspensionManualConfirmedSlack] DM:', e);
    }
  }
  await postSlackAcessosChannel(client, text, blocks);
}

/** Canal de auditoria de acessos/onboarding (SLACK_ACESSOS_CHANNEL_ID). */
export async function postSlackAcessosChannel(
  client: WebClient,
  text: string,
  blocks?: unknown[]
): Promise<void> {
  const ch = (process.env.SLACK_ACESSOS_CHANNEL_ID || '').trim();
  if (!ch) return;
  await client.chat
    .postMessage({
      channel: ch,
      text,
      ...(blocks ? { blocks: blocks as any } : {})
    })
    .catch((e) => console.error('[SLACK_ACESSOS_CHANNEL_ID] postMessage:', e));
}

/** Fire-and-forget: canal SLACK_ACESSOS_CHANNEL_ID com timestamp BRT (mesmo padrão do HIRING). */
export function firePostSlackAcessosChannel(line: string): void {
  const text = `${line} · ${formatTimestampBrt()} BRT`;
  void (async () => {
    try {
      const app = getSlackApp();
      if (!app?.client) return;
      await postSlackAcessosChannel(app.client, text);
    } catch (e) {
      console.error('[firePostSlackAcessosChannel]', e);
    }
  })();
}

/** Atualiza a mensagem do Block Kit após clique em botão (DM ou canal). */
async function slackUpdateInteractiveMessage(
  client: WebClient,
  body: { channel?: { id?: string }; message?: { ts?: string }; container?: { channel_id?: string } },
  blocks: unknown[],
  text: string
): Promise<void> {
  const channel = body.channel?.id || body.container?.channel_id;
  const ts = body.message?.ts;
  if (!channel || !ts) {
    console.warn('[Slack] chat.update: channel ou ts ausente no payload interativo');
    return;
  }
  await client.chat.update({ channel, ts, blocks: blocks as any, text }).catch((e) => console.error('[Slack] chat.update falhou:', e));
}

/** Resolve Tool do catálogo a partir do item KBS (toolCode + toolName). */
async function resolveToolForKitItem(ki: { toolCode: string; toolName: string }) {
  const code = (ki.toolCode || '').trim();
  const name = (ki.toolName || '').trim();
  const include = {
    owner: { select: { id: true, email: true, name: true } },
    subOwner: { select: { id: true, email: true, name: true } }
  };
  if (code) {
    const byAcronym = await prisma.tool.findFirst({
      where: { acronym: { equals: code, mode: 'insensitive' } },
      include
    });
    if (byAcronym) return byAcronym;
    const byNameCode = await prisma.tool.findFirst({
      where: { name: { equals: code, mode: 'insensitive' } },
      include
    });
    if (byNameCode) return byNameCode;
  }
  if (name) {
    return prisma.tool.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { name: { contains: name, mode: 'insensitive' } }
        ]
      },
      include
    });
  }
  return null;
}

async function collectSuperAdminSlackUserIds(client: WebClient): Promise<string[]> {
  const ids = new Set<string>();
  for (const id of SI_MEMBERS) ids.add(id);
  const extras = (process.env.SI_BYPASS_APPROVER_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  let superAdminEmails: string[] = [];
  try {
    const superAdmins = await prisma.user.findMany({
      where: { systemProfile: 'SUPER_ADMIN', isActive: true },
      select: { email: true }
    });
    superAdminEmails = superAdmins.map((u) => u.email.toLowerCase());
  } catch (e) {
    console.error('[HIRING] Falha ao listar SUPER_ADMIN:', e);
  }
  const emails = [...new Set([...superAdminEmails, ...extras])];
  for (const email of emails) {
    try {
      const lu = await client.users.lookupByEmail({ email });
      if (lu.user?.id) ids.add(lu.user.id);
    } catch (_) {}
  }
  return [...ids];
}

/**
 * Abre uma DM com o usuário (conversations.open) e envia a mensagem. Evita channel_not_found quando o bot ainda não conversou com o usuário.
 */
export async function sendDmToSlackUser(
  client: WebClient,
  slackUserId: string,
  text: string,
  blocks?: any[]
): Promise<void> {
  const response = await client.conversations.open({ users: slackUserId });
  const channelId = response.channel?.id;
  if (!channelId) {
    throw new Error(`Não foi possível abrir DM com usuário ${slackUserId}`);
  }
  await client.chat.postMessage({
    channel: channelId,
    text,
    ...(blocks ? { blocks } : {}),
  });
}

/**
 * DM ao colaborador atribuído como executor em chamado Infra (aberto pelo solicitante no Theris).
 */
export async function sendInfraTicketAssigneeDm(params: {
  assigneeEmail: string;
  requestId: string;
  detailsSummary: string;
  requesterName: string;
}): Promise<void> {
  const app = getSlackApp();
  if (!app?.client) return;
  const lookup = await app.client.users.lookupByEmail({ email: params.assigneeEmail });
  const slackId = lookup.user?.id;
  if (!slackId) return;
  const shortId = params.requestId.slice(0, 8);
  const text =
    `📋 *Você foi incluído em um chamado de Infra*\n\n` +
    `*Chamado:* #${shortId} — ${params.detailsSummary}\n` +
    `*Aberto por:* ${params.requesterName}\n\n` +
    `Você receberá atualizações deste chamado no Theris.`;
  await sendDmToSlackUser(app.client, slackId, text, [
    { type: 'section', text: { type: 'mrkdwn', text } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Chamado #${shortId} · Theris` }] }
  ]);
}

/** Aviso no canal SI quando inbox de chamado Infra é definida (fire-and-forget pelo caller). */
export async function notifyInfraInboxConfigured(params: {
  requestId: string;
  departmentName: string;
  roleName: string;
  adminName: string;
}): Promise<void> {
  const app = getSlackApp();
  const channelId = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  if (!app?.client || !channelId) {
    console.log('[INFRA] Inbox definida (sem post Slack):', params);
    return;
  }
  const shortId = params.requestId.slice(0, 8);
  const text =
    `📥 *Inbox de chamado Infra definida*\n` +
    `*Chamado:* #${shortId}\n` +
    `*Inbox:* ${params.departmentName} · ${params.roleName}\n` +
    `*Por:* ${params.adminName}`;
  await app.client.chat.postMessage({ channel: channelId, text });
}

/**
 * Notifica SLACK_ID_LUAN quando a automação CHANGE_ROLE não encontra cargo ou departamento no banco.
 * Chamar em try/catch para não bloquear o fluxo.
 */
export async function notificarLuanErroChangeRole(chamadoId: string, cargoBuscado: string, deptoBuscado: string): Promise<void> {
  if (!SLACK_ID_LUAN || !slackApp?.client) return;
  const linkChamado = `${FRONTEND_URL}/tickets?id=${chamadoId}`;
  const text =
    `⚠️ *Erro na Automação CHANGE_ROLE*\n` +
    `Chamado: ${chamadoId}\n` +
    `Cargo buscado: ${cargoBuscado} → não encontrado no banco\n` +
    `Depto buscado: ${deptoBuscado} → não encontrado no banco\n` +
    `Ação necessária: revisar manualmente\n\n` +
    `👉 Ver chamado: ${linkChamado}`;
  await sendDmToSlackUser(slackApp.client, SLACK_ID_LUAN, text);
  console.log('[notificarLuanErroChangeRole] DM enviada para SLACK_ID_LUAN.');
}

const JUMPCLOUD_SLACK_CHANNEL_ID = process.env.JUMPCLOUD_SLACK_CHANNEL_ID || '';

/**
 * Notificação no canal SI (Password Manager) e DM ao solicitante quando o Acesso a VPN é concedido (inserção JumpCloud ok).
 */
export async function notificarVpnConcedido(params: {
  requesterEmail: string;
  vpnLevel: string;
  assetNumber: string;
  operatingSystem: string;
  leaderName: string;
  siName: string;
}): Promise<void> {
  if (!slackApp?.client) return;
  const { requesterEmail, vpnLevel, assetNumber, operatingSystem, leaderName, siName } = params;
  const horario = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const text =
    `🔐 *Acesso a VPN Concedido*\n\n` +
    `👤 Usuário: ${requesterEmail}\n` +
    `🌐 Nível: ${vpnLevel}\n` +
    `💻 Patrimônio: ${assetNumber}\n` +
    `🖥️ SO: ${operatingSystem}\n` +
    `✅ Aprovado por: ${leaderName} (Líder) + ${siName} (SI)\n` +
    `🕒 Horário: ${horario}`;
  if (JUMPCLOUD_SLACK_CHANNEL_ID) {
    try {
      await slackApp.client.chat.postMessage({ channel: JUMPCLOUD_SLACK_CHANNEL_ID, text });
    } catch (e) {
      console.error('[VPN] Erro ao postar no canal (concedido):', e);
    }
  }
  try {
    const lookup = await slackApp.client.users.lookupByEmail({ email: requesterEmail });
    const slackUserId = lookup.user?.id;
    if (slackUserId) {
      await sendDmToSlackUser(
        slackApp.client,
        slackUserId,
        `🎉 Sua solicitação de Acesso a VPN foi aprovada e o acesso foi concedido! Nível: ${vpnLevel}.`
      );
    }
  } catch (_) {}
}

/**
 * Em caso de falha na inserção no JumpCloud: apenas DM ao solicitante (não envia nada no canal).
 */
export async function notificarVpnFalhaInserção(requesterEmail: string): Promise<void> {
  if (!slackApp?.client) return;
  try {
    const lookup = await slackApp.client.users.lookupByEmail({ email: requesterEmail });
    const slackUserId = lookup.user?.id;
    if (slackUserId) {
      await sendDmToSlackUser(
        slackApp.client,
        slackUserId,
        '⚠️ Sua solicitação foi aprovada, mas ocorreu um erro ao conceder o acesso. O time de SI foi notificado.'
      );
    }
  } catch (_) {}
}

/** Payload mínimo do chamado para notificar o time de SI (após criação no banco). */
export type TicketForSINotification = {
  id: string;
  type: string;
  status: string;
  justification: string | null;
  details: string | null;
  requesterId: string | null;
  createdAt: Date;
};

/**
 * Notificação genérica de novo chamado para SI: canal(is) + DM para cada membro do SI.
 * Cobre todos os tipos (CHANGE_ROLE, ONBOARDING, OFFBOARDING, ACCESS_TOOL_EXTRA, etc.).
 * Falha na notificação não deve bloquear a criação do ticket — chamar em try/catch.
 */
export async function notificarSINovoTicket(ticket: TicketForSINotification): Promise<void> {
  console.log('[Chamado] Tentando enviar notificação SI (novo ticket) para chamado:', ticket.id, 'tipo:', ticket.type);

  if (ticket.type === REQUEST_TYPES.ROOT_ACCESS) {
    console.log(
      '[Chamado] notificarSINovoTicket: ignorando ROOT_ACCESS (fluxo dedicado: canal SI + DMs via sendSiTeamRootAccessDms; não usar SLACK_GRUPO_SEGURANCA_CHANNEL_ID).'
    );
    return;
  }

  const channelId = process.env.SLACK_SI_CHANNEL_ID || '';
  if (!channelId) {
    console.error('[Chamado] notificarSINovoTicket: SLACK_SI_CHANNEL_ID não definido');
  }
  if (!slackApp?.client) {
    console.log('[Chamado] Slack não enviado (SI): app/client não disponível');
    return;
  }
  const client = slackApp.client;

  try {
    let requesterName = '—';
    let requesterCargo = '';
    let departmentName = '—';
    if (ticket.requesterId) {
      const requester = await prisma.user.findUnique({
        where: { id: ticket.requesterId },
        select: { name: true, jobTitle: true, departmentRef: { select: { name: true } } }
      });
      if (requester) {
        requesterName = requester.name ?? '—';
        requesterCargo = requester.jobTitle ?? '';
        departmentName = requester.departmentRef?.name ?? '—';
      }
    }

    let detailsObj: Record<string, unknown> = {};
    try {
      detailsObj = typeof ticket.details === 'string' ? JSON.parse(ticket.details || '{}') : (ticket.details || {});
    } catch (_) {}
    const collaboratorName = (detailsObj.collaboratorName as string) || (detailsObj.beneficiary as string) || (detailsObj.substituteName as string) || (detailsObj.substitute as string) || '';
    const deptFromDetails = (detailsObj.department as string) || (detailsObj.dept as string) || (detailsObj.current as Record<string, string>)?.dept;
    const tipoLabel = TYPE_LABELS[ticket.type] || ticket.type;
    const dataHora = new Date(ticket.createdAt).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const detalhes = (ticket.justification || (detailsObj.info as string) || (detailsObj.reason as string) || '—').toString().slice(0, 300);
    const linkChamado = `${FRONTEND_URL}/tickets?id=${ticket.id}`;

    const text =
      `🔔 *Novo Chamado no Theris*\n\n` +
      `*Tipo:* ${tipoLabel}\n` +
      `*Solicitante:* ${requesterName}${requesterCargo ? ` — ${requesterCargo}` : ''}\n` +
      (collaboratorName ? `*Colaborador alvo:* ${collaboratorName}\n` : '') +
      `*Departamento:* ${departmentName !== '—' ? departmentName : (deptFromDetails || '—')}\n` +
      `*Data/hora:* ${dataHora}\n` +
      `*Status inicial:* ${ticket.status}\n` +
      `*Detalhes:* ${detalhes}\n\n` +
      `👉 Ver chamado: ${linkChamado}`;

    const dmText = `🔔 Novo chamado: ${tipoLabel} — <${linkChamado}|Ver chamado>`;

    const channels: string[] = [];
    if (channelId) channels.push(channelId);
    if (SLACK_GRUPO_SEGURANCA_CHANNEL_ID && SLACK_GRUPO_SEGURANCA_CHANNEL_ID !== channelId) {
      channels.push(SLACK_GRUPO_SEGURANCA_CHANNEL_ID);
    }

    for (const ch of channels) {
      try {
        await client.chat.postMessage({ channel: ch, text });
        console.log('[Chamado] notificarSINovoTicket: enviado para canal:', ch, 'ticket:', ticket.id);
      } catch (e) {
        console.error('[Chamado] Erro ao enviar Slack SI (canal):', ch, e);
      }
    }

    for (const memberId of SI_MEMBERS) {
      try {
        await sendDmToSlackUser(client, memberId, dmText);
        console.log('[Chamado] notificarSINovoTicket: DM enviada para', memberId);
      } catch (err) {
        console.error('[Chamado] Erro ao enviar Slack SI (DM):', memberId, err);
      }
    }
    console.log('[Chamado] Slack SI enviado com sucesso para chamado:', ticket.id);
  } catch (error) {
    console.error('[Chamado] Erro ao enviar Slack SI:', error);
  }
}

/**
 * Notifica o time de SI quando um novo chamado é criado (qualquer tipo).
 * Encaminha para notificarSINovoTicket (canal SI + DMs Luan, Vladimir, Allan).
 */
export async function notificarSI(ticket: TicketForSINotification): Promise<void> {
  await notificarSINovoTicket(ticket);
}

/**
 * Notifica os owners das ferramentas KBS afetadas após aprovação de mudança de cargo/departamento.
 * Compara kbsAnterior com kbsNovo: ferramenta removida → "Acesso a ser revogado"; nível alterado → "Nível alterado de X para Y".
 * Busca Slack ID do owner via tool.owner (User) → users.lookupByEmail(owner.email). Fallback: SLACK_ID_LUAN.
 */
export async function notificarOwnersFerramenta(
  colaborador: { nome: string; cargoAnterior: string; deptAnterior: string; cargoNovo: string; deptNovo: string },
  kbsAnterior: KBSItem[],
  kbsNovo: KBSItem[],
  chamadoId: string,
  dataAcao: string
): Promise<void> {
  if (!slackApp?.client) return;
  const client = slackApp.client;
  const novobyName = new Map<string, string | null>();
  kbsNovo.forEach((k) => novobyName.set(k.toolName, k.accessLevelDesc ?? null));
  const afetados: { toolName: string; situacao: 'revogado' | 'nivel_alterado'; nivelAntigo?: string; nivelNovo?: string }[] = [];
  for (const a of kbsAnterior) {
    const nivelNovo = novobyName.get(a.toolName);
    if (nivelNovo === undefined) {
      afetados.push({ toolName: a.toolName, situacao: 'revogado', nivelAntigo: a.accessLevelDesc ?? undefined });
    } else if ((a.accessLevelDesc ?? null) !== nivelNovo) {
      afetados.push({
        toolName: a.toolName,
        situacao: 'nivel_alterado',
        nivelAntigo: a.accessLevelDesc ?? undefined,
        nivelNovo: nivelNovo ?? undefined
      });
    }
  }
  if (afetados.length === 0) return;
  const tipoMudanca = colaborador.deptAnterior !== colaborador.deptNovo ? 'departamento' : 'cargo';
  const linkChamado = `${FRONTEND_URL}/tickets${chamadoId ? `?id=${chamadoId}` : ''}`;
  for (const af of afetados) {
    try {
      const tool = await prisma.tool.findFirst({
        where: {
          OR: [
            { name: { equals: af.toolName, mode: 'insensitive' } },
            { name: { contains: af.toolName, mode: 'insensitive' } }
          ]
        },
        include: { owner: { select: { email: true, name: true } } }
      });
      let slackUserId: string | null = null;
      if (tool?.owner?.email) {
        try {
          const lookup = await client.users.lookupByEmail({ email: tool.owner.email });
          slackUserId = lookup.user?.id ?? null;
        } catch (_) {}
      }
      if (!slackUserId && SLACK_ID_LUAN) slackUserId = SLACK_ID_LUAN;
      if (!slackUserId) {
        console.warn(`[notificarOwnersFerramenta] Owner não encontrado no Slack para ferramenta ${af.toolName} (email: ${tool?.owner?.email ?? 'N/A'}).`);
        continue;
      }
      const situacaoTexto =
        af.situacao === 'revogado'
          ? 'Acesso a ser revogado'
          : `Nível alterado de ${af.nivelAntigo ?? '—'} para ${af.nivelNovo ?? '—'}`;
      const text =
        `🔄 *Revisão de Acesso Necessária — Theris*\n\n` +
        `O colaborador *${colaborador.nome}* teve uma mudança de ${tipoMudanca}.\n\n` +
        `*Ferramenta:* ${af.toolName}\n` +
        `*Situação:* ${situacaoTexto}\n` +
        `*Cargo anterior:* ${colaborador.cargoAnterior} — ${colaborador.deptAnterior}\n` +
        `*Novo cargo:* ${colaborador.cargoNovo} — ${colaborador.deptNovo}\n` +
        `*Data da mudança:* ${dataAcao}\n\n` +
        `Por favor, revise e ajuste o acesso dessa ferramenta.\n` +
        `👉 Ver chamado: ${linkChamado}`;
      await client.chat.postMessage({ channel: slackUserId, text });
      console.log(`[notificarOwnersFerramenta] DM enviada para owner de ${af.toolName} (Slack ID: ${slackUserId}).`);
    } catch (e) {
      console.error(`[notificarOwnersFerramenta] Erro ao notificar owner de ${af.toolName}:`, e);
    }
  }
}

export type HiringKbsNotificationContext = {
  requestId: string;
  requestType: string;
  collaboratorName: string;
  collaboratorUserId: string;
  jobTitle: string;
  departmentName: string;
  unitName: string;
  startDate: string;
  roleId: string;
  requesterName: string | null;
  closedByName: string | null;
  /** HIRING: aviso JumpCloud no canal SI (criação automática ou verificação manual). */
  jumpCloudSi?: { outcome: 'created'; email: string; jumpcloudId: string } | { outcome: 'manual_check' };
};

/** DM ao gestor direto quando o colaborador é criado no JumpCloud (convite por e-mail; sem credenciais no Theris). */
async function sendJumpCloudHiringManagerDm(client: WebClient, ctx: HiringKbsNotificationContext): Promise<void> {
  const jc = ctx.jumpCloudSi;
  if (!jc || jc.outcome !== 'created') return;
  const hiree = await prisma.user.findUnique({
    where: { id: ctx.collaboratorUserId },
    select: { manager: { select: { email: true } } }
  });
  const mgrEmail = hiree?.manager?.email?.trim();
  if (!mgrEmail) return;
  let slackId: string | null = null;
  try {
    const lu = await client.users.lookupByEmail({ email: mgrEmail });
    slackId = lu.user?.id ?? null;
  } catch (_) {}
  if (!slackId) {
    console.warn('[notificarOwnersJoiner] Gestor sem usuário Slack para DM de cadastro JumpCloud:', mgrEmail);
    return;
  }
  const email = jc.email;
  const name = ctx.collaboratorName;
  const blocks: any[] = [
    { type: 'header', text: { type: 'plain_text', text: '🧑‍💼 Novo colaborador cadastrado no sistema', emoji: true } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*${name}* foi cadastrado no JumpCloud com sucesso.\n` +
          `Um email de boas-vindas foi enviado para *${email}* com o link\n` +
          `para definição de senha — válido por 7 dias.`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          'Caso o colaborador não receba o email ou tenha dificuldades de acesso,\n' +
          'orientá-lo a acionar o time de Segurança da Informação.'
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '🔒 Nenhuma senha temporária foi gerada. O acesso é definido pelo próprio colaborador.'
        }
      ]
    }
  ];
  const plain = `🧑‍💼 Novo colaborador cadastrado no JumpCloud: ${name}. Convite por e-mail para definir acesso.`;
  await sendDmToSlackUser(client, slackId, plain, blocks);
}

/** HIRING: fallback — ferramenta no catálogo sem owner (DM a Luan). */
function fireJoinerFallbackDmSemOwnerNoCatalogo(
  client: WebClient,
  ctx: HiringKbsNotificationContext,
  ki: { toolCode: string; toolName: string; accessLevelDesc: string | null },
  tool: { name: string },
  hireeEmail: string
): void {
  if (!SLACK_ID_LUAN) return;
  const plain =
    `⚠️ HIRING · ${tool.name} (${ki.toolCode}) sem owner no Theris — liberar manualmente o acesso de ${ctx.collaboratorName}.`;
  const blocks: any[] = [
    { type: 'header', text: { type: 'plain_text', text: '⚠️ HIRING · Ferramenta sem owner definido', emoji: true } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `A ferramenta *${tool.name}* (\`${ki.toolCode}\`) do cargo *${ctx.jobTitle}*\n` +
          `não possui owner cadastrado no Catálogo do Theris.\n` +
          `O acesso para *${ctx.collaboratorName}* deve ser liberado manualmente.`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `👤 Colaborador: ${ctx.collaboratorName}\n` +
          `📧 Email: ${hireeEmail}\n` +
          `🏢 Unidade: ${ctx.unitName} · Departamento: ${ctx.departmentName}`
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '⚠️ Cadastre o owner desta ferramenta no Catálogo para automatizar futuras notificações.'
        }
      ]
    }
  ];
  void sendDmToSlackUser(client, SLACK_ID_LUAN, plain, blocks).catch((e) =>
    console.error('[notificarOwnersJoiner] Falha DM fallback (sem owner):', e)
  );
}

/** HIRING: fallback — owner cadastrado mas sem Slack ID (DM a Luan). */
function fireJoinerFallbackDmOwnerSemSlack(
  client: WebClient,
  ctx: HiringKbsNotificationContext,
  ki: { toolCode: string; toolName: string; accessLevelDesc: string | null },
  tool: { name: string },
  owner: { email: string; name: string },
  hireeEmail: string
): void {
  if (!SLACK_ID_LUAN) return;
  const plain =
    `⚠️ HIRING · Owner ${owner.name} sem Slack — liberar manualmente o acesso de ${ctx.collaboratorName} em ${tool.name}.`;
  const blocks: any[] = [
    { type: 'header', text: { type: 'plain_text', text: '⚠️ HIRING · Owner sem Slack configurado', emoji: true } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `O owner cadastrado para *${tool.name}* é *${owner.name}* (${owner.email}),\n` +
          `mas não foi possível localizar o Slack ID dele.\n` +
          `A liberação do acesso para *${ctx.collaboratorName}* deve ser feita manualmente.`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `🔧 *${tool.name}* (\`${ki.toolCode}\`)\n` +
          `👤 Colaborador: ${ctx.collaboratorName}\n` +
          `📧 Email: ${hireeEmail}\n` +
          `🏢 Unidade: ${ctx.unitName} · Departamento: ${ctx.departmentName}`
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '⚠️ Solicite ao owner que configure seu Slack para receber notificações futuras.'
        }
      ]
    }
  ];
  void sendDmToSlackUser(client, SLACK_ID_LUAN, plain, blocks).catch((e) =>
    console.error('[notificarOwnersJoiner] Falha DM fallback (owner sem Slack):', e)
  );
}

type HiringResolvedKitRow = {
  ki: { toolCode: string; toolName: string; accessLevelDesc: string | null };
  tool: {
    id: string;
    name: string;
    ownerId: string | null;
    owner: { id: string; email: string; name: string } | null;
  };
  ownerSlackId: string;
};

/**
 * JML — Contratação: DMs aos Owners (somente com Owner cadastrado), uma mensagem por ferramenta no canal SI,
 * e DM consolidado para SUPER_ADMINs (+ env SI_BYPASS_APPROVER_EMAILS). Fire-and-forget nos envios individuais.
 * Botão: `hiring_access_confirmed` (compat: `joiner_access_done` em mensagens antigas).
 */
export async function notificarOwnersJoiner(ctx: HiringKbsNotificationContext): Promise<void> {
  if (!slackApp?.client) return;
  if (!ONBOARDING_REQUEST_TYPES_SLACK.includes(ctx.requestType)) return;
  const client = slackApp.client;
  const linkChamado = `${FRONTEND_URL}/tickets?id=${ctx.requestId}`;
  const shortId = ctx.requestId.slice(0, 8);
  const notifiedAtBrt = formatTimestampBrt();
  const footerCtx = `Chamado #${shortId} · Aberto por ${ctx.requesterName || '—'} · Encerrado por ${ctx.closedByName || '—'} · Theris`;

  if (SLACK_SI_CHANNEL_ID && ctx.jumpCloudSi) {
    const tsBrt = formatTimestampBrt();
    const jcBlocks: any[] =
      ctx.jumpCloudSi.outcome === 'created'
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text:
                  `✨ *Usuário criado no JumpCloud* · \`${ctx.jumpCloudSi.email}\` · ID: \`${ctx.jumpCloudSi.jumpcloudId}\`\n` +
                  `📧 *Email de boas-vindas enviado pelo JumpCloud* para definição de senha.\n` +
                  `🕒 ${tsBrt} BRT`
              }
            },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `_${footerCtx}_` }] }
          ]
        : [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `⚠️ *Usuário não foi criado no JumpCloud automaticamente* — verificar manualmente.\n🕒 ${tsBrt} BRT`
              }
            },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `_${footerCtx}_` }] }
          ];
    const jcText =
      ctx.jumpCloudSi.outcome === 'created'
        ? `✨ JumpCloud: usuário criado · ${ctx.jumpCloudSi.email} · ${ctx.jumpCloudSi.jumpcloudId} · convite por e-mail`
        : '⚠️ JumpCloud: verificar criação manual do usuário';
    void client.chat
      .postMessage({ channel: SLACK_SI_CHANNEL_ID, text: jcText, blocks: jcBlocks })
      .catch((e) => console.error('[notificarOwnersJoiner] Falha aviso JumpCloud no canal SI:', e));
    if (ctx.jumpCloudSi.outcome === 'created') {
      void sendJumpCloudHiringManagerDm(client, ctx).catch((e) =>
        console.error('[notificarOwnersJoiner] Falha DM gestor (JumpCloud):', e)
      );
    }
  }

  const role = await prisma.role.findUnique({
    where: { id: ctx.roleId },
    include: { kitItems: true }
  });
  if (!role?.kitItems?.length) return;

  const hireeRow = await prisma.user.findUnique({
    where: { id: ctx.collaboratorUserId },
    select: { email: true }
  });
  const hireeEmail = hireeRow?.email?.trim() || '—';

  let hiringFallbackSlackCount = 0;
  const resolved: HiringResolvedKitRow[] = [];
  for (const ki of role.kitItems) {
    try {
      const tool = await resolveToolForKitItem(ki);
      if (!tool) {
        console.warn(`[notificarOwnersJoiner] Ferramenta do KBS não encontrada no catálogo: ${ki.toolName} (${ki.toolCode})`);
        continue;
      }
      if (!tool.ownerId || !tool.owner?.email) {
        console.warn(`[notificarOwnersJoiner] Ferramenta sem Owner cadastrado — DM ignorada: ${tool.name} (\`${ki.toolCode}\`)`);
        hiringFallbackSlackCount += 1;
        fireJoinerFallbackDmSemOwnerNoCatalogo(client, ctx, ki, { name: tool.name }, hireeEmail);
        continue;
      }
      let ownerSlackId: string | null = null;
      try {
        const lookup = await client.users.lookupByEmail({ email: tool.owner.email });
        ownerSlackId = lookup.user?.id ?? null;
      } catch (_) {}
      if (!ownerSlackId) {
        console.warn(`[notificarOwnersJoiner] Owner não encontrado no Slack para ${tool.name} (${tool.owner.email})`);
        hiringFallbackSlackCount += 1;
        fireJoinerFallbackDmOwnerSemSlack(client, ctx, ki, { name: tool.name }, tool.owner, hireeEmail);
        continue;
      }
      resolved.push({
        ki: { toolCode: ki.toolCode, toolName: ki.toolName, accessLevelDesc: ki.accessLevelDesc },
        tool: { id: tool.id, name: tool.name, ownerId: tool.ownerId, owner: tool.owner },
        ownerSlackId
      });
    } catch (e) {
      console.error(`[notificarOwnersJoiner] Erro ao resolver KBS item ${ki.toolName}:`, e);
    }
  }

  for (const row of resolved) {
    const payload = JSON.stringify({
      solicitacaoId: ctx.requestId,
      toolId: row.tool.id,
      ownerId: row.tool.ownerId,
      userId: ctx.collaboratorUserId
    });
    const nivel = row.ki.accessLevelDesc || '—';
    const blocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: '🆕 Novo colaborador para liberar acesso', emoji: true } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*${ctx.collaboratorName}* foi contratado(a) como *${ctx.jobTitle}*\n` +
            `no departamento *${ctx.departmentName}* · Unidade *${ctx.unitName}*\n` +
            `Data de início: ${ctx.startDate}\n\n` +
            `_Nível KBS:_ ${nivel}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Ferramenta sob sua responsabilidade:\n*${row.tool.name}* (\`${row.ki.toolCode}\`)`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Acesso Liberado', emoji: true },
            action_id: 'hiring_access_confirmed',
            value: payload,
            style: 'primary'
          }
        ]
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `🔗 <${linkChamado}|Ver chamado no Theris> · _${footerCtx}_` }] }
    ];
    const dmText = `🆕 Contratação — ${ctx.collaboratorName} — ${row.tool.name} — provisionar acesso`;
    void client.chat
      .postMessage({ channel: row.ownerSlackId, text: dmText, blocks })
      .then(() => console.log(`[notificarOwnersJoiner] DM enviada (${row.tool.name})`))
      .catch((e) => console.error(`[notificarOwnersJoiner] Falha DM owner ${row.tool.name}:`, e));
  }

  if (SLACK_SI_CHANNEL_ID) {
    for (const row of resolved) {
      const ownerEmail = row.tool.owner?.email || '—';
      const blocksSi: any[] = [
        { type: 'header', text: { type: 'plain_text', text: '🧑‍💼 Contratação · Acesso a provisionar', emoji: true } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Colaborador:*\n${ctx.collaboratorName}` },
            { type: 'mrkdwn', text: `*Cargo:*\n${ctx.jobTitle}` },
            { type: 'mrkdwn', text: `*Departamento:*\n${ctx.departmentName}` },
            { type: 'mrkdwn', text: `*Unidade:*\n${ctx.unitName}` }
          ]
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `🔧 *${row.tool.name}* (\`${row.ki.toolCode}\`)\n` +
              `👤 Owner: ${row.tool.owner?.name || '—'} (${ownerEmail})\n` +
              `📅 Notificado em: ${notifiedAtBrt}`
          }
        },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `_${footerCtx}_` }] }
      ];
      void client.chat
        .postMessage({
          channel: SLACK_SI_CHANNEL_ID,
          text: `🧑‍💼 Contratação · ${ctx.collaboratorName} · ${row.tool.name} — provisionar acesso`,
          blocks: blocksSi
        })
        .catch((e) => console.error('[notificarOwnersJoiner] Falha post SI:', e));
    }
  }

  if (SLACK_SI_CHANNEL_ID && hiringFallbackSlackCount > 0) {
    const fbText = `⚠️ ${hiringFallbackSlackCount} ferramenta(s) sem owner no Slack — notificação de fallback enviada para SI.`;
    void client.chat
      .postMessage({
        channel: SLACK_SI_CHANNEL_ID,
        text: fbText,
        mrkdwn: true
      })
      .catch((e) => console.error('[notificarOwnersJoiner] Falha post SI (fallback hiring):', e));
  }

  const siDmLines =
    resolved.length === 0
      ? '_Nenhuma ferramenta do KBS com Owner cadastrado para notificar._'
      : resolved
          .map(
            (r) =>
              `🔧 *${r.tool.name}* (\`${r.ki.toolCode}\`) — Owner: ${r.tool.owner?.name || '—'} (${r.tool.owner?.email || '—'}) · 📅 ${notifiedAtBrt}`
          )
          .join('\n');
  const siDmText =
    `🧑‍💼 *Contratação · Acesso a provisionar*\n\n` +
    `👤 *Colaborador:* ${ctx.collaboratorName}\n` +
    `💼 *Cargo:* ${ctx.jobTitle}\n` +
    `🏢 *Departamento:* ${ctx.departmentName}\n` +
    `📍 *Unidade:* ${ctx.unitName}\n` +
    `📅 *Data de início:* ${ctx.startDate}\n\n` +
    `*Ferramentas (KBS):*\n${siDmLines}\n\n` +
    `🕒 *Resumo gerado em:* ${notifiedAtBrt}\n` +
    `_${footerCtx}_`;

  void collectSuperAdminSlackUserIds(client)
    .then((slackIds) => {
      for (const sid of slackIds) {
        void sendDmToSlackUser(client, sid, siDmText).catch((e) =>
          console.error('[notificarOwnersJoiner] Falha DM SI team:', e)
        );
      }
    })
    .catch((e) => console.error('[notificarOwnersJoiner] Falha ao resolver IDs SI:', e));
}

/**
 * JML — Mudança de Cargo: notifica Owners com mensagem específica e botão "✅ Nível Ajustado" (cargo_review_done).
 */
export async function notificarOwnersMudancaCargo(
  colaborador: { nome: string; cargoAnterior: string; deptAnterior: string; cargoNovo: string; deptNovo: string },
  kbsAnterior: KBSItem[],
  kbsNovo: KBSItem[],
  chamadoId: string,
  dataAcao: string
): Promise<void> {
  if (!slackApp?.client) return;
  const client = slackApp.client;
  const anteriorByName = new Map<string, string | null>();
  kbsAnterior.forEach((k) => anteriorByName.set(k.toolName, k.accessLevelDesc ?? null));
  const linkChamado = `${FRONTEND_URL}/tickets?id=${chamadoId}`;
  for (const n of kbsNovo) {
    try {
      const tool = await prisma.tool.findFirst({
        where: {
          OR: [
            { name: { equals: n.toolName, mode: 'insensitive' } },
            { name: { contains: n.toolName, mode: 'insensitive' } }
          ]
        },
        include: { owner: { select: { email: true, name: true } } }
      });
      let slackUserId: string | null = null;
      if (tool?.owner?.email) {
        try {
          const lookup = await client.users.lookupByEmail({ email: tool.owner.email });
          slackUserId = lookup.user?.id ?? null;
        } catch (_) {}
      }
      if (!slackUserId && SLACK_ID_LUAN) slackUserId = SLACK_ID_LUAN;
      if (!slackUserId) {
        console.warn(`[notificarOwnersMudancaCargo] Owner não encontrado no Slack para ferramenta ${n.toolName}.`);
        continue;
      }
      const nivelAnterior = anteriorByName.get(n.toolName) ?? '—';
      const nivelNovo = n.accessLevelDesc ?? '—';
      const blocks: any[] = [
        { type: 'header', text: { type: 'plain_text', text: '🔄 Mudança de Cargo — Revisão de Acesso', emoji: true } },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `Um colaborador sob sua ferramenta mudou de cargo dentro do mesmo departamento.\n\n` +
              `*Colaborador:* ${colaborador.nome}\n` +
              `*Cargo anterior:* ${colaborador.cargoAnterior}\n` +
              `*Novo cargo:* ${colaborador.cargoNovo}\n` +
              `*Departamento:* ${colaborador.deptNovo}\n` +
              `*Data da mudança:* ${dataAcao}\n\n` +
              `🛠 *Ferramenta sob sua responsabilidade:* *${tool!.name}*\n` +
              `• Nível anterior: ${nivelAnterior}\n` +
              `• Novo nível: ${nivelNovo}\n\n` +
              `Por favor, revise e ajuste o nível de acesso no sistema.\n` +
              `👉 Ver chamado: <${linkChamado}|link no Theris>`
          }
        },
        { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: '✅ Nível Ajustado', emoji: true }, action_id: 'cargo_review_done', value: JSON.stringify({ requestId: chamadoId, toolId: tool!.id }), style: 'primary' }] }
      ];
      await client.chat.postMessage({
        channel: slackUserId,
        text: `🔄 Mudança de Cargo — ${colaborador.nome} — ${tool!.name}. Ajuste o nível.`,
        blocks
      });
      console.log(`[notificarOwnersMudancaCargo] DM enviada para owner de ${tool!.name}.`);
    } catch (e) {
      console.error(`[notificarOwnersMudancaCargo] Erro ao notificar owner de ${n.toolName}:`, e);
    }
  }
}

/**
 * JML — Mudança de Departamento: duas notificações — Owner KBS anterior (revogar) e Owner KBS novo (provisionar).
 * Botão: dept_review_done com value { requestId, toolId, tipo: 'revogacao' | 'provisionamento' | 'revisao' }.
 */
export async function notificarOwnersMudancaDepto(
  colaborador: { nome: string; cargoAnterior: string; deptAnterior: string; cargoNovo: string; deptNovo: string },
  kbsAnterior: KBSItem[],
  kbsNovo: KBSItem[],
  chamadoId: string,
  dataAcao: string
): Promise<void> {
  if (!slackApp?.client) return;
  const client = slackApp.client;
  const anteriorByName = new Map<string, string | null>();
  const novoByName = new Map<string, string | null>();
  kbsAnterior.forEach((k) => anteriorByName.set(k.toolName, k.accessLevelDesc ?? null));
  kbsNovo.forEach((k) => novoByName.set(k.toolName, k.accessLevelDesc ?? null));
  const linkChamado = `${FRONTEND_URL}/tickets?id=${chamadoId}`;

  const onlyAnterior = kbsAnterior.filter((a) => !novoByName.has(a.toolName));
  const onlyNovo = kbsNovo.filter((n) => !anteriorByName.has(n.toolName));
  const inBoth = kbsNovo.filter((n) => anteriorByName.has(n.toolName));

  const sendDeptDm = async (
    tool: { id: string; name: string; owner: { email: string; name: string } | null },
    tipo: 'revogacao' | 'provisionamento' | 'revisao',
    header: string,
    body: string,
    buttonText: string
  ) => {
    let slackUserId: string | null = null;
    if (tool.owner?.email) {
      try {
        const lookup = await client.users.lookupByEmail({ email: tool.owner.email });
        slackUserId = lookup.user?.id ?? null;
      } catch (_) {}
    }
    if (!slackUserId && SLACK_ID_LUAN) slackUserId = SLACK_ID_LUAN;
    if (!slackUserId) return;
    const value = JSON.stringify({ requestId: chamadoId, toolId: tool.id, tipo });
    const blocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: header, emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: body + `\n👉 Ver chamado: <${linkChamado}|link no Theris>` } },
      { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: buttonText, emoji: true }, action_id: 'dept_review_done', value, style: 'primary' }] }
    ];
    await client.chat.postMessage({ channel: slackUserId, text: header + ' — ' + tool.name, blocks });
  };

  for (const a of onlyAnterior) {
    try {
      const tool = await prisma.tool.findFirst({
        where: { OR: [{ name: { equals: a.toolName, mode: 'insensitive' } }, { name: { contains: a.toolName, mode: 'insensitive' } }] },
        include: { owner: { select: { email: true, name: true } } }
      });
      if (!tool) continue;
      await sendDeptDm(
        tool,
        'revogacao',
        '🔄 Mudança de Departamento — Revogação de Acesso',
        `Um colaborador saiu do departamento e precisa ter o acesso revogado na sua ferramenta.\n\n` +
          `*Colaborador:* ${colaborador.nome}\n` +
          `*Departamento anterior:* ${colaborador.deptAnterior}\n` +
          `*Novo departamento:* ${colaborador.deptNovo}\n` +
          `*Data da mudança:* ${dataAcao}\n\n` +
          `🛠 *Ferramenta sob sua responsabilidade:* *${tool.name}* — Acesso a ser revogado\n\n` +
          `Por favor, remova o acesso do colaborador no sistema.`,
        '✅ Acesso Revogado'
      );
    } catch (e) {
      console.error(`[notificarOwnersMudancaDepto] Erro revogação ${a.toolName}:`, e);
    }
  }
  for (const n of onlyNovo) {
    try {
      const tool = await prisma.tool.findFirst({
        where: { OR: [{ name: { equals: n.toolName, mode: 'insensitive' } }, { name: { contains: n.toolName, mode: 'insensitive' } }] },
        include: { owner: { select: { email: true, name: true } } }
      });
      if (!tool) continue;
      await sendDeptDm(
        tool,
        'provisionamento',
        '🔄 Mudança de Departamento — Provisionamento de Acesso',
        `Um colaborador chegou ao departamento e precisa ter acesso concedido na sua ferramenta.\n\n` +
          `*Colaborador:* ${colaborador.nome}\n` +
          `*Departamento anterior:* ${colaborador.deptAnterior}\n` +
          `*Novo departamento:* ${colaborador.deptNovo}\n` +
          `*Data da mudança:* ${dataAcao}\n\n` +
          `🛠 *Ferramenta sob sua responsabilidade:* *${tool.name}* — Nível a conceder: ${n.accessLevelDesc ?? '—'}\n\n` +
          `Por favor, provisione o acesso no sistema.`,
        '✅ Acesso Concedido'
      );
    } catch (e) {
      console.error(`[notificarOwnersMudancaDepto] Erro provisionamento ${n.toolName}:`, e);
    }
  }
  for (const n of inBoth) {
    try {
      const tool = await prisma.tool.findFirst({
        where: { OR: [{ name: { equals: n.toolName, mode: 'insensitive' } }, { name: { contains: n.toolName, mode: 'insensitive' } }] },
        include: { owner: { select: { email: true, name: true } } }
      });
      if (!tool) continue;
      const nivelAnt = anteriorByName.get(n.toolName) ?? '—';
      const nivelNovo = n.accessLevelDesc ?? '—';
      await sendDeptDm(
        tool,
        'revisao',
        '🔄 Mudança de Departamento — Revisão de Nível',
        `Colaborador mudou de departamento e mantém esta ferramenta com nível alterado.\n\n` +
          `*Colaborador:* ${colaborador.nome}\n` +
          `*Depto anterior:* ${colaborador.deptAnterior} → *Novo:* ${colaborador.deptNovo}\n` +
          `*Data:* ${dataAcao}\n\n` +
          `🛠 *${tool.name}:* Nível anterior: ${nivelAnt} → Novo nível: ${nivelNovo}\n\n` +
          `Revise e ajuste o nível no sistema.`,
        '✅ Nível Ajustado'
      );
    } catch (e) {
      console.error(`[notificarOwnersMudancaDepto] Erro revisão ${n.toolName}:`, e);
    }
  }
}

/** Item de kit (KBS) do cargo para notificação de desligamento. */
export type DesligamentoKitItem = { toolName: string; accessLevelDesc: string | null };

/** Linha para resumo SI — AEX revogados no desligamento. */
export type DesligamentoAexSiLine = { toolName: string; toolCode: string; ownerName: string };

/**
 * JumpCloud: remove grupo ap_* do colaborador desligado (após Access já revogado no Prisma).
 * Fire-and-forget.
 */
export function scheduleDesligamentoAexJumpCloudRevoke(userEmail: string, toolAcronym: string | null | undefined): void {
  const code = (toolAcronym || '').trim();
  if (!code || !/^ap_/i.test(code)) return;
  void (async () => {
    try {
      const { getSystemUserIdByEmail } = await import('./jumpcloudService');
      const { revokeExtraordinaryAccessOnJumpCloud } = await import('./jumpcloudGroupSyncService');
      const jcId = await getSystemUserIdByEmail(userEmail);
      if (jcId) await revokeExtraordinaryAccessOnJumpCloud(jcId, code);
    } catch (e) {
      console.error('[Desligamento AEX] JumpCloud revoke:', e);
    }
  })();
}

/**
 * DM ao Owner: AEX do colaborador desligado (Theris/JC já revogados pelo job de automação).
 * Fire-and-forget.
 */
export function scheduleDesligamentoAexOwnerDm(p: {
  requestId: string;
  collaboratorName: string;
  offboardUserId: string;
  toolId: string;
  toolName: string;
  toolCode: string;
  owner: { email: string | null; name: string | null } | null;
}): void {
  if (!slackApp?.client) return;
  const client = slackApp.client;
  void (async () => {
    try {
      let ownerSlackId: string | null = null;
      const ownerEmail = p.owner?.email ?? null;
      const ownerName = p.owner?.name ?? '—';
      if (ownerEmail) {
        try {
          const lookup = await client.users.lookupByEmail({ email: ownerEmail });
          ownerSlackId = lookup.user?.id ?? null;
        } catch (_) {}
      }
      const fallbackNote =
        !ownerSlackId && p.owner
          ? `\n\n_📋 Owner cadastrado: *${ownerName}* (${ownerEmail || 'sem e-mail'}) — não localizado no Slack; esta mensagem foi encaminhada para acompanhamento do SI._`
          : '';
      if (!ownerSlackId && SLACK_ID_LUAN) ownerSlackId = SLACK_ID_LUAN;
      if (!ownerSlackId) {
        console.warn('[Desligamento AEX] Sem destino DM para tool', p.toolName);
        return;
      }
      const linkChamado = `${FRONTEND_URL}/tickets?id=${p.requestId}`;
      const payload = JSON.stringify({
        requestId: p.requestId,
        toolId: p.toolId,
        userId: p.offboardUserId
      });
      const blocks: any[] = [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🔴 Colaborador desligado · Acesso Extraordinário a revogar', emoji: true }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `*${p.collaboratorName}* foi desligado(a).\n` +
              `Ele(a) possuía acesso extraordinário à ferramenta sob sua responsabilidade.${fallbackNote}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `🔧 *${p.toolName}* (\`${p.toolCode}\`)\n` +
              `⚠️ Acesso extraordinário — requer atenção especial`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Acesso Revogado', emoji: true },
              action_id: 'leaver_aex_done',
              value: payload,
              style: 'primary'
            }
          ]
        },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `🔗 <${linkChamado}|Ver chamado no Theris>` }] }
      ];
      await client.chat.postMessage({
        channel: ownerSlackId,
        text: `🔴 Desligamento AEX: ${p.collaboratorName} — ${p.toolName}. Confirme após verificar/revogar.`,
        blocks
      });
    } catch (e) {
      console.error('[Desligamento AEX] DM owner:', e);
    }
  })();
}

/**
 * Canal SI: resumo KBS (cargo) + AEX revogados automaticamente no desligamento.
 */
export async function postDesligamentoSiResumoKbsEAex(params: {
  requestId: string;
  collaboratorName: string;
  jobTitle: string;
  departmentName: string;
  unitName: string;
  actionDate: string | null;
  kitItems: DesligamentoKitItem[];
  aexLines: DesligamentoAexSiLine[];
}): Promise<void> {
  const channelId = (SLACK_SI_CHANNEL_ID || '').trim();
  if (!slackApp?.client || !channelId) return;
  if (params.kitItems.length === 0 && params.aexLines.length === 0) return;

  const client = slackApp.client;
  const dataDesligamento = params.actionDate || new Date().toISOString().slice(0, 10);
  const shortId = params.requestId.slice(0, 8);
  const linkChamado = `${FRONTEND_URL}/tickets?id=${params.requestId}`;
  const tsBrt = formatTimestampBrt();

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🔴 Desligamento · Ferramentas (KBS + AEX)', emoji: true }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*Colaborador:* ${params.collaboratorName}\n` +
          `*Cargo:* ${params.jobTitle} — ${params.departmentName} — ${params.unitName}\n` +
          `*Data de desligamento:* ${dataDesligamento}\n` +
          `🔗 <${linkChamado}|Ver chamado #${shortId}>`
      }
    }
  ];

  if (params.kitItems.length > 0) {
    const kbsLines: string[] = [];
    for (const item of params.kitItems) {
      try {
        const tool = await prisma.tool.findFirst({
          where: {
            OR: [
              { name: { equals: item.toolName, mode: 'insensitive' } },
              { name: { contains: item.toolName, mode: 'insensitive' } }
            ]
          },
          include: { owner: { select: { name: true } } }
        });
        const ownerLbl = tool?.owner?.name ? ` — Owner: ${tool.owner.name}` : '';
        kbsLines.push(`• *${item.toolName}*${ownerLbl}`);
      } catch (_) {
        kbsLines.push(`• *${item.toolName}*`);
      }
    }
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Ferramentas (KBS do cargo):*\n${kbsLines.join('\n')}`
      }
    });
  }

  if (params.aexLines.length > 0) {
    const aexText = params.aexLines
      .map((l) => `• *${l.toolName}* (\`${l.toolCode}\`) — Owner: ${l.ownerName}`)
      .join('\n');
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚠️ *Acessos extraordinários revogados automaticamente:*\n${aexText}`
      }
    });
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `Resumo SI · ${tsBrt} BRT · Theris` }]
  });

  const fallbackText = `🔴 Desligamento ${params.collaboratorName} · KBS: ${params.kitItems.length} · AEX: ${params.aexLines.length}`;
  await client.chat.postMessage({ channel: channelId, text: fallbackText, blocks, mrkdwn: true });
}

/**
 * Notifica cada Owner das ferramentas do colaborador desligado (KBS do cargo anterior).
 * DM com Block Kit + botão "✅ Acesso Revogado" (leaver_access_done).
 * Chamar após runOffboardingAutomation (que já desvinculou o usuário); passar kitItems do cargo antes do update.
 */
export async function notificarOwnersDesligamento(
  requestId: string,
  colaboradorName: string,
  jobTitle: string,
  departmentName: string,
  unitName: string,
  kitItems: DesligamentoKitItem[],
  actionDate: string | null
): Promise<void> {
  if (!slackApp?.client || kitItems.length === 0) return;
  const client = slackApp.client;
  const lastDayFormatted = formatDateOnlyBrt(actionDate || new Date().toISOString().slice(0, 10));
  const linkChamado = `${FRONTEND_URL}/tickets?id=${requestId}`;

  for (const item of kitItems) {
    try {
      const tool = await prisma.tool.findFirst({
        where: {
          OR: [
            { name: { equals: item.toolName, mode: 'insensitive' } },
            { name: { contains: item.toolName, mode: 'insensitive' } }
          ]
        },
        include: { owner: { select: { id: true, email: true, name: true } } }
      });
      let ownerSlackId: string | null = null;
      if (tool?.owner?.email) {
        try {
          const lookup = await client.users.lookupByEmail({ email: tool.owner.email });
          ownerSlackId = lookup.user?.id ?? null;
        } catch (_) {}
      }
      if (!ownerSlackId && SLACK_ID_LUAN) ownerSlackId = SLACK_ID_LUAN;
      if (!ownerSlackId) {
        console.warn(`[notificarOwnersDesligamento] Owner não encontrado no Slack para ${item.toolName}.`);
        continue;
      }
      const payload = JSON.stringify({ requestId, toolId: tool.id });
      const blocks: any[] = [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Desligamento — Revogação de Acesso', emoji: true }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `Um colaborador foi desligado e possui acesso ativo na sua ferramenta.\n\n` +
              `*Colaborador:* ${colaboradorName}\n` +
              `*Cargo:* ${jobTitle} — ${departmentName} — ${unitName}\n` +
              `*Data de desligamento:* ${lastDayFormatted}\n\n` +
              `🛠 *Ferramenta sob sua responsabilidade:* *${tool.name}* — Acesso a ser revogado\n\n` +
              `⚠️ Por favor, revogue o acesso conforme o cronograma abaixo.\n` +
              `_Após remover o usuário da ferramenta, clique no botão abaixo para confirmar._`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `⚠️ *Atenção:* A revogação deve ser executada *somente a partir das 18h do dia ${lastDayFormatted}*. ` +
              `Executar antes pode interromper integrações ativas e prejudicar o encerramento de tarefas do colaborador.`
          }
        },
        {
          type: 'actions',
          elements: [
            { type: 'button', text: { type: 'plain_text', text: '✅ Acesso Revogado', emoji: true }, action_id: 'leaver_access_done', value: payload, style: 'primary' }
          ]
        },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `🔗 <${linkChamado}|Ver chamado no Theris>` }] }
      ];
      await client.chat.postMessage({
        channel: ownerSlackId,
        text: `🚨 Revogação de acesso: ${colaboradorName} desligado — ferramenta ${tool.name}. Confirme após revogar.`,
        blocks
      });
      console.log(`[notificarOwnersDesligamento] DM enviada para owner de ${tool.name} (Slack ID: ${ownerSlackId}).`);
    } catch (e) {
      console.error(`[notificarOwnersDesligamento] Erro ao notificar owner de ${item.toolName}:`, e);
    }
  }
}

/**
 * Envia confirmação de revogação para Luan e Grupo Segurança (após Owner clicar em "Marcar como Concluído").
 * Chamado internamente pelo handler do botão; falha no Slack não bloqueia atualização no banco.
 */
export async function notificarConfirmacaoRevogacaoDesligamento(
  ownerName: string,
  toolName: string,
  colaboradorName: string,
  requestId: string
): Promise<void> {
  if (!slackApp?.client) return;
  const client = slackApp.client;
  const now = new Date();
  const horario = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString('pt-BR');
  const linkChamado = `${FRONTEND_URL}/tickets?id=${requestId}`;
  const text =
    `✅ *Atualização de Auditoria — Acesso Revogado*\n\n` +
    `O Owner *${ownerName}* confirmou a revogação de acessos da ferramenta *${toolName}* para o colaborador desligado *${colaboradorName}*.\n\n` +
    `🕒 *Horário da confirmação:* ${horario}\n` +
    `📂 *Status do Chamado:* Atualizado para "Acessos Revogados pelo Owner".\n\n` +
    `🔗 <${linkChamado}|Ver chamado no Theris>`;
  const targets: string[] = [];
  if (SLACK_ID_LUAN) targets.push(SLACK_ID_LUAN);
  if (SLACK_ID_RENATA) targets.push(SLACK_ID_RENATA);
  if (SLACK_SI_CHANNEL_ID) targets.push(SLACK_SI_CHANNEL_ID);
  if (SLACK_GRUPO_SEGURANCA_CHANNEL_ID && SLACK_GRUPO_SEGURANCA_CHANNEL_ID !== SLACK_SI_CHANNEL_ID) targets.push(SLACK_GRUPO_SEGURANCA_CHANNEL_ID);
  for (const channel of targets) {
    try {
      await client.chat.postMessage({ channel, text });
      console.log(`[notificarConfirmacaoRevogacaoDesligamento] Enviado para ${channel}`);
    } catch (e) {
      console.error(`[notificarConfirmacaoRevogacaoDesligamento] Falha ao enviar para ${channel}:`, e);
    }
  }
}

/**
 * JML — Confirmação para SI quando Owner clica em "✅ Acesso Revogado" (Leaver): mensagem "✅ Leaver Concluído".
 */
export async function notificarConfirmacaoLeaverConcluido(
  ownerName: string,
  toolName: string,
  colaboradorName: string,
  requestId: string
): Promise<void> {
  if (!slackApp?.client) return;
  const client = slackApp.client;
  const now = new Date();
  const dataHora = now.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const text =
    `✅ *Leaver Concluído*\n\n` +
    `O Owner *${ownerName}* confirmou a revogação de acesso de *${colaboradorName}* em *${toolName}*.\n` +
    `🕒 ${dataHora}`;
  const targets: string[] = [];
  if (SLACK_ID_LUAN) targets.push(SLACK_ID_LUAN);
  if (SLACK_ID_RENATA) targets.push(SLACK_ID_RENATA);
  if (SLACK_SI_CHANNEL_ID) targets.push(SLACK_SI_CHANNEL_ID);
  for (const channel of targets) {
    try {
      await client.chat.postMessage({ channel, text });
    } catch (e) {
      console.error(`[notificarConfirmacaoLeaverConcluido] Falha ao enviar para ${channel}:`, e);
    }
  }
}

/**
 * Notificação para Luan e canal SI quando um Owner conclui a revisão trimestral de acessos.
 */
export async function notificarRevisaoTrimestralConcluida(
  ownerName: string,
  toolNames: string[],
  completedAt: Date
): Promise<void> {
  if (!slackApp?.client) return;
  const client = slackApp.client;
  const dataHora = new Date(completedAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const toolsList = toolNames.length ? toolNames.join(', ') : '—';
  const text =
    `📝 *Auditoria Periódica Realizada*\n\n` +
    `O Owner *${ownerName}* concluiu a revisão trimestral.\n\n` +
    `🛠 *Ferramentas revisadas:* ${toolsList}\n` +
    `🕒 *Data:* ${dataHora}\n` +
    `👤 *Responsável:* ${ownerName}\n` +
    `✅ *Status:* Base de usuários e níveis de acesso validada.`;
  const targets: string[] = [];
  if (SLACK_ID_LUAN) targets.push(SLACK_ID_LUAN);
  if (SLACK_SI_CHANNEL_ID) targets.push(SLACK_SI_CHANNEL_ID);
  for (const channel of targets) {
    try {
      await client.chat.postMessage({ channel, text });
      console.log(`[notificarRevisaoTrimestralConcluida] Enviado para ${channel}`);
    } catch (e) {
      console.error(`[notificarRevisaoTrimestralConcluida] Falha ao enviar para ${channel}:`, e);
    }
  }
}

registerPessoasModalCascadeHandlers(slackApp);