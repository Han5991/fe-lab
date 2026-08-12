/**
 * adminApi 단위 테스트
 *
 * Supabase client는 mock으로 대체하여 functions.invoke 호출 검증.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAdminApiClient, type FunctionsInvoker } from './adminApi';

// ── mock 헬퍼 ─────────────────────────────────────────────────────────────────

type CapturedCall = {
  functionName: string;
  options?: { body?: unknown };
};

type InvokeResponse =
  { data: unknown; error: null } | { data: null; error: { message: string } };

function makeMockClient(response: InvokeResponse): {
  client: FunctionsInvoker;
  calls: CapturedCall[];
} {
  const calls: CapturedCall[] = [];

  // mock은 제네릭을 any로 우회합니다 — 런타임 동작만 검증하면 되므로 cast 사용.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockFunctions: any = {
    invoke: async (functionName: string, options?: { body?: unknown }) => {
      calls.push({ functionName, options });
      return response;
    },
  };

  return {
    client: { functions: mockFunctions } as unknown as FunctionsInvoker,
    calls,
  };
}

// ── 테스트 ────────────────────────────────────────────────────────────────────

test('createAdminApiClient: all_post_stats — functions.invoke를 올바른 action으로 호출', async () => {
  const mockData = [{ slug: 'post-a', total_views: 100, today_views: 5 }];
  const { client, calls } = makeMockClient({
    data: { data: mockData },
    error: null,
  });

  const api = createAdminApiClient(client);
  const result = await api.call('all_post_stats');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].functionName, 'admin-analytics');
  assert.deepEqual(calls[0].options?.body, {
    action: 'all_post_stats',
    params: undefined,
  });
  assert.deepEqual(result, mockData);
});

test('createAdminApiClient: post_hourly_distribution — slug 파라미터 전달 확인', async () => {
  const mockData = [{ hour: 9, view_count: 3 }];
  const { client, calls } = makeMockClient({
    data: { data: mockData },
    error: null,
  });

  const api = createAdminApiClient(client);
  const result = await api.call('post_hourly_distribution', {
    slug: 'my-post',
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].options?.body, {
    action: 'post_hourly_distribution',
    params: { slug: 'my-post' },
  });
  assert.deepEqual(result, mockData);
});

test('createAdminApiClient: post_dow_distribution — slug 파라미터 전달 확인', async () => {
  const mockData = [{ dow: 1, view_count: 10 }];
  const { client, calls } = makeMockClient({
    data: { data: mockData },
    error: null,
  });

  const api = createAdminApiClient(client);
  const result = await api.call('post_dow_distribution', {
    slug: 'other-post',
  });

  assert.deepEqual(calls[0].options?.body, {
    action: 'post_dow_distribution',
    params: { slug: 'other-post' },
  });
  assert.deepEqual(result, mockData);
});

test('createAdminApiClient: all_posts_trends — range 파라미터 전달 확인', async () => {
  const mockData = [{ slug: 'post-a', view_date: '2026-05-01', view_count: 5 }];
  const { client, calls } = makeMockClient({
    data: { data: mockData },
    error: null,
  });

  const api = createAdminApiClient(client);
  const result = await api.call('all_posts_trends', { range: [0, 999] });

  assert.deepEqual(calls[0].options?.body, {
    action: 'all_posts_trends',
    params: { range: [0, 999] },
  });
  assert.deepEqual(result, mockData);
});

test('createAdminApiClient: error 응답 시 Error throw', async () => {
  const { client } = makeMockClient({
    data: null,
    error: { message: '인증에 실패했습니다.' },
  });

  const api = createAdminApiClient(client);

  await assert.rejects(
    () => api.call('all_post_stats'),
    (err: Error) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('인증에 실패했습니다.'));
      return true;
    },
  );
});

test('createAdminApiClient: data가 null이면 Error throw (빈 응답)', async () => {
  // error도 없고 data도 없는 비정상 응답
  const { client } = makeMockClient({
    data: null,
    error: null,
  } as InvokeResponse);

  const api = createAdminApiClient(client);

  await assert.rejects(
    () => api.call('all_post_stats'),
    (err: Error) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('빈 응답'));
      return true;
    },
  );
});

test('createAdminApiClient: 여러 번 호출해도 독립적으로 동작', async () => {
  const mockData = { slug: 'x', total_views: 1, today_views: 0 };
  const { client, calls } = makeMockClient({
    data: { data: [mockData] },
    error: null,
  });

  const api = createAdminApiClient(client);
  await api.call('all_post_stats');
  await api.call('all_post_stats');

  assert.equal(calls.length, 2);
  assert.equal(calls[0].functionName, 'admin-analytics');
  assert.equal(calls[1].functionName, 'admin-analytics');
});
