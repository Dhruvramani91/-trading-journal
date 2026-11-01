import { useMemo } from 'react';
import type { TraderRadarScore } from '@/analytics/core/dashboardAnalytics';

interface TraderScoreRadarProps {
  scoreData: TraderRadarScore;
  className?: string;
}

export function TraderScoreRadar({ scoreData, className = '' }: TraderScoreRadarProps) {
  const size = 300;
  const center = size / 2;
  const maxRadius = 88;
  const axes = scoreData.axes;
  const angleStep = (Math.PI * 2) / axes.length;

  // Grid concentric polygons (levels: 20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const gridPolygons = useMemo(() => {
    return gridLevels.map((lvl) => {
      const r = maxRadius * lvl;
      const pts = axes.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return pts.join(' ');
    });
  }, [axes, angleStep, center, maxRadius]);

  // Active user data polygon points
  const activePolygon = useMemo(() => {
    const pts = axes.map((item, i) => {
      const r = (Math.min(100, Math.max(5, item.value)) / 100) * maxRadius;
      const angle = i * angleStep - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return pts.join(' ');
  }, [axes, angleStep, center, maxRadius]);

  // Points for small circular dots on active vertices
  const vertexPoints = useMemo(() => {
    return axes.map((item, i) => {
      const r = (Math.min(100, Math.max(5, item.value)) / 100) * maxRadius;
      const angle = i * angleStep - Math.PI / 2;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        label: item.label,
        value: item.displayValue,
      };
    });
  }, [axes, angleStep, center, maxRadius]);

  // Label coordinates around outer edge
  const labelPositions = useMemo(() => {
    const labelRadius = maxRadius + 32;
    return axes.map((item, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = center + labelRadius * Math.cos(angle);
      const y = center + labelRadius * Math.sin(angle);
      let textAnchor: 'middle' | 'start' | 'end' = 'middle';
      if (Math.abs(Math.cos(angle)) > 0.3) {
        textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
      }
      return {
        x,
        y: y + (angle === -Math.PI / 2 ? -4 : angle === Math.PI / 2 ? 8 : 4),
        textAnchor,
        label: item.label,
        display: item.displayValue,
      };
    });
  }, [axes, angleStep, center, maxRadius]);

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* Spider Chart SVG */}
      <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {/* Web grid lines */}
          {gridPolygons.map((pts, idx) => (
            <polygon
              key={idx}
              points={pts}
              fill="none"
              stroke="currentColor"
              className="text-line-strong/40 dark:text-[#22272f]"
              strokeWidth="1"
              strokeDasharray={idx === gridPolygons.length - 1 ? 'none' : '2 2'}
            />
          ))}

          {/* Radial axis spines */}
          {axes.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x2 = center + maxRadius * Math.cos(angle);
            const y2 = center + maxRadius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                className="text-line-strong/40 dark:text-[#22272f]"
                strokeWidth="1"
              />
            );
          })}

          {/* Filled polygon for trader score */}
          <polygon
            points={activePolygon}
            fill="url(#radarFillGrad)"
            stroke="#0284c7"
            className="dark:stroke-[#38bdf8] transition-all duration-700 ease-out"
            strokeWidth="2"
          />

          {/* Vertices circles */}
          {vertexPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              className="fill-bg-1 dark:fill-[#090a0c] stroke-sky-600 dark:stroke-[#38bdf8]"
              strokeWidth="2"
            />
          ))}

          {/* Outer text labels */}
          {labelPositions.map((lbl, i) => (
            <g key={i}>
              <text
                x={lbl.x}
                y={lbl.y}
                textAnchor={lbl.textAnchor}
                className="fill-fg-muted text-[11px] font-sans font-medium"
              >
                {lbl.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Score Number & Slider Track */}
      <div className="w-full mt-2 pt-4 border-t border-line">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-medium text-fg-muted">Precision Score</span>
          <span className="text-2xl font-bold tracking-tight text-fg font-mono">
            {scoreData.overallScore.toFixed(1)}
          </span>
        </div>

        {/* Gradient Slider Meter */}
        <div className="relative w-full h-1.5 rounded-full bg-bg-3 dark:bg-[#181b20] mt-2 mb-1">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #ef4444 0%, #eab308 40%, #22c55e 80%, #38bdf8 100%)',
            }}
          />
          {/* Slider Thumb Indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-line-strong dark:border-[#090a0c] shadow-[0_0_8px_rgba(56,189,248,0.8)] -ml-2 transition-all duration-700 ease-out"
            style={{ left: `${Math.min(98, Math.max(2, scoreData.overallScore))}%` }}
          />
        </div>

        {/* Scale Numbers */}
        <div className="flex justify-between text-[10px] text-fg-dim font-mono mt-1">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}
