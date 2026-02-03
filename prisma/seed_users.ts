import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Função para gerar email a partir do nome (ex: "João Silva" -> "joao.silva@grupo-3c.com")
function generateEmail(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .trim()
        .replace(/\s+/g, '.') // Troca espaços por pontos
        + '@grupo-3c.com';
}

async function main() {
    console.log('🌱 Iniciando importação (Nome | Cargo | Dept | Gestor)...');

    const filePath = path.join(__dirname, 'users.csv');

    if (!fs.existsSync(filePath)) {
        console.error('❌ Arquivo prisma/users.csv não encontrado.');
        return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Lê as linhas
    const rows = fileContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // Remove cabeçalho se existir (se a primeira linha tiver "Nome" ou "Cargo")
    const firstRow = rows[0].toLowerCase();
    const dataRows = (firstRow.includes('nome') || firstRow.includes('cargo')) ? rows.slice(1) : rows;

    console.log(`📂 Processando ${dataRows.length} linhas...`);

    const usersData = dataRows.map(row => {
        // Tenta detetar o separador (vírgula ou ponto e vírgula)
        const separator = row.includes(';') ? ';' : ',';
        const columns = row.split(separator).map(c => c.trim().replace(/^"|"$/g, '')); // Remove aspas extras

        // --- MAPEAMENTO BASEADO NA TUA ORDEM ---
        // Coluna 0: Nome Completo
        // Coluna 1: Cargo
        // Coluna 2: Departamento
        // Coluna 3: Gestor Direto

        const rawName = columns[0] || "Sem Nome";

        return {
            name: rawName,
            email: generateEmail(rawName), // Gera o email automaticamente
            jobTitle: columns[1] || null,
            department: columns[2] || null,
            managerName: columns[3] && columns[3] !== '-' ? columns[3] : null
        };
    });

    // 1. CRIAR USUÁRIOS
    console.log('🔄 Atualizando cadastros...');
    for (const u of usersData) {
        if (u.name === "Sem Nome") continue;

        await prisma.user.upsert({
            where: { email: u.email },
            update: {
                name: u.name,
                jobTitle: u.jobTitle,
                department: u.department
            },
            create: {
                email: u.email,
                name: u.name,
                jobTitle: u.jobTitle,
                department: u.department,
                password: '123'
            }
        });
    }

    // 2. CONECTAR GESTORES
    console.log('🔗 Conectando hierarquia...');
    for (const u of usersData) {
        if (u.managerName) {
            // Tenta achar o gestor pelo NOME (ignora maiúsculas/minúsculas)
            const manager = await prisma.user.findFirst({
                where: {
                    name: { equals: u.managerName, mode: 'insensitive' }
                }
            });

            if (manager) {
                await prisma.user.update({
                    where: { email: u.email },
                    data: { managerId: manager.id }
                });
            } else {
                // Log para saberes se algum gestor não foi achado (talvez erro de digitação no CSV)
                console.warn(`⚠️ Gestor "${u.managerName}" não encontrado para o funcionário ${u.name}`);
            }
        }
    }

    console.log('✅ Importação concluída!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());