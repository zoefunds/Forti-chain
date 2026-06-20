'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Zap, Loader2, CheckCircle, Clock, X,
  ShieldAlert, AlertTriangle, ShieldCheck, TrendingUp, Link2,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatDistanceToNow } from 'date-fns';
import { RiskChart } from '@/components/charts/RiskChart';

const TIER_CONFIG: Record<number, { label: string; color: string; border: string; bg: string }> = {
  0: { label: 'Safe',        color: 'text-fort-green',   border: 'border-fort-green/40',   bg: 'bg-fort-green/10' },
  1: { label: 'Warning',     color: 'text-yellow-400',   border: 'border-yellow-400/40',   bg: 'bg-yellow-400/10' },
  2: { label: 'Restricted',  color: 'text-fort-warning', border: 'border-fort-warning/40', bg: 'bg-fort-warning/10' },
  3: { label: 'Emergency',   color: 'text-fort-danger',  border: 'border-fort-danger/40',  bg: 'bg-fort-danger/10' },
  4: { label: 'Critical',    color: 'text-red-500',      border: 'border-red-500/40',      bg: 'bg-red-500/10' },
};

function getTierFromLevel(level: number) {
  // DB stores level 1-4 (shifted by 1 from contract tier 0-4)
  // tier 0 (Safe) maps to level 1 in DB
  return Math.max(0, level - 1);
}

function JudgmentResultModal({ judgment, onClose }: { judgment: any; onClose: () => void }) {
  const tier = getTierFromLevel(judgment.level);
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG[1];
  const exp = judgment.validatorExplanations ?? {};

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fort-card border border-fort-border rounded-2xl w-full max-w-2xl shadow-2xl my-4">

        <div className={`flex items-center justify-between p-6 border-b border-fort-border ${cfg.bg} rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            <ShieldAlert className={`w-6 h-6 ${cfg.color}`} />
            <div>
              <h2 className={`font-bold text-lg ${cfg.color}`}>
                Tier {tier} — {cfg.label}
              </h2>
              <p className="text-fort-muted text-xs">GenLayer AI Consensus Judgment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-4xl font-bold font-mono ${cfg.color}`}>{judgment.riskScore}/100</span>
            <button onClick={onClose} className="text-fort-muted hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Recommended action */}
          <div className={`rounded-xl border ${cfg.border} p-4`}>
            <p className="text-fort-muted text-xs font-semibold uppercase tracking-wide mb-1">Recommended Action</p>
            <p className="text-white text-sm leading-relaxed">{judgment.recommendedAction}</p>
          </div>

          {/* AI explanation */}
          {exp.explanation && (
            <div>
              <p className="text-fort-muted text-xs font-semibold uppercase tracking-wide mb-2">AI Analysis</p>
              <p className="text-fort-text text-sm leading-relaxed">{exp.explanation}</p>
            </div>
          )}

          {/* Key findings */}
          {exp.keyFindings?.length > 0 && (
            <div>
              <p className="text-fort-muted text-xs font-semibold uppercase tracking-wide mb-2">Key Findings</p>
              <ul className="space-y-1.5">
                {exp.keyFindings.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-fort-text">
                    <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signal summary */}
          {exp.signalSummary && (
            <div>
              <p className="text-fort-muted text-xs font-semibold uppercase tracking-wide mb-2">Signal Summary</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(exp.signalSummary).map(([k, v]: any) => (
                  <div key={k} className="bg-fort-surface rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-fort-muted text-xs capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className={`text-xs font-semibold capitalize ${
                      v === 'high' || v === 'critical' ? 'text-fort-danger' :
                      v === 'medium' ? 'text-fort-warning' :
                      v === 'low' || v === 'weak' ? 'text-yellow-400' :
                      'text-fort-muted'
                    }`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mitigation steps */}
          {exp.mitigationSteps?.length > 0 && (
            <div>
              <p className="text-fort-muted text-xs font-semibold uppercase tracking-wide mb-2">Mitigation Steps</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                {exp.mitigationSteps.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-fort-text">{s}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center justify-between pt-2 border-t border-fort-border text-xs text-fort-muted">
            <span className="flex items-center gap-1">
              {judgment.consensusReached && <><CheckCircle className="w-3.5 h-3.5 text-fort-green" /> Consensus reached</>}
            </span>
            <span className="font-mono">{exp.contractJudgmentId ?? judgment.id?.slice(0, 16)}</span>
            <span>{formatDistanceToNow(new Date(judgment.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ProtocolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [protocol, setProtocol] = useState<any>(null);
  const [judgments, setJudgments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [selectedJudgment, setSelectedJudgment] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [p, j] = await Promise.all([
        api.get(`/api/v1/protocols/${id}`),
        api.get(`/api/v1/protocols/${id}/judgments`),
      ]);
      setProtocol(p.data);
      setJudgments(j.data);
    } catch {
      router.push('/dashboard/protocols');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 30_000);

  const analyze = async () => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const res = await api.post(`/api/v1/protocols/${id}/analyze`);
      await load();
      // Open the result modal with the fresh judgment
      const fresh = await api.get(`/api/v1/protocols/${id}/judgments`);
      if (fresh.data.length > 0) setSelectedJudgment(fresh.data[0]);
    } catch (err: any) {
      setAnalyzeError(err.response?.data?.message ?? 'Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-fort-cyan animate-spin" />
    </div>
  );
  if (!protocol) return null;

  const currentTier = getTierFromLevel(protocol.riskScore >= 75 ? 4 : protocol.riskScore >= 50 ? 3 : protocol.riskScore >= 25 ? 2 : protocol.riskScore > 0 ? 1 : 1);
  const cfg = TIER_CONFIG[currentTier];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/protocols" className="text-fort-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{protocol.name}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-fort-muted text-sm capitalize">{protocol.chain} · {protocol.category}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={analyze} disabled={analyzing}
            className="flex items-center gap-2 bg-fort-cyan text-fort-bg font-semibold px-4 py-2.5 rounded-xl hover:bg-fort-cyan/90 transition-all disabled:opacity-50 text-sm">
            {analyzing
              ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing (GenLayer)...</>
              : <><Zap className="w-4 h-4" />Analyze Now</>}
          </button>
          {analyzeError && <p className="text-fort-danger text-xs">{analyzeError}</p>}
          {analyzing && <p className="text-fort-muted text-xs">Waiting for AI validator consensus (~60s)</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-fort p-5">
          <p className="text-fort-muted text-xs mb-2">Current Risk Score</p>
          <p className={`text-4xl font-bold font-mono ${cfg.color}`}>{protocol.riskScore ?? 0}</p>
          <p className="text-fort-muted text-xs mt-1">out of 100</p>
        </div>
        <div className="card-fort p-5">
          <p className="text-fort-muted text-xs mb-2">Total Judgments</p>
          <p className="text-4xl font-bold font-mono text-fort-cyan">{judgments.length}</p>
        </div>
        <div className="card-fort p-5">
          <p className="text-fort-muted text-xs mb-2">Last Analyzed</p>
          <p className="text-white text-sm font-medium mt-2">
            {protocol.lastAnalyzedAt
              ? formatDistanceToNow(new Date(protocol.lastAnalyzedAt), { addSuffix: true })
              : 'Never'}
          </p>
        </div>
      </div>

      {/* Protocol info */}
      <div className="card-fort p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-fort-muted text-xs mb-1">Contract</p>
          <p className="text-white font-mono text-xs truncate">{protocol.contractAddress ?? 'N/A'}</p>
        </div>
        <div>
          <p className="text-fort-muted text-xs mb-1">Monitoring</p>
          <span className={`text-xs font-semibold ${protocol.monitoringActive ? 'text-fort-green' : 'text-fort-muted'}`}>
            {protocol.monitoringActive ? '● Active' : '○ Paused'}
          </span>
        </div>
        <div>
          <p className="text-fort-muted text-xs mb-1">Alert Email</p>
          <p className="text-white text-xs truncate">{protocol.alertEmail ?? 'Not set'}</p>
        </div>
        <div>
          <p className="text-fort-muted text-xs mb-1">Website</p>
          {protocol.websiteUrl
            ? <a href={protocol.websiteUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-fort-cyan text-xs hover:underline">
                <Link2 className="w-3 h-3" /> Visit
              </a>
            : <p className="text-fort-muted text-xs">N/A</p>
          }
        </div>
      </div>

      {/* Risk trend chart */}
      {judgments.length > 1 && (
        <div className="card-fort p-6">
          <h2 className="text-white font-semibold mb-4">Risk Score Trend</h2>
          <RiskChart protocols={[...judgments].reverse().map((j, i) => ({ name: `#${i + 1}`, riskScore: j.riskScore }))} />
        </div>
      )}

      {/* Judgment history */}
      <div className="card-fort p-6">
        <h2 className="text-white font-semibold mb-4">AI Judgment History</h2>
        {judgments.length === 0 ? (
          <div className="text-center py-10">
            <ShieldCheck className="w-10 h-10 text-fort-muted mx-auto mb-3" />
            <p className="text-fort-muted text-sm">No judgments yet — click Analyze Now to get your first AI security assessment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {judgments.map((j, i) => {
              const t = getTierFromLevel(j.level);
              const jCfg = TIER_CONFIG[t] ?? TIER_CONFIG[1];
              const exp = j.validatorExplanations ?? {};
              return (
                <motion.button key={j.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedJudgment(j)}
                  className={`w-full text-left border rounded-xl p-4 ${jCfg.border} ${jCfg.bg} hover:brightness-110 transition-all`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${jCfg.color}`}>Tier {t} — {jCfg.label}</span>
                      {j.consensusReached && (
                        <span className="flex items-center gap-1 text-fort-green text-xs">
                          <CheckCircle className="w-3 h-3" /> Consensus
                        </span>
                      )}
                      {exp.contractJudgmentId && (
                        <span className="text-fort-muted text-xs font-mono">{exp.contractJudgmentId}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xl font-bold font-mono ${jCfg.color}`}>{j.riskScore}/100</span>
                      <span className="text-fort-muted text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(j.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {exp.explanation && (
                    <p className="text-fort-text text-xs mt-2 line-clamp-1">{exp.explanation}</p>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Judgment detail modal */}
      <AnimatePresence>
        {selectedJudgment && (
          <JudgmentResultModal judgment={selectedJudgment} onClose={() => setSelectedJudgment(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
