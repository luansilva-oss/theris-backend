# Slack - Configuração de Interatividade

Para o fluxo de Aprovação de Acesso Extraordinário (AEX), o Slack envia payloads de **interatividade** (cliques em botões) para o backend.

## URL de Interatividade

No Slack App Dashboard:

1. Acesse **Interactivity & Shortcuts**
2. Em **Request URL**, configure:
   ```
   https://theris-backend.onrender.com/api/slack/events
   ```

A mesma URL é usada para:
- **Events API** (eventos do workspace)
- **Interactivity** (cliques em botões, modais, etc.)
- **Slash Commands**

O Bolt (`@slack/bolt`) roteia todos os tipos de requisição para a mesma rota Express `/api/slack/events`.

## Variáveis de ambiente

- `SLACK_SIGNING_SECRET` — obrigatório para validar assinaturas das requisições do Slack
- `SLACK_BOT_TOKEN` — token do bot para enviar DMs e postar mensagens
