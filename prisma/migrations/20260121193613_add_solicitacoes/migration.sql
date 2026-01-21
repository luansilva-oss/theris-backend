-- CreateEnum
CREATE TYPE "TipoSolicitacao" AS ENUM ('MUDANCA_CARGO', 'NOVA_CONTRATACAO', 'DESLIGAMENTO', 'AJUSTE_ACESSO');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('PENDENTE_SI', 'PENDENTE_GESTOR', 'APROVADO', 'RECUSADO', 'PAUSADO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "tipo" "TipoSolicitacao" NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'PENDENTE_SI',
    "colaboradorAlvo" TEXT NOT NULL,
    "cargoNovo" TEXT,
    "departamentoNovo" TEXT,
    "justificativa" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
