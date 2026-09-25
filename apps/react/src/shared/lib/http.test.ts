import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ApiError, Http } from '@package/core';

const BASE = 'http://api.test';
const server = setupServer();
const client = new Http(BASE);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test.each([
  {
    name: '{ error, message } JSON',
    respond: () =>
      HttpResponse.json(
        { error: 'STATS_ERROR', message: '통계 실패' },
        { status: 500 },
      ),
    expected: { message: '통계 실패', code: 'STATS_ERROR', status: 500 },
  },
  {
    name: 'message 없는 JSON',
    respond: () =>
      HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      ),
    expected: {
      message: 'HTTP Error: 401 Unauthorized',
      code: 'Invalid credentials',
      status: 401,
    },
  },
  {
    name: 'HTML 에러 페이지(502)',
    respond: () =>
      new HttpResponse('<html>Bad Gateway</html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'Content-Type': 'text/html' },
      }),
    expected: {
      message: 'HTTP Error: 502 Bad Gateway',
      code: undefined,
      status: 502,
    },
  },
])(
  '$name 에러 응답은 code·status를 가진 ApiError가 된다',
  async ({ respond, expected }) => {
    server.use(http.get(`${BASE}/x`, respond));

    const error = await client.get('/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject(expected);
    // 원본 응답은 타입에 선언된 필드로 남는다 — 캐스트 없이 읽힌다.
    expect((error as ApiError).response?.status).toBe(expected.status);
  },
);

test('JSON이라고 선언한 성공 응답이 깨졌으면 INVALID_JSON ApiError가 된다', async () => {
  server.use(
    http.get(
      `${BASE}/x`,
      () =>
        new HttpResponse('{broken', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );

  const error = await client.get('/x').catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ code: 'INVALID_JSON', status: 200 });
});

test.each([
  ['204는 undefined', () => new HttpResponse(null, { status: 204 }), undefined],
  ['JSON이 아닌 본문은 문자열', () => HttpResponse.text('ok'), 'ok'],
])('성공 응답 본문: %s', async (_, respond, expected) => {
  server.use(http.get(`${BASE}/x`, respond));

  expect((await client.get('/x')).data).toBe(expected);
});

test('falsy 본문(0)도 JSON으로 보낸다', async () => {
  server.use(
    http.put(`${BASE}/x`, async ({ request }) =>
      HttpResponse.json(await request.json()),
    ),
  );

  expect((await client.put('/x', 0)).data).toBe(0);
});

test('ApiError는 객체가 아닌 옵션을 받아도 던지지 않는다', () => {
  const Loose = ApiError as unknown as new (m: string, o: unknown) => ApiError;

  expect(new Loose('실패', 'STATS_ERROR')).toMatchObject({
    message: '실패',
    code: undefined,
    status: undefined,
  });
});
