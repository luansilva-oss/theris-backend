/**
 * JumpCloud Access Requests API — ROOT_ACCESS (sudo temporário em device).
 */
import { jumpcloudFetch } from './jumpcloudAuth';

const ACCESS_REQUEST_OPERATION_ID = 'ff487bda-e18f-42ed-9d6c-5c7cafd6adf9';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateAccessRequestParams = {
  jumpcloudUserId: string;
  jumpcloudDeviceId: string;
  expiryIso: string;
  justification: string;
};

export type CreateAccessRequestResult =
  | { ok: true; accessRequestId: string; rawResponse: unknown }
  | { ok: false; status: number; error: string };

export async function createSudoAccessRequest(
  params: CreateAccessRequestParams
): Promise<CreateAccessRequestResult> {
  const body = {
    requestorId: params.jumpcloudUserId,
    resourceId: params.jumpcloudDeviceId,
    resourceType: 'device',
    operationId: ACCESS_REQUEST_OPERATION_ID,
    expiry: params.expiryIso,
    remarks: params.justification,
    additionalAttributes: {
      sudo: {
        enabled: true,
        withoutPassword: false
      }
    }
  };

  try {
    const response = await jumpcloudFetch('https://console.jumpcloud.com/api/v2/accessrequests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(responseText) as unknown;
    } catch {
      parsed = responseText;
    }

    if (!response.ok) {
      console.error(`[ROOT_ACCESS] POST /accessrequests falhou: ${response.status} - ${responseText}`);
      return {
        ok: false,
        status: response.status,
        error: typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
      };
    }

    console.info(`[ROOT_ACCESS] POST /accessrequests sucesso. Response shape:`, JSON.stringify(parsed));

    const accessRequestId = extractAccessRequestId(parsed);
    if (!accessRequestId) {
      console.error(
        `[ROOT_ACCESS] POST /accessrequests: não consegui extrair ID da response. Response: ${responseText}`
      );
      return {
        ok: false,
        status: response.status,
        error: 'ID do access request não encontrado na response'
      };
    }

    return { ok: true, accessRequestId, rawResponse: parsed };
  } catch (err) {
    console.error('[ROOT_ACCESS] Exceção em createSudoAccessRequest:', err);
    return { ok: false, status: 0, error: String(err) };
  }
}

function extractAccessRequestId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  for (const key of ['id', 'accessId', '_id'] as const) {
    const v = obj[key];
    if (typeof v === 'string' && v.length > 0) return v;
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && UUID_RE.test(v)) return v;
  }
  return null;
}

export type RevokeResult =
  | { ok: true; alreadyGone: boolean }
  | { ok: false; status: number; error: string; severity: 'client' | 'server' };

export async function revokeAccessRequest(accessRequestId: string): Promise<RevokeResult> {
  const id = (accessRequestId || '').trim();
  if (!id) {
    return { ok: false, status: 0, error: 'accessRequestId vazio', severity: 'client' };
  }

  try {
    const response = await jumpcloudFetch(
      `https://console.jumpcloud.com/api/v2/accessrequests/${encodeURIComponent(id)}/revoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }
    );

    if (response.ok) {
      console.info(`[ROOT_ACCESS] Revoke sucesso: ${id}`);
      return { ok: true, alreadyGone: false };
    }

    if (response.status === 404 || response.status === 410) {
      console.info(`[ROOT_ACCESS] Revoke de ${id}: já não aplicável (${response.status})`);
      return { ok: true, alreadyGone: true };
    }

    const text = await response.text();
    console.error(`[ROOT_ACCESS] Revoke de ${id} falhou: ${response.status} - ${text}`);
    const severity = response.status >= 500 ? 'server' : 'client';
    return { ok: false, status: response.status, error: text, severity };
  } catch (err) {
    console.error('[ROOT_ACCESS] Exceção em revokeAccessRequest:', err);
    return { ok: false, status: 0, error: String(err), severity: 'server' };
  }
}

export type DeviceMatchStrategy = 'hostname_exact' | 'displayname_exact' | 'patrimonio_search';

export type DeviceLookupCandidate = {
  displayName: string;
  hostname: string;
};

export type DeviceLookupResult =
  | {
      ok: true;
      deviceId: string;
      active: boolean;
      matchedBy: DeviceMatchStrategy;
    }
  | {
      ok: false;
      error: 'NOT_FOUND' | 'API_ERROR';
      details?: string;
    }
  | {
      ok: false;
      error: 'MULTIPLE';
      candidates?: DeviceLookupCandidate[];
      details?: string;
    };

type RawSystemRecord = {
  _id?: string;
  id?: string;
  displayName?: string | null;
  hostname?: string | null;
  active?: boolean;
};

type SearchOutcome =
  | { ok: true; records: RawSystemRecord[] }
  | { ok: false; error: 'API_ERROR'; details?: string };

function deviceLookupWarn(event: string, payload: Record<string, unknown>): void {
  console.warn(`${event} ${JSON.stringify(payload)}`);
}

/** Extrai sufixo numérico de "3C-PLUS-LIN-0824" → "0824". Aceita 3-5 dígitos. */
function extractPatrimonioFromHostname(input: string): string | null {
  const match = input.match(/-(\d{3,5})$/);
  return match ? match[1] : null;
}

function patrimonioEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);
  if (Number.isNaN(numA) || Number.isNaN(numB)) return false;
  return numA === numB;
}

function recordMatchesPatrimonio(
  record: { displayName?: string | null; hostname?: string | null },
  patrimonio: string
): boolean {
  const fromDisplay = record.displayName ? extractPatrimonioFromHostname(record.displayName) : null;
  const fromHostname = record.hostname ? extractPatrimonioFromHostname(record.hostname) : null;
  return patrimonioEquals(fromDisplay, patrimonio) || patrimonioEquals(fromHostname, patrimonio);
}

export function jumpCloudListPayloadToRecords(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const results = o.results;
    if (Array.isArray(results)) return results as Record<string, unknown>[];
  }
  return [];
}

function toRawRecords(data: unknown): RawSystemRecord[] {
  return jumpCloudListPayloadToRecords(data) as RawSystemRecord[];
}

function deviceIdFromRecord(r: RawSystemRecord): string | null {
  const idRaw = r._id ?? r.id;
  if (typeof idRaw === 'string' && idRaw.length > 0) return idRaw;
  if (typeof idRaw === 'number' && Number.isFinite(idRaw)) return String(idRaw);
  return null;
}

/**
 * GET systems com `?filter=...` — tenta /api/systems e /api/v2/systems (mesmo contrato do legado).
 */
async function searchSystemsByQuery(filterExpr: string): Promise<SearchOutcome> {
  const urls = [
    `https://console.jumpcloud.com/api/systems?filter=${filterExpr}`,
    `https://console.jumpcloud.com/api/v2/systems?filter=${filterExpr}`
  ];

  let lastApiError: string | undefined;

  for (const url of urls) {
    try {
      const response = await jumpcloudFetch(url, { method: 'GET' });

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        lastApiError = `${response.status} - ${text}`;
        if (response.status >= 500) {
          return { ok: false, error: 'API_ERROR', details: lastApiError };
        }
        continue;
      }

      const data: unknown = await response.json();
      const records = toRawRecords(data);

      if (records.length === 0) {
        continue;
      }

      return { ok: true, records };
    } catch (err) {
      lastApiError = String(err);
    }
  }

  if (lastApiError) {
    return { ok: false, error: 'API_ERROR', details: lastApiError };
  }

  return { ok: true, records: [] };
}

/**
 * GET systems com `?search=...` (fallback por patrimônio).
 */
async function searchSystemsBySearchParam(patrimonio: string): Promise<SearchOutcome> {
  const enc = encodeURIComponent(patrimonio);
  const urls = [
    `https://console.jumpcloud.com/api/systems?search=${enc}`,
    `https://console.jumpcloud.com/api/v2/systems?search=${enc}`
  ];

  let lastApiError: string | undefined;

  for (const url of urls) {
    try {
      const response = await jumpcloudFetch(url, { method: 'GET' });

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        lastApiError = `${response.status} - ${text}`;
        if (response.status >= 500) {
          return { ok: false, error: 'API_ERROR', details: lastApiError };
        }
        continue;
      }

      const data: unknown = await response.json();
      const records = toRawRecords(data);

      if (records.length === 0) {
        continue;
      }

      return { ok: true, records };
    } catch (err) {
      lastApiError = String(err);
    }
  }

  if (lastApiError) {
    return { ok: false, error: 'API_ERROR', details: lastApiError };
  }

  return { ok: true, records: [] };
}

function resolveFromRecords(
  records: RawSystemRecord[],
  matchedBy: DeviceMatchStrategy
): { kind: 'ok'; result: Extract<DeviceLookupResult, { ok: true }> } | { kind: 'ambiguous' } | { kind: 'missing_id' } {
  if (records.length === 0) {
    return { kind: 'ambiguous' };
  }

  if (records.length === 1) {
    const r = records[0];
    const deviceId = deviceIdFromRecord(r);
    if (!deviceId) {
      return { kind: 'missing_id' };
    }
    return {
      kind: 'ok',
      result: { ok: true, deviceId, active: r.active === true, matchedBy }
    };
  }

  const actives = records.filter((r) => r.active === true);
  if (actives.length === 1) {
    const r = actives[0];
    const deviceId = deviceIdFromRecord(r);
    if (!deviceId) {
      return { kind: 'missing_id' };
    }
    return {
      kind: 'ok',
      result: { ok: true, deviceId, active: true, matchedBy }
    };
  }

  return { kind: 'ambiguous' };
}

export async function findDeviceByHostname(hostname: string): Promise<DeviceLookupResult> {
  const target = (hostname || '').trim();
  if (!target) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  const encoded = encodeURIComponent(target);
  const filterHostname = `hostname:eq:${encoded}`;
  const filterDisplay = `displayName:eq:${encoded}`;

  const layer1 = await searchSystemsByQuery(filterHostname);
  if (layer1.ok === false) {
    return { ok: false, error: 'API_ERROR', details: layer1.details };
  }

  const r1 = resolveFromRecords(layer1.records, 'hostname_exact');
  if (r1.kind === 'ok') {
    return r1.result;
  }
  if (r1.kind === 'missing_id' && layer1.records.length === 1) {
    return { ok: false, error: 'API_ERROR', details: 'ID do device não encontrado na response' };
  }

  const layer2 = await searchSystemsByQuery(filterDisplay);
  if (layer2.ok === false) {
    deviceLookupWarn('jumpcloud.device_lookup.layer2_api_error', { input: target, details: layer2.details });
  } else {
    const r2 = resolveFromRecords(layer2.records, 'displayname_exact');
    if (r2.kind === 'ok') {
      deviceLookupWarn('jumpcloud.device_lookup.fallback.displayname_exact', {
        input: target,
        deviceId: r2.result.deviceId
      });
      return r2.result;
    }
    if (r2.kind === 'missing_id' && layer2.records.length === 1) {
      return { ok: false, error: 'API_ERROR', details: 'ID do device não encontrado na response' };
    }
  }

  const patrimonio = extractPatrimonioFromHostname(target);
  if (!patrimonio) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  const layer3 = await searchSystemsBySearchParam(patrimonio);
  if (layer3.ok === false) {
    return { ok: false, error: 'API_ERROR', details: layer3.details };
  }

  const candidatesAll = layer3.records.filter((r) => recordMatchesPatrimonio(r, patrimonio));
  const candidatesActive = candidatesAll.filter((r) => r.active === true);

  if (candidatesActive.length === 1) {
    const r = candidatesActive[0];
    const id = deviceIdFromRecord(r);
    if (id) {
      deviceLookupWarn('jumpcloud.device_lookup.fallback.patrimonio_search', {
        input: target,
        patrimonio,
        deviceId: id,
        resolvedDisplayName: r.displayName ?? null,
        resolvedHostname: r.hostname ?? null
      });
      return { ok: true, deviceId: id, active: true, matchedBy: 'patrimonio_search' };
    }
    return { ok: false, error: 'API_ERROR', details: 'ID do device não encontrado na response' };
  }

  if (candidatesActive.length > 1) {
    return {
      ok: false,
      error: 'MULTIPLE',
      candidates: candidatesActive.slice(0, 5).map((c) => ({
        displayName: c.displayName ?? '(sem displayName)',
        hostname: c.hostname ?? '(sem hostname)'
      }))
    };
  }

  return { ok: false, error: 'NOT_FOUND' };
}

export type UserDeviceValidation =
  | { ok: true }
  | { ok: false; error: 'NOT_LINKED' | 'API_ERROR'; details?: string };

function graphEntrySystemId(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const id = o.id;
  if (typeof id === 'string' && id.length > 0) return id;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  return null;
}

export async function validateUserDeviceLink(
  jumpcloudUserId: string,
  jumpcloudDeviceId: string
): Promise<UserDeviceValidation> {
  const uid = (jumpcloudUserId || '').trim();
  const did = (jumpcloudDeviceId || '').trim();
  if (!uid || !did) {
    return { ok: false, error: 'API_ERROR', details: 'userId ou deviceId vazio' };
  }

  const limit = 100;
  let skip = 0;

  try {
    while (true) {
      const url = `https://console.jumpcloud.com/api/v2/users/${encodeURIComponent(
        uid
      )}/systems?limit=${limit}&skip=${skip}&sort=_id`;
      const response = await jumpcloudFetch(url, { method: 'GET' });

      if (!response.ok) {
        const text = await response.text();
        return { ok: false, error: 'API_ERROR', details: `${response.status} - ${text}` };
      }

      const data: unknown = await response.json();
      const items = jumpCloudListPayloadToRecords(data);

      if (items.length === 0) break;

      for (const item of items) {
        if (graphEntrySystemId(item) === did) {
          return { ok: true };
        }
      }

      if (items.length < limit) break;
      skip += limit;
      if (skip > 1000) {
        console.warn('[ROOT_ACCESS] validateUserDeviceLink: mais de 1000 registros percorridos, abortando');
        break;
      }
    }

    return { ok: false, error: 'NOT_LINKED' };
  } catch (err) {
    return { ok: false, error: 'API_ERROR', details: String(err) };
  }
}
