/**
 * Mapeamento Theris Unit.name → valor exato do campo Company no JumpCloud.
 *
 * Os grupos KBS dinâmicos no JumpCloud usam condição `Company equals "<valor exato>"`.
 * Valores esperados no JC (referência): "Evolux", "3C Plus", "FiqOn", "Dizify".
 *
 * Catálogo de unidades no seed (`prisma/seed_master_data.js` / `seed_master.ts`): em geral
 * inclui "3C+", "Evolux", "Dizify", "Instituto 3C", "FiqOn", "Dizparos" — "3C+" diverge
 * de "3C Plus" e por isso entra explicitamente no mapa abaixo.
 */
export const UNIT_TO_JC_COMPANY: Record<string, string> = {
  '3C+': '3C Plus',
  '3C Plus': '3C Plus',
  Evolux: 'Evolux',
  FiqOn: 'FiqOn',
  Dizify: 'Dizify',
  Dizparos: 'Dizparos',
  'Instituto 3C': 'Instituto 3C'
};

/** Nome de empresa enviado no PUT Employment Information do JumpCloud. */
export function mapTherisUnitNameToJumpCloudCompany(unitName: string | null | undefined): string {
  const raw = (unitName || '').trim();
  if (!raw) return '';
  return UNIT_TO_JC_COMPANY[raw] ?? raw;
}
