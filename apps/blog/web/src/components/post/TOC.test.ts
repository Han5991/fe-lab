/**
 * 레일 path를 만드는 규칙.
 *
 * 화면으로는 "선이 조금 이상하다" 정도로만 보이고, 어긋나도 아무것도
 * 던지지 않는 종류의 코드다. 특히 단이 바뀌는 구간의 곡선은 **다음 항목
 * 안쪽에 전부 들어가야** 하는데(경계에 걸치면 하이라이트가 한 항목만 비출
 * 때 곡선이 반토막 나 허공에 뜬 조각처럼 남는다), 그 불변식은 눈으로
 * 확인하기 어렵다. 여기서 좌표로 고정한다.
 */
import { describe, expect, test } from 'vitest';
import { buildPath, measureLengths, type Row } from './TOC';

/** 한 줄짜리 항목 하나. 높이 20px로 촘촘히 쌓는다. */
const row = (x: number, top: number, height = 20): Row => ({
  x,
  top,
  bottom: top + height,
});

/** path에서 곡선 명령(C)만 뽑는다. */
const curves = (d: string) => d.match(/C [^LC]+/g) ?? [];

describe('buildPath', () => {
  test('항목이 없으면 빈 문자열', () => {
    expect(buildPath([])).toBe('');
  });

  test('단이 같으면 세로선만 그린다', () => {
    const d = buildPath([row(8, 0), row(8, 20), row(8, 40)]);

    expect(curves(d)).toEqual([]);
    // 첫 항목의 머리(0)에서 마지막 항목의 바닥(60)까지 이어진다.
    expect(d.startsWith('M 8 0')).toBe(true);
    expect(d.endsWith('L 8 60')).toBe(true);
  });

  test('단이 바뀌면 곡선으로 갈아탄다', () => {
    const d = buildPath([row(8, 0), row(16, 20)]);

    expect(curves(d)).toHaveLength(1);
    // 끝점은 다음 항목의 x, 그리고 그 항목 **안쪽**이다.
    expect(d).toContain('16 28');
  });

  test('곡선은 전부 다음 항목 안에 들어간다', () => {
    // 항목 높이(20)의 절반이 ELBOW(8)보다 크므로 8px만 내려간다.
    const rows = [row(8, 0), row(16, 20)];
    const d = buildPath(rows);

    // 곡선의 세로 끝(28)이 다음 항목 구간 [20, 40) 안이다.
    // (C 명령의 마지막 좌표쌍이 끝점 — 그 y를 본다.)
    // 곡선이 없으면 빈 문자열 → NaN이 되어 아래 단언이 실패한다.
    const curve = curves(d)[0] ?? '';
    const end = Number(curve.trim().split(/\s+/).pop());
    expect(end).toBeGreaterThan(rows[1].top);
    expect(end).toBeLessThan(rows[1].bottom);
  });

  test('항목이 낮으면 곡선도 그만큼 짧아진다', () => {
    // 높이 10짜리 항목으로 갈아타면 절반인 5px만 쓴다(8px을 쓰면 그 항목을
    // 넘어 다음 경계를 침범한다).
    const d = buildPath([row(8, 0), row(16, 20, 10)]);

    expect(d).toContain('16 25');
  });

  test('되돌아오는 단 변화도 곡선으로 잇는다', () => {
    // h2 → h3 → h2 처럼 들어갔다 나오는 흔한 모양.
    const d = buildPath([row(8, 0), row(16, 20), row(8, 40)]);

    expect(curves(d)).toHaveLength(2);
  });
});

describe('measureLengths', () => {
  test('getTotalLength가 없는 환경에서는 빈 배열을 준다', () => {
    // jsdom에는 SVG 기하 API가 없다. 여기서 던지면 차례 전체가 못 그려지고,
    // 빈 배열이면 레일과 하이라이트는 그대로 두고 점만 빠진다.
    expect(measureLengths('M 8 0 L 8 20', [row(8, 0)])).toEqual([]);
  });
});
