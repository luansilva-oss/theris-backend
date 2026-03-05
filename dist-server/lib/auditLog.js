"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarMudanca = registrarMudanca;
const prisma_1 = require("./prisma");
/** Registra uma mudança no histórico de auditoria. */
async function registrarMudanca(params) {
    return prisma_1.prisma.historicoMudanca.create({
        data: {
            tipo: params.tipo,
            entidadeTipo: params.entidadeTipo,
            entidadeId: params.entidadeId,
            descricao: params.descricao,
            dadosAntes: params.dadosAntes ? params.dadosAntes : undefined,
            dadosDepois: params.dadosDepois ? params.dadosDepois : undefined,
            autorId: params.autorId ?? undefined,
        },
    });
}
