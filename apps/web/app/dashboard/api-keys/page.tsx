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
      setNewKey(res.data.key);
      setLabel('');
      load();
    } catch {}
    setCreating(false);
  };

  const revokeKey = async (id: string) => {
    await api.delete(`/api/v1/api-keys/${id}`);
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <p className="text-fort-muted text-sm mt-1">Manage API keys for programmatic access</p>
      </div>

      {/* Create key */}
      <div className="card-fort p-6">
        <h2 className="text-white font-semibold mb-4">Create New Key</h2>
        <div className="flex gap-3">
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Key label (e.g. Production Backend)"
            className="flex-1 bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm"
          />
          <button onClick={createKey} disabled={creating || !label.trim()}
            className="flex items-center gap-2 bg-fort-cyan text-fort-bg font-semibold px-4 py-2.5 rounded-xl hover:bg-fort-cyan/90 transition-all disabled:opacity-50 text-sm">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate
          </button>
        </div>

        {newKey && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-fort-green/10 border border-fort-green/30 rounded-xl p-4">
            <p className="text-fort-green text-sm font-semibold mb-2">⚠️ Save this key — it won't be shown again</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono text-xs text-white bg-fort-bg rounded-lg px-3 py-2 overflow-x-auto">
                {newKey}
              </code>
              <button onClick={() => copy(newKey)}
                className="text-fort-muted hover:text-white transition-colors">
                {copied ? <Check className="w-4 h-4 text-fort-green" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="w-5 h-5 text-fort-cyan animate-spin" /></div>
      ) : keys.length === 0 ? (
        <div className="card-fort p-8 text-center">
          <Key className="w-8 h-8 text-fort-muted mx-auto mb-3" />
          <p className="text-fort-muted text-sm">No API keys yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k.id} className={`card-fort p-4 flex items-center gap-4 ${k.revokedAt ? 'opacity-50' : ''}`}>
              <Key className="w-4 h-4 text-fort-cyan flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{k.label}</p>
                <p className="text-fort-muted text-xs font-mono">{k.keyPrefix}••••••••</p>
              </div>
              <div className="text-right flex-shrink-0">
                {k.lastUsedAt ? (
                  <p className="text-fort-muted text-xs">Used {formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })}</p>
                ) : (
                  <p className="text-fort-muted text-xs">Never used</p>
                )}
                {k.revokedAt && <p className="text-fort-danger text-xs">Revoked</p>}
              </div>
              {!k.revokedAt && (
                <button onClick={() => revokeKey(k.id)}
                  className="text-fort-muted hover:text-fort-danger transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
