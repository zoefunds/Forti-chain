'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Server, Loader2, Zap, X, AlertTriangle, Clock, ShieldAlert, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { AddProtocolModal } from '@/components/monitoring/AddProtocolModal';
import { formatDistanceToNow } from 'date-fns';

const TIER_LABELS = ['Safe', 'Warning', 'Restricted', 'Emergency', 'Critical'];
const TIER_BADGE = ['fc-badge-secure', 'fc-badge-low', 'fc-badge-medium', 'fc-badge-high', 'fc-badge-critical'];

const RISK_COLOR = (s: number) =>
  s >= 75 ? '#ef4444' : s >= 50 ? '#f97316' : s >= 25 ? '#f59e0b' : '#22c55e';

function JudgmentModal({ judgment, onClose }: { judgment: any; onClose: () => void }) {
  const tier = Math.min(4, Math.max(0, (judgment.level ?? 1) - 1));
  const exp = judgment.validatorExplanations ?? {};
  const score = judgment.riskScore ?? 0;
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        className="fc-card w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2229]">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#217eaa]" />
            <div>
              <h3 className="text-[#eeeeee] font-semibold text-sm">Analysis Complete</h3>
              <p className="fc-label">GenLayer AI Consensus</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: RISK_COLOR(score) }}>
              {score}<span className="text-[#8ca4ac] text-sm font-normal">/100</span>
            </span>
            <button onClick={onClose} className="text-[#8ca4ac] hover:text-[#eeeeee]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className={TIER_BADGE[tier]}>Tier {tier} — {TIER_LABELS[tier]}</span>
            {judgment.consensusReached && (
              <span className="flex items-center gap-1 text-[#22c55e] text-xs font-mono">
                <CheckCircle className="w-3 h-3" /> Consensus reached
              </span>
            )}
          </div>
          {judgment.recommendedAction && (
            <p className="text-[#eeeeee] text-sm bg-[#0d1014] border border-[#1c2229] rounded px-4 py-3 leading-relaxed">
              {judgment.recommendedAction}
            </p>
          )}
          {exp.explanation && (
            <p className="text-[#8ca4ac] text-sm leading-relaxed">{exp.explanation}</p>
          )}
          {exp.keyFindings?.length > 0 && (
            <ul className="space-y-1.5">
              {exp.keyFindings.slice(0, 3).map((f: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#eeeeee]">
                  <AlertTriangle className="w-3 h-3 mt-0.5 text-[#f59e0b] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          {judgment.protocolId && (
            <Link href={`/dashboard/protocols/${judgment.protocolId}`}
              className="block text-center text-[#217eaa] text-xs font-mono hover:underline mt-2">
              View full judgment history →
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ProtocolsPage() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  const [analyzeError, setAnalyzeError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/protocols');
      setProtocols(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 10_000);

  const analyze = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setAnalyzing(id); setAnalyzeError('');
    try {
      await api.post(`/api/v1/protocols/${id}/analyze`);
      await load();
      const jRes = await api.get(`/api/v1/protocols/${id}/judgments`);
      if (jRes.data.length > 0) setAnalyzeResult({ ...jRes.data[0], protocolId: id });
    } catch (err: any) {
      setAnalyzeError(err.response?.data?.message ?? 'Analysis failed');
      setTimeout(() => setAnalyzeError(''), 5000);
    } finally { setAnalyzing(null); }
  };

  const levelForScore = (score: number) =>
    score < 20 ? 0 : score < 40 ? 1 : score < 60 ? 2 : score < 80 ? 3 : 4;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#eeeeee]">Protocols</h1>
          <p className="text-xs text-[#8ca4ac] mt-0.5">Manage and monitor your DeFi protocols · auto-refreshes every 10s</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          Add Protocol
        </button>
      </div>

      {analyzeError && (
        <div className="fc-card border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 flex items-center gap-2 text-[#ef4444] text-xs">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {analyzeError}
        </div>
      )}
      {analyzing && (
        <div className="fc-card border-[#217eaa]/30 bg-[#217eaa]/5 px-4 py-3 flex items-center gap-2 text-[#217eaa] text-xs font-mono">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running AI consensus on GenLayer StudioNet — this takes ~60s…
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 text-[#217eaa] animate-spin" />
        </div>
      ) : protocols.length === 0 ? (
        <div className="fc-card p-16 text-center">
          <Server className="w-10 h-10 text-[#1c2229] mx-auto mb-4" />
          <p className="text-[#eeeeee] font-medium mb-1">No protocols yet</p>
          <p className="text-[#8ca4ac] text-xs mb-6">Add your first DeFi protocol to start monitoring</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">Add Protocol</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {protocols.map((p, i) => {
            const level = levelForScore(p.riskScore ?? 0);
            const score = p.riskScore ?? 0;
            return (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="fc-card-hover p-5 cursor-pointer"
                onClick={() => window.location.href = `/dashboard/protocols/${p.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[#eeeeee] font-semibold truncate">{p.name}</h3>
                    <p className="text-[#8ca4ac] text-2xs mt-0.5 font-mono capitalize">{p.chain} · {p.category}</p>
                  </div>
                  <span className={`${TIER_BADGE[level]} ml-3 flex-shrink-0`}>{TIER_LABELS[level]}</span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-2xs mb-1.5">
                    <span className="fc-label">Risk Score</span>
                    <span className="font-mono text-xs" style={{ color: RISK_COLOR(score) }}>{score}/100</span>
                  </div>
                  <div className="risk-bar-track">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${score}%`, backgroundColor: RISK_COLOR(score) }} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {p.monitoringActive
                      ? <span className="flex items-center gap-1.5 text-2xs text-[#22c55e] font-mono"><span className="dot-live" />Active</span>
                      : <span className="flex items-center gap-1.5 text-2xs text-[#8ca4ac] font-mono"><span className="dot-dead" />Paused</span>
                    }
                    {p.lastAnalyzedAt && (
                      <span className="flex items-center gap-1 text-2xs text-[#8ca4ac] font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(p.lastAnalyzedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <button onClick={(e) => analyze(e, p.id)} disabled={analyzing === p.id}
                    className="btn-outline text-xs py-1.5 px-3 gap-1.5 disabled:opacity-50">
                    {analyzing === p.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing…</>
                      : <><Zap className="w-3 h-3" />Analyze</>
                    }
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddProtocolModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />
      )}
      <AnimatePresence>
        {analyzeResult && <JudgmentModal judgment={analyzeResult} onClose={() => setAnalyzeResult(null)} />}
      </AnimatePresence>
    </div>
  );
}
