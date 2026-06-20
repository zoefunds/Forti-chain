import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-fort-border bg-fort-surface/50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-fort-cyan/10 border border-fort-cyan/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-fort-cyan" />
              </div>
              <span className="font-bold text-white">FortiChain</span>
            </Link>
            <p className="text-fort-muted text-sm leading-relaxed">
              AI-native security judgment layer for autonomous DeFi protection.
            </p>
          </div>
          {[
            { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
            { title: 'Developers', links: ['API Reference', 'SDK', 'GenLayer Docs', 'GitHub'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-white font-semibold text-sm mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(link => (
                  <li key={link}>
                    <Link href="#" className="text-fort-muted text-sm hover:text-white transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-fort-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-fort-muted text-sm">© 2025 FortiChain. All rights reserved.</p>
          <p className="text-fort-muted text-xs font-mono">Powered by GenLayer StudioNet · GEN Token</p>
        </div>
      </div>
    </footer>
  );
}
