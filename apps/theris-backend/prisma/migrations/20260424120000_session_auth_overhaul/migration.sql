-- ============================================================================
-- AUTH REFACTOR — Session + RefreshToken + MfaChallenge + User.googleSub
-- ============================================================================
-- Issue: header x-user-id era a "credencial" — bypass trivial.
-- Fix:   sessão server-side com token opaco hasheado, refresh rotation,
--        MFA amarrado à criação de sessão, googleSub como identidade canônica.
-- ============================================================================

-- 1. Drop schema antigo de Session (sem dados úteis: única coluna útil era lastActivity)
DROP TABLE IF EXISTS "Session" CASCADE;

-- 2. Enum de motivos de revogação
DO $$ BEGIN
  CREATE TYPE "SessionRevokeReason" AS ENUM (
    'USER_LOGOUT',
    'USER_LOGOUT_ALL',
    'IDLE_TIMEOUT',
    'ABSOLUTE_TIMEOUT',
    'REFRESH_REUSE',
    'ADMIN_REVOKE',
    'PASSWORD_CHANGED',
    'GLOBAL_INVALIDATION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Session (novo schema)
CREATE TABLE "Session" (
  "id"                TEXT PRIMARY KEY,
  "tokenHash"         BYTEA NOT NULL,
  "userId"            TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "family"            TEXT NOT NULL,
  "authMethod"        TEXT NOT NULL DEFAULT 'google',
  "acr"               TEXT NOT NULL DEFAULT 'pwd',
  "amr"               TEXT[] NOT NULL DEFAULT ARRAY['pwd']::TEXT[],
  "authTime"          TIMESTAMP(3) NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idleExpiresAt"     TIMESTAMP(3) NOT NULL,
  "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
  "ipHash"            BYTEA,
  "uaHash"            BYTEA,
  "isActive"          BOOLEAN NOT NULL DEFAULT true,
  "revokedAt"         TIMESTAMP(3),
  "revokedReason"     "SessionRevokeReason"
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_createdAt_idx" ON "Session"("userId", "createdAt");
CREATE INDEX "Session_family_idx" ON "Session"("family");
CREATE INDEX "Session_isActive_idleExpiresAt_idx" ON "Session"("isActive", "idleExpiresAt");

-- 4. RefreshToken
CREATE TABLE "RefreshToken" (
  "id"         TEXT PRIMARY KEY,
  "tokenHash"  BYTEA NOT NULL,
  "sessionId"  TEXT NOT NULL REFERENCES "Session"("id") ON DELETE CASCADE,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "family"     TEXT NOT NULL,
  "generation" INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt"     TIMESTAMP(3),
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "isActive"   BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_sessionId_idx" ON "RefreshToken"("sessionId");
CREATE INDEX "RefreshToken_family_generation_idx" ON "RefreshToken"("family", "generation");
CREATE INDEX "RefreshToken_userId_createdAt_idx" ON "RefreshToken"("userId", "createdAt");

-- 5. MfaChallenge — estado entre Google login e MFA confirmado
CREATE TABLE "MfaChallenge" (
  "id"             TEXT PRIMARY KEY,
  "challengeHash"  BYTEA NOT NULL,
  "userId"         TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "codeHash"       BYTEA NOT NULL,
  "attemptsLeft"   INTEGER NOT NULL DEFAULT 5,
  "ipHash"         BYTEA,
  "uaHash"         BYTEA,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "consumedAt"     TIMESTAMP(3)
);

CREATE UNIQUE INDEX "MfaChallenge_challengeHash_key" ON "MfaChallenge"("challengeHash");
CREATE INDEX "MfaChallenge_userId_createdAt_idx" ON "MfaChallenge"("userId", "createdAt");
CREATE INDEX "MfaChallenge_expiresAt_idx" ON "MfaChallenge"("expiresAt");

-- 6. User.googleSub — identidade canônica OIDC
ALTER TABLE "User" ADD COLUMN "googleSub" TEXT;
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- 7. Cleanup oportunista: LoginAttempt > 90 dias
DELETE FROM "LoginAttempt" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '90 days';
