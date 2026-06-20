'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requirements = [
    { label: 'At least 8 characters', ok: form.password.length >= 8 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(form.password) },
    { label: 'One number', ok: /[0-9]/.test(form.password) },
    { label: 'Passwords match', ok: form.password === form.confirm && form.confirm.length > 0 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirements.every(r => r.ok)) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/v1/auth/register', { email: form.email, password: form.password });
      localStorage.setItem('refresh_token', res.data.refresh);
      setUser(res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed');
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
          <div className="mb-10">
            <div className="fc-badge-info mb-6 w-fit">Free to start</div>
            <h1 className="text-4xl font-bold text-[#eeeeee] leading-tight mb-4">
              Secure your protocols<br />in minutes
            </h1>
            <p className="text-[#8ca4ac] text-sm leading-relaxed max-w-sm">
              Create your account and a GEN wallet is generated automatically. Start monitoring DeFi protocols with AI-powered threat detection immediately.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Auto-generated GEN wallet on GenLayer StudioNet',
              'AI consensus judgments via Intelligent Contracts',
              'Real-time email & webhook security alerts',
              'Risk scoring with 5-tier threat classification',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-[#217eaa]" />
                <span className="text-xs text-[#8ca4ac]">{f}</span>
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
            <h2 className="text-xl font-semibold text-[#eeeeee]">Create your account</h2>
            <p className="text-xs text-[#8ca4ac] mt-1">A GEN wallet will be generated for you automatically</p>
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
              <label className="fc-label block mb-1.5">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="fc-input pr-10" placeholder="Create a strong password" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-3 text-[#8ca4ac] hover:text-[#eeeeee]">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="fc-label block mb-1.5">Confirm password</label>
              <input type="password" required value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="fc-input" placeholder="Confirm your password" />
            </div>

            {form.password && (
              <div className="space-y-1.5 px-1">
                {requirements.map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <Check className={`w-3 h-3 flex-shrink-0 ${r.ok ? 'text-[#22c55e]' : 'text-[#1c2229]'}`} />
                    <span className={`text-2xs font-mono ${r.ok ? 'text-[#22c55e]' : 'text-[#8ca4ac]'}`}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading || !requirements.every(r => r.ok)}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-[#8ca4ac] mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#217eaa] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
