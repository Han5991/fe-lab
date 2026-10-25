import { QueryObserver } from '@tanstack/react-query';
import { afterEach, expect, test, vi } from 'vitest';
import { setAdminQueryDefaults } from '@/src/hooks/adminQueryDefaults';
import { createQueryClient } from './queryClient';

test('에러 경계가 보고하지 않는 쿼리의 실패는 재시도가 끝난 뒤 비치명 오류로 한 번 보고한다', async () => {
  const report = vi.fn();
  const client = createQueryClient(report);
  const failure = new Error('supabase down');

  await expect(
    client.fetchQuery({
      queryKey: ['unbounded-query'],
      queryFn: () => Promise.reject(failure),
      retry: 1,
      retryDelay: 0,
    }),
  ).rejects.toBe(failure);

  expect(report).toHaveBeenCalledTimes(1);
  expect(report).toHaveBeenCalledWith(failure, false);
});

test('에러 경계가 보고하는 admin 쿼리는 캐시가 다시 보고하지 않는다', async () => {
  const report = vi.fn();
  const client = createQueryClient(report);
  // 실제 admin 기본값을 건다 — meta가 기본값에서 쿼리로 전해지는지까지 본다.
  setAdminQueryDefaults(client);

  await expect(
    client.fetchQuery({
      queryKey: ['admin', 'dashboard-data'],
      queryFn: () => Promise.reject(new Error('401')),
      retry: false,
    }),
  ).rejects.toThrow('401');

  expect(report).not.toHaveBeenCalled();
});

afterEach(() => {
  vi.useRealTimers();
});

// 정책은 `setAdminQueryDefaults`와 이 클라이언트의 기본값이 합쳐진 결과다 — 마운트(= 구독이 새로 붙음)가
// 다시 받는지는 둘을 함께 건 클라이언트에서만 말할 수 있다(여기 기본값은 `refetchOnMount: false`).
test('admin 쿼리는 30초 안의 재마운트는 다시 받지 않고, 그 뒤의 재마운트와 새로고침은 받는다', async () => {
  const client = createQueryClient(vi.fn());
  setAdminQueryDefaults(client);
  const queryFn = vi.fn(() => Promise.resolve('overview'));
  const options = { queryKey: ['admin', 'dashboard-data'], queryFn };
  // 마운트·언마운트 = 구독 붙이기·떼기. 첫 구독은 데이터를 받아 오는 동안 기다린다.
  const mount = async () => {
    const observer = new QueryObserver(client, options);
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isFetching).toBe(false),
    );
    return { observer, unsubscribe };
  };

  vi.useFakeTimers({ toFake: ['Date'] });
  const first = await mount();
  first.unsubscribe();
  expect(queryFn).toHaveBeenCalledTimes(1);

  vi.setSystemTime(Date.now() + 29_000);
  const within = await mount();
  expect(queryFn, '30초 안의 재마운트').toHaveBeenCalledTimes(1);
  within.unsubscribe();

  vi.setSystemTime(Date.now() + 2_000);
  const after = await mount();
  expect(queryFn, '30초가 지난 뒤의 재마운트').toHaveBeenCalledTimes(2);

  await after.observer.refetch();
  expect(queryFn, '새로고침 버튼은 신선해도 받는다').toHaveBeenCalledTimes(3);
  after.unsubscribe();
});
