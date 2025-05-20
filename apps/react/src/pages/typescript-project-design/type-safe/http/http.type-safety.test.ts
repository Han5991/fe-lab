import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Http, HttpStatusCode } from '@package/core';

const handler = [
  http.get('http://localhost/api/user', () =>
    HttpResponse.json({
      id: 1,
      name: 'Alice',
    }),
  ),
  http.post<never, LoginRequest>(
    'http://localhost/api/login',
    async ({ request }) => {
      const { username, password } = await request.json();

      if (username === 'user' && password === 'pass') {
        return HttpResponse.json({
          token: 'secret-token',
        });
      }
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: HttpStatusCode.Unauthorized },
      );
    },
  ),
];

const server = setupServer(...handler);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

interface User {
  id: number;
  name: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
}

describe('type-safety-test', () => {
  it('타입 세이프하게 GET 요청 응답을 받을 수 있다', async () => {
    const http = new Http('http://localhost');
    const response = await http.get<User>('/api/user');
    // response.data가 User 타입인지 타입 체킹
    expect(response.data).toEqual({ id: 1, name: 'Alice' });
  });

  it('타입 세이프하게 POST 요청시 데이터 타입 체크', async () => {
    const http = new Http('http://localhost');
    const requestBody: LoginRequest = { username: 'user', password: 'pass' };
    const response = await http.post<LoginResponse, LoginRequest>(
      '/api/login',
      requestBody,
    );
    expect(response.data.token).toBe('secret-token');
  });
});
