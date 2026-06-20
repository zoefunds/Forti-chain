'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Loader2, Eye, EyeOff, Check, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Request a new link.');
  }, [token]);

  const requirements = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'One number', ok: /[0-9]/.test(password) },
    { label: 'Passwords match', ok: password === confirm && confirm.length > 0 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirements.every(r => r.ok)) return;
    setLoading(true); setError('');
    try {
      await api.post('/api/v1/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Reset failed. The link may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 mb-8 lg:hidden">
        <Shield className="w-5 h-5 text-[#217eaa]" />
        <span className="font-bold text-[#eeeeee]">FortiChain</span>
      </div>

      {done ? (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-[#22c55e]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#eeeeee]">Password updated</h2>
            <p className="text-xs text-[#8ca4ac] mt-2">Redirecting you to sign in…</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#eeeeee]">Set new password</h2>
            <p className="text-xs text-[#8ca4ac] mt-1">Choose a strong password for your account</p>
          </div>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded px-4 py-3 text-[#ef4444] text-xs font-mono mb-6">
              {error}
              {error.includes('expired') && (
                <Link href="/auth/forgot-password" className="block mt-2 text-[#217eaa] hover:underline">
                  Request a new link →
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="fc-label block mb-1.5">New password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="fc-input pr-10" placeholder="New password" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-3 text-[#8ca4ac] hover:text-[#eeeeee]">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="fc-label block mb-1.5">Confirm password</label>
              <input type="password" required value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="fc-input" placeholder="Confirm new password" />
            </div>

            {password && (
              <div className="space-y-1.5 px-1">
                {requirements.map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <Check className={`w-3 h-3 flex-shrink-0 ${r.ok ? 'text-[#22c55e]' : 'text-[#1c2229]'}`} />
                    <span className={`text-2xs font-mono ${r.ok ? 'text-[#22c55e]' : 'text-[#8ca4ac]'}`}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button type="submit"
              disabled={loading || !requirements.every(r => r.ok) || !token}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>

          <p className="text-center text-xs text-[#8ca4ac] mt-6">
            <Link href="/auth/login" className="text-[#217eaa] hover:underline">Back to sign in</Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#090b0d] flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1014] border-r border-[#1c2229] flex-col px-16 py-14">
        <div className="flex items-center gap-2.5 mb-16">
          <div className="w-8 h-8 rounded bg-[#217eaa]/20 border border-[#217eaa]/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#217eaa]" />
          </div>
          <span className="font-bold text-[#eeeeee] tracking-tight text-lg">FortiChain</span>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-bold text-[#eeeeee] leading-tight mb-4">Set a new<br />password</h1>
          <p className="text-[#8ca4ac] text-sm leading-relaxed max-w-sm">
            Choose a strong password that you haven&apos;t used before. Your GEN wallet and all protocol data remain intact.
          </p>
        </div>
        <p className="text-2xs text-[#8ca4ac]/40 font-mono">GenLayer StudioNet · GEN Token</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Suspense fallback={<Loader2 className="w-5 h-5 text-[#217eaa] animate-spin" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
