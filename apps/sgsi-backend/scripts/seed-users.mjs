const API = process.env.SGSI_API_URL || 'https://sgsi-backend-pw9l.onrender.com';

const users = [
  { email: 'vladimir.sesar@grupo-3c.com',  name: 'Vladimir Sesar',   role: 'SUPER_ADMIN' },
  { email: 'allan.vonstain@grupo-3c.com',  name: 'Allan Vonstain',   role: 'ADMIN' },
];

async function main() {
  console.log(`\n👤 Seed usuários → ${API}\n`);

  for (const user of users) {
    // Tenta atualizar primeiro (se já existe)
    const patchRes = await fetch(`${API}/access/${user.email}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: user.role, isActive: true }),
    });

    if (patchRes.ok) {
      console.log(`  ✅ Atualizado: ${user.email} → ${user.role}`);
      continue;
    }

    // Se não existe, cria
    const postRes = await fetch(`${API}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, name: user.name, role: user.role, grantedById: 'cmo1rktil0000a44i41ypq7b1' }),
    });

    if (postRes.ok) {
      console.log(`  ✅ Criado: ${user.email} → ${user.role}`);
    } else {
      const err = await postRes.text();
      console.error(`  ❌ Erro ${user.email}: ${err}`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n✅ Concluído');
}

main().catch(console.error);
