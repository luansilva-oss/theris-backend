// dedup-actions.mjs — remove ações duplicadas pelo nome, mantém a mais antiga
const API = process.env.SGSI_API_URL || 'https://sgsi-backend-pw9l.onrender.com';

async function main() {
  const res = await fetch(`${API}/actions`);
  const actions = await res.json();

  const seen = new Map();
  const toDelete = [];

  // ordena por createdAt para manter o mais antigo
  const sorted = [...actions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const action of sorted) {
    const key = action.name.trim().toLowerCase();
    if (seen.has(key)) {
      toDelete.push(action);
    } else {
      seen.set(key, action);
    }
  }

  console.log(`\n🔍 ${actions.length} ações encontradas, ${toDelete.length} duplicatas\n`);

  for (const action of toDelete) {
    const r = await fetch(`${API}/actions/${action.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });
    if (r.ok) {
      console.log(`  ✅ Removida: ${action.name}`);
    } else {
      console.log(`  ❌ Erro: ${action.name}`);
    }
    await new Promise(r => setTimeout(r, 150));
  }

  console.log('\n✅ Dedup concluído');
}

main().catch(console.error);
