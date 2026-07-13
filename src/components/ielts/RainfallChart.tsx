interface Series {
  name: string;
  color: string;
  values: number[];
}

interface RainfallChartProps {
  months: string[];
  series: Series[];
  unit: string;
}

/** A clean, exam-style line chart rendered as inline SVG (no external assets). */
export function RainfallChart({ months, series, unit }: RainfallChartProps) {
  const W = 640;
  const H = 360;
  const m = { t: 16, r: 16, b: 34, l: 42 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;

  const max = Math.max(...series.flatMap((s) => s.values));
  const yMax = Math.ceil(max / 50) * 50;
  const ticks = Array.from({ length: yMax / 50 + 1 }, (_, i) => i * 50);

  const x = (i: number) => m.l + (pw * i) / (months.length - 1);
  const y = (v: number) => m.t + ph - (ph * v) / yMax;

  return (
    <div>
      {/* legend */}
      <div className="mb-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Line chart of monthly rainfall in ${unit}`}>
        {/* gridlines + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} y1={y(t)} x2={W - m.r} y2={y(t)} stroke="#e1e3e4" strokeWidth={1} />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#737780">
              {t}
            </text>
          </g>
        ))}

        {/* axes */}
        <line x1={m.l} y1={m.t} x2={m.l} y2={m.t + ph} stroke="#737780" strokeWidth={1} />
        <line x1={m.l} y1={m.t + ph} x2={W - m.r} y2={m.t + ph} stroke="#737780" strokeWidth={1} />

        {/* x labels */}
        {months.map((mo, i) => (
          <text key={mo} x={x(i)} y={m.t + ph + 20} textAnchor="middle" fontSize={11} fill="#737780">
            {mo}
          </text>
        ))}

        {/* unit label */}
        <text x={12} y={m.t + 4} fontSize={11} fill="#43474f" fontWeight={700}>
          {unit}
        </text>

        {/* series */}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="#fff" stroke={s.color} strokeWidth={2} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
