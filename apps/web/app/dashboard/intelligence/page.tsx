'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, Globe, Shield, RefreshCw, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatDistanceToNow } from 'date-fns';

const SOURCE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  etherscan: { icon: Globe,    color: 'text-blue-400',    label: 'On-chain' },
  forta:     { icon: Shield,   color: 'text-fort-danger', label: 'Threat Feed' },
  twitter:   { icon: Activity, color: 'text-sky-400',     label: 'Social' },
  discord:   { icon: Activity, color: 'text-indigo-400',  label: 'Social' },
  news:      { icon: Activity, color: 'text-fort-warning',label: 'News' },
  tvl:       { icon: Zap,      color: 'text-fort-cyan',   label: 'TVL' },
};

export default function IntelligencePage() {
  const [feed, setFeed] = useState<any[]>([]);
  const [globalRisk, setGlobalRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSource, setFilterSource] = useState('all');

  const load = useCallback(async () => {
    try {
      const [f, g] = await Promise.all([
        api.get('/api/v1/intelligence/feed'),
        api.get('/api/v1/intelligence/global-risk'),
      ]);
      setFeed(f.data);
      setGlobalRisk(g.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load intelligence feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 30_000);

  const sources = ['all', ...Array.from(new Set(feed.map(s => s.source)))];
  const filtered = filterSource === 'all' ? feed : feed.filter(s => s.source === filterSource);

  const riskColor = (r: number) =>
    r >= 75 ? 'text-red-500' : r >= 50 ? 'text-fort-danger' : r >= 25 ? 'text-fort-warning' : 'text-fort-green';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Intelligence</h1>
          <p className="text-fort-muted text-sm mt-1">Global signal feed · auto-refreshes every 30s</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-xs text-fort-muted border border-fort-border px-3 py-1.5 rounded-lg hover:text-white hover:border-white/20 transition-all">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-fort-danger/10 border border-fort-danger/30 rounded-xl px-4 py-2.5 text-fort-danger text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {globalRisk && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card-fort p-5">
            <p className="text-fort-muted text-xs mb-2">Global Avg Risk</p>
            <p className={`text-3xl font-bold font-mono ${riskColor(globalRisk.avgRisk)}`}>
              {globalRisk.avgRisk}<span className="text-fort-muted text-lg">/100</span>
            </p>
          </div>
          <div className="card-fort p-5">
            <p className="text-fort-muted text-xs mb-2">Critical Events (24h)</p>
            <p className="text-3xl font-bold font-mono text-fort-danger">{globalRisk.criticalCount}</p>
          </div>
          <div className="card-fort p-5">
            <p className="text-fort-muted text-xs mb-2">AI Consensus Samples</p>
            <p className="text-3xl font-bold font-mono text-fort-cyan">{globalRisk.sampleSize}</p>
          </div>
        </div>
      )}

      {/* Source filter pills */}
      {sources.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sources.map(s => {
            const cfg = SOURCE_CONFIG[s];
            return (
              <button key={s}
                onClick={() => setFilterSource(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${
                  filterSource === s
                    ? 'bg-fort-cyan text-fort-bg border-fort-cyan'
                    : 'text-fort-muted border-fort-border hover:border-white/20 hover:text-white'
                }`}>
                {cfg?.label ?? s}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-fort-cyan animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-fort p-12 text-center">
          <Activity className="w-12 h-12 text-fort-muted mx-auto mb-4" />
          <p className="text-white font-semibold">No signals ingested yet</p>
          <p className="text-fort-muted text-sm mt-2">
            Add protocols and configure data sources — signals will begin flowing in automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const cfg = SOURCE_CONFIG[s.source] ?? { icon: Activity, color: 'text-fort-muted', label: s.source };
            const Icon = cfg.icon;
            const content = typeof s.content === 'object'
              ? (s.content.summary ?? s.content.description ?? s.content.title ?? JSON.stringify(s.content).slice(0, 120) + '...')
              : String(s.content ?? '').slice(0, 180);
            return (
              <motion.div key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="card-fort p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-fort-surface flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      s.processed
                        ? 'bg-fort-green/10 text-fort-green'
                        : 'bg-fort-warning/10 text-fort-warning'
                    }`}>
                      {s.processed ? 'Processed' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-white text-sm leading-snug">{content}</p>
                </div>
                <span className="text-fort-muted text-xs flex-shrink-0 mt-0.5">
                  {formatDistanceToNow(new Date(s.ingestedAt), { addSuffix: true })}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
