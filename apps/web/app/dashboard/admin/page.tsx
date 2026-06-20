'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Server, Activity, Bell, Zap, Shield,
  ChevronDown, ChevronUp, RefreshCw, Crown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { usePolling } from '@/lib/usePolling';

const TIER_LABELS = ['Safe', 'Warning', 'Restricted', 'Emergency', 'Critical'];
const TIER_BADGE  = ['fc-badge-secure', 'fc-badge-low', 'fc-badge-medium', 'fc-badge-high', 'fc-badge-critical'];
function tier(level: number) { return Math.min(4, Math.max(0, level - 1)); }

interface AdminStats {
  users: number; protocols: number; judgments: number; alerts: number; signals: number;
  judgmentsByTier: { level: number; count: number }[];
  usersBySubscription: { tier: string; count: number }[];
}
interface AdminUser {
  id: string; email: string; role: string; walletAddress: string;
  subscriptionTier: string; emailVerified: boolean; genBalanceCache: string;
  createdAt: string; protocolCount: number; judgmentCount: number;
}
interface AdminProtocol {
  id: string; name: string; chain: string; category: string;
  riskScore: number; onChainRegistered: boolean; monitoringActive: boolean;
  lastAnalyzedAt: string | null; createdAt: string; userId: string;
  userEmail: string; judgmentCount: number;
}
interface AdminJudgment {
  id: string; protocolId: string; riskScore: number; level: number;
  consensusReached: boolean; contractCallTx: string | null;
  recommendedAction: string | null; createdAt: string;
  protocolName: string; userEmail: string;
}

type Tab = 'overview' | 'users' | 'protocols' | 'judgments';

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [protocols, setProtocols] = useState<AdminProtocol[]>([]);
  const [judgments, setJudgments] = useState<AdminJudgment[]>([]);
  const [error, setError]         = useState('');
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  // Guard: only admins
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [user]);

  const load = useCallback(async () => {
    try {
      const [s, u, p, j] = await Promise.all([
        api.get('/api/v1/admin/stats'),
        api.get('/api/v1/admin/users'),
        api.get('/api/v1/admin/protocols'),
        api.get('/api/v1/admin/judgments?limit=100'),
      ]);
      setStats(s.data);
      setUsers(u.data);
      setProtocols(p.data);
      setJudgments(j.data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Failed to load admin data');
    }
  }, []);

  useEffect(() => { load(); }, []);
  usePolling(load, 10_000);

  const toggleRole = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    setRoleLoading(u.id);
    try {
      await api.patch(`/api/v1/admin/users/${u.id}/role`, { role: newRole });
      await load();
    } catch {}
    setRoleLoading(null);
  };

  const statCards = stats ? [
    { label: 'Total Users',     value: stats.users,     icon: Users,    color: '#217eaa' },
    { label: 'Protocols',       value: stats.protocols, icon: Server,   color: '#7d9cb7' },
    { label: 'AI Judgments',    value: stats.judgments, icon: Activity, color: '#22c55e' },
    { label: 'Alerts Sent',     value: stats.alerts,    icon: Bell,     color: '#f59e0b' },
    { label: 'Signals Ingested',value: stats.signals,   icon: Zap,      color: '#8ca4ac' },
  ] : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Overview' },
    { id: 'users',     label: `Users (${users.length})` },
    { id: 'protocols', label: `Protocols (${protocols.length})` },
    { id: 'judgments', label: `Judgments (${judgments.length})` },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-[#f59e0b]" />
            <h1 className="text-lg font-semibold text-[#eeeeee]">Admin Panel</h1>
          </div>
          <p className="text-xs text-[#8ca4ac] mt-0.5">Platform-wide oversight · auto-refreshes every 10s</p>
        </div>
        <button onClick={load} className="btn-ghost gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="fc-card border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-[#ef4444] text-xs font-mono">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1c2229]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-mono transition-colors border-b-2 -mb-px ${
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            {/* Judgments by tier */}
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

            {/* Users by subscription */}
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

      {/* Users */}
      {tab === 'users' && (
        <div className="fc-card overflow-hidden">
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Email</th>
                <th className="fc-th">Role</th>
                <th className="fc-th">Subscription</th>
                <th className="fc-th">Protocols</th>
                <th className="fc-th">Judgments</th>
                <th className="fc-th">Wallet</th>
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
                      <span className="text-[#eeeeee] text-xs">{u.email}</span>
                    </div>
                  </td>
                  <td className="fc-td">
                    <span className={`fc-badge ${u.role === 'admin' ? 'fc-badge-live' : 'fc-badge-info'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="fc-td">
                    <span className="fc-label capitalize">{u.subscriptionTier ?? 'free'}</span>
                  </td>
                  <td className="fc-td font-mono text-xs text-[#eeeeee]">{u.protocolCount}</td>
                  <td className="fc-td font-mono text-xs text-[#eeeeee]">{u.judgmentCount}</td>
                  <td className="fc-td font-mono text-2xs text-[#8ca4ac]">
                    {u.walletAddress.slice(0, 6)}…{u.walletAddress.slice(-4)}
                  </td>
                  <td className="fc-td text-xs text-[#8ca4ac]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="fc-td">
                    <button
                      disabled={roleLoading === u.id}
                      onClick={() => toggleRole(u)}
                      className="btn-ghost text-2xs py-1 px-2 text-[#8ca4ac] hover:text-[#eeeeee]">
                      {roleLoading === u.id ? '…' : u.role === 'admin' ? 'Demote' : 'Promote'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Protocols */}
      {tab === 'protocols' && (
        <div className="fc-card overflow-hidden">
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Protocol</th>
                <th className="fc-th">Chain</th>
                <th className="fc-th">Category</th>
                <th className="fc-th">Risk Score</th>
                <th className="fc-th">On-Chain</th>
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
        <div className="fc-card overflow-hidden">
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
                    <td className="fc-td text-xs text-[#8ca4ac]">
                      {new Date(j.createdAt).toLocaleString()}
                    </td>
                    <td className="fc-td text-xs text-[#eeeeee] font-medium">{j.protocolName ?? '—'}</td>
                    <td className="fc-td text-2xs text-[#8ca4ac]">{j.userEmail ?? '—'}</td>
                    <td className="fc-td font-mono text-xs font-bold" style={{
                      color: j.riskScore >= 80 ? '#ef4444' : j.riskScore >= 60 ? '#f97316' :
                             j.riskScore >= 40 ? '#f59e0b' : j.riskScore >= 20 ? '#7d9cb7' : '#22c55e'
                    }}>{j.riskScore}</td>
                    <td className="fc-td">
                      <span className={`fc-badge ${TIER_BADGE[t]}`}>{TIER_LABELS[t]}</span>
                    </td>
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
