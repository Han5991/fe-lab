interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: string;
}

export const Sparkline = ({
  data,
  w = 100,
  h = 24,
  color = 'oklch(40% 0.022 60)',
  fill,
}: SparklineProps) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / Math.max(1, data.length - 1);
  const pts = data
    .map((v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`)
    .join(' ');
  const fillPath = fill ? `M0,${h} L${pts.replace(/ /g, ' L')} L${w},${h} Z` : null;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {fillPath && <path d={fillPath} fill={fill} opacity={0.18} />}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};
