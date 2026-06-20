'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '5 GEN',
    period: 'per analysis',
    description: 'For small protocols and builders exploring FortiChain.',
    features: [
      'Up to 3 protocols',
      'Manual analysis triggers',
      'Email alerts',
      'Dashboard access',
      '30-day history',
    ],
    cta: 'Start Free',
    href: '/auth/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '2 GEN',
    period: 'per analysis',
    description: 'For active DeFi protocols needing continuous monitoring.',
    features: [
      'Unlimited protocols',
      'Automated monitoring (60s)',
      'Email + webhook alerts',
      'API key access',
      '90-day history',
      'Priority validator queue',
    ],
    cta: 'Get Pro',
    href: '/auth/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'GEN volume discount',
    description: 'For institutional custodians, bridges, and DAO treasuries.',
    features: [
      'Everything in Pro',
      'Dedicated validator nodes',
      'Custom alert integrations',
      'SLA guarantees',
      'Unlimited history',
      'White-glove onboarding',
    ],
    cta: 'Contact Us',
    href: 'mailto:enterprise@fortichain.io',
    highlight: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16">
          <span className="text-fort-cyan text-sm font-semibold tracking-widest uppercase">Pricing</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-4">Pay Per Analysis in GEN</h2>
          <p className="text-fort-muted text-lg max-w-2xl mx-auto">
            No subscriptions. Load GEN into your FortiChain wallet and pay only for AI judgments you trigger.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`card-fort p-8 relative ${plan.highlight
                ? 'border-fort-cyan/50 shadow-[0_0_40px_rgba(0,212,255,0.15)]'
                : ''}`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-fort-cyan text-fort-bg text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-3xl font-bold font-mono ${plan.highlight ? 'text-fort-cyan' : 'text-white'}`}>
                    {plan.price}
                  </span>
                  <span className="text-fort-muted text-sm">/ {plan.period}</span>
                </div>
                <p className="text-fort-muted text-sm">{plan.description}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-fort-text">
                    <Check className="w-4 h-4 text-fort-green flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href}
                className={`w-full text-center block py-3 rounded-xl font-semibold transition-all ${
                  plan.highlight
                    ? 'bg-fort-cyan text-fort-bg hover:bg-fort-cyan/90 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]'
                    : 'border border-fort-border text-white hover:bg-fort-surface'
                }`}>
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
