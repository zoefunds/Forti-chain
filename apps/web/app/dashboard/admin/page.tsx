'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Server, Activity, Bell, Zap,
  RefreshCw, Crown, Download, Ban, CheckCircle,
  MemoryStick, Clock, AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { usePolling } from '@/lib/usePolling';

const TIER_LABELS = ['Safe', 'Warning', 'Restricted', 'Emergency', 'Critical'];
const TIER_BADGE  = ['fc-badge-secure', 'fc-badge-low', 'fc-badge-medium', 'fc-badge-high', 'fc-badge-critical'];
function tier(level: number) { return Math.min(4, Math.max(0, level - 1)); }

interface AdminStats {
  users: number; protocols: number; judgments: number; alerts: number; signals: number;
  suspended: number; unverified: number; notifications: number;
  judgmentsByTier: { level: number; count: number }[];
  usersBySubscription: { tier: string; count: number }[];
}
interface WorkerStatus { lastRun: string | null; runs: number; errors: number }
interface AdminHealth {
  api: { status: string; uptime: number; memoryMB: number };
  workers: { signalIngestion: WorkerStatus; analysis: WorkerStatus; genBalanceSync: WorkerStatus };
  timestamp: string;
}
interface AdminUser {
  id: string; email: string; role: string; walletAddress: string;
  subscriptionTier: string; emailVerified: boolean; genBalanceCache: string;
  suspended: boolean; createdAt: string; protocolCount: number; judgmentCount: number;
}
interface AdminProtocol {
  id: string; name: string; chain: string; category: string;
  riskScore: number; onChainRegistered: boolean; monitoringActive: boolean;
  autoAnalyzeIntervalHours: number; lastAnalyzedAt: string | null;
  createdAt: string; userId: string; userEmail: string; judgmentCount: number;
}
interface AdminJudgment {
  id: string; protocolId: string; riskScore: number; level: number;
  consensusReached: boolean; contractCallTx: string | null;
  recommendedAction: string | null; createdAt: string;
  protocolName: string; userEmail: string;
}

type Tab = 'overview' | 'health' | 'users' | 'protocols' | 'judgments';

function uptimeStr(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab]             = useState<Tab>('overview');
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [health, setHealth]       = useState<AdminHealth | null>(null);
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [protocols, setProtocols] = useState<AdminProtocol[]>([]);
  const [judgments, setJudgments] = useState<AdminJudgment[]>([]);
  const [error, setError]         = useState('');
  const [roleLoading, setRoleLoading]       = useState<string | null>(null);
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [user]);

  const load = useCallback(async () => {
    try {
      const [s, h, u, p, j] = await Promise.all([
        api.get('/api/v1/admin/stats'),
        api.get('/api/v1/admin/health'),
        api.get('/api/v1/admin/users'),
        api.get('/api/v1/admin/protocols'),
        api.get('/api/v1/admin/judgments?limit=100'),
      ]);
      setStats(s.data); setHealth(h.data); setUsers(u.data); setProtocols(p.data); setJudgments(j.data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message ?? 'Failed to load admin data');
    }
  }, []);

  useEffect(() => { load(); }, []);
  usePolling(load, 10_000);

  const toggleRole = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    setRoleLoading(u.id);
    try { await api.patch(`/api/v1/admin/users/${u.id}/role`, { role: newRole }); await load(); } catch {}
    setRoleLoading(null);
  };

  const toggleSuspend = async (u: AdminUser) => {
    setSuspendLoading(u.id);
    try { await api.patch(`/api/v1/admin/users/${u.id}/suspend`, { suspended: !u.suspended }); await load(); } catch {}
    setSuspendLoading(null);
  };

  const downloadCSV = async (filename: string) => {
    try {
      const { data } = await api.get(`/api/v1/admin/export/${filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  const statCards = stats ? [
    { label: 'Total Users',      value: stats.users,         icon: Users,    color: '#217eaa' },
    { label: 'Protocols',        value: stats.protocols,     icon: Server,   color: '#7d9cb7' },
    { label: 'AI Judgments',     value: stats.judgments,     icon: Activity, color: '#22c55e' },
    { label: 'Alerts Sent',      value: stats.alerts,        icon: Bell,     color: '#f59e0b' },
    { label: 'Signals Ingested', value: stats.signals,       icon: Zap,      color: '#8ca4ac' },
    { label: 'Suspended',        value: stats.suspended,     icon: Ban,      color: '#ef4444' },
    { label: 'Unverified',       value: stats.unverified,    icon: AlertTriangle, color: '#f97316' },
    { label: 'Notifications',    value: stats.notifications, icon: Bell,     color: '#8b5cf6' },
  ] : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Overview' },
    { id: 'health',    label: 'System Health' },
    { id: 'users',     label: `Users (${users.length})` },
    { id: 'protocols', label: `Protocols (${protocols.length})` },
    { id: 'judgments', label: `Judgments (${judgments.length})` },
  ];

  const workerRow = (name: string, w?: WorkerStatus) => (
    <div key={name} className="flex items-center justify-between py-3 border-b border-[#1c2229] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${w?.errors === 0 ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
        <span className="text-xs font-mono text-[#eeeeee]">{name}</span>
      </div>
      <div className="flex gap-6 text-2xs font-mono text-[#8ca4ac]">
        <span>runs: <span className="text-[#eeeeee]">{w?.runs ?? 0}</span></span>
        <span>errors: <span className={w?.errors ? 'text-[#ef4444]' : 'text-[#eeeeee]'}>{w?.errors ?? 0}</span></span>
        <span>last: <span className="text-[#eeeeee]">{w?.lastRun ? new Date(w.lastRun).toLocaleTimeString() : 'never'}</span></span>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-[#f59e0b]" />
            <h1 className="text-lg font-semibold text-[#eeeeee]">Admin Panel</h1>
          </div>
          <p className="text-xs text-[#8ca4ac]">Platform-wide oversight · auto-refreshes every 10s</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV('users.csv')} className="btn-ghost gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Users
          </button>
          <button onClick={() => downloadCSV('protocols.csv')} className="btn-ghost gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Protocols
          </button>
          <button onClick={() => downloadCSV('judgments.csv')} className="btn-ghost gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Judgments
          </button>
          <button onClick={load} className="btn-ghost gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="fc-card border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-[#ef4444] text-xs font-mono">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1c2229] overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-mono whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-[#217eaa] text-[#217eaa]'
                : 'border-transparent text-[#8ca4ac] hover:text-[#eeeeee]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(s => (
              <div key={s.label} className="fc-card p-4">
                <s.icon className="w-4 h-4 mb-2" style={{ color: s.color }} />
                <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: s.color }}>
                  {s.value.toLocaleString()}
                </div>
                <div className="text-[#8ca4ac] text-2xs mt-1 font-mono">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="fc-card p-5">
              <h3 className="fc-label mb-4">Judgments by Tier</h3>
              <div className="space-y-2">
                {[1,2,3,4,5].map(level => {
                  const t = level - 1;
                  const count = stats?.judgmentsByTier.find(j => j.level === level)?.count ?? 0;
                  const max = Math.max(...(stats?.judgmentsByTier.map(j => j.count) ?? [1]), 1);
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className={`fc-badge ${TIER_BADGE[t]} w-20 text-center`}>{TIER_LABELS[t]}</span>
                      <div className="flex-1 h-1.5 bg-[#1c2229] rounded-full overflow-hidden">
                        <div className="h-full bg-[#217eaa] rounded-full transition-all"
                          style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                      <span className="font-mono text-xs text-[#8ca4ac] w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fc-card p-5">
              <h3 className="fc-label mb-4">Users by Subscription</h3>
              <div className="space-y-3">
                {(stats?.usersBySubscription ?? []).map(s => (
                  <div key={s.tier} className="flex items-center justify-between">
                    <span className="fc-label capitalize">{s.tier ?? 'free'}</span>
                    <span className="font-mono text-sm text-[#eeeeee] font-bold">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Health */}
      {tab === 'health' && health && (
        <div className="space-y-6">
          {/* API vitals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="fc-card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <p className="text-2xs font-mono text-[#8ca4ac] uppercase">API Status</p>
                <p className="text-sm font-semibold text-[#22c55e] mt-0.5 capitalize">{health.api.status}</p>
              </div>
            </div>
            <div className="fc-card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-[#217eaa]/10 border border-[#217eaa]/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#217eaa]" />
              </div>
              <div>
                <p className="text-2xs font-mono text-[#8ca4ac] uppercase">Uptime</p>
                <p className="text-sm font-semibold text-[#eeeeee] mt-0.5">{uptimeStr(health.api.uptime)}</p>
              </div>
            </div>
            <div className="fc-card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-[#8ca4ac]/10 border border-[#8ca4ac]/20 flex items-center justify-center">
                <MemoryStick className="w-4 h-4 text-[#8ca4ac]" />
              </div>
              <div>
                <p className="text-2xs font-mono text-[#8ca4ac] uppercase">Memory (RSS)</p>
                <p className="text-sm font-semibold text-[#eeeeee] mt-0.5">{health.api.memoryMB} MB</p>
              </div>
            </div>
          </div>

          {/* Workers */}
          <div className="fc-card p-5">
            <h3 className="fc-label mb-4">Background Workers</h3>
            {workerRow('Signal Ingestion', health.workers.signalIngestion)}
            {workerRow('Analysis', health.workers.analysis)}
            {workerRow('GEN Balance Sync', health.workers.genBalanceSync)}
          </div>

          <p className="text-2xs font-mono text-[#8ca4ac]">
            Last refreshed: {new Date(health.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="fc-card overflow-x-auto">
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Email</th>
                <th className="fc-th">Role</th>
                <th className="fc-th">Status</th>
                <th className="fc-th">Subscription</th>
                <th className="fc-th">Protocols</th>
                <th className="fc-th">Judgments</th>
                <th className="fc-th">Joined</th>
                <th className="fc-th"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="fc-tr">
                  <td className="fc-td">
                    <div className="flex items-center gap-2">
                      {u.role === 'admin' && <Crown className="w-3 h-3 text-[#f59e0b] flex-shrink-0" />}
                      <span className={`text-xs ${u.suspended ? 'line-through text-[#8ca4ac]' : 'text-[#eeeeee]'}`}>{u.email}</span>
                    </div>
                  </td>
                  <td className="fc-td">
                    <span className={`fc-badge ${u.role === 'admin' ? 'fc-badge-live' : 'fc-badge-info'}`}>{u.role}</span>
                  </td>
                  <td className="fc-td">
                    {u.suspended
                      ? <span className="fc-badge fc-badge-critical">Suspended</span>
                      : <span className="fc-badge fc-badge-secure">Active</span>}
                  </td>
                  <td className="fc-td"><span className="fc-label capitalize">{u.subscriptionTier ?? 'free'}</span></td>
                  <td className="fc-td font-mono text-xs text-[#eeeeee]">{u.protocolCount}</td>
                  <td className="fc-td font-mono text-xs text-[#eeeeee]">{u.judgmentCount}</td>
                  <td className="fc-td text-xs text-[#8ca4ac]">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="fc-td">
                    <div className="flex gap-1">
                      <button
                        disabled={roleLoading === u.id}
                        onClick={() => toggleRole(u)}
                        className="btn-ghost text-2xs py-1 px-2 text-[#8ca4ac] hover:text-[#eeeeee]">
                        {roleLoading === u.id ? '…' : u.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        disabled={suspendLoading === u.id}
                        onClick={() => toggleSuspend(u)}
                        className={`btn-ghost text-2xs py-1 px-2 ${u.suspended ? 'text-[#22c55e] hover:text-[#eeeeee]' : 'text-[#ef4444] hover:text-[#eeeeee]'}`}>
                        {suspendLoading === u.id ? '…' : u.suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Protocols */}
      {tab === 'protocols' && (
        <div className="fc-card overflow-x-auto">
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Protocol</th>
                <th className="fc-th">Chain</th>
                <th className="fc-th">Category</th>
                <th className="fc-th">Risk Score</th>
                <th className="fc-th">On-Chain</th>
                <th className="fc-th">Auto-Analyze</th>
                <th className="fc-th">Judgments</th>
                <th className="fc-th">Owner</th>
                <th className="fc-th">Last Analyzed</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map(p => (
                <tr key={p.id} className="fc-tr">
                  <td className="fc-td text-[#eeeeee] text-xs font-medium">{p.name}</td>
                  <td className="fc-td"><span className="fc-badge fc-badge-info">{p.chain}</span></td>
                  <td className="fc-td text-xs text-[#8ca4ac] capitalize">{p.category}</td>
                  <td className="fc-td">
                    <span className="font-mono text-xs font-bold" style={{
                      color: p.riskScore >= 80 ? '#ef4444' : p.riskScore >= 60 ? '#f97316' :
                             p.riskScore >= 40 ? '#f59e0b' : p.riskScore >= 20 ? '#7d9cb7' : '#22c55e'
                    }}>{p.riskScore}</span>
                  </td>
                  <td className="fc-td">
                    <span className={`fc-badge ${p.onChainRegistered ? 'fc-badge-secure' : 'fc-badge-medium'}`}>
                      {p.onChainRegistered ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="fc-td text-xs text-[#8ca4ac] font-mono">
                    {p.autoAnalyzeIntervalHours > 0 ? `${p.autoAnalyzeIntervalHours}h` : 'Off'}
                  </td>
                  <td className="fc-td font-mono text-xs text-[#eeeeee]">{p.judgmentCount}</td>
                  <td className="fc-td text-2xs text-[#8ca4ac]">{p.userEmail}</td>
                  <td className="fc-td text-xs text-[#8ca4ac]">
                    {p.lastAnalyzedAt ? new Date(p.lastAnalyzedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Judgments */}
      {tab === 'judgments' && (
        <div className="fc-card overflow-x-auto">
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Time</th>
                <th className="fc-th">Protocol</th>
                <th className="fc-th">User</th>
                <th className="fc-th">Risk</th>
                <th className="fc-th">Tier</th>
                <th className="fc-th">Consensus</th>
                <th className="fc-th">Tx</th>
              </tr>
            </thead>
            <tbody>
              {judgments.map(j => {
                const t = tier(j.level);
                return (
                  <tr key={j.id} className="fc-tr">
                    <td className="fc-td text-xs text-[#8ca4ac]">{new Date(j.createdAt).toLocaleString()}</td>
                    <td className="fc-td text-xs text-[#eeeeee] font-medium">{j.protocolName ?? '—'}</td>
                    <td className="fc-td text-2xs text-[#8ca4ac]">{j.userEmail ?? '—'}</td>
                    <td className="fc-td font-mono text-xs font-bold" style={{
                      color: j.riskScore >= 80 ? '#ef4444' : j.riskScore >= 60 ? '#f97316' :
                             j.riskScore >= 40 ? '#f59e0b' : j.riskScore >= 20 ? '#7d9cb7' : '#22c55e'
                    }}>{j.riskScore}</td>
                    <td className="fc-td"><span className={`fc-badge ${TIER_BADGE[t]}`}>{TIER_LABELS[t]}</span></td>
                    <td className="fc-td">
                      <span className={`fc-badge ${j.consensusReached ? 'fc-badge-secure' : 'fc-badge-medium'}`}>
                        {j.consensusReached ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="fc-td font-mono text-2xs text-[#8ca4ac]">
                      {j.contractCallTx ? `${j.contractCallTx.slice(0, 10)}…` : '—'}
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
