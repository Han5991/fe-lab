import type { UserRes, UserReq } from './types';
import type { Http } from '@package/core';
import { instance } from '@/shared';

interface UserServer {
  createUser: (user: UserReq) => Promise<UserRes>;
}

class UserServerImpl implements UserServer {
  constructor(private api: Http) {}

  async createUser(user: UserReq): Promise<UserRes> {
    const response = await this.api.post<UserRes, UserReq>('/api/user', user);
    return response.data;
  }
}

export const userServer = new UserServerImpl(instance);
