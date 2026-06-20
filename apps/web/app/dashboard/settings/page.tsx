'use client';
import { useState } from 'react';
import { Bell, Webhook, User, Key, Check, Loader2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Link from 'next/link';

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="fc-card">
      <div className="px-5 py-4 border-b border-[#1c2229] flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#217eaa]" />
        <h2 className="text-sm font-semibold text-[#eeeeee]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookError, setWebhookError] = useState('');

  const [etherscanKey, setEtherscanKey] = useState('');
  const [fortaKey, setFortaKey] = useState('');
  const [coingeckoKey, setCoingeckoKey] = useState('');
  const [signalSaving, setSignalSaving] = useState(false);
  const [signalSaved, setSignalSaved] = useState(false);
  const [signalError, setSignalError] = useState('');

  const saveNotifs = async () => {
    setNotifSaving(true);
    try {
      await api.patch('/api/v1/settings/notifications', { emailAlerts: emailNotifs });
      setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000);
    } catch {} finally { setNotifSaving(false); }
  };

  const saveWebhook = async () => {
    setWebhookSaving(true); setWebhookError('');
    try {
      await api.patch('/api/v1/settings/webhook', { defaultWebhookUrl: webhookUrl });
      setWebhookSaved(true); setTimeout(() => setWebhookSaved(false), 2000);
    } catch (err: any) {
      setWebhookError(err.response?.data?.error ?? 'Failed to save');
    } finally { setWebhookSaving(false); }
  };

  const saveSignalKeys = async () => {
    setSignalSaving(true); setSignalError('');
    try {
      await api.patch('/api/v1/settings/signal-keys', {
        etherscanApiKey: etherscanKey || undefined,
        fortaApiKey: fortaKey || undefined,
        coingeckoApiKey: coingeckoKey || undefined,
      });
      setSignalSaved(true); setTimeout(() => setSignalSaved(false), 2000);
    } catch (err: any) {
      setSignalError(err.response?.data?.error ?? 'Failed to save');
    } finally { setSignalSaving(false); }
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[#eeeeee]">Settings</h1>
        <p className="text-xs text-[#8ca4ac] mt-0.5">Manage your account and notification preferences</p>
      </div>

      {/* Profile */}
      <Section icon={User} title="Profile">
        <div className="space-y-4">
          <div>
            <label className="fc-label block mb-1.5">Email address</label>
            <input value={user?.email ?? ''} readOnly
              className="fc-input opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="fc-label block mb-1.5">Subscription tier</label>
            <div className="flex items-center justify-between bg-[#0d1014] border border-[#1c2229] rounded px-3 py-2.5">
              <span className="text-[#217eaa] text-sm font-mono capitalize">{user?.subscriptionTier ?? 'free'}</span>
              <Link href="/dashboard/wallet" className="text-2xs text-[#217eaa] font-mono hover:underline">Upgrade →</Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[#eeeeee] text-sm">Email alerts</p>
            <p className="text-2xs text-[#8ca4ac] mt-0.5">Receive security alerts at your account email</p>
          </div>
          <button onClick={() => setEmailNotifs(!emailNotifs)}
            className={`relative w-10 h-5 rounded-full transition-colors ${emailNotifs ? 'bg-[#217eaa]' : 'bg-[#1c2229]'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${emailNotifs ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveNotifs} disabled={notifSaving} className="btn-primary text-xs py-1.5 px-4">
            {notifSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : notifSaved ? <Check className="w-3 h-3" /> : null}
            {notifSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </Section>

      {/* Webhook */}
      <Section icon={Webhook} title="Default Webhook">
        <p className="text-xs text-[#8ca4ac] mb-4">This webhook receives all security alerts. You can also set per-protocol webhooks.</p>
        {webhookError && <p className="text-[#ef4444] text-xs mb-3">{webhookError}</p>}
        <div className="flex gap-3">
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="fc-input flex-1" />
          <button onClick={saveWebhook} disabled={webhookSaving || !webhookUrl.trim()}
            className="btn-primary text-xs gap-1.5 disabled:opacity-50">
            {webhookSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : webhookSaved ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
            {webhookSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </Section>

      {/* Signal API Keys */}
      <Section icon={Key} title="Signal Data Sources">
        <p className="text-xs text-[#8ca4ac] mb-4">
          API keys for ingesting on-chain and off-chain intelligence signals. The more sources, the better the AI analysis.
        </p>
        {signalError && <p className="text-[#ef4444] text-xs mb-3">{signalError}</p>}
        <div className="space-y-3">
          {[
            { label: 'Etherscan API Key', sub: 'on-chain monitoring', value: etherscanKey, set: setEtherscanKey, ph: 'YourApiKeyToken' },
            { label: 'Forta API Key', sub: 'threat intelligence', value: fortaKey, set: setFortaKey, ph: 'forta_xxxxxxxx' },
            { label: 'CoinGecko API Key', sub: 'TVL / price data', value: coingeckoKey, set: setCoingeckoKey, ph: 'CG-xxxxxxxxxxxxxxxx' },
          ].map(f => (
            <div key={f.label}>
              <label className="fc-label block mb-1.5">
                {f.label} <span className="text-[#8ca4ac]/60">({f.sub})</span>
              </label>
              <input value={f.value} onChange={e => f.set(e.target.value)}
                placeholder={f.ph} className="fc-input" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-2xs text-[#8ca4ac] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Keys are encrypted and stored securely
          </p>
          <button onClick={saveSignalKeys} disabled={signalSaving} className="btn-primary text-xs gap-1.5">
            {signalSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : signalSaved ? <Check className="w-3 h-3" /> : null}
            {signalSaved ? 'Saved!' : 'Save Keys'}
          </button>
        </div>
      </Section>
    </div>
  );
}
