'use client';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, ShieldOff, Skull } from 'lucide-react';

const tiers = [
  {
    tier: 0,
    label: 'Safe',
    icon: CheckCircle2,
    color: 'text-[#22c55e]',
    border: 'border-[#22c55e]/30',
    bg: 'bg-[#22c55e]/5',
    range: '0–19 Risk',
    actions: ['No immediate action required', 'Continue standard monitoring', 'Log for audit trail'],
  },
  {
    tier: 1,
    label: 'Warning',
    icon: AlertCircle,
    color: 'text-yellow-400',
    border: 'border-yellow-400/30',
    bg: 'bg-yellow-400/5',
    range: '20–39 Risk',
    actions: ['Notify security team', 'Publish risk report', 'Increase monitoring frequency'],
  },
  {
    tier: 2,
    label: 'Restricted',
    icon: AlertTriangle,
    color: 'text-[#f59e0b]',
    border: 'border-[#f59e0b]/30',
    bg: 'bg-[#f59e0b]/5',
    range: '40–59 Risk',
    actions: ['Limit transaction sizes', 'Restrict sensitive functions', 'Alert on-call team'],
  },
  {
    tier: 3,
    label: 'Emergency',
    icon: ShieldOff,
    color: 'text-[#ef4444]',
    border: 'border-[#ef4444]/30',
    bg: 'bg-[#ef4444]/5',
    range: '60–79 Risk',
    actions: ['Pause protocol operations', 'Disable vulnerable modules', 'Activate incident response'],
  },
  {
    tier: 4,
    label: 'Critical',
    icon: Skull,
    color: 'text-red-500',
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    range: '80–100 Risk',
    actions: ['Freeze all critical operations', 'Trigger governance emergency', 'Alert regulators & partners'],
  },
];

export function ThreatLevelsSection() {
  return (
    <section className="py-24 bg-fort-surface/30">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16">
          <span className="text-fort-cyan text-sm font-semibold tracking-widest uppercase">Response Framework</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-4">5-Tier Threat Response</h2>
          <p className="text-fort-muted text-lg max-w-2xl mx-auto">
            Graduated tiers matched to exploit severity and AI consensus confidence across 5 validators.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.tier}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`border rounded-xl p-5 ${tier.border} ${tier.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <tier.icon className={`w-5 h-5 ${tier.color}`} />
                <span className={`text-xs font-mono font-bold ${tier.color} opacity-60`}>TIER {tier.tier}</span>
              </div>
              <h3 className={`text-base font-bold ${tier.color} mb-1`}>{tier.label}</h3>
              <p className="text-fort-muted text-xs mb-4 font-mono">{tier.range}</p>
              <ul className="space-y-1.5">
                {tier.actions.map(action => (
                  <li key={action} className="text-fort-text text-xs flex items-start gap-2">
                    <span className={`w-1 h-1 rounded-full ${tier.color} mt-1.5 flex-shrink-0`} style={{ background: 'currentColor' }} />
                    {action}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
