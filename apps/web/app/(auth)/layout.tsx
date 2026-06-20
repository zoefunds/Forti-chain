import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-fort-bg flex flex-col">
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-fort-cyan/10 border border-fort-cyan/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-fort-cyan" />
          </div>
          <span className="font-bold text-white">FortiChain</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
