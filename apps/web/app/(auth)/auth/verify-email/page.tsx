'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token provided.'); return; }
    api.get(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => {
        setStatus('success');
        setMessage(res.data.message ?? 'Email verified successfully!');
        setTimeout(() => router.push('/dashboard'), 2500);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.error ?? 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#090b0d] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="fc-card p-8 space-y-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[#217eaa]" />
            <span className="font-bold text-[#eeeeee]">FortiChain</span>
          </div>

          {status === 'loading' && (
            <>
              <Loader2 className="w-10 h-10 text-[#217eaa] animate-spin mx-auto" />
              <div>
                <h1 className="text-[#eeeeee] font-semibold text-lg">Verifying your email…</h1>
                <p className="text-xs text-[#8ca4ac] mt-2">Please wait a moment.</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-10 h-10 text-[#22c55e] mx-auto" />
              <div>
                <h1 className="text-[#eeeeee] font-semibold text-lg">Email Verified!</h1>
                <p className="text-xs text-[#8ca4ac] mt-2">{message}</p>
                <p className="text-xs text-[#8ca4ac] mt-1">Redirecting to dashboard…</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-10 h-10 text-[#ef4444] mx-auto" />
              <div>
                <h1 className="text-[#eeeeee] font-semibold text-lg">Verification Failed</h1>
                <p className="text-xs text-[#8ca4ac] mt-2">{message}</p>
              </div>
              <Link href="/dashboard" className="btn-primary text-sm w-full block text-center">
                Go to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
