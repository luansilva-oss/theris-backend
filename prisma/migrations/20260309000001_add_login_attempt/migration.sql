CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id"         TEXT NOT NULL,
  "email"      TEXT,
  "ipAddress"  TEXT NOT NULL,
  "userAgent"  TEXT,
  "success"    BOOLEAN NOT NULL,
  "failReason" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoginAttempt_email_idx" ON "LoginAttempt"("email");
CREATE INDEX IF NOT EXISTS "LoginAttempt_ipAddress_idx" ON "LoginAttempt"("ipAddress");
CREATE INDEX IF NOT EXISTS "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");
