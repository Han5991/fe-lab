import { expect, test, vi } from 'vitest';
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
