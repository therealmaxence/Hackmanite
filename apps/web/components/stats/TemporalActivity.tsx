import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

interface TemporalActivityProps {
  temporal: {
    minDate: string | null;
    maxDate: string | null;
    activityHours: Array<{ hour: number; count: number }>;
  };
}

export default function TemporalActivity({ temporal }: TemporalActivityProps) {
  const { minDate, maxDate, activityHours } = temporal || {};

  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = activityHours?.find((h) => h.hour === i);
    return {
      hour: `${String(i).padStart(2, '0')}:00`,
      count: found ? found.count : 0,
    };
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const hasData = activityHours && activityHours.length > 0;

  return (
    <div
      className="signature-card flex flex-col justify-between lg:col-span-2"
      style={{
        padding: '2.5rem',
        gap: '2.5rem',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white/70">
            Temporal Span & Activity
          </h3>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mt-1">
            Data timeframe coverage and processing patterns
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-white/45 bg-white/[0.02] border border-white/[0.04] px-3 py-1 rounded-sm">
          <span>{formatDate(minDate)}</span>
          <span className="text-white/20">⟶</span>
          <span>{formatDate(maxDate)}</span>
        </div>
      </div>

      <div className="h-[200px] w-full">
        {!hasData ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest">
              No temporal data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A84CF0" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#A84CF0" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                interval={3}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div
                        className="px-3 py-2 rounded-sm shadow-lg text-[10px] font-mono"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <p className="text-white/40 mb-0.5">{payload[0].payload.hour}</p>
                        <p className="text-white/90 font-bold">
                          {payload[0].value} occurrences
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#A84CF0"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#activityGrad)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
