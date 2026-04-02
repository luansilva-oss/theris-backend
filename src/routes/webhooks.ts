import { Router, Request, Response } from 'express';
import { WebClient } from '@slack/web-api';

const webhookRouter = Router();
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

type JumpCloudAlertPayload = {
  type?: string;
  tags?: Array<{ key?: string; value?: string }>;
  organization_object_id?: string;
  [key: string]: unknown;
};

webhookRouter.post('/jumpcloud-alerts', (req: Request, res: Response) => {
  // Fire-and-forget: acknowledge first, process asynchronously.
  res.status(200).json({ ok: true });

  void (async () => {
    const payload = (req.body ?? {}) as JumpCloudAlertPayload;
    const providedSecret = String(req.query.secret ?? '').trim();
    const expectedSecret = String(process.env.JUMPCLOUD_WEBHOOK_SECRET ?? '').trim();

    if (!expectedSecret) {
      console.log('[JumpCloud Webhook] Ignorado: JUMPCLOUD_WEBHOOK_SECRET não configurado.');
      return;
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      console.log('[JumpCloud Webhook] Ignorado: secret inválido.');
      return;
    }

    console.log('[JumpCloud Webhook] Payload recebido:', payload);

    const channelId = String(process.env.SLACK_SI_CHANNEL_ID ?? '').trim();
    if (!channelId) {
      console.log('[JumpCloud Webhook] Ignorado: SLACK_SI_CHANNEL_ID não configurado.');
      return;
    }

    const type = String(payload.type ?? 'N/A');
    const details = Array.isArray(payload.tags) && payload.tags.length > 0
      ? payload.tags.map((tag) => `${String(tag?.key ?? 'N/A')}: ${String(tag?.value ?? 'N/A')}`).join('\n')
      : 'N/A';

    try {
      await slackClient.chat.postMessage({
        channel: channelId,
        text: `JumpCloud Alert | ${type}`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'JumpCloud Alert', emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Type:*\n${type}` },
              { type: 'mrkdwn', text: `*Detalhes:*\n${details}` }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('[JumpCloud Webhook] Falha ao enviar alerta para o Slack:', error);
    }
  })();
});

export default webhookRouter;
