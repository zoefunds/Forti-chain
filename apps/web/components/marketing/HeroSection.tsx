'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Activity, Zap, AlertTriangle } from 'lucide-react';

const liveStats = [
  { label: 'Protocols Monitored', value: '1,247', icon: Shield, color: 'text-fort-cyan' },
  { label: 'Threats Detected', value: '3,891', icon: AlertTriangle, color: 'text-fort-warning' },
  { label: 'Avg Response Time', value: '< 4s', icon: Zap, color: 'text-fort-green' },
  { label: 'AI Validations', value: '28.4K', icon: Activity, color: 'text-fort-cyan' },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&q=80"
          alt="Server infrastructure"
          fill
          className="object-cover opacity-5"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-fort-bg/80 via-fort-bg/60 to-fort-bg" />
        <div className="absolute inset-0 bg-radial-glow" />
      </div>

      {/* Animated scan line */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-fort-cyan/30 to-transparent"
          animate={{ y: ['-10vh', '110vh'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto">

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-fort-cyan/10 border border-fort-cyan/20 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-fort-green animate-pulse" />
            <span className="text-fort-cyan text-sm font-medium">Powered by GenLayer AI Validators</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            <span className="text-glow-cyan text-fort-cyan">AI-Native</span> Security<br />
            for DeFi Protocols
          </h1>

          <p className="text-xl text-fort-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            FortiChain monitors on-chain activity, threat feeds, and social signals —
            then uses GenLayer validator consensus to determine if your protocol is under attack.
            In seconds, not hours.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/signup"
              className="bg-fort-cyan text-fort-bg font-bold px-8 py-4 rounded-xl text-lg hover:bg-fort-cyan/90 transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] active:scale-95">
              Start Monitoring Free
            </Link>
            <Link href="#how-it-works"
              className="border border-fort-border text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-fort-surface transition-all">
              See How It Works
            </Link>
          </div>

          {/* Live stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {liveStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="card-fort p-4 text-left">
                <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                <div className="text-fort-muted text-xs mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-16 relative">
          <div className="absolute -inset-4 bg-fort-cyan/5 blur-3xl rounded-3xl" />
          <div className="relative card-fort overflow-hidden border-fort-cyan/20 shadow-[0_0_60px_rgba(0,212,255,0.1)]">
            <div className="bg-fort-surface border-b border-fort-border px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-fort-danger/70" />
                <div className="w-3 h-3 rounded-full bg-fort-warning/70" />
                <div className="w-3 h-3 rounded-full bg-fort-green/70" />
              </div>
              <span className="text-fort-muted text-xs font-mono mx-auto">FortiChain Security Console — Live</span>
              <span className="w-2 h-2 rounded-full bg-fort-green animate-pulse" />
            </div>
            <Image
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80"
              alt="Security monitoring dashboard"
              width={1200}
              height={500}
              className="w-full object-cover opacity-40"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 p-8 w-full max-w-3xl">
                {[
                  { label: 'THREAT LEVEL', value: 'LOW', color: 'text-fort-green', bg: 'bg-fort-green/10 border-fort-green/30' },
                  { label: 'ACTIVE ALERTS', value: '2', color: 'text-fort-warning', bg: 'bg-fort-warning/10 border-fort-warning/30' },
                  { label: 'VALIDATORS', value: '7/7', color: 'text-fort-cyan', bg: 'bg-fort-cyan/10 border-fort-cyan/30' },
                ].map(item => (
                  <div key={item.label} className={`border rounded-xl p-4 text-center ${item.bg} backdrop-blur-sm`}>
                    <div className={`text-3xl font-bold font-mono ${item.color}`}>{item.value}</div>
                    <div className="text-fort-muted text-xs mt-1 tracking-widest">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
