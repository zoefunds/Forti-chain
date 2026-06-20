import {
  pgTable, uuid, varchar, text, boolean, integer,
  timestamp, jsonb, decimal, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Users ─────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  email:                varchar('email', { length: 255 }).notNull(),
  passwordHash:         text('password_hash').notNull(),
  walletAddress:        varchar('wallet_address', { length: 42 }).notNull(),
  encryptedPrivateKey:  text('encrypted_private_key').notNull(),
  encryptedMnemonic:    text('encrypted_mnemonic').notNull(),
  walletSalt:           varchar('wallet_salt', { length: 64 }).notNull(),
  serverEncryptedKey:   text('server_encrypted_key'),
  genBalanceCache:      decimal('gen_balance_cache', { precision: 36, scale: 18 }).default('0'),
  subscriptionTier:     varchar('subscription_tier', { length: 20 }).default('free'),
  emailVerified:        boolean('email_verified').default(false),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  walletIdx: uniqueIndex('users_wallet_idx').on(t.walletAddress),
}));

// ── API Keys ──────────────────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyHash:     varchar('key_hash', { length: 128 }).notNull(),
  keyPrefix:   varchar('key_prefix', { length: 12 }).notNull(),
  label:       varchar('label', { length: 100 }).notNull(),
  permissions: jsonb('permissions').$type<string[]>().default([]),
  rateLimit:   integer('rate_limit').default(1000),
  lastUsedAt:  timestamp('last_used_at'),
  revokedAt:   timestamp('revoked_at'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  keyHashIdx: uniqueIndex('api_keys_hash_idx').on(t.keyHash),
  userIdx:    index('api_keys_user_idx').on(t.userId),
}));

// ── Protocols ─────────────────────────────────────────────────────
export const protocols = pgTable('protocols', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:            varchar('name', { length: 100 }).notNull(),
  chain:           varchar('chain', { length: 50 }).notNull(),
  contractAddress: varchar('contract_address', { length: 42 }),
  category:        varchar('category', { length: 50 }).notNull(),
  websiteUrl:      varchar('website_url', { length: 255 }),
  monitoringActive: boolean('monitoring_active').default(true),
  webhookUrl:      varchar('webhook_url', { length: 500 }),
  alertEmail:      varchar('alert_email', { length: 255 }),
  riskScore:          integer('risk_score').default(0),
  onChainRegistered:  boolean('on_chain_registered').default(false),
  lastAnalyzedAt:     timestamp('last_analyzed_at'),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  userIdx: index('protocols_user_idx').on(t.userId),
}));

// ── Threat Events ─────────────────────────────────────────────────
export const threatEvents = pgTable('threat_events', {
  id:          uuid('id').primaryKey().defaultRandom(),
  protocolId:  uuid('protocol_id').references(() => protocols.id, { onDelete: 'set null' }),
  userId:      uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  signalType:  varchar('signal_type', { length: 50 }).notNull(),
  source:      varchar('source', { length: 50 }).notNull(),
  rawPayload:  jsonb('raw_payload').notNull(),
  severity:    integer('severity').notNull(),
  status:      varchar('status', { length: 20 }).default('pending'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  resolvedAt:  timestamp('resolved_at'),
}, (t) => ({
  protocolIdx: index('threat_events_protocol_idx').on(t.protocolId),
  statusIdx:   index('threat_events_status_idx').on(t.status),
  createdIdx:  index('threat_events_created_idx').on(t.createdAt),
}));

// ── AI Judgments ──────────────────────────────────────────────────
export const aiJudgments = pgTable('ai_judgments', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  threatEventId:         uuid('threat_event_id').references(() => threatEvents.id),
  protocolId:            uuid('protocol_id').references(() => protocols.id),
  contractCallTx:        varchar('contract_call_tx', { length: 100 }),
  riskScore:             integer('risk_score').notNull(),
  level:                 integer('level').notNull(),
  validatorExplanations: jsonb('validator_explanations').$type<ValidatorExplanation[]>(),
  recommendedAction:     text('recommended_action'),
  consensusReached:      boolean('consensus_reached').default(false),
  genCost:               decimal('gen_cost', { precision: 36, scale: 18 }).default('0'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  threatIdx:   index('judgments_threat_idx').on(t.threatEventId),
  protocolIdx: index('judgments_protocol_idx').on(t.protocolId),
  levelIdx:    index('judgments_level_idx').on(t.level),
}));

// ── Alerts Sent ───────────────────────────────────────────────────
export const alertsSent = pgTable('alerts_sent', {
  id:           uuid('id').primaryKey().defaultRandom(),
  judgmentId:   uuid('judgment_id').references(() => aiJudgments.id),
  protocolId:   uuid('protocol_id').references(() => protocols.id),
  channel:      varchar('channel', { length: 20 }).notNull(),
  destination:  varchar('destination', { length: 500 }).notNull(),
  payload:      jsonb('payload'),
  delivered:    boolean('delivered').default(false),
  retryCount:   integer('retry_count').default(0),
  sentAt:       timestamp('sent_at').defaultNow().notNull(),
  deliveredAt:  timestamp('delivered_at'),
}, (t) => ({
  judgmentIdx: index('alerts_judgment_idx').on(t.judgmentId),
}));

// ── Signal Ingestions ─────────────────────────────────────────────
export const signalIngestions = pgTable('signal_ingestions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  protocolId:  uuid('protocol_id').references(() => protocols.id),
  source:      varchar('source', { length: 50 }).notNull(),
  content:     jsonb('content').notNull(),
  processed:   boolean('processed').default(false),
  ingestedAt:  timestamp('ingested_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
}, (t) => ({
  processedIdx: index('signals_processed_idx').on(t.processed),
  sourceIdx:    index('signals_source_idx').on(t.source),
}));

// ── GEN Transactions ──────────────────────────────────────────────
export const genTransactions = pgTable('gen_transactions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  txHash:    varchar('tx_hash', { length: 100 }),
  amount:    decimal('amount', { precision: 36, scale: 18 }).notNull(),
  purpose:   varchar('purpose', { length: 100 }).notNull(),
  confirmed: boolean('confirmed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdx: index('gen_tx_user_idx').on(t.userId),
}));

// ── Types ──────────────────────────────────────────────────────────
export interface ValidatorExplanation {
  validatorId: string;
  riskScore: number;
  explanation: string;
  recommendedAction: string;
}

// ── Relations ──────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  apiKeys:         many(apiKeys),
  protocols:       many(protocols),
  genTransactions: many(genTransactions),
}));

export const protocolsRelations = relations(protocols, ({ one, many }) => ({
  user:            one(users, { fields: [protocols.userId], references: [users.id] }),
  threatEvents:    many(threatEvents),
  aiJudgments:     many(aiJudgments),
  alertsSent:      many(alertsSent),
  signalIngestions: many(signalIngestions),
}));

export const aiJudgmentsRelations = relations(aiJudgments, ({ one, many }) => ({
  threatEvent: one(threatEvents, { fields: [aiJudgments.threatEventId], references: [threatEvents.id] }),
  protocol:    one(protocols, { fields: [aiJudgments.protocolId], references: [protocols.id] }),
  alerts:      many(alertsSent),
}));
