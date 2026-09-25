import type { User } from '@/shared';

export type UserReq = Pick<User, 'id'>;

/** 서버 JSON 모양 — 날짜는 ISO 문자열로 온다(`toUser`가 Date로 바꾼다) */
export interface UserDto extends Omit<User, 'createdAt' | 'lastLoginDate'> {
  createdAt: string;
  lastLoginDate: string;
}

export type UserRes = User;
