'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Shield } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&q=80"
          alt="Blockchain network"
          fill
          className="object-cover opacity-8"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-fort-bg via-fort-bg/90 to-fort-bg/80" />
      </div>
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}>
          <div className="w-16 h-16 rounded-2xl bg-fort-cyan/10 border border-fort-cyan/30 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
            <Shield className="w-8 h-8 text-fort-cyan" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Don't Wait for the Exploit
          </h2>
          <p className="text-fort-muted text-xl mb-10 max-w-2xl mx-auto">
            Every major DeFi exploit in history had detectable signals.
            FortiChain catches them before they become catastrophic.
          </p>
          <Link href="/auth/signup"
            className="inline-block bg-fort-cyan text-fort-bg font-bold px-10 py-4 rounded-xl text-lg hover:bg-fort-cyan/90 transition-all hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] active:scale-95">
            Protect Your Protocol Now
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
