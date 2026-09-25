/** 공개 조회수 읽기의 와이어 계약 — 실제 글 slug 필터가 요청에 실리는지 로컬 서버로 본다. */

import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type * as Repository from './repository';

let server: Server;
let repo: typeof Repository;
let requests: URL[] = [];
let respond: { status: number; body: unknown } = { status: 200, body: [] };

beforeAll(async () => {
  server = createServer((req, res) => {
    requests.push(new URL(req.url ?? '/', 'http://local'));
    res.writeHead(respond.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(respond.body));
  });
  const port = await new Promise<number>(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : 0);
    });
  });
  // publicClient는 import 시점에 env를 읽는다 — 주입한 뒤에 연다.
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `http://127.0.0.1:${port}`);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  repo = await import('./repository');
});

afterAll(() => {
  vi.unstubAllEnvs();
  server.close();
});

beforeEach(() => {
  requests = [];
  respond = { status: 200, body: [] };
});

test('getTopPosts: 실제 글 slug로 서버에서 거른 뒤 조회수순으로 자른다', async () => {
  respond = {
    status: 200,
    body: [
      { slug: 'b', view_count: 9 },
      { slug: 'a', view_count: null },
    ],
  };

  const rows = await repo.getTopPosts(5, ['a', 'b']);

  expect(requests).toHaveLength(1);
  const params = requests[0].searchParams;
  expect(params.get('slug')).toBe('in.(a,b)');
  // 동률은 slug로 끊는다 — 같은 조회수의 글 순서가 요청마다 흔들리지 않게.
  expect(params.get('order')).toBe('view_count.desc,slug.asc');
  expect(params.get('limit')).toBe('5');
  // view_count(null 허용 컬럼)는 0으로 정규화된다.
  expect(rows).toStrictEqual([
    { slug: 'b', view_count: 9 },
    { slug: 'a', view_count: 0 },
  ]);
});

test('getTopPosts: 거를 slug가 없으면 요청하지 않는다', async () => {
  // `slug=in.()`은 PostgREST에서 빈 결과지만, 요청할 이유 자체가 없다.
  await expect(repo.getTopPosts(5, [])).resolves.toStrictEqual([]);
  expect(requests).toHaveLength(0);
});

test('getTopPosts: 서버 실패를 빈 결과로 삼키지 않고 throw한다', async () => {
  // 빈 배열로 삼키면 소비자가 "조회수 없음"과 "조회 실패"를 구분하지 못한다.
  respond = {
    status: 500,
    body: { code: 'XX000', message: 'boom', details: null, hint: null },
  };
  await expect(repo.getTopPosts(5, ['a'])).rejects.toMatchObject({
    message: 'boom',
  });
});

test('getAllViewCounts: 그 글들만 서버에서 거르고 1000행 cap에서도 같은 행이 오게 정렬한다', async () => {
  await repo.getAllViewCounts(['x', 'y']);
  const params = requests[0].searchParams;
  expect(params.get('slug')).toBe('in.(x,y)');
  expect(params.get('order')).toBe('view_count.desc,slug.asc');

  requests = [];
  await expect(repo.getAllViewCounts([])).resolves.toStrictEqual([]);
  expect(requests).toHaveLength(0);
});
