/**
 * 차례 레일의 **좌표 계산.** `apps/blog/web/src/components/post/TOC.tsx`에서
 * 옮겼고, 화면과 떼어 둔 이유는 순수 함수라 테스트가 붙기 때문이다.
 */

/**
 * 화면 맨 위에서 **고정 헤더가 덮는 높이.**
 *
 * 헤더가 지면 위에 떠 있어서 뷰포트 좌표로 0에 가까운 헤딩은 화면 안에 있어도
 * 가려져 안 보인다. 앵커로 이동할 때 더 올려 주는 값과, 활성 구간을 셀 때
 * "여기부터가 진짜 보이는 곳"으로 삼는 값이 **같아야** 둘이 어긋나지 않는다.
 */
export const HEADER_OFFSET = 100;

/** 레일이 단을 옮길 때 쓰는 곡선의 세로 길이. 전부 다음 항목 안에 들어간다. */
const ELBOW = 8;

/** 항목 하나가 차지하는 세로 구간과 레일이 서는 가로 위치. */
export interface Row {
  x: number;
  top: number;
  bottom: number;
}

/**
 * 항목 위치를 재서 레일 path를 만든다.
 *
 * 세로선은 각 항목의 높이만큼 내려가고, 앞뒤 항목의 단이 다르면 곡선으로
 * 갈아탄다. 곡선은 **전부 다음 항목 안쪽**에 들어간다 — 경계를 중심으로
 * 위아래 절반씩 걸치게 그리면, 하이라이트가 한 항목만 비출 때 곡선도 반토막이
 * 나 어디에도 안 닿는 조각이 허공에 남는다.
 */
export function buildPath(rows: readonly Row[]): string {
  const head = rows[0];
  if (head === undefined) return '';
  let d = `M ${head.x} 0`;

  rows.forEach((row, i) => {
    const next = rows[i + 1];
    const stepsHere = next !== undefined && next.x !== row.x;
    // 자기 항목은 언제나 바닥(= 다음 항목의 머리)까지 그린다.
    d += ` L ${row.x} ${stepsHere ? next.top : row.bottom}`;
    // 곡선의 세로 길이는 다음 항목 높이의 절반을 넘지 않게 묶는다. 높이가
    // 들쭉날쭉해도 곡선이 그 항목을 넘어가 다음 경계를 침범하지 않는다.
    if (stepsHere) {
      const drop = Math.min(ELBOW, (next.bottom - next.top) / 2);
      const mid = next.top + drop / 2;
      d += ` C ${row.x} ${mid} ${next.x} ${mid} ${next.x} ${next.top + drop}`;
    }
  });

  return d;
}

/**
 * 항목별 세로선이 path의 몇 번째 지점에서 시작하고 끝나는지 잰다.
 *
 * 레일을 따라 미끄러지는 점은 CSS motion path(`offset-path`)로 움직이는데, 그
 * 좌표계가 "path 위의 거리"라 픽셀 좌표를 길이로 옮겨야 한다. 곡선 구간은
 * 직선보다 길어서 산술로는 못 구하고 브라우저의 실측 API를 쓴다.
 *
 * jsdom에는 이 API가 없다. 없으면 빈 배열을 돌려주고 점은 그리지 않는다
 * (레일과 하이라이트는 그대로다).
 */
export function measureLengths(
  d: string,
  rows: readonly Row[],
): [number, number][] {
  if (typeof document === 'undefined') return [];
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (typeof probe.getTotalLength !== 'function') return [];
  probe.setAttribute('d', d);

  const total = probe.getTotalLength();
  const out: [number, number][] = [];
  rows.forEach((row, i) => {
    // 직전 항목이 끝난 지점에서 출발해, path의 y가 이 항목의 머리에 닿을
    // 때까지 1px씩 전진한다. 그 사이에 곡선이 있으면 자연히 더 걸린다.
    const prevSpan = out[i - 1];
    const prevRow = rows[i - 1];
    let at =
      prevSpan && prevRow ? prevSpan[1] + (row.top - prevRow.bottom) : row.top;
    while (at < total && probe.getPointAtLength(at).y < row.top) at += 1;
    // 끝도 실측한다. 세로 높이만 더하면, 단이 바뀌어 자기 구간 안에 곡선을
    // 품은 항목에서 끝점이 실제보다 위로 잡힌다(곡선은 같은 세로 거리를 가는
    // 데 길이를 더 쓴다).
    let end = at + (row.bottom - row.top);
    while (end < total && probe.getPointAtLength(end).y < row.bottom) end += 1;
    out.push([at, end]);
  });
  return out;
}
