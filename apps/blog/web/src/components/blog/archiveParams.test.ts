/**
 * 글 목록의 URL 계약 — 들어오는 링크(`archivePath`)와 같은 모양으로 읽고 쓰는지, 기본값은 URL에 싣지
 * 않는지, 이음표가 경로를 깨지 않는지를 본다.
 */
import { describe, expect, test } from 'vitest';
import { POSTS_PATH } from '@blog/content/client';

import {
  DEFAULT_ARCHIVE_STATE,
  archiveHref,
  isArchiveLocation,
  readArchiveParams,
  type ArchiveState,
} from './archiveParams';

// 실제 사이트의 시리즈 id와 다르게 둔다 — 실제 값을 읽는 구현이면 여기서 어긋난다.
const SERIES_IDS = ['nextjs deploy', 'fixture-series'];

const read = (search: string) =>
  readArchiveParams(new URLSearchParams(search), SERIES_IDS);

describe('readArchiveParams', () => {
  test('쿼리가 없으면 기본 상태다', () => {
    expect(read('')).toEqual(DEFAULT_ARCHIVE_STATE);
  });

  test('모르는 정렬·보기·시리즈와 계약 밖 키는 기본값으로 읽는다', () => {
    expect(read('?sort=bogus&view=grid&series=없는id&year=2025')).toEqual(
      DEFAULT_ARCHIVE_STATE,
    );
  });

  test('태그의 빈 토큰은 버리고, 아는 시리즈는 그대로 읽는다', () => {
    expect(read('?tag=a,,b&series=fixture-series')).toEqual({
      ...DEFAULT_ARCHIVE_STATE,
      tags: ['a', 'b'],
      series: 'fixture-series',
    });
  });
});

describe('archiveHref', () => {
  test('기본 상태는 쿼리 없는 목록 경로다', () => {
    expect(archiveHref(DEFAULT_ARCHIVE_STATE)).toBe(POSTS_PATH);
  });

  // 필터가 없을 때 `archivePath`는 `?` 없는 경로를 돌려준다 — 보기를 `&`로 바로 이으면 경로가 깨진다.
  test.each<[Partial<ArchiveState>, string]>([
    [{ sort: 'popular' }, '/posts/?sort=popular'],
    [{ view: 'list' }, '/posts/?view=list'],
    [{ sort: 'popular', view: 'list' }, '/posts/?sort=popular&view=list'],
  ])('%o → %s', (patch, href) => {
    expect(archiveHref({ ...DEFAULT_ARCHIVE_STATE, ...patch })).toBe(href);
  });

  test('키 순서는 tag·series·q·sort·view이고 값은 들어오는 링크와 같은 인코딩이다', () => {
    const state: ArchiveState = {
      q: 'a b',
      tags: ['c++ & rust'],
      series: 'nextjs deploy',
      sort: 'shortest',
      view: 'list',
    };

    const href = archiveHref(state);

    expect(href).toBe(
      '/posts/?tag=c%2B%2B%20%26%20rust&series=nextjs%20deploy&q=a%20b&sort=shortest&view=list',
    );
    expect(
      readArchiveParams(new URL(href, 'http://x').searchParams, SERIES_IDS),
    ).toEqual(state);
  });
});

describe('isArchiveLocation', () => {
  test.each([
    ['/posts/', true],
    ['/posts', true],
    ['/posts/a/', false],
    ['/', false],
  ])('%s → %s', (pathname, expected) => {
    expect(isArchiveLocation(pathname)).toBe(expected);
  });
});
