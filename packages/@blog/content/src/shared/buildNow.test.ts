import { expect, test } from 'vitest';
import { BUILD_NOW_ENV, resolveBuildNow } from './buildNow.ts';

test('변수 이름은 앱의 build 스크립트가 내보내는 이름과 같다', () => {
  expect(BUILD_NOW_ENV).toBe('BLOG_CONTENT_NOW');
});

test('비었으면 지금이다', () => {
  const before = Date.now();
  for (const given of [undefined, '']) {
    const now = resolveBuildNow(given).getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  }
});

test.each([
  // build가 자식 단계에 넘기는 toISOString() 모양(밀리초 + Z)
  ['2026-09-25T01:23:45.678Z', '2026-09-25T01:23:45.678Z'],
  // 앱 build 스크립트의 `date -u +%Y-%m-%dT%H:%M:%SZ` 모양
  ['2026-09-25T01:23:45Z', '2026-09-25T01:23:45.000Z'],
  // ±HH:MM offset은 그 시각대의 벽시계로 읽는다
  ['2026-06-01T09:00:00+09:00', '2026-06-01T00:00:00.000Z'],
])('%s → %s', (given, iso) => {
  expect(resolveBuildNow(given).toISOString()).toBe(iso);
});

// offset 없는 시각은 CI(UTC)와 로컬(KST)이 갈리고, 날짜만은 어느 시각대의 자정인지
// 모른다 — 조용히 "지금"으로 넘어가면 고정했다고 믿은 시각이 풀린다.
test.each([['2026-06-01T09:00:00'], ['2026-06-01'], ['now']])(
  '형식이 틀린 값 %j는 던진다',
  given => {
    expect(() => resolveBuildNow(given)).toThrow('offset을 명시한 ISO 시각');
  },
);
