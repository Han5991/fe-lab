import { expect, test } from 'vitest';
import {
  ARCHIVE_DEFAULTS,
  archiveSearchString,
  readArchiveParams,
} from './archiveParams';

test('빈 검색 문자열은 기본값이다', () => {
  expect(readArchiveParams('')).toEqual(ARCHIVE_DEFAULTS);
});

test('네 개의 필터 키를 읽는다', () => {
  expect(
    readArchiveParams('?q=번들러&tag=vite,rollup&series=번들러&year=2026'),
  ).toEqual({
    ...ARCHIVE_DEFAULTS,
    q: '번들러',
    tag: 'vite,rollup',
    series: '번들러',
    year: '2026',
  });
});

test('모르는 sort·view는 기본값으로 떨어진다', () => {
  const params = readArchiveParams('?sort=oldest&view=grid');
  expect(params.sort).toBe('recent');
  expect(params.view).toBe('cards');
});

test('아는 sort·view는 그대로 읽는다', () => {
  const params = readArchiveParams('?sort=shortest&view=list');
  expect(params.sort).toBe('shortest');
  expect(params.view).toBe('list');
});

test('기본값만 있으면 주소에 쿼리가 붙지 않는다', () => {
  expect(archiveSearchString(ARCHIVE_DEFAULTS)).toBe('');
});

test('기본값인 키는 빠지고 나머지만 고정된 순서로 나간다', () => {
  expect(
    archiveSearchString({
      ...ARCHIVE_DEFAULTS,
      view: 'list',
      q: 'vite',
      year: '2026',
    }),
  ).toBe('?q=vite&year=2026&view=list');
});

test('읽기와 쓰기가 서로의 역이다', () => {
  const search = '?q=%EB%B2%88%EB%93%A4%EB%9F%AC&tag=vite&sort=popular';
  expect(archiveSearchString(readArchiveParams(search))).toBe(search);
});
