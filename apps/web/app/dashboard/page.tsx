'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Activity, TrendingUp, Server, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { RiskChart } from '@/components/charts/RiskChart';
import { RecentJudgments } from '@/components/monitoring/RecentJudgments';
import { GlobalThreatMap } from '@/components/monitoring/GlobalThreatMap';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [globalRisk, setGlobalRisk] = useState({ avgRisk: 0, criticalCount: 0, sampleSize: 0 });
  const [judgments, setJudgments] = useState<any[]>([]);
  const [contractStats, setContractStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, g, j, cs] = await Promise.all([
        api.get('/api/v1/protocols').then(r => r.data).catch(() => []),
        api.get('/api/v1/intelligence/global-risk').then(r => r.data).catch(() => ({ avgRisk: 0, criticalCount: 0, sampleSize: 0 })),
        api.get('/api/v1/judgments').then(r => r.data).catch(() => []),
        api.get('/api/v1/protocols/contract-stats').then(r => r.data).catch(() => null),
      ]);
      setProtocols(p);
      setGlobalRisk(g);
      setJudgments(j);
      setContractStats(cs);
      setLastUpdated(new Date());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 30_000); // refresh every 30s

  const activeProtocols = protocols.filter(p => p.monitoringActive).length;
  const highRisk = protocols.filter(p => p.riskScore >= 50).length;
  const riskColor = (s: number) => s >= 75 ? 'text-red-500' : s >= 50 ? 'text-fort-danger' : s >= 25 ? 'text-fort-warning' : 'text-fort-green';

  const stats = [
    { label: 'Protocols Monitored', value: activeProtocols, icon: Server, color: 'text-fort-cyan', border: 'border-fort-cyan/20' },
    { label: 'Global Avg Risk', value: `${globalRisk.avgRisk}/100`, icon: TrendingUp, color: riskColor(globalRisk.avgRisk), border: 'border-fort-warning/20' },
    { label: 'Critical Events', value: globalRisk.criticalCount, icon: AlertTriangle, color: 'text-fort-danger', border: 'border-fort-danger/20' },
    { label: 'AI Judgments (on-chain)', value: contractStats?.stats?.totalJudgments ?? judgments.length, icon: Activity, color: 'text-fort-green', border: 'border-fort-green/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Overview</h1>
          <p className="text-fort-muted text-sm mt-1">Real-time threat intelligence across all monitored protocols</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-fort-muted text-xs">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
          <button onClick={load}
            className="flex items-center gap-1.5 text-xs text-fort-muted border border-fort-border px-3 py-1.5 rounded-lg hover:text-white hover:border-white/20 transition-all">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* On-chain contract badge */}
      {contractStats?.available && (
        <div className="flex items-center gap-2 text-xs bg-fort-green/5 border border-fort-green/20 rounded-xl px-4 py-2.5">
          <span className="w-2 h-2 rounded-full bg-fort-green animate-pulse" />
          <span className="text-fort-green font-medium">FortiChain Sentinel live on GenLayer StudioNet</span>
          <span className="text-fort-muted font-mono">{contractStats.contractAddress?.slice(0, 10)}...{contractStats.contractAddress?.slice(-6)}</span>
          <span className="ml-auto text-fort-muted">{contractStats.stats?.totalJudgments ?? 0} on-chain judgments · {contractStats.stats?.totalProtocols ?? 0} registered protocols</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`card-fort p-5 border ${s.border}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-fort-muted text-xs">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* High risk alert bar */}
      {highRisk > 0 && (
        <div className="flex items-center gap-3 bg-fort-danger/10 border border-fort-danger/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-fort-danger flex-shrink-0" />
          <span className="text-fort-danger text-sm font-medium">
            {highRisk} protocol{highRisk > 1 ? 's' : ''} with risk score ≥ 50 — review recommended
          </span>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-fort p-6">
          <h2 className="text-white font-semibold mb-4">Protocol Risk Scores</h2>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Shield className="w-6 h-6 text-fort-cyan animate-pulse" />
            </div>
          ) : protocols.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-fort-muted text-sm">No protocols yet</div>
          ) : (
            <RiskChart protocols={protocols} />
          )}
        </div>
        <div className="card-fort p-6">
          <h2 className="text-white font-semibold mb-4">Global Threat Map</h2>
          <GlobalThreatMap protocols={protocols} />
        </div>
      </div>

      {/* Recent Judgments */}
      <div className="card-fort p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent AI Judgments</h2>
          <span className="text-fort-muted text-xs">{judgments.length} total</span>
        </div>
        {judgments.length === 0 ? (
          <div className="text-center py-10">
            <Activity className="w-10 h-10 text-fort-muted mx-auto mb-3" />
            <p className="text-fort-muted text-sm">No judgments yet — add a protocol and click Analyze</p>
          </div>
        ) : (
          <RecentJudgments judgments={judgments.slice(0, 10)} />
        )}
      </div>
    </div>
  );
}
