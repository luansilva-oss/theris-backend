import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// Importa o serviço que criamos com a Matriz de Acesso
import { syncToolsForUser, revokeAllAccess } from '../services/accessControlService';

const prisma = new PrismaClient();

// Função auxiliar para gerar e-mail se não vier da Convenia
function generateEmail(name: string): string {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, '.') + '@grupo-3c.com';
}

export const handleConveniaWebhook = async (req: Request, res: Response) => {
    try {
        const { event, data } = req.body;

        console.log(`🔔 Webhook Convenia recebido: ${event}`);
        // console.log(JSON.stringify(data, null, 2)); // Descomente para debug se necessário

        // Mapeamento dos campos da Convenia para o Theris
        // (Ajuste conforme o payload real da Convenia se necessário)
        const employeeData = {
            name: data.name || data.nome_completo,
            email: data.email || generateEmail(data.name || data.nome_completo),
            jobTitle: data.job_title || data.cargo,
            department: data.department || data.departamento,
            managerName: data.manager_name || null
        };

        // ==================================================================
        // CENÁRIO 1: ADMISSÃO ou MUDANÇA (Promoção/Transferência)
        // ==================================================================
        if (event === 'employee.created' || event === 'employee.updated') {

            console.log(`🔄 Processando ${event} para: ${employeeData.name}`);

            // 1. Atualiza ou Cria o Usuário no Banco
            const user = await prisma.user.upsert({
                where: { email: employeeData.email },
                update: {
                    name: employeeData.name,
                    jobTitle: employeeData.jobTitle,
                    department: employeeData.department
                },
                create: {
                    email: employeeData.email,
                    name: employeeData.name,
                    jobTitle: employeeData.jobTitle,
                    department: employeeData.department
                }
            });

            // 2. Tenta conectar o Gestor (se a info veio)
            if (employeeData.managerName) {
                const manager = await prisma.user.findFirst({
                    where: { name: { contains: employeeData.managerName, mode: 'insensitive' } }
                });
                if (manager) {
                    await prisma.user.update({ where: { id: user.id }, data: { managerId: manager.id } });
                }
            }

            // 3. 🚀 A GRANDE MÁGICA: SINCRONIZA AS FERRAMENTAS COM O NOVO CARGO
            // O 'syncToolsForUser' vai ler a matriz KBS e dar os acessos certos
            await syncToolsForUser(user.id, user.jobTitle);
        }

        // ==================================================================
        // CENÁRIO 2: DEMISSÃO
        // ==================================================================
        if (event === 'employee.dismissed' || event === 'employee.deleted') {
            console.log(`🚫 Processando desligamento para: ${employeeData.email}`);

            const user = await prisma.user.findUnique({ where: { email: employeeData.email } });

            if (user) {
                // 1. Revoga TODOS os acessos imediatamente
                await revokeAllAccess(user.id);

                // 2. (Opcional) Podemos apagar o usuário ou marcar como inativo
                // Por enquanto, apenas removemos os acessos para manter histórico de auditoria se necessário
                // Se preferir apagar: await prisma.user.delete({ where: { id: user.id } });

                console.log(`✅ Acessos revogados para o usuário desligado.`);
            } else {
                console.warn(`⚠️ Usuário não encontrado para desligamento: ${employeeData.email}`);
            }
        }

        return res.status(200).send('Webhook Received');
    } catch (error) {
        console.error('❌ Erro no Webhook Convenia:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};