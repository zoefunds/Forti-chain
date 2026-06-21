'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield, LayoutDashboard, Server, Bell, Activity,
  Key, Wallet, Settings, LogOut, Menu, X, User, Crown,
  CheckCircle, AlertTriangle, Info, Trash2, MailCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { usePolling } from '@/lib/usePolling';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

const NAV = [
  { href: '/dashboard',              label: 'Overview',      icon: LayoutDashboard },
  { href: '/dashboard/protocols',    label: 'Protocols',     icon: Server },
  { href: '/dashboard/alerts',       label: 'Alerts',        icon: Bell },
  { href: '/dashboard/intelligence', label: 'Intelligence',  icon: Activity },
  { href: '/dashboard/api-keys',     label: 'API Keys',      icon: Key },
  { href: '/dashboard/wallet',       label: 'Wallet',        icon: Wallet },
  { href: '/dashboard/settings',     label: 'Settings',      icon: Settings },
];

// ── Notification Bell ─────────────────────────────────────────────
interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/api/v1/notifications');
      setUnread(data.unread ?? 0);
      setNotifications(data.notifications ?? []);
    } catch {}
  }

  usePolling(fetchNotifications, 60_000, true);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    try {
      await api.patch('/api/v1/notifications/read-all');
      setUnread(0);
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    } catch {}
  }

  async function deleteNotif(id: string) {
    try {
      await api.delete(`/api/v1/notifications/${id}`);
      setNotifications(n => {
        const next = n.filter(x => x.id !== id);
        setUnread(next.filter(x => !x.read).length);
        return next;
      });
    } catch {}
  }

  const typeIcon: Record<string, React.ReactNode> = {
    judgment:     <Shield className="w-3.5 h-3.5 text-[#217eaa]" />,
    system_alert: <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />,
    email_verified: <CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />,
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded border border-[#1c2229] bg-[#111518] hover:border-[#217eaa]/40 transition-colors"
      >
        <Bell className="w-4 h-4 text-[#8ca4ac]" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#217eaa] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 top-10 w-80 bg-[#0d1014] border border-[#1c2229] rounded-lg shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2229]">
              <span className="text-xs font-semibold text-[#eeeeee]">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-2xs text-[#217eaa] hover:text-[#eeeeee] transition-colors">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8ca4ac]">No notifications yet</div>
              ) : notifications.map(n => (
                <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-[#111518] hover:bg-[#111518] transition-colors ${!n.read ? 'bg-[#217eaa]/5' : ''}`}>
                  <div className="mt-0.5 flex-shrink-0">
                    {typeIcon[n.type] ?? <Info className="w-3.5 h-3.5 text-[#8ca4ac]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${!n.read ? 'text-[#eeeeee]' : 'text-[#8ca4ac]'}`}>{n.title}</p>
                    <p className="text-2xs text-[#8ca4ac] mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-2xs text-[#8ca4ac]/50 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => deleteNotif(n.id)}
                    className="flex-shrink-0 text-[#8ca4ac]/40 hover:text-[#ef4444] transition-colors mt-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Email Verification Banner ─────────────────────────────────────
function EmailVerificationBanner({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      // Pass email in body so this works even if access token is stale
      await api.post('/api/v1/auth/resend-verification', { email });
      setSent(true);
    } catch {}
    setSending(false);
  }

  return (
    <div className="bg-[#f59e0b]/10 border-b border-[#f59e0b]/30 px-4 py-2 flex items-center gap-3">
      <MailCheck className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
      <p className="text-xs text-[#f59e0b] flex-1">
        Please verify your email address <span className="font-medium">{email}</span> to unlock all features.
      </p>
      {sent ? (
        <span className="text-xs text-[#22c55e]">Email sent!</span>
      ) : (
        <button
          onClick={resend}
          disabled={sending}
          className="text-xs text-[#f59e0b] hover:text-[#eeeeee] font-medium transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const addr = user?.walletAddress
    ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
    : null;

  return (
    <div className="flex flex-col h-full bg-[#0d1014] border-r border-[#1c2229]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1c2229] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-7 h-7 rounded bg-[#217eaa]/20 border border-[#217eaa]/40 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-[#217eaa]" />
          </div>
          <span className="font-bold text-[#eeeeee] tracking-tight">FortiChain</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-[#8ca4ac] hover:text-[#eeeeee] md:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status indicator */}
      <div className="px-5 py-3 border-b border-[#1c2229]">
        <div className="flex items-center gap-2">
          <span className="dot-live" />
          <span className="text-2xs font-mono uppercase tracking-widest2 text-[#22c55e]">Live Monitor</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={active ? 'nav-item-active' : 'nav-item'}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-2xs font-mono uppercase tracking-widest text-[#8ca4ac]/50">Admin</span>
            </div>
            <Link href="/dashboard/admin" onClick={onClose}
              className={pathname.startsWith('/dashboard/admin') ? 'nav-item-active' : 'nav-item'}>
              <Crown className="w-4 h-4 flex-shrink-0 text-[#f59e0b]" />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#1c2229] p-3 space-y-1">
        <div className="px-3 py-2 rounded bg-[#111518]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-[#217eaa]/20 flex items-center justify-center">
              <User className="w-3 h-3 text-[#217eaa]" />
            </div>
            <p className="text-xs text-[#eeeeee] font-medium truncate">{user?.email ?? '—'}</p>
          </div>
          {addr && (
            <p className="text-2xs font-mono text-[#8ca4ac] truncate pl-8">{addr}</p>
          )}
        </div>
        <button onClick={logout}
          className="nav-item w-full text-left text-[#8ca4ac] hover:text-[#ef4444] hover:bg-[#ef4444]/5">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, fetchMe, isLoading, refreshBalance } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      fetchMe().then(() => {
        if (!useAuthStore.getState().user) router.push('/auth/login');
      });
    }
  }, []);

  usePolling(refreshBalance, 60_000, !!user);

  const genBalance = parseFloat(user?.genBalanceCache ?? '0');
  const emailUnverified = user && !(user as any).emailVerified;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b0d]">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-8 h-8 text-[#217eaa] animate-pulse" />
          <p className="text-2xs font-mono uppercase tracking-widest2 text-[#8ca4ac]">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#090b0d]">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40 md:hidden"
              onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -224 }} animate={{ x: 0 }} exit={{ x: -224 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 bottom-0 w-56 z-50 md:hidden">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Email verification banner */}
        {emailUnverified && <EmailVerificationBanner email={user?.email ?? ''} />}

        {/* Top bar */}
        <header className="h-12 border-b border-[#1c2229] bg-[#0d1014] flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden btn-ghost p-1.5">
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {/* GEN balance */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded border border-[#1c2229] bg-[#111518]">
              <span className="fc-label">GEN</span>
              <span className="font-mono text-xs text-[#eeeeee] tabular-nums">
                {genBalance.toFixed(4)}
              </span>
            </div>

            {/* Tier */}
            <div className="px-2 py-1 rounded border border-[#1c2229]">
              <span className="fc-label capitalize">{user?.subscriptionTier ?? 'free'}</span>
            </div>

            {/* Notification bell */}
            <NotificationBell />

            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-[#217eaa]/20 border border-[#217eaa]/40 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-[#217eaa]" />
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
