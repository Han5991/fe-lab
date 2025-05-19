import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { UserReq, UserRes } from '@/server/user/types';
import { userServer } from '@/server/user/api';

const server = setupServer(
  http.post('http://localhost/api/user', async ({ request }) => {
    const user = (await request.json()) as UserReq;
    return HttpResponse.json({ id: user.id, name: 'New User' } as UserRes);
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserServerImpl', () => {
  it('사용자를 생성할 수 있다', async () => {
    const userReq: UserReq = { id: '1' };
    const response = await userServer.createUser(userReq);

    expect(response).toEqual({ id: '1', name: 'New User' });
  });
});
