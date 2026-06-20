'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Server } from 'lucide-react';
import { api } from '@/lib/api';

const CATEGORIES = ['lending', 'dex', 'bridge', 'yield', 'derivatives', 'dao', 'other'];
const CHAINS = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'bnb', 'avalanche', 'solana'];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function AddProtocolModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '', chain: 'ethereum', contractAddress: '',
    category: 'lending', websiteUrl: '', webhookUrl: '', alertEmail: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload: any = { name: form.name, chain: form.chain, category: form.category };
      if (form.contractAddress) payload.contractAddress = form.contractAddress;
      if (form.websiteUrl) payload.websiteUrl = form.websiteUrl;
      if (form.webhookUrl) payload.webhookUrl = form.webhookUrl;
      if (form.alertEmail) payload.alertEmail = form.alertEmail;
      await api.post('/api/v1/protocols', payload);
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error?.fieldErrors
        ? Object.values(err.response.data.error.fieldErrors).flat().join(', ')
        : (err.response?.data?.error ?? 'Failed to add protocol'));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fort-card border border-fort-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-fort-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-fort-cyan/10 border border-fort-cyan/30 flex items-center justify-center">
              <Server className="w-4 h-4 text-fort-cyan" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Add Protocol</h2>
              <p className="text-fort-muted text-xs">Register a DeFi protocol for AI monitoring</p>
            </div>
          </div>
          <button onClick={onClose} className="text-fort-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="bg-fort-danger/10 border border-fort-danger/30 rounded-lg px-4 py-2.5 text-fort-danger text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-fort-muted text-xs mb-1.5">Protocol Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Aave V3"
                className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm" />
            </div>

            <div>
              <label className="block text-fort-muted text-xs mb-1.5">Chain *</label>
              <select required value={form.chain} onChange={e => set('chain', e.target.value)}
                className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-fort-cyan/50 text-sm">
                {CHAINS.map(c => <option key={c} value={c} className="bg-fort-surface capitalize">{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-fort-muted text-xs mb-1.5">Category *</label>
              <select required value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-fort-cyan/50 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-fort-surface capitalize">{c}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-fort-muted text-xs mb-1.5">Contract Address</label>
              <input value={form.contractAddress} onChange={e => set('contractAddress', e.target.value)}
                placeholder="0x..."
                className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm font-mono" />
            </div>

            <div className="col-span-2">
              <label className="block text-fort-muted text-xs mb-1.5">Alert Email</label>
              <input type="email" value={form.alertEmail} onChange={e => set('alertEmail', e.target.value)}
                placeholder="security@yourprotocol.io"
                className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm" />
            </div>

            <div className="col-span-2">
              <label className="block text-fort-muted text-xs mb-1.5">Webhook URL</label>
              <input type="url" value={form.webhookUrl} onChange={e => set('webhookUrl', e.target.value)}
                placeholder="https://your-server.com/fortichain-webhook"
                className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-fort-border text-fort-muted hover:text-white hover:border-white/20 py-2.5 rounded-xl text-sm transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-fort-cyan text-fort-bg font-semibold py-2.5 rounded-xl hover:bg-fort-cyan/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Adding...' : 'Add Protocol'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
