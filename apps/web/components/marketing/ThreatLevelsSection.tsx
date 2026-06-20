'use client';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, ShieldOff, Skull } from 'lucide-react';

const levels = [
  {
    level: 1,
    label: 'Warning',
    icon: AlertCircle,
    color: 'text-yellow-400',
    border: 'border-yellow-400/30',
    bg: 'bg-yellow-400/5',
    range: '0–24 Risk',
    actions: ['Notify security team', 'Publish risk report', 'Increase monitoring frequency'],
  },
  {
    level: 2,
    label: 'Restricted Mode',
    icon: AlertTriangle,
    color: 'text-fort-warning',
    border: 'border-fort-warning/30',
    bg: 'bg-fort-warning/5',
    range: '25–49 Risk',
    actions: ['Limit transaction sizes', 'Restrict sensitive functions', 'Alert on-call team'],
  },
  {
    level: 3,
    label: 'Emergency Pause',
    icon: ShieldOff,
    color: 'text-fort-danger',
    border: 'border-fort-danger/30',
    bg: 'bg-fort-danger/5',
    range: '50–74 Risk',
    actions: ['Pause protocol operations', 'Disable vulnerable modules', 'Activate incident response'],
  },
  {
    level: 4,
    label: 'Full Containment',
    icon: Skull,
    color: 'text-red-500',
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    range: '75–100 Risk',
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
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-4">4-Level Threat Response</h2>
          <p className="text-fort-muted text-lg max-w-2xl mx-auto">
            Graduated responses matched to exploit severity and AI consensus confidence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {levels.map((level, i) => (
            <motion.div
              key={level.level}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`border rounded-xl p-6 ${level.border} ${level.bg}`}>
              <div className="flex items-center gap-3 mb-4">
                <level.icon className={`w-6 h-6 ${level.color}`} />
                <span className={`text-xs font-mono font-bold ${level.color} opacity-60`}>LEVEL {level.level}</span>
              </div>
              <h3 className={`text-lg font-bold ${level.color} mb-1`}>{level.label}</h3>
              <p className="text-fort-muted text-xs mb-4 font-mono">{level.range}</p>
              <ul className="space-y-2">
                {level.actions.map(action => (
                  <li key={action} className="text-fort-text text-sm flex items-start gap-2">
                    <span className={`w-1 h-1 rounded-full ${level.color} mt-2 flex-shrink-0`} />
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
