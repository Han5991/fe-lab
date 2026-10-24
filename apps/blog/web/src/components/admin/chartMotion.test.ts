/**
 * Recharts 움직임(`CHART_MOTION`)이 모션 토큰과 갈라지지 않게 잠근다.
 *
 * 사본이 불가피한 자리다 — Recharts는 CSS 변수가 아니라 숫자·곡선 문자열을 받고, src는 경계상
 * `@blog/preset`을 열지 않는다. 토큰을 바꾸면 CSS로 움직이는 카드·막대·시트는 따라가고 차트만 옛
 * 박자로 남는데, 렌더는 성공하므로 아무것도 실패하지 않는다 — `mermaidTheme.test.ts`가 막는 것과
 * 같은 종류의 조용한 갈라짐이다.
 */
import { expect, test } from 'vitest';
import { isRecord } from '@blog/content/client';
import { blogPreset } from '@blog/preset';
import { CHART_MOTION } from './chartMotion';

/** 프리셋 객체에서 경로의 값을 꺼낸다 — Panda 프리셋 타입은 깊이 들어가면 넓어져 unknown에서 좁힌다. */
function at(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (node, key) => (isRecord(node) ? node[key] : undefined),
    value,
  );
}

test('차트 시간은 durations.mediumMax의 값이다', () => {
  const duration = at(blogPreset, [
    'theme',
    'extend',
    'semanticTokens',
    'durations',
    'mediumMax',
    'value',
    'base',
  ]);
  expect(duration).toBe(`${CHART_MOTION.animationDuration}ms`);
});

test('차트 곡선은 easings.standard다 — Recharts 곡선 문자열은 공백 없이 쓴다', () => {
  const easing = at(blogPreset, [
    'theme',
    'extend',
    'tokens',
    'easings',
    'standard',
    'value',
  ]);
  expect(typeof easing).toBe('string');
  expect(String(easing).replaceAll(' ', '')).toBe(CHART_MOTION.animationEasing);
});
