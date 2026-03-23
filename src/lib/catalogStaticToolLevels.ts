/** Fallback quando o catálogo não tem níveis (legado / migração). Usado por Slack /acessos e buildToolsAndLevelsMap. */
export const CATALOG_STATIC_TOOL_LEVELS: Record<string, { label: string; value: string }[]> = {
  Figma: [
    { label: 'Full (FA - 1)', value: 'FA-1' },
    { label: 'Dev (FA - 2)', value: 'FA-2' },
    { label: 'Collab (FA - 3)', value: 'FA-3' },
    { label: 'View (FA - 4)', value: 'FA-4' },
  ],
  Evolux: [
    { label: 'Developer Group (AE - 1)', value: 'AE-1' },
    { label: 'Tenant Support (AE - 2)', value: 'AE-2' },
    { label: 'Support Group (AE - 3)', value: 'AE-3' },
  ],
  '3C PLUS': [
    { label: 'Nível 3 (CP - 1)', value: 'CP-1' },
    { label: 'Nível 2 (CP - 2)', value: 'CP-2' },
  ],
  ClickUp: [
    { label: 'Administradores (CK - 1)', value: 'CK-1' },
    { label: 'Membros (CK - 2)', value: 'CK-2' },
  ],
  JumpCloud: [
    { label: 'Administradores (JC - 1)', value: 'JC-1' },
    { label: 'Manager (JC - 2)', value: 'JC-2' },
  ],
  'Next Router': [
    { label: 'Administradores (NR - 1)', value: 'NR-1' },
    { label: 'Equipe Telecom (NR - 2)', value: 'NR-2' },
  ],
  NextRouter: [
    { label: 'Administradores (NR - 1)', value: 'NR-1' },
    { label: 'Equipe Telecom (NR - 2)', value: 'NR-2' },
  ],
  'Click Sign': [
    { label: 'Administradores (CS - 1)', value: 'CS-1' },
    { label: 'Membro (CS - 2)', value: 'CS-2' },
  ],
  'Next Suit (Oracle)': [
    { label: 'Administradores (OR - 1)', value: 'OR-1' },
    { label: 'Analista Fiscal / Comprador / Controller (OR - 2)', value: 'OR-2' },
    { label: 'Comprador (OR - 3)', value: 'OR-3' },
    { label: 'Executivo (OR - 4)', value: 'OR-4' },
    { label: 'Suporte (OR - 5)', value: 'OR-5' },
  ],
  'Hik-Connect': [{ label: 'Administradores (HC - 1)', value: 'HC-1' }],
  Dizify: [{ label: 'Administradores (DZ - 1)', value: 'DZ-1' }],
  Vindi: [
    { label: 'Administradores (VI - 1)', value: 'VI-1' },
    { label: 'Gestor (VI - 2)', value: 'VI-2' },
    { label: 'Observador (VI - 3)', value: 'VI-3' },
  ],
  N8N: [
    { label: 'Owner (NA - 1)', value: 'NA-1' },
    { label: 'Membro (NA - 2)', value: 'NA-2' },
  ],
  'Chat GPT': [
    { label: 'Proprietário (CG - 1)', value: 'CG-1' },
    { label: 'Membro (CG - 2)', value: 'CG-2' },
  ],
  FiqOn: [{ label: 'Administrador (FO - 1)', value: 'FO-1' }],
  Focus: [{ label: 'Administrador (FU - 1)', value: 'FU-1' }],
  GCP: [
    { label: 'Admin / BigQuery Admin / Data Owner (GC - 2)', value: 'GC-2' },
    { label: 'Owner (GC - 1)', value: 'GC-1' },
    { label: 'Editor / Viewer / Usuário (GC - 3)', value: 'GC-3' },
  ],
  AWS: [
    { label: 'Admin (AS - 1)', value: 'AS-1' },
    { label: 'SysAdmin (AS - 2)', value: 'AS-2' },
  ],
  Convenia: [
    { label: 'Owner (ap_CV-1)', value: 'CV-1' },
    { label: 'Pessoas e Cultura (CV - 2)', value: 'CV-2' },
  ],
  HubSpot: [
    { label: 'Administradores (HS - 1)', value: 'HS-1' },
    { label: 'Líder comercial (HS - 2)', value: 'HS-2' },
    { label: 'Closer / Analista (HS - 3)', value: 'HS-3' },
    { label: 'Atendimento ao cliente (HS - 4)', value: 'HS-4' },
    { label: 'Service / Sales (HS - 5)', value: 'HS-5' },
  ],
  META: [
    { label: 'Business manager (MT - 1)', value: 'MT-1' },
    { label: 'Acesso Parcial - Básico (MT - 2)', value: 'MT-2' },
    { label: 'Acesso Parcial - Básico, Apps e Integrações (MT - 3)', value: 'MT-3' },
    { label: 'Convidado (MT - 4)', value: 'MT-4' },
  ],
  Gitlab: [
    { label: 'Administradores (GL - 1)', value: 'GL-1' },
    { label: 'Regular (GL - 2)', value: 'GL-2' },
  ],
  Clicsign: [
    { label: 'Administradores (CS - 1)', value: 'CS-1' },
    { label: 'Membro (CS - 2)', value: 'CS-2' },
  ],
  '3C Plus': [
    { label: 'Nível 3 (CP - 1)', value: 'CP-1' },
    { label: 'Nível 2 (CP - 2)', value: 'CP-2' },
  ],
  'Next Suit': [
    { label: 'Administradores (OR - 1)', value: 'OR-1' },
    { label: 'Analista Fiscal / Comprador / Controller (OR - 2)', value: 'OR-2' },
    { label: 'Comprador (OR - 3)', value: 'OR-3' },
    { label: 'Executivo (OR - 4)', value: 'OR-4' },
    { label: 'Suporte (OR - 5)', value: 'OR-5' },
  ],
  'Hik Connect': [{ label: 'Administradores (HC - 1)', value: 'HC-1' }],
};

export const CATALOG_STATIC_TOOL_LEVEL_KEYS = Object.keys(CATALOG_STATIC_TOOL_LEVELS);

function normalizeToolNameKey(s: string): string {
  return (s || '').trim().toLowerCase();
}

/** Opções estáticas por nome da ferramenta (match exato ou normalizado). */
export function getStaticLevelOptionsForToolName(toolName: string): { label: string; value: string }[] {
  const map = CATALOG_STATIC_TOOL_LEVELS;
  const trimmed = toolName?.trim() ?? '';
  const exact = map[trimmed];
  if (exact?.length) return exact;
  const normalized = normalizeToolNameKey(toolName);
  for (const key of CATALOG_STATIC_TOOL_LEVEL_KEYS) {
    if (normalizeToolNameKey(key) === normalized) return map[key] ?? [];
  }
  return [];
}
