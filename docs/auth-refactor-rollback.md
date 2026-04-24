# Auth Refactor — Playbook de Rollback

> **Contexto**: feat/auth-refactor foi deployado em 26/abr/2026 (sábado 08:00 BRT).
> 11 commits substituíram o fluxo de auth legado (header `x-user-id` + mfaCode texto puro)
> por sessão via cookie HttpOnly + MFA challenge hasheado + refresh rotation.
>
> Este documento é referência **se algo der errado em produção**.

## 🚨 Se login quebrou totalmente em prod

### Rollback rápido (< 5 min)

```bash
# Na máquina local, na branch main:
git checkout main
git pull
git revert <HASH_DO_MERGE> --no-commit
git commit -m "revert: auth refactor (incidente $DATE)"
git push origin main
```

Render fará auto-deploy. Usuários vão voltar ao fluxo legado (x-user-id).

### Manter banco consistente após revert

O refactor criou 3 tabelas novas (`Session`, `RefreshToken`, `MfaChallenge`) e
1 coluna nova (`User.googleSub`). Após revert, código legado ignora essas
estruturas — **não precisa** dropar. Deixa lá como "dead schema" até limpeza
programada.

Se quiser limpar:
```sql
DROP TABLE IF EXISTS "MfaChallenge" CASCADE;
DROP TABLE IF EXISTS "RefreshToken" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TYPE IF EXISTS "SessionRevokeReason";
ALTER TABLE "User" DROP COLUMN IF EXISTS "googleSub";
```

⚠️ Isso perde auditoria do refactor. Só rode se Vladimir aprovar.

## 🔧 Se login funciona mas algum endpoint retorna 401

Verifica no Render dashboard se as env vars estão certas:

```
SESSION_PEPPER          (≥32 chars, base64url)
CSRF_SECRET             (≥32 chars)
IP_PEPPER               (≥32 chars)
GOOGLE_ID_CLIENT        (xxx.apps.googleusercontent.com)
GOOGLE_WORKSPACE_HOSTED_DOMAIN = grupo-3c.com
RESEND_API_KEY          (re_...)
VITE_AUTH_MODE          = cookie
```

Se alguma faltar ou tiver valor errado, backend crash no startup ou falha no login.

## 🔍 Investigação de sessão específica

### Ver sessões ativas de um usuário

```sql
SELECT id, family, "authMethod", acr, "authTime", "lastUsedAt",
       "idleExpiresAt", "absoluteExpiresAt", "isActive", "revokedReason"
FROM "Session"
WHERE "userId" = '<UUID_DO_USER>'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Revogar sessão manualmente

```sql
UPDATE "Session"
SET "isActive" = false,
    "revokedAt" = CURRENT_TIMESTAMP,
    "revokedReason" = 'ADMIN_REVOKE'
WHERE id = '<SESSION_ID>';

UPDATE "RefreshToken"
SET "isActive" = false
WHERE family = '<FAMILY_UUID>';
```

### Investigar reuse detection (possível ataque)

```sql
SELECT rt.id, rt.family, rt.generation, rt."createdAt", rt."usedAt", rt."isActive",
       s."revokedReason"
FROM "RefreshToken" rt
LEFT JOIN "Session" s ON s.family = rt.family
WHERE rt.family = '<FAMILY_UUID>'
ORDER BY rt.generation;
```

Se vê múltiplas rows da mesma `family` com `usedAt` set + uma com `revokedReason=REFRESH_REUSE`, é reuse detection em ação (esperado).

### Ver tentativas MFA recentes

```sql
SELECT id, "userId", "attemptsLeft", "createdAt", "expiresAt", "consumedAt"
FROM "MfaChallenge"
ORDER BY "createdAt" DESC
LIMIT 20;
```

Se `attemptsLeft=0` sem `consumedAt`, foi brute force bloqueado.

## 🔄 Desligar FORCE_SESSION_INVALIDATION após deploy inicial

O primeiro deploy (26/abr/2026) roda com `FORCE_SESSION_INVALIDATION=true`
pra revogar sessões antigas que usavam x-user-id.

Após deploy estável (~1 semana sem incidentes), **mudar no Render**:

1. Render Dashboard → theris-backend → Environment
2. Editar `FORCE_SESSION_INVALIDATION`
3. Mudar de `true` → `false` (ou deletar a var)
4. Salvar
5. Novo deploy NÃO vai mais truncar sessões

Se esquecer e deixar `true`: cada deploy futuro derruba todos os usuários.
Não é um bug de segurança, só UX ruim.

## 📋 Débito técnico (PRs posteriores)

Itens não feitos no refactor inicial (Blocos 1-8), pra fazer em PRs separados:

1. **Refactor dos 30 controllers** que ainda leem `req.headers['x-user-id']`.
   Adaptador `bridgeAuthToLegacy` (src/auth/legacyAdapter.ts) sobrescreve
   o header com user real da sessão, então ataque está fechado. Mas limpeza
   vale pra simplificar código.

2. **Remover imports deprecated** do src/index.ts linha 27:
   `import { googleLogin, sendMfa, verifyMfa } from './controllers/authController'`.
   Após refactor de controllers (#1), dá pra remover stubs de 410 também.

3. **CSP completo**: atualmente `contentSecurityPolicy: false` no helmet
   porque Vite dev tem requirements diferentes de prod. Substituir por CSP
   hardcoded com `nonce` pra scripts inline.

4. **Step-up authentication** (RFC 9470): revoga sessão e força MFA novo
   em endpoints sensíveis (ex.: alterar permissões de SUPER_ADMIN).

5. **Session viewer UI**: tela de "minhas sessões ativas" pro usuário
   ver dispositivos logados e revogar remotamente.

## 📞 Contatos em caso de incidente

- **Luan Silva** (autor do refactor): luan.silva@grupo-3c.com
- **Vladimir Sesar** (SI Lead): vladimir.sesar@grupo-3c.com
- **Allan Von Stein** (SI Analyst): allan.vonstein@grupo-3c.com

## 🗓️ Histórico

- **2026-04-23 → 04-24**: Desenvolvimento do refactor (branch feat/auth-refactor)
- **2026-04-26 08:00 BRT**: Deploy coordenado em prod
- **2026-05-?? :** Desligar FORCE_SESSION_INVALIDATION após observação
