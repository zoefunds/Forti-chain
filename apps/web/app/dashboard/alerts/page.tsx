'use client';
import { useEffect, useState, useCallback } from 'react';
import { Bell, Mail, Webhook, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatDistanceToNow } from 'date-fns';

const LEVEL_INFO: Record<number, { label: string; badge: string }> = {
  1: { label: 'Warning',    badge: 'fc-badge-low' },
  2: { label: 'Restricted', badge: 'fc-badge-medium' },
  3: { label: 'Emergency',  badge: 'fc-badge-high' },
  4: { label: 'Critical',   badge: 'fc-badge-critical' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/alerts');
      setAlerts(res.data); setError('');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load alerts');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 10_000);

  const delivered = alerts.filter(a => a.delivered).length;
  const failed = alerts.filter(a => !a.delivered).length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#eeeeee]">Alerts</h1>
          <p className="text-xs text-[#8ca4ac] mt-0.5">All dispatched security alerts across your protocols</p>
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

      {!loading && alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Alerts', value: alerts.length, color: '#eeeeee' },
            { label: 'Delivered', value: delivered, color: '#22c55e' },
            { label: 'Failed', value: failed, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="fc-card p-5">
              <p className="fc-label mb-2">{s.label}</p>
              <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 text-[#217eaa] animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="fc-card p-16 text-center">
          <Bell className="w-10 h-10 text-[#1c2229] mx-auto mb-4" />
          <p className="text-[#eeeeee] font-medium mb-1">No alerts yet</p>
          <p className="text-[#8ca4ac] text-xs max-w-xs mx-auto">
            Alerts fire automatically when AI judgments reach Warning level or above.
          </p>
        </div>
      ) : (
        <div className="fc-card overflow-hidden">
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Timestamp</th>
                <th className="fc-th">Channel</th>
                <th className="fc-th">Destination</th>
                <th className="fc-th">Level</th>
                <th className="fc-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => {
                const info = LEVEL_INFO[a.level ?? 1] ?? LEVEL_INFO[1];
                return (
                  <tr key={a.id} className="fc-tr">
                    <td className="fc-td font-mono text-[#8ca4ac] text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(a.sentAt), { addSuffix: true })}
                    </td>
                    <td className="fc-td">
                      <div className="flex items-center gap-2">
                        {a.channel === 'email'
                          ? <Mail className="w-3.5 h-3.5 text-[#217eaa]" />
                          : <Webhook className="w-3.5 h-3.5 text-[#f59e0b]" />
                        }
                        <span className="text-xs capitalize">{a.channel}</span>
                      </div>
                    </td>
                    <td className="fc-td">
                      <span className="font-mono text-xs text-[#8ca4ac] truncate max-w-[180px] block">{a.destination}</span>
                      {!a.delivered && a.lastError && (
                        <span className="text-2xs text-[#ef4444]">{a.lastError}</span>
                      )}
                    </td>
                    <td className="fc-td">
                      <span className={info.badge}>{info.label}</span>
                    </td>
                    <td className="fc-td">
                      {a.delivered
                        ? <span className="flex items-center gap-1.5 text-xs text-[#22c55e] font-mono"><CheckCircle className="w-3.5 h-3.5" />Delivered</span>
                        : <span className="flex items-center gap-1.5 text-xs text-[#ef4444] font-mono"><XCircle className="w-3.5 h-3.5" />Failed</span>
                      }
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
