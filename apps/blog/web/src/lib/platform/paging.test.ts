/**
 * collectPagedRows 단위 테스트
 *
 * 이 루프는 Edge Function 안에서 도는데 `supabase/functions` 아래에는 테스트
 * 하네스가 없다. 로직을 순수 함수로 떼어 둔 이유가 이 파일이다 — 종료 조건과
 * 상한이 회귀하면 여기서 잡힌다.
 */

import { expect, test, vi } from 'vitest';
import { collectPagedRows } from './paging';

/** `total`행을 가진 서버를 흉내 낸다. 호출된 구간을 전부 기록한다. */
function makeSource(total: number, pageSize: number) {
  const ranges: [number, number][] = [];
  const fetchPage = vi.fn((from: number, to: number) => {
    ranges.push([from, to]);
    // 서버는 요청 구간과 cap 중 좁은 쪽을 준다.
    return Promise.resolve(
      Array.from(
        { length: Math.max(0, Math.min(total, to + 1) - from) },
        (_, i) => from + i,
      ).slice(0, pageSize),
    );
  });
  return { fetchPage, ranges };
}

test('한 페이지로 끝나면 요청도 한 번이다', async () => {
  const { fetchPage, ranges } = makeSource(3, 10);

  const rows = await collectPagedRows(fetchPage, {
    pageSize: 10,
    maxPages: 5,
  });

  expect(rows).toStrictEqual([0, 1, 2]);
  expect(ranges).toStrictEqual([[0, 9]]);
});

test('여러 페이지를 순서대로 이어 붙인다', async () => {
  const { fetchPage, ranges } = makeSource(25, 10);

  const rows = await collectPagedRows(fetchPage, {
    pageSize: 10,
    maxPages: 5,
  });

  expect(rows).toHaveLength(25);
  expect(rows[0]).toBe(0);
  expect(rows[24]).toBe(24);
  expect(ranges).toStrictEqual([
    [0, 9],
    [10, 19],
    [20, 29],
  ]);
});

test('행 수가 pageSize 의 배수여도 뒤가 잘리지 않는다', async () => {
  // 종료를 "짧은 페이지"로 판정하므로, 딱 떨어지면 빈 페이지를 한 번 더 받는다.
  // 이 왕복을 아끼려고 `<=` 로 바꾸면 마지막 페이지가 통째로 사라진다.
  const { fetchPage, ranges } = makeSource(20, 10);

  const rows = await collectPagedRows(fetchPage, {
    pageSize: 10,
    maxPages: 5,
  });

  expect(rows).toHaveLength(20);
  expect(ranges).toStrictEqual([
    [0, 9],
    [10, 19],
    [20, 29],
  ]);
});

test('빈 결과는 빈 배열이다', async () => {
  const { fetchPage, ranges } = makeSource(0, 10);

  const rows = await collectPagedRows(fetchPage, {
    pageSize: 10,
    maxPages: 5,
  });

  expect(rows).toStrictEqual([]);
  expect(ranges).toStrictEqual([[0, 9]]);
});

test('상한을 넘으면 자르지 않고 throw 한다', async () => {
  // 잘린 결과는 소비처에서 "데이터가 줄어든 것"과 구분되지 않는다.
  const { fetchPage } = makeSource(1000, 10);

  await expect(
    collectPagedRows(fetchPage, { pageSize: 10, maxPages: 3 }),
  ).rejects.toThrow(/상한\(3페이지 · 30행\)/);

  expect(fetchPage).toHaveBeenCalledTimes(3);
});

test('fetchPage 가 던진 값은 그대로 전파된다', async () => {
  // Edge Function 은 PostgREST 의 error 를 그대로 던진다. 그 값이 가공되지 않고
  // 나와야 호출자가 원래 원인(code·details)을 볼 수 있다.
  const rpcError = Object.assign(new Error('permission denied for function'), {
    code: '42501',
  });
  const fetchPage = vi.fn(() => Promise.reject(rpcError));

  await expect(
    collectPagedRows(fetchPage, { pageSize: 10, maxPages: 5 }),
  ).rejects.toBe(rpcError);

  expect(fetchPage).toHaveBeenCalledTimes(1);
});

test('중간 페이지에서 실패하면 즉시 멈춘다', async () => {
  const fetchPage = vi.fn((from: number) =>
    from === 10
      ? Promise.reject(new Error('두 번째 페이지 실패'))
      : Promise.resolve(Array.from({ length: 10 }, (_, i) => from + i)),
  );

  await expect(
    collectPagedRows(fetchPage, { pageSize: 10, maxPages: 5 }),
  ).rejects.toThrow('두 번째 페이지 실패');

  expect(fetchPage).toHaveBeenCalledTimes(2);
});
