"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processApproval = exports.getNextApprover = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Função para descobrir quem é o aprovador atual
const getNextApprover = async (requesterId) => {
    // Busca o usuário e seu gestor (incluindo o substituto do gestor)
    const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        include: { manager: { include: { myDeputy: true } } }
    });
    // Se não tem gestor, retorna null (provavelmente vai para o Admin)
    if (!requester || !requester.manager) {
        return null;
    }
    const manager = requester.manager;
    // --- CORREÇÃO AQUI ---
    // O erro acontecia porque o código antigo tentava ler "manager.isDeputyActive".
    // Removemos isso. Agora, a lógica é simples:
    // Se o gestor tem um substituto (myDeputy) cadastrado, o substituto aprova.
    if (manager.myDeputy) {
        return manager.myDeputy;
    }
    // Se não tem substituto, o próprio gestor aprova.
    return manager;
};
exports.getNextApprover = getNextApprover;
// Função para processar aprovação
const processApproval = async (requestId, approverId, status) => {
    const request = await prisma.request.update({
        where: { id: requestId },
        data: {
            status,
            // Status atualizado com sucesso
        }
    });
    return request;
};
exports.processApproval = processApproval;
