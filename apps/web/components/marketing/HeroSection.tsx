'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, Activity, Zap, AlertTriangle, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Stats {
  protocolsMonitored: number;
  judgmentsMade: number;
  alertsDispatched: number;
  validators: number;
  avgResponseMinutes: string;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function HeroSection() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/v1/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const statCards = [
    {
      label: 'Protocols Monitored',
      value: stats ? formatCount(stats.protocolsMonitored) : '—',
      icon: Shield,
      color: '#217eaa',
    },
    {
      label: 'AI Judgments',
      value: stats ? formatCount(stats.judgmentsMade) : '—',
      icon: Activity,
      color: '#7d9cb7',
    },
    {
      label: 'Alerts Dispatched',
      value: stats ? formatCount(stats.alertsDispatched) : '—',
      icon: AlertTriangle,
      color: '#f59e0b',
    },
    {
      label: 'Avg Consensus Time',
      value: stats ? `${stats.avgResponseMinutes} min` : '—',
      icon: Zap,
      color: '#22c55e',
    },
  ];

  const validators = stats?.validators ?? 5;

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20">
      {/* Subtle grid background */}
      <div className="absolute inset-0 z-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#217eaa 1px, transparent 1px), linear-gradient(to right, #217eaa 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#217eaa]/30 to-transparent"
          animate={{ y: ['-10vh', '110vh'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto">

          <div className="inline-flex items-center gap-2 bg-[#217eaa]/10 border border-[#217eaa]/20 rounded-full px-4 py-2 mb-8">
            <span className="dot-live" />
            <span className="text-[#217eaa] text-xs font-mono uppercase tracking-widest">
              Powered by {validators} GenLayer AI Validators
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-[#eeeeee] mb-6 leading-[1.1] tracking-tight">
            <span className="text-[#217eaa]">AI-Native</span> Security<br />
            for DeFi Protocols
          </h1>

          <p className="text-lg text-[#8ca4ac] max-w-2xl mx-auto mb-10 leading-relaxed">
            FortiChain monitors on-chain activity, threat feeds, and social signals — then uses GenLayer validator consensus
            to determine if your protocol is under attack. In 1–3 minutes, with full on-chain auditability.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/auth/signup" className="btn-primary text-base px-8 py-3.5 gap-2">
              Start Monitoring Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#how-it-works" className="btn-outline text-base px-8 py-3.5">
              See How It Works
            </Link>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="fc-card p-4 text-left">
                <s.icon className="w-4 h-4 mb-2 flex-shrink-0" style={{ color: s.color }} />
                <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="text-[#8ca4ac] text-2xs mt-1 font-mono">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Console preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-20 fc-card border-[#217eaa]/20 overflow-hidden shadow-[0_0_60px_rgba(33,126,170,0.08)]">
          <div className="bg-[#0d1014] border-b border-[#1c2229] px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/60" />
            </div>
            <span className="text-[#8ca4ac] text-2xs font-mono mx-auto uppercase tracking-widest">
              FortiChain Security Console — Live
            </span>
            <span className="dot-live" />
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Threat Level', value: 'LOW', color: '#22c55e' },
              { label: 'Active Alerts', value: stats ? String(stats.alertsDispatched) : '—', color: '#f59e0b' },
              { label: 'Validators', value: `${validators}/${validators}`, color: '#217eaa' },
            ].map(item => (
              <div key={item.label} className="bg-[#0d1014] border border-[#1c2229] rounded p-5 text-center">
                <div className="font-mono text-3xl font-bold tabular-nums mb-2" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="fc-label">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
