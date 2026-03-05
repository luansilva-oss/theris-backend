import { prisma } from './prisma';

export interface AuditLogParams {
    tipo: string;
    entidadeTipo: string;
    entidadeId: string;
    descricao: string;
    dadosAntes?: object;
    dadosDepois?: object;
    autorId?: string;
}

/** Registra uma mudança no histórico de auditoria. */
export async function registrarMudanca(params: AuditLogParams) {
    return prisma.historicoMudanca.create({
        data: {
            tipo: params.tipo,
            entidadeTipo: params.entidadeTipo,
            entidadeId: params.entidadeId,
            descricao: params.descricao,
            dadosAntes: params.dadosAntes ? (params.dadosAntes as any) : undefined,
            dadosDepois: params.dadosDepois ? (params.dadosDepois as any) : undefined,
            autorId: params.autorId ?? undefined,
        },
    });
}
