import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { CustomTooltip } from './KPICard';

interface EntityDistributionChartProps {
  data: Array<{
    type: string;
    count: number;
  }>;
}

export default function EntityDistributionChart({ data }: EntityDistributionChartProps) {
  return (
    <div
      className="lg:col-span-2 signature-card flex flex-col"
      style={{
        padding: '2.5rem',
        gap: '2.5rem',
      }}
    >
      <h3 className="text-sm font-semibold text-white/70">
        Category distribution
      </h3>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 24, left: 24, bottom: 36 }}
          >
            <XAxis
              dataKey="type"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              dy={12}
              interval={0}
            />
            <YAxis hide />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} animationDuration={1200}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={ENTITY_COLORS[entry.type as EntityType] || 'var(--accent)'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
