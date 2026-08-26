/**
 * adminApi 단위 테스트
 *
 * Supabase client는 mock으로 대체하여 functions.invoke 호출 검증.
 */

import { expect, test } from 'vitest';
import { AdminApiClient, type FunctionsInvoker } from './adminApi';

// ── mock 헬퍼 ─────────────────────────────────────────────────────────────────

interface CapturedCall {
  functionName: string;
  options?: { body?: unknown };
}

type InvokeResponse =
  { data: unknown; error: null } | { data: null; error: { message: string } };

function makeMockClient(response: InvokeResponse): {
  client: FunctionsInvoker;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];

  const client: FunctionsInvoker = {
    functions: {
      invoke<T>(functionName: string, options?: { body?: unknown }) {
        calls.push({ functionName, options });
        // mock은 T와 무관하게 고정 응답을 돌려준다 — 런타임 동작만 검증하므로
        // 제네릭 반환 타입으로의 cast는 의도된 우회다.
        return Promise.resolve(
          response as { data: T | null; error: { message: string } | null },
        );
      },
    },
  };

  return { client, calls };
}

// ── 테스트 ────────────────────────────────────────────────────────────────────

test('AdminApiClient: all_post_stats — functions.invoke를 올바른 action으로 호출', async () => {
  const mockData = [{ slug: 'post-a', total_views: 100, today_views: 5 }];
  const { client, calls } = makeMockClient({
    data: { data: mockData },
    error: null,
  });

  const api = new AdminApiClient(client);
  const result = await api.call('all_post_stats');

  expect(calls.length).toBe(1);
  expect(calls[0].functionName).toBe('admin-analytics');
  expect(calls[0].options?.body).toStrictEqual({
    action: 'all_post_stats',
    params: undefined,
  });
  expect(result).toStrictEqual(mockData);
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

test('AdminApiClient: all_posts_trends — range 파라미터 전달 확인', async () => {
  const mockData = [{ slug: 'post-a', view_date: '2026-05-01', view_count: 5 }];
  const { client, calls } = makeMockClient({
    data: { data: mockData },
    error: null,
  });

  const api = new AdminApiClient(client);
  const result = await api.call('all_posts_trends', { range: [0, 999] });

  expect(calls[0].options?.body).toStrictEqual({
    action: 'all_posts_trends',
    params: { range: [0, 999] },
  });
  expect(result).toStrictEqual(mockData);
});

test('AdminApiClient: error 응답 시 Error throw', async () => {
  const { client } = makeMockClient({
    data: null,
    error: { message: '인증에 실패했습니다.' },
  });

  const api = new AdminApiClient(client);

  const rejected = api.call('all_post_stats');

  await expect(rejected).rejects.toBeInstanceOf(Error);
  await expect(rejected).rejects.toThrow('인증에 실패했습니다.');
});

test('AdminApiClient: data가 null이면 Error throw (빈 응답)', async () => {
  // error도 없고 data도 없는 비정상 응답
  const { client } = makeMockClient({
    data: null,
    error: null,
  });

  const api = new AdminApiClient(client);

  const rejected = api.call('all_post_stats');

  await expect(rejected).rejects.toBeInstanceOf(Error);
  await expect(rejected).rejects.toThrow('빈 응답');
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

  const rejected = api.call('all_post_stats');

  await expect(rejected).rejects.toBeInstanceOf(Error);
  await expect(rejected).rejects.toThrow('빈 응답');
});

test('AdminApiClient: 응답 타입이 action의 RPC Returns로 결정된다 (타입 계약)', async () => {
  const { client } = makeMockClient({
    data: { data: [{ slug: 'post-a', total_views: 100, today_views: 5 }] },
    error: null,
  });
  const api = new AdminApiClient(client);

  // call<T>()로 응답 타입을 손으로 적지 않는다 — database.types.ts의
  // get_all_post_stats Returns가 그대로 추론된다.
  const rows = await api.call('all_post_stats');
  const first = rows[0];
  expect(first.total_views).toBe(100);
  expect(first.today_views).toBe(5);

  // @ts-expect-error — get_all_post_stats 행에는 view_date가 없다
  void first.view_date;
});

test('AdminApiClient: params 계약 — 필수 slug 누락·미등록 action은 컴파일 에러', () => {
  const { client, calls } = makeMockClient({
    data: { data: [] },
    error: null,
  });
  const api = new AdminApiClient(client);

  // 아래는 전부 타입 계약 검증이다. tsc(tsconfig.test.json)가 @ts-expect-error
  // 줄에서 에러가 사라지면 "unused directive"로 실패시킨다.

  // @ts-expect-error — post_hourly_distribution은 { slug } 필수
  void api.call('post_hourly_distribution');
  // @ts-expect-error — post_dow_distribution은 { slug } 필수
  void api.call('post_dow_distribution', {});
  // @ts-expect-error — 등록되지 않은 action
  void api.call('nope');
  // @ts-expect-error — all_post_stats는 params가 없다
  void api.call('all_post_stats', { slug: 'x' });

  // params가 전부 선택인 action은 생략 가능
  void api.call('all_posts_trends');

  expect(calls.length).toBe(5);
});

test('AdminApiClient: 여러 번 호출해도 독립적으로 동작', async () => {
  const mockData = { slug: 'x', total_views: 1, today_views: 0 };
  const { client, calls } = makeMockClient({
    data: { data: [mockData] },
    error: null,
  });

  const api = new AdminApiClient(client);
  await api.call('all_post_stats');
  await api.call('all_post_stats');

  expect(calls.length).toBe(2);
  expect(calls[0].functionName).toBe('admin-analytics');
  expect(calls[1].functionName).toBe('admin-analytics');
});
