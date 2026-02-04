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
    console.log('🔄 Iniciando sincronização com Convenia...');

    if (!CONVENIA_TOKEN) {
        console.error('❌ Erro: CONVENIA_API_TOKEN não encontrado no .env');
        process.exit(1);
    }

    try {
        const response = await axios.get('https://public-api.convenia.com.br/api/v3/employees', {
            headers: {
                'token': CONVENIA_TOKEN
            }
        });

        const employees = response.data.data;
        console.log(`📊 Encontrados ${employees.length} colaboradores na API.`);

        for (const emp of employees) {
            const email = (emp.email || '').trim();
            const firstName = emp.name || '';
            const lastName = emp.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0] || 'Sem Nome';
            const finalEmail = email || generateEmail(fullName);
            const jobTitle = emp.job?.name || "Não mapeado";
            const department = emp.department?.name || "Geral";

            console.log(`👤 Sincronizando: ${fullName} (${finalEmail})`);

            await prisma.user.upsert({
                where: { email: finalEmail },
                update: {
                    name: fullName,
                    jobTitle: jobTitle,
                    department: department
                },
                create: {
                    email: finalEmail,
                    name: fullName,
                    jobTitle: jobTitle,
                    department: department
                }
            });
        }

        // Sincronização de Gestores (Hierarquia)
        console.log('🔗 Atualizando hierarquia de gestores...');
        for (const emp of employees) {
            const email = emp.email || generateEmail(emp.name || emp.nome_completo);
            const managerName = emp.manager_name || emp.gestor?.name;

            if (managerName) {
                const user = await prisma.user.findUnique({ where: { email } });
                const manager = await prisma.user.findFirst({
                    where: { name: { contains: managerName, mode: 'insensitive' } }
                });

                if (user && manager) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { managerId: manager.id }
                    });
                }
            }
        }

        console.log('✅ Sincronização concluída com sucesso!');
    } catch (error: any) {
        console.error('❌ Erro ao sincronizar com Convenia:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

syncConvenia();