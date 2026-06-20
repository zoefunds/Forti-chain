'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Zap, Loader2, CheckCircle, Clock, X,
  ShieldAlert, AlertTriangle, ShieldCheck, Link2,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatDistanceToNow } from 'date-fns';
import { RiskChart } from '@/components/charts/RiskChart';

const TIER_LABELS = ['Safe', 'Warning', 'Restricted', 'Emergency', 'Critical'];
const TIER_BADGE = ['fc-badge-secure', 'fc-badge-low', 'fc-badge-medium', 'fc-badge-high', 'fc-badge-critical'];
const TIER_COLOR = ['#22c55e', '#f59e0b', '#f97316', '#ef4444', '#ef4444'];

function getTierFromLevel(level: number) {
  return Math.min(4, Math.max(0, level - 1));
}

function JudgmentResultModal({ judgment, onClose }: { judgment: any; onClose: () => void }) {
  const tier = getTierFromLevel(judgment.level);
  const exp = judgment.validatorExplanations ?? {};
  const score = judgment.riskScore ?? 0;
  const color = TIER_COLOR[tier];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        className="fc-card w-full max-w-2xl shadow-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c2229]"
          style={{ background: `${color}08` }}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5" style={{ color }} />
            <div>
              <h2 className="font-semibold text-[#eeeeee]" style={{ color }}>
                Tier {tier} — {TIER_LABELS[tier]}
              </h2>
              <p className="fc-label">GenLayer AI Consensus Judgment</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <span className="font-mono text-3xl font-bold tabular-nums" style={{ color }}>
              {score}<span className="text-[#8ca4ac] text-base font-normal">/100</span>
            </span>
            <button onClick={onClose} className="text-[#8ca4ac] hover:text-[#eeeeee]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Status row */}
          <div className="flex items-center gap-3">
            <span className={TIER_BADGE[tier]}>Tier {tier} — {TIER_LABELS[tier]}</span>
            {judgment.consensusReached && (
              <span className="flex items-center gap-1.5 text-[#22c55e] text-xs font-mono">
                <CheckCircle className="w-3.5 h-3.5" /> Consensus reached
              </span>
            )}
            {exp.contractJudgmentId && (
              <span className="fc-label ml-auto font-mono">{exp.contractJudgmentId}</span>
            )}
          </div>

          {/* Recommended action */}
          {judgment.recommendedAction && (
            <div className="rounded border px-4 py-3" style={{ borderColor: `${color}40`, background: `${color}08` }}>
              <p className="fc-label mb-1.5">Recommended Action</p>
              <p className="text-[#eeeeee] text-sm leading-relaxed">{judgment.recommendedAction}</p>
            </div>
          )}

          {/* AI explanation */}
          {exp.explanation && (
            <div>
              <p className="fc-label mb-2">AI Analysis</p>
              <p className="text-[#8ca4ac] text-sm leading-relaxed">{exp.explanation}</p>
            </div>
          )}

          {/* Key findings */}
          {exp.keyFindings?.length > 0 && (
            <div>
              <p className="fc-label mb-2">Key Findings</p>
              <ul className="space-y-2">
                {exp.keyFindings.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#eeeeee]">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signal summary */}
          {exp.signalSummary && Object.keys(exp.signalSummary).length > 0 && (
            <div>
              <p className="fc-label mb-2">Signal Summary</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(exp.signalSummary).map(([k, v]: any) => {
                  const sigColor = v === 'high' || v === 'critical' ? '#ef4444' : v === 'medium' ? '#f59e0b' : v === 'low' || v === 'weak' ? '#f97316' : '#8ca4ac';
                  return (
                    <div key={k} className="bg-[#0d1014] border border-[#1c2229] rounded px-3 py-2 flex justify-between items-center">
                      <span className="text-[#8ca4ac] text-2xs font-mono capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-xs font-semibold capitalize font-mono" style={{ color: sigColor }}>{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mitigation steps */}
          {exp.mitigationSteps?.length > 0 && (
            <div>
              <p className="fc-label mb-2">Mitigation Steps</p>
              <ol className="space-y-2 list-decimal list-inside">
                {exp.mitigationSteps.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-[#8ca4ac]">{s}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#1c2229] text-2xs font-mono text-[#8ca4ac]">
            <span>{formatDistanceToNow(new Date(judgment.createdAt), { addSuffix: true })}</span>
            <span>{judgment.id?.slice(0, 16)}</span>
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
    } catch { router.push('/dashboard/protocols'); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 10_000);

  const analyze = async () => {
    setAnalyzing(true); setAnalyzeError('');
    try {
      await api.post(`/api/v1/protocols/${id}/analyze`);
      await load();
      const fresh = await api.get(`/api/v1/protocols/${id}/judgments`);
      if (fresh.data.length > 0) setSelectedJudgment(fresh.data[0]);
    } catch (err: any) {
      setAnalyzeError(err.response?.data?.message ?? 'Analysis failed. Try again.');
    } finally { setAnalyzing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-[#217eaa] animate-spin" />
    </div>
  );
  if (!protocol) return null;

  const score = protocol.riskScore ?? 0;
  const tier = score >= 75 ? 4 : score >= 50 ? 3 : score >= 25 ? 2 : score > 0 ? 1 : 0;
  const tierColor = TIER_COLOR[tier];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/protocols" className="text-[#8ca4ac] hover:text-[#eeeeee] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-[#eeeeee]">{protocol.name}</h1>
            <span className={TIER_BADGE[tier]}>{TIER_LABELS[tier]}</span>
          </div>
          <p className="text-xs text-[#8ca4ac] font-mono capitalize mt-0.5">{protocol.chain} · {protocol.category}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <button onClick={analyze} disabled={analyzing} className="btn-primary text-sm gap-2">
            {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</> : <><Zap className="w-4 h-4" />Analyze Now</>}
          </button>
          {analyzeError && <p className="text-[#ef4444] text-2xs font-mono">{analyzeError}</p>}
          {analyzing && <p className="text-[#8ca4ac] text-2xs font-mono">Waiting for AI validator consensus (~60s)</p>}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="fc-card p-5">
          <p className="fc-label mb-2">Current Risk Score</p>
          <p className="font-mono text-4xl font-bold tabular-nums" style={{ color: tierColor }}>{score}</p>
          <p className="text-2xs text-[#8ca4ac] font-mono mt-1">out of 100</p>
        </div>
        <div className="fc-card p-5">
          <p className="fc-label mb-2">Total Judgments</p>
          <p className="font-mono text-4xl font-bold text-[#217eaa] tabular-nums">{judgments.length}</p>
        </div>
        <div className="fc-card p-5">
          <p className="fc-label mb-2">Last Analyzed</p>
          <p className="text-[#eeeeee] text-sm font-medium mt-2">
            {protocol.lastAnalyzedAt
              ? formatDistanceToNow(new Date(protocol.lastAnalyzedAt), { addSuffix: true })
              : 'Never'}
          </p>
        </div>
      </div>

      {/* Protocol meta */}
      <div className="fc-card px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="fc-label mb-1">Contract</p>
          <p className="text-[#eeeeee] font-mono text-2xs truncate">{protocol.contractAddress ?? 'N/A'}</p>
        </div>
        <div>
          <p className="fc-label mb-1">Monitoring</p>
          <span className="text-xs font-mono">
            {protocol.monitoringActive
              ? <span className="flex items-center gap-1.5 text-[#22c55e]"><span className="dot-live" />Active</span>
              : <span className="flex items-center gap-1.5 text-[#8ca4ac]"><span className="dot-dead" />Paused</span>
            }
          </span>
        </div>
        <div>
          <p className="fc-label mb-1">Alert Email</p>
          <p className="text-[#eeeeee] text-xs truncate">{protocol.alertEmail ?? 'Not set'}</p>
        </div>
        <div>
          <p className="fc-label mb-1">Website</p>
          {protocol.websiteUrl
            ? <a href={protocol.websiteUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-[#217eaa] text-xs hover:underline">
                <Link2 className="w-3 h-3" />Visit
              </a>
            : <p className="text-[#8ca4ac] text-xs">N/A</p>
          }
        </div>
      </div>

      {/* Risk trend */}
      {judgments.length > 1 && (
        <div className="fc-card p-5">
          <p className="text-sm font-semibold text-[#eeeeee] mb-4">Risk Score Trend</p>
          <RiskChart protocols={[...judgments].reverse().map((j, i) => ({ name: `#${i + 1}`, riskScore: j.riskScore }))} />
        </div>
      )}

      {/* Judgment history */}
      <div className="fc-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1c2229] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#eeeeee]">AI Judgment History</p>
          <span className="fc-label">{judgments.length} records</span>
        </div>

        {judgments.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck className="w-10 h-10 text-[#1c2229] mx-auto mb-3" />
            <p className="text-xs text-[#8ca4ac] font-mono">No judgments yet — click Analyze Now to get your first AI security assessment</p>
          </div>
        ) : (
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Tier</th>
                <th className="fc-th">Risk</th>
                <th className="fc-th">Status</th>
                <th className="fc-th">Summary</th>
                <th className="fc-th">Time</th>
              </tr>
            </thead>
            <tbody>
              {judgments.map((j, i) => {
                const t = getTierFromLevel(j.level);
                const exp = j.validatorExplanations ?? {};
                return (
                  <motion.tr key={j.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="fc-tr cursor-pointer"
                    onClick={() => setSelectedJudgment(j)}>
                    <td className="fc-td">
                      <span className={TIER_BADGE[t]}>{TIER_LABELS[t]}</span>
                    </td>
                    <td className="fc-td">
                      <span className="font-mono text-lg font-bold tabular-nums" style={{ color: TIER_COLOR[t] }}>
                        {j.riskScore}
                      </span>
                    </td>
                    <td className="fc-td whitespace-nowrap">
                      {j.consensusReached
                        ? <span className="flex items-center gap-1.5 text-xs text-[#22c55e] font-mono"><CheckCircle className="w-3 h-3" />Consensus</span>
                        : <span className="flex items-center gap-1.5 text-xs text-[#8ca4ac] font-mono"><span className="dot-dead" />Pending</span>
                      }
                    </td>
                    <td className="fc-td max-w-xs">
                      <p className="text-xs text-[#8ca4ac] truncate">{exp.explanation ?? '—'}</p>
                    </td>
                    <td className="fc-td whitespace-nowrap">
                      <span className="flex items-center gap-1 text-xs text-[#8ca4ac] font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(j.createdAt), { addSuffix: true })}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {selectedJudgment && <JudgmentResultModal judgment={selectedJudgment} onClose={() => setSelectedJudgment(null)} />}
      </AnimatePresence>
    </div>
  );
}
