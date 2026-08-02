import { describe, expect, test } from 'vitest';
import { seriesBadgeLabel } from './seriesBadge';

describe('seriesBadgeLabel', () => {
  test('시리즈 안 위치를 1-based로 표기한다', () => {
    expect(seriesBadgeLabel('번들러 만들기', ['a', 'b', 'c'], 'b')).toBe(
      '시리즈 · 번들러 만들기 2/3',
    );
  });

  test('첫 글과 마지막 글도 경계에서 어긋나지 않는다', () => {
    expect(seriesBadgeLabel('S', ['a', 'b', 'c'], 'a')).toBe('시리즈 · S 1/3');
    expect(seriesBadgeLabel('S', ['a', 'b', 'c'], 'c')).toBe('시리즈 · S 3/3');
  });

  test('목록에 없는 slug면 틀린 번호 대신 시리즈명만 남긴다', () => {
    // 비공개 글이 섞여 순서가 깨졌을 때 "0/3" 같은 표기가 나가지 않아야 한다.
    expect(seriesBadgeLabel('S', ['a', 'b'], 'zzz')).toBe('시리즈 · S');
  });

  test('빈 목록도 안전하다', () => {
    expect(seriesBadgeLabel('S', [], 'a')).toBe('시리즈 · S');
  });
});
