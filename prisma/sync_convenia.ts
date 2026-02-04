import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const CONVENIA_TOKEN = process.env.CONVENIA_API_TOKEN?.trim();

function generateEmail(name: string): string {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, '.') + '@grupo-3c.com';
}

async function syncConvenia() {
    console.log('🔄 Iniciando sincronização e unificação com Convenia...');

    if (!CONVENIA_TOKEN) {
        console.error('❌ Erro: CONVENIA_API_TOKEN não encontrado no .env');
        process.exit(1);
    }

    try {
        const response = await axios.get('https://public-api.convenia.com.br/api/v3/employees', {
            headers: { 'token': CONVENIA_TOKEN }
        });

        const employees = response.data.data;
        console.log(`📊 Encontrados ${employees.length} colaboradores na API.`);

        // 1. Mapear todos os usuários atuais para busca rápida
        const currentUsers = await prisma.user.findMany();
        console.log(`📦 Base atual de usuários: ${currentUsers.length}`);

        for (const emp of employees) {
            const officialEmail = (emp.email || '').trim().toLowerCase();
            const firstName = emp.name || '';
            const lastName = emp.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const generatedEmail = generateEmail(fullName).toLowerCase();
            const jobTitle = emp.job?.name || "Não mapeado";
            const department = emp.department?.name || "Geral";

            if (!officialEmail && !fullName) continue;

            // 2. Tentar achar todos os registros que referem a esta pessoa
            // Procuramos por: Email oficial, Email gerado (antigo) ou Nome Exato
            const matches = currentUsers.filter(u =>
                u.email.toLowerCase() === officialEmail ||
                u.email.toLowerCase() === generatedEmail ||
                u.name.toLowerCase() === fullName.toLowerCase()
            );

            let primaryUser: any;
            const duplicates = [];

            if (matches.length > 0) {
                // Se achou, o "oficial" é o que tem o email correto da Convenia.
                primaryUser = matches.find(m => m.email.toLowerCase() === officialEmail) || matches[0];
                duplicates.push(...matches.filter(m => m.id !== primaryUser.id));
            } else {
                // Se não achou nada, cria o oficial
                primaryUser = await prisma.user.create({
                    data: {
                        email: officialEmail || generatedEmail,
                        name: fullName,
                        jobTitle: jobTitle,
                        department: department
                    }
                });
            }

            // 3. Unificar dados se houver duplicados
            for (const dup of duplicates) {
                console.log(`🔗 Unificando [${dup.email}] -> [${primaryUser.email}]`);

                // Mover Acessos
                await prisma.access.updateMany({
                    where: { userId: dup.id },
                    data: { userId: primaryUser.id }
                });

                // Mover Solicitações (como solicitante)
                await prisma.request.updateMany({
                    where: { requesterId: dup.id },
                    data: { requesterId: primaryUser.id }
                });

                // Mover Solicitações (como aprovador)
                await prisma.request.updateMany({
                    where: { approverId: dup.id },
                    data: { approverId: primaryUser.id }
                });

                // Mover Ferramentas Owned
                await prisma.tool.updateMany({
                    where: { ownerId: dup.id },
                    data: { ownerId: primaryUser.id }
                });

                await prisma.tool.updateMany({
                    where: { subOwnerId: dup.id },
                    data: { subOwnerId: primaryUser.id }
                });

                try {
                    await prisma.user.delete({ where: { id: dup.id } });
                } catch (err: any) {
                    console.error(`⚠️ Erro ao deletar duplicado ${dup.email}:`, err.message);
                }
            }

            // 4. Garantir que o oficial está com dados atualizados
            await prisma.user.update({
                where: { id: primaryUser.id },
                data: {
                    name: fullName,
                    email: officialEmail || generatedEmail,
                    jobTitle: jobTitle,
                    department: department
                }
            });
        }

        // 5. Hierarquia de Gestores (após unificação estar pronta)
        console.log('🔗 Atualizando hierarquia de gestores...');
        const updatedUsers = await prisma.user.findMany();
        for (const emp of employees) {
            const officialEmail = (emp.email || '').trim().toLowerCase();
            const managerName = emp.manager_name || emp.gestor?.name;

            if (managerName && officialEmail) {
                const user = updatedUsers.find(u => u.email.toLowerCase() === officialEmail);
                const manager = updatedUsers.find(u => u.name.toLowerCase() === managerName.toLowerCase());

                if (user && manager) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { managerId: manager.id }
                    });
                }
            }
        }

        const finalCount = await prisma.user.count();
        console.log(`📊 Total após unificação: ${finalCount}`);

        // 6. Limpeza de Órfãos (Deduplicação Final)
        console.log('🧹 Limpando usuários que não estão no Convenia nem são Admins...');
        const adminEmails = ['luan.silva@grupo-3c.com', 'si@grupo-3c.com'];
        const validEmails = new Set([
            ...employees.map((e: any) => (e.email || '').trim().toLowerCase()),
            ...employees.map((e: any) => generateEmail(`${e.name} ${e.last_name}`).toLowerCase()),
            ...adminEmails
        ]);

        const allUsersFinal = await prisma.user.findMany();
        let deletedOrphans = 0;
        for (const user of allUsersFinal) {
            if (!validEmails.has(user.email.toLowerCase())) {
                console.log(`🗑️ Removendo órfão: ${user.email}`);
                await prisma.user.delete({ where: { id: user.id } });
                deletedOrphans++;
            }
        }

        const absoluteFinalCount = await prisma.user.count();
        console.log(`✅ Concluído! Removidos ${deletedOrphans} órfãos. Total final: ${absoluteFinalCount}`);
    } catch (error: any) {
        console.error('❌ Erro Crítico:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

syncConvenia();