import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { db } from '../../db/index.js';
import { aiJudgments, protocols, users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { AlertService } from '../alerts/alertService.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignalsBundle {
  onChainAnomalies:    string[];
  threatFeedAlerts:    string[];
  socialSignals:       string[];
  newsSignals:         string[];
  transactionPatterns: string[];
  tvlChanges:          string[];
  historicalContext:   string;
  callerNote:          string;
}

interface ContractJudgment {
  id:               string;
  type:             string;
  protocolId:       string;
  protocolName:     string;
  riskScore:        number;
  tier:             number;
  tierLabel:        string;
  tierColor:        string;
  recommendedAction:string;
  explanation:      string;
  keyFindings:      string[];
  signalSummary:    Record<string, string>;
  mitigationSteps:  string[];
  confidenceLevel:  string;
  similarExploits:  string[];
  consensusReached: boolean;
}

// ---------------------------------------------------------------------------
// GenLayer client (singleton — one client per process)
// ---------------------------------------------------------------------------

const CONTRACT_ADDRESS = env.GENLAYER_CONTRACT_ADDRESS as `0x${string}`;

function buildClient() {
  return createClient({ chain: studionet });
}

function buildAccount() {
  // Use the configured operator private key, or generate a random one for
  // read-only / simulation flows.
  const pk = env.GENLAYER_PRIVATE_KEY as `0x${string}` | undefined;
  return createAccount(pk || undefined);
}

// ---------------------------------------------------------------------------
// GenLayerService
// ---------------------------------------------------------------------------

export class GenLayerService {
  private client = buildClient();
  private account = buildAccount();

  // ── Public entry point ─────────────────────────────────────────────────

  async analyzeProtocol(
    protocol: typeof protocols.$inferSelect,
    _user:    typeof users.$inferSelect,
  ) {
    const signals = await this.gatherSignals(protocol);

    let judgment: ContractJudgment;
    let txHash = '';

    if (!CONTRACT_ADDRESS) {
      judgment = this.simulateJudgment(protocol, signals);
    } else {
      const result = await this.callAnalyzeProtocol(protocol, signals);
      judgment = result.judgment;
      txHash   = result.txHash;
    }

    // Map tier (0-4) → DB level (1-4) by clamping Tier 0 → 1
    const dbLevel = Math.max(1, judgment.tier + 1);

    const [saved] = await db.insert(aiJudgments).values({
      protocolId:           protocol.id,
      contractCallTx:       txHash || null,
      riskScore:            judgment.riskScore,
      level:                dbLevel,
      validatorExplanations: {
        explanation:    judgment.explanation,
        keyFindings:    judgment.keyFindings,
        signalSummary:  judgment.signalSummary,
        mitigationSteps:judgment.mitigationSteps,
        confidenceLevel:judgment.confidenceLevel,
        similarExploits:judgment.similarExploits,
        contractJudgmentId: judgment.id,
      },
      recommendedAction: judgment.recommendedAction,
      consensusReached:  judgment.consensusReached,
      genCost:           String(env.GENLAYER_CONTRACT_ADDRESS ? '1000000000000000' : '0'),
    }).returning();

    await db.update(protocols)
      .set({ riskScore: judgment.riskScore, lastAnalyzedAt: new Date() })
      .where(eq(protocols.id, protocol.id));

    if (dbLevel >= 2) {
      const alertService = new AlertService();
      await alertService.dispatchAlerts(saved, protocol);
    }

    return saved;
  }

  // ── Register protocol on-chain ─────────────────────────────────────────

  async registerProtocolOnChain(protocol: typeof protocols.$inferSelect): Promise<string | null> {
    if (!CONTRACT_ADDRESS) return null;
    try {
      const txHash = await this.client.writeContract({
        account:      this.account,
        address:      CONTRACT_ADDRESS,
        functionName: 'register_protocol',
        args: [
          protocol.id,
          protocol.name,
          protocol.chain,
          protocol.category,
          protocol.contractAddress ?? '',
          protocol.websiteUrl ?? '',
          '',                        // description (not in DB schema — leave blank)
          '0',                       // tvl_usd — enriched later by signal worker
          'Unknown',                 // audit_status — enriched later
        ],
        value: 0n,
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash:            txHash,
        status:          TransactionStatus.ACCEPTED,
        fullTransaction: false,
        retries:         60,   // 60 × 3s = 3 min max wait
      });

      console.log(`[GenLayer] register_protocol tx: ${txHash} status: ${(receipt as any)?.txStatus}`);
      return txHash as string;
    } catch (err) {
      console.error('[GenLayer] register_protocol failed:', err);
      return null;
    }
  }

  // ── Read protocol risk from chain ──────────────────────────────────────

  async getProtocolRiskFromChain(protocolId: string): Promise<ContractJudgment | null> {
    if (!CONTRACT_ADDRESS) return null;
    try {
      const raw = await this.client.readContract({
        address:      CONTRACT_ADDRESS,
        functionName: 'get_latest_judgment',
        args:         [protocolId],
        stateStatus:  'accepted',
      });
      return JSON.parse(raw as string) as ContractJudgment;
    } catch (err) {
      console.error('[GenLayer] get_latest_judgment failed:', err);
      return null;
    }
  }

  // ── Read contract stats ────────────────────────────────────────────────

  async getContractStats(): Promise<Record<string, unknown> | null> {
    if (!CONTRACT_ADDRESS) return null;
    try {
      const raw = await this.client.readContract({
        address:      CONTRACT_ADDRESS,
        functionName: 'get_stats',
        args:         [],
        stateStatus:  'accepted',
      });
      return raw as Record<string, unknown>;
    } catch (err) {
      console.error('[GenLayer] get_stats failed:', err);
      return null;
    }
  }

  // ── Internal: call analyze_protocol on-chain ───────────────────────────

  private async callAnalyzeProtocol(
    protocol: typeof protocols.$inferSelect,
    signals:  SignalsBundle,
  ): Promise<{ judgment: ContractJudgment; txHash: string }> {

    // First ensure protocol is registered on-chain
    await this.ensureProtocolRegistered(protocol);

    const signalsJson = JSON.stringify(signals);
    const callerRef   = `api-${protocol.id.slice(0, 8)}-${Date.now()}`;

    // Send write transaction
    const txHash = await this.client.writeContract({
      account:      this.account,
      address:      CONTRACT_ADDRESS,
      functionName: 'analyze_protocol',
      args:         [protocol.id, signalsJson, callerRef],
      value:        0n,   // whitelisted or subscription covers cost
    });

    console.log(`[GenLayer] analyze_protocol tx submitted: ${txHash}`);

    // Wait for ACCEPTED — GenLayer consensus takes ~30-120 s on StudioNet
    const receipt = await this.client.waitForTransactionReceipt({
      hash:            txHash,
      status:          TransactionStatus.ACCEPTED,
      fullTransaction: true,
      retries:         80,   // 80 × 3s = 4 min max wait
    });

    console.log(`[GenLayer] tx finalized: ${txHash} status: ${(receipt as any)?.txStatus}`);

    // Fetch the judgment that was stored by the contract
    const judgmentIdResult = await this.client.readContract({
      address:      CONTRACT_ADDRESS,
      functionName: 'get_latest_judgment_id',
      args:         [protocol.id],
      stateStatus:  'accepted',
    });

    const judgmentRaw = await this.client.readContract({
      address:      CONTRACT_ADDRESS,
      functionName: 'get_judgment',
      args:         [judgmentIdResult as string],
      stateStatus:  'accepted',
    });

    const judgment = JSON.parse(judgmentRaw as string) as ContractJudgment;
    return { judgment, txHash: txHash as string };
  }

  // ── Ensure protocol exists on-chain before analysis ────────────────────

  private async ensureProtocolRegistered(protocol: typeof protocols.$inferSelect): Promise<void> {
    try {
      const exists = await this.client.readContract({
        address:      CONTRACT_ADDRESS,
        functionName: 'is_protocol_registered',
        args:         [protocol.id],
        stateStatus:  'accepted',
      });
      if (!exists) {
        await this.registerProtocolOnChain(protocol);
      }
    } catch {
      // If read fails, attempt registration anyway
      await this.registerProtocolOnChain(protocol);
    }
  }

  // ── Signal gathering from DB + defaults ───────────────────────────────

  private async gatherSignals(protocol: typeof protocols.$inferSelect): Promise<SignalsBundle> {
    // Pull recent un-processed signal_ingestions for this protocol
    const { signalIngestions } = await import('../../db/schema.js');
    const { desc, and, eq: eqOp } = await import('drizzle-orm');

    const recentSignals = await db
      .select()
      .from(signalIngestions)
      .where(and(eqOp(signalIngestions.protocolId, protocol.id)))
      .orderBy(desc(signalIngestions.ingestedAt))
      .limit(30);

    const onChain: string[]    = [];
    const threatFeed: string[] = [];
    const social: string[]     = [];
    const news: string[]       = [];
    const txPat: string[]      = [];
    const tvlCh: string[]      = [];

    for (const sig of recentSignals) {
      const payload = sig.content as Record<string, unknown>;
      const summary = String(payload.summary ?? payload.description ?? payload.title ?? JSON.stringify(payload).slice(0, 120));
      switch (sig.source) {
        case 'etherscan':  onChain.push(summary);    break;
        case 'forta':      threatFeed.push(summary); break;
        case 'twitter':
        case 'discord':    social.push(summary);     break;
        case 'news':       news.push(summary);       break;
        case 'tvl':        tvlCh.push(summary);      break;
        default:           txPat.push(summary);      break;
      }
    }

    // Provide at least one signal so the contract doesn't reject empty bundles
    if (onChain.length === 0 && threatFeed.length === 0 && txPat.length === 0) {
      onChain.push(`Routine monitoring sweep for ${protocol.name} on ${protocol.chain}.`);
    }

    return {
      onChainAnomalies:    onChain,
      threatFeedAlerts:    threatFeed,
      socialSignals:       social,
      newsSignals:         news,
      transactionPatterns: txPat,
      tvlChanges:          tvlCh,
      historicalContext:   `${protocol.name} is a ${protocol.category} protocol on ${protocol.chain}. Previous risk score: ${protocol.riskScore ?? 0}/100.`,
      callerNote:          'Automated FortiChain monitoring sweep.',
    };
  }

  // ── Fallback simulation (no contract address or RPC error) ─────────────

  private simulateJudgment(
    protocol: typeof protocols.$inferSelect,
    signals:  SignalsBundle,
  ): ContractJudgment {
    const anomalyCount = signals.onChainAnomalies.length + signals.threatFeedAlerts.length;
    const score = Math.min(85, anomalyCount * 12 + 10);
    const tier  = score < 20 ? 0 : score < 40 ? 1 : score < 60 ? 2 : score < 80 ? 3 : 4;
    const labels = ['Safe', 'Warning', 'Restricted', 'Emergency', 'Critical'];
    const colors = ['#00FF88', '#FFD700', '#FF9500', '#FF4444', '#FF0000'];
    const actions = [
      'Continue normal operations.',
      'Alert security team. Increase monitoring.',
      'Restrict large transactions. Page on-call.',
      'Pause protocol. Activate incident response.',
      'Freeze all operations. Governance emergency.',
    ];

    return {
      id:               `sim-${protocol.id.slice(0, 8)}-${Date.now()}`,
      type:             'ai_analysis_simulated',
      protocolId:       protocol.id,
      protocolName:     protocol.name,
      riskScore:        score,
      tier,
      tierLabel:        labels[tier],
      tierColor:        colors[tier],
      recommendedAction:actions[tier],
      explanation:      `Simulated judgment: ${anomalyCount} anomaly signals detected across on-chain and threat feed sources for ${protocol.name}.`,
      keyFindings:      signals.onChainAnomalies.slice(0, 3),
      signalSummary: {
        onChainSeverity:      anomalyCount >= 3 ? 'high' : anomalyCount >= 1 ? 'medium' : 'none',
        threatFeedSeverity:   signals.threatFeedAlerts.length > 0 ? 'medium' : 'none',
        socialSeverity:       signals.socialSignals.length > 0 ? 'low' : 'none',
        overallCorroboration: anomalyCount >= 2 ? 'moderate' : 'weak',
      },
      mitigationSteps:  [actions[tier], 'Review signal bundle manually', 'Re-trigger analysis in 5 minutes'],
      confidenceLevel:  'medium',
      similarExploits:  [],
      consensusReached: true,
    };
  }
}
