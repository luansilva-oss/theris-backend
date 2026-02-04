import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Carrega variáveis de ambiente se rodar localmente
dotenv.config();

const prisma = new PrismaClient();

// Configurações da API Convenia
const CONVENIA_API_URL = 'https://public-api.convenia.com.br/api/v3/employees';
const TOKEN = process.env.CONVENIA_API_TOKEN;

// Função para formatar email se vier vazio (fallback)
function generateEmail(name: string): string {
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .trim().replace(/\s+/g, '.') + '@grupo-3c.com';
}

async function getAllEmployees() {
    let allEmployees: any[] = [];
    let page = 1;
    let hasMore = true;

    if (!TOKEN) {
        throw new Error("❌ ERRO: CONVENIA_API_TOKEN não está definido no .env!");
    }

    console.log("📡 Conectando à API da Convenia...");

    while (hasMore) {
        try {
            const response = await axios.get(CONVENIA_API_URL, {
                headers: { 'token': TOKEN },
                params: { page: page, limit: 50 } // Traz 50 por vez
            });

            const data = response.data.data;
            const meta = response.data.meta;

            if (data && data.length > 0) {
                allEmployees = [...allEmployees, ...data];
                console.log(`📄 Página ${page} carregada (${data.length} colaboradores)...`);
                page++;
            } else {
                hasMore = false;
            }

            // Verifica se chegou na última página
            if (page > meta.pagination.total_pages) {
                hasMore = false;
            }

        } catch (error: any) {
            console.error(`❌ Erro na página ${page}:`, error.response?.data || error.message);
            hasMore = false;
        }
    }

    return allEmployees;
}

async function main() {
    console.log('🚀 Iniciando Sincronização COMPLETA via API Convenia...');

    // 1. Baixar todos da Convenia
    const employees = await getAllEmployees();
    console.log(`📊 Total encontrado na Convenia: ${employees.length} colaboradores.`);

    // 2. Atualizar/Criar Usuários
    console.log('🔄 Sincronizando usuários no banco de dados...');

    for (const emp of employees) {
        // Mapeamento dos campos da API (ajuste se a API mudar)
        const firstName = emp.name || '';
        const lastName = emp.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Email: Tenta o corporativo, se não tiver, gera um
        const email = emp.email || generateEmail(fullName);

        const jobTitle = emp.job?.name || 'Sem Cargo';
        const department = emp.department?.name || 'Sem Departamento';

        try {
            await prisma.user.upsert({
                where: { email: email },
                update: {
                    name: fullName,
                    jobTitle: jobTitle,
                    department: department
                    // Não atualizamos managerId agora, faremos no passo 3
                },
                create: {
                    email: email,
                    name: fullName,
                    jobTitle: jobTitle,
                    department: department
                }
            });
        } catch (e) {
            console.error(`❌ Erro ao salvar ${fullName}:`, e);
        }
    }

    // 3. Conectar Gestores (Segunda passada)
    // Precisamos fazer depois porque o gestor pode estar na página 10 e o liderado na página 1
    console.log('🔗 Conectando hierarquia de gestores...');

    for (const emp of employees) {
        if (emp.manager) {
            const employeeEmail = emp.email || generateEmail(`${emp.name} ${emp.last_name}`);

            const managerFirstName = emp.manager.name || '';
            const managerLastName = emp.manager.last_name || '';
            const managerName = `${managerFirstName} ${managerLastName}`.trim();

            // Tenta achar o gestor no banco pelo nome (já que a API às vezes não manda o email do gestor no objeto filho)
            const managerUser = await prisma.user.findFirst({
                where: { name: { contains: managerName, mode: 'insensitive' } }
            });

            const employeeUser = await prisma.user.findUnique({ where: { email: employeeEmail } });

            if (managerUser && employeeUser) {
                await prisma.user.update({
                    where: { id: employeeUser.id },
                    data: { managerId: managerUser.id }
                });
            }
        }
    }

    console.log('🏁 Sincronização API finalizada com sucesso!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());