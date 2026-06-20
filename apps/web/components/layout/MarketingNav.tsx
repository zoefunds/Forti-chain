'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Shield, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-fort-bg/95 backdrop-blur-md border-b border-fort-border' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-fort-cyan/10 border border-fort-cyan/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-fort-cyan" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">FortiChain</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How It Works', 'Pricing', 'Docs'].map(item => (
            <Link key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
              className="text-sm text-fort-muted hover:text-white transition-colors">
              {item}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login"
            className="text-sm text-fort-muted hover:text-white transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/auth/signup"
            className="text-sm bg-fort-cyan text-fort-bg font-semibold px-4 py-2 rounded-lg hover:bg-fort-cyan/90 transition-colors">
            Get Started
          </Link>
        </div>

        <button className="md:hidden text-fort-muted" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-fort-surface border-b border-fort-border px-6 py-4 flex flex-col gap-4">
            {['Features', 'How It Works', 'Pricing', 'Docs'].map(item => (
              <Link key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-fort-muted hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}>
                {item}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-fort-border">
              <Link href="/auth/login" className="text-center text-fort-muted hover:text-white py-2">Sign In</Link>
              <Link href="/auth/signup"
                className="text-center bg-fort-cyan text-fort-bg font-semibold py-2 rounded-lg">
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
