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

test('build가 자식 단계에 넘기는 toISOString() 값을 그대로 되돌린다', () => {
  // build-content.ts의 stepEnv가 자식에 넘기는 모양(밀리초 + Z).
  const pinned = new Date('2026-09-25T01:23:45.678Z');
  expect(resolveBuildNow(pinned.toISOString()).getTime()).toBe(
    pinned.getTime(),
  );
});

test('앱 build 스크립트의 `date -u +%Y-%m-%dT%H:%M:%SZ` 모양을 받는다', () => {
  expect(resolveBuildNow('2026-09-25T01:23:45Z').toISOString()).toBe(
    '2026-09-25T01:23:45.000Z',
  );
});

test('±HH:MM offset은 그 시각대의 벽시계로 읽는다', () => {
  expect(resolveBuildNow('2026-06-01T09:00:00+09:00').toISOString()).toBe(
    '2026-06-01T00:00:00.000Z',
  );
});

test.each([
  // offset이 없으면 실행 환경의 로컬 시각으로 풀린다 — CI(UTC)와 로컬(KST)이 갈린다
  ['2026-06-01T09:00:00'],
  // 날짜만 — 어느 시각대의 자정인지 모른다
  ['2026-06-01'],
  // 달력에 없는 날짜 — 받아 주면 Date 엔진 재량의 시각이 된다
  ['2026-02-30T00:00:00Z'],
  // Date 파싱이 엔진마다 다른 모양은 받지 않는다
  ['2026-06-01T09:00:00+0900'],
  ['2026-06-01 09:00:00+09:00'],
  ['now'],
])('형식이 틀린 값 %j는 조용히 지금으로 넘어가지 않고 던진다', given => {
  expect(() => resolveBuildNow(given)).toThrow('offset을 명시한 ISO 시각');
});
