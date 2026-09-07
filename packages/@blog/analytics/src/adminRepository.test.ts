import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createAdminAnalytics } from './adminRepository.ts';
import type { AdminApi } from './adminApi.ts';

// 예전에는 여기 `vi.mock('../../lib/platform/client')`가 있었다 — 저장소가 모듈
// 최상위에서 앱의 supabase 싱글톤을 import했고, 그 모듈은 import 시점에 env
// 부재로 throw했기 때문이다. 지금은 클라이언트를 **주입받으므로** 끼워 넣을
// 모듈이 없다. `getAdminPostsIndex`는 Edge Function을 아예 쓰지 않는 fetch
// 경로라, 아무것도 부르지 않는 가짜 `AdminApi`로 충분하다.
const NEVER_CALLED: AdminApi = {
  call: () => {
    throw new Error('이 테스트는 Edge Function을 부르지 않는다');
  },
};
const { getAdminPostsIndex } = createAdminAnalytics(NEVER_CALLED);

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
