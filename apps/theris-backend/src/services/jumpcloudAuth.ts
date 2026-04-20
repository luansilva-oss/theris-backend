/**
 * OAuth 2.0 client credentials (Service Account) + fallback JUMPCLOUD_API_KEY.
 * Token: https://admin-oauth.id.jumpcloud.com/oauth2/token (doc JumpCloud Service Account).
 */

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;
let inflightTokenRequest: Promise<CachedToken> | null = null;
let oauthFailureNotifiedAt: number | null = null;
const FALLBACK_NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;

const TOKEN_URL = 'https://admin-oauth.id.jumpcloud.com/oauth2/token';

type TokenResponseJson = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

function isConsoleJumpCloudHost(url: string): boolean {
  try {
    return new URL(url).hostname === 'console.jumpcloud.com';
  } catch {
    return false;
  }
}

async function fetchOAuthTokenInternal(): Promise<CachedToken> {
  const clientId = process.env.JUMPCLOUD_CLIENT_ID?.trim();
  const clientSecret = process.env.JUMPCLOUD_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('JUMPCLOUD_CLIENT_ID/SECRET não configurados');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'api'
    }).toString()
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OAuth token request falhou: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as TokenResponseJson;

  if (!data.access_token || typeof data.expires_in !== 'number') {
    throw new Error(`OAuth response inválida: ${JSON.stringify(data)}`);
  }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000
  };
}

async function getOAuthTokenWithLock(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  if (inflightTokenRequest) {
    const t = await inflightTokenRequest;
    return t.accessToken;
  }

  inflightTokenRequest = fetchOAuthTokenInternal()
    .then((token) => {
      cachedToken = token;
      const ttl = Math.floor((token.expiresAt - Date.now()) / 1000);
      console.info(`[JumpCloudAuth] ✅ OAuth token obtido (expira em ~${ttl}s)`);
      return token;
    })
    .finally(() => {
      inflightTokenRequest = null;
    });

  const token = await inflightTokenRequest;
  return token.accessToken;
}

export type AuthSource = 'oauth' | 'apikey';

function notifyFallbackToSiThrottled(reason: string): void {
  const now = Date.now();
  if (oauthFailureNotifiedAt !== null && now - oauthFailureNotifiedAt < FALLBACK_NOTIFY_COOLDOWN_MS) {
    return;
  }
  oauthFailureNotifiedAt = now;

  const safeReason = reason.replace(/`/g, "'");
  const text =
    `⚠️ *JumpCloud Auth — usando fallback*\n\n` +
    `A autenticação OAuth da Service Account (JumpCloud-sync-Theris) falhou. ` +
    `O Theris está a usar a API key pessoal como fallback. ` +
    `Investigar antes que a chave pessoal seja revogada.\n\n` +
    `*Motivo:* \`${safeReason}\`\n\n` +
    `_Próxima notificação só após 30 minutos para evitar spam._`;

  void import('./jumpcloudSyncService')
    .then((m) => m.notifySiSlackJumpCloudKbsIssue(text))
    .catch((e) => console.error('[JumpCloudAuth] Falha ao notificar SI:', e));
}

/**
 * Headers de autenticação para um pedido JumpCloud.
 * `requestUrl`: usado para decidir se envia `x-org-id` (obrigatório em `console.jumpcloud.com`; omitido em `api.jumpcloud.com` p.ex. Insights).
 */
export async function getAuthHeaders(requestUrl: string): Promise<{ headers: Record<string, string>; source: AuthSource }> {
  try {
    const token = await getOAuthTokenWithLock();
    const orgId = process.env.JUMPCLOUD_ORG_ID?.trim();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`
    };

    if (isConsoleJumpCloudHost(requestUrl)) {
      if (orgId) {
        headers['x-org-id'] = orgId;
      } else {
        console.warn(
          '[JumpCloudAuth] ⚠️ JUMPCLOUD_ORG_ID não configurado — chamadas a console.jumpcloud.com podem falhar'
        );
      }
    }

    return { headers, source: 'oauth' };
  } catch (err) {
    const apiKey = process.env.JUMPCLOUD_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        `OAuth falhou e JUMPCLOUD_API_KEY não disponível: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[JumpCloudAuth] ⚠️ OAuth falhou: ${msg} — fallback para API key`);
    notifyFallbackToSiThrottled(`OAuth token: ${msg}`);

    return {
      headers: { 'x-api-key': apiKey },
      source: 'apikey'
    };
  }
}

export function invalidateTokenCache(): void {
  cachedToken = null;
}

export function hasJumpCloudCredentials(): boolean {
  const hasOAuth = !!(
    process.env.JUMPCLOUD_CLIENT_ID?.trim() && process.env.JUMPCLOUD_CLIENT_SECRET?.trim()
  );
  const hasApiKey = !!process.env.JUMPCLOUD_API_KEY?.trim();
  return hasOAuth || hasApiKey;
}

function headersInitToRecord(h: HeadersInit | undefined): Record<string, string> {
  if (h == null) return {};
  if (typeof Headers !== 'undefined' && h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  if (Array.isArray(h)) {
    const out: Record<string, string> = {};
    for (const [k, v] of h) {
      out[k] = v;
    }
    return out;
  }
  return { ...(h as Record<string, string>) };
}

/**
 * `fetch` para APIs JumpCloud: injeta auth (Bearer + `x-org-id` em console, ou `x-api-key`).
 * Em **401** com OAuth, invalida cache e repete com API key (Strategy A, p.ex. Insights em `api.jumpcloud.com`).
 */
export async function jumpcloudFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { headers: authHeaders, source } = await getAuthHeaders(url);
  const callerHeaders = headersInitToRecord(init.headers as HeadersInit | undefined);

  const mergedHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...authHeaders,
    ...callerHeaders
  };

  let response = await fetch(url, { ...init, headers: mergedHeaders });

  if (response.status === 401 && source === 'oauth') {
    console.warn(
      `[JumpCloudAuth] ⚠️ OAuth retornou 401 em ${init.method ?? 'GET'} ${url} — invalidando cache e tentando fallback`
    );
    invalidateTokenCache();

    const apiKey = process.env.JUMPCLOUD_API_KEY?.trim();
    if (apiKey) {
      const fallbackHeaders: Record<string, string> = {
        Accept: 'application/json',
        'x-api-key': apiKey,
        ...callerHeaders
      };
      response = await fetch(url, { ...init, headers: fallbackHeaders });

      if (response.ok) {
        notifyFallbackToSiThrottled(`OAuth retornou 401 em ${init.method ?? 'GET'} ${url}`);
      }
    }
  }

  return response;
}

/** Log de arranque: estado das credenciais JumpCloud (sem segredos). */
export function logJumpCloudAuthBootstrap(): void {
  const hasOAuth = !!(
    process.env.JUMPCLOUD_CLIENT_ID?.trim() && process.env.JUMPCLOUD_CLIENT_SECRET?.trim()
  );
  const hasOrgId = !!process.env.JUMPCLOUD_ORG_ID?.trim();
  const hasFallback = !!process.env.JUMPCLOUD_API_KEY?.trim();

  console.info(
    `[JumpCloudAuth] OAuth: ${hasOAuth ? '✅' : '❌'} | ` +
      `Org ID: ${hasOrgId ? '✅' : '❌'} | ` +
      `Fallback API key: ${hasFallback ? '✅' : '❌'}`
  );

  if (!hasOAuth && !hasFallback) {
    console.error(
      '[JumpCloudAuth] ❌ NENHUMA credencial JumpCloud configurada — integração irá falhar'
    );
  }

  if (hasOAuth && !hasOrgId) {
    console.warn(
      '[JumpCloudAuth] ⚠️ OAuth configurado mas JUMPCLOUD_ORG_ID ausente — ' +
        'chamadas a console.jumpcloud.com podem retornar 401/403'
    );
  }

  if (!hasOAuth && hasFallback) {
    console.warn(
      '[JumpCloudAuth] ⚠️ Operando APENAS via API key pessoal (fallback). ' +
        'Configure JUMPCLOUD_CLIENT_ID/SECRET para usar Service Account.'
    );
  }
}
