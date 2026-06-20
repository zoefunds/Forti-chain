'use client';
import { motion } from 'framer-motion';
import { Database, Brain, CheckCircle, Bell } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: Database,
    title: 'Signal Ingestion',
    description: 'FortiChain continuously ingests signals from Etherscan, Forta, DeFiLlama, Twitter, and news APIs — every 60 seconds.',
    color: 'text-fort-cyan',
    border: 'border-fort-cyan/30',
  },
  {
    num: '02',
    icon: Brain,
    title: 'AI Validator Analysis',
    description: '5 GenLayer validators independently evaluate threat signals using LLM reasoning trained on historical DeFi exploits.',
    color: 'text-fort-warning',
    border: 'border-fort-warning/30',
  },
  {
    num: '03',
    icon: CheckCircle,
    title: 'Consensus Judgment',
    description: 'GenLayer&apos;s optimistic consensus requires ≥4 of 5 validators to agree on the risk level before a judgment is committed on-chain.',
    color: 'text-fort-green',
    border: 'border-fort-green/30',
  },
  {
    num: '04',
    icon: Bell,
    title: 'Instant Response',
    description: 'Alerts dispatched via email and webhook within seconds of consensus. Your team receives risk score, level, and recommended action.',
    color: 'text-fort-danger',
    border: 'border-fort-danger/30',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16">
          <span className="text-fort-cyan text-sm font-semibold tracking-widest uppercase">Process</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-4">How FortiChain Works</h2>
          <p className="text-fort-muted text-lg max-w-2xl mx-auto">
            From anomaly to on-chain judgment in 1–3 minutes, powered by 5 independent AI validators.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-fort-cyan/20 via-fort-green/20 to-fort-danger/20" />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center">
                <div className={`relative w-16 h-16 rounded-2xl border ${step.border} bg-fort-card flex items-center justify-center mx-auto mb-4`}>
                  <step.icon className={`w-7 h-7 ${step.color}`} />
                  <span className={`absolute -top-2 -right-2 text-xs font-mono font-bold ${step.color} bg-fort-bg border ${step.border} rounded px-1`}>
                    {step.num}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-fort-muted text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
