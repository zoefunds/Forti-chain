'use client';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

const CHAIN_NODES = [
  { label: 'Ethereum', x: '48%', y: '38%', risk: 'low' },
  { label: 'Arbitrum', x: '51%', y: '35%', risk: 'medium' },
  { label: 'Polygon', x: '62%', y: '48%', risk: 'low' },
  { label: 'Optimism', x: '44%', y: '41%', risk: 'high' },
  { label: 'BNB', x: '72%', y: '43%', risk: 'low' },
  { label: 'Avalanche', x: '25%', y: '42%', risk: 'medium' },
  { label: 'Solana', x: '28%', y: '50%', risk: 'low' },
];

const RISK_COLOR: Record<string, string> = {
  low: '#00FF88',
  medium: '#FF9500',
  high: '#FF4444',
};

interface Props {
  protocols: any[];
}

export function GlobalThreatMap({ protocols }: Props) {
  return (
    <div className="relative h-48 bg-fort-surface/50 rounded-xl overflow-hidden border border-fort-border">
      {/* World map SVG background */}
      <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 1000 500">
        <path fill="#00D4FF" d="M150,100 Q200,80 250,100 Q300,120 350,100 Q400,80 420,110 L430,200 Q400,220 350,210 Q300,200 250,210 Q200,220 180,200 Z" />
        <path fill="#00D4FF" d="M450,90 Q520,70 600,80 Q680,90 750,70 Q800,60 850,80 L860,180 Q820,200 760,190 Q700,180 640,190 Q580,200 520,185 Q480,175 460,190 L450,90 Z" />
        <path fill="#00D4FF" d="M200,230 Q260,210 320,225 Q370,240 380,280 Q370,320 320,330 Q270,340 220,320 Q180,300 190,265 Z" />
        <path fill="#00D4FF" d="M480,220 Q540,200 600,215 Q660,230 690,260 Q710,290 700,320 Q680,350 640,355 Q590,360 550,340 Q510,320 495,290 Q480,260 480,220 Z" />
        <path fill="#00D4FF" d="M700,230 Q760,215 810,230 Q850,245 855,275 Q850,310 810,320 Q770,330 730,315 Q695,300 695,270 Z" />
        <path fill="#00D4FF" d="M620,350 Q660,340 690,355 Q710,370 705,395 Q695,415 670,420 Q645,425 630,405 Q615,385 620,360 Z" />
      </svg>

      {/* Threat nodes */}
      {CHAIN_NODES.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute flex flex-col items-center"
          style={{ left: node.x, top: node.y, transform: 'translate(-50%,-50%)' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}>
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: RISK_COLOR[node.risk] }}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
          <span className="text-[9px] text-fort-muted mt-0.5 whitespace-nowrap">{node.label}</span>
        </motion.div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        {Object.entries(RISK_COLOR).map(([k, color]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-fort-muted capitalize">{k}</span>
          </div>
        ))}
      </div>

      {!protocols.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Globe className="w-8 h-8 text-fort-muted mx-auto mb-1" />
            <p className="text-fort-muted text-xs">Add protocols to see threat map</p>
          </div>
        </div>
      )}
    </div>
  );
}
