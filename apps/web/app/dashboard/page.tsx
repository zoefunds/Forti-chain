'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RefreshCw, Globe, Shield, Activity, TrendingUp, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatDistanceToNow } from 'date-fns';

const RISK_COLOR = (s: number) =>
  s >= 75 ? '#ef4444' : s >= 50 ? '#f97316' : s >= 25 ? '#f59e0b' : '#22c55e';

const TIER_LABELS = ['Safe', 'Warning', 'Restricted', 'Emergency', 'Critical'];
const TIER_BADGE = ['fc-badge-secure', 'fc-badge-low', 'fc-badge-medium', 'fc-badge-high', 'fc-badge-critical'];

export default function DashboardPage() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [globalRisk, setGlobalRisk] = useState({ avgRisk: 0, criticalCount: 0 });
  const [judgments, setJudgments] = useState<any[]>([]);
  const [contractStats, setContractStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, g, j, cs] = await Promise.all([
        api.get('/api/v1/protocols').then(r => r.data).catch(() => []),
        api.get('/api/v1/intelligence/global-risk').then(r => r.data).catch(() => ({ avgRisk: 0, criticalCount: 0 })),
        api.get('/api/v1/judgments').then(r => r.data).catch(() => []),
        api.get('/api/v1/protocols/contract-stats').then(r => r.data).catch(() => null),
      ]);
      setProtocols(p); setGlobalRisk(g); setJudgments(j); setContractStats(cs);
      setLastUpdated(new Date());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 30_000);

  const active = protocols.filter(p => p.monitoringActive).length;
  const high = protocols.filter(p => p.riskScore >= 50).length;

  const statCards = [
    { label: 'Protocols Monitored', value: loading ? '—' : active, sub: `${protocols.length} total`, color: '#217eaa', icon: Shield },
    { label: 'Global Avg Risk', value: loading ? '—' : `${globalRisk.avgRisk ?? 0}/100`, sub: 'Aggregated', color: RISK_COLOR(globalRisk.avgRisk ?? 0), icon: TrendingUp },
    { label: 'Critical Events', value: loading ? '—' : (globalRisk.criticalCount ?? 0), sub: 'Last 7 days', color: '#ef4444', icon: Activity },
    { label: 'AI Judgments', value: loading ? '—' : (contractStats?.stats?.totalJudgments ?? judgments.length), sub: 'On-chain', color: '#22c55e', icon: Globe },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#eeeeee]">Security Overview</h1>
          <p className="text-xs text-[#8ca4ac] mt-0.5">Real-time threat intelligence across all monitored protocols</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="fc-badge-live"><span className="dot-live" />System: Live</div>
          <button onClick={load} className="btn-ghost text-xs gap-1.5 border border-[#1c2229]">
            <RefreshCw className="w-3 h-3" />
            {lastUpdated ? formatDistanceToNow(lastUpdated, { addSuffix: true }) : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Contract status bar */}
      {contractStats?.available && (
        <div className="fc-card px-4 py-3 flex items-center gap-3">
          <span className="dot-live" />
          <span className="fc-label">Sentinel Contract</span>
          <span className="font-mono text-xs text-[#217eaa]">
            {contractStats.contractAddress?.slice(0, 10)}…{contractStats.contractAddress?.slice(-6)}
          </span>
          <span className="ml-auto text-xs text-[#8ca4ac] font-mono">
            {contractStats.stats?.totalJudgments ?? 0} on-chain judgments
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="fc-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="fc-label">{s.label}</span>
              <s.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: s.color }} />
            </div>
            <div className="font-mono text-2xl font-semibold tabular-nums" style={{ color: s.color }}>
              {s.value}
            </div>
            <p className="text-2xs text-[#8ca4ac] mt-1 font-mono">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* High risk alert */}
      {high > 0 && (
        <div className="fc-card border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 flex items-center gap-3">
          <span className="dot-danger" />
          <span className="text-xs text-[#ef4444] font-mono">
            {high} protocol{high > 1 ? 's' : ''} with risk ≥ 50 — immediate review recommended
          </span>
          <Link href="/dashboard/protocols" className="ml-auto text-xs text-[#ef4444] hover:underline flex items-center gap-1">
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Protocol risk list */}
        <div className="lg:col-span-2 fc-card">
          <div className="px-5 py-4 border-b border-[#1c2229] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#217eaa]" />
              <span className="text-sm font-medium text-[#eeeeee]">Protocol Risk</span>
            </div>
            <span className="fc-label">{protocols.length} tracked</span>
          </div>
          <div className="divide-y divide-[#1c2229]/50">
            {protocols.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Shield className="w-8 h-8 text-[#1c2229] mx-auto mb-3" />
                <p className="text-xs text-[#8ca4ac] font-mono">No protocols yet</p>
                <Link href="/dashboard/protocols" className="text-2xs text-[#217eaa] hover:underline mt-1 block">Add protocol →</Link>
              </div>
            ) : protocols.slice(0, 6).map(p => (
              <Link href={`/dashboard/protocols/${p.id}`} key={p.id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#1c2229]/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#eeeeee] truncate">{p.name}</p>
                  <p className="text-2xs text-[#8ca4ac] font-mono capitalize">{p.chain}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-xs font-semibold" style={{ color: RISK_COLOR(p.riskScore ?? 0) }}>
                    {String(Math.round(p.riskScore ?? 0)).padStart(2, '0')}
                  </p>
                  <div className="risk-bar-track w-16 mt-1">
                    <div className="h-full rounded-full"
                      style={{ width: `${p.riskScore ?? 0}%`, backgroundColor: RISK_COLOR(p.riskScore ?? 0) }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {protocols.length > 0 && (
            <div className="px-5 py-3 border-t border-[#1c2229]">
              <Link href="/dashboard/protocols"
                className="text-2xs font-mono uppercase tracking-widest text-[#217eaa] hover:text-[#7d9cb7] flex items-center gap-1">
                View all {protocols.length} protocols <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent judgments */}
        <div className="lg:col-span-3 fc-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1c2229] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#217eaa]" />
              <span className="text-sm font-medium text-[#eeeeee]">Recent AI Judgments</span>
            </div>
            <span className="fc-label">{judgments.length} total</span>
          </div>
          {judgments.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-8 h-8 text-[#1c2229] mx-auto mb-3" />
              <p className="text-xs text-[#8ca4ac] font-mono">No judgments yet — add a protocol and click Analyze</p>
            </div>
          ) : (
            <table className="fc-table">
              <thead>
                <tr>
                  <th className="fc-th">Time</th>
                  <th className="fc-th">Protocol</th>
                  <th className="fc-th">Risk</th>
                  <th className="fc-th">Tier</th>
                  <th className="fc-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {judgments.slice(0, 7).map(j => {
                  const tier = Math.min(4, Math.max(0, (j.level ?? 1) - 1));
                  const score = j.riskScore ?? 0;
                  return (
                    <tr key={j.id} className="fc-tr">
                      <td className="fc-td font-mono text-[#8ca4ac] text-xs whitespace-nowrap">
                        {new Date(j.createdAt).toLocaleTimeString('en-US', { hour12: false })}
                      </td>
                      <td className="fc-td font-medium text-xs max-w-[120px] truncate">{j.protocolName ?? '—'}</td>
                      <td className="fc-td">
                        <span className="font-mono text-sm font-semibold" style={{ color: RISK_COLOR(score) }}>
                          {String(Math.round(score)).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="fc-td">
                        <span className={TIER_BADGE[tier]}>{TIER_LABELS[tier]}</span>
                      </td>
                      <td className="fc-td">
                        {j.consensusReached
                          ? <span className="flex items-center gap-1.5 text-xs text-[#22c55e] font-mono"><span className="dot-live" />Done</span>
                          : <span className="flex items-center gap-1.5 text-xs text-[#8ca4ac] font-mono"><span className="dot-dead" />Pending</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
