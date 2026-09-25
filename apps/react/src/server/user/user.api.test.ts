import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { beforeAll, afterEach, afterAll, describe, it, expect } from 'vitest';
import type { UserDto, UserReq } from '@/server/user/types';
import { userServer } from '@/server/user/api';
import { UserService } from '@/service/userService';
import { DateUtils } from '@/shared/lib';

const CREATED_AT = '2020-01-01T00:00:00.000Z';

const server = setupServer(
  http.post<never, UserReq>('/api/user', async ({ request }) => {
    const user = await request.json();
    return HttpResponse.json<UserDto>({
      id: user.id,
      name: 'New User',
      email: 'test@test.com',
      createdAt: CREATED_AT,
      isPremium: true,
      lastLoginDate: new Date().toISOString(),
      subscriptionStatus: 'inactive',
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserServerImpl', () => {
  it('사용자를 생성하고 응답의 ISO 날짜를 Date로 바꿔 날짜 계산에 쓸 수 있게 돌려준다', async () => {
    const userReq: UserReq = { id: '1' };
    const response = await userServer.createUser(userReq);

    expect(response).toEqual({
      id: userReq.id,
      name: 'New User',
      email: 'test@test.com',
      isPremium: true,
      subscriptionStatus: 'inactive',
      createdAt: new Date(CREATED_AT),
      lastLoginDate: expect.any(Date),
    });
    expect(
      new UserService(userServer, new DateUtils()).getUserStatus(response),
    ).toBe('premium-active');
  });
});
