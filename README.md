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
                       │  /api/* rewrites (same-origin cookies)
┌──────────────────────▼──────────────────────────────────────┐
│                   Fastify API                               │
│           fortichain-api.fly.dev  (Fly.io, 2 machines)      │
│                                                             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  Auth/JWT   │  │  Protocol     │  │  Admin Routes    │  │
│  │  Routes     │  │  + Judgment   │  │  (role=admin)    │  │
│  └─────────────┘  │  Routes       │  └──────────────────┘  │
│                   └───────────────┘                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Background Workers                     │    │
│  │  • Signal Ingestion (Etherscan, 60s)                │    │
│  │  • Analysis Scheduler (auto-analyze, configurable)  │    │
│  │  • GEN Balance Sync (on-chain balance cache)        │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
┌──────────────▼───────┐   ┌──────────▼──────────────────────┐
│  PostgreSQL (Fly.io) │   │  GenLayer StudioNet             │
│  • users             │   │  Contract: 0xAbf8a0A0...1Fec07   │
│  • protocols         │   │  5 AI Validators · GEN token     │
│  • ai_judgments      │   │  register_protocol()             │
│  • alerts_sent       │   │  analyze_protocol()              │
│  • signal_ingestions │   │  get_latest_judgment()           │
│  • api_keys          │   └─────────────────────────────────┘
│  • gen_transactions  │
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
| Database | PostgreSQL (Fly.io managed) |
| Cache | Upstash Redis (TLS `rediss://`) |
| AI Consensus | GenLayer Intelligent Contract (`genlayer-js` SDK) |
| Email | Brevo transactional email (`@getbrevo/brevo`) |
| Wallet | ethers.js — HD wallet generation per user, AES-256-GCM encrypted at rest |
| Auth | JWT (15 min access) + Refresh token (7 days), HttpOnly cookies |
| Frontend hosting | Vercel (GitHub auto-deploy) |
| API hosting | Fly.io (2 shared machines, IAD region) |

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
│   │   │   │   ├── migrate.ts      # Auto-migration runner (tracks _migrations table)
│   │   │   │   └── migrations/
│   │   │   │       ├── 0000_initial.sql
│   │   │   │       ├── 0001_on_chain_registered.sql
│   │   │   │       ├── 0002_server_encrypted_key.sql
│   │   │   │       └── 0003_user_role.sql
│   │   │   ├── middleware/
│   │   │   │   ├── authenticate.ts # JWT + API key auth, populates req.user
│   │   │   │   └── requireAdmin.ts # role=admin guard
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # register, login, refresh, forgot/reset password
│   │   │   │   ├── protocols.ts    # CRUD + analyze + judgments + /registered
│   │   │   │   ├── judgments.ts    # Global judgment history
│   │   │   │   ├── alerts.ts       # Alert history
│   │   │   │   ├── apiKeys.ts      # API key create/revoke
│   │   │   │   ├── wallet.ts       # GEN balance, export private key/mnemonic
│   │   │   │   ├── intelligence.ts # Signal ingestion feed
│   │   │   │   ├── settings.ts     # Profile, notification preferences
│   │   │   │   ├── publicStats.ts  # Unauthenticated — used by landing page
│   │   │   │   └── admin.ts        # Admin-only platform oversight
│   │   │   ├── services/
│   │   │   │   ├── genlayer/
│   │   │   │   │   └── genLayerService.ts  # GenLayer contract calls
│   │   │   │   ├── alerts/
│   │   │   │   │   └── alertService.ts     # Email + webhook dispatch
│   │   │   │   ├── wallet/
│   │   │   │   │   ├── walletService.ts    # HD wallet generation/export
│   │   │   │   │   └── encryption.ts       # AES-256-GCM encrypt/decrypt
│   │   │   │   └── signals/                # Signal enrichment
│   │   │   ├── workers/
│   │   │   │   ├── index.ts                # Starts all workers
│   │   │   │   ├── signalIngestion.ts      # Etherscan polling (60s)
│   │   │   │   ├── analysis.ts             # Scheduled auto-analysis
│   │   │   │   └── genBalanceSync.ts       # GEN balance cache refresh
│   │   │   └── index.ts                    # Fastify app entry point
│   │   ├── entrypoint.sh           # Runs migrations then starts API
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
│       │   │       └── reset-password/
│       │   └── dashboard/
│       │       ├── page.tsx            # Overview
│       │       ├── protocols/          # Protocol list + detail ([id])
│       │       ├── alerts/
│       │       ├── intelligence/       # Signal feed
│       │       ├── api-keys/
│       │       ├── wallet/
│       │       ├── settings/
│       │       └── admin/              # Admin panel (role=admin only)
│       ├── components/
│       │   ├── layout/
│       │   │   ├── DashboardShell.tsx  # Sidebar + topbar
│       │   │   ├── MarketingNav.tsx
│       │   │   └── Footer.tsx
│       │   └── marketing/
│       │       ├── HeroSection.tsx     # Live stats from /api/v1/stats
│       │       ├── FeaturesSection.tsx
│       │       ├── HowItWorksSection.tsx
│       │       ├── ThreatLevelsSection.tsx
│       │       ├── PricingSection.tsx
│       │       └── CtaSection.tsx
│       ├── lib/
│       │   ├── api.ts          # Axios instance with interceptors
│       │   ├── store.ts        # Zustand auth store (persisted)
│       │   └── usePolling.ts   # Generic polling hook (10s everywhere)
│       └── tailwind.config.ts  # fc.* and fort.* design tokens
│
├── fly.toml                    # Fly.io deployment config
└── vercel.json                 # Vercel build config (legacy-peer-deps)
```

---

## How It Works

### 1. User Onboarding
- User registers with email + password
- API generates an HD wallet (`m/44'/60'/0'/0/0`) using ethers.js
- Private key is encrypted twice:
  - **User-encrypted**: AES-256-GCM with PBKDF2(password + `WALLET_ENCRYPTION_SECRET`)
  - **Server-encrypted**: AES-256-GCM with PBKDF2(`WALLET_ENCRYPTION_SECRET`, userId) — stored as `server_encrypted_key`, allowing the API to sign transactions without the user's password
- Existing users without `server_encrypted_key` are lazily migrated on their next login

### 2. Protocol Registration
- User adds a protocol (name, chain, category, optional contract address)
- API immediately submits `register_protocol()` to the GenLayer contract using the **user's own wallet** (not a shared deployer key)
- Result cached in `on_chain_registered` DB flag to avoid redundant contract reads
- If the contract returns "already registered", it's handled gracefully and the DB flag is set

### 3. AI Analysis Flow
```
POST /protocols/:id/analyze
  → Gather signals (Etherscan txs, Forta alerts, social, news, TVL)
  → ensureProtocolRegistered() — fast path via DB flag, fallback reads stateStatus:'finalized'
  → writeContract('analyze_protocol', signalsJson)  [signed by user's wallet]
  → wait for ACCEPTED status (GenLayer consensus: ~1–3 min, 5 validators)
  → readContract('get_latest_judgment')
  → Save to ai_judgments table
  → If level >= 2: dispatch email + webhook alerts via Brevo
  → Return judgment to client
```

### 4. Risk Tiers
| Tier | DB Level | Label | Risk Score |
|------|----------|-------|-----------|
| 0 | 1 | Safe | 0–19 |
| 1 | 2 | Warning | 20–39 |
| 2 | 3 | Restricted | 40–59 |
| 3 | 4 | Emergency | 60–79 |
| 4 | 5 | Critical | 80–100 |

> The DB stores `level` (1–5). The frontend maps `tier = level - 1` for display. Alerts are dispatched for `level >= 2` (Warning and above).

### 5. Signal Ingestion
A background worker runs every 60 seconds and polls Etherscan for large transactions (>10 ETH) on each monitored protocol's contract address. Results are stored in `signal_ingestions` and included in the next analysis bundle.

---

## Database Schema

```
users
  id · email · password_hash · wallet_address · encrypted_private_key
  encrypted_mnemonic · wallet_salt · server_encrypted_key
  gen_balance_cache · subscription_tier · role · email_verified
  created_at · updated_at

protocols
  id · user_id → users · name · chain · contract_address · category
  website_url · monitoring_active · webhook_url · alert_email
  risk_score · on_chain_registered · last_analyzed_at · created_at · updated_at

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

_migrations
  filename · applied_at
```

---

## API Reference

All routes are prefixed `/api/v1`. Auth routes use HttpOnly cookie (`access_token`). Authenticated routes accept either the cookie or `X-API-Key` header.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account + generate wallet |
| POST | `/auth/login` | — | Returns JWT cookie + refresh token |
| POST | `/auth/refresh` | — | Rotate access token |
| POST | `/auth/logout` | — | Clear cookie |
| GET | `/auth/me` | ✓ | Current user profile |
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
| PUT | `/protocols/:id` | Update protocol |
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
| GET | `/wallet` | GEN balance + transactions |
| POST | `/wallet/export-key` | Decrypt + return private key |
| POST | `/wallet/export-mnemonic` | Decrypt + return mnemonic |
| GET/PATCH | `/settings` | Profile + notification settings |
| GET | `/intelligence` | Signal ingestion feed |

### Admin (role=admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Platform totals + breakdowns |
| GET | `/admin/users` | All users with protocol/judgment counts |
| PATCH | `/admin/users/:id/role` | Promote/demote user |
| GET | `/admin/protocols` | All protocols across all users |
| GET | `/admin/judgments` | Recent judgments across all users |

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Live counts for landing page (no auth) |
| GET | `/health` | Health check |

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
GENLAYER_PRIVATE_KEY=0x...   # Fallback deployer key (used if user has no server_encrypted_key)

# Email (Brevo)
BREVO_API_KEY=xkeysib-...
EMAIL_FROM=alerts@yourapp.com

# Optional signal sources
ETHERSCAN_API_KEY=
ALCHEMY_API_KEY=
FORTA_API_KEY=
COINGECKO_API_KEY=
TWITTER_BEARER_TOKEN=

# Infrastructure
REDIS_URL=rediss://...  # Upstash Redis (TLS required in prod)
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
cd apps/api
npx tsx src/db/migrate.ts

# 4. Start API (port 3001)
npx tsx src/index.ts

# 5. Start frontend (port 3000) — in a new terminal
cd apps/web
npm run dev
```

The Next.js dev server proxies all `/api/*` requests to `http://localhost:3001` via `next.config.ts` rewrites.

---

## Deployment

### API — Fly.io
```bash
# Deploy (runs from repo root — Dockerfile at apps/api/Dockerfile)
flyctl deploy --app fortichain-api --remote-only

# Secrets
flyctl secrets set DATABASE_URL="..." JWT_SECRET="..." --app fortichain-api

# Logs
flyctl logs --app fortichain-api --no-tail

# SSH
flyctl ssh console --app fortichain-api
```

The `entrypoint.sh` automatically runs pending SQL migrations (tracked in `_migrations` table) on every deploy before starting the API.

### Frontend — Vercel
Connected to GitHub (`zoefunds/Forti-chain`, branch `main`). Every push to `main` triggers an automatic deploy. Root directory is set to `apps/web`.

```bash
# Manual deploy
cd apps/web && vercel --prod
```

---

## Feature Status

### ✅ Done

**Infrastructure**
- Monorepo (Next.js + Fastify) with Vercel + Fly.io CI/CD
- PostgreSQL with auto-migration runner tracking applied files
- Upstash Redis for session/cache
- GitHub → Vercel auto-deploy on push to main

**Authentication & Wallets**
- Email/password registration with bcrypt
- JWT access token (15 min) + refresh token (7 days) in HttpOnly cookies
- Per-user HD wallet (ethers.js) generated on signup, AES-256-GCM encrypted
- Server-side wallet key (re-encrypted with server secret on login) — allows API to sign transactions on user's behalf without storing plaintext key
- Forgot password / reset password flow with Brevo email + 15-min token
- Role system: `user` | `admin`; admin set via migration

**GenLayer Integration**
- Intelligent Contract at `0xAbf8a0A08C73Faa30bA8717DDffb9328331Fec07` on StudioNet
- `register_protocol()` — called with user's own wallet on protocol creation
- `analyze_protocol()` — submits signal bundle, waits for 5-validator consensus (1–3 min)
- `get_latest_judgment()` — reads result after tx accepted
- Graceful "already registered" handling + `on_chain_registered` DB flag as fast path
- `stateStatus: 'finalized'` for authoritative on-chain reads

**Protocol Management**
- Full CRUD for protocols (name, chain, category, contract address, webhook, alert email)
- On-chain registration triggered automatically on creation
- Manual `POST /analyze` endpoint triggering full GenLayer judgment
- Judgment history per protocol (last 50)

**Signal Ingestion**
- Background worker polling Etherscan every 60s for large transactions (>10 ETH)
- Signal feed stored in `signal_ingestions`, bundled into next analyze call
- Signal intelligence page showing ingested signals with source/status

**Alerts**
- Brevo email alerts dispatched for judgments at Warning tier and above
- Webhook dispatch to user-configured URL
- Alert history table (channel, destination, level, delivered status)

**Dashboard**
- Overview: stat cards, protocol risk list, recent judgments table
- Protocols: list view with risk bars, analyze button, judgment modal
- Protocol detail: stat cards, risk chart, judgment history table with clickable rows
- Alerts: full history table
- Intelligence: signal feed with source filter
- API Keys: create/revoke with prefix display
- Wallet: GEN balance, subscription plan cards, transaction history, private key export
- Settings: profile, notifications, webhook, signal sources

**Admin Panel** (`/dashboard/admin` — admin-only)
- Platform stats overview (users, protocols, judgments, alerts, signals)
- Judgment breakdown by tier + users by subscription tier (bar charts)
- All-users table with per-user protocol/judgment counts + promote/demote
- All-protocols table across every user
- All-judgments table (latest 100) with user attribution

**Landing Page**
- Live stats from `/api/v1/stats` (no auth required), refresh every 10s
- Correct validator count (5), consensus timing (1–3 min)
- 5-tier threat response framework (Safe → Critical)
- Marketing sections: Hero, Features, How It Works, Threat Levels, Pricing, CTA

**Polling**
- All dashboard pages auto-refresh every 10s via `usePolling` hook
- GEN balance in topbar refreshes every 10s
- Landing page live stats refresh every 10s

---

### 🔲 Remaining / Potential Next Steps

**GenLayer & Analysis**
- [ ] Auto-analysis scheduler — automatically re-analyze monitored protocols on a configurable interval (worker exists but needs wiring to UI setting)
- [ ] Multi-validator breakdown display — show each of the 5 validators' individual scores and reasoning in the judgment detail modal
- [ ] WebSocket / SSE for real-time judgment push (currently polling)
- [ ] Mainnet contract deployment (currently on StudioNet testnet)

**Signal Intelligence**
- [ ] Forta alerts integration (API key configured, ingestion not implemented)
- [ ] DeFiLlama TVL change signals
- [ ] Twitter/X social signals (bearer token configured, not yet ingested)
- [ ] News feed signals
- [ ] CoinGecko price anomaly signals

**Alerts & Notifications**
- [ ] In-app notification bell with unread count
- [ ] Telegram bot alert channel
- [ ] PagerDuty / Opsgenie integration
- [ ] Alert deduplication (avoid repeat alerts within a cooldown window)

**User & Billing**
- [ ] Email verification flow (column exists, flow not implemented)
- [ ] Subscription payment (Stripe) for Pro/Enterprise tiers
- [ ] GEN token top-up flow (on-chain payment for analysis credits)
- [ ] Usage metering per API key

**Admin Panel**
- [ ] Ban/suspend user
- [ ] View individual user's full protocol + judgment history
- [ ] Export CSV of users, protocols, or judgments
- [ ] System health dashboard (API latency, worker status, error rates)

**Infrastructure**
- [ ] Rate limiting per user (currently global 200 req/min)
- [ ] Structured logging to external sink (Datadog, Logtail)
- [ ] Automated database backups
- [ ] Staging environment
