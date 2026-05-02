# ClawGuard

## Overview

ClawGuard is an autonomous AI-powered blockchain risk monitor for NEAR Protocol and XRP Ledger. It runs a 30-second monitoring cycle, analyzes live blockchain stats with OpenAI, fires Telegram alerts for elevated risk, and logs alerts immutably on-chain to the XRP Ledger.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Replit AI Integrations (OpenAI gpt-5.1) — no API key required
- **Blockchain**: xrpl.js (XRPL), NEAR JSON-RPC (NEAR Protocol)
- **Alerts**: Telegram Bot API
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui

## Architecture

### Monitor Service (`artifacts/api-server/src/monitor/`)
- `nearStats.ts` — fetches live NEAR block height, validators, gas price, stake
- `xrplStats.ts` — fetches live XRPL ledger index, base fee, server state, load factor
- `openclawReasoner.ts` — AI risk analysis (LOW/MEDIUM/HIGH) using OpenAI
- `telegramAlert.ts` — sends Telegram alerts for MEDIUM/HIGH risk
- `xrplLogger.ts` — writes immutable on-chain memo to XRP Ledger for MEDIUM/HIGH risk
- `monitorService.ts` — orchestrates 30-second cycles, persists alerts to DB

### Frontend (`artifacts/clawguard/`)
- `/` — Dashboard: live risk level, summary stats, recent alerts
- `/alerts` — Full alert history, filterable by risk level
- `/stats` — Live NEAR and XRPL blockchain metrics, auto-refreshes

### API Routes (`/api/monitor/`)
- `GET /status` — current monitor state and risk level
- `GET /alerts` — paginated alert history
- `GET /stats` — live blockchain stats (cached 25s)
- `POST /trigger` — manually trigger a monitoring cycle
- `GET /summary` — aggregated risk distribution stats

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Secrets (add when ready)

- `TELEGRAM_BOT_TOKEN` — from @BotFather on Telegram
- `TELEGRAM_CHAT_ID` — your Telegram chat ID
- `XRPL_SECRET` — XRPL wallet secret (testnet from xrpl.org/resources/dev-tools/xrp-faucets)
- `XRPL_ADDRESS` — XRPL wallet address (testnet)
- `NEAR_ACCOUNT_ID` — NEAR testnet account ID

## Notes

- The monitor runs automatically on server start — no manual activation needed
- Telegram and XRPL on-chain logging are gracefully skipped if secrets are not configured
- AI analysis uses Replit's built-in OpenAI integration (charged to Replit credits, no key needed)
- NEAR uses testnet RPC; XRPL uses altnet (testnet)
