'use client';
import { useEffect, useState, useCallback } from 'react';
import { Activity, Globe, Shield, RefreshCw, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatDistanceToNow } from 'date-fns';

const SOURCE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  etherscan: { icon: Globe,    color: 'text-[#217eaa]',  label: 'On-chain' },
  forta:     { icon: Shield,   color: 'text-[#ef4444]',  label: 'Threat Feed' },
  twitter:   { icon: Activity, color: 'text-[#7d9cb7]',  label: 'Social' },
  discord:   { icon: Activity, color: 'text-[#8ca4ac]',  label: 'Social' },
  news:      { icon: Activity, color: 'text-[#f59e0b]',  label: 'News' },
  tvl:       { icon: Zap,      color: 'text-[#217eaa]',  label: 'TVL' },
};

const RISK_COLOR = (r: number) =>
  r >= 75 ? '#ef4444' : r >= 50 ? '#f97316' : r >= 25 ? '#f59e0b' : '#22c55e';

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
      setFeed(f.data); setGlobalRisk(g.data); setError('');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load feed');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 10_000);

  const sources = ['all', ...Array.from(new Set(feed.map(s => s.source)))];
  const filtered = filterSource === 'all' ? feed : feed.filter(s => s.source === filterSource);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#eeeeee]">Threat Intelligence</h1>
          <p className="text-xs text-[#8ca4ac] mt-0.5">Global signal feed · auto-refreshes every 10s</p>
        </div>
        <button onClick={load} className="btn-ghost text-xs gap-1.5 border border-[#1c2229]">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {error && (
        <div className="fc-card border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 flex items-center gap-2 text-[#ef4444] text-xs">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {globalRisk && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Global Avg Risk', value: globalRisk.avgRisk, unit: '/100', color: RISK_COLOR(globalRisk.avgRisk) },
            { label: 'Critical Events (24h)', value: globalRisk.criticalCount, unit: '', color: '#ef4444' },
            { label: 'AI Consensus Samples', value: globalRisk.sampleSize, unit: '', color: '#217eaa' },
          ].map(s => (
            <div key={s.label} className="fc-card p-5">
              <p className="fc-label mb-2">{s.label}</p>
              <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: s.color }}>
                {s.value}<span className="text-[#8ca4ac] text-sm font-normal">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {sources.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sources.map(s => {
            const cfg = SOURCE_CONFIG[s];
            const active = filterSource === s;
            return (
              <button key={s} onClick={() => setFilterSource(s)}
                className={`text-2xs px-3 py-1.5 rounded border transition-all font-mono uppercase tracking-widest ${
                  active
                    ? 'bg-[#217eaa] text-white border-[#217eaa]'
                    : 'text-[#8ca4ac] border-[#1c2229] hover:border-[#217eaa]/40 hover:text-[#eeeeee]'
                }`}>
                {cfg?.label ?? s}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 text-[#217eaa] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="fc-card p-16 text-center">
          <Activity className="w-10 h-10 text-[#1c2229] mx-auto mb-4" />
          <p className="text-[#eeeeee] font-medium mb-1">No signals ingested yet</p>
          <p className="text-[#8ca4ac] text-xs">Add protocols and configure data sources — signals will begin flowing in automatically.</p>
        </div>
      ) : (
        <div className="fc-card overflow-hidden">
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Source</th>
                <th className="fc-th">Signal</th>
                <th className="fc-th">Status</th>
                <th className="fc-th">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const cfg = SOURCE_CONFIG[s.source] ?? { icon: Activity, color: 'text-[#8ca4ac]', label: s.source };
                const Icon = cfg.icon;
                const content = typeof s.content === 'object'
                  ? (s.content.summary ?? s.content.description ?? s.content.title ?? JSON.stringify(s.content).slice(0, 100) + '…')
                  : String(s.content ?? '').slice(0, 160);
                return (
                  <tr key={s.id} className="fc-tr">
                    <td className="fc-td whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.color}`} />
                        <span className="fc-label">{cfg.label}</span>
                      </div>
                    </td>
                    <td className="fc-td max-w-[320px]">
                      <p className="text-xs text-[#eeeeee] leading-snug line-clamp-2">{content}</p>
                    </td>
                    <td className="fc-td whitespace-nowrap">
                      {s.processed
                        ? <span className="fc-badge-secure">Processed</span>
                        : <span className="fc-badge-medium">Pending</span>
                      }
                    </td>
                    <td className="fc-td whitespace-nowrap">
                      <span className="text-xs text-[#8ca4ac] font-mono">
                        {formatDistanceToNow(new Date(s.ingestedAt), { addSuffix: true })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
