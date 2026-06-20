'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/v1/auth/login', form);
      localStorage.setItem('access_token', res.data.token ?? '')
      localStorage.setItem('refresh_token', res.data.refresh ?? '')
      setUser(res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#090b0d] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1014] border-r border-[#1c2229] flex-col px-16 py-14">
        <div className="flex items-center gap-2.5 mb-16">
          <div className="w-8 h-8 rounded bg-[#217eaa]/20 border border-[#217eaa]/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#217eaa]" />
          </div>
          <span className="font-bold text-[#eeeeee] tracking-tight text-lg">FortiChain</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-12">
            <div className="fc-badge-live mb-6 w-fit"><span className="dot-live" />System Online</div>
            <h1 className="text-4xl font-bold text-[#eeeeee] leading-tight mb-4">
              AI-Native Security<br />for DeFi Protocols
            </h1>
            <p className="text-[#8ca4ac] text-sm leading-relaxed max-w-sm">
              Real-time threat intelligence powered by GenLayer AI consensus. Monitor, analyze, and protect your protocols with on-chain security judgments.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { stat: '5 Tiers', label: 'Threat Classification', color: '#217eaa' },
              { stat: 'Real-time', label: 'GenLayer AI Consensus', color: '#22c55e' },
              { stat: '30s', label: 'Auto-refresh Interval', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-4">
                <span className="font-mono text-sm font-bold tabular-nums" style={{ color: s.color }}>{s.stat}</span>
                <span className="text-xs text-[#8ca4ac]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-2xs text-[#8ca4ac]/40 font-mono">GenLayer StudioNet · GEN Token</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <Shield className="w-5 h-5 text-[#217eaa]" />
              <span className="font-bold text-[#eeeeee]">FortiChain</span>
            </div>
            <h2 className="text-xl font-semibold text-[#eeeeee]">Welcome back</h2>
            <p className="text-xs text-[#8ca4ac] mt-1">Sign in to your security console</p>
          </div>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded px-4 py-3 text-[#ef4444] text-xs font-mono mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="fc-label block mb-1.5">Email address</label>
              <input type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="fc-input" placeholder="you@protocol.io" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="fc-label">Password</label>
                <Link href="/auth/forgot-password" className="text-2xs text-[#8ca4ac] hover:text-[#217eaa] font-mono transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="fc-input pr-10" placeholder="Your password" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-3 text-[#8ca4ac] hover:text-[#eeeeee]">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-[#8ca4ac] mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-[#217eaa] hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
