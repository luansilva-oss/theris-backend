-- CreateTable
CREATE TABLE "HistoricoMudanca" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidadeTipo" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "autorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoMudanca_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HistoricoMudanca" ADD CONSTRAINT "HistoricoMudanca_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
