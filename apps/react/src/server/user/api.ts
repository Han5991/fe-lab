import type { UserDto, UserRes, UserReq } from './types';
import type { Http } from '@package/core';
import { instance } from '@/shared';

export interface UserServer {
  createUser: (user: UserReq) => Promise<UserRes>;
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date in ${field}: ${value}`);
  }
  return date;
}

/** 응답 DTO(날짜 = 문자열)를 도메인 User(날짜 = Date)로 바꾼다 */
export function toUser(dto: UserDto): UserRes {
  return {
    ...dto,
    createdAt: parseDate(dto.createdAt, 'createdAt'),
    lastLoginDate: parseDate(dto.lastLoginDate, 'lastLoginDate'),
  };
}

class UserServerImpl implements UserServer {
  constructor(private api: Http) {}

  async createUser(user: UserReq): Promise<UserRes> {
    // response.json()은 Date를 되살리지 않는다 — 제네릭에 User를 넣으면 타입만 Date이고
    // 실제로는 문자열이라 date.getTime()에서 터진다. DTO로 받고 경계에서 변환한다.
    const response = await this.api.post<UserDto, UserReq>('/api/user', user);
    return toUser(response.data);
  }
}

export const userServer = new UserServerImpl(instance);
