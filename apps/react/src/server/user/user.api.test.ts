import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { UserReq, UserRes } from '@/server/user/types';
import { userServer } from '@/server/user/api';

const server = setupServer(
  http.post<never, UserReq>(
    'http://localhost/api/user',
    async ({ request }) => {
      const user = await request.json();
      return HttpResponse.json<UserRes>({
        id: user.id,
        name: 'New User',
        email: 'test@test.com',
        createdAt: new Date(),
        isPremium: false,
        lastLoginDate: new Date(),
        subscriptionStatus: 'inactive',
      });
    },
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserServerImpl', () => {
  it('사용자를 생성할 수 있다', async () => {
    const userReq: UserReq = { id: '1' };
    const response = await userServer.createUser(userReq);

    expect(response).toEqual({
      id: userReq.id,
      name: 'New User',
      email: 'test@test.com',
      createdAt: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
    });
  });
});
