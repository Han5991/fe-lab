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
  // 데이터 1개일 땐 가운데에 점을 찍고, 채움 영역은 그리지 않습니다.
  // (length-1이 0이 되면 step=Infinity로 좌측 1점만 찍히고 fillPath가 깨집니다.)
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const xs = data.length > 1
    ? data.map((_, i) => i * step)
    : [w / 2];
  const pts = data
    .map((v, i) => `${xs[i].toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`)
    .join(' ');
  const fillPath =
    fill && data.length > 1
      ? `M0,${h} L${pts.replace(/ /g, ' L')} L${w},${h} Z`
      : null;
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
