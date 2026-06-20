'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/v1/auth/login', form);
      localStorage.setItem('refresh_token', res.data.refresh);
      setUser(res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md">
      <div className="card-fort p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-fort-cyan/10 border border-fort-cyan/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-fort-cyan" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-fort-muted text-sm mt-2">Sign in to your FortiChain console</p>
        </div>

        {error && (
          <div className="bg-fort-danger/10 border border-fort-danger/30 rounded-lg px-4 py-3 text-fort-danger text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-fort-muted mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-3 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 transition-colors"
              placeholder="you@protocol.io"
            />
          </div>
          <div>
            <label className="block text-sm text-fort-muted mb-1.5">Password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-fort-surface border border-fort-border rounded-lg px-4 py-3 pr-10 text-white placeholder-fort-muted focus:outline-none focus:border-fort-cyan/50 transition-colors"
                placeholder="Your password"
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-3.5 text-fort-muted hover:text-white">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fort-cyan text-fort-bg font-bold py-3 rounded-xl hover:bg-fort-cyan/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-fort-muted text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-fort-cyan hover:underline">Create one</Link>
        </p>
      </div>
    </motion.div>
  );
}
