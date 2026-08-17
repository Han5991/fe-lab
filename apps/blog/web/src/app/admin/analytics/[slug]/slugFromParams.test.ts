import { describe, expect, it } from 'vitest';
import { slugFromParams } from './slugFromParams';

describe('slugFromParams', () => {
  it('ASCII slug는 그대로 통과한다', () => {
    expect(slugFromParams('cache-hit-cold-build')).toBe('cache-hit-cold-build');
  });

  it('인코딩된 한글 slug를 디코드한다 — post.slug(디코드 원문)와의 lookup 계약', () => {
    expect(slugFromParams(encodeURIComponent('한글-슬러그'))).toBe(
      '한글-슬러그',
    );
  });

  it('배열 세그먼트는 /로 잇고 디코드한다', () => {
    expect(slugFromParams([encodeURIComponent('회고'), '2024'])).toBe(
      '회고/2024',
    );
  });

  it('세그먼트가 없으면 빈 문자열', () => {
    expect(slugFromParams(undefined)).toBe('');
  });
});
