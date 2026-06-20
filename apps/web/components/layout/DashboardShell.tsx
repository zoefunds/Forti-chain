'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield, LayoutDashboard, Server, Bell, Activity,
  Key, Wallet, Settings, LogOut, Menu, ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { usePolling } from '@/lib/usePolling';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/protocols', label: 'Protocols', icon: Server },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboard/intelligence', label: 'Intelligence', icon: Activity },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, fetchMe, isLoading, refreshBalance } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth guard — fetch user on mount, redirect if not authed
  useEffect(() => {
    if (!user) {
      fetchMe().then(() => {
        const u = useAuthStore.getState().user;
        if (!u) router.push('/auth/login');
      });
    }
  }, []);

  // Refresh GEN balance every 2 minutes
  usePolling(refreshBalance, 2 * 60 * 1000, !!user);

  const genBalance = parseFloat(user?.genBalanceCache ?? '0');

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-fort-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-fort-cyan/10 border border-fort-cyan/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-fort-cyan" />
          </div>
          <span className="font-bold text-white">FortiChain</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-fort-cyan/10 text-fort-cyan border border-fort-cyan/20'
                  : 'text-fort-muted hover:text-white hover:bg-fort-surface'
              }`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-fort-border">
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{user?.email ?? '...'}</p>
          <p className="text-fort-muted text-xs font-mono truncate">
            {user?.walletAddress ? `${user.walletAddress.slice(0, 10)}...${user.walletAddress.slice(-6)}` : '...'}
          </p>
        </div>
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-fort-muted hover:text-fort-danger hover:bg-fort-danger/10 transition-all w-full">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-fort-bg">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-10 h-10 text-fort-cyan animate-pulse" />
          <p className="text-fort-muted text-sm">Loading FortiChain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-fort-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-fort-surface border-r border-fort-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden" />
            <motion.aside
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-60 bg-fort-surface border-r border-fort-border z-50 md:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-fort-border bg-fort-surface/50 flex items-center px-4 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-fort-muted hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <span className="w-2 h-2 rounded-full bg-fort-green animate-pulse" />
            <span className="text-fort-muted text-xs">Live</span>

            {/* GEN balance pill */}
            <div className="bg-fort-cyan/10 border border-fort-cyan/20 rounded-lg px-3 py-1">
              <span className="text-fort-cyan text-xs font-mono">
                {genBalance > 0 ? `${genBalance.toFixed(4)} GEN` : '0 GEN'}
              </span>
            </div>

            {/* Subscription tier */}
            {user?.subscriptionTier === 'free' && (
              <Link href="/dashboard/wallet"
                className="flex items-center gap-1.5 text-xs text-fort-warning border border-fort-warning/20 px-2.5 py-1 rounded-lg hover:bg-fort-warning/10 transition-all">
                <AlertCircle className="w-3 h-3" />
                Free
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
