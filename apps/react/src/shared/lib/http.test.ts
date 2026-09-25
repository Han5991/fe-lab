import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ApiError, Http, HttpStatusCode, isHttpError } from '@package/core';

// 실제 Http가 실제 Response(msw가 만든 fetch 응답)를 읽는 경로를 검증한다 —
// instance.get을 mock하면 본문 파싱·에러 변환 경로가 한 줄도 돌지 않는다
const BASE = 'http://api.test';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new Http(BASE);

const rejectionOf = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('요청이 실패하지 않았다');
};

describe('Http 에러 응답', () => {
  test('{ error, message } JSON 에러는 code·status를 가진 ApiError가 된다', async () => {
    server.use(
      http.get(`${BASE}/stats`, () =>
        HttpResponse.json(
          { error: 'STATS_ERROR', message: '통계 실패' },
          { status: HttpStatusCode.InternalServerError },
        ),
      ),
    );

    const error = await rejectionOf(client.get('/stats'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: '통계 실패',
      code: 'STATS_ERROR',
      status: 500,
    });
    expect(isHttpError(error)).toBe(true);
  });

  test('message 없는 JSON 에러는 상태 줄로 메시지를 만든다', async () => {
    server.use(
      http.post(`${BASE}/login`, () =>
        HttpResponse.json(
          { error: 'Invalid credentials' },
          { status: HttpStatusCode.Unauthorized, statusText: 'Unauthorized' },
        ),
      ),
    );

    const error = await rejectionOf(client.post('/login', { id: 'x' }));

    expect(error).toMatchObject({
      message: 'HTTP Error: 401 Unauthorized',
      code: 'Invalid credentials',
      status: 401,
    });
  });

  test('HTML 에러 페이지(502)도 SyntaxError가 아니라 상태를 가진 ApiError가 된다', async () => {
    server.use(
      http.get(
        `${BASE}/gateway`,
        () =>
          new HttpResponse('<html><body>Bad Gateway</body></html>', {
            status: HttpStatusCode.BadGateway,
            statusText: 'Bad Gateway',
            headers: { 'Content-Type': 'text/html' },
          }),
      ),
    );

    const error = await rejectionOf(client.get('/gateway'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: 'HTTP Error: 502 Bad Gateway',
      status: 502,
      code: undefined,
    });
  });
});

describe('Http 성공 응답', () => {
  test('204 No Content는 본문 없이 성공한다', async () => {
    server.use(
      http.delete(
        `${BASE}/items/1`,
        () => new HttpResponse(null, { status: HttpStatusCode.NoContent }),
      ),
    );

    const response = await client.delete('/items/1');

    expect(response.status).toBe(204);
    expect(response.data).toBeUndefined();
  });

  test('JSON이 아닌 본문은 문자열로 돌려준다', async () => {
    server.use(http.get(`${BASE}/health`, () => HttpResponse.text('ok')));

    const response = await client.get<string>('/health');

    expect(response.data).toBe('ok');
  });

  test('falsy 본문(0)도 JSON으로 보낸다', async () => {
    server.use(
      http.put(`${BASE}/count`, async ({ request }) =>
        HttpResponse.json({ received: await request.json() }),
      ),
    );

    const response = await client.put<{ received: number }>('/count', 0);

    expect(response.data).toEqual({ received: 0 });
  });
});

describe('ApiError', () => {
  test('객체가 아닌 옵션이 들어와도 생성자가 던지지 않는다', () => {
    const loose = ApiError as unknown as new (
      message: string,
      opts: unknown,
    ) => ApiError;

    const error = new loose('실패', 'STATS_ERROR');

    expect(error.message).toBe('실패');
    expect(error.code).toBeUndefined();
    expect(error.status).toBeUndefined();
  });
});
