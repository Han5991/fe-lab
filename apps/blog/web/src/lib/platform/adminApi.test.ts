/**
 * adminApi 단위 테스트
 *
 * Supabase client는 mock으로 대체하여 functions.invoke 호출 검증.
 */

import { expect, test } from 'vitest';
import {
  AdminApiClient,
  AdminApiError,
  type FunctionsFailure,
  type FunctionsInvoker,
} from './adminApi';

// ── mock 헬퍼 ─────────────────────────────────────────────────────────────────

interface CapturedCall {
  functionName: string;
  options?: { body?: unknown };
}

type InvokeResponse =
  { data: unknown; error: null } | { data: null; error: FunctionsFailure };

function makeMockClient(response: InvokeResponse): {
  client: FunctionsInvoker;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];

  const client: FunctionsInvoker = {
    functions: {
      invoke(functionName: string, options?: { body?: unknown }) {
        calls.push({ functionName, options });
        return Promise.resolve(response);
      },
    },
  };

  return { client, calls };
}

// ── 테스트 ────────────────────────────────────────────────────────────────────

const OVERVIEW = {
  stats: [{ slug: 'post-a', total_views: 100, today_views: 5 }],
  trends: [{ slug: 'post-a', view_date: '2026-05-01', view_count: 5 }],
};

test('AdminApiClient: posts_overview — 요청 한 번으로 통계와 추이를 함께 받는다', async () => {
  // 통계(페이징)와 추이는 Edge Function 안에서 병렬로 돈다. 예전엔 action 둘을 따로 불러
  // 왕복·JWT 검증이 두 번이었다.
  const { client, calls } = makeMockClient({
    data: { data: OVERVIEW },
    error: null,
  });

  const api = new AdminApiClient(client);
  const result = await api.call('posts_overview');

  expect(calls).toHaveLength(1);
  expect(calls[0].functionName).toBe('admin-analytics');
  expect(calls[0].options?.body).toStrictEqual({
    action: 'posts_overview',
    params: undefined,
  });
  expect(result).toStrictEqual(OVERVIEW);
});

test('AdminApiClient: post_hourly_distribution — slug 파라미터 전달 확인', async () => {
  const mockData = [{ hour: 9, view_count: 3 }];
  const { client, calls } = makeMockClient({
    data: { data: mockData },
    error: null,
  });

  const api = new AdminApiClient(client);
  const result = await api.call('post_hourly_distribution', {
    slug: 'my-post',
  });

  expect(calls.length).toBe(1);
  expect(calls[0].options?.body).toStrictEqual({
    action: 'post_hourly_distribution',
    params: { slug: 'my-post' },
  });
  expect(result).toStrictEqual(mockData);
});

test('AdminApiClient: post_dow_distribution — slug 파라미터 전달 확인', async () => {
  const mockData = [{ dow: 1, view_count: 10 }];
  const { client, calls } = makeMockClient({
    data: { data: mockData },
    error: null,
  });

  const api = new AdminApiClient(client);
  const result = await api.call('post_dow_distribution', {
    slug: 'other-post',
  });

  expect(calls[0].options?.body).toStrictEqual({
    action: 'post_dow_distribution',
    params: { slug: 'other-post' },
  });
  expect(result).toStrictEqual(mockData);
});

test('AdminApiClient: posts_overview는 거를 slug 목록을 params로 싣는다', async () => {
  const { client, calls } = makeMockClient({
    data: { data: OVERVIEW },
    error: null,
  });
  const api = new AdminApiClient(client);

  await api.call('posts_overview', { slugs: ['post-a', 'series/post-b'] });

  expect(calls.map(c => c.options?.body)).toStrictEqual([
    {
      action: 'posts_overview',
      params: { slugs: ['post-a', 'series/post-b'] },
    },
  ]);
});

/** supabase-js의 non-2xx 실패 모양 그대로 — message는 고정 문구, 상태·본문은 context에 있다. */
function httpFailure(status: number, body: string): FunctionsFailure {
  return {
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(body, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  };
}

test.each([
  [
    'HTTP 실패',
    httpFailure(401, JSON.stringify({ error: '인증에 실패했습니다.' })),
    { status: 401, serverMessage: '인증에 실패했습니다.' },
    '(401): 인증에 실패했습니다.',
  ],
  [
    'JSON이 아닌 본문',
    httpFailure(502, '<html>Bad Gateway</html>'),
    { status: 502, serverMessage: null },
    '(502): Edge Function returned a non-2xx status code',
  ],
  [
    '응답까지 못 간 네트워크 실패',
    {
      message: 'Failed to send a request to the Edge Function',
      context: new TypeError('fetch failed'),
    },
    { status: null, serverMessage: null },
    'Failed to send a request to the Edge Function',
  ],
])(
  'AdminApiClient: %s는 상태·서버 문구를 담은 AdminApiError다',
  async (_kind, error, fields, message) => {
    const { client } = makeMockClient({ data: null, error });

    const rejected = new AdminApiClient(client).call('posts_overview');

    await expect(rejected).rejects.toBeInstanceOf(AdminApiError);
    await expect(rejected).rejects.toMatchObject({
      action: 'posts_overview',
      ...fields,
    });
    await expect(rejected).rejects.toThrow(message);
  },
);

test('AdminApiClient: data가 null이면 Error throw (빈 응답)', async () => {
  // error도 없고 data도 없는 비정상 응답
  const { client } = makeMockClient({
    data: null,
    error: null,
  });

  const api = new AdminApiClient(client);

  const rejected = api.call('posts_overview');

  await expect(rejected).rejects.toBeInstanceOf(Error);
  await expect(rejected).rejects.toThrow('계약과 다른 응답');
});

test('AdminApiClient: 봉투는 있는데 안이 null이어도 Error throw (빈 응답)', async () => {
  // Edge Function은 성공 시 항상 { data: Returns }를 준다(0행이어도 []).
  // { data: null }은 프로토콜 위반이므로 []로 삼키지 않고 실패시킨다 —
  // 그래야 대시보드가 조용히 0으로 보이는 대신 에러가 드러난다.
  const { client } = makeMockClient({
    data: { data: null },
    error: null,
  });

  const api = new AdminApiClient(client);

  const rejected = api.call('posts_overview');

  await expect(rejected).rejects.toBeInstanceOf(Error);
  await expect(rejected).rejects.toThrow('계약과 다른 응답');
});

// Edge Function은 손으로 배포한다 — 클라이언트와 어긋난 함수가 떠 있으면 화면이 NaN·undefined를
// 그리는 대신 여기서 실패해야 한다. 열 이름·타입은 database.types.ts의 Returns(추이는 adminActions.ts의
// PostTrendRow)에서 온다.
test.each([
  ['객체가 아닌 본문', []],
  ['stats가 없는 본문', { trends: OVERVIEW.trends }],
  ['trends가 없는 본문', { stats: OVERVIEW.stats }],
  [
    'stats가 행 배열이 아닌 본문',
    { stats: { rows: [] }, trends: OVERVIEW.trends },
  ],
  [
    '열이 빠진 stats 행',
    { stats: [{ slug: 'post-a', total_views: 1 }], trends: OVERVIEW.trends },
  ],
  [
    '열 타입이 다른 stats 행',
    {
      stats: [{ slug: 'post-a', total_views: '1', today_views: 0 }],
      trends: OVERVIEW.trends,
    },
  ],
  ['객체가 아닌 stats 행', { stats: ['post-a'], trends: OVERVIEW.trends }],
  [
    '열이 빠진 trends 행',
    { stats: OVERVIEW.stats, trends: [{ slug: 'post-a', view_count: 1 }] },
  ],
  [
    '열 타입이 다른 trends 행',
    {
      stats: OVERVIEW.stats,
      trends: [{ slug: 'post-a', view_date: '2026-05-01', view_count: '5' }],
    },
  ],
  ['행 배열이 아닌 trends', { stats: OVERVIEW.stats, trends: null }],
])(
  'AdminApiClient: %s은 계약과 다른 응답으로 실패한다',
  async (_kind, body) => {
    const { client } = makeMockClient({ data: { data: body }, error: null });

    await expect(
      new AdminApiClient(client).call('posts_overview'),
    ).rejects.toThrow('계약과 다른 응답');
  },
);

test('AdminApiClient: 분포 action도 행의 열을 확인한다', async () => {
  const { client } = makeMockClient({
    data: { data: [{ hour: 9, view_count: '3' }] },
    error: null,
  });

  await expect(
    new AdminApiClient(client).call('post_hourly_distribution', {
      slug: 'post-a',
    }),
  ).rejects.toThrow('계약과 다른 응답');
});

test('AdminApiClient: total_views의 null은 계약 안이다 — 생성 타입보다 넓은 열', async () => {
  const body = {
    stats: [{ slug: 'post-a', total_views: null, today_views: 0 }],
    trends: [],
  };
  const { client } = makeMockClient({ data: { data: body }, error: null });

  const result = await new AdminApiClient(client).call('posts_overview');

  expect(result).toStrictEqual(body);
});

test('AdminApiClient: 응답 타입이 action의 RPC Returns로 결정된다 (타입 계약)', async () => {
  const { client } = makeMockClient({
    data: { data: OVERVIEW },
    error: null,
  });
  const api = new AdminApiClient(client);

  // call<T>()로 응답 타입을 손으로 적지 않는다 — database.types.ts의
  // get_all_post_stats Returns와 adminActions.ts의 PostTrendRow가 그대로 추론된다.
  const { stats, trends } = await api.call('posts_overview');
  expect(stats[0].total_views).toBe(100);
  expect(stats[0].today_views).toBe(5);
  expect(trends[0].view_date).toBe('2026-05-01');

  // @ts-expect-error — get_all_post_stats 행에는 view_date가 없다
  void stats[0].view_date;
  // @ts-expect-error — 추이 행에는 total_views가 없다
  void trends[0].total_views;
});

test('AdminApiClient: params 계약 — 필수 slug 누락·미등록 action은 컴파일 에러', async () => {
  const { client, calls } = makeMockClient({
    data: { data: OVERVIEW },
    error: null,
  });
  const api = new AdminApiClient(client);

  // 아래는 전부 타입 계약 검증이다. tsc(tsconfig.test.json)가 @ts-expect-error
  // 줄에서 에러가 사라지면 "unused directive"로 실패시킨다. 호출은 실제로 나가므로 약속을 모아 끝까지 기다린다
  // (응답이 그 action의 모양이 아니면 거절된다 — 여기서 보는 건 타입뿐이다).
  const pending = [
    // @ts-expect-error — post_hourly_distribution은 { slug } 필수
    api.call('post_hourly_distribution'),
    // @ts-expect-error — post_dow_distribution은 { slug } 필수
    api.call('post_dow_distribution', {}),
    // @ts-expect-error — 등록되지 않은 action
    api.call('nope'),
    // @ts-expect-error — posts_overview의 params는 거를 slug 목록(slugs)뿐이다
    api.call('posts_overview', { slug: 'x' }),
    // @ts-expect-error — 옛 action 이름(통계·추이를 따로 부르던 때)은 더는 없다
    api.call('all_post_stats'),
    // params가 전부 선택인 action은 생략 가능
    api.call('posts_overview'),
  ];
  await Promise.allSettled(pending);

  expect(calls).toHaveLength(6);
});

test('AdminApiClient: 여러 번 호출해도 독립적으로 동작', async () => {
  const { client, calls } = makeMockClient({
    data: { data: OVERVIEW },
    error: null,
  });

  const api = new AdminApiClient(client);
  await api.call('posts_overview');
  await api.call('posts_overview');

  expect(calls.length).toBe(2);
  expect(calls[0].functionName).toBe('admin-analytics');
  expect(calls[1].functionName).toBe('admin-analytics');
});
