# FortiChain

**AI-Native Security Judgment Layer for DeFi Protocols**

FortiChain monitors DeFi protocols in real-time using on-chain data, contract risk scans, TVL feeds, price anomalies, news articles, and Reddit community signals. Every signal bundle is submitted to a **GenLayer Intelligent Contract** running 5 independent AI validators, which reach consensus on a risk tier and commit a tamper-proof judgment on-chain. Protocol teams receive instant email and webhook alerts the moment a risk threshold is crossed, with full audit trails in the dashboard.

**Live Deployments**
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
11. [Potential Next Steps](#potential-next-steps)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                             │
│               Next.js 15 · Tailwind · Zustand (persisted)           │
│          forti-chain.vercel.app  (Vercel, auto-deploy on push)       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  Authorization: Bearer <JWT>
                            │  (or X-API-Key for programmatic access)
┌───────────────────────────▼─────────────────────────────────────────┐
│                        Fastify REST API                             │
│            fortichain-api.fly.dev  (Fly.io IAD, 1 GB RAM)           │
│            2 machines · min_machines_running=1 (always warm)        │
│                                                                     │
│  ┌──────────────┐  ┌────────────────────┐  ┌──────────────────────┐ │
│  │  Auth Routes │  │  Protocol Routes   │  │  Admin Routes        │ │
│  │  JWT + email │  │  CRUD + analyze    │  │  role=admin guard    │ │
│  └──────────────┘  └────────────────────┘  └──────────────────────┘ │
│  ┌──────────────┐  ┌────────────────────┐  ┌──────────────────────┐ │
│  │  Wallet      │  │  Intelligence      │  │  Notifications       │ │
│  │  GEN token   │  │  Signal feed       │  │  In-app + email      │ │
│  └──────────────┘  └────────────────────┘  └──────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Background Workers                        │    │
│  │  • Signal Ingestion — 6 sources, runs every 60 seconds      │    │
│  │    Etherscan · GoPlus Security · DeFiLlama · CoinGecko      │    │
│  │    RSS / CoinTelegraph News · Reddit (r/defi+ethereum+...)  │    │
│  │  • Analysis Scheduler — checks auto-analyze intervals       │    │
│  │    every 5 min, fires on startup                            │    │
│  │  • GEN Balance Sync — on-chain balance cache, 10 min        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────┬───────────────────────────┬──────────────────────────┘
               │                           │
┌──────────────▼──────────┐   ┌────────────▼────────────────────────┐
│  PostgreSQL (Neon)      │   │  GenLayer StudioNet                 │
│  node-postgres Pool     │   │  Contract: 0xAbf8a0A0...1Fec07      │
│  max=5 · idle=10 min    │   │  5 AI Validators · GEN token        │
│                         │   │  register_protocol()                │
│  Tables:                │   │  analyze_protocol()                 │
│  • users                │   │  get_latest_judgment()              │
│  • protocols            │   └─────────────────────────────────────┘
│  • ai_judgments         │
│  • alerts_sent          │   ┌─────────────────────────────────────┐
│  • signal_ingestions    │   │  External APIs (free, no key)       │
│  • api_keys             │   │  • GoPlus Security — contract scan  │
│  • gen_transactions     │   │  • DeFiLlama — TVL data             │
│  • notifications        │   │  • Reddit — community sentiment     │
│  • _migrations          │   │  • rss2json — CoinTelegraph news    │
└─────────────────────────┘   │                                     │
                              │  External APIs (key required)       │
                              │  • Etherscan — on-chain tx data     │
                              │  • CoinGecko — price anomalies      │
                              │  • Alchemy — RPC fallback           │
                              └─────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router), TypeScript | Deployed on Vercel |
| Styling | Tailwind CSS, Framer Motion | Custom design system |
| State | Zustand with `persist` middleware | Cached in `localStorage` |
| API | Fastify 5, TypeScript, `tsx` runtime | Deployed on Fly.io |
| ORM | Drizzle ORM | `drizzle-orm/node-postgres` adapter |
| Database | PostgreSQL via Neon (serverless) | Connection pool: max=5, idleTimeout=10min |
| Rate Limiting | Upstash Redis (`rediss://` TLS) | Per-user key when authenticated, per-IP when not |
| AI Consensus | GenLayer Intelligent Contract | `genlayer-js` SDK, StudioNet testnet |
| Email | Brevo (`@getbrevo/brevo` BrevoClient) | Verified sender: preciousmofeoluwa@gmail.com |
| Wallet | ethers.js HD wallet (BIP-44 `m/44'/60'/0'/0/0`) | AES-256-GCM encrypted at rest (user + server copies) |
| Auth | JWT access token (7d) + refresh token (30d) | Stored in `localStorage`, auto-rotated on 401 |
| Frontend hosting | Vercel | Auto-deploy on push to `main` |
| API hosting | Fly.io | 2 machines, 1 GB RAM, IAD region, always-on |

---

## Repository Structure

```
FortiChain/
├── apps/
│   ├── api/                              # Fastify REST API
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── env.ts               # Required/optional env var validation with clear errors
│   │   │   ├── db/
│   │   │   │   ├── index.ts             # node-postgres Pool + Drizzle ORM instance
│   │   │   │   ├── schema.ts            # Full DB schema — all 8 tables with typed columns
│   │   │   │   ├── migrate.ts           # Custom migration runner (tracks _migrations table)
│   │   │   │   ├── seed.ts              # Dev seeding script
│   │   │   │   └── migrations/
│   │   │   │       ├── 0000_initial.sql           # All core tables
│   │   │   │       ├── 0001_on_chain_registered.sql
│   │   │   │       ├── 0002_server_encrypted_key.sql
│   │   │   │       ├── 0003_user_role.sql         # role column, suspended flag
│   │   │   │       ├── 0004_features.sql          # notifications, email verify, auto-analyze
│   │   │   │       └── 0005_email_alerts.sql      # email_alerts_enabled user preference
│   │   │   ├── middleware/
│   │   │   │   ├── authenticate.ts      # Bearer JWT + X-API-Key auth; populates req.user
│   │   │   │   └── requireAdmin.ts      # Checks req.user.role === 'admin'
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts              # register · login · refresh · logout · me
│   │   │   │   │                        # verify-email · resend-verification (no auth needed)
│   │   │   │   │                        # forgot-password · reset-password
│   │   │   │   ├── protocols.ts         # CRUD · /analyze · /judgments · /chain-risk
│   │   │   │   │                        # PUT accepts autoAnalyzeIntervalHours (0–168h)
│   │   │   │   ├── judgments.ts         # Global judgment history across all protocols
│   │   │   │   ├── alerts.ts            # Alert delivery history
│   │   │   │   ├── apiKeys.ts           # Create, list, revoke API keys
│   │   │   │   ├── wallet.ts            # GEN balance · subscribe · export key/mnemonic
│   │   │   │   ├── intelligence.ts      # Signal ingestion feed + global risk score
│   │   │   │   ├── notifications.ts     # List · mark-read · mark-all-read · delete
│   │   │   │   ├── settings.ts          # Notification pref · webhook · signal API keys
│   │   │   │   ├── publicStats.ts       # /stats — unauthenticated, used by landing page
│   │   │   │   └── admin.ts             # Platform stats · users · suspend · protocols
│   │   │   │                            # judgments · worker health · CSV export
│   │   │   ├── services/
│   │   │   │   ├── genlayer/
│   │   │   │   │   └── genLayerService.ts   # register_protocol, analyze_protocol,
│   │   │   │   │                             # get_latest_judgment, accountForUser
│   │   │   │   ├── alerts/
│   │   │   │   │   └── alertService.ts      # Brevo email + webhook dispatch
│   │   │   │   │                             # Respects user's emailAlertsEnabled flag
│   │   │   │   └── wallet/
│   │   │   │       ├── walletService.ts     # HD wallet generation, key/mnemonic export
│   │   │   │       └── encryption.ts        # AES-256-GCM + PBKDF2 (user + server paths)
│   │   │   ├── workers/
│   │   │   │   ├── signalIngestion.ts   # 6-source poller (60s): Etherscan, GoPlus,
│   │   │   │   │                        # DeFiLlama, CoinGecko, News (RSS), Reddit
│   │   │   │   ├── analysis.ts          # Scheduled auto-analysis (5 min); fires on startup
│   │   │   │   └── genBalanceSync.ts    # On-chain GEN balance cache refresh (10 min)
│   │   │   └── index.ts                 # App entry: registers routes, starts workers
│   │   │                                # Per-user rate limiting (keyGenerator on user.id)
│   │   ├── entrypoint.sh            # exec "$@" if args (release_command); else start API
│   │   ├── fly.toml                 # release_command migrations, 180s grace, 1 GB RAM
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                              # Next.js 15 frontend
│       ├── app/
│       │   ├── (marketing)/
│       │   │   └── page.tsx             # Landing page — live stats, features, pricing
│       │   ├── (auth)/auth/
│       │   │   ├── login/page.tsx
│       │   │   ├── signup/page.tsx
│       │   │   ├── forgot-password/page.tsx
│       │   │   ├── reset-password/page.tsx
│       │   │   └── verify-email/page.tsx   # Suspense-wrapped token consumption
│       │   └── dashboard/
│       │       ├── page.tsx             # Overview: stat cards, risk list, recent judgments
│       │       ├── protocols/
│       │       │   ├── page.tsx         # Protocol grid with risk bars + analyze button
│       │       │   └── [id]/page.tsx    # Detail: stats, risk chart, judgment history,
│       │       │                        # auto-analyze interval selector (Saved! feedback)
│       │       ├── alerts/page.tsx      # Alert history with delivery status
│       │       ├── intelligence/page.tsx# Signal feed + global risk summary
│       │       ├── api-keys/page.tsx    # Create/revoke API keys with prefix display
│       │       ├── wallet/page.tsx      # GEN balance, plans (50/200 GEN), tx history, export
│       │       ├── settings/page.tsx    # Email alerts toggle, webhook, signal API keys
│       │       └── admin/page.tsx       # Admin panel (role=admin only)
│       ├── components/
│       │   ├── layout/
│       │   │   ├── DashboardShell.tsx   # Sidebar, topbar, NotificationBell (60s poll),
│       │   │   │                        # EmailVerificationBanner (resend works without token)
│       │   │   ├── MarketingNav.tsx
│       │   │   └── Footer.tsx
│       │   ├── monitoring/
│       │   │   └── AddProtocolModal.tsx
│       │   └── marketing/               # HeroSection, FeaturesSection, HowItWorksSection,
│       │                                # ThreatLevelsSection, PricingSection, CtaSection
│       ├── lib/
│       │   ├── api.ts           # Axios instance — Bearer token from localStorage;
│       │   │                    # 401 interceptor: try refresh → retry → redirect to login
│       │   ├── store.ts         # Zustand auth store, persisted to localStorage
│       │   └── usePolling.ts    # Generic polling hook (configurable interval)
│       └── tailwind.config.ts
│
└── vercel.json                   # Vercel build config (legacy-peer-deps)
```

---

## How It Works

### 1. User Onboarding

- User registers with email + password (bcrypt, 10 rounds)
- API generates an HD wallet (`m/44'/60'/0'/0/0`) using ethers.js
- Private key is encrypted **twice** and stored separately:
  - **User-encrypted**: AES-256-GCM with PBKDF2(password + `WALLET_ENCRYPTION_SECRET`) — only decryptable with the user's password
  - **Server-encrypted**: AES-256-GCM with PBKDF2(`WALLET_ENCRYPTION_SECRET`, userId) — allows the API to sign on-chain transactions without the user's password being present
- A verification email is dispatched via Brevo; an unverified user sees a yellow banner on every page
- JWT access token (7d) + refresh token (30d) returned in the response body, stored in `localStorage`

### 2. Protocol Registration

- User adds a protocol: name, chain, contract address (optional), category, webhook URL, alert email
- API submits `register_protocol()` to the GenLayer Intelligent Contract using the user's own server-encrypted wallet
- `onChainRegistered = true` is set in DB after confirmation — used as a fast path on future analyses to skip a contract read

### 3. AI Analysis Flow

```
POST /api/v1/protocols/:id/analyze
  │
  ├─ Gather signal bundle from 6 sources (already ingested or fetched live)
  │
  ├─ ensureProtocolRegistered()
  │    └─ If DB flag set → skip; else read stateStatus from contract
  │
  ├─ writeContract('analyze_protocol', signalsJson)
  │    └─ Signed with user's server-encrypted wallet via genlayer-js
  │
  ├─ Poll for ACCEPTED status (5 AI validators reach consensus, ~60–180s)
  │
  ├─ readContract('get_latest_judgment')
  │    └─ Returns risk_score, level (1–5), recommended_action, validator_explanations[]
  │
  ├─ INSERT into ai_judgments table
  │
  ├─ UPDATE protocols.risk_score + last_analyzed_at
  │
  ├─ Create in-app notification for the protocol owner
  │
  └─ If level >= 2 (Warning or above):
       └─ AlertService.dispatchAlerts()
            ├─ Brevo email → protocol.alertEmail (if set)
            ├─ Brevo email → protocol owner's account email
            │    └─ Only if user.email_alerts_enabled = true
            └─ Webhook POST → protocol.webhookUrl (if set)
```

### 4. Auto-Analysis Scheduler

Each protocol has a configurable `autoAnalyzeIntervalHours` (0 = disabled, up to 168h). The analysis worker runs on API startup and then every 5 minutes:

```
for each protocol where monitoringActive=true AND autoAnalyzeIntervalHours > 0:
  if now >= lastAnalyzedAt + intervalHours:
    genLayer.analyzeProtocol(protocol, user)
```

Users set their interval from the protocol detail page; the UI shows a "Saved!" confirmation after saving.

### 5. Risk Tiers

| Level | Label | Risk Score Range | Alert Triggered |
|-------|-------|-----------------|-----------------|
| 1 | Safe | 0–19 | No |
| 2 | Warning | 20–39 | Yes |
| 3 | Restricted Mode | 40–59 | Yes |
| 4 | Emergency Pause | 60–79 | Yes |
| 5 | Full Containment | 80–100 | Yes |

### 6. Signal Ingestion (6 Sources, 60-second Worker)

Every source runs inside its own try/catch — a failing source never blocks others. Results are stored in `signal_ingestions` and consumed by the analysis worker.

| Source | What it detects | API key required |
|--------|----------------|-----------------|
| **Etherscan** | Large ETH transfers (>10 ETH) on the contract address | Yes (`ETHERSCAN_API_KEY`) |
| **GoPlus Security** | Honeypot, upgradeable proxy, hidden owner, self-destruct, high buy/sell tax | No (free) |
| **DeFiLlama** | TVL changes ≥ 10% in 24h | No (free) |
| **CoinGecko** | Price anomalies ≥ 15% in 24h | No for demo key; optional `COINGECKO_API_KEY` |
| **RSS / CoinTelegraph** | Protocol name mentions in DeFi news | No (free) |
| **Reddit** | Posts mentioning the protocol in r/defi, r/ethereum, r/CryptoCurrency, r/ethfinance | No (free) |

GoPlus flags include: `HONEYPOT detected`, `contract blacklisted`, `upgradeable proxy`, `ownership reclaim risk`, `owner can change balances`, `hidden owner`, `self-destruct enabled`, `high buy/sell tax`.

### 7. GEN Token Subscription

- Plans: **Pro** = 50 GEN/month · **Enterprise** = 200 GEN/month
- On subscribe:
  1. API fetches live on-chain GEN balance via `eth_getBalance` on GenLayer RPC
  2. Verifies balance is sufficient
  3. Sends native GEN transfer from user's wallet → `TREASURY_WALLET` using `genlayer-js`
  4. On transaction accepted: sets `subscriptionTier`, caches new balance, records in `gen_transactions`

### 8. Email Notification Preferences

Users can toggle email alerts off in Settings → Notifications. The preference is stored as `email_alerts_enabled` (boolean, default `true`) in the `users` table. `AlertService` checks this flag before sending alert emails to the protocol owner. The settings page fetches the current value fresh from `/auth/me` on mount so the toggle always reflects the actual saved state.

### 9. Session Lifecycle

```
Registration/Login
  → API returns { user, token, refresh } in response body
  → Frontend stores: localStorage.access_token, localStorage.refresh_token
  → Zustand store persists user object to localStorage

Every request
  → api.ts interceptor reads access_token → Authorization: Bearer <token>

On 401 response
  → Interceptor reads refresh_token
  → POST /auth/refresh with refresh token
  → On success: new access_token stored, original request retried
  → On failure: tokens cleared, redirect to /auth/login

Logout
  → POST /auth/logout (clears cookie)
  → localStorage tokens removed
  → Redirect to /auth/login
```

---

## Database Schema

```sql
users
  id uuid PK · email varchar(255) UNIQUE · password_hash text
  wallet_address varchar(42) UNIQUE · encrypted_private_key text
  encrypted_mnemonic text · wallet_salt varchar(64)
  server_encrypted_key text          -- API can sign without user's password
  gen_balance_cache decimal(36,18)   -- cached on-chain GEN balance
  role varchar(20) DEFAULT 'user'    -- 'user' | 'admin'
  suspended boolean DEFAULT false
  subscription_tier varchar(20) DEFAULT 'free'   -- 'free' | 'pro' | 'enterprise'
  email_verified boolean DEFAULT false
  email_verify_token varchar(128)
  email_verify_expiry timestamp
  email_alerts_enabled boolean DEFAULT true      -- user preference for alert emails
  created_at · updated_at

protocols
  id uuid PK · user_id → users (CASCADE)
  name varchar(100) · chain varchar(50) · contract_address varchar(42)
  category enum(lending|dex|bridge|yield|derivatives|dao|other)
  website_url · monitoring_active boolean · webhook_url · alert_email
  risk_score integer · on_chain_registered boolean
  auto_analyze_interval_hours integer DEFAULT 0  -- 0 = disabled, max 168
  last_analyzed_at timestamp
  created_at · updated_at

ai_judgments
  id uuid PK · protocol_id → protocols · threat_event_id
  contract_call_tx text · risk_score integer · level integer (1–5)
  validator_explanations jsonb          -- array of per-validator reasoning strings
  recommended_action text · consensus_reached boolean
  gen_cost decimal · created_at

alerts_sent
  id uuid PK · judgment_id → ai_judgments · protocol_id → protocols
  channel varchar(20)                   -- 'email' | 'webhook'
  destination text · payload jsonb
  delivered boolean · retry_count integer
  sent_at · delivered_at

signal_ingestions
  id uuid PK · protocol_id → protocols
  source varchar(50)                    -- 'etherscan'|'goplus'|'tvl'|'coingecko'|'news'|'reddit'
  content jsonb · processed boolean
  ingested_at · processed_at

api_keys
  id uuid PK · user_id → users (CASCADE)
  key_hash varchar(128) UNIQUE · key_prefix varchar(12) · label varchar(100)
  permissions jsonb · rate_limit integer · last_used_at · revoked_at · created_at

gen_transactions
  id uuid PK · user_id → users
  tx_hash · amount decimal · purpose varchar(50)
  confirmed boolean · created_at

notifications
  id uuid PK · user_id → users (CASCADE)
  type varchar(50)                      -- 'judgment'|'alert'|'system'|'email_verified'
  title varchar(200) · body text · link varchar(500)
  read boolean DEFAULT false · metadata jsonb · created_at

_migrations
  filename text PK · applied_at timestamptz
```

---

## API Reference

All routes are prefixed `/api/v1`. Authenticated routes require `Authorization: Bearer <token>` header or `X-API-Key: <key>` header.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account, generate HD wallet, send verification email |
| POST | `/auth/login` | — | Returns `{ user, token, refresh }` in body |
| POST | `/auth/refresh` | — | Rotate access token using refresh token |
| POST | `/auth/logout` | — | Clear session cookie |
| GET | `/auth/me` | ✓ | Current user profile (includes `emailAlertsEnabled`) |
| GET | `/auth/verify-email?token=` | — | Consume email verification token |
| POST | `/auth/resend-verification` | — | Resend verification email; accepts `{ email }` in body (no token required) |
| POST | `/auth/forgot-password` | — | Send reset email via Brevo (always returns 200 to prevent enumeration) |
| POST | `/auth/reset-password` | — | Consume 15-min token, set new password |

### Protocols

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/protocols` | ✓ | List user's protocols |
| POST | `/protocols` | ✓ | Add protocol — triggers async on-chain `register_protocol()` |
| GET | `/protocols/registered` | ✓ | List with `onChainRegistered` status and `lastAnalyzedAt` |
| GET | `/protocols/contract-stats` | ✓ | Live GenLayer contract stats |
| GET | `/protocols/:id` | ✓ | Protocol detail |
| PUT | `/protocols/:id` | ✓ | Update protocol fields including `autoAnalyzeIntervalHours` |
| DELETE | `/protocols/:id` | ✓ | Remove protocol |
| POST | `/protocols/:id/analyze` | ✓ | Trigger AI judgment — waits for GenLayer consensus |
| GET | `/protocols/:id/judgments` | ✓ | Judgment history for this protocol |
| GET | `/protocols/:id/chain-risk` | ✓ | Latest judgment read directly from smart contract |

### Intelligence & Signals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/intelligence/feed` | ✓ | Latest 50 signal ingestion records |
| GET | `/intelligence/global-risk` | ✓ | Average risk score across user's monitored protocols |

### Alerts & Judgments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/judgments` | ✓ | Global judgment history across all user's protocols |
| GET | `/alerts` | ✓ | Alert delivery history with channel, destination, status |

### Wallet & Subscriptions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wallet` | ✓ | Wallet address + GEN balance + recent transactions |
| GET | `/wallet/plan-prices` | ✓ | GEN cost per subscription plan |
| POST | `/wallet/subscribe` | ✓ | On-chain GEN payment → subscription upgrade |
| POST | `/wallet/export-key` | ✓ | Decrypt + return raw private key (requires password) |
| POST | `/wallet/export-mnemonic` | ✓ | Decrypt + return mnemonic phrase (requires password) |
| GET | `/wallet/transactions` | ✓ | Transaction history |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | ✓ | Returns `{ unread, notifications[] }` — latest 50, newest first |
| PATCH | `/notifications/read-all` | ✓ | Mark all notifications as read |
| PATCH | `/notifications/:id/read` | ✓ | Mark single notification as read |
| DELETE | `/notifications/:id` | ✓ | Delete notification |

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/settings/notifications` | ✓ | Set `emailAlerts` (boolean) — persisted to `email_alerts_enabled` column |
| PATCH | `/settings/webhook` | ✓ | Set default webhook URL |
| PATCH | `/settings/signal-keys` | ✓ | Store Etherscan + CoinGecko API keys |

### API Keys

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api-keys` | ✓ | List active API keys |
| POST | `/api-keys` | ✓ | Create API key — returns full key once, then only prefix |
| DELETE | `/api-keys/:id` | ✓ | Revoke API key |

### Admin (role = admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Platform totals: users, protocols, judgments, signals, alerts, notifications |
| GET | `/admin/health` | API uptime, RSS memory, all 3 worker run counts + error counts + last run |
| GET | `/admin/users` | All users with subscription, role, suspend status, protocol/judgment counts |
| PATCH | `/admin/users/:id/role` | Promote to admin or demote to user |
| PATCH | `/admin/users/:id/suspend` | Suspend or unsuspend user |
| GET | `/admin/protocols` | All protocols across all users |
| GET | `/admin/judgments` | Latest 100 judgments across all users |
| GET | `/admin/export/users.csv` | CSV export of all users |
| GET | `/admin/export/protocols.csv` | CSV export of all protocols |
| GET | `/admin/export/judgments.csv` | CSV export of all judgments |

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Live platform counts — used by landing page |
| GET | `/health` | API liveness check — `{ status: "ok", ts }` |

---

## Environment Variables

### API (`apps/api/.env`)

```env
# ── Required ────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=<64-char random hex>
JWT_REFRESH_SECRET=<64-char random hex>
WALLET_ENCRYPTION_SECRET=<64-char random hex>

# ── GenLayer ────────────────────────────────────────────────────────
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_CONTRACT_ADDRESS=0xAbf8a0A08C73Faa30bA8717DDffb9328331Fec07
GENLAYER_PRIVATE_KEY=0x...            # Fallback/operator wallet private key
TREASURY_WALLET=0x...                 # Receives GEN subscription payments

# ── Email (Brevo) ───────────────────────────────────────────────────
BREVO_API_KEY=xkeysib-...
EMAIL_FROM=your-verified@email.com    # Must be a verified sender in Brevo

# ── Signal Sources (all optional — sources degrade gracefully) ──────
ETHERSCAN_API_KEY=                    # On-chain tx monitoring
ALCHEMY_API_KEY=                      # RPC fallback
COINGECKO_API_KEY=                    # Higher rate limits (demo key works free)
# GoPlus Security and Reddit are free with no key required

# ── Infrastructure ──────────────────────────────────────────────────
REDIS_URL=rediss://...                # Upstash Redis (TLS required in production)
CORS_ORIGIN=https://forti-chain.vercel.app
NODE_ENV=production
PORT=3001
BCRYPT_ROUNDS=10                      # 10 rounds balances security + login speed
```

### Frontend (`apps/web/.env.local`)

```env
# Only needed in local development — Vercel rewrites handle prod routing
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Local Development

### Prerequisites

- Node.js 22+
- PostgreSQL 15+ (or a Neon free-tier account)
- Redis (or an Upstash free-tier account)

### Setup

```bash
# 1. Clone and install all workspace dependencies
git clone https://github.com/zoefunds/Forti-chain.git
cd FortiChain
npm install

# 2. Configure the API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your DATABASE_URL, JWT_SECRET, etc.

# 3. Run database migrations
cd apps/api
npx tsx src/db/migrate.ts

# 4. Start the API (port 3001)
npx tsx src/index.ts

# 5. Start the frontend (port 3000) — in a new terminal
cd apps/web
npm run dev
```

The Next.js dev server proxies all `/api/*` requests to `http://localhost:3001` via rewrites in `next.config.ts` — no CORS or port changes needed.

### Useful Development Commands

```bash
# Run migrations
cd apps/api && npx tsx src/db/migrate.ts

# Seed demo data
cd apps/api && npx tsx src/db/seed.ts

# TypeScript check (API)
cd apps/api && npx tsc --noEmit

# TypeScript check (frontend)
cd apps/web && npx tsc --noEmit
```

---

## Deployment

### API — Fly.io

```bash
# Deploy from repo root (Dockerfile is at apps/api/Dockerfile)
fly deploy --dockerfile apps/api/Dockerfile --config apps/api/fly.toml --app fortichain-api

# Set secrets (one-time)
fly secrets set \
  DATABASE_URL="postgresql://..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  WALLET_ENCRYPTION_SECRET="$(openssl rand -hex 32)" \
  BREVO_API_KEY="xkeysib-..." \
  GENLAYER_PRIVATE_KEY="0x..." \
  TREASURY_WALLET="0x..." \
  REDIS_URL="rediss://..." \
  CORS_ORIGIN="https://your-app.vercel.app" \
  ETHERSCAN_API_KEY="..." \
  COINGECKO_API_KEY="..." \
  ALCHEMY_API_KEY="..." \
  --app fortichain-api

# View live logs
fly logs --app fortichain-api

# SSH into machine
fly ssh console --app fortichain-api

# Scale memory (if needed)
fly scale memory 1024 --app fortichain-api
```

#### How the Fly.io deploy works

1. **`release_command`** runs `tsx src/db/migrate.ts` before any new machine starts — migrations complete before traffic shifts
2. The new machine starts and binds to port 3001 in ~8 seconds
3. **`grace_period = "180s"`** gives the health check plenty of time before traffic is cut over
4. **`min_machines_running = 1`** keeps at least one machine always running — no cold starts

#### Fly.io key config (`fly.toml`)

```toml
[deploy]
  release_command = "/bin/sh -c 'cd /app && node_modules/.bin/tsx src/db/migrate.ts'"

[http_service]
  internal_port = 3001
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    grace_period = "180s"
    interval = "30s"
    path = "/health"
    timeout = "10s"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024
```

### Frontend — Vercel

The repository is connected to Vercel. Every push to `main` triggers an automatic deploy. Root directory is `apps/web`.

```bash
# Manual deploy
cd apps/web && vercel --prod
```

No environment variables are needed in Vercel for production — the Next.js app uses the same origin for API calls (Vercel proxy rewrites in `next.config.ts`).

---

## Feature Status

### ✅ Shipped

**Infrastructure**
- Monorepo (Next.js + Fastify) with Vercel + Fly.io CI/CD
- PostgreSQL with custom auto-migration runner tracking applied migrations in `_migrations` table
- DB migrations run atomically via Fly `release_command` — machines start after migrations complete
- Upstash Redis for rate limiting (per-user key when authenticated, per-IP otherwise)
- GitHub → Vercel auto-deploy on push to `main`
- `min_machines_running = 1` — API is always warm, no cold starts

**Authentication & Wallets**
- Email/password registration with bcrypt (10 rounds — fast without compromising security)
- JWT access token (7 days) + refresh token (30 days) stored in `localStorage`
- Auto-refresh on 401 — silent token rotation without re-login prompt
- Session persists across page reloads via Zustand `persist` middleware
- Per-user HD wallet (BIP-44) generated on signup, AES-256-GCM encrypted (user + server copies)
- Server-side key re-encryption allows API to sign on-chain without plaintext user password
- Email verification flow via Brevo — persistent banner until verified; resend works without a valid session
- Forgot password / reset password (15-minute token, in-memory)
- Role system: `user` | `admin`
- Admin can promote/demote and suspend/unsuspend users

**GenLayer Integration**
- Intelligent Contract at `0xAbf8a0A08C73Faa30bA8717DDffb9328331Fec07` (StudioNet)
- `register_protocol()` — called with user's own wallet on protocol creation
- `analyze_protocol()` — submits signal JSON, waits for 5-validator AI consensus (~60–180s)
- `get_latest_judgment()` — reads result after transaction accepted
- Fast path via `onChainRegistered` DB flag — avoids redundant contract reads

**Signal Ingestion (6 Sources, 60-second Worker)**
- **Etherscan** — large on-chain transfers (>10 ETH) on the protocol's contract address
- **GoPlus Security** — free contract risk scan: honeypot, hidden owner, proxy, self-destruct, high tax
- **DeFiLlama** — TVL changes ≥ 10% vs. previous 24h
- **CoinGecko** — price anomalies ≥ 15% over 24h
- **RSS / CoinTelegraph** — DeFi security news mentioning the protocol
- **Reddit** — posts in r/defi + r/ethereum + r/CryptoCurrency + r/ethfinance (free, no key)
- All sources wrapped in individual try/catch — failing sources never block others
- Worker health (run count, error count, last run time) exposed via `/admin/health`

**Auto-Analysis Scheduler**
- Per-protocol `autoAnalyzeIntervalHours` (0 = disabled, configurable up to 168h)
- Analysis worker fires on API startup then every 5 minutes
- Protocol detail UI shows "Saved!" confirmation after setting the interval

**Protocol Management**
- Full CRUD: name, chain, category, contract address, webhook URL, alert email
- On-chain registration triggered automatically on creation (async, non-blocking)
- Manual analyze button with consensus spinner in protocol detail view
- Auto-analyze interval selector with visual save confirmation
- Judgment history per protocol with risk score timeline

**Alerts & Notifications**
- Brevo email alerts for Warning tier and above (level ≥ 2)
- Respects per-user `emailAlertsEnabled` preference — users can opt out in Settings
- Webhook dispatch with `X-FortiChain-Event` header and structured payload
- Alert delivery history with per-record `delivered` status
- In-app notification bell: 60-second polling, unread badge, dropdown, mark-all-read, per-item delete
- Notification types: `judgment`, `alert`, `system`, `email_verified`

**GEN Token Subscription**
- Plans: Pro = 50 GEN/month · Enterprise = 200 GEN/month
- Live on-chain balance check before payment
- On-chain GEN transfer to treasury wallet via `genlayer-js`
- Transaction recorded in `gen_transactions`; cached `genBalanceCache` updated

**Dashboard Pages**
- **Overview** — stat cards, protocol risk list, recent judgments, live signal counts
- **Protocols** — grid view, risk score bars, SAFE/WARNING/RESTRICTED badges, analyze button
- **Protocol Detail** — stat cards, risk chart, judgment history, auto-analyze interval selector
- **Alerts** — full alert history with channel and delivery status
- **Intelligence** — signal ingestion feed (60 signals+), global risk summary
- **API Keys** — create with label, display prefix, revoke
- **Wallet** — GEN balance, subscription plans with GEN prices, transaction history, private key/mnemonic export
- **Settings** — email alerts toggle (persisted, loaded fresh on mount), webhook URL, signal API keys
- **Admin Panel** (admin only):
  - Overview: users, protocols, AI judgments, signals ingested, alerts sent, notifications
  - System Health: uptime, RSS memory, all 3 workers (runs/errors/last run)
  - Users: full table with suspension and role controls
  - Protocols: all protocols across all users
  - Judgments: latest 100 across all users
  - CSV export for users, protocols, judgments

**Landing Page**
- Live platform stats from `/api/v1/stats` (no auth required), refreshed every 60 seconds
- 5-tier threat framework explanation, feature highlights, pricing, CTA

---

## Potential Next Steps

- **WebSocket / SSE** — real-time judgment push to replace 60-second polling
- **Multi-validator breakdown** — show each of the 5 validators' individual scores in judgment detail
- **Additional alert channels** — Telegram bot, PagerDuty, Opsgenie, Slack webhook
- **Alert deduplication** — cooldown window to prevent repeated alerts for the same condition
- **Usage metering per API key** — track and limit calls per key
- **Mainnet deployment** — move GenLayer contract from StudioNet testnet to mainnet
- **Structured logging** — ship logs to Datadog, Logtail, or Axiom for searchable history
- **Automated DB backups** — scheduled pg_dump to S3 or Neon built-in snapshots
- **Staging environment** — separate Fly app and Vercel preview for safe pre-production testing
- **Multi-chain contract support** — currently monitors any EVM chain but contract calls use StudioNet GEN
