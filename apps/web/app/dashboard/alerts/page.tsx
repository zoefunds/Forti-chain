'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, Webhook, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatDistanceToNow } from 'date-fns';

const LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Warning',   color: 'text-yellow-400' },
  2: { label: 'Restricted',color: 'text-fort-warning' },
  3: { label: 'Emergency', color: 'text-fort-danger' },
  4: { label: 'Critical',  color: 'text-red-500' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/alerts');
      setAlerts(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 30_000);

  const delivered = alerts.filter(a => a.delivered).length;
  const failed = alerts.filter(a => !a.delivered).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-fort-muted text-sm mt-1">All dispatched security alerts across your protocols</p>
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

      {!loading && alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card-fort p-4">
            <p className="text-fort-muted text-xs mb-1">Total Alerts</p>
            <p className="text-2xl font-bold font-mono text-white">{alerts.length}</p>
          </div>
          <div className="card-fort p-4">
            <p className="text-fort-muted text-xs mb-1">Delivered</p>
            <p className="text-2xl font-bold font-mono text-fort-green">{delivered}</p>
          </div>
          <div className="card-fort p-4">
            <p className="text-fort-muted text-xs mb-1">Failed</p>
            <p className="text-2xl font-bold font-mono text-fort-danger">{failed}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-fort-cyan animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="card-fort p-12 text-center">
          <Bell className="w-12 h-12 text-fort-muted mx-auto mb-4" />
          <p className="text-white font-semibold">No alerts yet</p>
          <p className="text-fort-muted text-sm mt-2">
            Alerts fire automatically when AI judgments reach Warning level or above.
            Configure email/webhook alerts on each protocol's settings.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a, i) => {
            const lvl = LEVEL_LABELS[a.level ?? 1] ?? LEVEL_LABELS[1];
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-fort p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-fort-surface flex items-center justify-center flex-shrink-0">
                  {a.channel === 'email'
                    ? <Mail className="w-4 h-4 text-fort-cyan" />
                    : <Webhook className="w-4 h-4 text-fort-warning" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium capitalize">{a.channel} alert</span>
                    <span className={`text-xs font-semibold ${lvl.color}`}>{lvl.label}</span>
                    {a.delivered
                      ? <CheckCircle className="w-3.5 h-3.5 text-fort-green" />
                      : <XCircle className="w-3.5 h-3.5 text-fort-danger" />
                    }
                  </div>
                  <p className="text-fort-muted text-xs truncate">{a.destination}</p>
                  {!a.delivered && a.lastError && (
                    <p className="text-fort-danger text-xs mt-0.5">{a.lastError}</p>
                  )}
                </div>
                <span className="text-fort-muted text-xs flex-shrink-0">
                  {formatDistanceToNow(new Date(a.sentAt), { addSuffix: true })}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
