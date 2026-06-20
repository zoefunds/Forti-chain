'use client';
import { useState, useEffect } from 'react';
import { Settings, Bell, Webhook, User, Key, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();

  // Notification prefs
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookError, setWebhookError] = useState('');

  // Signal API keys (for ingestion workers)
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
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch {}
    finally { setNotifSaving(false); }
  };

  const saveWebhook = async () => {
    setWebhookSaving(true);
    setWebhookError('');
    try {
      await api.patch('/api/v1/settings/webhook', { defaultWebhookUrl: webhookUrl });
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 2000);
    } catch (err: any) {
      setWebhookError(err.response?.data?.error ?? 'Failed to save');
    } finally {
      setWebhookSaving(false);
    }
  };

  const saveSignalKeys = async () => {
    setSignalSaving(true);
    setSignalError('');
    try {
      await api.patch('/api/v1/settings/signal-keys', {
        etherscanApiKey: etherscanKey || undefined,
        fortaApiKey: fortaKey || undefined,
        coingeckoApiKey: coingeckoKey || undefined,
      });
      setSignalSaved(true);
      setTimeout(() => setSignalSaved(false), 2000);
    } catch (err: any) {
      setSignalError(err.response?.data?.error ?? 'Failed to save');
    } finally {
      setSignalSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-fort-muted text-sm mt-1">Manage your account and notification preferences</p>
      </div>

      {/* Profile */}
      <div className="card-fort p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-fort-cyan" />
          <h2 className="text-white font-semibold">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-fort-muted text-xs mb-1.5 block">Email address</label>
            <input value={user?.email ?? ''} readOnly
              className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white text-sm opacity-70 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-fort-muted text-xs mb-1.5 block">Subscription tier</label>
            <div className="bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-fort-cyan text-sm capitalize">{user?.subscriptionTier ?? 'free'}</span>
              <a href="/dashboard/wallet" className="text-fort-cyan text-xs hover:underline">Upgrade →</a>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card-fort p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-fort-cyan" />
            <h2 className="text-white font-semibold">Notifications</h2>
          </div>
          <button onClick={saveNotifs} disabled={notifSaving}
            className="flex items-center gap-1.5 text-xs bg-fort-cyan text-fort-bg font-semibold px-3 py-1.5 rounded-lg hover:bg-fort-cyan/90 disabled:opacity-50 transition-all">
            {notifSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : notifSaved ? <Check className="w-3 h-3" /> : null}
            {notifSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-fort-border">
          <div>
            <p className="text-white text-sm">Email alerts</p>
            <p className="text-fort-muted text-xs">Receive security alerts at your account email</p>
          </div>
          <button
            onClick={() => setEmailNotifs(!emailNotifs)}
            className={`relative w-10 h-5 rounded-full transition-colors ${emailNotifs ? 'bg-fort-cyan' : 'bg-fort-border'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${emailNotifs ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Default Webhook */}
      <div className="card-fort p-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="w-4 h-4 text-fort-cyan" />
          <h2 className="text-white font-semibold">Default Webhook</h2>
        </div>
        <p className="text-fort-muted text-sm mb-4">
          This webhook receives all security alerts. You can also set per-protocol webhooks.
        </p>
        {webhookError && <p className="text-fort-danger text-sm mb-3">{webhookError}</p>}
        <div className="flex gap-3">
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="flex-1 bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm"
          />
          <button onClick={saveWebhook} disabled={webhookSaving || !webhookUrl.trim()}
            className="flex items-center gap-2 bg-fort-cyan text-fort-bg font-semibold px-4 py-2.5 rounded-xl hover:bg-fort-cyan/90 transition-all disabled:opacity-50 text-sm">
            {webhookSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : webhookSaved ? <Check className="w-4 h-4" /> : null}
            {webhookSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Signal API Keys */}
      <div className="card-fort p-6">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-fort-cyan" />
          <h2 className="text-white font-semibold">Signal Data Sources</h2>
        </div>
        <p className="text-fort-muted text-sm mb-4">
          API keys for ingesting on-chain and off-chain intelligence signals.
          These power the AI judgment input — the more signals, the better the analysis.
        </p>
        {signalError && <p className="text-fort-danger text-sm mb-3">{signalError}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-fort-muted text-xs mb-1.5 block">Etherscan API Key <span className="text-fort-muted">(on-chain monitoring)</span></label>
            <input
              value={etherscanKey}
              onChange={e => setEtherscanKey(e.target.value)}
              placeholder="YourApiKeyToken"
              className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-fort-muted text-xs mb-1.5 block">Forta API Key <span className="text-fort-muted">(threat intelligence)</span></label>
            <input
              value={fortaKey}
              onChange={e => setFortaKey(e.target.value)}
              placeholder="forta_xxxxxxxx"
              className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-fort-muted text-xs mb-1.5 block">CoinGecko API Key <span className="text-fort-muted">(TVL / price data)</span></label>
            <input
              value={coingeckoKey}
              onChange={e => setCoingeckoKey(e.target.value)}
              placeholder="CG-xxxxxxxxxxxxxxxx"
              className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-2.5 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 text-sm font-mono"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-fort-muted text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Keys are encrypted and stored securely
          </p>
          <button onClick={saveSignalKeys} disabled={signalSaving}
            className="flex items-center gap-2 bg-fort-cyan text-fort-bg font-semibold px-4 py-2 rounded-xl hover:bg-fort-cyan/90 transition-all disabled:opacity-50 text-sm">
            {signalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : signalSaved ? <Check className="w-4 h-4" /> : null}
            {signalSaved ? 'Saved!' : 'Save Keys'}
          </button>
        </div>
      </div>
    </div>
  );
}
