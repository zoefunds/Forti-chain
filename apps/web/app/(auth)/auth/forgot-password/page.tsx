'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Shield, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/api/v1/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#090b0d] flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1014] border-r border-[#1c2229] flex-col px-16 py-14">
        <div className="flex items-center gap-2.5 mb-16">
          <div className="w-8 h-8 rounded bg-[#217eaa]/20 border border-[#217eaa]/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#217eaa]" />
          </div>
          <span className="font-bold text-[#eeeeee] tracking-tight text-lg">FortiChain</span>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-bold text-[#eeeeee] leading-tight mb-4">Forgot your<br />password?</h1>
          <p className="text-[#8ca4ac] text-sm leading-relaxed max-w-sm">
            Enter your email address and we&apos;ll send you a secure link to reset your password. The link expires in 15 minutes.
          </p>
        </div>
        <p className="text-2xs text-[#8ca4ac]/40 font-mono">GenLayer StudioNet · GEN Token</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/auth/login" className="flex items-center gap-1.5 text-xs text-[#8ca4ac] hover:text-[#eeeeee] mb-8 font-mono">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-[#22c55e]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#eeeeee]">Check your email</h2>
                <p className="text-xs text-[#8ca4ac] mt-2 leading-relaxed">
                  If <span className="text-[#eeeeee] font-mono">{email}</span> is registered, a reset link has been sent.
                  Check your inbox — the link expires in 15 minutes.
                </p>
              </div>
              <Link href="/auth/login" className="btn-primary w-full mt-4">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[#eeeeee]">Reset password</h2>
                <p className="text-xs text-[#8ca4ac] mt-1">We&apos;ll send a reset link to your email</p>
              </div>

              {error && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded px-4 py-3 text-[#ef4444] text-xs font-mono mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="fc-label block mb-1.5">Email address</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="fc-input" placeholder="you@protocol.io" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
