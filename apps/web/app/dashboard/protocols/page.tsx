'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Server, Loader2, Zap, CheckCircle, X, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { AddProtocolModal } from '@/components/monitoring/AddProtocolModal';
import { formatDistanceToNow } from 'date-fns';

const LEVEL_BADGE: Record<number, { label: string; color: string }> = {
  0: { label: 'Safe',       color: 'text-fort-green bg-fort-green/10 border-fort-green/30' },
  1: { label: 'Warning',    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  2: { label: 'Restricted', color: 'text-fort-warning bg-fort-warning/10 border-fort-warning/30' },
  3: { label: 'Emergency',  color: 'text-fort-danger bg-fort-danger/10 border-fort-danger/30' },
  4: { label: 'Critical',   color: 'text-red-500 bg-red-500/10 border-red-500/30' },
};

function JudgmentModal({ judgment, onClose }: { judgment: any; onClose: () => void }) {
  const tier = Math.max(0, (judgment.level ?? 1) - 1);
  const cfg = LEVEL_BADGE[tier] ?? LEVEL_BADGE[1];
  const exp = judgment.validatorExplanations ?? {};
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="bg-fort-card border border-fort-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className={`flex items-center justify-between p-5 border-b border-fort-border rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-fort-cyan" />
            <div>
              <h3 className="text-white font-bold">Analysis Complete</h3>
              <p className="text-fort-muted text-xs">GenLayer AI Consensus</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-3xl font-bold font-mono ${cfg.color.split(' ')[0]}`}>
              {judgment.riskScore}/100
            </span>
            <button onClick={onClose} className="text-fort-muted hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${cfg.color}`}>
              Tier {tier} — {cfg.label}
            </span>
            {judgment.consensusReached && (
              <span className="flex items-center gap-1 text-fort-green text-xs">
                <CheckCircle className="w-3 h-3" /> Consensus
              </span>
            )}
          </div>
          {judgment.recommendedAction && (
            <p className="text-white text-sm bg-fort-surface border border-fort-border rounded-xl p-3 leading-relaxed">
              {judgment.recommendedAction}
            </p>
          )}
          {exp.explanation && (
            <p className="text-fort-text text-sm leading-relaxed">{exp.explanation}</p>
          )}
          {exp.keyFindings?.length > 0 && (
            <ul className="space-y-1">
              {exp.keyFindings.slice(0, 3).map((f: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-fort-text">
                  <AlertTriangle className="w-3 h-3 mt-0.5 text-fort-warning flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          <Link href={`/dashboard/protocols/${judgment.protocolId}`}
            className="block text-center text-fort-cyan text-xs hover:underline mt-2">
            View full judgment history →
          </Link>
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
  const [analyzeError, setAnalyzeError] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/protocols');
      setProtocols(res.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 30_000);

  const analyze = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setAnalyzing(id);
    setAnalyzeError('');
    try {
      await api.post(`/api/v1/protocols/${id}/analyze`);
      await load();
      const jRes = await api.get(`/api/v1/protocols/${id}/judgments`);
      if (jRes.data.length > 0) setAnalyzeResult({ ...jRes.data[0], protocolId: id });
    } catch (err: any) {
      setAnalyzeError(err.response?.data?.message ?? 'Analysis failed');
      setTimeout(() => setAnalyzeError(''), 5000);
    } finally {
      setAnalyzing(null);
    }
  };

  const levelForScore = (score: number) =>
    score < 20 ? 0 : score < 40 ? 1 : score < 60 ? 2 : score < 80 ? 3 : 4;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Protocols</h1>
          <p className="text-fort-muted text-sm mt-1">Manage and monitor your DeFi protocols · auto-refreshes every 30s</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-fort-cyan text-fort-bg font-semibold px-4 py-2.5 rounded-xl hover:bg-fort-cyan/90 transition-all text-sm">
          <Plus className="w-4 h-4" />
          Add Protocol
        </button>
      </div>

      {analyzeError && (
        <div className="flex items-center gap-2 bg-fort-danger/10 border border-fort-danger/30 rounded-xl px-4 py-2.5 text-fort-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {analyzeError}
        </div>
      )}

      {analyzing && (
        <div className="flex items-center gap-2 bg-fort-cyan/5 border border-fort-cyan/20 rounded-xl px-4 py-2.5 text-fort-cyan text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Running AI consensus on GenLayer StudioNet — this takes ~60s...
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-fort-cyan animate-spin" />
        </div>
      ) : protocols.length === 0 ? (
        <div className="card-fort p-12 text-center">
          <Server className="w-12 h-12 text-fort-muted mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">No protocols yet</p>
          <p className="text-fort-muted text-sm mb-6">Add your first DeFi protocol to start monitoring</p>
          <button onClick={() => setShowAdd(true)}
            className="bg-fort-cyan text-fort-bg font-semibold px-6 py-2.5 rounded-xl hover:bg-fort-cyan/90 transition-all text-sm">
            Add Protocol
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {protocols.map((p, i) => {
            const level = levelForScore(p.riskScore ?? 0);
            const badge = LEVEL_BADGE[level];
            return (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-fort p-5 hover:border-fort-cyan/20 transition-all cursor-pointer"
                onClick={() => window.location.href = `/dashboard/protocols/${p.id}`}>

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{p.name}</h3>
                    <p className="text-fort-muted text-xs mt-0.5 font-mono capitalize">{p.chain} · {p.category}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-fort-muted">Risk Score</span>
                    <span className="font-mono text-white">{p.riskScore ?? 0}/100</span>
                  </div>
                  <div className="h-1.5 bg-fort-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        level === 0 ? 'bg-fort-green' :
                        level === 1 ? 'bg-yellow-400' :
                        level === 2 ? 'bg-fort-warning' :
                        'bg-fort-danger'
                      }`}
                      style={{ width: `${p.riskScore ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {p.monitoringActive
                      ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-fort-green animate-pulse" /><span className="text-fort-green text-xs">Active</span></span>
                      : <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-fort-muted" /><span className="text-fort-muted text-xs">Paused</span></span>
                    }
                    {p.lastAnalyzedAt && (
                      <span className="flex items-center gap-1 text-fort-muted text-xs">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(p.lastAnalyzedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => analyze(e, p.id)}
                    disabled={analyzing === p.id}
                    className="flex items-center gap-1.5 text-xs text-fort-cyan border border-fort-cyan/20 px-3 py-1.5 rounded-lg hover:bg-fort-cyan/10 transition-all disabled:opacity-50">
                    {analyzing === p.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                      : <><Zap className="w-3 h-3" /> Analyze</>
                    }
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddProtocolModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load(); }}
        />
      )}

      <AnimatePresence>
        {analyzeResult && (
          <JudgmentModal judgment={analyzeResult} onClose={() => setAnalyzeResult(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
