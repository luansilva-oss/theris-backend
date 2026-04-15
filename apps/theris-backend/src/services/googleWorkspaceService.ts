/**
 * Provisionamento Google Workspace (fire-and-forget).
 * Se GOOGLE_WORKSPACE_PROVISION_WEBHOOK_URL estiver definido, envia POST JSON com dados do colaborador.
 * Caso contrário, apenas log (integração pode ser n8n ou Admin SDK externo).
 */
export function provisionGoogleWorkspaceUserFireAndForget(params: {
  email: string;
  fullName: string;
  jobTitle?: string;
  department?: string;
  unit?: string;
  managerEmail?: string;
  requestId?: string;
  onDone?: (ok: boolean) => void;
}): void {
  const url = (process.env.GOOGLE_WORKSPACE_PROVISION_WEBHOOK_URL || '').trim();
  if (!url) {
    console.info('[GoogleWorkspace] GOOGLE_WORKSPACE_PROVISION_WEBHOOK_URL ausente; provisionamento ignorado.', params.email);
    params.onDone?.(false);
    return;
  }
  const secret = (process.env.GOOGLE_WORKSPACE_PROVISION_WEBHOOK_SECRET || '').trim();
  const body = JSON.stringify({
    email: params.email,
    fullName: params.fullName,
    jobTitle: params.jobTitle,
    department: params.department,
    unit: params.unit,
    managerEmail: params.managerEmail,
    requestId: params.requestId
  });
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Webhook-Secret': secret } : {})
    },
    body
  })
    .then((r) => {
      params.onDone?.(r.ok);
      if (!r.ok) console.error('[GoogleWorkspace] Webhook retornou não-OK:', r.status, params.email);
    })
    .catch((e) => {
      console.error('[GoogleWorkspace] Falha no webhook:', params.email, e);
      params.onDone?.(false);
    });
}

/**
 * Suspensão Google Workspace no offboarding (fire-and-forget).
 * Usa GOOGLE_WORKSPACE_OFFBOARD_WEBHOOK_URL; se ausente, não envia requisição.
 */
export function suspendGoogleWorkspaceUserFireAndForget(params: {
  email: string;
  requestId?: string;
  onDone?: (ok: boolean) => void;
}): void {
  const url = (process.env.GOOGLE_WORKSPACE_OFFBOARD_WEBHOOK_URL || '').trim();
  if (!url) {
    params.onDone?.(false);
    return;
  }
  const secret = (process.env.GOOGLE_WORKSPACE_OFFBOARD_WEBHOOK_SECRET || process.env.GOOGLE_WORKSPACE_PROVISION_WEBHOOK_SECRET || '').trim();
  const body = JSON.stringify({
    action: 'suspend',
    email: params.email,
    requestId: params.requestId
  });
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Webhook-Secret': secret } : {})
    },
    body
  })
    .then((r) => {
      params.onDone?.(r.ok);
      if (!r.ok) console.error('[GoogleWorkspace] Offboard webhook não-OK:', r.status, params.email);
    })
    .catch((e) => {
      console.error('[GoogleWorkspace] Falha offboard webhook:', params.email, e);
      params.onDone?.(false);
    });
}
