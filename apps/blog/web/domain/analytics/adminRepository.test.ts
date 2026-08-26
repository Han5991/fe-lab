import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// adminRepository는 모듈 최상위에서 lib/platform/client를 import하고, client.ts는
// import 시점에 env 부재로 throw한다(모듈 최상위 createClient). 여기서 보는
// getAdminPostsIndex는 client를 쓰지 않는 fetch 경로이므로, 모듈만 비워 끼운다.
vi.mock('../../lib/platform/client', () => ({ client: {} }));

import { getAdminPostsIndex } from './adminRepository';

const VALID_ROW = {
  slug: 'a-post',
  title: '글',
  date: '2026-01-01',
  tags: ['tag'],
  status: 'published',
  scheduledDate: null,
};

function stubFetch(payload: unknown, ok = true) {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? 'OK' : 'Internal Server Error',
      json: () => Promise.resolve(payload),
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('getAdminPostsIndex', () => {
  beforeEach(() => {
    // 저장소의 SSR 가드는 `typeof window === 'undefined'`를 본다 — node
    // 테스트에서 브라우저 경로를 타게 window만 존재하게 만든다.
    vi.stubGlobal('window', {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('정상 행은 그대로 통과한다', async () => {
    stubFetch([VALID_ROW]);

    await expect(getAdminPostsIndex()).resolves.toEqual([VALID_ROW]);
  });

  test('모양이 어긋난 행만 걸러진다 — 페이지째 깨지는 대신', async () => {
    stubFetch([
      VALID_ROW,
      { ...VALID_ROW, date: 123 }, // date가 문자열도 null도 아님
      { ...VALID_ROW, tags: 'tag' }, // tags가 배열이 아님
      { ...VALID_ROW, status: undefined }, // status 누락
      'not-an-object',
      null,
    ]);

    await expect(getAdminPostsIndex()).resolves.toEqual([VALID_ROW]);
  });

  test('비배열 응답이면 빈 배열 — 손으로 고쳐진 파일에도 화면은 산다', async () => {
    stubFetch({ broken: true });

    await expect(getAdminPostsIndex()).resolves.toEqual([]);
  });

  test('HTTP 실패는 상태를 담아 throw한다 (ErrorBoundary가 안내할 축)', async () => {
    stubFetch(null, false);

    await expect(getAdminPostsIndex()).rejects.toThrow('500');
  });

  test('서버 환경(window 없음)에서는 fetch 없이 빈 배열로 대기한다', async () => {
    vi.unstubAllGlobals();
    const fetchMock = stubFetch([VALID_ROW]);
    vi.unstubAllGlobals(); // window 제거 — fetch stub도 함께 걷힌다

    await expect(getAdminPostsIndex()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
