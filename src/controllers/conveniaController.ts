import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { syncToolsForUser, revokeAllAccess } from '../services/accessControlService';

const prisma = new PrismaClient();

function generateEmail(name: string): string {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, '.') + '@grupo-3c.com';
}

export const handleConveniaWebhook = async (req: Request, res: Response) => {
    try {
        // ==================================================================
        // 🛡️ SEGURANÇA: VALIDAÇÃO DO SECRET
        // ==================================================================
        // A Convenia envia o secret no Header (geralmente 'secret' ou 'x-convenia-secret')
        // Verifique na doc da Convenia o nome exato do header. O padrão costuma ser 'secret'.
        const incomingSecret = req.headers['secret'] || req.headers['x-convenia-secret'];
        const mySecret = process.env.CONVENIA_SECRET;

        // Se o segredo não estiver configurado no servidor, loga um aviso crítico
        if (!mySecret) {
            console.error("⚠️ CRÍTICO: CONVENIA_SECRET não configurado no .env do servidor!");
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        // Se a senha não bater, bloqueia imediatamente
        if (incomingSecret !== mySecret) {
            console.warn(`⛔ Tentativa de acesso não autorizado no Webhook. IP: ${req.ip}`);
            return res.status(401).json({ error: 'Unauthorized: Invalid Secret' });
        }
        // ==================================================================

        const { event, data } = req.body;

        console.log(`🔔 Webhook Convenia recebido (Autenticado): ${event}`);

        const employeeData = {
            name: data.name || data.nome_completo,
            email: data.email || generateEmail(data.name || data.nome_completo),
            jobTitle: data.job_title || data.cargo,
            department: data.department || data.departamento,
            managerName: data.manager_name || null
        };

        // --- CENÁRIO 1: ADMISSÃO ou MUDANÇA ---
        if (event === 'employee.created' || event === 'employee.updated') {
            console.log(`🔄 Processando ${event} para: ${employeeData.name}`);

            const deptName = employeeData.department?.trim();
            const dept = deptName
                ? await prisma.department.findFirst({ where: { name: { equals: deptName, mode: 'insensitive' } } })
                : null;

            const user = await prisma.user.upsert({
                where: { email: employeeData.email },
                update: {
                    name: employeeData.name,
                    jobTitle: employeeData.jobTitle,
                    departmentId: dept?.id ?? undefined
                },
                create: {
                    email: employeeData.email,
                    name: employeeData.name,
                    jobTitle: employeeData.jobTitle,
                    departmentId: dept?.id ?? null
                }
            });

            if (employeeData.managerName) {
                const manager = await prisma.user.findFirst({
                    where: { name: { contains: employeeData.managerName, mode: 'insensitive' } }
                });
                if (manager) {
                    await prisma.user.update({ where: { id: user.id }, data: { managerId: manager.id } });
                }
            }

            await syncToolsForUser(user.id, user.jobTitle);
        }

        // --- CENÁRIO 2: DEMISSÃO ---
        if (event === 'employee.dismissed' || event === 'employee.deleted') {
            console.log(`🚫 Processando desligamento para: ${employeeData.email}`);
            const user = await prisma.user.findUnique({ where: { email: employeeData.email } });

            if (user) {
                await revokeAllAccess(user.id);
                console.log(`✅ Acessos revogados para o usuário desligado.`);
            }
        }

        return res.status(200).send('Webhook Received');
    } catch (error) {
        console.error('❌ Erro no Webhook Convenia:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};