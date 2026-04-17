// seed-actions.mjs — popula o backend com as ações do CON-G3C-10
// Uso: node scripts/seed-actions.mjs

const API = process.env.SGSI_API_URL || 'https://sgsi-backend-pw9l.onrender.com';
const RESPONSIBLE_USER_ID = process.env.RESPONSIBLE_USER_ID || '';

if (!RESPONSIBLE_USER_ID) {
  console.error('❌ Defina RESPONSIBLE_USER_ID antes de rodar.');
  console.error('   export RESPONSIBLE_USER_ID=<id-do-seu-usuario-no-sgsi>');
  process.exit(1);
}

const monthMap = {
  jan:1, fev:2, mar:3, abr:4, mai:5, jun:6,
  jul:7, ago:8, set:9, out:10, nov:11, dez:12,
  nove:11,
  janeiro:1, fevereiro:2, março:3, abril:4, maio:5, junho:6,
  julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12,
};

function parseDate(str) {
  if (!str || str === '-' || str.trim() === '') return null;
  str = str.trim();

  // DD/MM/YYYY ou DD.MM.YYYY
  const dmy = str.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (dmy) return new Date(+dmy[3], +dmy[2]-1, +dmy[1]).toISOString();

  // "mês/YYYY" ou "mês. /YYYY" ou "Mês YYYY"
  const my = str.toLowerCase().match(/^([a-záçéêóãú]+)\.?\s*[\/\s]\s*(\d{4})$/);
  if (my && monthMap[my[1]]) return new Date(+my[2], monthMap[my[1]]-1, 1).toISOString();

  // "Entre Ago/Set/2026" — pega o primeiro mês
  const entre = str.toLowerCase().match(/([a-záçéêóãú]+)\/[a-záçéêóãú]+\/(\d{4})/);
  if (entre && monthMap[entre[1]]) return new Date(+entre[2], monthMap[entre[1]]-1, 1).toISOString();

  // "Fev/Mar 2026"
  const bimestre = str.toLowerCase().match(/([a-záçéêóãú]+)\/[a-záçéêóãú]+\s+(\d{4})/);
  if (bimestre && monthMap[bimestre[1]]) return new Date(+bimestre[2], monthMap[bimestre[1]]-1, 1).toISOString();

  return null;
}

// name, type, frequency, nextDue (string), isoControls[]
const actions = [
  // ── REUNIÕES ──────────────────────────────────────────────────────────────
  ['Reunião Análise Crítica Board',                    'MEETING',   'SEMIANNUAL', 'setembro/2026',    ['9.3']],
  ['Reunião Comitê de Riscos e Segurança',             'MEETING',   'BIWEEKLY',   '27/02/2026',       ['6.1','8.2']],
  ['Reunião Comitê de Mudanças',                       'MEETING',   'ON_DEMAND',  null,               ['6.3']],

  // ── AUDITORIAS ────────────────────────────────────────────────────────────
  ['Auditoria Corporativa Interna',                    'AUDIT',     'ANNUAL',     'fev./2026',        ['9.2']],
  ['Auditoria Interna',                                'AUDIT',     'ANNUAL',     'julho/2026',       ['9.2']],
  ['Auditoria Externa',                                'AUDIT',     'ANNUAL',     'abril/2026',       ['9.2']],

  // ── TREINAMENTOS ──────────────────────────────────────────────────────────
  ['Treinamento SI: Engenharia Social',                'TRAINING',  'ANNUAL',     'Fev/Mar 2026',     ['6.3','6.8']],
  ['Treinamento SI: Uso seguro de e-mail',             'TRAINING',  'ANNUAL',     'Fev/Mar 2026',     ['6.3','6.8']],

  // ── REVISÕES — COMITÊS ────────────────────────────────────────────────────
  ['Revisão: Membros do Comitê de Mudanças',           'REVIEW',    'MONTHLY',    '13/02/2026',       ['6.3']],
  ['Revisão: Membros do Comitê de Riscos',             'REVIEW',    'MONTHLY',    '13/02/2026',       ['6.1']],
  ['Revisão: Membros Comitê de Mudanças (nomeação)',   'REVIEW',    'ON_DEMAND',  null,               ['6.3']],

  // ── REVISÕES — ACESSOS LÓGICOS ────────────────────────────────────────────
  ['Revisão: Membros Grupo VPN / Acesso Remoto',       'REVIEW',    'MONTHLY',    '26/02/2026',       ['5.15','8.5']],
  ['Revisão: Membros do KBU',                          'REVIEW',    'ON_DEMAND',  null,               ['5.15']],
  ['Revisão: Membros de cada KBS',                     'REVIEW',    'ON_DEMAND',  '03/03/2026',       ['5.15']],
  ['Revisão: Acessos Extraordinários (AEX)',           'REVIEW',    'ON_DEMAND',  '04/03/2026',       ['5.15','5.18']],
  ['Revisão: Admins do Google',                        'REVIEW',    'ON_DEMAND',  null,               ['5.15','8.2']],
  ['Revisão: Admins do GCP',                           'REVIEW',    'ON_DEMAND',  null,               ['5.15','8.2']],
  ['Revisão: Admin do GitLab',                         'REVIEW',    'ON_DEMAND',  null,               ['5.15','8.2']],
  ['Revisão: Membros pastas do Pass Manager',          'REVIEW',    'ON_DEMAND',  null,               ['5.17']],
  ['Revisão: Grupos LDAP do JCLOUD',                   'REVIEW',    'QUARTERLY',  'Nove/2025',        ['5.15']],
  ['Revisão: Grupo Radius do JCLOUD',                  'REVIEW',    'QUARTERLY',  'Nove/2025',        ['5.15']],
  ['Revisão: Acessos Hikvision',                       'REVIEW',    'MONTHLY',    null,               ['5.15']],
  ['Revisão: SaaS do KBU',                             'REVIEW',    'ON_DEMAND',  '04/03/2026',       ['5.15','8.2']],
  ['Revisão: SaaS dos KBS do Grupo',                   'REVIEW',    'ON_DEMAND',  '04/03/2026',       ['5.15','8.2']],

  // ── REVISÕES — ACESSOS FÍSICOS ────────────────────────────────────────────
  ['Revisão: Acessos Físicos Fornecedores Temporários','REVIEW',    'ON_DEMAND',  null,               ['5.15','7.2']],
  ['Revisão: Acessos Físicos Parceiros',               'REVIEW',    'ON_DEMAND',  null,               ['5.15','7.2']],
  ['Revisão: Acessos Físicos Gerais',                  'REVIEW',    'ON_DEMAND',  null,               ['5.15','7.2']],
  ['Revisão: Grupo acesso sala de T.I',                'REVIEW',    'ON_DEMAND',  null,               ['7.1','7.2']],
  ['Revisão: Acesso à sala do servidor',               'REVIEW',    'MONTHLY',    null,               ['7.1','7.2']],
  ['Revisão: Acesso à sala do T.I',                    'REVIEW',    'MONTHLY',    null,               ['7.1','7.2']],
  ['Revisão: Acesso à sala do Audiovisual',            'REVIEW',    'ON_DEMAND',  null,               ['7.1','7.2']],
  ['Revisão: Acessos faciais — Hall de entrada',       'REVIEW',    'ON_DEMAND',  null,               ['7.1','7.2']],
  ['Revisão: Acessos faciais — Portaria',              'REVIEW',    'ON_DEMAND',  null,               ['7.1','7.2']],

  // ── REVISÕES — DOCUMENTOS E POLÍTICAS ─────────────────────────────────────
  ['Revisão: Todas as Políticas (CON-G3C-01)',         'REVIEW',    'ON_DEMAND',  null,               ['5.1','5.2']],
  ['Revisão: Nomeação do DPO',                         'REVIEW',    'ANNUAL',     null,               ['5.2']],
  ['Revisão: Manual SGSI (escopo, SWOT, SoA)',         'REVIEW',    'ANNUAL',     'Entre Ago/Set/2026',['4.1','4.2','6.1']],
  ['Revisão: BIA e RACI (DOCs 05 e 06)',               'REVIEW',    'ANNUAL',     'Entre Ago/Set/2026',['5.29','5.30']],
  ['Revisão: TPRM — Fornecedores externos',            'REVIEW',    'ANNUAL',     'Entre Ago/Set/2026',['5.21','5.22']],

  // ── REVISÕES — GWS ────────────────────────────────────────────────────────
  ['Revisão: GWS — arquivos restritos',                'REVIEW',    'ON_DEMAND',  null,               ['5.12','5.13']],
  ['Revisão: GWS — arquivos confidenciais',            'REVIEW',    'ON_DEMAND',  null,               ['5.12','5.13']],
  ['Revisão: GWS — arquivos internos',                 'REVIEW',    'ON_DEMAND',  null,               ['5.12','5.13']],
  ['Revisão: GWS — arquivos públicos',                 'REVIEW',    'ON_DEMAND',  null,               ['5.12','5.13']],
];

async function createAction(action) {
  const [name, type, frequency, nextDue, isoControls] = action;
  const body = {
    name,
    type,
    frequency,
    isoControls,
    conGc10Ref: 'CON-G3C-10',
    responsibleEmail: 'luan.silva@grupo-3c.com',
    nextDueAt: parseDate(nextDue) ?? new Date().toISOString(),
  };

  const res = await fetch(`${API}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ ${name} — ${res.status}: ${err}`);
    return false;
  }
  console.log(`  ✅ ${name}`);
  return true;
}

async function main() {
  console.log(`\n🌱 Seed CON-G3C-10 → ${API}`);
  console.log(`   Responsible: ${RESPONSIBLE_USER_ID}\n`);

  let ok = 0, fail = 0;
  for (const action of actions) {
    const success = await createAction(action);
    success ? ok++ : fail++;
    await new Promise(r => setTimeout(r, 200)); // evita rate limit
  }

  console.log(`\n📊 Resultado: ${ok} criadas, ${fail} com erro`);
}

main().catch(console.error);
