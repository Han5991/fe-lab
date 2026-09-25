import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { beforeAll, afterEach, afterAll, describe, it, expect } from 'vitest';
import type { UserDto, UserReq } from '@/server/user/types';
import { userServer } from '@/server/user/api';
import { UserService } from '@/service/userService';
import { DateUtils } from '@/shared/lib';

const CREATED_AT = '2020-01-01T00:00:00.000Z';

const server = setupServer(
  http.post<never, UserReq>(
    'http://localhost:5173/api/user',
    async ({ request }) => {
      const user = await request.json();
      // JSON 응답이라 날짜는 ISO 문자열로 간다
      return HttpResponse.json<UserDto>({
        id: user.id,
        name: 'New User',
        email: 'test@test.com',
        createdAt: CREATED_AT,
        isPremium: true,
        lastLoginDate: new Date().toISOString(),
        subscriptionStatus: 'inactive',
      });
    },
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserServerImpl', () => {
  it('사용자를 생성하고 응답의 ISO 날짜를 Date로 바꿔 돌려준다', async () => {
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
  });

  it('생성한 사용자를 그대로 UserService의 날짜 계산에 넘길 수 있다', async () => {
    const service = new UserService(userServer, new DateUtils());

    const user = await service.createUser({ id: '1' });

    // 날짜가 문자열로 남아 있으면 isWithinDays의 date.getTime()에서 TypeError가 난다
    expect(service.getUserStatus(user)).toBe('premium-active');
  });
});
