# FortiChain

**AI-Native Security Judgment Layer for DeFi Protocols**

FortiChain monitors DeFi protocols in real-time using on-chain data, threat feeds, and social signals. It submits those signals to a GenLayer Intelligent Contract running 5 independent AI validators, which reach consensus on a risk tier and commit a tamper-proof judgment on-chain. Teams receive instant email/webhook alerts with the risk score, recommended action, and full audit trail.

**Live deployments**
- Frontend: https://forti-chain.vercel.app
- API: https://fortichain-api.fly.dev

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [How It Works](#how-it-works)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Environment Variables](#environment-variables)
8. [Local Development](#local-development)
9. [Deployment](#deployment)
10. [Feature Status](#feature-status)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Client                         │
│              Next.js 15 · Tailwind · Zustand                │
│         forti-chain.vercel.app  (Vercel, auto-deploy)       │
└──────────────────────┬──────────────────────────────────────┘
                       │  Authorization: Bearer <token>
┌──────────────────────▼──────────────────────────────────────┐
│                   Fastify API                               │
│           fortichain-api.fly.dev  (Fly.io, 1GB RAM)         │
│                                                             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  Auth/JWT   │  │  Protocol     │  │  Admin Routes    │  │
│  │  Routes     │  │  + Judgment   │  │  (role=admin)    │  │
│  └─────────────┘  │  Routes       │  └──────────────────┘  │
│                   └───────────────┘                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Background Workers                     │    │
│  │  • Signal Ingestion — 6 sources (60s interval)      │    │
│  │    Etherscan · Forta · DeFiLlama · CoinGecko        │    │
│  │    RSS News · Twitter/X                             │    │
│  │  • Analysis Scheduler (auto-analyze, configurable)  │    │
│  │  • GEN Balance Sync (on-chain balance cache, 10m)   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
┌──────────────▼───────┐   ┌──────────▼──────────────────────┐
│  PostgreSQL (Neon)   │   │  GenLayer StudioNet             │
│  • users             │   │  Contract: 0xAbf8a0A0...1Fec07   │
│  • protocols         │   │  5 AI Validators · GEN token     │
│  • ai_judgments      │   │  register_protocol()             │
│  • alerts_sent       │   │  analyze_protocol()              │
│  • signal_ingestions │   │  get_latest_judgment()           │
│  • api_keys          │   └─────────────────────────────────┘
│  • gen_transactions  │
│  • notifications     │
│  • _migrations       │
└──────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| State | Zustand with `persist` middleware |
| API | Fastify 5, TypeScript, `tsx` runtime |
| ORM | Drizzle ORM (PostgreSQL) |
| Database | PostgreSQL (Neon) |
| Cache | Upstash Redis (TLS `rediss://`) |
| AI Consensus | GenLayer Intelligent Contract (`genlayer-js` SDK) |
| Email | Brevo transactional email (`@getbrevo/brevo`) |
| Wallet | ethers.js — HD wallet generation per user, AES-256-GCM encrypted at rest |
| Auth | JWT (7-day access token) + Refresh token (30 days), stored in `localStorage`, sent as `Authorization: Bearer` header |
| Frontend hosting | Vercel (GitHub auto-deploy) |
| API hosting | Fly.io (shared CPU, 1 GB RAM, IAD region, always-on `min_machines_running = 1`) |

---

## Repository Structure

```
FortiChain/
├── apps/
│   ├── api/                        # Fastify REST API
│   │   ├── src/
│   │   │   ├── config/env.ts       # Environment variable validation
│   │   │   ├── db/
│   │   │   │   ├── index.ts        # Drizzle + pg-pool connection
│   │   │   │   ├── schema.ts       # Full DB schema (all tables)
│   │   │   │   ├── migrate.ts      # Auto-migration runner (_migrations table)
│   │   │   │   └── migrations/
│   │   │   │       ├── 0000_initial.sql
│   │   │   │       ├── 0001_on_chain_registered.sql
│   │   │   │       ├── 0002_server_encrypted_key.sql
│   │   │   │       ├── 0003_user_role.sql
│   │   │   │       └── 0004_features.sql   # notifications, suspend, email verify, auto-analyze
│   │   │   ├── middleware/
│   │   │   │   ├── authenticate.ts # Bearer token + API key auth, populates req.user
│   │   │   │   └── requireAdmin.ts # role=admin guard
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # register, login, refresh, logout, me, verify-email,
│   │   │   │   │                   # forgot/reset password, resend-verification
│   │   │   │   ├── protocols.ts    # CRUD + analyze + judgments + auto-analyze interval
│   │   │   │   ├── judgments.ts    # Global judgment history
│   │   │   │   ├── alerts.ts       # Alert history
│   │   │   │   ├── apiKeys.ts      # API key create/revoke
│   │   │   │   ├── wallet.ts       # GEN balance, subscribe (on-chain payment), export key/mnemonic
│   │   │   │   ├── intelligence.ts # Signal ingestion feed + global risk
│   │   │   │   ├── notifications.ts# In-app notifications (list, mark-read, delete)
│   │   │   │   ├── settings.ts     # Profile, notification prefs, webhook, signal keys
│   │   │   │   ├── publicStats.ts  # Unauthenticated — used by landing page
│   │   │   │   └── admin.ts        # Admin: stats, users, suspend, protocols, judgments,
│   │   │   │                       # health dashboard, CSV export
│   │   │   ├── services/
│   │   │   │   ├── genlayer/
│   │   │   │   │   └── genLayerService.ts  # GenLayer contract calls
│   │   │   │   ├── alerts/
│   │   │   │   │   └── alertService.ts     # Email + webhook dispatch
│   │   │   │   └── wallet/
│   │   │   │       ├── walletService.ts    # HD wallet generation/export
│   │   │   │       └── encryption.ts       # AES-256-GCM encrypt/decrypt
│   │   │   ├── workers/
│   │   │   │   ├── index.ts                # Starts all workers, exports workerHealth
│   │   │   │   ├── signalIngestion.ts      # 6-source signal polling (60s)
│   │   │   │   ├── analysis.ts             # Scheduled auto-analysis + workerHealth tracking
│   │   │   │   └── genBalanceSync.ts       # GEN balance cache refresh (10m)
│   │   │   └── index.ts                    # Fastify app entry, per-user rate limiting
│   │   ├── entrypoint.sh           # Starts API only (migrations run in release_command)
│   │   ├── fly.toml                # Fly.io config (release_command, 180s grace period, 1GB RAM)
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                        # Next.js frontend
│       ├── app/
│       │   ├── (marketing)/        # Landing page
│       │   │   └── page.tsx
│       │   ├── (auth)/
│       │   │   └── auth/
│       │   │       ├── login/
│       │   │       ├── signup/
│       │   │       ├── forgot-password/
│       │   │       ├── reset-password/
│       │   │       └── verify-email/       # Email verification (Suspense-wrapped)
│       │   └── dashboard/
│       │       ├── page.tsx            # Overview
│       │       ├── protocols/          # Protocol list + detail ([id]) with auto-analyze interval
│       │       ├── alerts/
│       │       ├── intelligence/       # Signal feed + global risk
│       │       ├── api-keys/
│       │       ├── wallet/             # GEN balance, subscription plans (50/200 GEN), export
│       │       ├── settings/
│       │       └── admin/              # Admin panel (role=admin only)
│       ├── components/
│       │   ├── layout/
│       │   │   ├── DashboardShell.tsx  # Sidebar + topbar + NotificationBell + EmailVerificationBanner
│       │   │   ├── MarketingNav.tsx
│       │   │   └── Footer.tsx
│       │   └── marketing/
│       │       ├── HeroSection.tsx
│       │       ├── FeaturesSection.tsx
│       │       ├── HowItWorksSection.tsx
│       │       ├── ThreatLevelsSection.tsx
│       │       ├── PricingSection.tsx
│       │       └── CtaSection.tsx
│       ├── lib/
│       │   ├── api.ts          # Axios instance — Bearer token from localStorage, auto-refresh on 401
│       │   ├── store.ts        # Zustand auth store (persisted to localStorage)
│       │   └── usePolling.ts   # Generic polling hook (10s everywhere)
│       └── tailwind.config.ts
│
└── vercel.json                 # Vercel build config (legacy-peer-deps)
```

---

## How It Works

### 1. User Onboarding
- User registers with email + password
- API generates an HD wallet (`m/44'/60'/0'/0/0`) using ethers.js
- Private key is encrypted twice:
  - **User-encrypted**: AES-256-GCM with PBKDF2(password + `WALLET_ENCRYPTION_SECRET`)
  - **Server-encrypted**: AES-256-GCM with PBKDF2(`WALLET_ENCRYPTION_SECRET`, userId) — stored as `server_encrypted_key`, allowing the API to sign on-chain transactions without the user's password
- A verification email is dispatched via Brevo; users see a persistent banner until verified
- JWT access token (7d) + refresh token (30d) are returned in the response body and stored in `localStorage`

### 2. Protocol Registration
- User adds a protocol (name, chain, category, optional contract address)
- API submits `register_protocol()` to the GenLayer contract using the user's own wallet
- Result cached in `on_chain_registered` DB flag to avoid redundant contract reads

### 3. AI Analysis Flow
```
POST /protocols/:id/analyze
  → Gather signals from 6 sources (Etherscan, Forta, DeFiLlama, CoinGecko, RSS, Twitter/X)
  → ensureProtocolRegistered() — fast path via DB flag, fallback reads stateStatus:'finalized'
  → writeContract('analyze_protocol', signalsJson)  [signed by user's wallet]
  → wait for ACCEPTED status (GenLayer consensus: ~1–3 min, 5 validators)
  → readContract('get_latest_judgment')
  → Save to ai_judgments table
  → Create in-app notification for user
  → If level >= 2: dispatch email + webhook alerts via Brevo
  → Return judgment to client
```

### 4. Auto-Analysis Scheduler
- Each protocol has an optional `autoAnalyzeIntervalHours` field (0 = disabled, max 168h)
- The analysis worker runs every 5 minutes and checks all active protocols with the interval set
- If `now >= lastAnalyzedAt + interval`, a full analysis is triggered automatically

### 5. Risk Tiers
| Tier | DB Level | Label | Risk Score |
|------|----------|-------|-----------|
| 0 | 1 | Safe | 0–19 |
| 1 | 2 | Warning | 20–39 |
| 2 | 3 | Restricted | 40–59 |
| 3 | 4 | Emergency | 60–79 |
| 4 | 5 | Critical | 80–100 |

> Alerts fire for `level >= 2` (Warning and above).

### 6. Signal Ingestion (6 Sources)
A background worker runs every 60 seconds and pulls from:
- **Etherscan** — large ETH transfers (>10 ETH) on the protocol's contract address
- **Forta** — security alerts via GraphQL API
- **DeFiLlama** — TVL changes ≥ 10% vs. previous 24h
- **CoinGecko** — price anomalies ≥ 15% over 24h
- **RSS / News** — protocol mentions via rss2json.com
- **Twitter/X** — recent tweets via v2 search API

All sources are wrapped in individual try/catch — a failing source never blocks the others.

### 7. GEN Token Subscription
- Plans: Pro = 50 GEN/month, Enterprise = 200 GEN/month
- On subscribe: API checks live on-chain balance via `eth_getBalance`, then sends a native GEN transfer from the user's wallet to the treasury wallet (`TREASURY_WALLET`) using `genlayer-js`
- Transaction hash is recorded in `gen_transactions`; cached balance is updated

### 8. Session Persistence
- Access token stored in `localStorage` as `access_token`
- Every axios request attaches `Authorization: Bearer <token>`
- On 401: interceptor reads `refresh_token` from `localStorage`, calls `/auth/refresh`, retries the original request with the new token
- Logout clears both tokens from `localStorage`

---

## Database Schema

```
users
  id · email · password_hash · wallet_address · encrypted_private_key
  encrypted_mnemonic · wallet_salt · server_encrypted_key
  gen_balance_cache · subscription_tier · role · suspended
  email_verified · email_verify_token · email_verify_expiry
  created_at · updated_at

protocols
  id · user_id → users · name · chain · contract_address · category
  website_url · monitoring_active · webhook_url · alert_email
  risk_score · on_chain_registered · last_analyzed_at
  auto_analyze_interval_hours · created_at · updated_at

ai_judgments
  id · protocol_id → protocols · threat_event_id
  contract_call_tx · risk_score · level · validator_explanations (jsonb)
  recommended_action · consensus_reached · gen_cost · created_at

alerts_sent
  id · judgment_id → ai_judgments · protocol_id · channel · destination
  payload (jsonb) · delivered · retry_count · sent_at · delivered_at

signal_ingestions
  id · protocol_id → protocols · source · content (jsonb)
  processed · ingested_at · processed_at

api_keys
  id · user_id → users · key_hash · key_prefix · label
  permissions (jsonb) · rate_limit · last_used_at · revoked_at · created_at

gen_transactions
  id · user_id → users · tx_hash · amount · purpose · confirmed · created_at

notifications
  id · user_id → users · title · body · read · created_at

_migrations
  filename · applied_at
```

---

## API Reference

All routes are prefixed `/api/v1`. Authenticated routes accept `Authorization: Bearer <token>` header or `X-API-Key` header.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account + generate wallet |
| POST | `/auth/login` | — | Returns JWT token + refresh token in body |
| POST | `/auth/refresh` | — | Rotate access token using refresh token |
| POST | `/auth/logout` | — | Invalidate session |
| GET | `/auth/me` | ✓ | Current user profile |
| GET | `/auth/verify-email` | — | Consume email verification token |
| POST | `/auth/resend-verification` | ✓ | Resend verification email |
| POST | `/auth/forgot-password` | — | Send reset email (Brevo) |
| POST | `/auth/reset-password` | — | Consume token, set new password |

### Protocols
| Method | Path | Description |
|--------|------|-------------|
| GET | `/protocols` | List user's protocols |
| POST | `/protocols` | Add protocol (triggers on-chain registration) |
| GET | `/protocols/registered` | List with `onChainRegistered` status |
| GET | `/protocols/contract-stats` | GenLayer contract stats |
| GET | `/protocols/:id` | Protocol detail |
| PUT | `/protocols/:id` | Update protocol (incl. `autoAnalyzeIntervalHours`) |
| DELETE | `/protocols/:id` | Remove protocol |
| POST | `/protocols/:id/analyze` | Trigger AI judgment (waits for consensus) |
| GET | `/protocols/:id/judgments` | Judgment history for protocol |
| GET | `/protocols/:id/chain-risk` | Latest judgment direct from contract |

### Other Authenticated Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/judgments` | Global judgment history |
| GET | `/alerts` | Alert history |
| GET/POST/DELETE | `/api-keys` | API key management |
| GET | `/wallet` | GEN balance + recent transactions |
| GET | `/wallet/plan-prices` | GEN prices per subscription plan |
| POST | `/wallet/subscribe` | Pay GEN on-chain, upgrade subscription tier |
| POST | `/wallet/export-key` | Decrypt + return private key |
| POST | `/wallet/export-mnemonic` | Decrypt + return mnemonic |
| GET | `/intelligence/feed` | Signal ingestion feed (latest 50) |
| GET | `/intelligence/global-risk` | Aggregated risk across all protocols |
| GET | `/notifications` | In-app notifications (unread count + list) |
| PATCH | `/notifications/read-all` | Mark all notifications read |
| DELETE | `/notifications/:id` | Delete notification |
| PATCH | `/settings/notifications` | Update notification preferences |
| PATCH | `/settings/webhook` | Update default webhook URL |
| PATCH | `/settings/signal-keys` | Update signal source API keys |

### Admin (role=admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Platform totals + breakdowns |
| GET | `/admin/health` | API uptime, memory, worker run counts + errors |
| GET | `/admin/users` | All users with protocol/judgment counts |
| PATCH | `/admin/users/:id/role` | Promote/demote user |
| PATCH | `/admin/users/:id/suspend` | Suspend or unsuspend user |
| GET | `/admin/protocols` | All protocols across all users |
| GET | `/admin/judgments` | Recent judgments across all users |
| GET | `/admin/export/users.csv` | Download users as CSV |
| GET | `/admin/export/protocols.csv` | Download protocols as CSV |
| GET | `/admin/export/judgments.csv` | Download judgments as CSV |

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Live counts for landing page (no auth) |
| GET | `/health` | API health check |

---

## Environment Variables

### API (`apps/api/.env`)
```env
# Required
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=<random 64-char hex>
JWT_REFRESH_SECRET=<random 64-char hex>
WALLET_ENCRYPTION_SECRET=<random 64-char hex>

# GenLayer
GENLAYER_CONTRACT_ADDRESS=0xAbf8a0A08C73Faa30bA8717DDffb9328331Fec07
GENLAYER_PRIVATE_KEY=0x...        # Fallback deployer key
TREASURY_WALLET=0x...             # Receives GEN subscription payments

# Email (Brevo)
BREVO_API_KEY=xkeysib-...
EMAIL_FROM=alerts@yourapp.com

# Signal sources (all optional — sources degrade gracefully if absent)
ETHERSCAN_API_KEY=
ALCHEMY_API_KEY=
FORTA_API_KEY=
COINGECKO_API_KEY=
TWITTER_BEARER_TOKEN=

# Infrastructure
REDIS_URL=rediss://...            # Upstash Redis (TLS required in prod)
CORS_ORIGIN=https://forti-chain.vercel.app
NODE_ENV=production
PORT=3001
BCRYPT_ROUNDS=12
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://fortichain-api.fly.dev   # Omit in prod — Vercel rewrites handle it
```

---

## Local Development

### Prerequisites
- Node.js 22+
- PostgreSQL 15+
- Redis (or Upstash)

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env with your values

# 3. Run DB migrations
cd apps/api && npx tsx src/db/migrate.ts

# 4. Start API (port 3001)
npx tsx src/index.ts

# 5. Start frontend (port 3000) — in a new terminal
cd apps/web && npm run dev
```

The Next.js dev server proxies all `/api/*` requests to `http://localhost:3001` via `next.config.ts` rewrites.

---

## Deployment

### API — Fly.io
```bash
# Deploy from repo root (Dockerfile at apps/api/Dockerfile)
fly deploy --dockerfile apps/api/Dockerfile --config apps/api/fly.toml

# Secrets
fly secrets set DATABASE_URL="..." JWT_SECRET="..." TREASURY_WALLET="0x..." --app fortichain-api

# Logs
fly logs --app fortichain-api

# SSH
fly ssh console --app fortichain-api
```

DB migrations run automatically as a `release_command` before any new machine starts — the app itself boots in ~8 seconds. Health check grace period is 180 seconds. `min_machines_running = 1` keeps the API always warm (no cold starts).

### Frontend — Vercel
Connected to GitHub (`main` branch). Every push triggers an automatic deploy. Root directory: `apps/web`.

```bash
# Manual deploy
cd apps/web && vercel --prod
```

---

## Feature Status

### ✅ Shipped

**Infrastructure**
- Monorepo (Next.js + Fastify) with Vercel + Fly.io CI/CD
- PostgreSQL with auto-migration runner (tracks `_migrations` table)
- DB migrations run via Fly `release_command` — fast boot (~8s), no cold starts
- Upstash Redis for rate limiting / cache
- Per-user rate limiting (keyed by `user.id` when authenticated, IP when not)
- GitHub → Vercel auto-deploy on push to main

**Authentication & Wallets**
- Email/password registration with bcrypt
- JWT access token (7 days) + refresh token (30 days) in `localStorage`
- Auto-refresh on 401 — silent token rotation without re-login
- Session persists across page reloads
- Per-user HD wallet (ethers.js) generated on signup, AES-256-GCM encrypted
- Server-side wallet key re-encrypted with server secret — API can sign on-chain without plaintext key
- Email verification flow with Brevo email + persistent in-app banner
- Forgot password / reset password flow (15-min token)
- Role system: `user` | `admin`; admin can suspend/demote users

**GenLayer Integration**
- Intelligent Contract at `0xAbf8a0A08C73Faa30bA8717DDffb9328331Fec07` on StudioNet
- `register_protocol()` — called with user's own wallet on protocol creation
- `analyze_protocol()` — submits signal bundle, waits for 5-validator consensus (~60s)
- `get_latest_judgment()` — reads result after tx accepted
- Graceful "already registered" handling + `on_chain_registered` DB flag as fast path

**Signal Ingestion (6 Sources)**
- Etherscan — large ETH transfers (>10 ETH) on contract address
- Forta — security alerts via GraphQL
- DeFiLlama — TVL changes ≥ 10%
- CoinGecko — price anomalies ≥ 15%
- RSS / News — protocol mentions
- Twitter/X — keyword search via v2 API
- Worker health tracked per-source, exposed via `/admin/health`

**Auto-Analysis Scheduler**
- Per-protocol `autoAnalyzeIntervalHours` setting (0–168h, configurable in UI)
- Analysis worker checks all active protocols every 5 minutes and triggers when due

**Protocol Management**
- Full CRUD (name, chain, category, contract address, webhook, alert email)
- On-chain registration triggered automatically on creation
- Manual analyze button + auto-analyze interval selector in protocol detail view
- Judgment history per protocol

**Alerts & Notifications**
- Brevo email alerts for Warning tier and above
- Webhook dispatch to user-configured URL
- Alert history with delivery status
- In-app notification bell — polls every 10s, unread badge, dropdown, mark-all-read, delete

**GEN Token Subscription**
- Plans: Pro 50 GEN/month · Enterprise 200 GEN/month
- Live on-chain balance check before payment
- On-chain GEN transfer to treasury wallet via `genlayer-js`
- Transaction recorded in `gen_transactions`; cached balance updated

**Dashboard**
- Overview: stat cards, protocol risk list, recent judgments table, live stats
- Protocols: grid view, risk bars, analyze button, SAFE/WARNING/etc. badges
- Protocol detail: stat cards, risk chart, judgment history, auto-analyze interval selector
- Alerts: full history
- Intelligence: signal feed + global risk summary
- API Keys: create / revoke with prefix display
- Wallet: GEN balance, faucet link, subscription plans with GEN prices, transaction history, private key / mnemonic export
- Settings: email alerts toggle, default webhook, signal source API keys
- Admin Panel (admin-only):
  - Overview stats: users, protocols, judgments, alerts, signals, notifications
  - System Health: uptime, memory (RSS), all 3 worker statuses (run count, error count, last run time)
  - Users tab: email, role, status, subscription, protocol/judgment counts, suspend + demote buttons
  - Protocols tab: all protocols across all users
  - Judgments tab: latest 100 judgments with user attribution
  - CSV export: users, protocols, judgments

**Landing Page**
- Live stats from `/api/v1/stats` (no auth), refresh every 10s
- 5-tier threat framework, marketing sections, correct validator / timing info

---

### 🔲 Potential Next Steps

- WebSocket / SSE for real-time judgment push (currently polling every 10s)
- Multi-validator breakdown — show each of the 5 validators' individual scores in judgment detail
- Telegram / PagerDuty / Opsgenie alert channels
- Alert deduplication (cooldown window between repeat alerts)
- Usage metering per API key
- Mainnet contract deployment (currently StudioNet testnet)
- Structured logging to external sink (Datadog, Logtail)
- Automated database backups
- Staging environment
