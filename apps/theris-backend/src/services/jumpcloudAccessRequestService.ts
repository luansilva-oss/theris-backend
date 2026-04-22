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

export type DeviceLookupResult =
  | { ok: true; deviceId: string; active: boolean }
  | { ok: false; error: 'NOT_FOUND' | 'MULTIPLE' | 'API_ERROR'; details?: string };

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

export async function findDeviceByHostname(hostname: string): Promise<DeviceLookupResult> {
  const h = (hostname || '').trim();
  if (!h) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  const urls = [
    `https://console.jumpcloud.com/api/systems?filter=hostname:eq:${encodeURIComponent(h)}`,
    `https://console.jumpcloud.com/api/v2/systems?filter=hostname:eq:${encodeURIComponent(h)}`
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
      const results = jumpCloudListPayloadToRecords(data);

      if (results.length === 0) {
        continue;
      }

      let candidates = results;
      if (candidates.length > 1) {
        const activeOnly = candidates.filter((d) => d.active === true);
        if (activeOnly.length === 1) {
          candidates = activeOnly;
        } else {
          console.warn(
            `[ROOT_ACCESS] findDeviceByHostname(${h}): ${candidates.length} candidates, ${activeOnly.length} active, ambíguo`
          );
          return { ok: false, error: 'MULTIPLE' };
        }
      }

      const device = candidates[0];
      const idRaw = device._id ?? device.id;
      const deviceId =
        typeof idRaw === 'string' ? idRaw : typeof idRaw === 'number' && Number.isFinite(idRaw) ? String(idRaw) : null;

      if (!deviceId) {
        return { ok: false, error: 'API_ERROR', details: 'ID do device não encontrado na response' };
      }

      return {
        ok: true,
        deviceId,
        active: device.active === true
      };
    } catch (err) {
      lastApiError = String(err);
    }
  }

  if (lastApiError) {
    return { ok: false, error: 'API_ERROR', details: lastApiError };
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
