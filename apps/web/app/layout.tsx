import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'FortiChain — AI-Native DeFi Security',
  description: 'AI-native security judgment layer for autonomous DeFi protection. Powered by GenLayer validator consensus.',
  openGraph: {
    title: 'FortiChain',
    description: 'Real-time AI security monitoring for DeFi protocols',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
