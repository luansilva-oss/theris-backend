# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start backend (tsx) + frontend (Vite) concurrently
npm run build:prod   # prisma generate → vite build → tsc
node dist/index.js   # Run production build

npx prisma migrate dev --name <nome>   # Create and apply migration
npx prisma generate                    # Regenerate client after schema change
npx prisma studio                      # Browse database

npm run db:push      # Push schema without migration (dev only)
```

> **Never** add `npx prisma migrate deploy` to the start command — it causes advisory lock timeouts on Render when deploys overlap. Migrations must be run separately from the Render dashboard.

## Architecture

The app is an Express + TypeScript API that also serves a React (Vite) frontend as static files. It is organized into:

- **`src/index.ts`** — Entry point: registers all routes, starts Slack Bolt app, initialises cron jobs.
- **`src/controllers/`** — Route handlers. Each controller owns a domain: `solicitacaoController` (requests/AEX), `userController` (personnel), `toolController` (tool catalog), `authController` (OAuth + MFA), `kbuController` (Kit Básico Universal), `structureController` (Unit/Department/Role hierarchy), `adminController`, `auditLogController`.
- **`src/services/`** — Business logic and third-party integrations: `slackService` (Bolt commands/modals/approvals), `jumpcloudService` (directory provisioning), `googleWorkspaceService` (provisioning via n8n webhook), `emailService` (MFA + Resend), `aexOwnerService` + `siSlackApprovalService` (AEX approval chain), `reviewAccessService` (90-day review).
- **`src/crons/`** — Scheduled jobs (cleanup sessions, JumpCloud password events, 90-day review reminders, onboarding action-date alerts).
- **`src/jobs/`** — Heavier one-off / complex jobs: `recertifyExtraordinaryAccess` (AEX 90d recertification), `expireExtraordinaryAccess` (auto-revoke), `jumpcloudDivergenceCheck`.
- **`src/middleware/auth.ts`** — `requireAuth` validates the `x-user-id` header against the `Session` table and attaches `authUser` to the request.
- **`src/routes/webhooks.ts`** — Convenia webhook handler.
- **`prisma/schema.prisma`** — Source of truth for all models.

## Key Domain Concepts

### AEX (Acesso Extraordinário)
Request → Owner approval (Slack) → SI approval (Slack) → JumpCloud group provisioned. Status flow: `PENDING_OWNER → PENDING_SI → APPROVED/REJECTED`. 90-day cap; recertification DMs sent to owners.

### Onboarding / Offboarding
Driven by Slack commands (`/pessoas`) and Convenia webhooks. Hire creates User + JumpCloud + Google accounts; fire soft-deletes and revokes accesses. Role Kits (`RoleKitItem`) define which tools a Role automatically receives.

### Access Reviews
90-day periodic reviews run via cron. `Tool.nextReviewAt` tracks when each tool's owner must re-certify access.

## Auth Flow

1. `POST /api/login/google` — Google OAuth, returns `userId`.
2. `POST /api/auth/send-mfa` — Sends email code (7-min expiry).
3. `POST /api/auth/verify-mfa` — Validates code, creates `Session`.
4. All subsequent requests carry `x-user-id` header; 60-min inactivity timeout enforced by `sessionTimeout` middleware.

## Roles / systemProfile

`VIEWER` (default) · `ADMIN` · `SUPER_ADMIN` (SI team) · `APPROVER` (tool owners).

## Conventions

- All structural changes are logged to `HistoricoMudanca` (audit trail). Sensitive fields are filtered for VIEWER profile.
- Users are soft-deleted (`isActive = false`), never hard-deleted.
- CSV exports use UTF-8 BOM and semicolons as separators (Excel compatibility).
- JumpCloud is the directory source of truth; app state must stay in sync.
- Slack integration uses the Bolt framework. Commands: `/acessos`, `/pessoas`, `/help`.

## Environment Variables

Key env vars (see `.env` or Render dashboard for values):
- `JUMPCLOUD_WEBHOOK_SECRET`, `JC_GOOGLE_WORKSPACE_DIRECTORY_ID`
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_*_CHANNEL_ID`, `SLACK_USER_*`
- `GOOGLE_WORKSPACE_PROVISION_WEBHOOK_URL` (n8n endpoint)
- `DATABASE_URL`

## Deployment

- Hosted on Render.com.
- Frontend build output goes to `src/client/`, served as static from Express.
- Build command: `npm run build:prod`. Start command: `node dist/index.js`.
