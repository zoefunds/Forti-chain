'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Copy, Check, Eye, AlertTriangle, Loader2, ShieldCheck, Star, Crown, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { usePolling } from '@/lib/usePolling';

const PLANS = [
  {
    id: 'free', label: 'Free', icon: ShieldCheck, price: 0,
    perks: ['1 protocol', '10 AI judgments/month', 'Email alerts'],
    accent: '#8ca4ac',
  },
  {
    id: 'pro', label: 'Pro', icon: Star, price: 49,
    perks: ['10 protocols', '500 AI judgments/month', 'Email + webhook alerts', 'Priority analysis'],
    accent: '#217eaa', featured: true,
  },
  {
    id: 'enterprise', label: 'Enterprise', icon: Crown, price: 299,
    perks: ['Unlimited protocols', 'Unlimited judgments', 'All alert channels', 'SLA + dedicated support'],
    accent: '#f59e0b',
  },
];

export default function WalletPage() {
  const { user, refreshBalance } = useAuthStore();
  const [wallet, setWallet] = useState<any>(null);
  const [copied, setCopied] = useState<string>('');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [subscribing, setSubscribing] = useState('');
  const [subscribeMsg, setSubscribeMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const res = await api.get('/api/v1/wallet'); setWallet(res.data); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(() => { load(); refreshBalance(); }, 10_000);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(''), 2000);
  };

  const exportKey = async () => {
    setExporting(true); setExportError('');
    try {
      const res = await api.post('/api/v1/wallet/export-key', { password });
      setPrivateKey(res.data.privateKey); setPassword('');
    } catch (err: any) {
      setExportError(err.response?.data?.error ?? 'Failed to export');
    } finally { setExporting(false); }
  };

  const subscribe = async (planId: string) => {
    setSubscribing(planId); setSubscribeMsg('');
    try {
      await api.post('/api/v1/wallet/subscribe', { planId, months: 1 });
      setSubscribeMsg(`Upgraded to ${planId}!`);
      await load(); await refreshBalance();
    } catch (err: any) {
      setSubscribeMsg(err.response?.data?.error ?? 'Subscription failed.');
    } finally { setSubscribing(''); }
  };

  const genBalance = parseFloat(user?.genBalanceCache ?? wallet?.genBalance ?? '0');

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#eeeeee]">Wallet & Subscription</h1>
          <p className="text-xs text-[#8ca4ac] mt-0.5">Your auto-generated GEN wallet on GenLayer StudioNet</p>
        </div>
        <button onClick={() => { load(); refreshBalance(); }} className="btn-ghost text-xs gap-1.5 border border-[#1c2229]">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Wallet card */}
      <div className="fc-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-[#217eaa]/40 bg-[#217eaa]/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[#217eaa]" />
          </div>
          <div>
            <p className="text-[#eeeeee] font-semibold text-sm">FortiChain Wallet</p>
            <p className="text-2xs text-[#8ca4ac] font-mono">GenLayer StudioNet · GEN Token</p>
          </div>
          <div className="ml-auto text-right">
            <p className="fc-label">Current Plan</p>
            <p className="text-[#217eaa] text-sm font-semibold capitalize mt-0.5">{user?.subscriptionTier ?? 'free'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="fc-label block mb-1.5">Wallet Address</label>
            <div className="flex items-center gap-2 bg-[#0d1014] border border-[#1c2229] rounded px-3 py-2.5">
              <code className="flex-1 font-mono text-xs text-[#eeeeee] truncate">{user?.walletAddress}</code>
              <button onClick={() => copy(user?.walletAddress ?? '', 'addr')} className="text-[#8ca4ac] hover:text-[#eeeeee]">
                {copied === 'addr' ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="fc-label block mb-1.5">GEN Balance</label>
            <div className="flex items-center justify-between bg-[#0d1014] border border-[#1c2229] rounded px-3 py-2.5">
              <span className="font-mono text-xl font-bold text-[#217eaa] tabular-nums">
                {genBalance.toFixed(6)} <span className="text-[#8ca4ac] text-xs font-normal">GEN</span>
              </span>
              {loading && <Loader2 className="w-3.5 h-3.5 text-[#8ca4ac] animate-spin" />}
            </div>
          </div>
        </div>
      </div>

      {/* GEN Top-up */}
      <div className="fc-card p-6 space-y-4">
        <div>
          <h2 className="text-[#eeeeee] font-semibold text-sm">Top Up GEN Tokens</h2>
          <p className="text-xs text-[#8ca4ac] mt-0.5">Fund your wallet to pay for on-chain AI analysis transactions on GenLayer StudioNet.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0d1014] border border-[#1c2229] rounded p-4 space-y-2">
            <p className="text-xs font-semibold text-[#eeeeee]">GenLayer StudioNet Faucet</p>
            <p className="text-2xs text-[#8ca4ac]">Request free GEN tokens from the official StudioNet faucet. Paste your wallet address and receive test GEN instantly.</p>
            <div className="flex items-center gap-2 mt-3">
              <code className="text-2xs font-mono text-[#217eaa] bg-[#217eaa]/10 px-2 py-1 rounded truncate flex-1">
                {user?.walletAddress?.slice(0, 20)}…
              </code>
              <button onClick={() => copy(user?.walletAddress ?? '', 'topup')} className="text-[#8ca4ac] hover:text-[#eeeeee] flex-shrink-0">
                {copied === 'topup' ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <a
              href="https://studio.genlayer.com/faucet"
              target="_blank" rel="noreferrer"
              className="btn-primary text-xs py-2 w-full text-center block mt-2"
            >
              Open Faucet →
            </a>
          </div>
          <div className="bg-[#0d1014] border border-[#1c2229] rounded p-4 space-y-2">
            <p className="text-xs font-semibold text-[#eeeeee]">Receive GEN Transfer</p>
            <p className="text-2xs text-[#8ca4ac]">Share your wallet address to receive GEN from another wallet on the GenLayer network.</p>
            <div className="mt-3 bg-[#111518] border border-[#1c2229] rounded px-3 py-2">
              <code className="text-2xs font-mono text-[#eeeeee] break-all">{user?.walletAddress}</code>
            </div>
            <button onClick={() => copy(user?.walletAddress ?? '', 'addr2')} className="btn-ghost text-xs py-2 w-full mt-1">
              {copied === 'addr2' ? 'Copied!' : 'Copy Address'}
            </button>
          </div>
        </div>
      </div>

      {/* Subscription plans */}
      <div>
        <h2 className="text-[#eeeeee] font-semibold text-sm mb-4">Upgrade Plan</h2>
        {subscribeMsg && (
          <div className={`mb-4 px-4 py-3 rounded border text-xs font-mono ${
            subscribeMsg.includes('fail') || subscribeMsg.includes('Error')
              ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
              : 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]'
          }`}>{subscribeMsg}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const isCurrent = user?.subscriptionTier === plan.id;
            return (
              <motion.div key={plan.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`fc-card p-5 border-2 transition-all ${
                  plan.featured ? 'border-[#217eaa]/40' : isCurrent ? 'border-[#22c55e]/30' : 'border-transparent'
                }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color: plan.accent }} />
                  <h3 className="text-[#eeeeee] font-semibold text-sm">{plan.label}</h3>
                  {isCurrent && <span className="ml-auto fc-badge-secure text-2xs">Active</span>}
                </div>
                <p className="font-mono text-xl font-bold text-[#eeeeee] mb-4 tabular-nums">
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  {plan.price > 0 && <span className="text-[#8ca4ac] text-xs font-normal">/mo</span>}
                </p>
                <ul className="space-y-1.5 mb-5">
                  {plan.perks.map(p => (
                    <li key={p} className="flex items-center gap-2 text-2xs text-[#8ca4ac]">
                      <Check className="w-3 h-3 text-[#22c55e] flex-shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => subscribe(plan.id)}
                  disabled={isCurrent || !!subscribing || plan.id === 'free'}
                  className={`w-full py-2 rounded text-xs font-semibold transition-all disabled:opacity-50 ${
                    plan.featured
                      ? 'bg-[#217eaa] text-white hover:bg-[#1a6690]'
                      : 'border border-[#1c2229] text-[#8ca4ac] hover:border-[#217eaa]/40 hover:text-[#eeeeee]'
                  }`}>
                  {subscribing === plan.id
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Processing…</span>
                    : isCurrent ? 'Current Plan'
                    : plan.id === 'free' ? 'Default'
                    : `Upgrade to ${plan.label}`}
                </button>
              </motion.div>
            );
          })}
        </div>
        <p className="text-2xs text-[#8ca4ac] font-mono mt-3">
          Subscriptions processed on-chain via the FortiChain Sentinel contract. GEN tokens deducted from your wallet.
        </p>
      </div>

      {/* Recent transactions */}
      {wallet?.recentTransactions?.length > 0 && (
        <div className="fc-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1c2229]">
            <span className="text-sm font-medium text-[#eeeeee]">Recent GEN Transactions</span>
          </div>
          <table className="fc-table">
            <tbody>
              {wallet.recentTransactions.map((tx: any) => (
                <tr key={tx.id} className="fc-tr">
                  <td className="fc-td">
                    <p className="text-xs text-[#eeeeee]">{tx.purpose}</p>
                    {tx.txHash && <p className="text-2xs text-[#8ca4ac] font-mono">{tx.txHash?.slice(0, 20)}…</p>}
                  </td>
                  <td className="fc-td text-right">
                    <span className={`font-mono text-sm ${tx.confirmed ? 'text-[#22c55e]' : 'text-[#8ca4ac]'}`}>
                      -{parseFloat(tx.amount).toFixed(6)} GEN
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Export private key */}
      <div className="fc-card p-6 border-[#f59e0b]/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
          <h2 className="text-[#eeeeee] font-semibold text-sm">Export Private Key</h2>
        </div>
        <p className="text-2xs text-[#8ca4ac] font-mono mb-4">Never share your private key. Keep it in a secure location.</p>
        {exportError && <p className="text-[#ef4444] text-xs mb-3">{exportError}</p>}
        {privateKey ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-[#ef4444]/5 border border-[#ef4444]/30 rounded p-4">
            <p className="text-[#ef4444] text-2xs font-mono mb-2 uppercase tracking-widest">Private Key — Keep this secret</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs text-[#eeeeee] bg-[#090b0d] rounded px-3 py-2 break-all">{privateKey}</code>
              <button onClick={() => copy(privateKey, 'pk')} className="text-[#8ca4ac] hover:text-[#eeeeee] flex-shrink-0">
                {copied === 'pk' ? <Check className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => setPrivateKey('')} className="mt-3 text-2xs text-[#8ca4ac] hover:text-[#eeeeee] font-mono">Hide key</button>
          </motion.div>
        ) : (
          <div className="flex gap-3">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password to unlock"
              onKeyDown={e => e.key === 'Enter' && password && exportKey()}
              className="fc-input flex-1" />
            <button onClick={exportKey} disabled={exporting || !password}
              className="btn-outline gap-2 text-[#f59e0b] border-[#f59e0b]/30 hover:border-[#f59e0b]/60 disabled:opacity-50">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
