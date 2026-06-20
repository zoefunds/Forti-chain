'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Plus, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () => api.get('/api/v1/api-keys').then(r => { setKeys(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!label.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/api/v1/api-keys', { label });
      setNewKey(res.data.key); setLabel(''); load();
    } catch {} finally { setCreating(false); }
  };

  const revokeKey = async (id: string) => {
    await api.delete(`/api/v1/api-keys/${id}`); load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[#eeeeee]">API Keys</h1>
        <p className="text-xs text-[#8ca4ac] mt-0.5">Manage API keys for programmatic access</p>
      </div>

      {/* Create key */}
      <div className="fc-card p-5">
        <h2 className="text-sm font-semibold text-[#eeeeee] mb-4">Create New Key</h2>
        <div className="flex gap-3">
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Key label (e.g. Production Backend)"
            onKeyDown={e => e.key === 'Enter' && createKey()}
            className="fc-input flex-1" />
          <button onClick={createKey} disabled={creating || !label.trim()} className="btn-primary text-xs gap-1.5">
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Generate
          </button>
        </div>
        {newKey && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-[#22c55e]/5 border border-[#22c55e]/30 rounded p-4">
            <p className="text-[#22c55e] text-2xs font-mono uppercase tracking-widest mb-2">
              Save this key — it won&apos;t be shown again
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono text-xs text-[#eeeeee] bg-[#090b0d] rounded px-3 py-2 overflow-x-auto">
                {newKey}
              </code>
              <button onClick={() => copy(newKey)} className="text-[#8ca4ac] hover:text-[#eeeeee]">
                {copied ? <Check className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 text-[#217eaa] animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="fc-card p-10 text-center">
          <Key className="w-8 h-8 text-[#1c2229] mx-auto mb-3" />
          <p className="text-xs text-[#8ca4ac] font-mono">No API keys yet</p>
        </div>
      ) : (
        <div className="fc-card overflow-hidden">
          <table className="fc-table">
            <thead>
              <tr>
                <th className="fc-th">Label</th>
                <th className="fc-th">Prefix</th>
                <th className="fc-th">Last Used</th>
                <th className="fc-th">Status</th>
                <th className="fc-th" />
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className={`fc-tr ${k.revokedAt ? 'opacity-40' : ''}`}>
                  <td className="fc-td font-medium text-xs">{k.label}</td>
                  <td className="fc-td font-mono text-xs text-[#8ca4ac]">{k.keyPrefix}••••••••</td>
                  <td className="fc-td text-xs text-[#8ca4ac] font-mono">
                    {k.lastUsedAt ? formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true }) : 'Never'}
                  </td>
                  <td className="fc-td">
                    {k.revokedAt
                      ? <span className="fc-badge-critical">Revoked</span>
                      : <span className="fc-badge-secure">Active</span>
                    }
                  </td>
                  <td className="fc-td text-right">
                    {!k.revokedAt && (
                      <button onClick={() => revokeKey(k.id)}
                        className="text-[#8ca4ac] hover:text-[#ef4444] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
