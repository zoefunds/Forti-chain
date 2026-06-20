'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, Copy, Check, Eye, AlertTriangle, Loader2,
  Zap, Crown, ShieldCheck, Star, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { usePolling } from '@/lib/usePolling';

const PLANS = [
  {
    id: 'free',
    label: 'Free',
    icon: ShieldCheck,
    price: 0,
    color: 'border-fort-border',
    highlight: false,
    perks: ['1 protocol', '10 AI judgments/month', 'Email alerts'],
  },
  {
    id: 'pro',
    label: 'Pro',
    icon: Star,
    price: 49,
    color: 'border-fort-cyan/50',
    highlight: true,
    perks: ['10 protocols', '500 AI judgments/month', 'Email + webhook alerts', 'Priority analysis'],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    icon: Crown,
    price: 299,
    color: 'border-fort-warning/40',
    highlight: false,
    perks: ['Unlimited protocols', 'Unlimited judgments', 'All alert channels', 'SLA + dedicated support'],
  },
];

export default function WalletPage() {
  const { user, refreshBalance } = useAuthStore();
  const [wallet, setWallet] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [subscribing, setSubscribing] = useState('');
  const [subscribeMsg, setSubscribeMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/wallet');
      setWallet(res.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(() => { load(); refreshBalance(); }, 120_000);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportKey = async () => {
    setExporting(true);
    setExportError('');
    try {
      const res = await api.post('/api/v1/wallet/export-key', { password });
      setPrivateKey(res.data.privateKey);
      setPassword('');
    } catch (err: any) {
      setExportError(err.response?.data?.error ?? 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const subscribe = async (planId: string, months = 1) => {
    setSubscribing(planId);
    setSubscribeMsg('');
    try {
      await api.post('/api/v1/wallet/subscribe', { planId, months });
      setSubscribeMsg(`Subscribed to ${planId}! Your plan has been upgraded.`);
      await load();
      await refreshBalance();
    } catch (err: any) {
      setSubscribeMsg(err.response?.data?.error ?? 'Subscription failed. Ensure you have enough GEN.');
    } finally {
      setSubscribing('');
    }
  };

  const genBalance = parseFloat(user?.genBalanceCache ?? wallet?.genBalance ?? '0');

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet & Subscription</h1>
          <p className="text-fort-muted text-sm mt-1">Your auto-generated GEN wallet on GenLayer StudioNet</p>
        </div>
        <button onClick={() => { load(); refreshBalance(); }}
          className="flex items-center gap-1.5 text-xs text-fort-muted border border-fort-border px-3 py-1.5 rounded-lg hover:text-white transition-all">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Wallet card */}
      <div className="card-fort p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-fort-cyan/10 border border-fort-cyan/30 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-fort-cyan" />
          </div>
          <div>
            <p className="text-white font-semibold">FortiChain Wallet</p>
            <p className="text-fort-muted text-xs">GenLayer StudioNet · GEN Token</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-fort-muted text-xs">Current Plan</p>
            <p className="text-fort-cyan font-semibold capitalize">{user?.subscriptionTier ?? 'free'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-fort-muted text-xs mb-1.5 block">Wallet Address</label>
            <div className="flex items-center gap-2 bg-fort-surface border border-fort-border rounded-lg px-4 py-3">
              <code className="flex-1 font-mono text-sm text-white truncate">{user?.walletAddress}</code>
              <button onClick={() => copy(user?.walletAddress ?? '')} className="text-fort-muted hover:text-white">
                {copied ? <Check className="w-4 h-4 text-fort-green" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-fort-muted text-xs mb-1.5 block">GEN Balance</label>
            <div className="bg-fort-surface border border-fort-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-2xl font-bold text-fort-cyan">{genBalance.toFixed(6)}</span>
                <span className="text-fort-muted ml-2">GEN</span>
              </div>
              {loading && <Loader2 className="w-4 h-4 text-fort-muted animate-spin" />}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription plans */}
      <div>
        <h2 className="text-white font-semibold mb-4">Upgrade Plan</h2>
        {subscribeMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl border text-sm ${
            subscribeMsg.includes('fail') || subscribeMsg.includes('Error')
              ? 'bg-fort-danger/10 border-fort-danger/30 text-fort-danger'
              : 'bg-fort-green/10 border-fort-green/30 text-fort-green'
          }`}>
            {subscribeMsg}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const isCurrent = user?.subscriptionTier === plan.id;
            return (
              <div key={plan.id}
                className={`card-fort p-5 border-2 transition-all ${
                  plan.highlight ? plan.color : 'border-fort-border'
                } ${isCurrent ? 'ring-2 ring-fort-cyan ring-offset-2 ring-offset-fort-bg' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-5 h-5 ${plan.highlight ? 'text-fort-cyan' : 'text-fort-muted'}`} />
                  <h3 className="text-white font-semibold">{plan.label}</h3>
                  {isCurrent && <span className="text-xs text-fort-cyan ml-auto">Current</span>}
                </div>
                <p className="text-2xl font-bold font-mono text-white mb-4">
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  {plan.price > 0 && <span className="text-fort-muted text-xs font-normal">/mo</span>}
                </p>
                <ul className="space-y-1.5 mb-5">
                  {plan.perks.map(p => (
                    <li key={p} className="flex items-center gap-2 text-fort-text text-xs">
                      <Check className="w-3 h-3 text-fort-green flex-shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => subscribe(plan.id)}
                  disabled={isCurrent || !!subscribing || plan.id === 'free'}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
                    plan.highlight
                      ? 'bg-fort-cyan text-fort-bg hover:bg-fort-cyan/90'
                      : 'border border-fort-border text-white hover:border-white/30'
                  }`}>
                  {subscribing === plan.id
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Processing...</span>
                    : isCurrent ? 'Active Plan'
                    : plan.id === 'free' ? 'Default Plan'
                    : `Upgrade to ${plan.label}`}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-fort-muted text-xs mt-3">
          Subscriptions are processed on-chain via the FortiChain Sentinel contract. GEN tokens are deducted from your wallet.
        </p>
      </div>

      {/* Recent Transactions */}
      {wallet?.recentTransactions?.length > 0 && (
        <div className="card-fort p-6">
          <h2 className="text-white font-semibold mb-4">Recent GEN Transactions</h2>
          <div className="space-y-2">
            {wallet.recentTransactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-fort-border last:border-0">
                <div>
                  <p className="text-white text-sm">{tx.purpose}</p>
                  {tx.txHash && (
                    <p className="text-fort-muted text-xs font-mono">{tx.txHash?.slice(0, 20)}...</p>
                  )}
                </div>
                <span className={`font-mono text-sm ${tx.confirmed ? 'text-fort-green' : 'text-fort-muted'}`}>
                  -{parseFloat(tx.amount).toFixed(6)} GEN
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export private key */}
      <div className="card-fort p-6 border border-fort-warning/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-fort-warning" />
          <h2 className="text-white font-semibold">Export Private Key</h2>
        </div>
        <p className="text-fort-muted text-sm mb-4">Never share your private key. Keep it in a secure location.</p>

        {exportError && <p className="text-fort-danger text-sm mb-3">{exportError}</p>}

        {privateKey ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-fort-danger/10 border border-fort-danger/30 rounded-xl p-4">
            <p className="text-fort-danger text-xs font-semibold mb-2">⚠️ Private Key — Keep this secret</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs text-white bg-fort-bg rounded-lg px-3 py-2 break-all">{privateKey}</code>
              <button onClick={() => copy(privateKey)} className="text-fort-muted hover:text-white flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-fort-green" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => setPrivateKey('')} className="mt-3 text-fort-muted text-xs hover:text-white">
              Hide key
            </button>
          </motion.div>
        ) : (
          <div className="flex gap-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password to unlock"
              onKeyDown={e => e.key === 'Enter' && password && exportKey()}
              className="flex-1 bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-warning/50 text-sm"
            />
            <button onClick={exportKey} disabled={exporting || !password}
              className="flex items-center gap-2 border border-fort-warning/30 text-fort-warning px-4 py-2.5 rounded-xl hover:bg-fort-warning/10 transition-all disabled:opacity-50 text-sm">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
