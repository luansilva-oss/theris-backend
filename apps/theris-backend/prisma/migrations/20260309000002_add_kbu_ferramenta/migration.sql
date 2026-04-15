-- CreateTable
CREATE TABLE IF NOT EXISTS "KBUFerramenta" (
    "id"        TEXT NOT NULL,
    "nome"      TEXT NOT NULL,
    "sigla"     TEXT,
    "owner"     TEXT,
    "ativo"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KBUFerramenta_pkey" PRIMARY KEY ("id")
);
