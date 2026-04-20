-- ts da mensagem ROOT_ACCESS com botões no canal SI (chat.update após decisão)
ALTER TABLE "Request" ADD COLUMN "siSlackRootChannelTs" TEXT;
