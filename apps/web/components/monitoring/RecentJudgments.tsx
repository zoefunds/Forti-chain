'use client';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Brain, CheckCircle } from 'lucide-react';

const LEVEL_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Warning',     color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  2: { label: 'Restricted',  color: 'text-fort-warning', bg: 'bg-fort-warning/10 border-fort-warning/30' },
  3: { label: 'Emergency',   color: 'text-fort-danger',  bg: 'bg-fort-danger/10 border-fort-danger/30' },
  4: { label: 'Critical',    color: 'text-red-500',      bg: 'bg-red-500/10 border-red-500/30' },
};

interface Judgment {
  id: string;
  protocolId: string;
  riskScore: number;
  level: number;
  recommendedAction: string;
  consensusReached: boolean;
  createdAt: string;
}

export function RecentJudgments({ judgments }: { judgments: Judgment[] }) {
  if (!judgments.length) {
    return (
      <div className="text-center py-10">
        <Brain className="w-10 h-10 text-fort-muted mx-auto mb-3" />
        <p className="text-fort-muted text-sm">No AI judgments yet — add a protocol and trigger analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {judgments.map((j, i) => {
        const cfg = LEVEL_CONFIG[j.level] ?? LEVEL_CONFIG[1];
        return (
          <motion.div
            key={j.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 p-3 rounded-xl bg-fort-surface border border-fort-border hover:border-fort-cyan/20 transition-all">
            {/* Risk score ring */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#1E2D40" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={j.riskScore >= 75 ? '#FF4444' : j.riskScore >= 50 ? '#FF9500' : j.riskScore >= 25 ? '#FFB800' : '#00FF88'}
                  strokeWidth="3"
                  strokeDasharray={`${(j.riskScore / 100) * 94.2} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white">
                {j.riskScore}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
                {j.consensusReached && (
                  <CheckCircle className="w-3 h-3 text-fort-green" />
                )}
              </div>
              <p className="text-white text-sm truncate">{j.recommendedAction}</p>
              <p className="text-fort-muted text-xs font-mono truncate">ID: {j.id.slice(0, 28)}…</p>
            </div>

            <span className="text-fort-muted text-xs flex-shrink-0">
              {formatDistanceToNow(new Date(j.createdAt), { addSuffix: true })}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
