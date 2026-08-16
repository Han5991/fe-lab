/**
 * publicClient 와이어 계약 테스트.
 *
 * 공개 페이지의 Supabase 접근을 `createClient()`(supabase-js 전체)에서
 * `PostgrestClient`로 바꾸면서, **서버가 받는 HTTP 요청이 이전과 같아야**
 * 한다는 게 이 교체의 전제였다. 눈으로 맞춘 헤더는 라이브러리가 기본값을
 * 바꾸는 순간 조용히 어긋난다(실제로 처음 구현에서 Accept-Profile /
 * Content-Profile을 빠뜨렸고, 지금 이 테스트가 그걸 잡았다).
 *
 * 그래서 로컬 echo 서버에 두 클라이언트를 붙여, 공개 페이지가 실제로 하는
 * 세 호출의 요청(method·경로·쿼리·헤더·본문)을 직접 비교한다.
 */

import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createServer, type Server } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { PostgrestClient } from '@supabase/postgrest-js';

const KEY = 'test-anon-key';

interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

let server: Server;
let baseUrl: string;
let captured: CapturedRequest[] = [];

/**
 * 비교에서 제외하는 헤더.
 * - x-client-info: supabase-js 텔레메트리. 응답에 영향을 주지 않는다.
 * - 그 외는 Node fetch가 자동으로 붙이는 것들이라 두 쪽이 동일하다.
 */
const IGNORED_HEADERS = new Set(['x-client-info']);

function normalize(req: CapturedRequest) {
  return {
    method: req.method,
    url: req.url,
    body: req.body,
    // 헤더 순서는 의미가 없고 생성 순서에 따라 갈리므로 정렬해서 비교한다.
    headers: Object.fromEntries(
      Object.entries(req.headers)
        .filter(([k]) => !IGNORED_HEADERS.has(k))
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}

before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        // 요청 내용과 무관하거나 전송 계층이 정하는 헤더는 제외.
        if (
          ['host', 'connection', 'content-length', 'accept-encoding'].includes(
            k,
          )
        ) {
          continue;
        }
        headers[k] = Array.isArray(v) ? v.join(',') : (v ?? '');
      }
      captured.push({
        method: req.method ?? '',
        url: req.url ?? '',
        headers,
        body: body || null,
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('[]');
    });
  });
  await new Promise<void>(r =>
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl =
        typeof addr === 'object' && addr ? `http://127.0.0.1:${addr.port}` : '';
      r();
    }),
  );
});

after(() => server.close());

/** 교체 전: supabase-js 전체 클라이언트 */
const legacyClient = () => createClient(baseUrl, KEY);

/** 교체 후: lib/publicClient.ts와 **동일한** 생성 방식 */
const publicClient = () =>
  new PostgrestClient(`${baseUrl.replace(/\/+$/, '')}/rest/v1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    schema: 'public',
  });

/* eslint-disable @typescript-eslint/no-explicit-any -- 두 클라이언트의 제네릭이
   달라 구조적으로만 같은 쿼리를 태운다. 여기서 검증하는 건 타입이 아니라 와이어다. */
async function requestOf(run: (c: any) => PromiseLike<unknown>, client: any) {
  captured = [];
  await run(client);
  assert.equal(captured.length, 1, '요청이 정확히 1건이어야 한다');
  return normalize(captured[0]);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const SCENARIOS: {
  name: string;
  run: (c: any) => PromiseLike<unknown>; // eslint-disable-line @typescript-eslint/no-explicit-any
}[] = [
  {
    name: 'getTopPosts',
    run: c =>
      c
        .from('post_views')
        .select('slug, view_count')
        .order('view_count', { ascending: false })
        .limit(5),
  },
  {
    name: 'getAllViewCounts',
    run: c => c.from('post_views').select('slug, view_count'),
  },
  {
    name: 'incrementViewCount',
    run: c => c.rpc('increment_view_count', { slug_input: 'hello-world' }),
  },
];

for (const { name, run } of SCENARIOS) {
  test(`${name}: PostgrestClient가 supabase-js와 동일한 요청을 보낸다`, async () => {
    const legacy = await requestOf(run, legacyClient());
    const next = await requestOf(run, publicClient());
    assert.deepEqual(next, legacy);
  });
}

test('anon key가 apikey와 Authorization 양쪽에 실린다', async () => {
  const req = await requestOf(SCENARIOS[0].run, publicClient());
  assert.equal(req.headers['apikey'], KEY);
  assert.equal(req.headers['authorization'], `Bearer ${KEY}`);
});

test('schema를 명시해 Accept-Profile이 빠지지 않는다', async () => {
  // 이 헤더가 없으면 PostgREST가 서버 기본 스키마로 처리한다. 지금 설정에선
  // 결과가 같지만, 노출 스키마가 늘어나면 조용히 달라지는 종류의 차이다.
  const req = await requestOf(SCENARIOS[0].run, publicClient());
  assert.equal(req.headers['accept-profile'], 'public');
});
