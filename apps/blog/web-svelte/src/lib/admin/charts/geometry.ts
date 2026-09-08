/**
 * 차트의 **순수 계산** — 좌표 하나도 화면에서 만들지 않는다.
 *
 * Recharts 자리에 라이브러리를 들이지 않고 SVG를 직접 그린다. 대시보드가 쓰는
 * 그림은 셋(영역·막대·스파크라인)이고 상호작용은 툴팁 하나뿐인데, Recharts는
 * 그 대가로 admin 청크에 gzip 세 자릿수 KB를 싣는다. 무엇을 잃는지도 적어 둔다:
 * 축 눈금 자동 계산, 애니메이션, 범례, 브러시·줌. 이 화면들은 쓰지 않는다.
 *
 * 계산을 여기 떼어 둔 이유는 테스트다 — 빈 배열·값이 전부 0·한 점짜리 계열은
 * 화면에서 눈으로 잡기 어렵고(선이 안 보이거나 NaN이 조용히 들어간다), 정작
 * 그때가 데이터가 없는 새 사이트의 첫 화면이다.
 */

export interface Point {
  label: string;
  value: number;
}

export interface PlotBox {
  width: number;
  height: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  padLeft: number;
}

export const DEFAULT_BOX: PlotBox = {
  width: 720,
  height: 240,
  padTop: 12,
  padRight: 12,
  padBottom: 28,
  padLeft: 44,
};

/**
 * 값의 상한. **0으로 나누지 않는다** — 전부 0인 계열(새 사이트의 첫날)에서
 * 그냥 `max`를 쓰면 모든 y가 NaN이 되고 path가 통째로 사라진다.
 */
export function scaleMax(values: number[]): number {
  const max = Math.max(0, ...values);
  return max === 0 ? 1 : max;
}

/** 점 → 화면 좌표. 점이 하나뿐이면 가로 가운데에 둔다(0으로 나누기 방지). */
export function project(points: Point[], box: PlotBox): [number, number][] {
  const max = scaleMax(points.map(p => p.value));
  const innerW = box.width - box.padLeft - box.padRight;
  const innerH = box.height - box.padTop - box.padBottom;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  return points.map((point, i) => {
    const x =
      points.length > 1 ? box.padLeft + step * i : box.padLeft + innerW / 2;
    const y = box.padTop + innerH * (1 - point.value / max);
    return [x, y];
  });
}

/** 꺾은선 `d`. 점이 없으면 빈 문자열 — `<path d="">`는 아무것도 그리지 않는다. */
export function linePath(points: Point[], box: PlotBox): string {
  const coords = project(points, box);
  if (coords.length === 0) return '';
  return coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
}

/** 영역 `d` — 꺾은선을 바닥까지 닫는다. */
export function areaPath(points: Point[], box: PlotBox): string {
  const coords = project(points, box);
  if (coords.length === 0) return '';
  const floor = box.height - box.padBottom;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first === undefined || last === undefined) return '';
  return `${linePath(points, box)} L${last[0]} ${floor} L${first[0]} ${floor} Z`;
}

/**
 * y축 눈금 — 0부터 상한까지 `count`등분한 **값**이다. 눈금 자리를 예쁘게 고르는
 * 일(1·2·5 배수)은 하지 않는다. 조회수는 자릿수가 널뛰어서, 예쁜 눈금을 고르면
 * 상한이 실제 최댓값보다 한참 위로 가 그래프가 납작해진다.
 */
export function yTicks(points: Point[], count = 4): number[] {
  const max = scaleMax(points.map(p => p.value));
  return Array.from({ length: count + 1 }, (_, i) =>
    Math.round((max / count) * i),
  );
}

/**
 * x축 라벨을 솎아 낸다 — 30일치를 다 찍으면 글자가 겹친다. 처음과 끝은 항상
 * 남긴다(구간이 어디부터 어디까지인지가 눈금 자체보다 중요하다).
 */
export function thinLabels(points: Point[], maxLabels = 6): boolean[] {
  if (points.length <= maxLabels) return points.map(() => true);
  const stride = Math.ceil(points.length / maxLabels);
  return points.map((_, i) => i % stride === 0 || i === points.length - 1);
}
