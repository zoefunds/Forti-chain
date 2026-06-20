'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface Protocol {
  name: string;
  riskScore: number;
}

interface Props {
  protocols: Protocol[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-fort-card border border-fort-border rounded-lg px-3 py-2 text-xs">
      <p className="text-fort-muted mb-1">{label}</p>
      <p className="text-fort-cyan font-mono font-bold">{payload[0].value}/100</p>
    </div>
  );
};

export function RiskChart({ protocols }: Props) {
  if (!protocols.length) {
    return (
      <div className="h-48 flex items-center justify-center text-fort-muted text-sm">
        No protocols to chart yet
      </div>
    );
  }

  const data = protocols.map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    risk: p.riskScore ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D40" />
        <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="risk"
          stroke="#00D4FF"
          strokeWidth={2}
          fill="url(#riskGrad)"
          dot={{ fill: '#00D4FF', r: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
