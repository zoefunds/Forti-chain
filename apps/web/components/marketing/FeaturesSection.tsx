'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Brain, Zap, Shield, Eye, Bell, Key,
  BarChart2, Globe, Lock
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Validator Consensus',
    description: 'GenLayer&apos;s network of 5 AI validators independently analyze threat signals — requiring ≥4 to agree before any action is triggered.',
    color: 'text-fort-cyan',
    bg: 'bg-fort-cyan/10 border-fort-cyan/20',
  },
  {
    icon: Eye,
    title: 'Multi-Signal Intelligence',
    description: 'Aggregates on-chain transactions, Forta alerts, DeFiLlama TVL changes, social media, and news into a unified threat picture.',
    color: 'text-fort-green',
    bg: 'bg-fort-green/10 border-fort-green/20',
  },
  {
    icon: Zap,
    title: '1–3 Minute Consensus',
    description: 'From signal detection to an on-chain consensus judgment in 1–3 minutes across 5 independent AI validators.',
    color: 'text-fort-warning',
    bg: 'bg-fort-warning/10 border-fort-warning/20',
  },
  {
    icon: Shield,
    title: '5-Tier Response Framework',
    description: 'Graduated tiers from Safe to Critical — each mapped to exploit severity, confidence level, and recommended action.',
    color: 'text-fort-cyan',
    bg: 'bg-fort-cyan/10 border-fort-cyan/20',
  },
  {
    icon: Bell,
    title: 'Instant Multi-Channel Alerts',
    description: 'Email and webhook alerts delivered the moment consensus is reached. Integrate with your existing incident response workflow.',
    color: 'text-fort-danger',
    bg: 'bg-fort-danger/10 border-fort-danger/20',
  },
  {
    icon: Key,
    title: 'API-First Architecture',
    description: 'Full REST API with API key management. Integrate FortiChain judgments directly into your protocol smart contracts or backend.',
    color: 'text-fort-green',
    bg: 'bg-fort-green/10 border-fort-green/20',
  },
  {
    icon: Globe,
    title: 'Cross-Chain Coverage',
    description: 'Monitor protocols across Ethereum, Polygon, Arbitrum, Optimism, BNB Chain, and more from one dashboard.',
    color: 'text-fort-cyan',
    bg: 'bg-fort-cyan/10 border-fort-cyan/20',
  },
  {
    icon: Lock,
    title: 'Decentralized Judgment',
    description: 'No single point of failure. GenLayer&apos;s consensus mechanism ensures no validator can unilaterally trigger or suppress alerts.',
    color: 'text-fort-warning',
    bg: 'bg-fort-warning/10 border-fort-warning/20',
  },
  {
    icon: BarChart2,
    title: 'Historical Risk Analytics',
    description: 'Full audit trail of every judgment, signal, and alert. Replay any incident to understand exactly what happened.',
    color: 'text-fort-green',
    bg: 'bg-fort-green/10 border-fort-green/20',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=80"
          alt="Digital security"
          fill
          className="object-cover opacity-3"
        />
        <div className="absolute inset-0 bg-fort-bg/95" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16">
          <span className="text-fort-cyan text-sm font-semibold tracking-widest uppercase">Capabilities</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
            Every Layer of DeFi Security
          </h2>
          <p className="text-fort-muted text-lg max-w-2xl mx-auto">
            FortiChain combines on-chain data, threat intelligence, and AI consensus
            into one unified security layer.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="card-fort p-6 hover:border-fort-cyan/30 transition-all group">
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 ${feature.bg} group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-fort-muted text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
