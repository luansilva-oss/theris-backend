import { PrismaClient } from '@prisma/client';
import { CATALOG_STATIC_TOOL_LEVELS, getStaticLevelOptionsForToolName } from './catalogStaticToolLevels';

function labelFromDescJson(
  level: string,
  accessLevelDescriptions: Record<string, unknown> | null | undefined
): string {
  if (!accessLevelDescriptions) return level;
  const descData = accessLevelDescriptions[level];
  if (typeof descData === 'object' && descData !== null && 'description' in descData)
    return String((descData as { description?: string }).description || level);
  if (typeof descData === 'string') return descData;
  return level;
}

/**
 * Mapa nome da ferramenta → níveis (label + value), mesclando ToolAccessLevel, legado em Tool e fallback estático.
 */
export async function buildToolsAndLevelsMap(prisma: PrismaClient): Promise<Record<string, { label: string; value: string }[]>> {
  const tools = await prisma.tool.findMany({
    orderBy: { name: 'asc' },
    include: { accessLevels: { orderBy: { code: 'asc' } } },
  });

  const result: Record<string, { label: string; value: string }[]> = {};

  for (const t of tools) {
    const options: { label: string; value: string }[] = [];
    const dbByCode = new Map(t.accessLevels.map((al) => [al.code.toLowerCase(), al]));
    for (const al of t.accessLevels) {
      options.push({ label: al.name || al.code, value: al.code });
    }
    const descMap = (t.accessLevelDescriptions as Record<string, unknown>) ?? null;
    for (const code of t.availableAccessLevels || []) {
      if (dbByCode.has(String(code).trim().toLowerCase())) continue;
      options.push({ label: labelFromDescJson(String(code), descMap), value: String(code) });
    }
    if (options.length === 0) {
      const staticOpts = getStaticLevelOptionsForToolName(t.name);
      for (const o of staticOpts) options.push({ ...o });
    }
    options.sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }));
    result[t.name] = options;
  }

  for (const [name, levels] of Object.entries(CATALOG_STATIC_TOOL_LEVELS)) {
    if (!result[name]) result[name] = [...levels];
  }

  return result;
}
