import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando importação via CSV...');

    // 1. LER O ARQUIVO CSV
    // Certifique-se que o arquivo "users.csv" está na pasta prisma/
    const filePath = path.join(__dirname, 'users.csv');

    if (!fs.existsSync(filePath)) {
        console.error('❌ ERRO: Arquivo prisma/users.csv não encontrado.');
        console.log('👉 Por favor, coloque o arquivo CSV na pasta prisma com o nome "users.csv".');
        return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // 2. PARSE DO CSV (Converter texto em Objetos)
    const rows = fileContent.split('\n')
        .map(line => line.trim()) // Remove espaços e quebras de linha (\r)
        .filter(line => line.length > 0); // Remove linhas vazias

    // Remove o cabeçalho (primeira linha)
    const dataRows = rows.slice(1);

    console.log(`📂 Arquivo lido. Encontrados ${dataRows.length} usuários para processar.`);

    const usersData = dataRows.map(row => {
        // Tenta separar por vírgula (,) ou ponto e vírgula (;) dependendo do formato do Excel
        const separator = row.includes(';') ? ';' : ',';
        const columns = row.split(separator).map(c => c.trim());

        // Mapeamento das colunas (Ajuste conforme a ordem do teu CSV)
        // Assumindo ordem: Nome | Email | Cargo | Departamento | Gestor Direto
        return {
            name: columns[0],
            email: columns[1],
            jobTitle: columns[2],
            department: columns[3],
            managerName: columns[4] && columns[4] !== '-' && columns[4] !== '' ? columns[4] : null
        };
    });

    // 3. CRIAR USUÁRIOS (Upsert)
    console.log('🔄 Criando/Atualizando usuários no banco...');
    for (const u of usersData) {
        if (!u.email) continue; // Pula se não tiver email

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
                password: '123' // Senha padrão
            }
        });
    }

    // 4. CONECTAR GESTORES (Hierarquia)
    console.log('🔗 Conectando hierarquia de gestores...');
    for (const u of usersData) {
        if (u.managerName) {
            const manager = await prisma.user.findFirst({
                where: {
                    name: { equals: u.managerName, mode: 'insensitive' } // Busca insensível a maiúsculas/minúsculas
                }
            });

            if (manager) {
                await prisma.user.update({
                    where: { email: u.email },
                    data: { managerId: manager.id }
                });
            } else {
                console.warn(`⚠️ Gestor não encontrado para ${u.name}: "${u.managerName}"`);
            }
        }
    }

    console.log('✅ Gestão de Pessoas (TODOS OS USUÁRIOS) importada com sucesso!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());